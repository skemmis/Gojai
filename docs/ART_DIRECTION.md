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
4. **Art may be lettered; game state never is.** Titles, numerals and price tags can be drawn into the art (Sam, 2026-09-29). Anything that changes in play (HP, damage, block, costs, timers) is always live UI type on a plate or band.
5. **Numbers are always Libre Franklin**, lining and tabular. The display face is for names only.
6. **Suits are read by shape and by their power line** (Strike / Guard / Draw / Recall), not by colour. Pips are ink; only a strike's damage number is red.
7. **Square corners, hairline and double rules, no gradients, glows or soft shadows.** Unavailable things are hatched, like an engraver would shade them.
8. **Sprites are separate game elements**, generated on green and keyed out, never cut from scene art.

Tokens live in `packages/art/src/theme.ts`.

## Fight backgrounds

Asked for by Sam on 2026-09-29, via the combat thread. The backdrop is the real neighbourhood you're fighting in.

1. **Format:** portrait plate, 1080×1440 (generate at 3:4). The ground line sits at **78% of the height**, a flat, readable floor where the sprite's feet land.
2. **Quiet column:** the middle of the plate (30–70% of the width, 35–78% of the height) is where the enemy stands. Keep it the calmest area: sparse detail, no bright shapes, no strong verticals directly behind the figure. The landmark lives at the sides and in the sky.
3. **Dark by construction:** draw it as pale ink on black, like scratchboard or a woodcut (see the black ground of `latte2-card-1.png`). The sprites are paper-coloured with black ink, so they pop against a dark plate. No large bright areas near the sprite.
4. **No colour in the art.** Plates are generated in pure ink. Time of day is a value shift in code (day lighter, night darker). **Pink Moment is the only coloured variant**: a rough, off-register pink wash on the sky or ridge band, and only while that live event is on. There's no lamplight gold, because gilt means reward.
5. **No vignette in the art.** Code adds one, so every plate matches.
6. **Two layers for motion:** a back plate (sky, landmark, ground) and an optional front layer on green key (branches, grass, a fence post) confined to the bottom and side edges and never over the quiet column. Code does parallax, sway and drifting fog. Enemy sprites stay still (animation is tabled).
7. **No figures and no text.** Plates never carry lettering, because it would compete with the UI. Real businesses get parody names if they show at all.
8. **Recognisable by silhouette:** use a slightly low, eye-level view with one landmark that says where you are (the Arcade's arches, Libbey Park's oaks, the trail's fence and eucalyptus, the Topatopa bluffs from Shelf Road).
9. **Manifest** (in `/mnt/project-files/gojai-art/backgrounds/manifest.json`, keyed by territory id): `file`, `front` (optional), `territory`, `name`, `width`, `height`, `ground_y` (px), `quiet_rect` `[x, y, w, h]` in px.
