// Renders the procedural stand-in subjects and runs each through every style.
// Output: out/mock/<style>-<subject>.png (+ the unstyled source).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { PNG } from "pngjs";
import { STYLES } from "../styles.js";
import { stylize } from "../process.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../out/mock");
fs.mkdirSync(outDir, { recursive: true });

// Logical (art) sizes: the pixel grid each subject is drawn on.
const SIZES = { place: [320, 180, 3], card: [150, 210, 3], enemy: [160, 160, 3] } as const;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.goto("file://" + path.join(here, "scenes.html"));
const urls = (await page.evaluate("render()")) as Record<keyof typeof SIZES, string>;
await browser.close();

for (const [subject, url] of Object.entries(urls) as [keyof typeof SIZES, string][]) {
  const buf = Buffer.from(url.split(",")[1], "base64");
  fs.writeFileSync(path.join(outDir, `source-${subject}.png`), buf);
  const src = PNG.sync.read(buf);
  const [width, height, scale] = SIZES[subject];
  for (const style of STYLES) {
    fs.writeFileSync(path.join(outDir, `${style.id}-${subject}.png`), stylize(src, style, { width, height, scale }));
  }
}
console.log("wrote", fs.readdirSync(outDir).length, "files to", outDir);
