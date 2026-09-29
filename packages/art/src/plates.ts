import { PNG } from "pngjs";
import type { RGB, Style } from "./styles.js";
import type { Raster } from "./process.js";

// Rendering by plates. Instead of pixelating one finished painting, every
// element arrives as its own layer tagged with a role, and each role has a
// fixed treatment: its value range, which ramp steps it may use, what
// texture carries its tone, and whether it gets a one-pixel keyline. This is
// how an engraver works (skies ruled lightly, masses cross-hatched, figures
// in solid ink), and it keeps neighbouring objects apart even when their
// source colours are close.

export type Texture = "none" | "hlines" | "vlines" | "diag" | "cross" | "stipple";

export interface RoleSpec {
  /** Remap source luminance into this range (0 = ink, 1 = paper). */
  range?: [number, number];
  /** Or force a single value. */
  tone?: number;
  /** Ink ramp steps this role may use (indices, dark → light). Default: all. */
  levels?: number[];
  texture: Texture;
  /** One-pixel keyline around the layer's silhouette. */
  outline?: boolean;
  /** Hard two-value threshold (lettering). */
  threshold?: boolean;
}

export type Roles = Record<string, RoleSpec>;

export const GRAVURE_ROLES: Roles = {
  paper:   { tone: 1, texture: "none" },
  sky:     { range: [0.78, 1], levels: [2, 4], texture: "hlines" },
  light:   { tone: 1, levels: [4], texture: "none" },
  feature: { range: [0.25, 1], texture: "vlines", outline: true },
  badge:   { range: [0.62, 0.62], texture: "none", outline: true },
  mid:     { range: [0.55, 0.85], levels: [2, 3, 4], texture: "stipple", outline: true },
  ground:  { range: [0.85, 1], levels: [3, 4], texture: "none", outline: true },
  near:    { range: [0.35, 0.65], levels: [0, 2, 3], texture: "diag" },
  mass:    { range: [0.02, 0.3], levels: [0, 2], texture: "cross", outline: true },
  figure:  { tone: 0, texture: "none" },
  line:    { tone: 0.3, levels: [1], texture: "none" },
  object:  { range: [0.4, 1], levels: [1, 2, 3, 4], texture: "diag", outline: true },
  text:    { threshold: true, texture: "none" },
};

export interface Layer { role: string; image: Raster }
export interface PlateOptions { width: number; height: number; scale: number }

const lum = (c: readonly number[]) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const chroma = (c: readonly number[]) => (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2])) / 255;
function hue(c: readonly number[]): number {
  const [r, g, b] = c, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const hueDist = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };
const hash = (x: number, y: number) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

/** Should this pixel take the darker of the two bracketing steps? frac = how far toward dark. */
export function mark(t: Texture, x: number, y: number, frac: number): boolean {
  if (frac <= 0.04) return false;
  if (frac >= 0.96) return true;
  const period = (f: number) => Math.max(1, Math.min(8, Math.round(1 / f)));
  switch (t) {
    case "none": return frac > 0.5;
    case "hlines": return y % period(frac) === 0;
    case "vlines": return x % period(frac) === 0;
    case "diag": return (x + y) % period(frac) === 0;
    case "cross": { const p = period(frac / 2 + 0.01); return (x + y) % p === 0 || (x - y + 64 * p) % p === 0; }
    case "stipple": return hash(x, y) < frac * 0.9;
  }
}

function pick(ramp: RGB[], idx: number[], v: number, t: Texture, x: number, y: number): RGB {
  const steps = idx.map((i) => ramp[i]).sort((a, b) => lum(a) - lum(b));
  if (steps.length === 1 || v <= lum(steps[0])) return steps[0];
  const top = steps[steps.length - 1];
  if (v >= lum(top)) return top;
  let i = 0;
  while (i < steps.length - 2 && v > lum(steps[i + 1])) i++;
  const lo = lum(steps[i]), hi = lum(steps[i + 1]);
  return mark(t, x, y, (hi - v) / (hi - lo)) ? steps[i] : steps[i + 1];
}

function downsampleRGBA(src: Raster, w: number, h: number) {
  const rgb = new Float32Array(w * h * 3), alpha = new Float32Array(w * h);
  const sx = src.width / w, sy = src.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
    const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
      const i = (yy * src.width + xx) << 2, al = src.data[i + 3] / 255;
      r += src.data[i] * al; g += src.data[i + 1] * al; b += src.data[i + 2] * al; a += al; n++;
    }
    const o = y * w + x;
    alpha[o] = a / n;
    if (a > 0) { rgb[o * 3] = r / a; rgb[o * 3 + 1] = g / a; rgb[o * 3 + 2] = b / a; }
  }
  return { rgb, alpha };
}

function upscale(buf: Uint8Array, w: number, h: number, scale: number): Buffer {
  const out = new PNG({ width: w * scale, height: h * scale });
  for (let y = 0; y < h * scale; y++) for (let x = 0; x < w * scale; x++) {
    const li = (Math.floor(y / scale) * w + Math.floor(x / scale)) * 3, oi = (y * w * scale + x) << 2;
    out.data[oi] = buf[li]; out.data[oi + 1] = buf[li + 1]; out.data[oi + 2] = buf[li + 2]; out.data[oi + 3] = 255;
  }
  return PNG.sync.write(out);
}

function accentFor(style: Style, c: readonly number[]): RGB[] | null {
  if (chroma(c) < style.accentChroma || !style.accents.length) return null;
  const h = hue(c);
  let best = style.accents[0], bd = Infinity;
  for (const a of style.accents) {
    const rep = a.colors.reduce((p, q) => (chroma(q) > chroma(p) ? q : p));
    const d = hueDist(h, hue(rep));
    if (d < bd) { bd = d; best = a; }
  }
  return best.colors;
}

export function renderPlates(layers: Layer[], style: Style, roles: Roles, opts: PlateOptions): Buffer {
  const { width: w, height: h, scale } = opts;
  const ink = style.ink.colors;
  const out = new Uint8Array(w * h * 3);
  const paper = ink[ink.length - 1];
  for (let i = 0; i < w * h; i++) out.set(paper, i * 3);

  for (const layer of layers) {
    const spec = roles[layer.role];
    if (!spec) throw new Error(`no treatment for role "${layer.role}"`);
    const { rgb, alpha } = downsampleRGBA(layer.image, w, h);
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[y * w + x] >= 0.5;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      const o = y * w + x, c = [rgb[o * 3], rgb[o * 3 + 1], rgb[o * 3 + 2]];
      const accent = accentFor(style, c);
      let v = lum(c);
      let col: RGB;
      const edge = spec.outline && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < w && ny < h && !inside(nx, ny);
      });
      if (spec.threshold) {
        col = v < 0.5 ? ink[0] : ink[ink.length - 1];
      } else if (accent) {
        if (spec.range) v = spec.range[0] + v * (spec.range[1] - spec.range[0]);
        col = edge ? accent[0] : pick(accent, accent.map((_, i) => i), v, spec.texture, x, y);
      } else if (edge) {
        col = ink[0];
      } else {
        if (spec.tone !== undefined) v = spec.tone;
        else if (spec.range) v = spec.range[0] + v * (spec.range[1] - spec.range[0]);
        col = pick(ink, spec.levels ?? ink.map((_, i) => i), v, spec.texture, x, y);
      }
      out.set(col, o * 3);
    }
  }
  return upscale(out, w, h, scale);
}

/** Automatic alternative for a single flattened image: ink keylines where value
 *  or intent changes, flat fills in a few steps, no dither at all. */
export function renderLineWash(src: Raster, style: Style, opts: PlateOptions & { levels: number[]; edge: number }): Buffer {
  const { width: w, height: h, scale } = opts;
  const { rgb } = downsampleRGBA(src, w, h);
  const ink = style.ink.colors;
  const out = new Uint8Array(w * h * 3);
  const px = (x: number, y: number) => { const o = (y * w + x) * 3; return [rgb[o], rgb[o + 1], rgb[o + 2]]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = px(x, y), v = lum(c), accent = accentFor(style, c);
    let isEdge = false;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      if (x + dx >= w || y + dy >= h) continue;
      const n = px(x + dx, y + dy);
      if (Math.abs(lum(n) - v) > opts.edge || (!accentFor(style, n)) !== !accent) isEdge = true;
    }
    let col: RGB;
    if (isEdge && lum(c) <= lum(px(Math.min(w - 1, x + 1), y)) + 0.01 && lum(c) <= lum(px(x, Math.min(h - 1, y + 1))) + 0.01) col = accent ? accent[0] : ink[0];
    else if (accent) col = pick(accent, accent.map((_, i) => i), v, "none", x, y);
    else col = pick(ink, opts.levels, v, "none", x, y);
    out.set(col, (y * w + x) * 3);
  }
  return upscale(out, w, h, scale);
}
