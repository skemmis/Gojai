import type { FactionId } from "./factions.ts";

/**
 * Leaderboards. Every board is a count the server already trusts (verified
 * check-ins, finished runs, boss and duel results), kept per player in three
 * windows: this week, this season, all time. Weekly boards give newcomers a
 * board they can top; season boards are the bragging rights; all time is
 * only for the deepest run (the hall).
 *
 * Boards never show where or when anyone played: only totals. The top of
 * each neighborhood's season contributors becomes its Keeper, a title.
 */
export type Metric = "spots" | "depth" | "influence" | "bossDamage" | "duelWins" | "catches";
export type Window = "week" | "season" | "all";

export interface Stats {
  /** Spots played (first visit to a spot each day). */
  spots: number;
  /** Deepest run, in floors cleared. */
  depth: number;
  /** Influence earned for your faction, after catch-up and diminishing returns. */
  influence: number;
  bossDamage: number;
  duelWins: number;
  duelLosses: number;
  /** Enemies caught with an exact kill. */
  catches: number;
  /** Influence by neighborhood, for Keepers. */
  byGround: Record<string, number>;
}

export interface Board {
  id: string;
  name: string;
  metric: Metric;
  window: Window;
  /** How the number reads next to a name. */
  unit: string;
}

export const BOARDS: Board[] = [
  { id: "walkers-week", name: "Walkers", metric: "spots", window: "week", unit: "spots" },
  { id: "deepest-season", name: "Deepest Descent", metric: "depth", window: "season", unit: "floors" },
  { id: "offerings-season", name: "Offerings", metric: "influence", window: "season", unit: "influence" },
  { id: "slayers-season", name: "Slayers", metric: "bossDamage", window: "season", unit: "boss damage" },
  { id: "duelists-season", name: "Duelists", metric: "duelWins", window: "season", unit: "wins" },
  { id: "catchers-season", name: "Collectors", metric: "catches", window: "season", unit: "caught" },
  { id: "hall", name: "The Hall", metric: "depth", window: "all", unit: "floors" },
];

export type Happening =
  | { kind: "spot" }
  | { kind: "runEnd"; floorsCleared: number; catches: number }
  | { kind: "influence"; ground: string; amount: number }
  | { kind: "boss"; damage: number }
  | { kind: "duel"; won: boolean };

export interface Player {
  id: string;
  name: string;
  faction: FactionId;
  friends: string[];
}

export interface Book {
  players: Record<string, Player>;
  stats: Record<string, Record<Window, Stats>>;
}

export const emptyStats = (): Stats => ({
  spots: 0, depth: 0, influence: 0, bossDamage: 0, duelWins: 0, duelLosses: 0, catches: 0, byGround: {},
});

export const newBook = (): Book => ({ players: {}, stats: {} });

export function addPlayer(b: Book, p: Player): void {
  b.players[p.id] = p;
  b.stats[p.id] ??= { week: emptyStats(), season: emptyStats(), all: emptyStats() };
}

/** Count something a player did, in every window at once. */
export function record(b: Book, player: string, h: Happening): void {
  const w = b.stats[player];
  if (!w) return;
  for (const s of [w.week, w.season, w.all]) {
    switch (h.kind) {
      case "spot":
        s.spots++;
        break;
      case "runEnd":
        s.depth = Math.max(s.depth, h.floorsCleared);
        s.catches += h.catches;
        break;
      case "influence":
        s.influence += h.amount;
        s.byGround[h.ground] = (s.byGround[h.ground] ?? 0) + h.amount;
        break;
      case "boss":
        s.bossDamage += h.damage;
        break;
      case "duel":
        if (h.won) s.duelWins++;
        else s.duelLosses++;
        break;
    }
  }
}

/** Monday 4 AM: weekly boards start over. */
export function rollWeek(b: Book): void {
  for (const w of Object.values(b.stats)) w.week = emptyStats();
}

/** Full moon: season boards start over (the week too). */
export function rollSeason(b: Book): void {
  for (const w of Object.values(b.stats)) {
    w.season = emptyStats();
    w.week = emptyStats();
  }
}

export type Scope = { kind: "everyone" } | { kind: "faction"; faction: FactionId } | { kind: "friends"; of: string };

export interface Row {
  rank: number;
  player: string;
  name: string;
  faction: FactionId;
  value: number;
}

export interface Standing {
  top: Row[];
  /** The viewer's row and the two either side, if they're below the top. */
  around: Row[];
  you: Row | null;
}

function value(s: Stats, m: Metric): number {
  return m === "influence" || m === "bossDamage" ? Math.round(s[m]) : s[m];
}

/**
 * A board as one viewer sees it: the top `n`, plus where they stand.
 * Players with nothing to show aren't listed. Ties share a rank; duel ties
 * go to fewer losses, other ties to whoever joined first (player order).
 */
export function standing(b: Book, board: Board, scope: Scope, viewer: string, n = 10): Standing {
  const inScope = (p: Player) =>
    scope.kind === "everyone" ||
    (scope.kind === "faction" && p.faction === scope.faction) ||
    (scope.kind === "friends" && (p.id === scope.of || b.players[scope.of]?.friends.includes(p.id)));
  const entries = Object.values(b.players)
    .filter(inScope)
    .map((p) => ({ p, s: b.stats[p.id][board.window] }))
    .filter((e) => value(e.s, board.metric) > 0)
    .sort((x, y) => {
      const d = value(y.s, board.metric) - value(x.s, board.metric);
      if (d) return d;
      return board.metric === "duelWins" ? x.s.duelLosses - y.s.duelLosses : 0;
    });
  const rows: Row[] = [];
  entries.forEach((e, i) => {
    const v = value(e.s, board.metric);
    const prev = rows[i - 1];
    const tied = prev && prev.value === v && (board.metric !== "duelWins" || entries[i - 1].s.duelLosses === e.s.duelLosses);
    rows.push({ rank: tied ? prev.rank : i + 1, player: e.p.id, name: e.p.name, faction: e.p.faction, value: v });
  });
  const at = rows.findIndex((r) => r.player === viewer);
  return {
    top: rows.slice(0, n),
    around: at >= n ? rows.slice(Math.max(n, at - 2), at + 3) : [],
    you: at >= 0 ? rows[at] : null,
  };
}

/**
 * Keepers: for each neighborhood, the player who gave the most influence
 * there this season, from the faction holding it now. Nobody keeps ground
 * their faction doesn't hold.
 */
export function keepers(b: Book, holders: Record<string, FactionId | null>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [ground, holder] of Object.entries(holders)) {
    let best: string | null = null;
    let top = 0;
    for (const p of Object.values(b.players)) {
      if (p.faction !== holder) continue;
      const v = b.stats[p.id].season.byGround[ground] ?? 0;
      if (v > top) [best, top] = [p.id, v];
    }
    out[ground] = best;
  }
  return out;
}
