# Balance lab report

1000 greedy + 1000 explore runs, seed 1, 44.1s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.

## Flags
- Guide "Ojai Day" hurts runs that take it (Δ -1.1).
- Guide "Libbey" hurts runs that take it (Δ -1.2).
- Guide "Besant" hurts runs that take it (Δ -1.3).
- Guide "The Realtor" hurts runs that take it (Δ -1.4).

## How far runs get (floors cleared)

| policy | mean | p10 | median | p90 | best |
|---|---|---|---|---|---|
| greedy | 17.1 | 7 | 15 | 31 | 63 |
| explore | 12.8 | 7 | 15 | 15 | 47 |

## Enemies

Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill. Perfect = share won without losing HP. HP lost is per won fight (you start with 40).

| enemy | tier | met | death rate | HP lost | perfect | catch rate | avg turns |
|---|---|---|---|---|---|---|---|
| The Masters of the Wisdom | boss | 1499 | 75% | 25.9 | 0% | 31% | 3.6 |
| The Order of the Star | boss | 2296 | 24% | 16.3 | 3% | 40% | 3.5 |
| The Sound Healer | elite | 945 | 12% | 13.7 | 3% | 41% | 3.5 |
| The Oak Grove Mom | elite | 999 | 5% | 6.5 | 20% | 37% | 7.1 |
| The Developer | elite | 1008 | 4% | 5.6 | 36% | 31% | 5.0 |
| The Manifestor | normal | 2317 | 2% | 3.0 | 56% | 40% | 2.4 |
| The Influencer | normal | 2282 | 1% | 2.2 | 71% | 36% | 2.2 |
| The Crystal Vendor | normal | 2377 | 1% | 1.3 | 66% | 35% | 3.4 |
| Parking Enforcement | normal | 2380 | 1% | 1.4 | 63% | 39% | 2.6 |
| The $9 Latte | normal | 2351 | 0% | 0.8 | 76% | 41% | 2.7 |
| The Short-Term Rental | normal | 2315 | 0% | 0.5 | 83% | 40% | 2.6 |
| The E-Bike Teen | normal | 2397 | 0% | 1.2 | 68% | 38% | 2.5 |

Early fights (normal, floors 1-4): 5418 fought, death rate 0%, HP lost 1.4, perfect 70%, 2.6 turns.

## Suit powers

| suit | share of powers fired | avg N |
|---|---|---|
| hearts | 21% | 8.5 |
| diamonds | 15% | 3.2 |
| spades | 51% | 9.4 |
| clubs | 13% | 3.1 |

Plays: 214242. Matched (pair or better): 19% of plays. Powers blocked by immunity: 42635. Perfect fights: 51%. Catches per run: 4.0.

## Cards: picked vs passed (explore runs)

Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.

| card | Δ floors | picked n |
|---|---|---|
| Pink Moment | +2.7 | 501 |
| Bike Lock | +0.9 | 158 |
| Trust Fund | +0.6 | 466 |
| The Oak | +0.5 | 176 |
| Shelf Road | +0.3 | 179 |
| Sage Bundle | +0.2 | 165 |
| Second Opinion | +0.2 | 174 |
| The Channeler | +0.2 | 478 |
| Heirloom Tomato | +0.2 | 173 |
| Wildflower | +0.2 | 181 |
| Let Go | -0.1 | 174 |
| Arcade Lease | -0.2 | 178 |
| Mahatma Letter | -0.4 | 489 |
| Cold Plunge | -0.5 | 170 |
| Old Money | -0.9 | 174 |
| Olive Oil Tasting | -1.4 | 175 |

Plain cards by value:

| value | Δ floors | picked n |
|---|---|---|
| 1 | -0.5 | 247 |
| 2 | +0.6 | 285 |
| 3 | -0.3 | 256 |
| 4 | -1.0 | 265 |
| 5 | +0.6 | 281 |
| 6 | -0.3 | 274 |
| 7 | -1.0 | 292 |
| 8 | +0.3 | 249 |
| 9 | -0.4 | 251 |
| 10 | +0.4 | 278 |

## Guides: picked vs passed (explore runs)

| guide | does | Δ floors | picked n |
|---|---|---|---|
| The Sound Bath | Each card you discard unplayed: +1 block next turn. | +2.7 | 85 |
| Blavatsky | Block no longer wears off between your turns. | +2.4 | 24 |
| Meditation Mount | After each fight, heal 4. | +1.6 | 105 |
| Pink Moment | Perfect fights also heal 6. | +1.1 | 104 |
| The Crystal Shop | Hearts block +2. | +1.0 | 92 |
| Krishnamurti | Matching cards count one step more: a pair ×3, three of a kind ×4. | +1.0 | 40 |
| The Arcade | Playing a card worth 10+ draws 1. | +0.4 | 102 |
| The Oak Grove | Draw 1 more card each turn. | +0.3 | 36 |
| Leadbeater | Start each fight with 6 block. | +0.3 | 99 |
| The People's Market | Aces count as every suit. | +0.1 | 37 |
| The Silent Retreat | Enemy attacks are 1 lower. | -0.1 | 97 |
| The Farmers Market | Clubs recall 1 extra card. | -0.3 | 106 |
| The Ceremony | Your first play each fight ignores immunity. | -0.4 | 105 |
| The Life Coach | Your first play each fight deals double. | -0.9 | 98 |
| Ojai Day | +1 action on the first turn of each fight. | -1.1 | 37 |
| Libbey | Diamonds draw 1 extra card. | -1.2 | 86 |
| Besant | Matched spades deal +4 damage. | -1.3 | 91 |
| The Realtor | +6 gold per fight. Catches pay 20. | -1.4 | 87 |

## Guide pairs (combos)

Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.

| pair | runs | mean depth | lift |
|---|---|---|---|
| Krishnamurti + Meditation Mount | 15 | 30.6 | +5.0 |
| Besant + Krishnamurti | 20 | 26.6 | +2.9 |
| Blavatsky + The Ceremony | 16 | 27.0 | +2.7 |
| Pink Moment + The Silent Retreat | 52 | 25.7 | +2.2 |
| The Oak Grove + Pink Moment | 15 | 27.2 | +2.0 |
| The Oak Grove + The Sound Bath | 26 | 29.1 | +1.9 |
| The Oak Grove + The Silent Retreat | 29 | 26.5 | +1.9 |
| Blavatsky + Leadbeater | 15 | 26.7 | +1.8 |

## Decisions

Close calls (best and second-best move within 10%): 50% of 265036 decisions. Higher means more real choices per turn.

Biggest single hit: 64 (median run's biggest: 29).
