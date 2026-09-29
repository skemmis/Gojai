import { PNG } from "pngjs";
import type { RGB, Ramp, Style } from "./styles.js";

// Detailed pixel-art post-process. Fantasy-Reality's pixelate.ts takes a
// modal colour per cell, which is right for chunky avatars but flattens fine
// linework. Here we:
//   1. box-average the source down to the logical grid (keeps thin lines),
//   2. decide per pixel whether it has *earned* colour (chroma thresholds),
//   3. place it on the ink / tint / accent ramp by luminance, dithering
//      between neighbouring ramp steps (hatch lines or a Bayer matrix),
//   4. nearest-neighbour upscale so the pixels are baked in.

export interface Raster { width: number; height: number; data: Uint8Array | Buffer }

const BAYER8 = (() => {
  const m = [[0]];
  let cur = m;
  while (cur.length < 8) {
    const n = cur.length;
    const next: number[][] = Array.from({ length: n * 2 }, () => Array(n * 2).fill(0));
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = cur[y][x] * 4;
        next[y][x] = v;
        next[y][x + n] = v + 2;
        next[y + n][x] = v + 3;
        next[y + n][x + n] = v + 1;
      }
    cur = next;
  }
  return cur.map((row) => row.map((v) => (v + 0.5) / 64));
})();

/** 0..1 threshold: how dark a pixel must be, at this position, to take the darker ramp step. */
function threshold(kind: Style["dither"], x: number, y: number, frac: number): boolean {
  if (kind === "none") return frac > 0.5;
  if (kind === "bayer") return frac > BAYER8[y & 7][x & 7];
  // Engraver's hatch: first a single diagonal that thickens, then a crossing
  // diagonal on top of it for the darker half of the step.
  const t1 = (((x + y) & 3) + 0.5) / 4;
  const t2 = (((x - y) & 3) + 0.5) / 4;
  return t1 < Math.min(frac, 0.5) || t2 < (frac - 0.5) * 2;
}

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function hue(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return 0;
  let h: number;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

function rampHue(r: Ramp): number {
  let best = r.colors[0], bc = -1;
  for (const c of r.colors) { const ch = Math.max(...c) - Math.min(...c); if (ch > bc) { bc = ch; best = c; } }
  return hue(best[0], best[1], best[2]);
}

function onRamp(ramp: RGB[], l: number, dither: Style["dither"], x: number, y: number): RGB {
  // Position along the ramp from light (0) to dark; ramp is stored dark→light.
  const lums = ramp.map((c) => lum(c[0], c[1], c[2]));
  if (l <= lums[0]) return ramp[0];
  if (l >= lums[lums.length - 1]) return ramp[ramp.length - 1];
  let i = 0;
  while (i < lums.length - 2 && l > lums[i + 1]) i++;
  const frac = (lums[i + 1] - l) / (lums[i + 1] - lums[i]); // 0 → lighter step, 1 → darker
  return threshold(dither, x, y, frac) ? ramp[i] : ramp[i + 1];
}

export function boxDownsample(src: Raster, w: number, h: number): Float32Array {
  const out = new Float32Array(w * h * 3);
  const sx = src.width / w, sy = src.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      let r = 0, g = 0, b = 0, n = 0;
      for (let yy = y0; yy < y1; yy++)
        for (let xx = x0; xx < x1; xx++) {
          const i = (yy * src.width + xx) << 2;
          const a = src.data[i + 3] / 255;
          r += src.data[i] * a + 255 * (1 - a);
          g += src.data[i + 1] * a + 255 * (1 - a);
          b += src.data[i + 2] * a + 255 * (1 - a);
          n++;
        }
      const o = (y * w + x) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  }
  return out;
}

export interface ProcessOptions { width: number; height: number; scale: number }

/** Map a source image onto a style at the given logical size; returns an upscaled PNG buffer. */
export function stylize(src: Raster, style: Style, opts: ProcessOptions): Buffer {
  const { width: w, height: h, scale } = opts;
  const px = boxDownsample(src, w, h);
  const accentHues = style.accents.map(rampHue);
  const tintHues = style.tints.map(rampHue);
  const logical = new Uint8Array(w * h * 3);

  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 3;
      const r = px[o], g = px[o + 1], b = px[o + 2];
      const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const hh = hue(r, g, b);
      const l = Math.pow(lum(r, g, b), style.gamma);
      let ramp: RGB[] = style.ink.colors;
      if (chroma >= style.accentChroma && style.accents.length) {
        let bi = 0;
        accentHues.forEach((ah, i) => { if (hueDist(hh, ah) < hueDist(hh, accentHues[bi])) bi = i; });
        ramp = style.accents[bi].colors;
      } else if (chroma >= style.tintChroma && style.tints.length) {
        let bi = 0;
        tintHues.forEach((th, i) => { if (hueDist(hh, th) < hueDist(hh, tintHues[bi])) bi = i; });
        ramp = style.tints[bi].colors;
      }
      const c = onRamp(ramp, lum(r, g, b) === 0 ? 0 : l, style.dither, x, y);
      logical[o] = c[0]; logical[o + 1] = c[1]; logical[o + 2] = c[2];
    }

  const out = new PNG({ width: w * scale, height: h * scale });
  for (let y = 0; y < h * scale; y++)
    for (let x = 0; x < w * scale; x++) {
      const li = ((Math.floor(y / scale) * w) + Math.floor(x / scale)) * 3;
      const oi = (y * w * scale + x) << 2;
      out.data[oi] = logical[li]; out.data[oi + 1] = logical[li + 1]; out.data[oi + 2] = logical[li + 2]; out.data[oi + 3] = 255;
    }
  return PNG.sync.write(out);
}
