# Clans and multiplayer

Draft design for the clan layer of *The Pathless Land*. Everything here is a starting point for Sam to push on; the numbers live in `packages/clans/src/config.ts` and the clan lab (`npm run clans:lab`) says what they do.

The game has two layers (Sam, 2026-09-29):

1. **The run**: build a deck on a walk until you die.
2. **The clan**: your faction's hold on the town's neighborhoods.

They are mostly separate, but everything you do on a walk also counts for your faction, and a great run pays out when it ends. Multiplayer is **live only**: group bosses and duels need people in the same place at the same time.

## The three factions

Sam's instinct: the Krishnamurti / Theosophical Society split, maybe the Dadaists. That works, and Ojai has a real Dadaist: **Beatrice Wood**, the "Mama of Dada", who was a Theosophist, followed Krishnamurti to Ojai in the 1940s and lived and worked here until she died at 105 in 1998. So all three camps are the same story from three angles: the organisation, the man who walked out of it, and the artist who laughed at both.

| | **The Order of the Star** | **The Pathless** | **The Readymades** |
|---|---|---|---|
| Then | Besant, Leadbeater, the hidden Masters, degrees of initiation, Krotona on the hill (1924). Built a church around a boy and bought the valley to wait for him. | Krishnamurti, who dissolved the Order in 1929, said truth can't be organised, and spoke under the Oak Grove for decades. | Beatrice Wood: Duchamp's friend, co-editor of *The Blind Man* (1917), lustre pots until 105, "I owe it all to chocolate and young men". |
| Now (satire) | Tiered memberships, the retreat with a waitlist, the sound bath priced by chakra, the board that runs the board. | The silent-walk crowd, the Instagram quote accounts, the ones who left the retreat early. No ranks, no leaders, and a very organised group chat about not being organised. | Gallery row, the art walk, the ceramicist with a trust fund, the installation nobody asked for on somebody else's lawn. |
| Motto | "Everything in its place, and a fee for each level." | "We are not a faction." | "Chocolate, young men, and a urinal in a gallery." |
| Style of play | Holds ground. | Roams. | Raids. |
| Perk (clan layer only) | **Lodges**: ground the Order holds fades 10% a night instead of 15%. | **Walk On**: the first spot you play in each neighborhood each day gives +0.75 influence. | **Readymade**: influence earned in ground another faction holds counts ×1.28. |
| Haunts (flavour) | Krotona & the Inn, Arbolada, Meditation Mount | Meiners Oaks (the Oak Grove), the trail, the Foothills | West Matilija, the Arcade, the East End |

The joke that carries the whole thing: the Pathless are a faction of people who refuse factions, and the game makes them one anyway.

Perks never touch a run: no faction has better cards or more HP. They only change how influence is earned, so they're safe to tune.

### Alternatives, if Sam wants a different split

- **Seekers / Pathless / Old Money.** Merge the Theosophists and the Readymades into one spiritual camp and make the third faction the power-broker families: Libbey, who rebuilt downtown and renamed Nordhoff to Ojai, and the ranch and real-estate dynasties. Sharper satire (Land Rover moms, realtors, the short-term-rental owners), but it puts a real class line between players.
- **The 1929 split, three ways.** Order / Pathless / **the Keepers**: the people who held on to Krishnamurti's money and property after he walked (the Rajagopal feud and lawsuits). Great drama, but it points at a family with living members, so it would need to stay an archetype.
- **Places, not people.** Krotona / the Oak Grove / the Arcade: factions named for the ground they started on. Safest for the App Store, least funny.

## Territory

- The map thread's 14 neighborhoods (13 plus the Ojai Valley Trail) are the territory. No hexes.
- Each neighborhood keeps an **influence** count per faction. At the nightly tick (4 AM) the leader holds it, if it has at least 12 influence and beats the runner-up by 15% (to claim unheld ground) or beats the holder by 15% (to flip it).
- Influence **fades 15% a night**, so the map keeps moving and nobody can bank a lead.
- The **season score** is neighborhood-days held. Default season: full moon to full moon (29 days), with the Full Moon boss as the finale. A quarter of influence carries into the next season.

### Where influence comes from

| Source | How | Lab share |
|---|---|---|
| **Walking** | 1 per spot played (first visit to that spot today), in that spot's neighborhood. | 41% |
| **Death as offering** | When a run ends: 1 per floor cleared, +3 per elite, +8 per boss, paid to the neighborhoods where those floors were played. A deep run is a big gift; a long walk spreads it around. | 47% |
| **Group bosses** | See below. | 9% |
| **Duels** | +5 to the winner's faction in that neighborhood. | 3% |

Two brakes keep it fair:

- **Diminishing returns** per player, per neighborhood, per day (full value up to 8, half up to 24, a quarter after), so one obsessive walker can't carry a neighborhood alone. Walking three neighborhoods beats grinding one.
- **Catch-up**: a faction earns `1 + 3 × (1/3 − share of the map it holds)`, clamped to ×0.5 to ×2. Holding nothing doubles your influence; holding everything halves it.

### What holding ground does

Proposed, not built (they touch the run layer, owned by the combat thread): small perks in your own ground (shop 10% cheaper, one extra card offered at a rest), faction-coloured spots on the map, and the season trophy. Enough to feel, never enough to decide a run.

## Group bosses

- A boss opens at an event spot for each timed event (Pink Moment, the markets, full moons, Ojai Day). It's one shared boss; everyone present fights it with their **own current run deck**.
- It costs no run HP and never ends a run. If your run just died, you fight with your fresh deck.
- **HP grows with the crowd**: 150 plus 60 per player who joins, so a crowd still has to work.
- **Race for damage**: 40 influence is split between factions by share of damage, the faction that dealt the most gets +20, and every faction that hit it gets +10 if it died in the window. Every player who hit it gets gold (10, plus up to 40 by damage relative to the top hitter) and the event's card drop.
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

`npm run clans:lab` plays 200 seasons per scenario on the real map, spots and event calendar: bot players sign up (120 at launch, 6 a day, half casual, a third regular, a sixth devoted), walk from home through neighboring neighborhoods, play and lose runs (median 15 floors, like the combat lab), turn up to events, fight bosses, duel and quit. Full report: `lab-reports/clans.md`.

- **The baseline is competitive.** Season scores land within a couple of points of a third each; every faction wins 28 to 41% of seasons; about 2 neighborhoods change hands a day; the lead changes about 8 times a season; only about 2 neighborhoods stay with one faction all season.
- **Walk On at +2 broke it.** The Pathless won 87% of seasons. Tuned to +0.75. Because catch-up keeps seasons close, a perk worth a couple of percent decides the winner, so perks need the lab every time they change.
- **A founding clique is the real danger.** If 12 devoted friends all land in one faction at launch, that faction wins 97% of seasons even with catch-up (without catch-up it holds 64% of the map). Through the invite rule, the same 12 get split and it's back to 45 / 28 / 27. So the invite cap stays, and a launch in a small town should probably start with an unscored beta week.
- **Decay matters.** With 2% fade instead of 15%, 4 neighborhoods lock up and the Order's Lodges become worthless (Order wins 7%).
- **Head count vs play**: assigning by head count still works at this scale but lets the winner hold more of the map (p90 42% vs 36%).
- **Events are a small share of influence (9%).** If live events are the engine, they probably should swing ground harder. Open question below.
- **Small town** (40 at launch, 1 a day): still balanced, but bosses die only 57% of the time, so boss HP should scale down harder for thin crowds.

## Open questions for Sam

1. The faction set: Order / Pathless / Readymades, or one of the alternatives?
2. Should a won event flip its neighborhood outright (events as the engine), or stay one source among several?
3. Duel stake: gold (default) or a card?
4. Season length: a lunar month ending on the full moon?
5. Friends: is "invite honoured only if factions stay balanced" acceptable, or should friends always be together (and balance comes only from catch-up)?

## Pieces

- `packages/clans` (pure TypeScript, no I/O, shared by server, app and lab):
  - `factions.ts`: the three factions, lore, perks.
  - `config.ts`: every number.
  - `territory.ts`: influence, `award`, `settle`, the nightly `endDay`, `startSeason`.
  - `assign.ts`: faction strength and auto-assignment with invites.
  - `offering.ts`: a dead run's payout.
  - `boss.ts`: group boss HP, damage race, influence and gold.
  - `duel.ts`: who can duel, stakes, results.
  - `sim/`: the clan lab (bot population over a season on `@gojai/map`).
- Not here: the server (check-ins, location checks, the nightly tick, WebSockets for live bosses and duels), the boss and duel fight rules (combat thread), faction colours on the map (map and art threads; faction marks can't use blood, gilt or pink, which already mean damage, reward and live events).
