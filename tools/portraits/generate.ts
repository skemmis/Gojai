/**
 * Generate profile portraits with Gemini from rolled characters
 * (packages/clans/src/portrait.ts), then lock them to the house sepia ramp
 * (ink #2A1E14 to paper #ECE3CF by luminance), as the card art does.
 *
 *   GEMINI_API_KEY=... npm run portraits -- --out /path/to/dir [--n 12] [--seed 1] [--ref style.png]
 *
 * --ref attaches a reference image for the drawing style (the illustration
 * thread's reference card, gojai-art/tarot/REFERENCE-latte-titled.png).
 *
 * Writes <seed>.png (sepia), <seed>.raw.png and <seed>.prompt.txt per
 * portrait, plus manifest.json. The server would do the same per player at
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
const REF = opt("ref", "");
const KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash-image";
if (!KEY) throw new Error("GEMINI_API_KEY is not set");

const refPart = REF
  ? [{ inlineData: { mimeType: "image/png", data: fs.readFileSync(REF).toString("base64") } }]
  : [];
const REF_NOTE =
  "Match the drawing style of the attached reference card: its gritty, scratchy dip-pen line, dry-brush blacks and heavy shadow. Do NOT copy its subject, border, title or colours.";

async function generate(prompt: string): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY! },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [...refPart, { text: prompt }] }],
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

const INK = [42, 30, 20];
const PAPER = [236, 227, 207];

/**
 * Trim a thin margin (Gemini often draws an edge line despite "full bleed"),
 * then remap every pixel's luminance onto the ink-to-paper ramp.
 */
function sepia(buf: Buffer, trim = 0.045): Buffer {
  const src = PNG.sync.read(buf);
  const x0 = Math.round(src.width * trim);
  const y0 = Math.round(src.height * trim);
  const png = new PNG({ width: src.width - 2 * x0, height: src.height - 2 * y0 });
  PNG.bitblt(src, png, x0, y0, png.width, png.height, 0, 0);
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.min(1, Math.max(0, (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] - 20) / 215));
    for (let c = 0; c < 3; c++) d[i + c] = Math.round(INK[c] + (PAPER[c] - INK[c]) * l);
    d[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

fs.mkdirSync(OUT, { recursive: true });
const manifest: Record<string, unknown>[] = [];
await Promise.all(
  Array.from({ length: N }, async (_, i) => {
    const seed = SEED + i;
    const faction = FACTION_IDS[i % FACTION_IDS.length];
    const c = rollCharacter(seed, faction);
    const prompt = (REF ? REF_NOTE + "\n\n" : "") + portraitPrompt(c);
    fs.writeFileSync(path.join(OUT, `${seed}.prompt.txt`), prompt);
    const img = await generate(prompt);
    if (!img) return console.warn("no image for seed", seed);
    fs.writeFileSync(path.join(OUT, `${seed}.raw.png`), img);
    fs.writeFileSync(path.join(OUT, `${seed}.png`), sepia(img));
    manifest.push({ seed, faction, name: characterName(c), who: `${c.age} ${c.who}, ${c.build}, ${c.hair}`, pose: c.pose, touch: c.touch, file: `${seed}.png` });
    console.log("wrote", seed, characterName(c));
  }),
);
manifest.sort((a, b) => (a.seed as number) - (b.seed as number));
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
