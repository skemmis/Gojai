import { makeRng, next, pick, type Rng } from "@gojai/core";
import { NEIGHBORHOODS, SPOTS, neighborhoodOf, spotById, windowsBetween, type Find } from "@gojai/map";
import {
  CLAN,
  FACTION_IDS,
  addPlayer,
  assignFaction,
  award,
  claimByEvent,
  endDay,
  hitBoss,
  joinBoss,
  newBook,
  newTerritory,
  offering,
  openBoss,
  perFaction,
  record,
  resolveBoss,
  rollSeason,
  rollWeek,
  startSeason,
  strength,
  type Book,
  type FactionId,
  type Floor,
  type Profile,
  type Territory,
} from "@gojai/clans";

/**
 * The clan layer, played locally until there's a server. A made-up town of
 * walkers (bots) plays the real neighborhoods, spots and event calendar with
 * the production rules from @gojai/clans, day by day since the last full
 * moon, so the boards, the territory and the faction race have life in them.
 * The player's own walks, runs and offerings go through the same rules.
 *
 * Everything is plain data so it can sit in localStorage; the server will
 * replace this file, not the rules.
 */

export const ME = "me";

/** Portraits we have art for (gojai-art/portraits/v4, apps/play/src/assets/portrait-<seed>.webp). */
export const PORTRAIT_SEEDS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
export const PORTRAIT_NAMES: Record<number, string> = {
  13: "The Poet", 14: "The Rider", 15: "The Hermit", 16: "The Rancher", 17: "The Birdwatcher", 18: "The Stonemason",
  19: "The Painter", 20: "The Hermit", 21: "The Surfer", 22: "The Stargazer", 23: "The Potter", 24: "The Wanderer",
};

const NAMES = [
  "Marguerite", "Tall Oscar", "Juniper", "Silas", "Elara", "Fenn", "Old Tom", "Rosalind", "Wren", "Ignatius", "Beatrix", "Dov",
  "Hollis", "Sage", "Augustin", "Clementine", "Moss", "Vera", "Otis", "Linnea", "Bram", "Dolores", "Ezra", "Iris", "Lupe",
  "Caspian", "Nell", "Rafferty", "Opal", "Teodoro", "Winnie", "Arlo", "Hazel", "Quill", "Mireille", "Cyrus", "Ada", "Jasper",
  "Pilar", "Emmett", "Soledad", "Barnaby", "Theda", "Kit", "Anselm", "Delphine", "Rufus", "Ottoline", "Hank", "Esme", "Lorcan",
  "Ingrid", "Mateo", "Philippa", "Gus", "Seraphine", "Reuben", "Maude", "Ansel", "Tamsin", "Ignacio", "Blanche", "Cormac",
];

interface Bot {
  id: string;
  faction: FactionId;
  home: string;
  /** Chance to play on a given day, and spots walked when they do. */
  playP: number;
  spots: number;
  /** Floors a run tends to last. */
  depth: number;
  portrait: number;
  /** Floors walked since the last run ended. */
  walked: Floor[];
}

export interface Town {
  version: 1;
  seed: number;
  seasonStart: number;
  /** Days of this season already settled (the nightly tick has run for day < settled). */
  settled: number;
  week: number;
  bots: Bot[];
  territory: Territory;
  book: Book;
  /** Null until the player has picked a face and met their faction. */
  me: Profile | null;
  /** The player's floors this run, for the offering when it ends. */
  floors: Floor[];
  /** What the player's last finished run gave, for the Run over screen. */
  lastOffering: { ground: string; amount: number }[] | null;
  /** Neighborhoods that changed hands at the last nightly tick. */
  lastFlips: { ground: string; from: FactionId | null; to: FactionId | null }[];
  /** Portrait seed per player id (bots and me). */
  portraits: Record<string, number>;
}

// ── Time: seasons run full moon to full moon, days turn at 4 AM ─────────────

const DAY = 864e5;
const SYNODIC = 29.530588853 * DAY;
/** A known new moon (2000-01-06 18:14 UTC); the full moon is half a cycle on. */
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const FULL_MOON = NEW_MOON + SYNODIC / 2;
const TURN_HOUR = 4;

/** The full moon on or before `t`. */
export function lastFullMoon(t: number): number {
  return FULL_MOON + Math.floor((t - FULL_MOON) / SYNODIC) * SYNODIC;
}
/** Moon phase at `t`, 0 = new, 0.5 = full. */
export const moonPhase = (t: number) => (((t - NEW_MOON) / SYNODIC) % 1 + 1) % 1;

const MOON_NAMES = ["Wolf", "Snow", "Worm", "Pink", "Flower", "Strawberry", "Buck", "Sturgeon", "Harvest", "Hunter's", "Beaver", "Cold"];
/** "The Season of the Hunter's Moon": named for the full moon that opened it. */
export const seasonName = (start: number) => `The Season of the ${MOON_NAMES[new Date(start).getUTCMonth()]} Moon`;
export const seasonDays = () => Math.round(SYNODIC / DAY);

/** Season day of `t` (0-based), counting days that turn at 4 AM. */
export function dayOf(town: Town, t: number): number {
  return Math.floor((t - town.seasonStart - TURN_HOUR * 36e5) / DAY);
}
const weekOf = (t: number) => Math.floor((t - Date.UTC(2026, 0, 5, 12)) / (7 * DAY)); // Mondays, Ojai 4 AM

// ── The map, as the town walks it ────────────────────────────────────────────

const GROUNDS = NEIGHBORHOODS.map((n) => n.id);
const spotsIn: Record<string, string[]> = Object.fromEntries(GROUNDS.map((g) => [g, [] as string[]]));
for (const s of SPOTS) {
  const g = neighborhoodOf(s.at)?.id;
  if (g) spotsIn[g].push(s.id);
}
const weightedGround = (r: Rng) => {
  const total = GROUNDS.reduce((s, g) => s + spotsIn[g].length, 0);
  let x = next(r) * total;
  for (const g of GROUNDS) if ((x -= spotsIn[g].length) < 0) return g;
  return GROUNDS[0];
};
export const groundName = (id: string) => NEIGHBORHOODS.find((n) => n.id === id)?.name ?? id;
export const groundOfSpot = (spotId: string) => {
  const s = spotById(spotId);
  return s ? neighborhoodOf(s.at)?.id : undefined;
};

// ── Building and advancing the town ──────────────────────────────────────────

const rngFor = (town: Town, salt: number) => makeRng((town.seed * 7919 + salt * 104729) >>> 0);

export function newTown(seed: number, now = Date.now()): Town {
  const r = makeRng(seed);
  const start = lastFullMoon(now);
  const town: Town = {
    version: 1,
    seed,
    // Begin a season early so the map isn't empty on the first day of this one.
    seasonStart: lastFullMoon(start - DAY),
    settled: 0,
    week: weekOf(now),
    bots: [],
    territory: newTerritory(GROUNDS),
    book: newBook(),
    me: null,
    floors: [],
    lastOffering: null,
    lastFlips: [],
    portraits: {},
  };
  NAMES.forEach((name, i) => {
    const x = next(r);
    const kind = x < 0.5 ? { playP: 0.25, spots: 3 } : x < 0.85 ? { playP: 0.55, spots: 6 } : { playP: 0.9, spots: 11 };
    const bot: Bot = {
      id: `b${i}`,
      faction: FACTION_IDS[i % 2],
      home: weightedGround(r),
      ...kind,
      depth: Math.max(3, Math.round(15 * (0.7 + next(r) * 0.6))),
      portrait: pick(r, PORTRAIT_SEEDS),
      walked: [],
    };
    town.bots.push(bot);
    town.portraits[bot.id] = bot.portrait;
    addPlayer(town.book, { id: bot.id, name, faction: bot.faction, friends: [] });
  });
  catchUp(town, now);
  return town;
}

/** Run the nightly ticks the town has missed, and roll weeks and seasons over. */
export function catchUp(town: Town, now = Date.now()): boolean {
  let changed = false;
  for (;;) {
    const nextSeason = lastFullMoon(town.seasonStart) + SYNODIC;
    const seasonOver = now >= nextSeason + TURN_HOUR * 36e5;
    const today = seasonOver ? Math.round((nextSeason - town.seasonStart) / DAY) : dayOf(town, now);
    while (town.settled < today) {
      simulateDay(town, town.settled);
      town.lastFlips = endDay(town.territory).flips;
      town.settled++;
      changed = true;
    }
    if (!seasonOver) break;
    startSeason(town.territory);
    rollSeason(town.book);
    town.seasonStart = nextSeason;
    town.settled = 0;
    changed = true;
  }
  const w = weekOf(now);
  if (w !== town.week) {
    rollWeek(town.book);
    town.week = w;
    changed = true;
  }
  return changed;
}

/** One day of the made-up town: walks, runs that end, and the day's live events. */
function simulateDay(town: Town, day: number) {
  const r = rngFor(town, town.seasonStart / DAY + day);
  const t = town.territory;
  for (const b of town.bots) {
    if (next(r) > b.playP) continue;
    const n = Math.max(1, Math.round(b.spots * (0.5 + next(r))));
    for (let i = 0; i < n; i++) {
      const ground = next(r) < 0.65 ? b.home : weightedGround(r);
      const got = award(t, { player: b.id, faction: b.faction, ground, source: "walk", amount: CLAN.walk });
      record(town.book, b.id, { kind: "spot" });
      if (got) record(town.book, b.id, { kind: "influence", ground, amount: got });
      const x = next(r);
      b.walked.push({ ground, kind: x < 0.12 ? "elite" : x < 0.8 ? "fight" : "rest", cleared: true });
      // A run ends somewhere around the bot's usual depth.
      if (b.walked.length >= b.depth * (0.5 + next(r))) {
        b.walked[b.walked.length - 1].cleared = false;
        for (const o of offering(b.walked)) {
          const g = award(t, { player: b.id, faction: b.faction, ground: o.ground, source: "offering", amount: o.amount });
          if (g) record(town.book, b.id, { kind: "influence", ground: o.ground, amount: g });
        }
        record(town.book, b.id, { kind: "runEnd", floorsCleared: b.walked.length - 1, catches: next(r) < 0.3 ? 1 : 0 });
        b.walked = [];
      }
    }
  }
  // Live events that happened today: a group boss at the event spot; top damage takes the ground.
  const from = new Date(town.seasonStart + day * DAY + TURN_HOUR * 36e5);
  for (const w of windowsBetween(from, new Date(from.getTime() + DAY))) {
    if (w.start < from) continue;
    const ground = w.event.spots.map(groundOfSpot).find(Boolean);
    if (!ground) continue;
    const boss = openBoss(w.event.id, ground);
    const crowd = town.bots.filter(() => next(r) < 0.18);
    for (const b of crowd) joinBoss(boss, b.id, b.faction);
    for (const b of crowd) {
      const dealt = hitBoss(boss, b.id, Math.round(20 + next(r) * 60));
      if (dealt) record(town.book, b.id, { kind: "boss", damage: dealt });
    }
    const res = resolveBoss(boss);
    for (const f of FACTION_IDS) if (res.influence[f]) award(t, { player: "event", faction: f, ground, source: "boss", amount: res.influence[f] });
    if (res.top) claimByEvent(t, ground, res.top);
  }
}

// ── The player ──────────────────────────────────────────────────────────────

/** Faces dealt at signup: three we have art for, chosen by the player's seed. */
export function dealFaces(seed: number, n = 3): number[] {
  const r = makeRng(seed);
  const pool = [...PORTRAIT_SEEDS];
  const out: number[] = [];
  while (out.length < n) out.push(pool.splice(Math.floor(next(r) * pool.length), 1)[0]);
  return out;
}

/** The faction a new player would join: the one that walked least lately (assign.ts). */
export function factionFor(town: Town): FactionId {
  const plays = (id: string) => town.book.stats[id]?.season.spots ?? 0;
  const s = strength(town.bots.map((b) => ({ faction: b.faction, plays: plays(b.id), age: 99 })));
  return assignFaction(s, next(rngFor(town, 1)));
}

export function join(town: Town, name: string, portrait: number, dealt: number[]): void {
  const faction = factionFor(town);
  town.me = { id: ME, name: name.trim(), faction, portrait: `gen:${portrait}`, dealt, frame: "plain", title: null, caught: [], kept: [], seasonsWon: 0 };
  town.portraits[ME] = portrait;
  // A few walkers of your side you "came in with", for the Friends board.
  const friends = town.bots.filter((b) => b.faction === faction).slice(0, 4).map((b) => b.id);
  addPlayer(town.book, { id: ME, name: town.me.name, faction, friends });
}

const FLOOR_KIND: Record<Find, Floor["kind"]> = { fight: "fight", elite: "elite", rest: "rest", shop: "shop", mystery: "mystery" };

/** The player opened a spot: a walk for their faction, and a floor of this run. Returns influence that landed. */
export function walked(town: Town, spotId: string, find: Find, boss: boolean): number {
  const me = town.me;
  const ground = groundOfSpot(spotId);
  if (!me || !ground) return 0;
  const got = award(town.territory, { player: ME, faction: me.faction, ground, source: "walk", amount: CLAN.walk });
  record(town.book, ME, { kind: "spot" });
  if (got) record(town.book, ME, { kind: "influence", ground, amount: got });
  town.floors.push({ ground, kind: boss ? "boss" : FLOOR_KIND[find], cleared: false });
  return got;
}

/** The floor in progress was won (or passed). */
export function cleared(town: Town): void {
  const f = town.floors[town.floors.length - 1];
  if (f) f.cleared = true;
}

/** The run ended: the offering pays out to the neighborhoods it walked. */
export function runOver(town: Town, catches: number): { ground: string; amount: number }[] {
  const me = town.me;
  if (!me) return [];
  const out: { ground: string; amount: number }[] = [];
  for (const o of offering(town.floors)) {
    const got = award(town.territory, { player: ME, faction: me.faction, ground: o.ground, source: "offering", amount: o.amount });
    if (got) {
      record(town.book, ME, { kind: "influence", ground: o.ground, amount: got });
      out.push({ ground: o.ground, amount: Math.round(got * 10) / 10 });
    }
  }
  record(town.book, ME, { kind: "runEnd", floorsCleared: town.floors.filter((f) => f.cleared).length, catches });
  town.floors = [];
  town.lastOffering = out.sort((a, b) => b.amount - a.amount);
  return town.lastOffering;
}

export const holders = (town: Town): Record<string, FactionId | null> =>
  Object.fromEntries(Object.values(town.territory.grounds).map((g) => [g.id, g.holder]));

export const influenceIn = (town: Town, ground: string) => town.territory.grounds[ground]?.influence ?? perFaction(() => 0);

// ── Storage ─────────────────────────────────────────────────────────────────

const KEY = "pathless.town";
export function loadTown(): Town | null {
  try {
    const v = localStorage.getItem(KEY);
    const t = v ? (JSON.parse(v) as Town) : null;
    return t?.version === 1 ? t : null;
  } catch {
    return null;
  }
}
export function saveTown(t: Town) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* private window or full storage: the town lives for this visit only */
  }
}
