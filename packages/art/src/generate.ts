// Generates each sample subject in each candidate style with Gemini, then
// runs the detailed post-process. Needs GEMINI_API_KEY.
//   npm run generate                       # all styles × subjects
//   npm run generate -- --style night      # one style
//   npm run generate -- --subject enemy    # one subject
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, Modality } from "@google/genai";
import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { STYLES, type Style } from "./styles.js";
import { SUBJECTS, type Subject } from "./subjects.js";
import { stylize } from "./process.js";

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../out/generated");

const arg = (flag: string) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : undefined; };

const toHex = (c: readonly number[]) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

export function buildPrompt(style: Style, subject: Subject): string {
  const ramps = [style.ink, ...style.tints, ...style.accents]
    .map((r) => `${r.name} (${r.meaning}): ${r.colors.map(toHex).join(" ")}`)
    .join("; ");
  return [
    style.prompt,
    `Subject: ${subject.prompt}`,
    `Format: ${subject.aspect}. Crisp pixel art with fine detail at roughly ${subject.size[0]}×${subject.size[1]} pixels of resolution: thin one-pixel lines, no chunky blocks, no blur, no anti-aliasing.`,
    `Use only these colours: ${ramps}.`,
    "No text, no letters, no watermark, no UI.",
  ].join("\n\n");
}

const decode = (buf: Buffer) =>
  buf[0] === 0x89 ? PNG.sync.read(buf) : jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error("Set GEMINI_API_KEY to generate samples."); process.exit(1); }
  const ai = new GoogleGenAI({ apiKey });
  fs.mkdirSync(outDir, { recursive: true });
  const styles = STYLES.filter((s) => !arg("--style") || s.id === arg("--style"));
  const subjects = SUBJECTS.filter((s) => !arg("--subject") || s.id === arg("--subject"));

  for (const style of styles)
    for (const subject of subjects) {
      const prompt = buildPrompt(style, subject);
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });
      const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
      if (!part?.inlineData?.data) { console.warn(`no image for ${style.id}-${subject.id}`); continue; }
      const raw = Buffer.from(part.inlineData.data, "base64");
      const base = path.join(outDir, `${style.id}-${subject.id}`);
      fs.writeFileSync(`${base}.raw.png`, raw);
      fs.writeFileSync(`${base}.prompt.txt`, prompt);
      const [width, height, scale] = subject.size;
      fs.writeFileSync(`${base}.png`, stylize(decode(raw), style, { width, height, scale }));
      console.log("wrote", base + ".png");
    }
}

main();
