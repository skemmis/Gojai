# The Pathless Land (Gojai)

Monorepo: `packages/core` (rules engine), `packages/sim` (bot + balance lab), `packages/map`, `packages/art` (theme tokens), `apps/play` (the play page), `apps/map`.
Checks: `npm run check`, `npm test`, `npm run build:play`, `npm run ui:check`.

## UI and visual design rules

Read `docs/DESIGN.md` before changing anything visible. The short version:

1. **Never draw art in code.** No hand-written SVG path data, CSS-drawn blobs, or shape hacks for anything illustrative (blots, shields, moons, frames, ribbons, ornaments). Use an inked asset from the art pipeline (`/mnt/project-files/gojai-art/`, generated with Gemini by the image thread; shipped as `apps/play/src/assets/ui-*.webp`) or an icon from a professional set (game-icons.net via `@iconify-json/game-icons`, CC BY 3.0, credit required). If the asset doesn't exist yet, ask for it; don't stand one in with vectors.
2. **Prove alignment with numbers.** Run `npm run ui:check` after every visible change. It renders the fight at 390x844, saves screenshots to `ui-shots/`, and fails if printed text is more than 1.5px off the centre of the shape it sits on, or if anything scrolls sideways or runs off screen. Add a rule to `CENTRED` in `tools/ui-check/check.mjs` for every new label-on-shape.
3. **Get a design critique before showing anyone.** After `ui:check` passes, run the `design-critic` agent (`.claude/agents/design-critic.md`) on `ui-shots/` and fix every FIX FIRST item before publishing or posting screenshots.
