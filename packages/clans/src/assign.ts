import { CLAN, type ClanConfig } from "./config.ts";
import { FACTION_IDS, perFaction, type FactionId, type PerFaction } from "./factions.ts";

/**
 * Auto-assignment at signup. Head counts lie (most signups stop playing), so
 * a faction's strength is how much its members actually played recently:
 * spots played in the lookback window, with newcomers credited a small prior.
 * (Counting days active instead undercounts the devoted: the clan lab showed
 * a founding clique of 12 daily walkers then won nearly every season.)
 * A new player goes to the weakest faction, unless a friend invited them and
 * the friend's faction is close enough to the weakest.
 */
export interface MemberActivity {
  faction: FactionId;
  /** Spots played in the lookback window. */
  plays: number;
  /** Days since signup. */
  age: number;
}

export function strength(members: Iterable<MemberActivity>, cfg: ClanConfig = CLAN): PerFaction<number> {
  const s = perFaction(() => 0);
  for (const m of members) {
    s[m.faction] += m.age < cfg.assign.lookbackDays ? Math.max(m.plays, cfg.assign.newcomer) : m.plays;
  }
  return s;
}

/** `roll` in [0, 1) breaks ties, so the caller's seeded RNG keeps it reproducible. */
export function assignFaction(
  s: PerFaction<number>,
  roll: number,
  invitedTo?: FactionId,
  cfg: ClanConfig = CLAN,
): FactionId {
  const min = Math.min(...FACTION_IDS.map((f) => s[f]));
  if (invitedTo && s[invitedTo] <= min * (1 + cfg.assign.inviteTolerance) + cfg.assign.newcomer) return invitedTo;
  const weakest = FACTION_IDS.filter((f) => s[f] === min);
  return weakest[Math.floor(roll * weakest.length)];
}
