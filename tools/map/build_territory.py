"""
Builds the territory and the generated spots from the committed base map
(apps/map/public/geo) and the hand-crafted inputs in tools/map/territory.json.

    python3 -m pip install shapely
    python3 tools/map/build_territory.py

Writes packages/map/src/generated/territory.ts:
  • neighborhoods, cut along real streets (the `borders` list), plus the
    Ojai Valley Trail as its own thin territory;
  • generated spots: public landmarks from Overture places, trail markers
    every `spotEveryM`, and street corners wherever a walker would otherwise
    be more than CORNER_GAP_M from a spot.
Hand-placed spots (packages/map/src/spots.ts) always win: generated ones
keep clear of them.
"""
import json, math, os, sys
from shapely.geometry import LineString, MultiLineString, Point, Polygon, shape, mapping
from shapely.ops import polygonize, unary_union, nearest_points, substring
import shapely

HERE = os.path.dirname(__file__)
GEO = os.path.join(HERE, "../../apps/map/public/geo")
OUT = os.path.join(HERE, "../../packages/map/src/generated/territory.ts")
CFG = json.load(open(os.path.join(HERE, "territory.json")))

M_LAT = 111_320.0
M_LNG = 111_320.0 * math.cos(math.radians(34.45))
deg = lambda m: m / M_LAT  # rough metres → degrees for buffers (lat scale)


def load(name):
    return json.load(open(os.path.join(GEO, name)))["features"]


def meters(a, b):
    return math.hypot((a[0] - b[0]) * M_LNG, (a[1] - b[1]) * M_LAT)


# ─── Play area ────────────────────────────────────────────────────────────────
city = shape(load("ojai-boundary.geojson")[0]["geometry"])
mo = Polygon(CFG["meinersOaks"]).difference(city)
mount = Polygon(CFG["theMount"])
extras = [Polygon(r).difference(city) for r in CFG.get("extraArea", [])]
area = unary_union([city, mo, mount] + extras).buffer(0)

# ─── Borders ──────────────────────────────────────────────────────────────────
roads = load("roads.geojson")
border_lines = [shape(f["geometry"]) for f in roads if f["properties"]["name"] in CFG["borders"]]
missing = set(CFG["borders"]) - {f["properties"]["name"] for f in roads}
if missing:
    sys.exit(f"border streets not in roads.geojson: {missing}")

waters = load("water.geojson")
border_lines += [shape(f["geometry"]) for f in waters if f["properties"]["name"] in CFG.get("borderWaters", [])]


def extend(line, m=40):
    """Stretch both ends of a line a little so borders that stop just short of
    a crossing street still close the face. Overshoots are dangles, which
    polygonize ignores."""
    out = []
    for l in (getattr(line, "geoms", None) or [line]):
        if l.geom_type != "LineString" or len(l.coords) < 2:
            continue
        c = list(l.coords)
        def ext(a, b):
            dx, dy = (a[0] - b[0]) * M_LNG, (a[1] - b[1]) * M_LAT
            d = math.hypot(dx, dy) or 1
            return (a[0] + dx / d * m / M_LNG, a[1] + dy / d * m / M_LAT)
        out.append(LineString([ext(c[0], c[1])] + c + [ext(c[-1], c[-2])]))
    return MultiLineString(out)


border_lines = [extend(l) for l in border_lines]

trails = load("trails.geojson")
trail_line = unary_union([shape(f["geometry"]) for f in trails if f["properties"]["name"] == CFG["trail"]["path"]])
# Stretch the corridor across the whole trail inside the play area.
trail_in = trail_line.intersection(area)
corridor = trail_in.buffer(deg(CFG["trail"]["halfWidthM"]), cap_style="flat").intersection(area)

edges = unary_union(
    [area.boundary, mo.boundary, city.boundary]
    + [l.intersection(area) for l in border_lines]
    + [trail_in]
)
faces = [f for f in polygonize(edges) if area.contains(f.representative_point())]

hoods = CFG["neighborhoods"]
seeds = [(h["id"], Point(s)) for h in hoods for s in h["seeds"]]
parts = {h["id"]: [] for h in hoods}
for f in faces:
    held = [hid for hid, p in seeds if f.contains(p)]
    if len(set(held)) > 1:
        sys.exit(f"one face holds seeds of {set(held)}: add a border street between them")
    if held:
        hid = held[0]
    else:
        c = f.representative_point()
        hid = min(seeds, key=lambda s: s[1].distance(c))[0]
    parts[hid].append(f)
# Meiners Oaks is everything outside the city line in the MO ring.
parts["meiners-oaks"] = [mo]
for hid in parts:
    if hid != "meiners-oaks":
        parts[hid] = [f.difference(mo) for f in parts[hid]]

polys = {}
for h in hoods:
    g = unary_union(parts[h["id"]]).difference(corridor).buffer(0)
    if g.is_empty:
        sys.exit(f"{h['id']} came out empty: check its seeds")
    # No simplify: neighbours must keep identical shared edges.
    polys[h["id"]] = g
trail_poly = corridor


def rings(g):
    """Geometry → list of polygons, each [outer, *holes], rounded [lng, lat]."""
    ps = [g] if g.geom_type == "Polygon" else [p for p in g.geoms if p.geom_type == "Polygon"]
    ps = [p for p in ps if p.area > 1e-9]
    r = lambda ring: [[round(x, 6), round(y, 6)] for x, y in ring.coords]
    return [[r(p.exterior)] + [r(i) for i in p.interiors] for p in ps]


territory = [
    {"id": h["id"], "name": h["name"], "note": h["note"], "tint": h["tint"], "polygons": rings(polys[h["id"]])}
    for h in hoods
] + [
    {
        "id": "trail",
        "name": CFG["trail"]["name"],
        "note": "The trail as its own ground: a thin strip through Mira Monte, Krotona, downtown and out to Soule Park. The main walking artery.",
        "tint": 4,
        "polygons": rings(trail_poly),
    }
]

# ─── Spots ────────────────────────────────────────────────────────────────────
# Hand-placed spots, read from spots.ts so generated ones keep clear of them.
import re
src = open(os.path.join(HERE, "../../packages/map/src/spots.ts")).read()
hand = [(float(a), float(b)) for a, b in re.findall(r"at: \[(-?[\d.]+), (-?[\d.]+)\]", src)]
hand_ids = set(re.findall(r'id: "([a-z0-9-]+)"', src))
hand_names = {n.lower() for n in re.findall(r'name: "([^"]+)"', src)}

landuse = load("landuse.geojson")
former = [Point(p) for p in [(-119.2428, 34.4489)]]
schools = unary_union([
    shape(f["geometry"]) for f in landuse
    if f["properties"]["c"] == "education" and not any(shape(f["geometry"]).contains(p) for p in former)
])
walkable = unary_union([shape(f["geometry"]) for f in roads] + [shape(f["geometry"]) for f in trails])

MIN_GAP_M = 55  # no two spots closer than this
taken = list(hand)


def free(p, gap=MIN_GAP_M):
    return all(meters(p, q) >= gap for q in taken)


def ok(p):
    pt = Point(p)
    return area.contains(pt) and not schools.contains(pt)


spots = []


def add(sid, name, p, source, verify=None):
    p = (round(p[0], 6), round(p[1], 6))
    if name.lower() in hand_names or not ok(p) or not free(p):
        return False
    taken.append(p)
    s = {"id": sid, "name": name, "at": list(p), "source": source}
    if verify:
        s["verify"] = verify
    spots.append(s)
    return True


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:40]


# 1. Trail markers every spotEveryM along the trail inside the play area.
lines = [trail_in] if trail_in.geom_type == "LineString" else list(trail_in.geoms)
from shapely.ops import linemerge
merged = linemerge(unary_union(lines))
lines = [merged] if merged.geom_type == "LineString" else list(merged.geoms)
named = [(f["properties"]["name"], shape(f["geometry"])) for f in roads if f["properties"]["name"] and f["properties"]["t"] >= 1]


def nearest_street(pt):
    best = min(named, key=lambda nl: nl[1].distance(pt))
    return best[0]


def short(street):
    return (street.replace("North ", "N ").replace("South ", "S ").replace("East ", "E ").replace("West ", "W ")
            .replace(" Street", " St").replace(" Avenue", " Ave").replace(" Road", " Rd").replace(" Drive", " Dr")
            .replace(" Highway", " Hwy").replace(" Lane", " Ln"))


step_deg = CFG["trail"]["spotEveryM"] / M_LNG
for line in lines:
    n = int(line.length / step_deg)
    for i in range(n + 1):
        pt = line.interpolate(i * step_deg)
        st = short(nearest_street(pt))
        add(f"trail-{slug(st)}-{i}", f"Trail at {st}", (pt.x, pt.y), "trail")

# 2. Public landmarks from Overture places (tools/map/places.json, written by
#    extract_overture.py places).
PLACES = os.path.join(HERE, "places.json")
LANDMARK = {
    "park": None, "dog_park": None, "historic_site": None, "museum": None, "library": None,
    "christian_place_of_worship": None, "jewish_place_of_worship": None, "religious_organization": None,
    "art_gallery": "Real business: parody-name it.", "music_venue": None, "performing_arts_venue": None,
    "movie_theater": "Real business: parody-name it.", "farmers_market": None, "festival_venue": None,
    "recreational_trail_or_path": None, "arts_and_entertainment": None, "community_and_government": None,
    "government_office": None, "fire_station": None,
    "coffee_shop": "Real business: parody-name it.", "cafe": "Real business: parody-name it.",
    "books_music_and_video_store": "Real business: parody-name it.",
    "second_hand_store": "Real business: parody-name it.",
}
EXCLUDE = set(CFG.get("excludePlaces", {}).get("names", []))
if os.path.exists(PLACES):
    places = json.load(open(PLACES))
    for pl in sorted(places, key=lambda r: -(r.get("confidence") or 0)):
        cat = pl["category"]
        if cat not in LANDMARK or (pl.get("confidence") or 0) < 0.6 or pl["name"] in EXCLUDE:
            continue
        p = tuple(pl["at"])
        # Must be a short walk from a street or path, not deep in a lot.
        if walkable.distance(Point(p)) > deg(60):
            continue
        add(f"{slug(pl['name'])}", pl["name"], p, cat, LANDMARK[cat])

# 3. Street corners: fill every gap a walker could fall into.
CORNER_GAP_M = 140
street_feats = [(f["properties"]["name"], shape(f["geometry"])) for f in roads if f["properties"]["name"] and f["properties"]["t"] >= 1]
corners = {}
for i, (n1, g1) in enumerate(street_feats):
    for n2, g2 in street_feats[i + 1:]:
        if n1 == n2 or not g1.intersects(g2):
            continue
        x = g1.intersection(g2)
        pts = [x] if x.geom_type == "Point" else [g for g in getattr(x, "geoms", []) if g.geom_type == "Point"]
        for p in pts:
            key = (round(p.x, 4), round(p.y, 4))
            corners.setdefault(key, (p, tuple(sorted((short(n1), short(n2))))))
# Greedy: repeatedly take the corner farthest from any spot while > gap.
cand = [(p, names) for p, names in corners.values() if ok((p.x, p.y))]
while True:
    best, bd = None, 0
    for p, names in cand:
        d = min(meters((p.x, p.y), q) for q in taken)
        if d > bd:
            best, bd = (p, names), d
    if not best or bd < CORNER_GAP_M:
        break
    p, (a, b) = best
    add(f"corner-{slug(a)}-{slug(b)}", f"{a} & {b}", (p.x, p.y), "corner")
    cand.remove(best)

# Unique ids, clear of the hand-placed ones.
seen = {i: 0 for i in hand_ids}
for s in spots:
    if s["id"] in seen:
        seen[s["id"]] += 1
        s["id"] = f"{s['id']}-{seen[s['id']]}"
    else:
        seen[s["id"]] = 0

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    fh.write(
        "// Generated by tools/map/build_territory.py from tools/map/territory.json and the\n"
        "// committed base map. Do not edit by hand: change the inputs and rerun.\n"
        "import type { LngLat } from \"../area.ts\";\n\n"
        "export interface TerritoryData {\n  id: string;\n  name: string;\n  note: string;\n  tint: number;\n"
        "  /** Polygons, each [outer ring, ...holes], [lng, lat]. */\n  polygons: LngLat[][][];\n}\n\n"
        "export interface GeneratedSpot {\n  id: string;\n  name: string;\n  at: LngLat;\n"
        "  /** trail, corner, or the Overture place category. */\n  source: string;\n  verify?: string;\n}\n\n"
        f"export const TERRITORY: TerritoryData[] = {json.dumps(territory, separators=(',', ':'))};\n\n"
        f"export const GENERATED_SPOTS: GeneratedSpot[] = {json.dumps(spots, indent=1, ensure_ascii=False)};\n"
    )
from collections import Counter
print(f"wrote {OUT}: {len(territory)} territories, {len(spots)} generated spots {dict(Counter(s['source'] if s['source'] in ('trail','corner') else 'landmark' for s in spots))}")
