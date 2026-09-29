import { PNG } from "pngjs";
import type { RGB, Style } from "./styles.js";
import type { Raster } from "./process.js";

// Obra Dinn-style two-colour rendering, after Lucas Pope's devlog:
//  - Lines come from object identity, not brightness. Every layer (or, in the
//    3D renderer, every object/face group) has an id, and a pixel-perfect
//    line is drawn wherever the id changes.
//  - Lines invert in the dark: black on light fills, paper on dark fills, so
//    shapes stay readable inside shadow.
//  - Light is crushed to three values (ink, 50% pattern, paper) instead of a
//    full ramp, which is what keeps the image from turning to mush.
//  - Only strongly saturated source pixels become the accent colour.

export interface IdImage { width: number; height: number; ids: Int32Array; rgb: Float32Array; /** Lettering on top: 0 none, 1 ink, 2 paper. */ overlay?: Uint8Array }

export type Pattern = "bayer" | "blue";

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
// Cheap blue-ish noise: interleaved gradient noise (Jimenez), good enough for stills.
const ign = (x: number, y: number) => (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;

export interface InkOptions {
  width: number; height: number; scale: number;
  /** Smoothstep edges for crushing light: below lo → ink, above hi → paper. */
  lo: number; hi: number;
  pattern: Pattern;
  /** Mid band renders as a pattern at this density (0..1). */
  mid: number;
}

function accentRamp(style: Style, r: number, g: number, b: number): RGB[] | null {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if ((mx - mn) / 255 < style.accentChroma) return null;
  const hue = (c: readonly number[]) => {
    const [R, G, B] = c, M = Math.max(R, G, B), m = Math.min(R, G, B), d = M - m;
    if (!d) return 0;
    const h = M === R ? ((G - B) / d) % 6 : M === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const h = hue([r, g, b]);
  let best = style.accents[0], bd = 999;
  for (const a of style.accents) {
    const rep = a.colors[Math.floor(a.colors.length / 2)];
    let d = Math.abs(hue(rep) - h) % 360; if (d > 180) d = 360 - d;
    if (d < bd) { bd = d; best = a; }
  }
  return best.colors;
}

export function renderInk(img: IdImage, style: Style, o: InkOptions): Buffer {
  const { width: w, height: h } = img;
  const ink = style.ink.colors[0], paper = style.ink.colors[style.ink.colors.length - 1];
  const out = new Uint8Array(w * h * 3);
  const tone = new Float32Array(w * h); // 0 ink .. 1 paper, after crushing
  for (let i = 0; i < w * h; i++) {
    const [r, g, b] = [img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]];
    // Accent surfaces are judged by their own brightness (max channel), so a
    // fully lit pink face reads as light, not as a mid grey.
    const v = accentRamp(style, r, g, b) ? Math.max(r, g, b) / 255 : lum(r, g, b);
    const t = Math.min(1, Math.max(0, (v - o.lo) / (o.hi - o.lo)));
    tone[i] = t * t * (3 - 2 * t);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    const [r, g, b] = [img.rgb[i * 3], img.rgb[i * 3 + 1], img.rgb[i * 3 + 2]];
    const t = tone[i];
    const thr = o.pattern === "bayer" ? BAYER4[(y & 3) * 4 + (x & 3)] : ign(x, y);
    // Three bands: ink, a patterned middle, paper.
    const band = t < 1 / 3 ? 0 : t < 2 / 3 ? 1 : 2;
    const dark = band === 0 || (band === 1 && thr < o.mid);
    const acc = accentRamp(style, r, g, b);
    let c: RGB = dark ? ink : paper;
    if (acc) c = dark ? acc[Math.max(0, Math.floor(acc.length / 2) - 1)] : acc[acc.length - 2];
    const idHere = img.ids[i];
    const edge = (x + 1 < w && img.ids[i + 1] !== idHere) || (y + 1 < h && img.ids[i + w] !== idHere);
    if (edge) {
      // Draw the line on whichever side is nearer the viewer isn't known in 2D;
      // use the darker-or-equal side, and invert on dark fills.
      c = band === 0 && !acc ? paper : acc ? acc[0] : ink;
    }
    if (img.overlay?.[i]) c = img.overlay[i] === 1 ? ink : paper;
    out.set(c, i * 3);
  }
  const s = o.scale, png = new PNG({ width: w * s, height: h * s });
  for (let y = 0; y < h * s; y++) for (let x = 0; x < w * s; x++) {
    const li = (Math.floor(y / s) * w + Math.floor(x / s)) * 3, oi = (y * w * s + x) << 2;
    png.data[oi] = out[li]; png.data[oi + 1] = out[li + 1]; png.data[oi + 2] = out[li + 2]; png.data[oi + 3] = 255;
  }
  return PNG.sync.write(png);
}

/** Build an id image from role-tagged 2D layers: each layer is one id, topmost wins. */
export function idImageFromLayers(layers: { role: string; image: Raster }[], w: number, h: number): IdImage {
  const ids = new Int32Array(w * h).fill(-1), rgb = new Float32Array(w * h * 3).fill(255), overlay = new Uint8Array(w * h);
  layers.forEach((layer, id) => {
    const src = layer.image, sx = src.width / w, sy = src.height / h;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.floor((x + 1) * sx), y0 = Math.floor(y * sy), y1 = Math.floor((y + 1) * sy);
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const j = (yy * src.width + xx) << 2, al = src.data[j + 3] / 255;
        r += src.data[j] * al; g += src.data[j + 1] * al; b += src.data[j + 2] * al; a += al; n++;
      }
      if (a / n < 0.5) continue;
      const i = y * w + x;
      if (layer.role === "text") { overlay[i] = lum(r / a, g / a, b / a) < 0.5 ? 1 : 2; continue; }
      ids[i] = id; rgb[i * 3] = r / a; rgb[i * 3 + 1] = g / a; rgb[i * 3 + 2] = b / a;
    }
  });
  return { width: w, height: h, ids, rgb, overlay };
}
