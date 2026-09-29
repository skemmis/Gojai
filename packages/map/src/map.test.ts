import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BBOX, HOTSPOTS, EVENTS, inPlayArea, inRing, playAreaCells, cellOf, sunset, fullMoons,
  windowsBetween, activeEvents, zoned, localParts, hotspotsInRange, hotspotById, type LngLat,
} from "./index.ts";

const geo = (f: string) =>
  JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../../../apps/map/public/geo/${f}`, import.meta.url)), "utf8"));

test("hotspot ids are unique and events point at real hotspots", () => {
  assert.equal(new Set(HOTSPOTS.map((h) => h.id)).size, HOTSPOTS.length);
  for (const e of EVENTS) for (const id of e.hotspots) assert.ok(hotspotById(id), `${e.id} → ${id}`);
});

test("every hotspot is on the map and in a claimable cell", () => {
  const cells = new Set(playAreaCells());
  for (const h of HOTSPOTS) {
    const [lng, lat] = h.at;
    assert.ok(lng > BBOX[0] && lng < BBOX[2] && lat > BBOX[1] && lat < BBOX[3], h.id);
    assert.ok(cells.has(cellOf(h.at)), h.id);
  }
  // Only these sit outside the town lines (both are county land).
  assert.deepEqual(HOTSPOTS.filter((h) => !inPlayArea(h.at)).map((h) => h.id), ["meditation-mount", "soule-park"]);
});

test("no hotspot or event venue stands on school grounds", () => {
  const schools = geo("landuse.geojson").features.filter((f: any) => f.properties.c === "education");
  assert.ok(schools.length > 5);
  const onSchool = (p: LngLat) =>
    schools.some((f: any) => {
      const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
      return polys.some((poly: LngLat[][]) => inRing(p, poly[0]));
    });
  for (const h of HOTSPOTS) assert.ok(!onSchool(h.at), h.id);
});

test("play area grid is town-sized", () => {
  const n = playAreaCells().length;
  assert.ok(n > 80 && n < 400, `${n} cells`);
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

test("weekly markets and Pink Moment open at the right times", () => {
  // Sunday 2026-10-04, 10:00 PDT.
  const ids = (d: Date) => activeEvents(d).map((w) => w.event.id);
  assert.ok(ids(zoned(2026, 10, 4, 10)).includes("sunday-market"));
  assert.ok(!ids(zoned(2026, 10, 5, 10)).includes("sunday-market"));
  const pink = windowsBetween(zoned(2026, 10, 5, 0), zoned(2026, 10, 6, 0)).filter((w) => w.event.id === "pink-moment");
  assert.equal(pink.length, 1);
  assert.equal((pink[0].end.getTime() - pink[0].start.getTime()) / 6e4, 35);
  assert.ok(ids(new Date(pink[0].start.getTime() + 6e4)).includes("pink-moment"));
});

test("range check finds the spot you stand on", () => {
  assert.equal(hotspotsInRange(hotspotById("soule-park")!.at)[0].id, "soule-park");
  assert.equal(hotspotsInRange([-119.2, 34.49]).length, 0);
});
