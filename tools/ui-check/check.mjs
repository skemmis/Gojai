/**
 * UI check: renders the play page at phone size, walks into a fight, saves
 * screenshots for review, and measures alignment in numbers instead of by eye.
 *
 *   npm run ui:check            (builds apps/play first)
 *   npm run ui:check -- --no-build
 *
 * For every rule in CENTRED it finds the text's actual ink (pixels in the
 * text's own colour) and checks that the ink's centre sits on the centre of
 * the thing it's printed on, within TOLERANCE css px. It also fails on
 * horizontal overflow and on anything that spills off the screen.
 * Screenshots land in ui-shots/ (gitignored); hand them to the design-critic
 * agent (.claude/agents/design-critic.md) before showing anyone.
 */
import { execSync } from "node:child_process";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { PNG } from "pngjs";

const ROOT = resolve(import.meta.dirname, "../..");
const DIST = join(ROOT, "apps/play/dist");
const OUT = join(ROOT, "ui-shots");
const VIEWPORT = { width: 390, height: 844 };
const SCALE = 2;
const TOLERANCE = 1.5;

/** Text that must sit centred on the shape it's printed on: [label, text selector, frame selector, axes]. */
const CENTRED = [
  ["enemy name on ribbon", ".ribbon span", ".ribbon span", "xy"],
  ["attack number on blot", ".threat.atk > b", ".threat.atk", "xy"],
  ["block number on shield", ".shield-mark b", ".shield-mark", "x"],
  ["card value on seal", ".gcard .seal b", ".gcard .seal", "xy"],
  ["End turn on scroll", ".end span", ".end", "xy"],
  ["pile counts", ".pile b", ".pile b", "xy"],
];

const args = process.argv.slice(2);
if (!args.includes("--no-build")) execSync("npm run build:play", { cwd: ROOT, stdio: "inherit" });
mkdirSync(OUT, { recursive: true });

// A tiny static server for the built page (module scripts don't load over file://)
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer((req, res) => {
  let p = join(DIST, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, "index.html");
  res.setHeader("content-type", TYPES[extname(p)] ?? "application/octet-stream");
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined),
  args: ["--use-gl=swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(String(e)));

const failures = [];
const report = [];

/** Centre of the ink of `text` (pixels close to its CSS colour) relative to the centre of `frame`. */
async function inkOffset(text, frame) {
  const info = await text.evaluate((t, f) => {
    const a = t.getBoundingClientRect();
    const b = f.getBoundingClientRect();
    const rgb = getComputedStyle(t).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    return { t: { x: a.x, y: a.y, w: a.width, h: a.height }, f: { x: b.x, y: b.y, w: b.width, h: b.height }, rgb };
  }, await frame.elementHandle());
  // Search for ink inside the text's box (trimmed a little, so frame outlines don't count)
  const pad = 2;
  const clip = { x: info.t.x + pad, y: info.t.y + pad, width: Math.max(1, info.t.w - 2 * pad), height: Math.max(1, info.t.h - 2 * pad) };
  if (clip.x < 0 || clip.y < 0 || clip.x + clip.width > VIEWPORT.width || clip.y + clip.height > VIEWPORT.height) return null;
  const png = PNG.sync.read(await page.screenshot({ clip }));
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      const d = Math.hypot(png.data[i] - info.rgb[0], png.data[i + 1] - info.rgb[1], png.data[i + 2] - info.rgb[2]);
      if (d < 60) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
  if (x1 < 0) return null;
  const inkX = clip.x + (x0 + x1 + 1) / 2 / SCALE;
  const inkY = clip.y + (y0 + y1 + 1) / 2 / SCALE;
  return { dx: inkX - (info.f.x + info.f.w / 2), dy: inkY - (info.f.y + info.f.h / 2) };
}

async function checkState(state) {
  await page.screenshot({ path: join(OUT, `${state}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) failures.push(`${state}: page scrolls sideways by ${overflow}px`);
  const spill = await page.evaluate(() =>
    [...document.querySelectorAll(".table button, .ribbon, .threat, .drops, .pile, .moons")]
      .map((el) => [el.className, el.getBoundingClientRect()])
      .filter(([, r]) => r.width && (r.left < -1 || r.right > window.innerWidth + 1))
      .map(([c]) => String(c)),
  );
  for (const c of spill) failures.push(`${state}: "${c}" runs off the screen`);
  for (const [label, textSel, frameSel, axes] of CENTRED) {
    const texts = page.locator(textSel);
    const n = await texts.count();
    for (let i = 0; i < n; i++) {
      const t = texts.nth(i);
      if (!(await t.isVisible())) continue;
      const frame = textSel === frameSel ? t : t.locator(`xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' ${frameSel.split(".").pop().split(" ")[0]} ')][1]`);
      const off = await inkOffset(t, frame);
      if (!off) continue;
      const bad = (axes.includes("x") && Math.abs(off.dx) > TOLERANCE) || (axes.includes("y") && Math.abs(off.dy) > TOLERANCE);
      const line = `${state}: ${label}${n > 1 ? ` #${i + 1}` : ""} off centre by x ${off.dx.toFixed(1)}, y ${off.dy.toFixed(1)} px`;
      report.push(`${bad ? "FAIL" : "ok  "} ${line}`);
      if (bad) failures.push(line);
    }
  }
}

await page.goto(url);
await page.waitForTimeout(2500);
await page.getByRole("button", { name: "Spots", exact: true }).click();
await page.locator(".open-btn").first().click();
await page.waitForTimeout(1200);
await checkState("fight-start");

const heart = page.locator(".gcard.s-hearts").first();
if (await heart.count()) {
  await heart.click();
  await page.waitForTimeout(300);
  await checkState("fight-holding-heart");
  await heart.click();
  await page.waitForTimeout(600);
  await checkState("fight-after-heart");
}
await page.getByRole("button", { name: /End turn/ }).click();
await page.waitForTimeout(1500);
await checkState("fight-next-turn");

await browser.close();
server.close();

if (pageErrors.length) failures.push(...pageErrors.map((e) => `page error: ${e}`));
const summary = [...report, "", failures.length ? `${failures.length} problem(s):` : "All checks passed.", ...failures.map((f) => `  - ${f}`)].join("\n");
writeFileSync(join(OUT, "report.txt"), summary + "\n");
console.log(summary);
console.log(`\nScreenshots: ${OUT}`);
process.exit(failures.length ? 1 : 0);
