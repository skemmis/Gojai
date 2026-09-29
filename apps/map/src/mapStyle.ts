import type { StyleSpecification, ExpressionSpecification } from "maplibre-gl";
import { MEINERS_OAKS_RING, HOTSPOTS, type LngLat } from "@gojai/map";
import { GEO } from "./geo.ts";
import type { Theme } from "./theme.ts";

type FC = { type: "FeatureCollection"; features: unknown[] };

/** A circle of `m` metres around a point, as a polygon ring. */
function circle([lng, lat]: LngLat, m: number, steps = 48): LngLat[] {
  const dLat = m / 111_320;
  const dLng = m / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: LngLat[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return ring;
}

const RANGES: FC = {
  type: "FeatureCollection",
  features: HOTSPOTS.map((h) => ({
    type: "Feature",
    properties: { id: h.id, node: h.node },
    geometry: { type: "Polygon", coordinates: [circle(h.at, h.radiusM)] },
  })),
};

const MEINERS: FC = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [MEINERS_OAKS_RING] } }],
};

const byTier = (v: [number, number, number, number]): ExpressionSpecification =>
  ["interpolate", ["linear"], ["zoom"], 12, ["match", ["get", "t"], 3, v[3] * 0.6, 2, v[2] * 0.5, 1, v[1] * 0.4, v[0] * 0.3], 17, ["match", ["get", "t"], 3, v[3] * 2, 2, v[2] * 2, 1, v[1] * 2, v[0] * 2]];

export function buildStyle(t: Theme, hexes: FC, active: { hotspots: string[]; cells: string[] }): StyleSpecification {
  const nodeColor: ExpressionSpecification = [
    "match", ["get", "node"],
    "fight", t.node.fight, "elite", t.node.elite, "rest", t.node.rest, "shop", t.node.shop, t.node.mystery,
  ];
  return {
    version: 8,
    sources: {
      contours: { type: "geojson", data: GEO.contours },
      landuse: { type: "geojson", data: GEO.landuse },
      water: { type: "geojson", data: GEO.water },
      buildings: { type: "geojson", data: GEO.buildings },
      trails: { type: "geojson", data: GEO.trails },
      roads: { type: "geojson", data: GEO.roads },
      ojai: { type: "geojson", data: GEO.boundary },
      meiners: { type: "geojson", data: MEINERS as never },
      hexes: { type: "geojson", data: hexes as never, promoteId: "cell" },
      ranges: { type: "geojson", data: RANGES as never },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": t.paper } },
      {
        id: "contours",
        type: "line",
        source: "contours",
        paint: {
          "line-color": t.inkSoft,
          "line-opacity": ["case", ["==", ["get", "index"], 1], 0.55, 0.25],
          "line-width": ["case", ["==", ["get", "index"], 1], 1.1, 0.6],
        },
      },
      {
        id: "parks",
        type: "fill",
        source: "landuse",
        filter: ["in", ["get", "c"], ["literal", ["park", "golf", "protected", "recreation", "cemetery"]]],
        paint: { "fill-color": t.park },
      },
      {
        id: "schools",
        type: "fill",
        source: "landuse",
        filter: ["==", ["get", "c"], "education"],
        paint: { "fill-color": t.school, "fill-outline-color": t.event.raid },
      },
      {
        id: "water-fill",
        type: "fill",
        source: "water",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": t.water },
      },
      {
        id: "water-line",
        type: "line",
        source: "water",
        filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
        paint: {
          "line-color": t.water,
          "line-width": ["match", ["get", "c"], "river", 2.5, "stream", 1.2, 0.8],
        },
      },
      {
        id: "buildings",
        type: "fill",
        source: "buildings",
        minzoom: 14,
        paint: { "fill-color": t.inkSoft, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 0.35] },
      },
      {
        id: "trails",
        type: "line",
        source: "trails",
        paint: {
          "line-color": t.inkSoft,
          "line-width": ["case", ["==", ["get", "c"], "cycleway"], 1.6, 1],
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "roads",
        type: "line",
        source: "roads",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["match", ["get", "t"], 3, t.ink, 2, t.ink, t.inkSoft],
          "line-width": byTier([0.8, 1.4, 2.4, 3.4]),
        },
      },
      {
        id: "ojai-line",
        type: "line",
        source: "ojai",
        paint: { "line-color": t.boundary, "line-width": 1.5, "line-dasharray": [4, 2, 1, 2], "line-opacity": 0.6 },
      },
      {
        id: "meiners-line",
        type: "line",
        source: "meiners",
        paint: { "line-color": t.boundary, "line-width": 1.5, "line-dasharray": [4, 2, 1, 2], "line-opacity": 0.6 },
      },
      {
        id: "hex-fill",
        type: "fill",
        source: "hexes",
        paint: {
          "fill-color": ["case", ["in", ["get", "cell"], ["literal", active.cells]], t.hexActive, t.hex],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0.28,
            ["in", ["get", "cell"], ["literal", active.cells]], 0.12,
            0.02,
          ],
        },
      },
      {
        id: "hex-line",
        type: "line",
        source: "hexes",
        paint: { "line-color": t.hex, "line-opacity": 0.35, "line-width": 0.8 },
      },
      {
        id: "ranges",
        type: "fill",
        source: "ranges",
        paint: {
          "fill-color": ["case", ["in", ["get", "id"], ["literal", active.hotspots]], t.event.boss, nodeColor],
          "fill-opacity": 0.18,
          "fill-outline-color": nodeColor,
        },
      },
    ],
  };
}
