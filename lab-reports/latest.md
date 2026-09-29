# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 34.0s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- clubs power is rarely used (12% of powers).
- Card "Shelf Road" looks like a trap (Δ -1.7).
- Guide "Libbey" hurts runs that take it (Δ -1.7).
- Guide "The Farmers Market" hurts runs that take it (Δ -1.8).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 16.0 | 7 | 15 | 31 | 47 |
| explore | 12.2 | 7 | 15 | 15 | 47 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill. Perfect = share won without losing HP. HP lost is per won fight (you start with 40).

| enemy | tier | met | death rate | HP lost | perfect | catch rate | avg turns |
|---|---|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 1455 | 79% | 23.9 | 0% | 24% | 3.9 |
| The Order of the Star | boss | 2282 | 35% | 15.3 | 3% | 39% | 3.6 |
| The Sound Healer | elite | 1567 | 2% | 14.4 | 3% | 38% | 3.8 |
| The Developer | elite | 1510 | 1% | 6.2 | 28% | 32% | 5.3 |
| The Oak Grove Mom | elite | 1468 | 1% | 6.9 | 16% | 41% | 7.5 |
| The Manifestor | normal | 1101 | 0% | 3.2 | 53% | 42% | 2.5 |
| Parking Enforcement | normal | 1153 | 0% | 1.3 | 64% | 41% | 2.7 |
| The E-Bike Teen | normal | 1130 | 0% | 1.1 | 69% | 38% | 2.5 |
| The Crystal Vendor | normal | 1180 | 0% | 1.4 | 64% | 35% | 3.5 |
| The Short-Term Rental | normal | 1075 | 0% | 0.6 | 83% | 40% | 2.6 |
| The $9 Latte | normal | 1125 | 0% | 0.9 | 74% | 40% | 2.7 |
| The Influencer | normal | 1222 | 0% | 2.3 | 69% | 39% | 2.2 |

Early fights (normal, floors 1-4): 2261 fought, death rate 0%, HP lost 1.5, perfect 69%, 2.7 turns.

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 22% | 8.1 |
| diamonds | 13% | 3.2 |
| spades | 54% | 9.3 |
| clubs | 12% | 3.0 |

Plays: 179092. Matched (pair or better): 17% of plays. Powers blocked by immunity: 32536. Perfect fights: 38%. Catches per run: 2.7.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| Bike Lock | +2.3 | 133 |
| Pink Moment | +2.0 | 275 |
| Arcade Lease | +0.9 | 133 |
| Let Go | +0.9 | 123 |
| Old Money | +0.6 | 119 |
| The Channeler | +0.4 | 261 |
| Cold Plunge | +0.2 | 126 |
| The Oak | +0.1 | 113 |
| Olive Oil Tasting | +0.1 | 127 |
| Wildflower | -0.1 | 136 |
| Trust Fund | -0.2 | 246 |
| Second Opinion | -0.4 | 116 |
| Mahatma Letter | -0.4 | 286 |
| Sage Bundle | -0.5 | 138 |
| Heirloom Tomato | -1.0 | 137 |
| Shelf Road | -1.7 | 118 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -0.9 | 196 |
| 2 | -0.5 | 198 |
| 3 | -0.9 | 208 |
| 4 | +0.1 | 193 |
| 5 | -0.8 | 189 |
| 6 | +0.4 | 199 |
| 7 | -0.9 | 208 |
| 8 | -0.2 | 213 |
| 9 | +0.1 | 176 |
| 10 | -0.2 | 193 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| The Sound Bath | Each card you discard unplayed: +1 block next turn. | +1.7 | 115 |
| The Ceremony | Your first play each fight ignores immunity. | +1.6 | 124 |
| The Oak Grove | Draw 1 more card each turn. | +1.4 | 41 |
| Leadbeater | Start each fight with 6 block. | +1.3 | 121 |
| Pink Moment | Perfect fights also heal 6. | +1.0 | 142 |
| Meditation Mount | After each fight, heal 4. | +0.9 | 124 |
| The Silent Retreat | Enemy attacks are 1 lower. | +0.3 | 128 |
| The Crystal Shop | Hearts block +2. | +0.3 | 139 |
| Besant | Matched spades deal +4 damage. | +0.2 | 127 |
| The Arcade | Playing a card worth 10+ draws 1. | +0.2 | 131 |
| Krishnamurti | Matching cards count one step more: a pair ×3, three of a kind ×4. | -0.1 | 41 |
| Blavatsky | Block no longer wears off between your turns. | -0.1 | 48 |
| The Life Coach | Your first play each fight deals double. | -0.3 | 130 |
| The People's Market | Aces count as every suit. | -0.4 | 38 |
| The Realtor | +6 gold per fight. Catches pay 20. | -0.6 | 122 |
| Ojai Day | +1 action on the first turn of each fight. | -0.9 | 52 |
| Libbey | Diamonds draw 1 extra card. | -1.7 | 138 |
| The Farmers Market | Clubs recall 1 extra card. | -1.8 | 142 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| The Oak Grove + The Sound Bath | 24 | 30.7 | +4.7 |
| Blavatsky + The Sound Bath | 18 | 27.4 | +3.0 |
| Besant + The Oak Grove | 20 | 26.2 | +2.7 |
| The Life Coach + Ojai Day | 30 | 21.9 | +2.5 |
| Blavatsky + The Crystal Shop | 20 | 23.8 | +2.5 |
| Ojai Day + Pink Moment | 27 | 21.2 | +1.4 |
| Blavatsky + The Farmers Market | 16 | 21.5 | +1.2 |
| Leadbeater + The People's Market | 19 | 20.9 | +1.1 |

## Decisions

Close calls (best and second-best move within 10%): 48% of 225214 decisions. Higher means more real choices per turn.

Biggest single hit: 78 (median run's biggest: 24).
