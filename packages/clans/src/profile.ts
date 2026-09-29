import type { FactionId } from "./factions.ts";
import type { Stats } from "./leaderboards.ts";

/**
 * Profiles. Your profile is a tarot card: a portrait in the house ink style,
 * a frame earned in play, a title, your name, and your record. No photos and
 * no user-drawn images at launch (nothing to moderate); see docs/CLANS.md.
 *
 * Portraits come from two places: drawn archetypes (a few free, more unlocked
 * by play) and every enemy you have caught, so catching the $9 Latte means
 * you can wear it. Frames are earned. Nothing on a profile says where or when
 * you play.
 */
export interface Portrait {
  id: string;
  name: string;
  /** "start": free at signup. Otherwise what unlocks it. */
  unlock: "start" | { metric: "spots" | "depth" | "bossDamage" | "duelWins" | "catches"; atLeast: number } | { faction: FactionId };
}

/** Drawn archetype portraits (art to come from the illustration thread). */
export const PORTRAITS: Portrait[] = [
  { id: "walker", name: "The Walker", unlock: "start" },
  { id: "seeker", name: "The Seeker", unlock: "start" },
  { id: "skeptic", name: "The Skeptic", unlock: "start" },
  { id: "initiate", name: "The Initiate", unlock: { faction: "order" } },
  { id: "listener", name: "The Listener", unlock: { faction: "pathless" } },
  { id: "pilgrim", name: "The Pilgrim", unlock: { metric: "spots", atLeast: 200 } },
  { id: "descender", name: "The Descender", unlock: { metric: "depth", atLeast: 25 } },
  { id: "duelist", name: "The Duelist", unlock: { metric: "duelWins", atLeast: 10 } },
  { id: "slayer", name: "The Slayer", unlock: { metric: "bossDamage", atLeast: 5000 } },
  { id: "collector", name: "The Collector", unlock: { metric: "catches", atLeast: 20 } },
];

/** Frames, plainest first. No pink: pink means a live event and nothing else. */
export type Frame = "plain" | "rule" | "gilt" | "keeper" | "champion";

export const FRAMES: Record<Frame, string> = {
  plain: "Plain ink rule.",
  rule: "Double rule: played 50 spots.",
  gilt: "Gilt: cleared 30 floors in one run.",
  keeper: "Keeper's frame: kept a neighborhood at the end of a season.",
  champion: "Your faction's star or oak: your faction won a season you played in.",
};

export interface Profile {
  id: string;
  name: string;
  faction: FactionId;
  portrait: string;
  frame: Frame;
  /** Chosen from `titles()`. */
  title: string | null;
  /** Enemy ids caught at least once (all time). */
  caught: string[];
  /** Neighborhood ids kept at the end of a season. */
  kept: string[];
  seasonsWon: number;
}

/** Portraits this player can wear: unlocked archetypes, then caught enemies. */
export function portraitsFor(p: Profile, all: Stats): string[] {
  const ok = PORTRAITS.filter((x) => {
    const u = x.unlock;
    if (u === "start") return true;
    if ("faction" in u) return u.faction === p.faction;
    return all[u.metric] >= u.atLeast;
  }).map((x) => x.id);
  return [...ok, ...p.caught.map((e) => `enemy:${e}`)];
}

export function framesFor(p: Profile, all: Stats): Frame[] {
  const f: Frame[] = ["plain"];
  if (all.spots >= 50) f.push("rule");
  if (all.depth >= 30) f.push("gilt");
  if (p.kept.length) f.push("keeper");
  if (p.seasonsWon) f.push("champion");
  return f;
}

/** Titles a player can show under their name. Keeper titles need a neighborhood name lookup. */
export function titles(p: Profile, all: Stats, groundName: (id: string) => string = (id) => id): string[] {
  const t = [p.faction === "order" ? "Initiate of the Star" : "Of No Path"];
  if (all.depth >= 30) t.push("Who Went Deep");
  if (all.duelWins >= 25) t.push("Unbowed");
  if (all.catches >= 50) t.push("Collector of Types");
  for (const g of p.kept) t.push(`Keeper of ${groundName(g)}`);
  return t;
}

/** Display names: 3 to 20 letters, numbers, spaces, . - ' _. Word filters run on the server. */
export function validName(name: string): boolean {
  const n = name.trim();
  return n.length >= 3 && n.length <= 20 && /^[\p{L}\p{N} .\-'_]+$/u.test(n) && !/\s{2}/.test(n);
}

/** A profile only offers what it has earned; anything else falls back. */
export function sanitize(p: Profile, all: Stats, groundName?: (id: string) => string): Profile {
  return {
    ...p,
    portrait: portraitsFor(p, all).includes(p.portrait) ? p.portrait : "walker",
    frame: framesFor(p, all).includes(p.frame) ? p.frame : "plain",
    title: p.title && titles(p, all, groundName).includes(p.title) ? p.title : null,
  };
}
