# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 7.8s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- Card "The Channeler" looks like a must-pick (Δ +6.3).
- Guide "Krishnamurti" looks broken (Δ +5.0).
- Guide "The Oak Grove" looks broken (Δ +4.8).
- Guide "The Farmers Market" hurts runs that take it (Δ -1.1).
- Guide "Libbey" hurts runs that take it (Δ -1.3).
- Guide "The Crystal Shop" hurts runs that take it (Δ -1.3).
- Guide "The Silent Retreat" hurts runs that take it (Δ -1.6).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 20.9 | 7 | 15 | 47 | 95 |
| explore | 12.8 | 7 | 11 | 15 | 63 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill. Perfect = share won without losing HP. HP lost is per won fight (you start with 40).

| enemy | tier | met | death rate | HP lost | perfect | catch rate | avg turns |
|---|---|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 1800 | 64% | 18.6 | 9% | 28% | 4.8 |
| The Order of the Star | boss | 2637 | 31% | 13.3 | 19% | 37% | 4.0 |
| The Sound Healer | elite | 2256 | 1% | 10.2 | 25% | 36% | 3.6 |
| The Developer | elite | 2149 | 0% | 4.0 | 46% | 31% | 5.0 |
| The Manifestor | normal | 1161 | 0% | 2.4 | 65% | 39% | 2.4 |
| The Influencer | normal | 1280 | 0% | 1.8 | 76% | 36% | 2.1 |
| The Oak Grove Mom | elite | 2192 | 0% | 3.4 | 43% | 43% | 6.7 |
| Parking Enforcement | normal | 1192 | 0% | 0.7 | 81% | 38% | 2.5 |
| The Short-Term Rental | normal | 1188 | 0% | 0.3 | 91% | 38% | 2.4 |
| The E-Bike Teen | normal | 1132 | 0% | 0.7 | 83% | 34% | 2.4 |
| The Crystal Vendor | normal | 1143 | 0% | 0.6 | 83% | 37% | 3.4 |
| The $9 Latte | normal | 1143 | 0% | 0.4 | 88% | 37% | 2.5 |

Early fights (normal, floors 1-4): 2247 fought, death rate 0%, HP lost 1.1, perfect 80%, 2.6 turns.

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 22% | 10.2 |
| diamonds | 16% | 3.6 |
| spades | 47% | 9.6 |
| clubs | 15% | 3.4 |

Plays: 201713. Combos: 31% of plays. Powers blocked by immunity: 43579. Perfect fights: 50%. Catches per run: 3.2.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| The Channeler | +6.3 | 347 |
| Second Opinion | +1.9 | 123 |
| Old Money | +1.2 | 134 |
| Pink Moment | +1.1 | 328 |
| Bike Lock | +0.6 | 140 |
| Cold Plunge | +0.6 | 122 |
| Wildflower | +0.0 | 129 |
| Let Go | -0.0 | 108 |
| Olive Oil Tasting | -0.2 | 139 |
| Trust Fund | -0.4 | 320 |
| The Oak | -0.4 | 126 |
| Shelf Road | -0.9 | 117 |
| Heirloom Tomato | -1.0 | 105 |
| Mahatma Letter | -1.3 | 325 |
| Sage Bundle | -1.4 | 117 |
| Arcade Lease | -1.5 | 126 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -1.0 | 208 |
| 2 | -0.9 | 199 |
| 3 | -0.7 | 187 |
| 4 | -0.7 | 194 |
| 5 | +0.1 | 197 |
| 6 | -0.8 | 221 |
| 7 | +0.4 | 204 |
| 8 | +0.1 | 214 |
| 9 | -0.8 | 190 |
| 10 | +1.0 | 194 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| Krishnamurti | Combos have no cap. | +5.0 | 52 |
| The Oak Grove | Draw 1 more card each turn. | +4.8 | 48 |
| The People's Market | Aces count as every suit. | +3.8 | 49 |
| Blavatsky | Block no longer wears off between your turns. | +2.7 | 61 |
| The Sound Bath | Each card you discard unplayed: +1 block next turn. | +2.2 | 146 |
| Leadbeater | Start each fight with 6 block. | +2.2 | 143 |
| Ojai Day | +1 action on the first turn of each fight. | +0.9 | 64 |
| The Arcade | Playing a card worth 10+ draws 1. | +0.8 | 147 |
| The Life Coach | Your first play each fight deals double. | +0.6 | 136 |
| The Ceremony | Your first play each fight ignores immunity. | +0.6 | 159 |
| Pink Moment | Perfect fights also heal 6. | +0.3 | 164 |
| Meditation Mount | After each fight, heal 4. | -0.6 | 145 |
| The Realtor | +6 gold per fight. Catches pay 20. | -0.8 | 144 |
| Besant | Spade combos deal +4 damage. | -0.8 | 148 |
| The Farmers Market | Clubs recall 1 extra card. | -1.1 | 142 |
| Libbey | Diamonds draw 1 extra card. | -1.3 | 175 |
| The Crystal Shop | Hearts block +2. | -1.3 | 158 |
| The Silent Retreat | Enemy attacks are 1 lower. | -1.6 | 149 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| The Arcade + Blavatsky | 35 | 40.7 | +5.6 |
| Blavatsky + The Sound Bath | 28 | 41.0 | +5.4 |
| Blavatsky + Leadbeater | 26 | 39.3 | +5.3 |
| Ojai Day + The Sound Bath | 30 | 32.9 | +3.5 |
| The Oak Grove + Pink Moment | 24 | 32.9 | +3.3 |
| Leadbeater + The Oak Grove | 21 | 32.4 | +2.7 |
| Besant + Blavatsky | 27 | 35.7 | +2.4 |
| The Arcade + The Oak Grove | 27 | 33.1 | +2.2 |

## Decisions

Close calls (best and second-best move within 10%): 23% of 258320 decisions. Higher means more real choices per turn.

Biggest single hit: 76 (median run's biggest: 16).
