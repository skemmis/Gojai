# Clan lab report

200 seasons of 29 days per scenario, 124.7s. Map: 14 neighborhoods, real spots and timed events from @gojai/map.

## Who wins the season

"3:" rows have three factions, "2:" rows only the Order and the Pathless. Win = most neighborhood-days held; fair is 33% each with three, 50% with two. Dominance = the winner's share of all neighborhood-days (p90 over seasons).

| scenario | The Order of the Star | The Pathless | The Third Camp | dominance mean / p90 | nobody holds | flips/day | lead changes | locked |
|---|---|---|---|---|---|---|---|---|
| 3: baseline | 33% | 32% | 35% | 35% / 36% | 1% | 1.69 | 9.6 | 1.0 |
| 3: head-count assigner | 38% | 28% | 34% | 38% / 42% | 1% | 1.67 | 9.1 | 1.1 |
| 3: no invites | 29% | 34% | 37% | 35% / 36% | 1% | 1.68 | 9.6 | 1.2 |
| 3: founding clique | 39% | 31% | 31% | 35% / 37% | 1% | 1.63 | 9.7 | 1.2 |
| 3: forced clique | 97% | 2% | 2% | 37% / 40% | 1% | 1.60 | 8.4 | 1.2 |
| 3: forced clique, no catch-up | 99% | 1% | 1% | 54% / 66% | 1% | 1.04 | 2.7 | 2.5 |
| 3: events don't flip | 32% | 34% | 35% | 35% / 36% | 1% | 1.96 | 8.2 | 1.6 |
| 3: no decay | 38% | 31% | 31% | 35% / 37% | 1% | 0.98 | 6.6 | 3.0 |
| 3: small town | 30% | 34% | 36% | 37% / 40% | 3% | 1.65 | 7.7 | 1.0 |
| 2: baseline | 52% | 48% | – | 51% / 52% | 1% | 1.27 | 7.8 | 2.8 |
| 2: head-count assigner | 43% | 57% | – | 53% / 57% | 1% | 1.28 | 7.4 | 2.7 |
| 2: no invites | 48% | 53% | – | 51% / 52% | 1% | 1.23 | 7.7 | 2.9 |
| 2: founding clique | 59% | 42% | – | 51% / 52% | 1% | 1.21 | 7.8 | 2.9 |
| 2: forced clique | 85% | 15% | – | 52% / 54% | 1% | 1.25 | 7.0 | 2.8 |
| 2: forced clique, no catch-up | 90% | 11% | – | 62% / 72% | 1% | 0.83 | 1.9 | 4.0 |
| 2: events don't flip | 48% | 52% | – | 50% / 51% | 1% | 1.42 | 6.9 | 4.0 |
| 2: no decay | 42% | 59% | – | 51% / 53% | 1% | 0.81 | 5.2 | 5.0 |
| 2: small town | 49% | 51% | – | 51% / 54% | 2% | 1.27 | 6.0 | 2.4 |

Flips/day: neighborhoods changing holder per day. Lead changes: times the faction holding the most neighborhoods changed. Locked: neighborhoods held by one faction for 90%+ of the season.

## Where influence comes from

Share of all influence earned, by source (baseline mean), and play share by faction at season end (last 14 days).

| scenario | walking | offerings | bosses | duels | play share Order of the Star / Pathless / Third Camp | players | boss kills | duels/season |
|---|---|---|---|---|---|---|---|---|
| 3: baseline | 39% | 50% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| 3: head-count assigner | 39% | 50% | 9% | 3% | 33% / 33% / 34% | 288 | 98% | 209 |
| 3: no invites | 39% | 50% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 209 |
| 3: founding clique | 39% | 51% | 8% | 3% | 33% / 33% / 33% | 288 | 99% | 234 |
| 3: forced clique | 39% | 51% | 8% | 3% | 34% / 33% / 33% | 288 | 99% | 235 |
| 3: forced clique, no catch-up | 38% | 52% | 7% | 3% | 34% / 33% / 33% | 288 | 99% | 235 |
| 3: events don't flip | 39% | 50% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| 3: no decay | 39% | 50% | 9% | 3% | 33% / 33% / 33% | 288 | 98% | 206 |
| 3: small town | 33% | 42% | 23% | 2% | 33% / 33% / 33% | 68 | 57% | 50 |
| 2: baseline | 39% | 50% | 8% | 3% | 50% / 50% / – | 288 | 98% | 207 |
| 2: head-count assigner | 39% | 50% | 8% | 3% | 49% / 51% / – | 288 | 98% | 206 |
| 2: no invites | 39% | 50% | 8% | 3% | 50% / 50% / – | 288 | 98% | 207 |
| 2: founding clique | 39% | 51% | 7% | 3% | 50% / 50% / – | 288 | 99% | 232 |
| 2: forced clique | 39% | 51% | 7% | 3% | 51% / 49% / – | 288 | 99% | 233 |
| 2: forced clique, no catch-up | 38% | 52% | 7% | 3% | 51% / 49% / – | 288 | 99% | 233 |
| 2: events don't flip | 39% | 50% | 8% | 3% | 50% / 50% / – | 288 | 98% | 207 |
| 2: no decay | 39% | 50% | 8% | 3% | 50% / 50% / – | 288 | 98% | 207 |
| 2: small town | 33% | 43% | 22% | 2% | 50% / 50% / – | 68 | 57% | 46 |

## Flags

- **3: forced clique**: season wins range 2% to 97%.
- **3: forced clique, no catch-up**: season wins range 1% to 99%.
- **3: forced clique, no catch-up**: in 1 season of 10 the winner holds 66% of the map.
- **2: forced clique**: season wins range 15% to 85%.
- **2: forced clique, no catch-up**: season wins range 11% to 90%.
- **2: forced clique, no catch-up**: in 1 season of 10 the winner holds 72% of the map.
- **2: no decay**: 5.0 neighborhoods never really change hands.

## Map as the bots walk it

Locked = share of baseline seasons where one faction held it 90%+ of the days, with three factions / with two.

| neighborhood | spots | locked | next to |
|---|---|---|---|
| arcade | 4 | 0% / 6% | libbey-park, west-matilija, north-end, sarzotti, foothills |
| libbey-park | 12 | 6% / 19% | arcade, west-matilija, arbolada, sarzotti, east-end, country-club, trail |
| west-matilija | 3 | 14% / 27% | arcade, libbey-park, arbolada, north-end, foothills |
| arbolada | 9 | 9% / 26% | libbey-park, west-matilija, foothills, country-club, westside, trail |
| north-end | 5 | 13% / 28% | arcade, west-matilija, sarzotti, foothills |
| sarzotti | 17 | 1% / 6% | arcade, libbey-park, north-end, foothills, east-end, creekside, trail |
| foothills | 39 | 0% / 0% | arcade, west-matilija, arbolada, north-end, sarzotti |
| east-end | 10 | 13% / 30% | libbey-park, sarzotti, creekside, trail |
| creekside | 13 | 13% / 31% | sarzotti, east-end, country-club, trail |
| country-club | 9 | 10% / 21% | libbey-park, arbolada, creekside, westside, meiners-oaks, trail |
| westside | 10 | 10% / 25% | arbolada, country-club, meiners-oaks, trail |
| meiners-oaks | 60 | 11% / 31% | country-club, westside, trail |
| the-mount | 1 | 0% / 1% |  |
| trail | 30 | 7% / 30% | libbey-park, arbolada, sarzotti, east-end, creekside, country-club, westside, meiners-oaks |

## Scenarios

- **3: baseline**: 120 at launch, 6 signups a day, friends invite friends, won events flip ground.
- **3: head-count assigner**: Assign by member count instead of recent play.
- **3: no invites**: Everyone auto-assigned, friends split up.
- **3: founding clique**: 12 devoted friends sign up at launch and all ask for the Order; the invite rule decides.
- **3: forced clique**: The same 12 all get the Order, invite rule ignored.
- **3: forced clique, no catch-up**: Forced clique with the underdog multiplier off.
- **3: events don't flip**: Won events only add influence (the earlier rule).
- **3: no decay**: Influence fades 2% a night instead of 15%.
- **3: small town**: 40 at launch, 1 signup a day: an early playtest.
- **2: baseline**: 120 at launch, 6 signups a day, friends invite friends, won events flip ground.
- **2: head-count assigner**: Assign by member count instead of recent play.
- **2: no invites**: Everyone auto-assigned, friends split up.
- **2: founding clique**: 12 devoted friends sign up at launch and all ask for the Order; the invite rule decides.
- **2: forced clique**: The same 12 all get the Order, invite rule ignored.
- **2: forced clique, no catch-up**: Forced clique with the underdog multiplier off.
- **2: events don't flip**: Won events only add influence (the earlier rule).
- **2: no decay**: Influence fades 2% a night instead of 15%.
- **2: small town**: 40 at launch, 1 signup a day: an early playtest.
