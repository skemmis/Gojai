/**
 * UI check: renders the play page at phone size, joins, visits every screen
 * it can reach from the map, walks into a fight, saves
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
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
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
  ["intent on paper blot", ".threat > .mark", ".threat", "xy"],
  ["block number on shield", ".shield-mark b", ".shield-mark", "x"],
  ["suit and value on seal", ".gcard .seal .stamp", ".gcard .seal", "xy"],
  ["End turn on scroll", ".end span", ".end", "xy"],
  ["pile counts", ".pile b", ".pile b", "xy"],
  ["title on ribbon", ".k-screen-head .ribbon span", ".k-screen-head .ribbon span", "xy"],
  ["label on scroll button", ".k-scroll span", ".k-scroll", "xy"],
  ["word on nav seal", ".k-seal span", ".k-seal", "xy"],
  ["price on gilt tag", ".k-price b", ".k-price b", "xy"],
  ["name on arch banner", ".k-arch .banner", ".k-arch .banner", "xy"],
  ["rank on laurel", ".rank .n b", ".n", "xy"],
];

const args = process.argv.slice(2);
if (!args.includes("--no-build")) execSync("npm run build:play", { cwd: ROOT, stdio: "inherit" });
rmSync(OUT, { recursive: true, force: true });
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
    [...document.querySelectorAll(".table button, .ribbon, .threat, .drops, .pile, .moons, .k-screen button, .k-sheet, .k-choice, .map-nav, .map-top, .spot-sheet, .picker-layer button")]
      .map((el) => [el.className, el.getBoundingClientRect()])
      .filter(([, r]) => r.width && (r.left < -1 || r.right > window.innerWidth + 1))
      .map(([c]) => String(c)),
  );
  for (const c of spill) failures.push(`${state}: "${c}" runs off the screen`);
  // Words cut off by the box they're printed in (text wider or taller than its container)
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll(".table b, .table span, .table button, .table small, .k-screen b, .k-screen span, .k-screen button, .map-top span, .map-top b, .spot-sheet b, .spot-sheet span")]
      .filter((el) => el.childElementCount === 0 && el.textContent.trim() && el.getBoundingClientRect().width)
      .filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > el.parentElement.getBoundingClientRect().right + 1 && getComputedStyle(el.parentElement).overflow !== "visible")
      .map((el) => `"${el.textContent.trim()}"`),
  );
  for (const t of clipped) failures.push(`${state}: text ${t} is cut off by its box`);
  for (const [label, textSel, frameSel, axes] of CENTRED) {
    const texts = page.locator(textSel);
    const n = await texts.count();
    for (let i = 0; i < n; i++) {
      const t = texts.nth(i);
      if (!(await t.isVisible())) continue;
      // Skip text under an overlay (a picker or sheet on top): it isn't what anyone sees
      const onTop = await t.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        return !!hit && (el.contains(hit) || hit.contains(el) || el.parentElement.contains(hit));
      });
      if (!onTop) continue;
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

const pause = (ms) => page.waitForTimeout(ms);
const click = async (loc, ms = 500) => {
  await loc.click();
  await pause(ms);
};
/** Steer the run through the page's check hook (?uicheck): `fn` gets the run and the rules engine. */
const steer = async (fn, ms = 900) => {
  await page.evaluate((src) => window.__act((r) => new Function("r", "core", src)(r, window.__core)), fn);
  await pause(ms);
};

await page.goto(url + "?uicheck");
await pause(2500);
// First time: dealt faces, faction, name
await checkState("join");
await page.locator("#join-name").fill("Tester");
await click(page.getByRole("button", { name: "Begin" }), 2000);
await checkState("map");
// Close in, spots are cards with what each holds this roll stood on top (fight, elite, shop…); floor 3 so elites can show
await steer("r.floor = 3", 400);
const camera = (zoom) => page.evaluate((z) => { const m = window.__map; m.jumpTo({ zoom: z, center: [-119.2465, 34.4478] }); }, zoom);
await camera(16.2);
await pause(1500);
await checkState("map-close");
await camera(13.6);
await steer("r.floor = 1", 800);

// The screens behind the map's seals, then back to the map
for (const [seal, state] of [["Deck", "deck"], ["Clan", "clan"], ["Boards", "boards"], ["You", "profile"]]) {
  await click(page.locator(".map-nav .k-seal", { hasText: seal }), 700);
  await checkState(state);
  await click(page.getByRole("button", { name: "Back" }), 400);
}

// A spot opened on the map
await page.locator(".map-screen .spot.event").first().evaluate((el) => el.click());
await pause(500);
await checkState("spot");
await click(page.getByRole("button", { name: "Walk on" }), 300);

// Between-fight places, entered straight from the rules engine
await steer("r.floor = 2; r.hp = 28; core.enterEncounter(r, 'rest')");
await checkState("rest");
await click(page.locator(".k-choice", { hasText: "Upgrade" }));
await checkState("rest-picker");
await click(page.locator(".picker-layer .k-back"), 300);
await click(page.locator(".k-choice", { hasText: "Heal" }));
await steer("r.gold = 120; core.enterEncounter(r, 'shop')");
await checkState("shop");
await click(page.getByRole("button", { name: "Leave" }));
await steer("core.enterEncounter(r, 'mystery')");
await checkState("event");
await click(page.locator(".k-choice").first(), 700);
if (await page.locator(".picker-layer").count()) await click(page.locator(".picker-layer .card-pick").first(), 700);
await steer("r.floor = 1; r.phase = 'map'");

// Into a fight from the spot sheet
await page.locator(".map-screen .spot.event").first().evaluate((el) => el.click());
await pause(500);
await click(page.getByRole("button", { name: "Enter" }), 1200);
await checkState("fight-start");

const heart = page.locator(".gcard.s-hearts").first();
if (await heart.count()) {
  // Click its left edge: in a full hand the next card covers the rest
  await heart.click({ position: { x: 8, y: 30 } });
  await pause(300);
  await checkState("fight-holding-heart");
  await heart.click({ position: { x: 8, y: 30 } });
  await pause(600);
  await checkState("fight-after-heart");
}
await page.getByRole("button", { name: /End turn/ }).click();
await pause(1500);
await checkState("fight-next-turn");

// Clubs: play one, pick two cards to discard, confirm on the scroll
await steer("r.fight.enemy.hp = 99; r.fight.actions = 3; r.hand = r.hand.slice(0, 5); r.hand.push(core.plainCard(r, 3, 'clubs'))", 500);
{
  // Played through the engine (dragging is the page's own business); picking uses the page's taps
  await steer("core.play(r, r.hand[r.hand.length - 1].uid)", 600);
  const slots = page.locator(".slot.picking");
  if (await slots.count()) {
    await slots.nth(0).dispatchEvent("pointerdown");
    await slots.nth(1).dispatchEvent("pointerdown");
    await pause(400);
    await checkState("fight-discarding");
    await click(page.getByRole("button", { name: /Discard 2/ }), 600);
    if (await page.locator(".slot.picking").count()) failures.push("discarding didn't finish after confirming");
  } else failures.push("playing a club didn't ask which cards to discard");
}

// A foe whose next move isn't an attack: its glyph and number sit together on a paper blot
// Every kind of move that isn't an attack: its glyph and number sit together, centred on a paper blot
for (const [id, name, idx, state] of [
  ["influencer", "The Influencer", 0, "fight-hex"],
  ["crystal_vendor", "The Crystal Vendor", 1, "fight-brace"],
  ["short_term_rental", "The Short-Term Rental", 1, "fight-buff"],
  ["manifestor", "The Manifestor", 0, "fight-heal"],
]) {
  await steer(`Object.assign(r.fight.enemy, { id: '${id}', name: '${name}', intentIdx: ${idx} })`, 600);
  await checkState(state);
}

// Win it: one hit left, then any card
await steer("r.fight.enemy.hp = 1; r.fight.enemy.block = 0", 400);
// Every card hits, so any playable one finishes it (a hand can hold no spades)
const spade = page.locator(".gcard:not(.off)").first();
if (await spade.count()) {
  await spade.click({ position: { x: 8, y: 30 } });
  await pause(300);
  await spade.click({ position: { x: 8, y: 30 } });
  await pause(1800);
}
if (await page.locator(".k-screen.reward").count()) {
  // Show a catch, with the longest foe name, so the named card on the reward screen is measured too
  await steer("const d = __core.cardDef('catch_influencer'); r.reward.caught = { uid: 9999, def: d.id, value: d.value, suit: d.suit }", 500);
  await checkState("reward");
  // The other half of the choice: upgrade a card you already have
  const up = page.locator(".k-choice", { hasText: "Upgrade a card" });
  if (await up.count()) {
    await click(up);
    await checkState("reward-upgrade");
    await click(page.locator(".picker-layer .card-pick").first(), 600);
    await checkState("reward-upgraded");
  } else failures.push("the reward screen doesn't offer an upgrade");
}
else failures.push("winning the fight didn't reach the reward screen");

// And lose a run, for the offering
await steer("r.phase = 'map'; r.reward = null", 400);
await page.locator(".map-screen .spot.event").nth(1).evaluate((el) => el.click());
await pause(400);
await click(page.getByRole("button", { name: "Enter" }), 1200);
// End turns at 1 HP until a blow lands (the foe may block or buff first)
for (let i = 0; i < 6 && !(await page.locator(".k-screen.over").count()); i++) {
  await steer("r.hp = 1", 200);
  const end = page.getByRole("button", { name: /End turn/ });
  if (!(await end.count())) break;
  await end.click();
  await pause(1800);
}
if (await page.locator(".k-screen.over").count()) await checkState("over");
else failures.push("losing didn't reach the run-over screen");

await browser.close();
server.close();

if (pageErrors.length) failures.push(...pageErrors.map((e) => `page error: ${e}`));
const summary = [...report, "", failures.length ? `${failures.length} problem(s):` : "All checks passed.", ...failures.map((f) => `  - ${f}`)].join("\n");
writeFileSync(join(OUT, "report.txt"), summary + "\n");
console.log(summary);
console.log(`\nScreenshots: ${OUT}`);
process.exit(failures.length ? 1 : 0);
