/**
 * Every clan-layer number, in one place so the clan lab can sweep them.
 * Units: "influence" is an abstract count per neighborhood per faction; one
 * spot walked is worth 1.
 */
import type { FactionId } from "./factions.ts";

export const CLAN = {
  /** Factions in play. */
  factions: ["order", "pathless"] as FactionId[],

  /** Share of influence that fades each night (the map keeps moving). */
  decay: 0.15,

  /** Influence a faction needs to hold a neighborhood at all. */
  minHold: 12,
  /** Unheld ground: the leader must beat the runner-up by this factor to claim it. */
  claimMargin: 1.15,
  /** Held ground: a challenger must beat the holder by this factor to flip it. */
  flipMargin: 1.15,

  /** First visit to a spot today. */
  walk: 1,

  /** Death as offering: what a finished run pays its faction. */
  offering: { perFloor: 1, perElite: 3, perBoss: 8 },

  /**
   * Diminishing returns per player, per neighborhood, per day, on walking and
   * offerings: full value up to `knee`, half up to 3x knee, a quarter after.
   * Stops one obsessive player carrying a neighborhood alone.
   */
  knee: 8,

  /**
   * Catch-up: a faction holding less than its fair share of the map (1/2 or
   * 1/3) earns more everywhere, one holding more earns less.
   * mult = 1 + k * (1/n - heldShare).
   */
  underdog: { k: 3, min: 0.5, max: 2 },

  /** Group bosses at event spots. */
  boss: {
    baseHp: 150,
    /** Every player who joins adds this much HP, so turnout never trivialises it. */
    hpPerPlayer: 60,
    /** Influence split between factions by share of damage dealt. */
    pool: 40,
    /** Extra influence to the faction that dealt the most damage. */
    topBonus: 20,
    /** Extra influence to every faction that hit it, if it died in the window. */
    killBonus: 10,
    /** Gold per player: base, plus up to `goldTop` scaled by damage vs the top hitter. */
    goldBase: 10,
    goldTop: 40,
  },

  /** Live duels between two players standing at the same spot. */
  duel: {
    /** Influence to the winner's faction in that neighborhood. */
    influence: 5,
    /** "gold" or "card": what the loser pays. Open question for Sam. */
    stake: "gold" as "gold" | "card",
    /** Gold stake: this share of the loser's run gold, clamped. */
    stakeShare: 0.2,
    stakeMin: 5,
    stakeMax: 40,
    /** The same two players can only duel for stakes once per this many days. */
    cooldownDays: 1,
  },

  /** Auto-assignment at signup. */
  assign: {
    /** Strength = spots played in this window, summed over a faction's members. */
    lookbackDays: 14,
    /** Strength credited to a player too new to have history. */
    newcomer: 10,
    /** A friend's invite is honoured if their faction is within this share of the weakest. */
    inviteTolerance: 0.1,
  },

  season: {
    days: 29,
    /** Share of influence that survives into the next season. */
    carryOver: 0.25,
  },
};

export type ClanConfig = typeof CLAN;
