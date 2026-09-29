// The base map sheets, bundled into the app (a few MB) so the page works as a
// single file with no map service. Regenerate with tools/map.
import roads from "../public/geo/roads.geojson?raw";
import trails from "../public/geo/trails.geojson?raw";
import water from "../public/geo/water.geojson?raw";
import landuse from "../public/geo/landuse.geojson?raw";
import buildings from "../public/geo/buildings.geojson?raw";
import contours from "../public/geo/contours.geojson?raw";
import boundary from "../public/geo/ojai-boundary.geojson?raw";
import { FORMER_SCHOOL_SITES, inRing, type LngLat } from "@gojai/map";

/** Former school sites aren't no-go zones: retag them so they draw as plain land. */
function retagFormerSchools(fc: any) {
  for (const f of fc.features) {
    if (f.properties.c !== "education") continue;
    const polys: LngLat[][][] = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (FORMER_SCHOOL_SITES.some((p) => polys.some((poly) => inRing(p, poly[0])))) f.properties.c = "former-school";
  }
  return fc;
}

export const GEO = {
  roads: JSON.parse(roads),
  trails: JSON.parse(trails),
  water: JSON.parse(water),
  landuse: retagFormerSchools(JSON.parse(landuse)),
  buildings: JSON.parse(buildings),
  contours: JSON.parse(contours),
  boundary: JSON.parse(boundary),
};
