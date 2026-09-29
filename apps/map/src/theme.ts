import type { Find } from "@gojai/map";
// The app's design tokens, owned by the art-direction work (docs/ART_DIRECTION.md).
import { color, font } from "../../../packages/art/src/theme.ts";

/**
 * How the map uses the app's tokens: an ink survey map on paper. Pink is the
 * live-event colour; spots near you get a map-local blue so they stand out. Blood (danger) and
 * gilt (reward) appear only in the spot panel's odds.
 */
export interface Theme {
  paper: string; // land
  paperDeep: string; // parks, the trail
  ink: string; // roads, outlines, text
  inkSoft: string; // streets, buildings, contours
  rule: string; // hairlines
  spot: string; // map-local: spots within walking reach of you
  live: string; // a live event: its spot, its range, the band
  find: Record<Find, string>;
  font: typeof font;
}

export const THEME: Theme = {
  paper: color.paper,
  paperDeep: color.paperDeep,
  ink: color.ink,
  inkSoft: color.inkSoft,
  rule: color.rule,
  // Prussian blue, a period printer's ink. Map-local for now: not one of the
  // shared spot inks, and it means only "a spot is here".
  spot: "#1F4E79",
  live: color.pink,
  find: { fight: color.ink, elite: color.blood, rest: color.ink, shop: color.gilt, mystery: color.ink },
  font,
};

export const FIND_LABEL: Record<Find, string> = {
  fight: "Fight",
  elite: "Elite",
  rest: "Rest",
  shop: "Shop",
  mystery: "Mystery",
};
export const FIND_GLYPH: Record<Find, string> = { fight: "⚔", elite: "☠", rest: "☾", shop: "$", mystery: "?" };
