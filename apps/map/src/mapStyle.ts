import type { StyleSpecification, ExpressionSpecification } from "maplibre-gl";
import { SPOTS, neighborhoodsGeoJSON, type LngLat } from "@gojai/map";
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
  features: SPOTS.map((s) => ({
    type: "Feature",
    properties: { id: s.id, kind: s.kind },
    geometry: { type: "Polygon", coordinates: [circle(s.at, s.radiusM)] },
  })),
};

const HOODS = neighborhoodsGeoJSON();

const SPOT_POINTS: FC = {
  type: "FeatureCollection",
  features: SPOTS.filter((s) => s.kind === "spot").map((s) => ({
    type: "Feature",
    properties: { id: s.id },
    geometry: { type: "Point", coordinates: s.at },
  })),
};

const byTier = (v: [number, number, number, number]): ExpressionSpecification =>
  ["interpolate", ["linear"], ["zoom"], 12, ["match", ["get", "t"], 3, v[3] * 0.6, 2, v[2] * 0.5, 1, v[1] * 0.4, v[0] * 0.3], 17, ["match", ["get", "t"], 3, v[3] * 2, 2, v[2] * 2, 1, v[1] * 2, v[0] * 2]];

/** Map images drawn on the fly: engraver's hatching and stipple, and the tarot-card spot pin. */
export function drawImage(t: Theme, name: string): { width: number; height: number; data: Uint8ClampedArray } | null {
  const make = (w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const c = cv.getContext("2d")!;
    draw(c);
    return { width: w, height: h, data: c.getImageData(0, 0, w, h).data };
  };
  if (name === "hatch")
    return make(8, 8, (c) => {
      c.strokeStyle = t.ink;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-1, 9);
      c.lineTo(9, -1);
      c.moveTo(-1, 1);
      c.lineTo(1, -1);
      c.moveTo(7, 9);
      c.lineTo(9, 7);
      c.stroke();
    });
  if (name === "stipple")
    return make(10, 10, (c) => {
      c.fillStyle = t.inkSoft;
      c.fillRect(2, 2, 1, 1);
      c.fillRect(7, 7, 1, 1);
    });
  if (name === "card" || name === "card-live") {
    // A little tarot card: outer rule, inner rule, a diamond pip. Drawn at 2x.
    return make(28, 40, (c) => {
      c.fillStyle = name === "card-live" ? t.live : t.spot;
      c.fillRect(1, 1, 26, 38);
      c.strokeStyle = t.ink;
      c.lineWidth = 3;
      c.strokeRect(1.5, 1.5, 25, 37);
      c.strokeStyle = t.paper;
      c.lineWidth = 1;
      c.strokeRect(5.5, 5.5, 17, 29);
      c.fillStyle = t.paper;
      c.beginPath();
      c.moveTo(14, 13);
      c.lineTo(19, 20);
      c.lineTo(14, 27);
      c.lineTo(9, 20);
      c.closePath();
      c.fill();
    });
  }
  return null;
}

export function buildStyle(t: Theme, active: { spots: string[] }): StyleSpecification {
  const isLive: ExpressionSpecification = ["in", ["get", "id"], ["literal", active.spots]];
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
      hoods: { type: "geojson", data: HOODS as never, promoteId: "id" },
      ranges: { type: "geojson", data: RANGES as never },
      spots: { type: "geojson", data: SPOT_POINTS as never, promoteId: "id" },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": t.paper } },
      {
        id: "hood-fill",
        type: "fill",
        source: "hoods",
        paint: {
          "fill-color": ["case", ["==", ["get", "id"], "trail"], t.paperDeep, t.ink],
          "fill-opacity": [
            "case",
            ["==", ["get", "id"], "trail"], 1,
            ["boolean", ["feature-state", "selected"], false], 0.07,
            0,
          ],
        },
      },
      {
        id: "parks",
        type: "fill",
        source: "landuse",
        filter: ["in", ["get", "c"], ["literal", ["park", "golf", "protected", "recreation", "cemetery"]]],
        paint: { "fill-pattern": "stipple" },
      },
      {
        id: "schools",
        type: "fill",
        source: "landuse",
        filter: ["==", ["get", "c"], "education"],
        paint: { "fill-pattern": "hatch", "fill-opacity": 0.55 },
      },
      {
        id: "schools-line",
        type: "line",
        source: "landuse",
        filter: ["==", ["get", "c"], "education"],
        paint: { "line-color": t.ink, "line-width": 1 },
      },
      {
        id: "contours",
        type: "line",
        source: "contours",
        paint: {
          "line-color": t.inkSoft,
          "line-opacity": ["case", ["==", ["get", "index"], 1], 0.35, 0.15],
          "line-width": ["case", ["==", ["get", "index"], 1], 1, 0.5],
        },
      },
      {
        id: "water-fill",
        type: "fill",
        source: "water",
        filter: ["in", ["geometry-type"], ["literal", ["Polygon", "MultiPolygon"]]],
        paint: { "fill-color": t.paperDeep, "fill-outline-color": t.ink },
      },
      {
        id: "water-line",
        type: "line",
        source: "water",
        filter: ["in", ["geometry-type"], ["literal", ["LineString", "MultiLineString"]]],
        paint: {
          "line-color": t.ink,
          "line-width": ["match", ["get", "c"], "river", 1.6, "stream", 0.9, 0.6],
        },
      },
      {
        id: "buildings",
        type: "fill",
        source: "buildings",
        minzoom: 15,
        paint: { "fill-color": t.inkSoft, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0, 16, 0.12] },
      },
      {
        id: "trails",
        type: "line",
        source: "trails",
        paint: {
          "line-color": ["case", ["==", ["get", "c"], "cycleway"], t.ink, t.inkSoft],
          "line-opacity": ["case", ["==", ["get", "c"], "cycleway"], 1, 0.45],
          "line-width": ["case", ["==", ["get", "c"], "cycleway"], 1.4, 0.7],
          "line-dasharray": [1, 2],
        },
      },
      {
        id: "roads-minor",
        type: "line",
        source: "roads",
        filter: ["<", ["get", "t"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ["match", ["get", "t"], 1, t.ink, t.inkSoft], "line-width": byTier([0.7, 1, 0, 0]) },
      },
      {
        // Major roads are drawn as a survey map's double line: ink casing, paper core.
        id: "roads-casing",
        type: "line",
        source: "roads",
        filter: [">=", ["get", "t"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": t.ink, "line-width": byTier([0, 0, 3, 4.4]) },
      },
      {
        id: "roads-core",
        type: "line",
        source: "roads",
        filter: [">=", ["get", "t"], 2],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": t.paper, "line-width": byTier([0, 0, 1.4, 2.4]) },
      },
      {
        id: "ojai-line",
        type: "line",
        source: "ojai",
        paint: { "line-color": t.ink, "line-width": 1, "line-dasharray": [4, 2, 1, 2], "line-opacity": 0.3 },
      },
      {
        id: "hood-line",
        type: "line",
        source: "hoods",
        layout: { "line-join": "round" },
        paint: {
          "line-color": t.ink,
          "line-width": ["case", ["boolean", ["feature-state", "selected"], false], 3, 1.6],
          "line-opacity": ["case", ["boolean", ["feature-state", "selected"], false], 0.9, 0.45],
          "line-dasharray": [4, 2],
        },
      },
      {
        id: "ranges",
        type: "fill",
        source: "ranges",
        minzoom: 15,
        paint: {
          "fill-color": t.live,
          "fill-opacity": ["case", isLive, 0.18, 0],
          "fill-outline-color": ["case", isLive, t.live, "rgba(0,0,0,0)"],
        },
      },
      {
        id: "spot-selected",
        type: "circle",
        source: "spots",
        paint: {
          "circle-color": "rgba(0,0,0,0)",
          "circle-stroke-color": t.ink,
          "circle-stroke-width": ["case", ["boolean", ["feature-state", "selected"], false], 2, 0],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 9, 17, 18],
        },
      },
      {
        id: "spots",
        type: "symbol",
        source: "spots",
        layout: {
          "icon-image": ["case", isLive, "card-live", "card"],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 12, 0.42, 14, 0.62, 17, 1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      },
    ],
  };
}
