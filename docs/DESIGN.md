# UI design process

The art (Gemini ink illustrations, the Moon deck, the inked UI pieces) is good; the problems have come from UI drawn in code and alignment judged by eye. These rules keep them out.

## Where visuals come from

| Need | Source |
|---|---|
| Illustrations, backgrounds, card faces | Image thread (Gemini), `/mnt/project-files/gojai-art/` |
| UI ornaments: blots, shields, moons, drops, piles, ribbons, scrolls, frames | Image thread, keyed transparent PNG, `gojai-art/ui/` then `apps/play/src/assets/ui-*.webp` |
| Small symbols (suits, intents, status) | Drawn intent glyphs from the art thread, or game-icons.net (`@iconify-json/game-icons`, CC BY 3.0, credit in the About screen) |
| Layout, text, numbers, animation | Code |

Code only places, sizes, tints and animates these. It never draws them.

## Placing text on art

- Measure the shape's usable area from the image itself (alpha bounds) and inset the text box to it; note the measured numbers in a comment.
- Centre text by its capitals: `text-box: trim-both cap alphabetic`. Fonts ship with the app (`@fontsource`), so measurements match what players see.
- Add every label-on-shape to `CENTRED` in `tools/ui-check/check.mjs`. It checks the ink, not the box.

## Review loop

1. Change the UI.
2. `npm run ui:check` until it passes (screenshots in `ui-shots/`).
3. Run the `design-critic` agent; fix its FIX FIRST items; repeat from 2.
4. Only then publish the play page or post screenshots.
