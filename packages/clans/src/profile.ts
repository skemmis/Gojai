import type { FactionId } from "./factions.ts";
import type { Stats } from "./leaderboards.ts";

/**
 * Profiles. Your profile is a tarot card: a portrait in the house ink style,
 * a frame earned in play, a title, your name, and your record. Nothing on a
 * profile says where or when you play.
 *
 * Portraits (Sam, 2026-09-29): a random character generated for you in the
 * house style (portrait.ts). At signup you're dealt a few to pick from, and
 * each season you play earns one more draw. You can also wear any enemy
 * you've caught, so catching the $9 Latte means you can be it. No photos or
 * user-written prompts, so nothing a player uploads needs moderating.
 */

/** Characters dealt at signup, to pick one from. */
export const SIGNUP_DRAWS = 3;

/** How many portrait draws a player has earned: the signup hand plus one per season played. */
export const drawsEarned = (seasonsPlayed: number) => SIGNUP_DRAWS + seasonsPlayed;

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
  /** "gen:<seed>" (a generated character) or "enemy:<id>" (a caught enemy). */
  portrait: string;
  /** Seeds of the characters this player has been dealt. */
  dealt: number[];
  frame: Frame;
  /** Chosen from `titles()`. */
  title: string | null;
  /** Enemy ids caught at least once (all time). */
  caught: string[];
  /** Neighborhood ids kept at the end of a season. */
  kept: string[];
  seasonsWon: number;
}

/** Portraits this player can wear: their generated characters, then caught enemies. */
export function portraitsFor(p: Profile): string[] {
  return [...p.dealt.map((seed) => `gen:${seed}`), ...p.caught.map((e) => `enemy:${e}`)];
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
    portrait: portraitsFor(p).includes(p.portrait) ? p.portrait : p.dealt.length ? `gen:${p.dealt[0]}` : "gen:0",
    frame: framesFor(p, all).includes(p.frame) ? p.frame : "plain",
    title: p.title && titles(p, all, groundName).includes(p.title) ? p.title : null,
  };
}
