import { distanceM, type LngLat } from "./area.ts";
import { activeEvents } from "./events.ts";
import { neighborhoodOf } from "./neighborhoods.ts";
import { REFRESH_MIN, findAt, type Find, type Spot } from "./spots.ts";

/**
 * Opening spots, Pokémon Go style: you must stand within the spot's range,
 * and once opened it cools down until its next reroll, so the same roll
 * can't be farmed. The game keeps `Visits` (spot id → when it was opened).
 */
export type Visits = Record<string, number>;

export type SpotState =
  | { kind: "far"; distanceM: number } // walk closer
  | { kind: "open"; find: Find } // tap to play what it rolled
  | { kind: "cooling"; until: Date }; // already opened this roll

const SLOT_MS = REFRESH_MIN * 6e4;

/** When the finds at every spot next reroll. */
export function nextReroll(now: Date): Date {
  return new Date((Math.floor(now.getTime() / SLOT_MS) + 1) * SLOT_MS);
}

/**
 * What a player can do with a spot right now. `you` is null when location is
 * unknown. `anywhere` is the test mode: range is ignored, cooldowns still apply.
 */
export function spotState(
  spot: Spot,
  playerId: string,
  you: LngLat | null,
  now: Date,
  visits: Visits,
  opts: { anywhere?: boolean } = {},
): SpotState {
  const opened = visits[spot.id];
  if (opened !== undefined && nextReroll(new Date(opened)) > now) return { kind: "cooling", until: nextReroll(new Date(opened)) };
  const d = you ? distanceM(you, spot.at) : Infinity;
  if (!opts.anywhere && d > spot.radiusM) return { kind: "far", distanceM: d };
  return { kind: "open", find: findAt(spot, playerId, now) };
}

/** Record that a spot was opened (returns a new Visits). */
export function visit(visits: Visits, spot: Spot, now: Date): Visits {
  return { ...visits, [spot.id]: now.getTime() };
}

/** Everything the game needs when a player opens a spot. */
export interface SpotOpened {
  spot: Spot;
  find: Find;
  at: Date;
  /** Territory the spot is in ("arcade", "trail", …), for clan play. */
  neighborhoodId?: string;
  /** The same territory as a backdrop key for fights ("arcade", "libbey_park", "ojai_trail", …). */
  place?: string;
  /** Ids of events live at this spot right now (e.g. "pink-moment"). */
  liveEvents: string[];
}

export function spotOpened(spot: Spot, find: Find, at: Date): SpotOpened {
  const hood = neighborhoodOf(spot.at)?.id;
  return {
    spot,
    find,
    at,
    neighborhoodId: hood,
    place: hood && (hood === "trail" ? "ojai_trail" : hood.replace(/-/g, "_")),
    liveEvents: activeEvents(at).filter((w) => w.event.spots.includes(spot.id)).map((w) => w.event.id),
  };
}
