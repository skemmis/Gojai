# Clans and multiplayer

Draft design for the clan layer of *The Pathless Land*. Everything here is a starting point for Sam to push on; the numbers live in `packages/clans/src/config.ts` and the clan lab (`npm run clans:lab`) says what they do.

The game has two layers (Sam, 2026-09-29):

1. **The run**: build a deck on a walk until you die.
2. **The clan**: your faction's hold on the town's neighborhoods.

They are mostly separate, but everything you do on a walk also counts for your faction, and a great run pays out when it ends. Multiplayer is **live only**: group bosses and duels need people in the same place at the same time.

## The factions

Sam (2026-09-29): the Order of the Star and the Pathless are in. The third camp is open, and so is whether there should be one at all. Factions have **no special abilities**: they differ in lore, look and who you walk with, never in rules.

| | **The Order of the Star** | **The Pathless** |
|---|---|---|
| Then | Besant, Leadbeater, the hidden Masters, degrees of initiation, Krotona on the hill (1924). Built a church around a boy and bought the valley to wait for him. | Krishnamurti, who dissolved the Order in 1929, said truth can't be organised, and spoke under the Oak Grove for decades. |
| Now (satire) | Tiered memberships, the retreat with a waitlist, the sound bath priced by chakra, the board that runs the board. | The silent-walk crowd, the Instagram quote accounts, the ones who left the retreat early. No ranks, no leaders, and a very organised group chat about not being organised. |
| Motto | "Everything in its place, and a fee for each level." | "We are not a faction." |
| Haunts (flavour) | Krotona & the Inn, Arbolada, Meditation Mount | Meiners Oaks (the Oak Grove), the trail, the Foothills |

The joke that carries it: the Pathless are a faction of people who refuse factions, and the game makes them one anyway.

### Two or three?

Both are balanced in the clan lab (below). What differs is the feel:

- **Two** is the 1929 split itself: the organisation against the man who walked out of it. Every event, duel and neighborhood is us against them, which is easy to read at a glance. In a small town each side has more people, so live events draw bigger crowds of your own side. The cost: the map moves less (1.3 neighborhoods change hands a day against 1.7 with three) and about 3 neighborhoods stay with one side all season, against 1 with three.
- **Three** keeps the map livelier and nobody is ever simply "the losing side", since the two trailing factions squeeze the leader. It's harder to explain and splits a small player base thinner.

Claude's recommendation: **launch with two**, and keep a third camp for later as a lore event (a schism that founds it at a season turn).

### Candidates for a third camp

- **The Readymades.** Beatrice Wood, the "Mama of Dada": Duchamp's friend, a Theosophist who followed Krishnamurti to Ojai and threw lustre pots here until she died at 105 in 1998. Today: gallery row, the art walk, the ceramicist with a trust fund. They laugh at both of the others.
- **The Psychonauts.** Aldous Huxley, Krishnamurti's friend and a founder of the Happy Valley School (1946), who went on to write *The Doors of Perception*. Today: microdosing, the ayahuasca weekend, the breathwork facilitator. Enlightenment as a shortcut, which both other camps hate.
- **Old Money.** Libbey, who rebuilt downtown in 1917 and renamed Nordhoff to Ojai, plus the ranch and real-estate dynasties. Today: the Land Rover moms, the realtors, the short-term-rental owners. The power brokers from the original pitch; sharpest satire, but a class line between players.
- **The Growers.** The citrus and avocado ranchers, the Pixie tangerine, the working valley that was here before the seekers and still irrigates around them. Today: the farm stand, the old ranch trucks, the people who find all of this ridiculous. The grounded counter-voice.
- **The Keepers.** The people who held on to Krishnamurti's money and land after he walked (the Rajagopal feud and lawsuits). Great drama, but it points at a family with living members, so only as an archetype.

## Territory

- The map thread's 14 neighborhoods (13 plus the Ojai Valley Trail) are the territory. No hexes.
- Each neighborhood keeps an **influence** count per faction. At the nightly tick (4 AM) the leader holds it, if it has at least 12 influence and beats the runner-up by 15% (to claim unheld ground) or beats the holder by 15% (to flip it).
- Influence **fades 15% a night**, so the map keeps moving and nobody can bank a lead.
- The **season score** is neighborhood-days held. Default season: full moon to full moon (29 days), with the Full Moon boss as the finale. A quarter of influence carries into the next season.

### Where influence comes from

| Source | How | Lab share |
|---|---|---|
| **Walking** | 1 per spot played (first visit to that spot today), in that spot's neighborhood. | 39% |
| **Death as offering** | When a run ends: 1 per floor cleared, +3 per elite, +8 per boss, paid to the neighborhoods where those floors were played. A deep run is a big gift; a long walk spreads it around. | 50% |
| **Group bosses** | The winning faction takes the neighborhood outright (below), plus influence by damage. | 8 to 9% |
| **Duels** | +5 to the winner's faction in that neighborhood. | 3% |

Two brakes keep it fair:

- **Diminishing returns** per player, per neighborhood, per day (full value up to 8, half up to 24, a quarter after), so one obsessive walker can't carry a neighborhood alone. Walking three neighborhoods beats grinding one.
- **Catch-up**: a faction earns `1 + 3 × (fair share − share of the map it holds)`, clamped to ×0.5 to ×2, where the fair share is 1/2 with two factions and 1/3 with three. Holding nothing doubles your influence; holding everything halves it.

### What holding ground does

Proposed, not built (they touch the run layer, owned by the combat thread): small perks in your own ground (shop 10% cheaper, one extra card offered at a rest), faction-coloured spots on the map, and the season trophy. Enough to feel, never enough to decide a run.

## Group bosses

- A boss opens at an event spot for each timed event (Pink Moment, the markets, full moons, Ojai Day). It's one shared boss; everyone present fights it with their **own current run deck**.
- It costs no run HP and never ends a run. If your run just died, you fight with your fresh deck.
- **HP grows with the crowd**: 150 plus 60 per player who joins, so a crowd still has to work.
- **The faction that deals the most damage takes the neighborhood outright** (Sam, 2026-09-29): it becomes the holder on the spot, with enough influence to survive the night unless someone beats it back.
- **Race for damage**: on top of that, 40 influence is split between factions by share of damage, the faction that dealt the most gets +20, and every faction that hit it gets +10 if it died in the window. Every player who hit it gets gold (10, plus up to 40 by damage relative to the top hitter) and the event's card drop.
- To hand to the combat thread: each player gets one fight of 5 turns against the boss's intents; damage dealt is reported to `hitBoss`.

## Duels

- Two players at the **same spot**, both phones agreeing (a tap or QR handshake between phones, server-checked location).
- Each fights with their current run deck. It never touches run HP.
- **Across factions it's for stakes**: the loser pays 20% of their run gold (at least 5, at most 40) and the winner's faction gets +5 influence in that neighborhood. **Within a faction it's a spar**: no stakes.
- Stakes only once per pair per day, so two friends can't farm each other.
- The alternative stake is a card: the winner takes one of the loser's non-starter cards. Harsher, more memorable. `CLAN.duel.stake` switches it.
- To hand to the combat thread: simultaneous turns, 20 duel HP each, spades hit the other player, hearts block, 5 turns max, most HP left wins.

## Joining a faction

- **Auto-assigned** at signup to the faction that **played least in the last 14 days** (spots played, not head count: most signups stop playing, and counting days instead of spots undercounts the daily walkers).
- **Friends**: an invite link puts you in your friend's faction if it's within 10% of the weakest; otherwise you're assigned as normal. The lab shows why this cap matters (below).
- No switching mid-season. Maybe once between seasons, later.

## What the clan lab found

`npm run clans:lab` plays 200 seasons per scenario on the real map, spots and event calendar, with three factions and again with two: bot players sign up (120 at launch, 6 a day, half casual, a third regular, a sixth devoted), walk from home through neighboring neighborhoods, play and lose runs (median 15 floors, like the combat lab), turn up to events, fight bosses, duel and quit. Full report: `lab-reports/clans.md`.

| | three factions | two factions |
|---|---|---|
| Season wins (fair = 33% / 50%) | 33 / 32 / 35% | 52 / 48% |
| Neighborhoods changing hands a day | 1.7 | 1.3 |
| Lead changes a season | 9.6 | 7.8 |
| Neighborhoods one side holds all season | 1.0 | 2.8 |
| 12 devoted friends forced onto one side at launch: that side wins | 97% | 85% |
| Same 12 through the invite rule | 39% | 59% |

- **Both are balanced** once faction abilities are gone. With abilities, each one had to be hand-tuned: the Pathless' walking bonus at first won them 87% of seasons.
- **Events flipping ground makes the map move.** Compared with events only adding influence, fewer neighborhoods get stuck with one side (1.0 against 1.6 with three factions, 2.8 against 4.0 with two) and the lead changes more often.
- **A founding clique is the real danger.** If a group of devoted friends all land on one side at launch, that side wins almost every season, even though catch-up keeps its share of the map near fair. The invite rule (friends join you only while factions are close) mostly fixes it. A launch in a small town should probably also start with an unscored beta week.
- **Decay matters.** With 2% fade instead of 15%, 3 to 5 neighborhoods lock up.
- **Small town** (40 at launch, 1 a day): still balanced, but bosses die only 57% of the time, so boss HP should scale down harder for thin crowds.

## Open questions for Sam

1. Two factions or three? (Claude: two for launch.) If three, which candidate?
2. Duel stake: gold (default) or a card?
3. Season length: a lunar month ending on the full moon?
4. Friends: is "invite honoured only if factions stay balanced" acceptable, or should friends always be together (and balance comes only from catch-up)?

## Pieces

- `packages/clans` (pure TypeScript, no I/O, shared by server, app and lab):
  - `factions.ts`: the factions and their lore (the third is a placeholder slot).
  - `config.ts`: every number.
  - `territory.ts`: influence, `award`, `settle`, `claimByEvent`, the nightly `endDay`, `startSeason`.
  - `assign.ts`: faction strength and auto-assignment with invites.
  - `offering.ts`: a dead run's payout.
  - `boss.ts`: group boss HP, damage race, influence and gold.
  - `duel.ts`: who can duel, stakes, results.
  - `sim/`: the clan lab (bot population over a season on `@gojai/map`).
- Not here: the server (check-ins, location checks, the nightly tick, WebSockets for live bosses and duels), the boss and duel fight rules (combat thread), faction colours on the map (map and art threads; faction marks can't use blood, gilt or pink, which already mean damage, reward and live events).
