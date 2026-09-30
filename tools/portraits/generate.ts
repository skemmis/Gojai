/**
 * Generate player sprites with Gemini from rolled characters
 * (packages/clans/src/portrait.ts), with the enemy sprite pipeline
 * (gojai-art/sprites/raw: gen2.mjs, keyout.py, build.py): black ink on a green
 * key, keyed to a transparent PNG, cropped to the figure and stripped to grey,
 * so players and enemies sit on the same backdrops the same way.
 *
 *   GEMINI_API_KEY=... npm run portraits -- --out /path/to/dir [--n 12] [--seed 1]
 *   npm run portraits -- --out /path/to/dir --rekey   (re-key the raws already there)
 *
 * Writes <seed>.png (keyed), <seed>.raw.png and <seed>.prompt.txt per
 * character, plus manifest.json. The server would do the same per player at
 * signup, keyed by the seed stored on the profile.
 */
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import { rollCharacter, portraitPrompt, characterName } from "../../packages/clans/src/portrait.ts";
import { FACTION_IDS } from "../../packages/clans/src/factions.ts";

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const OUT = opt("out", "out/portraits");
const N = Number(opt("n", "12"));
const SEED = Number(opt("seed", "1"));
const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";
const REKEY = args.includes("--rekey");
if (!KEY && !REKEY) throw new Error("GEMINI_API_KEY is not set");

async function generate(prompt: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY! },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { aspectRatio: "3:4" } },
      }),
    });
    const j: any = await r.json();
    if (!r.ok) {
      console.error(JSON.stringify(j).slice(0, 300));
      continue;
    }
    const part = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
    if (part) return Buffer.from(part.inlineData.data, "base64");
  }
  return null;
}

/**
 * Chroma key, as keyout.py does it: the key colour and its spread come from
 * the image border; alpha ramps up with distance from the key; green spill is
 * clamped to the brighter of red and blue; then crop to the figure and strip
 * to grey (ink-only sprites carry no colour).
 */
function keyOut(buf: Buffer): Buffer {
  const src = PNG.sync.read(buf);
  const { width: w, height: h, data: d } = src;
  const px = (i: number) => [d[i] / 255, d[i + 1] / 255, d[i + 2] / 255];
  const border: number[][] = [];
  for (let x = 0; x < w; x++) border.push(px(4 * x), px(4 * ((h - 1) * w + x)));
  for (let y = 0; y < h; y++) border.push(px(4 * y * w), px(4 * (y * w + w - 1)));
  const med = (k: number) => border.map((p) => p[k]).sort((a, b) => a - b)[border.length >> 1];
  const key = [med(0), med(1), med(2)];
  const dist = (p: number[]) => Math.hypot(p[0] - key[0], p[1] - key[1], p[2] - key[2]);
  const bd = border.map(dist).sort((a, b) => a - b);
  const spread = bd[Math.floor(bd.length * 0.95)];
  const alpha = new Float32Array(w * h);
  for (let j = 0; j < w * h; j++) {
    const i = 4 * j;
    const p = px(i);
    alpha[j] = Math.min(1, Math.max(0, (dist(p) - spread * 1.2) / (spread * 2 + 0.06)));
    const g = Math.min(p[1], Math.max(p[0], p[2]) + 0.03);
    d[i] = d[i + 1] = d[i + 2] = Math.round((0.299 * p[0] + 0.587 * g + 0.114 * p[2]) * 255);
  }
  // Keep the figure and anything sizeable near it; drop specks (edge vignettes, stray marks).
  const label = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  for (let j = 0; j < w * h; j++) {
    if (alpha[j] <= 0.05 || label[j] >= 0) continue;
    const id = sizes.length;
    const stack = [j];
    label[j] = id;
    let n = 0;
    while (stack.length) {
      const k = stack.pop()!;
      n++;
      const x = k % w, y = (k - x) / w;
      for (const m of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1])
        if (m >= 0 && label[m] < 0 && alpha[m] > 0.05) (label[m] = id), stack.push(m);
    }
    sizes.push(n);
  }
  const keep = Math.max(40, Math.max(0, ...sizes) * 0.01);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let j = 0; j < w * h; j++) {
    const a = label[j] >= 0 && sizes[label[j]] >= keep ? alpha[j] : 0;
    d[4 * j + 3] = Math.round(a * 255);
    if (a > 0.05) {
      const x = j % w, y = (j - x) / w;
      (x0 = Math.min(x0, x)), (x1 = Math.max(x1, x)), (y0 = Math.min(y0, y)), (y1 = Math.max(y1, y));
    }
  }
  if (x1 < 0) return PNG.sync.write(src);
  const out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(src, out, x0, y0, out.width, out.height, 0, 0);
  return PNG.sync.write(out);
}

if (REKEY) {
  for (const f of fs.readdirSync(OUT).filter((f) => f.endsWith(".raw.png")))
    fs.writeFileSync(path.join(OUT, f.replace(".raw", "")), keyOut(fs.readFileSync(path.join(OUT, f))));
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
const manifest: Record<string, unknown>[] = [];
await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    const seed = SEED + i;
    const faction = FACTION_IDS[i % FACTION_IDS.length];
    const c = rollCharacter(seed, faction);
    const prompt = portraitPrompt(c);
    fs.writeFileSync(path.join(OUT, `${seed}.prompt.txt`), prompt);
    const img = await generate(prompt);
    if (!img) return console.warn("no image for seed", seed);
    fs.writeFileSync(path.join(OUT, `${seed}.raw.png`), img);
    fs.writeFileSync(path.join(OUT, `${seed}.png`), keyOut(img));
    manifest.push({ seed, faction, name: characterName(c), who: `${c.age} ${c.who}, ${c.build}, ${c.hair}`, pose: c.pose, touch: c.touch, file: `${seed}.png` });
    console.log("wrote", seed, characterName(c));
  }),
);
manifest.sort((a, b) => (a.seed as number) - (b.seed as number));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
