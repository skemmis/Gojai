import { CLAN, type ClanConfig } from "./config.ts";
import { FACTION_IDS, perFaction, type FactionId, type PerFaction } from "./factions.ts";

/**
 * Territory: every neighborhood keeps an influence count per faction. Players
 * add influence by walking, by dying (the offering), at group bosses and in
 * duels. Once a night `endDay` settles who holds what, scores the day and
 * lets influence fade. Pure data in, data out, so the server, the app and the
 * clan lab share it.
 */
export type Source = "walk" | "offering" | "boss" | "duel";

export interface Ground {
  id: string;
  influence: PerFaction<number>;
  holder: FactionId | null;
}

export interface Territory {
  day: number;
  grounds: Record<string, Ground>;
  /** Neighborhoods each faction held at the last `endDay` (drives catch-up). */
  held: PerFaction<number>;
  /** Neighborhood-days held this season: the season score. */
  score: PerFaction<number>;
  /** Today's earnings per `player|ground`, for diminishing returns and Walk On. */
  earned: Record<string, number>;
  /** Everything credited this season, by faction and source (for the lab). */
  ledger: PerFaction<Record<Source, number>>;
}

export interface Award {
  player: string;
  faction: FactionId;
  ground: string;
  source: Source;
  amount: number;
}

const zeroSources = (): Record<Source, number> => ({ walk: 0, offering: 0, boss: 0, duel: 0 });

export function newTerritory(groundIds: readonly string[]): Territory {
  const grounds: Record<string, Ground> = {};
  for (const id of groundIds) grounds[id] = { id, influence: perFaction(() => 0), holder: null };
  return { day: 0, grounds, held: perFaction(() => 0), score: perFaction(() => 0), earned: {}, ledger: perFaction(zeroSources) };
}

/** Cumulative value of `x` raw influence after diminishing returns. */
export function diminished(x: number, knee: number): number {
  if (x <= knee) return x;
  if (x <= 3 * knee) return knee + (x - knee) * 0.5;
  return 2 * knee + (x - 3 * knee) * 0.25;
}

/** Earnings multiplier for a faction given how much of the map it holds. */
export function catchUp(t: Territory, faction: FactionId, cfg: ClanConfig = CLAN): number {
  const total = Object.keys(t.grounds).length;
  const share = total ? t.held[faction] / total : 0;
  const { k, min, max } = cfg.underdog;
  return Math.min(max, Math.max(min, 1 + k * (1 / FACTION_IDS.length - share)));
}

/** Credit influence. Returns what actually landed after perks, catch-up and diminishing returns. */
export function award(t: Territory, a: Award, cfg: ClanConfig = CLAN): number {
  const g = t.grounds[a.ground];
  if (!g || a.amount <= 0) return 0;
  const key = `${a.player}|${a.ground}`;
  const prior = t.earned[key];
  let amt = a.amount;
  if (a.source === "walk" && prior === undefined && a.faction === "pathless") amt += cfg.walkOnBonus;
  if (a.faction === "readymades" && g.holder && g.holder !== a.faction) amt *= cfg.readymade;
  amt *= catchUp(t, a.faction, cfg);
  if (a.source === "walk" || a.source === "offering") {
    const before = prior ?? 0;
    t.earned[key] = before + amt;
    amt = diminished(before + amt, cfg.knee) - diminished(before, cfg.knee);
  }
  g.influence[a.faction] += amt;
  t.ledger[a.faction][a.source] += amt;
  return amt;
}

function ranked(g: Ground): [FactionId, number][] {
  return FACTION_IDS.map((f) => [f, g.influence[f]] as [FactionId, number]).sort((a, b) => b[1] - a[1]);
}

/** Who should hold this ground now, given the hysteresis rules. */
export function settle(g: Ground, cfg: ClanConfig = CLAN): FactionId | null {
  const [[lead, top], [, second]] = ranked(g);
  let holder = g.holder;
  if (holder && g.influence[holder] < cfg.minHold) holder = null;
  if (holder) {
    if (lead !== holder && top >= cfg.flipMargin * g.influence[holder]) return lead;
    return holder;
  }
  if (top >= cfg.minHold && top >= cfg.claimMargin * second) return lead;
  return null;
}

export interface DayReport {
  day: number;
  flips: { ground: string; from: FactionId | null; to: FactionId | null }[];
  held: PerFaction<number>;
}

/** Nightly tick: settle holders, score the day, fade influence. */
export function endDay(t: Territory, cfg: ClanConfig = CLAN): DayReport {
  const flips: DayReport["flips"] = [];
  const held = perFaction(() => 0);
  for (const g of Object.values(t.grounds)) {
    const next = settle(g, cfg);
    if (next !== g.holder) flips.push({ ground: g.id, from: g.holder, to: next });
    g.holder = next;
    if (next) {
      held[next]++;
      t.score[next]++;
    }
    for (const f of FACTION_IDS) g.influence[f] *= 1 - (f === "order" && g.holder === "order" ? cfg.lodgeDecay : cfg.decay);
  }
  t.held = held;
  t.earned = {};
  const report = { day: t.day, flips, held: { ...held } };
  t.day++;
  return report;
}

/** New season: scores reset, most influence fades, holders must re-earn it. */
export function startSeason(t: Territory, cfg: ClanConfig = CLAN): void {
  for (const g of Object.values(t.grounds)) {
    for (const f of FACTION_IDS) g.influence[f] *= cfg.season.carryOver;
    g.holder = settle(g, cfg);
  }
  t.score = perFaction(() => 0);
  t.ledger = perFaction(zeroSources);
}
