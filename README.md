# Gojai: The Pathless Land

A location-based card game set in Ojai, California. You walk to real places at real times (Pink Moment on Shelf Road, the Thursday market), fight card battles with a standard deck (spades attack, hearts defend, diamonds draw, clubs recycle), catch what you beat, and hold ground for your faction.

This repo is at **prototype v0**: the combat engine, a balance lab, and a web page to play runs. It also has the Ojai map (neighborhoods, spots, event spots, timed events) as data plus a viewable page. There's no art or multiplayer yet.

## Layout

| Path | What it is |
|---|---|
| `packages/core` | The rules engine: pure TypeScript, seeded, no I/O. The same code will run on phones, the server and the lab. |
| `packages/sim` | The balance lab: a bot plays thousands of runs and reports walls, dead cards, must-picks and broken Guide combos. |
| `apps/play` | A web page to play runs (React + Vite). |
| `packages/map` | The map as data: hand-drawn neighborhoods, spots and event spots (Pokémon Go style), timed events with sunset/full-moon math. Pure TypeScript. |
| `apps/map` | A phone-friendly web page showing the Ojai / Meiners Oaks map, neighborhoods, spots and upcoming events (React + MapLibre). |
| `tools/map` | One-time extractors for the base map (Overture Maps + AWS terrain tiles), output committed to `apps/map/public/geo`. |
| `docs/MAP.md` | How the map works and what's still to check on the ground. |
| `docs/COMBAT.md` | The combat rules. |
| `lab-reports/latest.md` | The latest lab report. |

## Commands

```bash
npm install
npm run play                     # play in the browser
npm run map                      # the Ojai map in the browser (--host, so a phone on the same wifi can open it)
npm test                         # engine tests
npm run check                    # typecheck everything
npm run lab -- --runs 1000       # balance lab report to stdout
npm run lab -- --runs 1000 --out lab-reports/latest.md
```

Tuning: every balance number is in `packages/core/src/config.ts` (rules) or `packages/core/src/content.ts` (cards, Guides, enemies). Change a number, then rerun the lab.
