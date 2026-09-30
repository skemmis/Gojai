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

const R = 6371008.8;
/** Great-circle distance in metres. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Sites the open data still tags as schools but that aren't active schools.
 * Land-use polygons containing one of these points are not no-go zones.
 * 414 E Ojai Ave: the old Ojai Unified grounds, home of the Thursday market
 * (Sam, 2026-09-29).
 */
export const FORMER_SCHOOL_SITES: LngLat[] = [[-119.2428, 34.4489]];
