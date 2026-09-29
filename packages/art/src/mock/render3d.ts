// Renders the 3D diorama stand-ins through the Obra Dinn-style ink renderer.
// Output: out/mock/ink3d-<subject>[-hi].png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { STYLES } from "../styles.js";
import { renderInk, type IdImage } from "../ink.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../out/mock");
fs.mkdirSync(outDir, { recursive: true });

interface Passes { w: number; h: number; ids: number[]; normals: number[]; light: number[]; text?: number[] }

const sizes = { place: [[320, 180], [480, 270], [640, 360], [960, 540], [1280, 720]], enemy: [[160, 160], [240, 240], [320, 320], [480, 480]] };
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files"],
});
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text()));
page.on("pageerror", (e) => console.log("[page error]", e.message));
await page.goto("file://" + path.join(here, "diorama.html"));
await page.waitForFunction("window.ready === true");
const res = (await page.evaluate(`render(${JSON.stringify(sizes)})`)) as Record<string, Passes[]>;
await browser.close();

const gravure = STYLES.find((s) => s.id === "gravure")!;

function toIdImage(p: Passes): IdImage {
  const n = p.w * p.h, ids = new Int32Array(n), rgb = new Float32Array(n * 3), overlay = new Uint8Array(n);
  const nrm = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    ids[i] = (p.ids[i * 4] << 16) | (p.ids[i * 4 + 1] << 8) | p.ids[i * 4 + 2];
    // Lighting comes back linear; encode to sRGB so the tone bands sit where the eye expects.
    rgb.set([0, 1, 2].map((k) => 255 * Math.pow(p.light[i * 4 + k] / 255, 1 / 2.2)), i * 3);
    nrm.set([p.normals[i * 4] / 127.5 - 1, p.normals[i * 4 + 1] / 127.5 - 1, p.normals[i * 4 + 2] / 127.5 - 1], i * 3);
    if (p.text?.[i]) overlay[i] = 1;
  }
  // Fold creases into the id map: split an object wherever its surface turns
  // sharply, so folds and facets get lines too (Pope's normal-based edges).
  const crease = Math.cos((40 * Math.PI) / 180);
  const out = new Int32Array(ids);
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const i = y * p.w + x;
    for (const j of [x + 1 < p.w ? i + 1 : -1, y + 1 < p.h ? i + p.w : -1]) {
      if (j < 0 || ids[j] !== ids[i] || ids[i] === 0) continue;
      const dot = nrm[i * 3] * nrm[j * 3] + nrm[i * 3 + 1] * nrm[j * 3 + 1] + nrm[i * 3 + 2] * nrm[j * 3 + 2];
      if (dot < crease) out[i] = -1 - i; // unique id → forces an edge here
    }
  }
  return { width: p.w, height: p.h, ids: out, rgb, overlay };
}

const write = (name: string, buf: Buffer) => fs.writeFileSync(path.join(outDir, name), buf);
// Each resolution is written at 1:1 plus an integer upscale to about 1000px wide for viewing.
for (const [subject, list] of Object.entries(res))
  for (const p of list) {
    const scale = Math.max(1, Math.round(960 / p.w));
    write(`ink3d-${subject}-${p.w}.png`, renderInk(toIdImage(p), gravure, { width: p.w, height: p.h, scale, lo: 0.15, hi: 0.7, pattern: "bayer", mid: 0.5 }));
  }
console.log("done");
