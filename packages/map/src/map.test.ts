import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BBOX, SPOTS, EVENTS, NEIGHBORHOODS, FORMER_SCHOOL_SITES, inRing, neighborhoodOf, type Neighborhood, sunset, fullMoons,
  windowsBetween, activeEvents, zoned, localParts, spotsInRange, spotById, spotOdds, findAt,
  REFRESH_MIN, type LngLat, type Find, spotState, visit, nextReroll, spotOpened,
} from "./index.ts";

const inHood = (p: LngLat, n: Neighborhood) =>
  n.polygons.some(([outer, ...holes]) => inRing(p, outer) && !holes.some((h) => inRing(p, h)));

const geo = (f: string) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../../../apps/map/public/geo/${f}`, import.meta.url)), "utf8"));

test("spot and neighborhood ids are unique; events point at real spots", () => {
  const dupes = SPOTS.map((s) => s.id).filter((id, i, a) => a.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
  assert.equal(new Set(NEIGHBORHOODS.map((n) => n.id)).size, NEIGHBORHOODS.length);
  for (const e of EVENTS) for (const id of e.spots) assert.ok(spotById(id), `${e.id} → ${id}`);
});

test("every spot is on the map and inside exactly one neighborhood", () => {
  for (const s of SPOTS) {
    const [lng, lat] = s.at;
    assert.ok(lng > BBOX[0] && lng < BBOX[2] && lat > BBOX[1] && lat < BBOX[3], s.id);
    const n = NEIGHBORHOODS.filter((h) => inHood(s.at, h));
    assert.equal(n.length, 1, `${s.id} is in ${n.map((h) => h.id).join(", ") || "no neighborhood"}`);
  }
});

test("spots are dense enough to walk between", () => {
  assert.ok(SPOTS.length >= 150, `${SPOTS.length} spots`);
  // Every point on the downtown grid is within ~150 m of a spot.
  for (let lng = -119.2505; lng <= -119.2405; lng += 0.0005) {
    for (let lat = 34.4445; lat <= 34.45; lat += 0.0005) {
      const d = Math.min(...SPOTS.map((s) => Math.hypot((s.at[0] - lng) * 91_800, (s.at[1] - lat) * 111_320)));
      assert.ok(d < 150, `${lng},${lat} is ${Math.round(d)} m from a spot`);
    }
  }
});

test("every neighborhood has at least one spot", () => {
  for (const n of NEIGHBORHOODS) assert.ok(SPOTS.some((s) => neighborhoodOf(s.at)?.id === n.id), n.id);
});

test("neighborhoods don't overlap (sampled)", () => {
  for (let lng = BBOX[0]; lng < BBOX[2]; lng += 0.0006) {
    for (let lat = BBOX[1]; lat < BBOX[3]; lat += 0.0005) {
      const n = NEIGHBORHOODS.filter((h) => inHood([lng, lat], h));
      assert.ok(n.length <= 1, `${lng},${lat} in ${n.map((h) => h.id)}`);
    }
  }
});

test("no spot stands on active school grounds", () => {
  const polys = (f: any): LngLat[][][] => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
  const schools = geo("landuse.geojson").features.filter(
    (f: any) => f.properties.c === "education" && !FORMER_SCHOOL_SITES.some((p) => polys(f).some((poly) => inRing(p, poly[0]))),
  );
  assert.ok(schools.length > 5);
  for (const s of SPOTS) {
    assert.ok(!schools.some((f: any) => polys(f).some((poly) => inRing(s.at, poly[0]))), s.id);
  }
});

test("finds follow the odds and hold steady within a refresh slot", () => {
  const spot = spotById("krotona")!;
  const odds = spotOdds(spot);
  assert.ok(Math.abs(Object.values(odds).reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.ok(odds.rest > spotOdds(spotById("soule-park")!).rest);
  const t = zoned(2026, 10, 1, 12, 1);
  assert.equal(findAt(spot, "p1", t), findAt(spot, "p1", new Date(t.getTime() + 60_000)));
  const counts: Record<Find, number> = { fight: 0, elite: 0, rest: 0, shop: 0, mystery: 0 };
  const plain = spotById("soule-park")!;
  const N = 20_000;
  for (let i = 0; i < N; i++) counts[findAt(plain, `p${i}`, t)]++;
  const expect = spotOdds(plain);
  for (const f of Object.keys(counts) as Find[]) assert.ok(Math.abs(counts[f] / N - expect[f]) < 0.02, f);
  // A new slot rerolls for at least some players.
  const later = new Date(t.getTime() + REFRESH_MIN * 6e4);
  assert.ok([...Array(50)].some((_, i) => findAt(plain, `p${i}`, t) !== findAt(plain, `p${i}`, later)));
});

test("sunset matches published times for Ojai", () => {
  // NOAA: Ojai sunset 2026-06-21 20:12 PDT, 2026-12-21 16:53 PST (±3 min).
  const near = (d: Date, h: number, m: number) => {
    const p = localParts(d);
    assert.ok(Math.abs(p.hour * 60 + p.minute - (h * 60 + m)) <= 3, `${p.hour}:${p.minute}`);
  };
  near(sunset(2026, 6, 21), 20, 12);
  near(sunset(2026, 12, 21), 16, 53);
});

test("full moon estimate lands on the 2026-03-03 eclipse", () => {
  const [m] = fullMoons(new Date("2026-03-01"), new Date("2026-03-06"));
  assert.ok(Math.abs(m.getTime() - Date.UTC(2026, 2, 3, 11, 38)) < 864e5);
});

test("zoned handles PST and PDT", () => {
  assert.equal(zoned(2026, 1, 15, 9).toISOString(), "2026-01-15T17:00:00.000Z");
  assert.equal(zoned(2026, 7, 15, 9).toISOString(), "2026-07-15T16:00:00.000Z");
});

test("markets and Pink Moment open at the right times", () => {
  const ids = (d: Date) => activeEvents(d).map((w) => w.event.id);
  assert.ok(ids(zoned(2026, 10, 4, 10)).includes("sunday-market")); // Sunday 10 AM
  assert.ok(!ids(zoned(2026, 10, 5, 10)).includes("sunday-market"));
  assert.ok(ids(zoned(2026, 10, 1, 15, 30)).includes("thursday-market")); // Thursday 3:30 PM
  assert.ok(!ids(zoned(2026, 10, 1, 19, 1)).includes("thursday-market"));
  const pink = windowsBetween(zoned(2026, 10, 5, 0), zoned(2026, 10, 6, 0)).filter((w) => w.event.id === "pink-moment");
  assert.equal(pink.length, 1);
  assert.equal((pink[0].end.getTime() - pink[0].start.getTime()) / 6e4, 35);
  assert.ok(ids(new Date(pink[0].start.getTime() + 6e4)).includes("pink-moment"));
});

test("range check finds the spot you stand on", () => {
  assert.equal(spotsInRange(spotById("soule-park")!.at)[0].id, "soule-park");
  assert.equal(spotsInRange([-119.2, 34.49]).length, 0);
});

test("spots open only in range, then cool down until the next reroll", () => {
  const s = spotById("arcade")!;
  const t = zoned(2026, 10, 1, 15, 5);
  const far: LngLat = [s.at[0] + 0.003, s.at[1]];
  assert.equal(spotState(s, "p", far, t, {}).kind, "far");
  assert.equal(spotState(s, "p", null, t, {}).kind, "far");
  assert.equal(spotState(s, "p", far, t, {}, { anywhere: true }).kind, "open");
  const here = spotState(s, "p", s.at, t, {});
  assert.equal(here.kind, "open");
  assert.equal(here.kind === "open" && here.find, findAt(s, "p", t));
  const v = visit({}, s, t);
  const cooling = spotState(s, "p", s.at, new Date(t.getTime() + 6e4), v);
  assert.equal(cooling.kind, "cooling");
  assert.equal(cooling.kind === "cooling" && cooling.until.getTime(), nextReroll(t).getTime());
  assert.equal(spotState(s, "p", s.at, nextReroll(t), v).kind, "open");
  assert.equal(spotState(s, "p", s.at, nextReroll(t), v, { anywhere: true }).kind, "open");
  assert.equal(spotState(spotById("krotona")!, "p", s.at, t, v, { anywhere: true }).kind, "open"); // other spots unaffected
});

test("an opened spot carries its territory, backdrop key and live events", () => {
  const market = spotOpened(spotById("ousd-grounds")!, "fight", zoned(2026, 10, 1, 16));
  assert.ok(market.liveEvents.includes("thursday-market"));
  assert.equal(spotOpened(spotById("arcade")!, "fight", zoned(2026, 10, 1, 12)).place, "arcade");
  const trail = SPOTS.find((s) => neighborhoodOf(s.at)?.id === "trail")!;
  assert.equal(spotOpened(trail, "rest", zoned(2026, 10, 1, 12)).place, "ojai-valley-trail");
  const lib = SPOTS.find((s) => neighborhoodOf(s.at)?.id === "libbey-park")!;
  assert.equal(spotOpened(lib, "rest", zoned(2026, 10, 1, 12)).place, "libbey-park");
  assert.equal(spotOpened(spotById("shelf-road")!, "elite", zoned(2026, 10, 1, 12)).place, "shelf-road");
});
