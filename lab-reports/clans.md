# Clan lab report

200 seasons of 29 days per scenario, 64.9s. Map: 14 neighborhoods, real spots and timed events from @gojai/map.

## Who wins the season

Win = most neighborhood-days held; fair is 50% each. Dominance = the winner's share of all neighborhood-days (p90 over seasons).

| scenario | The Order of the Star | The Pathless | dominance mean / p90 | nobody holds | flips/day | lead changes | locked |
|---|---|---|---|---|---|---|---|
| baseline | 52% | 48% | 51% / 52% | 1% | 1.27 | 7.8 | 2.8 |
| head-count assigner | 43% | 57% | 53% / 57% | 1% | 1.28 | 7.4 | 2.7 |
| no invites | 48% | 53% | 51% / 52% | 1% | 1.23 | 7.7 | 2.9 |
| founding clique | 59% | 42% | 51% / 52% | 1% | 1.21 | 7.8 | 2.9 |
| forced clique | 85% | 15% | 52% / 54% | 1% | 1.25 | 7.0 | 2.8 |
| forced clique, no catch-up | 90% | 11% | 62% / 72% | 1% | 0.83 | 1.9 | 4.0 |
| events don't flip | 48% | 52% | 50% / 51% | 1% | 1.42 | 6.9 | 4.0 |
| no decay | 42% | 59% | 51% / 53% | 1% | 0.81 | 5.2 | 5.0 |
| small town | 49% | 51% | 51% / 54% | 2% | 1.27 | 6.0 | 2.4 |

Flips/day: neighborhoods changing holder per day. Lead changes: times the faction holding the most neighborhoods changed. Locked: neighborhoods held by one faction for 90%+ of the season.

## Where influence comes from

Share of all influence earned, by source (baseline mean), and play share by faction at season end (last 14 days).

| scenario | walking | offerings | bosses | duels | play share Order of the Star / Pathless | players | boss kills | duels/season |
|---|---|---|---|---|---|---|---|---|
| baseline | 39% | 50% | 8% | 3% | 50% / 50% | 288 | 98% | 207 |
| head-count assigner | 39% | 50% | 8% | 3% | 49% / 51% | 288 | 98% | 206 |
| no invites | 39% | 50% | 8% | 3% | 50% / 50% | 288 | 98% | 207 |
| founding clique | 39% | 51% | 7% | 3% | 50% / 50% | 288 | 99% | 232 |
| forced clique | 39% | 51% | 7% | 3% | 51% / 49% | 288 | 99% | 233 |
| forced clique, no catch-up | 38% | 52% | 7% | 3% | 51% / 49% | 288 | 99% | 233 |
| events don't flip | 39% | 50% | 8% | 3% | 50% / 50% | 288 | 98% | 207 |
| no decay | 39% | 50% | 8% | 3% | 50% / 50% | 288 | 98% | 207 |
| small town | 33% | 43% | 22% | 2% | 50% / 50% | 68 | 57% | 46 |

## Flags

- **forced clique**: season wins range 15% to 85%.
- **forced clique, no catch-up**: season wins range 11% to 90%.
- **forced clique, no catch-up**: in 1 season of 10 the winner holds 72% of the map.
- **no decay**: 5.0 neighborhoods never really change hands.

## Map as the bots walk it

Locked = share of baseline seasons where one faction held it 90%+ of the days.

| neighborhood | spots | locked | next to |
|---|---|---|---|
| arcade | 4 | 6% | libbey-park, west-matilija, north-end, sarzotti, foothills |
| libbey-park | 12 | 19% | arcade, west-matilija, arbolada, sarzotti, east-end, country-club, trail |
| west-matilija | 3 | 27% | arcade, libbey-park, arbolada, north-end, foothills |
| arbolada | 9 | 26% | libbey-park, west-matilija, foothills, country-club, westside, trail |
| north-end | 5 | 28% | arcade, west-matilija, sarzotti, foothills |
| sarzotti | 17 | 6% | arcade, libbey-park, north-end, foothills, east-end, creekside, trail |
| foothills | 39 | 0% | arcade, west-matilija, arbolada, north-end, sarzotti |
| east-end | 10 | 30% | libbey-park, sarzotti, creekside, trail |
| creekside | 13 | 31% | sarzotti, east-end, country-club, trail |
| country-club | 9 | 21% | libbey-park, arbolada, creekside, westside, meiners-oaks, trail |
| westside | 10 | 25% | arbolada, country-club, meiners-oaks, trail |
| meiners-oaks | 60 | 31% | country-club, westside, trail |
| the-mount | 1 | 1% |  |
| trail | 30 | 30% | libbey-park, arbolada, sarzotti, east-end, creekside, country-club, westside, meiners-oaks |

## Scenarios

- **baseline**: 120 at launch, 6 signups a day, friends invite friends, won events flip ground.
- **head-count assigner**: Assign by member count instead of recent play.
- **no invites**: Everyone auto-assigned, friends split up.
- **founding clique**: 12 devoted friends sign up at launch and all ask for the Order; the invite rule decides.
- **forced clique**: The same 12 all get the Order, invite rule ignored.
- **forced clique, no catch-up**: Forced clique with the underdog multiplier off.
- **events don't flip**: Won events only add influence (the earlier rule).
- **no decay**: Influence fades 2% a night instead of 15%.
- **small town**: 40 at launch, 1 signup a day: an early playtest.
