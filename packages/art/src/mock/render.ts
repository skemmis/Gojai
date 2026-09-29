// Renders the procedural stand-in subjects and runs them through each
// renderer. Output: out/mock/<style>-<method>-<subject>.png
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import { STYLES } from "../styles.js";
import { stylize } from "../process.js";
import { GRAVURE_ROLES, renderLineWash, renderPlates } from "../plates.js";
import { idImageFromLayers, renderInk } from "../ink.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../out/mock");
fs.mkdirSync(outDir, { recursive: true });

// Logical (art) grid per subject, and display upscale.
const SIZES = { place: [320, 180, 3], card: [150, 210, 3], enemy: [160, 160, 3] } as const;

type Rendered = { flat: string; layers: { name: string; role: string; url: string }[] };
const decode = (url: string) => PNG.sync.read(Buffer.from(url.split(",")[1], "base64"));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.goto("file://" + path.join(here, "scenes.html"));
const subjects = (await page.evaluate("render()")) as Record<keyof typeof SIZES, Rendered>;
await browser.close();

const gravure = STYLES.find((s) => s.id === "gravure")!;
for (const [subject, r] of Object.entries(subjects) as [keyof typeof SIZES, Rendered][]) {
  const flat = decode(r.flat);
  fs.writeFileSync(path.join(outDir, `source-${subject}.png`), PNG.sync.write(flat));
  const [width, height, scale] = SIZES[subject];
  const write = (name: string, buf: Buffer) => fs.writeFileSync(path.join(outDir, `${name}-${subject}.png`), buf);

  for (const style of STYLES) write(style.id, stylize(flat, style, { width, height, scale }));

  const layers = r.layers.map((l) => ({ role: l.role, image: decode(l.url) }));
  write("gravure-linewash", renderLineWash(flat, gravure, { width, height, scale, levels: [0, 2, 4], edge: 0.16 }));
  write("gravure-plates", renderPlates(layers, gravure, GRAVURE_ROLES, { width, height, scale }));
  write("ink2d", renderInk(idImageFromLayers(layers, width, height), gravure, { width, height, scale, lo: 0.2, hi: 0.75, pattern: "bayer", mid: 0.5 }));
  write("gravure-plates-hi", renderPlates(layers, gravure, GRAVURE_ROLES, { width: width * 1.5, height: height * 1.5, scale: 2 }));
}
console.log("wrote", fs.readdirSync(outDir).length, "files to", outDir);
