import type { Find, EventKind } from "@gojai/map";

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
  hood: string; // neighborhood outlines and labels
  hoodTints: [string, string, string, string, string]; // neighbouring territories; [4] = the trail
  spot: string;
  eventSpot: string;
  you: string;
  find: Record<Find, string>;
  event: Record<EventKind, string>;
  ui: { bg: string; fg: string; muted: string; line: string };
}

const FIND = { fight: "#3b3b3b", elite: "#d9480f", rest: "#1c7ed6", shop: "#2b8a3e", mystery: "#7048e8" };
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
    hood: "#8c5a3c",
    hoodTints: ["#9d8ec7", "#6d9dc5", "#a3b18a", "#e0a458", "#2f9e44"],
    spot: "#0b7285",
    eventSpot: "#862e9c",
    you: "#1c7ed6",
    find: FIND,
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
    hood: "#d9a07b",
    hoodTints: ["#9d8ec7", "#6d9dc5", "#a3b18a", "#e0a458", "#2f9e44"],
    spot: "#3bc9db",
    eventSpot: "#da77f2",
    you: "#4dabf7",
    find: { ...FIND, fight: "#e9e6df" },
    event: EVENT,
    ui: { bg: "#202125", fg: "#e9e6df", muted: "#9a968d", line: "#34353a" },
  },
];

export const FIND_LABEL: Record<Find, string> = {
  fight: "Fight",
  elite: "Elite",
  rest: "Rest",
  shop: "Shop",
  mystery: "Mystery",
};
export const FIND_GLYPH: Record<Find, string> = { fight: "⚔", elite: "☠", rest: "☾", shop: "$", mystery: "?" };
