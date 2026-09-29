# The map

The play area is the City of Ojai plus Meiners Oaks. Players walk to hand-picked **hotspots**; each is a Slay the Spire node type, so walking the town is choosing your path. **Timed events** (Pink Moment, the markets, full moons) open boss fights and rare drops at particular spots. The ground is cut into **H3 hexes** that clans will claim later.

## Pieces

- `packages/map` is the source of truth, pure TypeScript with no I/O, so the phone, the server and the lab share it:
  - `area.ts`: bounding box, the play area (Ojai's official boundary + a hand-drawn Meiners Oaks), distance.
  - `hotspots.ts`: the 15 standing spots, their node type, play radius, and anything to verify.
  - `events.ts`: timed events as rules (`sunset`, `weekly`, `fullMoon`, `annual`, `tbd`) and `windowsBetween` / `activeEvents` / `upcomingEvents`.
  - `time.ts`: Ojai local time (PST/PDT), sunset (NOAA equation, within a couple of minutes), full moons (mean synodic month, within about half a day).
  - `hex.ts`: territory cells. Res 9 (~350 m across, ~180 cells) by default; res 10 (~130 m, ~1,150 cells) if territory should be block-by-block. Hotspots outside the town lines (Meditation Mount, Soule Park) pull in their cell and its neighbours.
- `apps/map` draws it: MapLibre over our own GeoJSON (no tile service, no API key, as in la-brea-madre). All colours live in `apps/map/src/theme.ts`; the look is deliberately plain until the art direction is settled. `npm run build:map` also writes a single self-contained `dist/pathless-land-map.html`.
- `tools/map` rebuilds the base map (`npm run map:extract`). Roads, trails, water, land use, buildings and the Ojai boundary come from [Overture Maps](https://overturemaps.org) (OpenStreetMap-derived, ODbL), read from its public S3 bucket with pyarrow. Contours are traced from the AWS Terrain Tiles. Needs `python3 -m pip install pyarrow shapely`.

## Safety rules the code enforces

- Every hotspot is inside the play area's hexes.
- No hotspot sits on school grounds (the tests check every spot against the school polygons in the land-use layer). The school-pickup event from the draft list is left out for the same reason.

## To check on the ground

Spots flagged with `verify` in `hotspots.ts` and events with `verify` in `events.ts`, mainly:

- **Thursday People's Market**: day, hours and place. Open data puts the Ojai Community Farmers' Market at 414 E Ojai Ave, which is a school site, so it's a placeholder.
- **Sunday market** hours; **Meditation Mount** and **Krotona** public hours and access.
- **The Oak Grove**: the spot is on Besant Rd by the Krishnamurti Foundation, outside Oak Grove School. Confirm it's public.
- Real businesses (Bart's Books, Ojai Playhouse) need parody names.
- Dates for Ojai Day, the Music Festival and the Lavender Festival.

## Not here yet

Clan ownership of hexes, server check-ins, anti-spoofing, and the Expo app's map screen. The page's "Locate me" works when the page is served from the repo or a host; embedded previews usually block location.
