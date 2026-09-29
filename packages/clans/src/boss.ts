import { CLAN, type ClanConfig } from "./config.ts";
import { FACTION_IDS, perFaction, type FactionId, type PerFaction } from "./factions.ts";

/**
 * Group boss fights at event spots (Pokémon Go gyms, Slay the Spire fights).
 * One shared boss per event window; everyone present fights it with their
 * own current run deck. It never costs run HP and never ends a run. Factions
 * race for damage: influence is split by damage share, the top faction takes
 * a bonus, and everyone who hit it gets gold scaled to their damage.
 *
 * The fight itself (turns, the boss's deck) is the combat engine's job; this
 * module only takes the damage numbers it reports.
 */
export interface BossFight {
  eventId: string;
  ground: string;
  hp: number;
  maxHp: number;
  hits: Record<string, { faction: FactionId; damage: number }>;
}

export function openBoss(eventId: string, ground: string, cfg: ClanConfig = CLAN): BossFight {
  return { eventId, ground, hp: cfg.boss.baseHp, maxHp: cfg.boss.baseHp, hits: {} };
}

/** A player arrives. The boss grows so a crowd still has to work for it. */
export function joinBoss(b: BossFight, player: string, faction: FactionId, cfg: ClanConfig = CLAN): void {
  if (b.hits[player]) return;
  b.hits[player] = { faction, damage: 0 };
  b.hp += cfg.boss.hpPerPlayer;
  b.maxHp += cfg.boss.hpPerPlayer;
}

/** Report damage from a player's fight. Returns what landed (a dead boss takes none). */
export function hitBoss(b: BossFight, player: string, damage: number): number {
  const h = b.hits[player];
  if (!h || b.hp <= 0) return 0;
  const dealt = Math.max(0, Math.min(damage, b.hp));
  b.hp -= dealt;
  h.damage += dealt;
  return dealt;
}

export interface BossResult {
  killed: boolean;
  damage: PerFaction<number>;
  /** Influence each faction earns in the boss's neighborhood. */
  influence: PerFaction<number>;
  top: FactionId | null;
  gold: Record<string, number>;
}

export function resolveBoss(b: BossFight, cfg: ClanConfig = CLAN): BossResult {
  const damage = perFaction(() => 0);
  for (const h of Object.values(b.hits)) damage[h.faction] += h.damage;
  const total = FACTION_IDS.reduce((s, f) => s + damage[f], 0);
  const killed = b.hp <= 0;
  const top = total > 0 ? FACTION_IDS.reduce((a, f) => (damage[f] > damage[a] ? f : a)) : null;
  const influence = perFaction((f) => {
    if (!total || !damage[f]) return 0;
    return cfg.boss.pool * (damage[f] / total) + (f === top ? cfg.boss.topBonus : 0) + (killed ? cfg.boss.killBonus : 0);
  });
  const best = Math.max(0, ...Object.values(b.hits).map((h) => h.damage));
  const gold: Record<string, number> = {};
  for (const [p, h] of Object.entries(b.hits)) {
    if (h.damage > 0) gold[p] = Math.round(cfg.boss.goldBase + (cfg.boss.goldTop * h.damage) / best);
  }
  return { killed, damage, influence, top, gold };
}
