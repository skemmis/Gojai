import type { NodeType, EventKind } from "@gojai/map";

/**
 * Every colour the map uses. The art direction is still being decided, so
 * the look is deliberately plain: reskinning the map means editing this file.
 */
export interface Theme {
  name: string;
  paper: string; // land
  ink: string; // major roads, text
  inkSoft: string; // streets, buildings
  inkFaint: string; // contours, lanes
  water: string;
  park: string;
  school: string; // no-go zones
  boundary: string;
  hex: string;
  hexActive: string;
  you: string;
  node: Record<NodeType, string>;
  event: Record<EventKind, string>;
  ui: { bg: string; fg: string; muted: string; line: string };
}

const NODE = { fight: "#3b3b3b", elite: "#d9480f", rest: "#1c7ed6", shop: "#2b8a3e", mystery: "#7048e8" };
const EVENT = { boss: "#e64980", market: "#f59f00", raid: "#c92a2a", rare: "#0c8599" };

export const THEMES: Theme[] = [
  {
    name: "Day",
    paper: "#f4f1ea",
    ink: "#26241f",
    inkSoft: "#8a857a",
    inkFaint: "#d5cfc2",
    water: "#9fc3d6",
    park: "#dde6cf",
    school: "#f0d6d0",
    boundary: "#26241f",
    hex: "#26241f",
    hexActive: "#e64980",
    you: "#1c7ed6",
    node: NODE,
    event: EVENT,
    ui: { bg: "#fffdf8", fg: "#26241f", muted: "#7a7468", line: "#e2dccf" },
  },
  {
    name: "Night",
    paper: "#17181b",
    ink: "#e9e6df",
    inkSoft: "#6d6a64",
    inkFaint: "#2c2d31",
    water: "#23465a",
    park: "#1f2a1e",
    school: "#3a2224",
    boundary: "#e9e6df",
    hex: "#e9e6df",
    hexActive: "#ff5fa2",
    you: "#4dabf7",
    node: { ...NODE, fight: "#e9e6df" },
    event: EVENT,
    ui: { bg: "#202125", fg: "#e9e6df", muted: "#9a968d", line: "#34353a" },
  },
];

export const NODE_LABEL: Record<NodeType, string> = {
  fight: "Fight",
  elite: "Elite",
  rest: "Rest",
  shop: "Shop",
  mystery: "? Event",
};
export const NODE_GLYPH: Record<NodeType, string> = { fight: "⚔", elite: "☠", rest: "☾", shop: "$", mystery: "?" };
