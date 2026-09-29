"""
One-time extraction of the Ojai Valley base map (run on demand; outputs are
committed to apps/map/public/geo, so the app never calls a map service at
runtime). Same idea as la-brea-madre's scripts/extractBaseMap.ts, but the
source is Overture Maps (OSM-derived roads, water, land use, buildings;
CDLA/ODbL) read straight from its public S3 bucket, because it's reachable
where Overpass isn't.

    python3 -m pip install pyarrow shapely
    python3 tools/map/extract_overture.py          # all layers
    python3 tools/map/extract_overture.py roads    # one layer

Contours come from a separate script (tools/map/contours.ts).
"""
import json, os, sys, time
from urllib.parse import urlparse

import pyarrow.compute as pc
import pyarrow.dataset as ds
import pyarrow.fs as pfs
import shapely
from shapely.geometry import box, mapping

RELEASE = "2026-09-23.1"
ROOT = f"overturemaps-us-west-2/release/{RELEASE}"
OUT = os.path.join(os.path.dirname(__file__), "../../apps/map/public/geo")

# Ojai Valley floor from the Ventura River / Meiners Oaks in the west to
# Meditation Mount in the east, and up to the Topatopa foothills (Shelf Road).
# Keep in sync with BBOX in packages/map/src/area.ts.
BBOX = (-119.34, 34.415, -119.16, 34.505)
CLIP = box(*BBOX)


def s3():
    kw = {}
    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy:
        p = urlparse(proxy)
        kw["proxy_options"] = {"scheme": p.scheme or "http", "host": p.hostname, "port": p.port}
    return pfs.S3FileSystem(anonymous=True, region="us-west-2", **kw)


FS = s3()


def query(theme, typ, cols):
    t = time.time()
    d = ds.dataset(f"{ROOT}/theme={theme}/type={typ}", filesystem=FS, format="parquet")
    b = lambda k: pc.field("bbox", k)
    f = (b("xmax") > BBOX[0]) & (b("xmin") < BBOX[2]) & (b("ymax") > BBOX[1]) & (b("ymin") < BBOX[3])
    rows = d.to_table(columns=cols + ["geometry"], filter=f).to_pylist()
    print(f"{theme}/{typ}: {len(rows)} rows in {time.time() - t:.0f}s")
    return rows


def name(r):
    return ((r.get("names") or {}).get("primary")) or ""


def geom(r, simplify=0.0):
    g = shapely.from_wkb(r["geometry"])
    g = g.intersection(CLIP)
    if simplify:
        g = g.simplify(simplify, preserve_topology=True)
    return None if g.is_empty else shapely.set_precision(g, 1e-5)


def write(fname, features):
    p = os.path.join(OUT, fname)
    with open(p, "w") as fh:
        json.dump({"type": "FeatureCollection", "features": features}, fh, separators=(",", ":"))
    print(f"wrote {p} ({os.path.getsize(p) / 1024:.0f} KB, {len(features)} features)")


def feature(g, props):
    return {"type": "Feature", "properties": props, "geometry": mapping(g)}


# Road class → render tier t (3 arterial … 0 lane). Service roads are mostly
# driveways and parking aisles, so only named ones are kept.
ROAD_TIERS = {
    "motorway": 3, "trunk": 3, "primary": 3, "secondary": 2, "tertiary": 2,
    "residential": 1, "unclassified": 1, "living_street": 1, "unknown": 1, "service": 0,
}
TRAIL_CLASSES = {"path", "footway", "cycleway", "bridleway", "track", "steps", "pedestrian"}


def roads():
    feats, trails = [], []
    for r in query("transportation", "segment", ["names", "subtype", "class"]):
        if r["subtype"] != "road":
            continue
        g = geom(r)
        if g is None:
            continue
        n, c = name(r), r["class"]
        if c in TRAIL_CLASSES:
            trails.append(feature(g, {"name": n, "c": c}))
        elif c in ROAD_TIERS and (c != "service" or n):
            feats.append(feature(g, {"name": n, "t": ROAD_TIERS[c]}))
    write("roads.geojson", feats)
    write("trails.geojson", trails)


WATER = {"stream", "river", "canal", "lake", "pond", "reservoir", "water"}


def water():
    feats = []
    for r in query("base", "water", ["names", "subtype", "class"]):
        if r["subtype"] not in WATER:
            continue
        g = geom(r, 0.00002)
        if g is not None:
            feats.append(feature(g, {"name": name(r), "c": r["subtype"]}))
    write("water.geojson", feats)


# Land use kept for the look (parks, golf, preserves) and for safety:
# schools are drawn as no-go zones and no spot may sit inside one.
LANDUSE = {"park", "golf", "protected", "education", "cemetery", "religious", "recreation"}


def landuse():
    feats = []
    for r in query("base", "land_use", ["names", "subtype", "class"]):
        s = r["subtype"]
        if s not in LANDUSE or (s == "golf" and r["class"] != "golf_course"):
            continue
        if s == "recreation" and r["class"] not in {"recreation_ground", "pitch"}:
            continue
        g = geom(r, 0.00002)
        if g is not None and g.geom_type in ("Polygon", "MultiPolygon"):
            feats.append(feature(g, {"name": name(r), "c": s}))
    write("landuse.geojson", feats)


def buildings():
    feats = []
    for r in query("buildings", "building", ["class"]):
        g = geom(r, 0.000015)
        if g is not None and g.geom_type in ("Polygon", "MultiPolygon"):
            feats.append(feature(g, {}))
    write("buildings.geojson", feats)


def boundary():
    """City of Ojai boundary, drawn faintly for reference. The play area is
    the hand-drawn neighborhoods in packages/map/src/neighborhoods.ts."""
    rows = [
        r for r in query("divisions", "division_area", ["names", "subtype", "class"])
        if name(r) == "Ojai" and r["subtype"] == "locality" and r["class"] == "land"
    ]
    g = shapely.from_wkb(rows[0]["geometry"])
    write("ojai-boundary.geojson", [feature(shapely.set_precision(g, 1e-5), {"name": "Ojai"})])


def places():
    """Named places (for landmark spots), trimmed to what build_territory.py needs."""
    out = []
    for r in query("places", "place", ["names", "basic_category", "confidence"]):
        n = name(r)
        if not n or not r["basic_category"]:
            continue
        g = shapely.from_wkb(r["geometry"])
        out.append({"name": n, "category": r["basic_category"], "confidence": round(r["confidence"] or 0, 2),
                    "at": [round(g.x, 6), round(g.y, 6)]})
    p = os.path.join(os.path.dirname(__file__), "places.json")
    with open(p, "w") as fh:
        json.dump(sorted(out, key=lambda x: (x["category"], x["name"])), fh, indent=0)
    print(f"wrote {p} ({len(out)} places)")


TASKS = {"roads": roads, "water": water, "landuse": landuse, "buildings": buildings, "boundary": boundary, "places": places}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for t in sys.argv[1:] or TASKS:
        TASKS[t]()
