# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 18.3s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- Guide "Libbey" hurts runs that take it (Δ -1.2).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 21.1 | 8 | 17 | 36 | 71 |
| explore | 14.9 | 7 | 15 | 24 | 47 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill.

| enemy | tier | met | death rate | catch rate | avg turns |
|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 1715 | 48% | 32% | 6.8 |
| The Order of the Star | boss | 2562 | 14% | 36% | 6.2 |
| The Developer | elite | 3850 | 12% | 34% | 4.8 |
| The Short-Term Rental | normal | 872 | 4% | 40% | 2.8 |
| The Oak Grove Mom | elite | 3949 | 3% | 62% | 7.4 |
| The Sound Healer | elite | 3798 | 3% | 42% | 5.6 |
| The E-Bike Teen | normal | 863 | 3% | 37% | 2.2 |
| Parking Enforcement | normal | 886 | 2% | 37% | 2.3 |
| The $9 Latte | normal | 839 | 1% | 53% | 3.2 |
| The Influencer | normal | 858 | 1% | 36% | 2.3 |
| The Crystal Vendor | normal | 881 | 1% | 41% | 2.8 |
| The Manifestor | normal | 818 | 1% | 38% | 2.3 |

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 18% | 9.0 |
| diamonds | 33% | 8.5 |
| spades | 24% | 9.0 |
| clubs | 24% | 8.9 |

Plays: 110325. Combos: 32% of plays. Powers blocked by immunity: 26502. Yields: 983. Refreshes used per run: 4.6. Catches per run: 4.3.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| The Channeler | +1.9 | 176 |
| Olive Oil Tasting | +1.0 | 210 |
| Old Money | +0.8 | 192 |
| Pink Moment | +0.7 | 183 |
| Arcade Lease | +0.7 | 174 |
| Second Opinion | +0.6 | 231 |
| Mahatma Letter | +0.5 | 170 |
| Wildflower | +0.3 | 191 |
| Heirloom Tomato | +0.0 | 201 |
| Trust Fund | -0.2 | 188 |
| Let Go | -0.5 | 186 |
| Cold Plunge | -0.5 | 218 |
| The Oak | -0.6 | 197 |
| Shelf Road | -0.9 | 208 |
| Sage Bundle | -1.4 | 210 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -0.2 | 306 |
| 2 | -0.3 | 330 |
| 3 | +1.3 | 313 |
| 4 | -0.7 | 295 |
| 5 | -0.4 | 307 |
| 6 | -0.4 | 326 |
| 7 | -0.1 | 291 |
| 8 | +0.5 | 305 |
| 9 | -0.4 | 312 |
| 10 | +0.9 | 275 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| Blavatsky | Half your shield (up to 5) carries into the next fight. | +2.8 | 89 |
| Ojai Day | +1 Refresh now, and after every boss. | +2.5 | 243 |
| Besant | Combos deal +4 damage. | +2.2 | 235 |
| Krishnamurti | Combos have no cap. | +1.0 | 85 |
| Leadbeater | Start each fight by drawing 2. | +0.8 | 244 |
| The Sound Bath | Pay an attack with 3+ cards: draw 1. | +0.7 | 240 |
| The People's Market | Aces count as every suit. | +0.7 | 73 |
| The Life Coach | Your first play each fight deals double. | +0.6 | 231 |
| Pink Moment | Exact kills also recover 5 cards. | +0.1 | 237 |
| The Arcade | Playing a card worth 10+ draws 1. | +0.1 | 263 |
| The Oak Grove | +1 hand size. | -0.0 | 81 |
| The Ceremony | Your first play each fight ignores immunity. | -0.1 | 240 |
| The Silent Retreat | Enemy attacks are 1 lower. | -0.1 | 254 |
| Meditation Mount | After each fight, recover 4 cards. | -0.3 | 261 |
| The Farmers Market | Hearts recover 2 extra cards. | -0.4 | 261 |
| The Realtor | +6 gold per fight. Catches pay 20. | -0.9 | 243 |
| The Crystal Shop | Spade shields +2. | -0.9 | 255 |
| Libbey | Diamonds draw 1 extra card. | -1.2 | 243 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| Krishnamurti + The Oak Grove | 16 | 30.3 | +2.8 |
| Blavatsky + Ojai Day | 31 | 28.5 | +2.3 |
| The Arcade + The Oak Grove | 46 | 27.0 | +2.2 |
| The People's Market + The Sound Bath | 41 | 27.3 | +1.9 |
| Ojai Day + The People's Market | 35 | 29.4 | +1.8 |
| The Life Coach + The People's Market | 36 | 27.0 | +1.3 |
| Libbey + The People's Market | 32 | 24.7 | +1.2 |
| The Oak Grove + Ojai Day | 38 | 28.7 | +1.0 |

## Decisions

Close calls (best and second-best move within 10%): 27% of 119058 decisions. Higher means more real choices per turn.

Biggest single hit: 136 (median run's biggest: 30).
