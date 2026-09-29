# Art direction: The Pathless Land

Decided with Sam on 2026-09-29. The pixel-art explorations (packages/art rounds 1–3) are parked; this is the direction.

## The look

Rough, grotesque pen-and-ink illustration in the spirit of *From Hell*, framed like the 1909 Rider–Waite–Smith tarot. Tone is Gustave Doré rather than horror film: menace from shadow, stillness, scale and posture. No fangs, glowing eyes or snarls.

Colour is printed like a crude second ink: flat, saturated, slightly off-register, on the single most important thing in the picture (reference: `shelf-2.png`, the pink bluffs).

## Rules for the app

1. **Readability and playability win every argument.** If a flourish slows a decision, cut it.
2. **Ink and paper do almost all the work.** The UI is black ink on warm paper, or paper-coloured type on the night table during fights.
3. **Each spot ink means one thing, everywhere:**
   - Blood red: damage and danger (enemy attack intent, HP lost, strike values).
   - Gilt: reward (gold, catches, rares, perfect fights).
   - Pink Moment pink: live, time-bound events and nothing else.
4. **Text never sits on illustration.** Names and numbers live on title plates and bands, like a tarot card's caption.
5. **Numbers are always Libre Franklin**, lining and tabular. The display face is for names only.
6. **Suits are read by shape and by their power line** (Strike / Guard / Draw / Recall), not by colour. Pips are ink; only a strike's damage number is red.
7. **Square corners, hairline and double rules, no gradients, glows or soft shadows.** Unavailable things are hatched, like an engraver would shade them.
8. **Sprites are separate game elements**, generated on green and keyed out, never cut from scene art.

Tokens live in `packages/art/src/theme.ts`.
