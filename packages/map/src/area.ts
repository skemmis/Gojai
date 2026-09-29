import { OJAI_CITY_RINGS } from "./ojaiBoundary.ts";

/** [lng, lat] */
export type LngLat = [number, number];

/**
 * Extent of the extracted base map: the Ojai Valley floor from the Ventura
 * River to Meditation Mount, up to the Topatopa foothills. Keep in sync with
 * BBOX in tools/map/extract_overture.py.
 */
export const BBOX = [-119.34, 34.415, -119.16, 34.505] as const;

/** Downtown Ojai (Libbey Park / the Arcade). Default map centre. */
export const CENTER: LngLat = [-119.2455, 34.4475];

/**
 * Meiners Oaks is unincorporated and has no boundary in the open data, so
 * this ring is hand-drawn: Ventura River on the west, the Ojai city line on
 * the east, down to the Ojai Valley Trail at Mira Monte. Approximate on
 * purpose; tweak freely.
 */
export const MEINERS_OAKS_RING: LngLat[] = [
  [-119.2995, 34.4390],
  [-119.2890, 34.4330],
  [-119.2790, 34.4300],
  [-119.2700, 34.4300],
  [-119.2690, 34.4400],
  [-119.2690, 34.4560],
  [-119.2800, 34.4640],
  [-119.2940, 34.4610],
  [-119.2995, 34.4390],
];

/**
 * The play area: the City of Ojai plus Meiners Oaks. Hotspots outside it
 * (Meditation Mount, Soule Park) pull in their own cell and its neighbours;
 * see hex.ts.
 */
export const PLAY_AREA_RINGS: LngLat[][] = [...OJAI_CITY_RINGS, MEINERS_OAKS_RING];

/** Ray-casting point-in-ring test. */
export function inRing([lng, lat]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const inPlayArea = (p: LngLat) => PLAY_AREA_RINGS.some((r) => inRing(p, r));

const R = 6371008.8;
/** Great-circle distance in metres. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
