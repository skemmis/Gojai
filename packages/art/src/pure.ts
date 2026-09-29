// "Pure" From Hell-style direction: no pixel grid at all. The image model draws
// a pen-and-ink illustration and we keep it as-is (optionally forcing it onto
// two inks), so we can judge the look before deciding how much pixel
// treatment, if any, it needs.
import type { Subject } from "./subjects.js";

export const PURE_STYLE =
  "A black-and-white pen-and-ink illustration in the manner of a late-Victorian graphic novel such as From Hell: scratchy, confident dip-pen linework, dense cross-hatching and heavy solid blacks, engraving-like texture, stark contrast, on off-white paper. Hand-drawn, not digital, not pixel art, no grey wash, no gradients.";

export const PURE_ACCENT =
  "Keep it black ink on paper except for ONE flat, saturated spot colour on the single most important element, printed like a second ink.";

export function buildPurePrompt(subject: Subject, accent: boolean): string {
  // Subject prompts end with a sentence naming their coloured element; the
  // pure mono variant drops that sentence.
  const body = accent ? subject.prompt : subject.prompt.replace(/\s*[^.]*only coloured element[^.]*\./, "");
  return [PURE_STYLE, accent ? PURE_ACCENT : "Pure black ink on paper, no colour at all.", `Subject: ${body}`, `Format: ${subject.aspect}.`, "No text, no letters, no signature, no watermark."].join("\n\n");
}
