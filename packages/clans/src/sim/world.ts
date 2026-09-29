import { makeRng, next, pick, type Rng } from "@gojai/core";
import { NEIGHBORHOODS, SPOTS, EVENTS, neighborhoodOf, windowsBetween, zoned, type LngLat } from "@gojai/map";
import { CLAN, type ClanConfig } from "../config.ts";
import { perFaction, type FactionId, type PerFaction } from "../factions.ts";
import { newTerritory, award, endDay, claimByEvent, type Territory } from "../territory.ts";
import { strength, assignFaction } from "../assign.ts";
import { offering, type Floor } from "../offering.ts";
import { openBoss, joinBoss, hitBoss, resolveBoss } from "../boss.ts";
import { canDuel, resolveDuel } from "../duel.ts";

/**
 * One season of Ojai, simulated. A population of bot players signs up,
 * walks the real neighborhoods and spots from @gojai/map, plays and loses
 * runs, turns up to the real timed events, fights group bosses and duels,
 * and quits. The clan rules are the production ones from this package; the
 * people are made up, with knobs for how skewed they are.
 */

// ── The map, as the bots see it ──────────────────────────────────────────────

const GROUND_IDS = NEIGHBORHOODS.map((n) => n.id);
const DOWNTOWN = new Set(["arcade", "libbey-park", "west-matilija", "north-end", "sarzotti", "trail"]);

const spotsByGround: Record<string, string[]> = Object.fromEntries(GROUND_IDS.map((g) => [g, []]));
const groundOfSpot: Record<string, string> = {};
for (const s of SPOTS) {
  const g = neighborhoodOf(s.at)?.id;
  if (!g) continue;
  spotsByGround[g].push(s.id);
  groundOfSpot[s.id] = g;
}

/** Neighborhoods are adjacent if their borders come within ~60 m. */
function buildAdjacency(): Record<string, string[]> {
  const pts = NEIGHBORHOODS.map((n) => n.polygons.flatMap((p) => p[0]));
  const near = (a: LngLat[], b: LngLat[]) => {
    for (const p of a) for (const q of b) if (Math.hypot((p[0] - q[0]) * 91_800, (p[1] - q[1]) * 111_320) < 60) return true;
    return false;
  };
  const adj: Record<string, string[]> = Object.fromEntries(GROUND_IDS.map((g) => [g, []]));
  for (let i = 0; i < GROUND_IDS.length; i++)
    for (let j = i + 1; j < GROUND_IDS.length; j++)
      if (near(pts[i], pts[j])) {
        adj[GROUND_IDS[i]].push(GROUND_IDS[j]);
        adj[GROUND_IDS[j]].push(GROUND_IDS[i]);
      }
  return adj;
}
export const ADJACENT = buildAdjacency();
export { GROUND_IDS, spotsByGround };

// ── People ───────────────────────────────────────────────────────────────────

type Archetype = "casual" | "regular" | "devoted";

const ARCH: Record<Archetype, { share: number; playP: number; spots: number; attend: number; quitP: number }> = {
  casual: { share: 0.5, playP: 0.25, spots: 3, attend: 0.04, quitP: 0.04 },
  regular: { share: 0.35, playP: 0.55, spots: 6, attend: 0.12, quitP: 0.02 },
  devoted: { share: 0.15, playP: 0.9, spots: 12, attend: 0.3, quitP: 0.008 },
};

/** How much each kind of event draws a crowd, relative to a player's `attend`. */
const EVENT_PULL: Record<string, number> = { boss: 0.6, market: 1, raid: 2, rare: 0.8 };

interface Player {
  id: string;
  faction: FactionId;
  arch: Archetype;
  skill: number;
  home: string;
  joined: number;
  quit: boolean;
  gold: number;
  /** Spots played per day. */
  active: number[];
  floors: Floor[];
  depth: number;
}

export interface Scenario {
  name: string;
  note: string;
  /** Players at launch, and new signups per day. */
  launch: number;
  perDay: number;
  /** "activity" (production rule) or "count" (naive head count). */
  assigner: "activity" | "count";
  /** Friends sign up together and ask for the inviter's faction. */
  invites: boolean;
  /** The first N launch players are devoted friends who all ask for the same faction. */
  clique: number;
  /** Give the clique its faction regardless of the invite rule (a stress test). */
  forceClique?: boolean;
  /** A won event takes its neighborhood outright (default true). */
  eventsFlip?: boolean;
  cfg: ClanConfig;
}

export interface SeasonResult {
  score: PerFaction<number>;
  winner: FactionId;
  /** Largest faction's share of neighborhood-days held. */
  dominance: number;
  /** Share of neighborhood-days nobody held. */
  neutral: number;
  flips: number;
  leadChanges: number;
  /** Neighborhoods held by one faction for 90%+ of the season. */
  locked: number;
  lockedIds: string[];
  /** Share of all play (spots played) by faction at season end, last 14 days. */
  playShare: PerFaction<number>;
  ledger: Territory["ledger"];
  /** Held counts per day, for the timeline. */
  heldByDay: PerFaction<number>[];
  players: number;
  bosses: number;
  bossKills: number;
  duels: number;
}

function gauss(r: Rng): number {
  return Math.sqrt(-2 * Math.log(1 - next(r))) * Math.cos(2 * Math.PI * next(r));
}

function rollArch(r: Rng): Archetype {
  const x = next(r);
  return x < ARCH.casual.share ? "casual" : x < ARCH.casual.share + ARCH.regular.share ? "regular" : "devoted";
}

/** Floors a run lasts: median ~15 like the combat lab's greedy bot, scaled by skill. */
function rollDepth(r: Rng, skill: number): number {
  return Math.max(2, Math.round(15 * skill * Math.exp(0.5 * gauss(r))));
}

function homeGround(r: Rng): string {
  // Weighted by spot count: people live where the streets are.
  const total = GROUND_IDS.reduce((s, g) => s + spotsByGround[g].length, 0);
  let x = next(r) * total;
  for (const g of GROUND_IDS) if ((x -= spotsByGround[g].length) < 0) return g;
  return GROUND_IDS[0];
}

const SEASON_START = zoned(2026, 10, 1, 4);

export function runSeason(sc: Scenario, seed: number): SeasonResult {
  const cfg = sc.cfg;
  const r = makeRng(seed);
  const days = cfg.season.days;
  const t = newTerritory(GROUND_IDS);
  const players: Player[] = [];
  const lastDuel = new Map<string, number>();
  let day = 0;
  let bosses = 0;
  let bossKills = 0;
  let duels = 0;

  const activity = (p: Player) => {
    let n = 0;
    for (let d = Math.max(0, day - cfg.assign.lookbackDays); d < day; d++) n += p.active[d] ?? 0;
    return n;
  };
  const counts = () => {
    const s = perFaction(() => 0);
    for (const p of players) s[p.faction]++;
    return s;
  };

  const signUp = (invitedTo?: FactionId, force?: { faction?: FactionId; arch: Archetype }): Player => {
    const s =
      sc.assigner === "count"
        ? counts()
        : strength(
            players.map((p) => ({ faction: p.faction, plays: activity(p), age: day - p.joined })),
            cfg,
          );
    const faction = force?.faction ?? assignFaction(s, next(r), sc.invites ? invitedTo : undefined, cfg);
    const skill = Math.max(0.4, 1 + 0.25 * gauss(r));
    const p: Player = {
      id: `p${players.length}`,
      faction,
      arch: force?.arch ?? rollArch(r),
      skill,
      home: homeGround(r),
      joined: day,
      quit: false,
      gold: 50,
      active: [],
      floors: [],
      depth: rollDepth(r, skill),
    };
    players.push(p);
    return p;
  };

  /** Friends arrive together; the first gets assigned, the rest ask to follow. Returns how many joined. */
  const signUpGroup = (max: number) => {
    const size = Math.min(max, pick(r, [1, 1, 1, 2, 2, 3, 4, 5]));
    const first = signUp();
    for (let i = 1; i < size; i++) signUp(first.faction);
    return size;
  };

  const credit = (p: Player, ground: string, source: "walk" | "offering" | "boss" | "duel", amount: number) =>
    award(t, { player: p.id, faction: p.faction, ground, source, amount }, cfg);

  const playSpot = (p: Player, spot: string) => {
    const g = groundOfSpot[spot];
    p.active[day] = (p.active[day] ?? 0) + 1;
    credit(p, g, "walk", cfg.walk);
    const n = p.floors.length + 1;
    const x = next(r);
    const kind: Floor["kind"] = n % 8 === 0 ? "boss" : x < 0.1 ? "elite" : x < 0.22 ? "rest" : x < 0.3 ? "shop" : x < 0.4 ? "mystery" : "fight";
    const dies = n >= p.depth;
    p.floors.push({ ground: g, kind, cleared: !dies });
    p.gold += dies ? 0 : kind === "elite" ? 25 : kind === "boss" ? 60 : kind === "fight" ? 12 : 0;
    if (dies) {
      for (const o of offering(p.floors, cfg)) credit(p, o.ground, "offering", o.amount);
      p.floors = [];
      p.gold = 50;
      p.depth = rollDepth(r, p.skill);
    }
  };

  const walk = (p: Player, n: number) => {
    let g = p.home;
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) {
      if (next(r) > 0.6) {
        const opts = ADJACENT[g].flatMap((a) => (DOWNTOWN.has(a) ? [a, a] : [a]));
        if (opts.length) g = pick(r, opts);
      }
      const fresh = spotsByGround[g].filter((s) => !seen.has(s));
      if (!fresh.length) continue;
      const s = pick(r, fresh);
      seen.add(s);
      playSpot(p, s);
    }
  };

  const deckPower = (p: Player) => p.skill * (1 + p.floors.length / 15);

  // Launch day.
  for (let i = 0; i < sc.clique; i++)
    signUp(i && sc.invites ? "order" : undefined, { faction: sc.forceClique || !i ? "order" : undefined, arch: "devoted" });
  while (players.length < sc.launch) signUpGroup(sc.launch - players.length);

  const windows = windowsBetween(SEASON_START, new Date(SEASON_START.getTime() + days * 864e5), EVENTS);
  const heldByDay: PerFaction<number>[] = [];
  let flips = 0;
  let leadChanges = 0;
  let leader: FactionId | null = null;
  const holderDays: Record<string, PerFaction<number>> = Object.fromEntries(GROUND_IDS.map((g) => [g, perFaction(() => 0)]));

  for (day = 0; day < days; day++) {
    if (day > 0) {
      const arrivals = Math.floor(sc.perDay) + (next(r) < sc.perDay % 1 ? 1 : 0);
      for (let i = 0; i < arrivals; ) i += signUpGroup(arrivals - i);
    }
    const live = players.filter((p) => !p.quit);

    // Everyday walking.
    for (const p of live) {
      const a = ARCH[p.arch];
      if (next(r) < a.playP) {
        walk(p, Math.max(1, Math.round(a.spots * (0.5 + next(r)))));
      }
    }

    // Timed events today: a group boss at an event spot, and duels in the crowd.
    const dayStart = SEASON_START.getTime() + day * 864e5;
    for (const w of windows) {
      if (w.start.getTime() < dayStart || w.start.getTime() >= dayStart + 864e5) continue;
      const spot = pick(r, w.event.spots);
      const ground = groundOfSpot[spot];
      if (!ground) continue;
      const pull = EVENT_PULL[w.event.kind] ?? 1;
      const crowd = live.filter((p) => next(r) < ARCH[p.arch].attend * pull * (p.home === ground || ADJACENT[ground].includes(p.home) ? 1.5 : 1));
      if (!crowd.length) continue;
      for (const p of crowd) {
        playSpot(p, spot);
      }
      if (w.event.kind !== "rare") {
        bosses++;
        const b = openBoss(w.event.id, ground, cfg);
        for (const p of crowd) joinBoss(b, p.id, p.faction, cfg);
        // Everyone gets one fight; order of arrival is random.
        for (const p of [...crowd].sort(() => next(r) - 0.5)) hitBoss(b, p.id, 70 * deckPower(p) * (0.7 + 0.6 * next(r)));
        const res = resolveBoss(b, cfg);
        if (res.killed) bossKills++;
        for (const f of cfg.factions) if (res.influence[f]) award(t, { player: `boss:${w.event.id}:${day}:${f}`, faction: f, ground, source: "boss", amount: res.influence[f] }, cfg);
        if (res.top && sc.eventsFlip !== false) claimByEvent(t, ground, res.top, cfg);
        for (const p of crowd) p.gold += res.gold[p.id] ?? 0;
      }
      // Some of the crowd duels someone from another faction.
      for (const a of crowd) {
        if (next(r) > 0.3) continue;
        const foes = crowd.filter((b) => b.faction !== a.faction);
        if (!foes.length) continue;
        const b = pick(r, foes);
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        const check = canDuel({ ...a, spot }, { ...b, spot }, day, lastDuel.get(key), cfg);
        if (!check.ok || !check.stakes) continue;
        lastDuel.set(key, day);
        duels++;
        const pa = deckPower(a) / (deckPower(a) + deckPower(b));
        const [win, lose] = next(r) < pa ? [a, b] : [b, a];
        const res = resolveDuel(win, lose, true, cfg);
        credit(win, ground, "duel", res.influence);
      }
    }

    const rep = endDay(t, cfg);
    flips += rep.flips.length;
    heldByDay.push(rep.held);
    for (const g of GROUND_IDS) {
      const h = t.grounds[g].holder;
      if (h) holderDays[g][h]++;
    }
    const top = Math.max(...cfg.factions.map((f) => rep.held[f]));
    const leaders = cfg.factions.filter((f) => rep.held[f] === top);
    if (top > 0 && leaders.length === 1 && leaders[0] !== leader) {
      if (leader) leadChanges++;
      leader = leaders[0];
    }

    for (const p of live) if (next(r) < ARCH[p.arch].quitP) p.quit = true;
  }

  const lockedIds = GROUND_IDS.filter((g) => Math.max(...cfg.factions.map((f) => holderDays[g][f])) >= 0.9 * days);
  const totalHeld = cfg.factions.reduce((s, f) => s + t.score[f], 0);
  const plays = perFaction(() => 0);
  for (const p of players) for (const n of p.active.slice(days - 14)) plays[p.faction] += n ?? 0;
  const totalPlays = cfg.factions.reduce((s, f) => s + plays[f], 0) || 1;
  const winner = cfg.factions.reduce((a, f) => (t.score[f] > t.score[a] ? f : a));
  return {
    score: { ...t.score },
    winner,
    dominance: totalHeld ? t.score[winner] / (GROUND_IDS.length * days) : 0,
    neutral: 1 - totalHeld / (GROUND_IDS.length * days),
    flips,
    leadChanges,
    locked: lockedIds.length,
    lockedIds,
    playShare: perFaction((f) => plays[f] / totalPlays),
    ledger: t.ledger,
    heldByDay,
    players: players.length,
    bosses,
    bossKills,
    duels,
  };
}

export const BASE: Omit<Scenario, "name" | "note"> = {
  launch: 120,
  perDay: 6,
  assigner: "activity",
  invites: true,
  clique: 0,
  cfg: CLAN,
};
