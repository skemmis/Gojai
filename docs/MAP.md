# The map

The play area is Ojai and Meiners Oaks, cut into **neighborhoods** bordered by real streets (the territory factions will hold). The Ojai Valley Trail is its own thin territory: with downtown, it's the game's main walking artery. The shape follows Pokémon Go: plain **spots** everywhere (its PokéStops) and a few **event spots** (its gyms) where timed events and bosses happen.

- **Spots** have no fixed type. What you find is rolled per player and rerolls every 20 minutes: usually a fight, sometimes rest, an elite, a shop or a mystery. A spot can lean toward some finds (Krotona toward rest, the Arcade toward shop). Odds live in `BASE_ODDS` and each spot's `leans`.
- **Event spots** work like spots between events, and host **timed events**: Pink Moment (sunset −15 to +20 min at Shelf Road and Meditation Mount), the Sunday farmers market, the Thursday People's Market (3 to 7 PM on the old school district grounds), full moons, solstices, Aug 3.
- **Neighborhoods** are cut along a hand-picked list of streets (Ojai Ave, Maricopa Hwy, Signal, Montgomery, Fox, Matilija, Grand, Gridley, Foothill, Del Norte, El Paseo, Country Club Dr) and San Antonio Creek. Each piece goes to the neighborhood whose seed point it holds. Downtown is split into the Arcade, Libbey Park, West Matilija, North End and Sarzotti so the busiest ground is contested block by block.
- **Density:** about 220 spots. Beyond the hand-placed ones: public landmarks from the open data (churches, galleries, parks, libraries, cafés), a marker every 200 m along the trail, and street corners wherever a walker would otherwise be more than ~140 m from a spot. No two spots are closer than 55 m.

## Pieces

- `packages/map` is the source of truth, pure TypeScript with no I/O, so the phone, the server and the lab share it:
  - `neighborhoods.ts`: the 13 neighborhoods plus the trail (the play area), `neighborhoodOf(point)`, GeoJSON export. Shapes come from `generated/territory.ts`.
  - `spots.ts`: hand-placed spots and event spots (with leans), plus the generated ones; `findAt(spot, player, time)`.
  - `events.ts`: timed events as rules (`sunset`, `weekly`, `fullMoon`, `annual`, `tbd`) and `windowsBetween` / `activeEvents` / `upcomingEvents`.
  - `time.ts`: Ojai local time (PST/PDT), sunset (NOAA equation, within a couple of minutes), full moons (mean synodic month, within about half a day).
  - `area.ts`: map extent, distance, and former school sites that aren't no-go zones.
- `apps/map` draws it: MapLibre over our own GeoJSON (no tile service, no API key, as in la-brea-madre). It follows the app style guide (`docs/ART_DIRECTION.md`, tokens in `packages/art/src/theme.ts`): an ink survey map on paper, spots drawn as small tarot cards, names in IM Fell English SC and everything else in Libre Franklin. Pink means a live event (its pin, its range and the "Happening now" band). Plain spots are Prussian-blue cards so they read against the ink; that blue is a map-local token, not yet one of the shared inks. `apps/map/src/theme.ts` maps the tokens onto the map. `npm run build:map` also writes a single self-contained `dist/pathless-land-map.html`.
- `tools/map/territory.json` is the hand-crafted input: border streets, a seed per neighborhood, names and notes, trail settings, places to leave out. `python3 tools/map/build_territory.py` turns it into `packages/map/src/generated/territory.ts`. To redraw a neighborhood, add or drop a border street or move a seed, then rerun.
- `tools/map` also rebuilds the base map (`npm run map:extract`). Roads, trails, water, land use, buildings and the Ojai boundary come from [Overture Maps](https://overturemaps.org) (OpenStreetMap-derived, ODbL), read from its public S3 bucket with pyarrow. Contours are traced from the AWS Terrain Tiles. Needs `python3 -m pip install pyarrow shapely`.

## Rules the tests enforce

- Every spot sits in exactly one neighborhood, every neighborhood has a spot, and neighborhoods don't overlap.
- Downtown has a spot within 150 m of every point, and there are at least 150 spots.
- No spot sits on active school grounds (checked against the school polygons in the land-use layer). The old Ojai Unified grounds at 414 E Ojai Ave are listed as a former school site, per Sam.
- Finds follow the odds and stay fixed within a refresh window.

## To check on the ground

Spots flagged `verify` in `spots.ts` and events flagged in `events.ts`, mainly:

- Sunday market hours; Meditation Mount and Krotona public hours and access; Daly Ranch and the demonstration garden access.
- The Oak Grove: the spot is on Besant Rd by the Krishnamurti Foundation, outside Oak Grove School. Confirm it's public.
- Real businesses (Bart's Books, Ojai Playhouse) need parody names.
- Dates for Ojai Day, the Music Festival and the Lavender Festival.
- Neighborhood names and lines: drafts to redraw.
- Generated landmark spots come from open data: some may be private or misplaced. Drop them via `excludePlaces` in `territory.json`.

## Not here yet

Faction control of neighborhoods and event spots, server check-ins, anti-spoofing, and the Expo app's map screen. The page's "Locate me" works when the page is served from the repo or a host; embedded previews usually block location.
