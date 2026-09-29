# The map

The play area is Ojai and Meiners Oaks, cut into hand-drawn **neighborhoods** (the territory factions will hold). The shape follows Pokémon Go: plain **spots** everywhere (its PokéStops) and a few **event spots** (its gyms) where timed events and bosses happen.

- **Spots** have no fixed type. What you find is rolled per player and rerolls every 20 minutes: usually a fight, sometimes rest, an elite, a shop or a mystery. A spot can lean toward some finds (Krotona toward rest, the Arcade toward shop). Odds live in `BASE_ODDS` and each spot's `leans`.
- **Event spots** work like spots between events, and host **timed events**: Pink Moment (sunset −15 to +20 min at Shelf Road and Meditation Mount), the Sunday farmers market, the Thursday People's Market (3 to 7 PM on the old school district grounds), full moons, solstices, Aug 3.
- **Neighborhoods** are drawn by hand along real roads, then given organic edges by one smooth "wobble" applied to every ring, so shared edges still line up.

## Pieces

- `packages/map` is the source of truth, pure TypeScript with no I/O, so the phone, the server and the lab share it:
  - `neighborhoods.ts`: the 10 neighborhoods (the play area), `neighborhoodOf(point)`, GeoJSON export.
  - `spots.ts`: 16 spots and 7 event spots, play radius, leans, and `findAt(spot, player, time)`.
  - `events.ts`: timed events as rules (`sunset`, `weekly`, `fullMoon`, `annual`, `tbd`) and `windowsBetween` / `activeEvents` / `upcomingEvents`.
  - `time.ts`: Ojai local time (PST/PDT), sunset (NOAA equation, within a couple of minutes), full moons (mean synodic month, within about half a day).
  - `area.ts`: map extent, distance, and former school sites that aren't no-go zones.
- `apps/map` draws it: MapLibre over our own GeoJSON (no tile service, no API key, as in la-brea-madre). All colours live in `apps/map/src/theme.ts`; the look is deliberately plain until the art direction is settled. `npm run build:map` also writes a single self-contained `dist/pathless-land-map.html`.
- `tools/map` rebuilds the base map (`npm run map:extract`). Roads, trails, water, land use, buildings and the Ojai boundary come from [Overture Maps](https://overturemaps.org) (OpenStreetMap-derived, ODbL), read from its public S3 bucket with pyarrow. Contours are traced from the AWS Terrain Tiles. Needs `python3 -m pip install pyarrow shapely`.

## Rules the tests enforce

- Every spot sits in exactly one neighborhood, every neighborhood has a spot, and neighborhoods don't overlap.
- No spot sits on active school grounds (checked against the school polygons in the land-use layer). The old Ojai Unified grounds at 414 E Ojai Ave are listed as a former school site, per Sam.
- Finds follow the odds and stay fixed within a refresh window.

## To check on the ground

Spots flagged `verify` in `spots.ts` and events flagged in `events.ts`, mainly:

- Sunday market hours; Meditation Mount and Krotona public hours and access; Daly Ranch and the demonstration garden access.
- The Oak Grove: the spot is on Besant Rd by the Krishnamurti Foundation, outside Oak Grove School. Confirm it's public.
- Real businesses (Bart's Books, Ojai Playhouse) need parody names.
- Dates for Ojai Day, the Music Festival and the Lavender Festival.
- Neighborhood names and lines: drafts to redraw by hand.

## Not here yet

Faction control of neighborhoods and event spots, server check-ins, anti-spoofing, and the Expo app's map screen. The page's "Locate me" works when the page is served from the repo or a host; embedded previews usually block location.
