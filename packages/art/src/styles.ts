// Candidate art directions for The Pathless Land. Each style is a locked set of
// colour ramps plus the rules for when colour is allowed at all:
//
//   ink      the base of every image: a single dark→light ramp. Anything the
//            source image didn't mean to colour ends up here, by luminance.
//   tints    optional muted washes (only the postcard style uses them).
//   accents  the "colour with intent" ramps: damage, reward, the live event.
//            A pixel only reaches an accent if the source was strongly
//            saturated there, so colour can't creep into the whole picture.
//
// The same ramps seed the generation prompt (see prompts.ts) and the
// post-process (process.ts), so the model and the snap agree.

export type RGB = readonly [number, number, number];

export interface Ramp {
  name: string;
  /** What this colour means in the game. Shown on the style sheet. */
  meaning: string;
  /** Dark → light. */
  colors: RGB[];
}

export type Dither = "hatch" | "bayer" | "none";

export interface Style {
  id: "gravure" | "postcard" | "night";
  name: string;
  pitch: string;
  ink: Ramp;
  tints: Ramp[];
  accents: Ramp[];
  /** Chroma (0..1) above which a pixel may take a tint. */
  tintChroma: number;
  /** Chroma (0..1) above which a pixel may take an accent. */
  accentChroma: number;
  dither: Dither;
  /** Luminance curve applied before mapping onto the ink ramp (1 = none). */
  gamma: number;
  /** Prompt language for the generator. */
  prompt: string;
}

const hex = (...hs: string[]): RGB[] =>
  hs.map((h) => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] as const);

export const STYLES: Style[] = [
  {
    id: "gravure",
    name: "A · Gravure",
    pitch:
      "From Hell played straight. Black ink cross-hatching on aged newsprint. The world is monochrome; colour appears only where the game needs you to look: blood-red for damage, gaslight gold for rewards, Pink Moment rose for the live event.",
    ink: { name: "Ink on newsprint", meaning: "Everything else", colors: hex("16110d", "4a3c30", "9a8a6c", "d8ccae", "f2e9d2") },
    tints: [],
    accents: [
      { name: "Oxblood", meaning: "Damage, spades, danger", colors: hex("3d0c0c", "6e1414", "a3241c", "d0402a") },
      { name: "Gaslight gold", meaning: "Rewards, catches, gold", colors: hex("5a3c0c", "9a6a14", "d6a22a", "f5d77a") },
      { name: "Pink Moment", meaning: "Live events, happening now", colors: hex("5a1a3a", "a3306a", "e0689a", "f7b3c8") },
    ],
    tintChroma: 1,
    accentChroma: 0.38,
    dither: "hatch",
    gamma: 0.65,
    prompt:
      "Detailed pixel art in the style of a 1920s engraved graphic novel (Eddie Campbell's From Hell, Victorian newspaper gravure): fine black ink linework and dense cross-hatching on warm aged newsprint. Almost entirely monochrome. Use colour ONLY on the single most important element, as a flat saturated accent.",
  },
  {
    id: "postcard",
    name: "B · Tinted Postcard",
    pitch:
      "A 1920s hand-coloured photo postcard of Ojai. A sepia ink key with faded watercolour washes (oak sage, dusty sky, adobe, faded rose) so the valley reads as a real place, and full-strength colour kept for the things that matter.",
    ink: { name: "Sepia key", meaning: "Line and shadow", colors: hex("20160f", "43301f", "6b5037", "957657", "bea283", "e3cfae", "f6ecd6") },
    tints: [
      { name: "Oak sage", meaning: "Oaks, orchards, chaparral", colors: hex("3e4a32", "5f6e48", "86936a", "b0b893") },
      { name: "Dusty sky", meaning: "Sky, water, distance", colors: hex("3f5260", "63798a", "8fa3b0", "c0ccd0") },
      { name: "Adobe", meaning: "Buildings, earth, skin", colors: hex("5c3824", "875a3e", "b08262", "d6b597") },
    ],
    accents: [
      { name: "Carmine", meaning: "Damage, spades, danger", colors: hex("5e0f14", "9c1c22", "d8342e", "f06a50") },
      { name: "Gilt", meaning: "Rewards, catches, gold", colors: hex("5c3e08", "a06e10", "e0aa28", "ffe08a") },
      { name: "Pink Moment", meaning: "Live events, happening now", colors: hex("6a1244", "b8306e", "f0609e", "ffbfdc") },
    ],
    tintChroma: 0.07,
    accentChroma: 0.42,
    dither: "bayer",
    gamma: 1,
    prompt:
      "Detailed pixel art in the style of a 1920s hand-tinted photographic postcard: a sepia ink key image with soft, faded watercolour washes of muted sage, dusty blue and adobe tan. Period printing texture. Keep washes desaturated; only the single most important element gets a vivid, saturated colour.",
  },
  {
    id: "night",
    name: "C · Night Edition",
    pitch:
      "The late-edition tabloid after dark. Deep blue-black lithograph, the valley lit only by lamplight. Warm amber is safety and reward, blood red is damage, and a hot magenta marks whatever is happening right now.",
    ink: { name: "Night litho", meaning: "Everything else", colors: hex("07080f", "101528", "1c2440", "2c3a5c", "46587e", "6e82a4", "a9b8cf") },
    tints: [],
    accents: [
      { name: "Blood", meaning: "Damage, spades, danger", colors: hex("2a0606", "6a0e0e", "b01c1c", "e84830") },
      { name: "Lamplight", meaning: "Rewards, catches, safety", colors: hex("4a2a08", "8e5412", "d68a1e", "ffc85a", "fff0c0") },
      { name: "Hot magenta", meaning: "Live events, happening now", colors: hex("4a0a30", "8e145a", "d42a86", "ff6ab4", "ffc4e4") },
    ],
    tintChroma: 1,
    accentChroma: 0.34,
    dither: "bayer",
    gamma: 1.5,
    prompt:
      "Detailed pixel art in the style of a 1920s pulp crime lithograph at night: deep blue-black shadows, cold moonlit greys, fine hatching. The scene is lit only by warm lamplight. Colour is used sparingly: one hot, saturated accent on the single most important element.",
  },
];
