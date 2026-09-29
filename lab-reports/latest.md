# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 6.5s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- First boss is a wall: 44% of greedy runs die on floor 8.
- diamonds power is rarely used (11% of powers).
- clubs power is rarely used (8% of powers).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 10.5 | 7 | 8 | 15 | 41 |
| explore | 9.0 | 7 | 7 | 15 | 29 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill.

| enemy | tier | met | death rate | catch rate | avg turns |
|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 441 | 85% | 38% | 7.0 |
| The Order of the Star | boss | 1932 | 51% | 48% | 6.6 |
| The Developer | elite | 771 | 28% | 36% | 9.3 |
| The Sound Healer | elite | 761 | 26% | 51% | 7.1 |
| The Oak Grove Mom | elite | 727 | 11% | 50% | 9.7 |
| The Crystal Vendor | normal | 1194 | 3% | 56% | 4.5 |
| The Short-Term Rental | normal | 1261 | 2% | 48% | 3.6 |
| The E-Bike Teen | normal | 1280 | 2% | 42% | 3.1 |
| The Manifestor | normal | 1306 | 2% | 56% | 3.2 |
| The $9 Latte | normal | 1257 | 1% | 42% | 3.2 |
| Parking Enforcement | normal | 1320 | 1% | 40% | 3.2 |
| The Influencer | normal | 1204 | 1% | 44% | 2.5 |

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 24% | 7.9 |
| diamonds | 11% | 9.0 |
| spades | 58% | 7.6 |
| clubs | 8% | 9.0 |

Plays: 62796. Combos: 21% of plays. Powers blocked by immunity: 9549. Yields: 818. Refreshes used per run: 2.9. Catches per run: 2.7.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| The Channeler | +2.3 | 120 |
| Pink Moment | +1.3 | 127 |
| Mahatma Letter | +1.1 | 129 |
| The Oak | +0.6 | 135 |
| Trust Fund | +0.4 | 126 |
| Wildflower | +0.4 | 132 |
| Heirloom Tomato | +0.4 | 121 |
| Second Opinion | +0.4 | 140 |
| Arcade Lease | +0.2 | 125 |
| Let Go | -0.0 | 144 |
| Sage Bundle | -0.0 | 136 |
| Olive Oil Tasting | -0.1 | 112 |
| Cold Plunge | -0.1 | 149 |
| Old Money | -0.2 | 138 |
| Shelf Road | -0.5 | 150 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -0.3 | 204 |
| 2 | -0.7 | 175 |
| 3 | -0.5 | 170 |
| 4 | -0.1 | 180 |
| 5 | +0.3 | 198 |
| 6 | -0.9 | 183 |
| 7 | -0.5 | 199 |
| 8 | -0.1 | 207 |
| 9 | -0.2 | 201 |
| 10 | -0.2 | 220 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| Ojai Day | +1 Refresh now, and after every boss. | +2.6 | 45 |
| The People's Market | Aces count as every suit. | +2.4 | 20 |
| The Oak Grove | +1 hand size. | +1.8 | 20 |
| Libbey | Diamonds draw 1 extra card. | +1.0 | 54 |
| The Life Coach | Your first play each fight deals double. | +0.5 | 43 |
| Besant | Spade combos deal +4 damage. | +0.4 | 47 |
| The Ceremony | Your first play each fight ignores immunity. | +0.3 | 58 |
| Krishnamurti | Combos have no cap. | +0.1 | 13 |
| The Silent Retreat | Enemy attacks are 1 lower. | -0.1 | 50 |
| The Realtor | +6 gold per fight. Catches pay 20. | -0.1 | 48 |
| The Arcade | Playing a card worth 10+ draws 1. | -0.1 | 49 |
| Leadbeater | Start each fight with 4 shield. | -0.2 | 53 |
| The Sound Bath | Pay an attack with 3+ cards: draw 1. | -0.2 | 54 |
| Meditation Mount | After each fight, put 4 discarded cards back in your deck. | -0.3 | 58 |
| The Farmers Market | Clubs recycle 2 extra cards. | -0.4 | 48 |
| Pink Moment | Exact kills also put 5 discarded cards back in your deck. | -0.5 | 59 |
| Blavatsky | Half your shield (up to 5) carries into the next fight. | -0.9 | 23 |
| The Crystal Shop | Heart shields +2. | -0.9 | 45 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| The Arcade + The Realtor | 20 | 19.9 | +0.4 |
| Besant + Meditation Mount | 23 | 18.0 | +0.3 |
| Meditation Mount + The Sound Bath | 29 | 17.0 | +0.1 |
| The Arcade + The Crystal Shop | 27 | 19.0 | +0.0 |
| The Arcade + The Life Coach | 24 | 20.5 | +0.0 |
| Besant + The Sound Bath | 19 | 17.3 | -0.0 |
| The Crystal Shop + The Sound Bath | 19 | 16.6 | -0.3 |
| The Arcade + Pink Moment | 18 | 18.6 | -0.4 |

## Decisions

Close calls (best and second-best move within 10%): 23% of 69041 decisions. Higher means more real choices per turn.

Biggest single hit: 62 (median run's biggest: 11).
