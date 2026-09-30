/**
 * Terrain contour lines for the Ojai Valley and the Topatopa foothills,
 * traced from the public AWS Terrain Tiles (Terrarium PNG encoding, on S3,
 * no key). Output is committed to apps/map/public/geo/contours.geojson.
 *
 *   NODE_USE_ENV_PROXY=1 npx tsx tools/map/contours.ts
 *
 * (NODE_USE_ENV_PROXY is only needed behind an HTTPS proxy.)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { contours } from "d3-contour";

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../apps/map/public/geo/contours.geojson");
// Wider north than the street extract so the ridge line above Shelf Road shows.
const BBOX = [-119.34, 34.415, -119.16, 34.53] as const;
const Z = 13; // ~15 m per pixel at this latitude
const INTERVAL = 40; // metres; every 5th line (200 m) is an index contour
const TILE = "https://elevation-tiles-prod.s3.amazonaws.com/terrarium";

const lng2x = (lng: number) => ((lng + 180) / 360) * 2 ** Z;
const lat2y = (lat: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** Z;
};
const x2lng = (x: number) => (x / 2 ** Z) * 360 - 180;
const y2lat = (y: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** Z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

/** Douglas–Peucker; contours come out with a vertex per pixel edge. */
function simplify(pts: [number, number][], tol: number): [number, number][] {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-12;
    let best = -1;
    let bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > bestD) (bestD = d), (best = i);
    }
    if (best > 0) {
      keep[best] = 1;
      stack.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

async function main() {
  const tx0 = Math.floor(lng2x(BBOX[0]));
  const tx1 = Math.floor(lng2x(BBOX[2]));
  const ty0 = Math.floor(lat2y(BBOX[3]));
  const ty1 = Math.floor(lat2y(BBOX[1]));
  const w = (tx1 - tx0 + 1) * 256;
  const h = (ty1 - ty0 + 1) * 256;
  const elev = new Float64Array(w * h);
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let ty = ty0; ty <= ty1; ty++) {
      const url = `${TILE}/${Z}/${tx}/${ty}.png`;
      console.log(`fetching ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const png = PNG.sync.read(Buffer.from(await res.arrayBuffer()));
      for (let py = 0; py < 256; py++) {
        for (let px = 0; px < 256; px++) {
          const i = (py * 256 + px) * 4;
          const m = png.data[i] * 256 + png.data[i + 1] + png.data[i + 2] / 256 - 32768;
          elev[((ty - ty0) * 256 + py) * w + (tx - tx0) * 256 + px] = m;
        }
      }
    }
  }
  let max = -Infinity;
  let min = Infinity;
  for (const v of elev) (max = Math.max(max, v)), (min = Math.min(min, v));
  const thresholds: number[] = [];
  for (let t = Math.ceil(min / INTERVAL) * INTERVAL; t <= max; t += INTERVAL) thresholds.push(t);
  console.log(`elevation ${min.toFixed(0)}–${max.toFixed(0)} m, ${thresholds.length} levels`);

  // d3-contour returns filled MultiPolygons in pixel space; the rings are the
  // contour lines. Convert to lng/lat, clip to the bbox, emit as lines.
  const toLngLat = ([x, y]: number[]): [number, number] => [
    Math.round(x2lng(tx0 + x / 256) * 1e5) / 1e5,
    Math.round(y2lat(ty0 + y / 256) * 1e5) / 1e5,
  ];
  const inside = ([lng, lat]: [number, number]) =>
    lng >= BBOX[0] && lng <= BBOX[2] && lat >= BBOX[1] && lat <= BBOX[3];
  const features: object[] = [];
  for (const c of contours().size([w, h]).thresholds(thresholds)(Array.from(elev))) {
    for (const poly of c.coordinates) {
      for (const ring of poly) {
        let run: [number, number][] = [];
        const flush = () => {
          // Drop tiny loops (single trees / noise): < ~8 vertices.
          if (run.length >= 8) {
            features.push({
              type: "Feature",
              properties: { m: c.value, index: c.value % (INTERVAL * 5) === 0 ? 1 : 0 },
              geometry: { type: "LineString", coordinates: simplify(run, 0.00006) },
            });
          }
          run = [];
        };
        for (const p of ring) {
          const ll = toLngLat(p);
          if (inside(ll)) run.push(ll);
          else flush();
        }
        flush();
      }
    }
  }
  fs.writeFileSync(OUT, JSON.stringify({ type: "FeatureCollection", features }));
  console.log(`wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB, ${features.length} lines)`);
}

main();
