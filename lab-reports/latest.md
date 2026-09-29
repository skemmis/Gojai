# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 40.0s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- Guide "The Arcade" hurts runs that take it (Δ -1.3).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 16.9 | 7 | 15 | 31 | 47 |
| explore | 13.0 | 7 | 15 | 15 | 47 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill. Perfect = share won without losing HP. HP lost is per won fight (you start with 40).

| enemy | tier | met | death rate | HP lost | perfect | catch rate | avg turns |
|---|---|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 1521 | 75% | 26.4 | 0% | 26% | 3.5 |
| The Order of the Star | boss | 2294 | 25% | 15.9 | 3% | 38% | 3.4 |
| The Sound Healer | elite | 850 | 12% | 12.8 | 4% | 37% | 3.3 |
| The Oak Grove Mom | elite | 818 | 5% | 6.8 | 23% | 42% | 7.0 |
| The Developer | elite | 878 | 5% | 5.9 | 34% | 32% | 5.1 |
| The Influencer | normal | 2538 | 1% | 2.3 | 70% | 39% | 2.2 |
| The Manifestor | normal | 2416 | 1% | 3.0 | 56% | 39% | 2.4 |
| Parking Enforcement | normal | 2562 | 0% | 1.6 | 61% | 41% | 2.6 |
| The Crystal Vendor | normal | 2546 | 0% | 1.3 | 66% | 34% | 3.4 |
| The E-Bike Teen | normal | 2555 | 0% | 1.2 | 67% | 39% | 2.5 |
| The $9 Latte | normal | 2496 | 0% | 1.0 | 72% | 39% | 2.7 |
| The Short-Term Rental | normal | 2501 | 0% | 0.6 | 82% | 38% | 2.6 |

Early fights (normal, floors 1-4): 5708 fought, death rate 0%, HP lost 1.5, perfect 69%, 2.6 turns.

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 21% | 8.5 |
| diamonds | 15% | 3.2 |
| spades | 51% | 9.4 |
| clubs | 13% | 3.1 |

Plays: 215894. Matched (pair or better): 19% of plays. Powers blocked by immunity: 43972. Perfect fights: 52%. Catches per run: 4.2.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| Pink Moment | +2.0 | 489 |
| Sage Bundle | +2.0 | 179 |
| Heirloom Tomato | +1.2 | 185 |
| Let Go | +0.9 | 180 |
| Bike Lock | +0.8 | 167 |
| Mahatma Letter | +0.7 | 509 |
| Cold Plunge | +0.5 | 190 |
| Trust Fund | +0.3 | 462 |
| The Oak | +0.3 | 213 |
| Old Money | -0.2 | 174 |
| The Channeler | -0.2 | 509 |
| Wildflower | -0.3 | 179 |
| Olive Oil Tasting | -0.4 | 185 |
| Arcade Lease | -0.5 | 218 |
| Shelf Road | -1.2 | 183 |
| Second Opinion | -1.2 | 170 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -1.2 | 304 |
| 2 | -0.8 | 312 |
| 3 | -0.6 | 297 |
| 4 | -0.9 | 313 |
| 5 | -1.1 | 284 |
| 6 | -0.1 | 304 |
| 7 | +0.3 | 316 |
| 8 | +0.2 | 275 |
| 9 | -0.6 | 288 |
| 10 | -0.3 | 289 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| Meditation Mount | After each fight, heal 4. | +2.3 | 99 |
| Krishnamurti | Matching cards count one step more: a pair ×3, three of a kind ×4. | +2.2 | 36 |
| The Life Coach | Your first play each fight deals double. | +1.7 | 65 |
| Leadbeater | Start each fight with 6 block. | +1.4 | 78 |
| The People's Market | Aces count as every suit. | +1.2 | 32 |
| The Sound Bath | Each card you discard unplayed: +1 block next turn. | +1.0 | 85 |
| The Oak Grove | Draw 1 more card each turn. | +1.0 | 30 |
| The Farmers Market | Clubs recall 1 extra card. | +0.8 | 81 |
| The Silent Retreat | Enemy attacks are 1 lower. | +0.4 | 104 |
| Blavatsky | Block no longer wears off between your turns. | +0.2 | 38 |
| The Realtor | +6 gold per fight. Catches pay 20. | -0.1 | 94 |
| Ojai Day | +1 action on the first turn of each fight. | -0.2 | 37 |
| The Crystal Shop | Hearts block +2. | -0.4 | 93 |
| Pink Moment | Perfect fights also heal 6. | -0.6 | 93 |
| The Ceremony | Your first play each fight ignores immunity. | -0.6 | 97 |
| Besant | Matched spades deal +4 damage. | -0.7 | 108 |
| Libbey | Diamonds draw 1 extra card. | -0.9 | 88 |
| The Arcade | Playing a card worth 10+ draws 1. | -1.3 | 81 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| Blavatsky + Meditation Mount | 16 | 30.4 | +3.7 |
| The Ceremony + Ojai Day | 19 | 28.2 | +3.6 |
| The Ceremony + The People's Market | 18 | 26.2 | +3.4 |
| Leadbeater + The Sound Bath | 50 | 29.3 | +2.1 |
| Libbey + The Oak Grove | 16 | 24.5 | +2.0 |
| Blavatsky + The Sound Bath | 27 | 28.5 | +1.8 |
| Blavatsky + Leadbeater | 22 | 28.0 | +1.7 |
| Blavatsky + The Life Coach | 18 | 26.1 | +1.5 |

## Decisions

Close calls (best and second-best move within 10%): 50% of 266459 decisions. Higher means more real choices per turn.

Biggest single hit: 64 (median run's biggest: 29).
