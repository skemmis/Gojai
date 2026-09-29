import { cellToBoundary, cellToLatLng, gridDisk, latLngToCell, polygonToCells } from "h3-js";
import { PLAY_AREA_RINGS, type LngLat } from "./area.ts";
import { HOTSPOTS } from "./hotspots.ts";

/**
 * Territory hexes (H3, as in la-brea-madre). Res 9 cells are ~350 m across,
 * a few town blocks: downtown Ojai is about four cells, the play area ~160.
 * Res 10 (~130 m) is the finer option if territory should be block-by-block.
 */
export const TERRITORY_RES = 9;

/** Hotspots outside the town lines pull in their cell plus this ring. */
const OUTLIER_RING = 1;

export const cellOf = ([lng, lat]: LngLat, res = TERRITORY_RES) => latLngToCell(lat, lng, res);

/** Every claimable cell: centres inside Ojai or Meiners Oaks, plus hotspot cells. */
export function playAreaCells(res = TERRITORY_RES): string[] {
  const cells = new Set<string>();
  for (const ring of PLAY_AREA_RINGS) for (const c of polygonToCells(ring, res, true)) cells.add(c);
  for (const h of HOTSPOTS) {
    const c = cellOf(h.at, res);
    if (!cells.has(c)) for (const n of gridDisk(c, OUTLIER_RING)) cells.add(n);
  }
  return [...cells].sort();
}

/** Cells as a GeoJSON FeatureCollection (for MapLibre, PostGIS import, etc.). */
export function cellsToGeoJSON(cells: string[], props: (cell: string) => Record<string, unknown> = () => ({})) {
  return {
    type: "FeatureCollection" as const,
    features: cells.map((cell) => ({
      type: "Feature" as const,
      id: cell,
      properties: { cell, ...props(cell) },
      geometry: { type: "Polygon" as const, coordinates: [cellToBoundary(cell, true)] },
    })),
  };
}

export const cellCenter = (cell: string): LngLat => {
  const [lat, lng] = cellToLatLng(cell);
  return [lng, lat];
};
