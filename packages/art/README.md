# @gojai/art

Art direction tooling for The Pathless Land.

Sam's brief (2026-09-29): detailed pixel art, not blocky, with colour used with clear intent. Think *From Hell* as a 1920s pixel-art graphic novel.

## The rule every style shares

The world is ink. Colour only lands where the game needs your eye:

| Accent | Means |
|---|---|
| Red | Damage, spades, danger |
| Gold / lamplight | Rewards, catches, gold |
| Pink Moment | The live event happening now |

`process.ts` enforces this: a pixel can only reach an accent ramp if the source was strongly saturated there. Everything else is mapped by luminance onto the style's ink ramp (plus muted washes in the postcard style).

## Candidate styles (`src/styles.ts`)

- **A · Gravure**: black ink cross-hatching on newsprint. Most faithful to *From Hell*.
- **B · Tinted Postcard**: sepia key with faded washes, like 1920s hand-coloured Ojai postcards.
- **C · Night Edition**: blue-black lithograph lit by lamplight.

## Rendering by plates (round 2, Gravure)

Round 1 pixelated one finished painting and let brightness pick the hatching, so a grey sky got the same texture as a grey oak and shapes merged. `src/plates.ts` instead takes the picture as role-tagged layers (sky, feature, mid, ground, mass, near, object, figure, badge, text). Each role has a fixed value band, allowed ink steps, texture and keyline. For generation, this means each element is generated on its own against a key colour and then assembled, which the game needs anyway for parallax and sprites.

Lettering is never shrunk from a painting: it's set at native size in a pixel font (`fonts/`, OFL), and card names in the app will be live text.

## Commands

```bash
npm install
npm run mock                        # procedural stand-ins → out/mock/ (needs Chromium)
GEMINI_API_KEY=… npm run generate   # real samples → out/generated/
npm run generate -- --style night --subject enemy
npm run check
```

## How this differs from Fantasy-Reality's pixelate.ts

Fantasy-Reality picks the most common colour per cell on a 128-pixel grid, which is right for chunky avatars but erases thin lines. Here the source is box-averaged onto a finer grid (place 320×180, card 150×210, enemy 160×160), then dithered between ramp steps with engraver's hatching (A) or a Bayer matrix (B, C).
