# Gojai: The Pathless Land

A location-based card game set in Ojai, California. You walk to real places at real times (Pink Moment on Shelf Road, the Thursday market), fight in Regicide-style card battles, catch what you beat, and hold ground for your faction.

This repo is at **prototype v0**: the combat engine, a balance lab, and a web page to play runs. There's no map, art or multiplayer yet.

## Layout

| Path | What it is |
|---|---|
| `packages/core` | The rules engine: pure TypeScript, seeded, no I/O. The same code will run on phones, the server and the lab. |
| `packages/sim` | The balance lab: a bot plays thousands of runs and reports walls, dead cards, must-picks and broken Guide combos. |
| `apps/play` | A web page to play runs (React + Vite). |
| `docs/COMBAT.md` | The combat rules. |
| `lab-reports/latest.md` | The latest lab report. |

## Commands

```bash
npm install
npm run play                     # play in the browser
npm test                         # engine tests
npm run check                    # typecheck everything
npm run lab -- --runs 1000       # balance lab report to stdout
npm run lab -- --runs 1000 --out lab-reports/latest.md
```

Tuning: every balance number is in `packages/core/src/config.ts` (rules) or `packages/core/src/content.ts` (cards, Guides, enemies). Change a number, then rerun the lab.
