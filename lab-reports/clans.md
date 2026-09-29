# Clan lab report

200 seasons of 29 days per scenario, 61.5s. Map: 14 neighborhoods, real spots and timed events from @gojai/map.

## Who wins the season

Win = most neighborhood-days held. A fair scenario sits near 33% each. Dominance = the winner's share of all neighborhood-days (p90 over seasons).

| scenario | The Order of the Star | The Pathless | The Readymades | dominance mean / p90 | nobody holds | flips/day | lead changes | locked |
|---|---|---|---|---|---|---|---|---|
| baseline | 41% | 28% | 31% | 35% / 36% | 1% | 1.88 | 7.6 | 2.2 |
| head-count assigner | 37% | 31% | 33% | 38% / 42% | 2% | 1.87 | 7.2 | 2.2 |
| no invites | 37% | 32% | 32% | 35% / 36% | 1% | 1.90 | 7.7 | 2.3 |
| founding clique | 45% | 28% | 27% | 34% / 36% | 2% | 1.83 | 7.5 | 2.5 |
| forced clique | 97% | 1% | 3% | 37% / 40% | 1% | 1.76 | 6.2 | 2.8 |
| forced clique, no catch-up | 99% | 0% | 1% | 64% / 82% | 1% | 1.16 | 0.8 | 6.0 |
| no decay | 7% | 43% | 51% | 35% / 37% | 1% | 1.30 | 4.6 | 3.9 |
| no perks | 32% | 34% | 35% | 35% / 36% | 1% | 1.96 | 8.2 | 1.6 |
| small town | 35% | 26% | 39% | 36% / 41% | 3% | 1.94 | 6.6 | 1.9 |

Flips/day: neighborhoods changing holder per day. Lead changes: times the faction holding the most neighborhoods changed. Locked: neighborhoods held by one faction for 90%+ of the season.

## Where influence comes from

Share of all influence earned, by source (baseline mean), and play share by faction at season end (last 14 days).

| scenario | walking | offerings | bosses | duels | play share Order of the Star / Pathless / Readymades | players | boss kills | duels/season |
|---|---|---|---|---|---|---|---|---|
| baseline | 41% | 47% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| head-count assigner | 41% | 48% | 9% | 3% | 33% / 33% / 34% | 288 | 98% | 209 |
| no invites | 41% | 48% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 209 |
| founding clique | 41% | 49% | 8% | 3% | 33% / 33% / 33% | 288 | 99% | 234 |
| forced clique | 41% | 48% | 7% | 3% | 34% / 33% / 33% | 288 | 99% | 235 |
| forced clique, no catch-up | 41% | 50% | 7% | 2% | 34% / 33% / 33% | 288 | 99% | 235 |
| no decay | 41% | 48% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| no perks | 39% | 50% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| small town | 35% | 41% | 22% | 2% | 33% / 33% / 33% | 68 | 57% | 50 |

## Flags

- **forced clique**: season wins range 1% to 97%.
- **forced clique, no catch-up**: season wins range 0% to 99%.
- **forced clique, no catch-up**: in 1 season of 10 the winner holds 82% of the map.
- **forced clique, no catch-up**: 6.0 neighborhoods never really change hands.
- **no decay**: season wins range 7% to 51%.

## Map as the bots walk it

Locked = share of baseline seasons where one faction held it 90%+ of the days.

| neighborhood | spots | locked | next to |
|---|---|---|---|
| arcade | 4 | 12% | libbey-park, west-matilija, north-end, sarzotti, foothills |
| libbey-park | 12 | 11% | arcade, west-matilija, arbolada, sarzotti, east-end, country-club, trail |
| west-matilija | 3 | 14% | arcade, libbey-park, arbolada, north-end, foothills |
| arbolada | 9 | 12% | libbey-park, west-matilija, foothills, country-club, westside, trail |
| north-end | 5 | 16% | arcade, west-matilija, sarzotti, foothills |
| sarzotti | 17 | 24% | arcade, libbey-park, north-end, foothills, east-end, creekside, trail |
| foothills | 39 | 16% | arcade, west-matilija, arbolada, north-end, sarzotti |
| east-end | 10 | 14% | libbey-park, sarzotti, creekside, trail |
| creekside | 13 | 17% | sarzotti, east-end, country-club, trail |
| country-club | 9 | 17% | libbey-park, arbolada, creekside, westside, meiners-oaks, trail |
| westside | 10 | 19% | arbolada, country-club, meiners-oaks, trail |
| meiners-oaks | 60 | 22% | country-club, westside, trail |
| the-mount | 1 | 7% |  |
| trail | 30 | 19% | libbey-park, arbolada, sarzotti, east-end, creekside, country-club, westside, meiners-oaks |

## Scenarios

- **baseline**: 120 at launch, 6 signups a day, friends invite friends, all rules on.
- **head-count assigner**: Assign by member count instead of recent play.
- **no invites**: Everyone auto-assigned, friends split up.
- **founding clique**: 12 devoted friends sign up at launch and all ask for the Order; the invite rule decides.
- **forced clique**: The same 12 all get the Order, invite rule ignored.
- **forced clique, no catch-up**: Forced clique with the underdog multiplier off.
- **no decay**: Influence fades 2% a night instead of 15%.
- **no perks**: Faction perks off, to measure what they add.
- **small town**: 40 at launch, 1 signup a day: an early playtest.
