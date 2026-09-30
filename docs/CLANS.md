# Clans and multiplayer

Draft design for the clan layer of *The Pathless Land*. Everything here is a starting point for Sam to push on; the numbers live in `packages/clans/src/config.ts` and the clan lab (`npm run clans:lab`) says what they do.

The game has two layers (Sam, 2026-09-29):

1. **The run**: build a deck on a walk until you die.
2. **The clan**: your faction's hold on the town's neighborhoods.

They are mostly separate, but everything you do on a walk also counts for your faction, and a great run pays out when it ends. Multiplayer is **live only**: group bosses and duels need people in the same place at the same time.

## The factions

Two factions, the 1929 split itself: the organisation against the man who walked out of it (Sam, 2026-09-29). Factions have **no special abilities**: they differ in lore, look and who you walk with, never in rules. On screen both are in ink, told apart by shape: the Order's star (solid) and the Pathless' acorn (hatched). The spot inks keep their one meaning each.

| | **The Order of the Star** | **The Pathless** |
|---|---|---|
| Then | Besant, Leadbeater, the hidden Masters, degrees of initiation, Krotona on the hill (1924). Built a church around a boy and bought the valley to wait for him. | Krishnamurti, who dissolved the Order in 1929, said truth can't be organised, and spoke under the Oak Grove for decades. |
| Now (satire) | Tiered memberships, the retreat with a waitlist, the sound bath priced by chakra, the board that runs the board. | The silent-walk crowd, the Instagram quote accounts, the ones who left the retreat early. No ranks, no leaders, and a very organised group chat about not being organised. |
| Motto | "Everything in its place, and a fee for each level." | "We are not a faction." |
| Haunts (flavour) | Krotona & the Inn, Arbolada, Meditation Mount | Meiners Oaks (the Oak Grove), the trail, the Foothills |

The joke that carries it: the Pathless are a faction of people who refuse factions, and the game makes them one anyway.

### Why two, not three

The clan lab found both balanced. Two reads at a glance (every event, duel and neighborhood is us against them) and gives each side bigger crowds at live events in a small town. Three moved the map a little more. The rules take any number of factions (`CLAN.factions`), so a third camp can arrive later, for example as a schism at a season turn.

### Third-camp ideas, for later

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

`npm run clans:lab` plays 200 seasons per scenario on the real map, spots and event calendar: bot players sign up (120 at launch, 6 a day, half casual, a third regular, a sixth devoted), walk from home through neighboring neighborhoods, play and lose runs (median 15 floors, like the combat lab), turn up to events, fight bosses, duel and quit. Full report: `lab-reports/clans.md`.

- **Balanced.** Each faction wins about half the seasons, about 1.3 neighborhoods change hands a day, and the lead changes about 8 times a season.
- **Faction abilities were a trap.** Before they were dropped, each needed hand-tuning: the Pathless' walking bonus at first won them 87% of seasons.
- **Events flipping ground makes the map move.** Fewer neighborhoods stay with one side all season (about 3 against 4 when events only add influence).
- **A founding clique is the real danger.** If 12 devoted friends are forced onto one side at launch, that side wins 85% of seasons. Through the invite rule (friends join you only while factions are close) it's about 59%. A launch in a small town should probably also start with an unscored beta week.
- **Decay matters.** With 2% fade instead of 15%, 5 neighborhoods lock up.
- **Small town** (40 at launch, 1 a day): still balanced, but bosses die only 57% of the time, so boss HP should scale down harder for thin crowds.
- With three factions (tested before Sam chose two): also balanced, map a little livelier (1.7 flips a day, 1 locked neighborhood).

## Leaderboards

Every board is a count the server already trusts (verified check-ins, finished runs, boss and duel results). Boards never show where or when anyone played, only totals.

| Board | Counts | Window |
|---|---|---|
| Walkers | spots played | this week (resets Monday), so newcomers can top it |
| Offerings | influence given to your faction | season |
| Deepest | deepest run, in floors | season |
| Slayers | group boss damage | season |
| Duelists | duel wins (ties: fewer losses) | season |
| Collectors | enemies caught | season |
| The Hall | deepest run ever | all time |

- **Scopes**: everyone, your faction, your friends. You always see your own row and the two players either side of you, even at rank 300.
- **Keepers**: in each neighborhood, the player from the holding faction who gave it the most influence this season is its Keeper. Keeping a neighborhood at season's end is a title and a frame.
- **Live event board**: during an event, the boss HP, the faction damage race (the leader takes the neighborhood) and the hardest hitters, for the people standing there. It's the one board that uses pink, because it's live.
- Model: `packages/clans/src/leaderboards.ts` (`record`, `standing`, `keepers`, weekly and season rollover).

## Profiles

Your profile is a tarot card: portrait, frame, name, title, faction, and your record (season or all time), with a shelf of the enemies you've caught. Nothing on it shows where or when you walk.

- **Portrait** (Sam, 2026-09-29): a random character generated for you as a sprite in the same style as the enemies, the way Fantasy-Reality makes its avatars. An archetype (one of ~30 valley locals: pilgrim, beekeeper, potter, orchard hand, rancher, stargazer, bookseller, fire lookout…) gives the look, and separate rolls add age, who, build, hair, pose and a small mark of your side (a star pin for the Order, an acorn for the Pathless). Everything comes from one seed, so a portrait is stored as `gen:<seed>`. You're dealt three at signup to pick from and draw one more each season you play. You can also wear any enemy you've caught. No photos or user-written prompts, so there's nothing to moderate.
- **Generating them** (Sam, 2026-09-30: match the enemies): `npm run portraits -- --out <dir> --n 12 --seed 1` uses the enemy sprite prompt block for block (From Hell ink, full-body sprite on a #00FF00 key, black ink and off-white paper), with a player tone line and the character facing right, across the table from the enemies. Then it keys out the green, crops to the figure and strips to grey, as the enemy sprites are (`--rekey` redoes that on existing raws). Players and enemies share backdrops and framing. Samples: `/mnt/project-files/gojai-art/portraits/v4/` (contact sheet included). The server would do the same once per draw.
- **Frames** (earned): plain; double rule (50 spots); gilt (30 floors in one run); the Keeper's frame; your faction's mark (your faction won a season you played in). No pink frames: pink means live.
- **Titles** (earned): "Initiate of the Star" or "Of No Path" to start, then "Who Went Deep", "Unbowed", "Collector of Types", "Keeper of …".
- **Names**: 3 to 20 letters, numbers, spaces and . - ' _; word filters run on the server.
- Model: `packages/clans/src/profile.ts` (`portraitsFor`, `framesFor`, `titles`, `sanitize`, `validName`, `drawsEarned`) and `packages/clans/src/portrait.ts` (`rollCharacter`, `portraitPrompt`).
- Mockup of the profile, leaderboards and live event board: https://claude.ai/artifact/496eFSomNooT3DbApyDWqG

## Open questions for Sam

1. Duel stake: gold (default) or a card?
2. Season length: a lunar month ending on the full moon?
3. Friends: is "invite honoured only if factions stay balanced" acceptable, or should friends always be together (and balance comes only from catch-up)?

## Pieces

- `packages/clans` (pure TypeScript, no I/O, shared by server, app and lab):
  - `factions.ts`: the two factions and their lore.
  - `leaderboards.ts`: boards, scopes, Keepers.
  - `profile.ts`: portraits, frames, titles, names.
  - `portrait.ts`: random characters for generated portraits.
  - `config.ts`: every number.
  - `territory.ts`: influence, `award`, `settle`, `claimByEvent`, the nightly `endDay`, `startSeason`.
  - `assign.ts`: faction strength and auto-assignment with invites.
  - `offering.ts`: a dead run's payout.
  - `boss.ts`: group boss HP, damage race, influence and gold.
  - `duel.ts`: who can duel, stakes, results.
  - `sim/`: the clan lab (bot population over a season on `@gojai/map`).
- `tools/portraits/generate.ts` (`npm run portraits`): renders rolled characters with Gemini and locks them to the sepia ramp.
- Not here: the server (check-ins, location checks, the nightly tick, WebSockets for live bosses and duels), the boss and duel fight rules (combat thread), faction colours on the map (map and art threads; faction marks can't use blood, gilt or pink, which already mean damage, reward and live events).
