import { inRing, type LngLat } from "./area.ts";

/**
 * Territory is hand-drawn neighborhoods, not a grid: Ojai is small enough to
 * craft by hand, and people already think in these names. Factions will hold
 * neighborhoods; that logic lives elsewhere.
 *
 * The rings below are the editable source: straight lines along real roads
 * where they can (Canada St, Fox St, Grand Ave, Gridley Rd, El Paseo Rd).
 * Neighbours share vertices so there are no gaps. For the organic look, every
 * ring is then bent by the same smooth wobble (organic() below); because the
 * wobble depends only on position, shared edges bend identically and still
 * line up. Tweak freely: the tests catch gaps, overlaps and stray spots.
 */
export interface Neighborhood {
  id: string;
  name: string;
  /** One line of flavour, for lore and the map sheet. */
  note: string;
  ring: LngLat[];
  /** Map tint index (0-3), picked so neighbours differ. */
  tint: number;
}

// Shared edge coordinates, so neighbours line up.
const W_CANADA = -119.2505; // just west of Canada St
const E_FOX = -119.2405; // Fox St / the trail's downtown end
const E_GRIDLEY = -119.2283; // Gridley Rd
const E_CITY = -119.22; // east city line
const W_DELNORTE = -119.2604; // Del Norte Rd
const W_CC = -119.256; // west of the Inn
const W_KROTONA = -119.268; // Krotona Hill's east flank
const N_CREEK = 34.444; // San Antonio Creek behind Libbey Park
const N_MATILIJA = 34.45; // a block north of Matilija St
const N_GRAND = 34.4545; // Grand Ave
const N_FOOT = 34.4575; // where Arbolada meets the foothills
const S_CITY = 34.429; // south city line
/** Where the Country Club / Creekside line meets Arbolada's south edge. */
const P_CC: LngLat = [W_CC, 34.443 + (0.003 * (W_DELNORTE - W_CC)) / (W_DELNORTE - W_CANADA)];

const SOURCE: Neighborhood[] = [
  {
    id: "downtown",
    tint: 0,
    name: "Downtown",
    note: "The Arcade, Libbey Park, the Sunday market. Edward Libbey's company town.",
    ring: [[W_CANADA, N_CREEK], [E_FOX, N_CREEK], [E_FOX, N_MATILIJA], [W_CANADA, N_MATILIJA]],
  },
  {
    id: "arbolada",
    tint: 1,
    name: "Arbolada",
    note: "Libbey's planned oak-shaded enclave up Foothill Rd. Land Rovers idle here.",
    ring: [[W_DELNORTE, 34.443], P_CC, [W_CANADA, 34.446], [W_CANADA, N_MATILIJA], [W_CANADA, N_GRAND], [W_CANADA, N_FOOT], [W_DELNORTE, N_FOOT]],
  },
  {
    id: "topa-topa",
    tint: 2,
    name: "Topa Topa",
    note: "The grid north of downtown up to Grand Ave: Sarzotti Park, the rec department, the bungalows.",
    ring: [[W_CANADA, N_MATILIJA], [E_FOX, N_MATILIJA], [E_GRIDLEY, N_MATILIJA], [E_GRIDLEY, N_GRAND], [W_CANADA, N_GRAND]],
  },
  {
    id: "foothills",
    tint: 3,
    name: "The Foothills",
    note: "North of Grand Ave to Shelf Road, facing the Topatopa bluffs. Pink Moment country.",
    ring: [[W_DELNORTE, N_FOOT], [W_CANADA, N_FOOT], [W_CANADA, N_GRAND], [E_GRIDLEY, N_GRAND], [E_CITY, N_GRAND], [E_CITY, 34.47], [W_DELNORTE, 34.47]],
  },
  {
    id: "east-end",
    tint: 1,
    name: "East End",
    note: "Ojai Ave heading out past Soule Park toward the orchards.",
    ring: [[E_FOX, 34.44], [E_CITY, 34.438], [E_CITY, N_GRAND], [E_GRIDLEY, N_GRAND], [E_GRIDLEY, N_MATILIJA], [E_FOX, N_MATILIJA], [E_FOX, N_CREEK]],
  },
  {
    id: "creekside",
    tint: 2,
    name: "San Antonio Creek",
    note: "South of the creek: the Inn's back gate, the demonstration garden, horse country.",
    ring: [[W_CC, S_CITY], [-119.23, S_CITY], [E_CITY, 34.438], [E_FOX, 34.44], [E_FOX, N_CREEK], [W_CANADA, N_CREEK], [W_CANADA, 34.446], P_CC],
  },
  {
    id: "country-club",
    tint: 3,
    name: "Country Club",
    note: "The Ojai Valley Inn's golf course and the parks along Country Club Dr.",
    ring: [[W_KROTONA, S_CITY], [W_CC, S_CITY], P_CC, [W_DELNORTE, 34.443], [W_KROTONA, 34.44]],
  },
  {
    id: "westside",
    tint: 0,
    name: "Krotona & the Westside",
    note: "Krotona Hill, the Theosophists' 1924 refuge, and Maricopa Hwy out of town.",
    ring: [[-119.2735, 34.4295], [W_KROTONA, S_CITY], [W_KROTONA, 34.44], [W_DELNORTE, 34.443], [W_DELNORTE, N_FOOT], [-119.269, 34.456], [-119.269, 34.447], [-119.2735, 34.442]],
  },
  {
    id: "meiners-oaks",
    tint: 2,
    name: "Meiners Oaks",
    note: "The other town: El Roblar's cafés, the Oak Grove where Krishnamurti spoke, the river bottom.",
    ring: [[-119.2995, 34.439], [-119.289, 34.433], [-119.279, 34.43], [-119.2735, 34.4295], [-119.2735, 34.442], [-119.269, 34.447], [-119.269, 34.456], [-119.28, 34.464], [-119.294, 34.461]],
  },
  {
    id: "the-mount",
    tint: 0,
    name: "Meditation Mount",
    note: "Up Reeves Rd, apart from town: the garden that watches the Pink Moment.",
    ring: [[-119.1705, 34.4475], [-119.161, 34.4475], [-119.161, 34.454], [-119.1705, 34.454]],
  },
];

/** Wobble amplitude (metres) and wavelength (metres) for organic edges. */
const WOBBLE_M = 55;
const WAVE_M = 340;
/** Edges are resampled this often before bending. */
const STEP_M = 15;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LNG = 111_320 * Math.cos((34.45 * Math.PI) / 180);

/** A smooth displacement field over the valley (a few crossed sine waves). */
function wobble([lng, lat]: LngLat): LngLat {
  const x = (lng * M_PER_DEG_LNG) / WAVE_M;
  const y = (lat * M_PER_DEG_LAT) / WAVE_M;
  const dx = Math.sin(1.7 * y + 0.3) + 0.5 * Math.sin(3.1 * y + 2.2 * x + 1.1) + 0.3 * Math.sin(5.3 * x - 4.1 * y);
  const dy = Math.sin(1.9 * x + 1.4) + 0.5 * Math.sin(2.7 * x - 3.3 * y + 0.7) + 0.3 * Math.sin(4.9 * y + 5.7 * x);
  return [lng + (dx * WOBBLE_M) / 1.8 / M_PER_DEG_LNG, lat + (dy * WOBBLE_M) / 1.8 / M_PER_DEG_LAT];
}

/** Resample a ring's edges every STEP_M, then bend it through the wobble. */
function organic(ring: LngLat[]): LngLat[] {
  const out: LngLat[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const m = Math.hypot((b[0] - a[0]) * M_PER_DEG_LNG, (b[1] - a[1]) * M_PER_DEG_LAT);
    const n = Math.max(1, Math.round(m / STEP_M));
    for (let k = 0; k < n; k++) out.push(wobble([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]));
  }
  return out.map(([x, y]) => [Math.round(x * 1e6) / 1e6, Math.round(y * 1e6) / 1e6]);
}

export const NEIGHBORHOODS: Neighborhood[] = SOURCE.map((n) => ({ ...n, ring: organic(n.ring) }));

export const neighborhoodById = (id: string) => NEIGHBORHOODS.find((n) => n.id === id);

/** The neighborhood a point is in, or undefined outside the play area. */
export const neighborhoodOf = (p: LngLat) => NEIGHBORHOODS.find((n) => inRing(p, n.ring));

/** The play area is exactly the neighborhoods. */
export const inPlayArea = (p: LngLat) => neighborhoodOf(p) !== undefined;

/** Neighborhoods as a GeoJSON FeatureCollection (for the map, PostGIS, etc.). */
export function neighborhoodsGeoJSON() {
  return {
    type: "FeatureCollection" as const,
    features: NEIGHBORHOODS.map((n) => ({
      type: "Feature" as const,
      id: n.id,
      properties: { id: n.id, name: n.name, tint: n.tint },
      geometry: { type: "Polygon" as const, coordinates: [[...n.ring, n.ring[0]]] },
    })),
  };
}
