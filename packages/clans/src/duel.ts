import { CLAN, type ClanConfig } from "./config.ts";
import type { FactionId } from "./factions.ts";

/**
 * Live duels. Two players standing at the same spot, both phones agreeing on
 * it. Each fights with their current run deck; the duel never touches run HP
 * and never ends a run. Across factions it's for stakes: the loser pays (gold
 * by default) and the winner's faction gains influence in that neighborhood.
 * Within a faction it's a spar: no stakes, no influence.
 *
 * The duel fight itself is the combat engine's job; this is the rules around it.
 */
export interface Duelist {
  id: string;
  faction: FactionId;
  /** Spot the player is standing at (server-verified). */
  spot: string | null;
  gold: number;
}

export type DuelCheck =
  | { ok: true; stakes: boolean }
  | { ok: false; reason: "not-together" | "same-player" };

/** `lastStakedDay` is the last day these two dueled for stakes, if ever. */
export function canDuel(a: Duelist, b: Duelist, today: number, lastStakedDay?: number, cfg: ClanConfig = CLAN): DuelCheck {
  if (a.id === b.id) return { ok: false, reason: "same-player" };
  if (!a.spot || a.spot !== b.spot) return { ok: false, reason: "not-together" };
  const cooled = lastStakedDay === undefined || today - lastStakedDay >= cfg.duel.cooldownDays;
  return { ok: true, stakes: a.faction !== b.faction && cooled };
}

export function goldStake(loserGold: number, cfg: ClanConfig = CLAN): number {
  const { stakeShare, stakeMin, stakeMax } = cfg.duel;
  return Math.min(loserGold, Math.max(stakeMin, Math.min(stakeMax, Math.round(loserGold * stakeShare))));
}

export interface DuelResult {
  gold: number;
  /** Influence for the winner's faction at the duel's neighborhood, if for stakes. */
  influence: number;
}

export function resolveDuel(winner: Pick<Duelist, "gold">, loser: Pick<Duelist, "gold">, stakes: boolean, cfg: ClanConfig = CLAN): DuelResult {
  if (!stakes) return { gold: 0, influence: 0 };
  const gold = cfg.duel.stake === "gold" ? goldStake(loser.gold, cfg) : 0;
  winner.gold += gold;
  loser.gold -= gold;
  return { gold, influence: cfg.duel.influence };
}
