import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CLAN, FACTIONS, FACTION_IDS, newTerritory, award, endDay, settle, diminished, catchUp, startSeason, claimByEvent,
  strength, assignFaction, offering, openBoss, joinBoss, hitBoss, resolveBoss, canDuel, goldStake, resolveDuel,
  type ClanConfig, type Ground,
} from "./index.ts";

const flat = (patch: Partial<ClanConfig> = {}): ClanConfig => ({ ...structuredClone(CLAN), underdog: { k: 0, min: 1, max: 1 }, ...patch });

test("factions in play have lore and ids", () => {
  for (const f of CLAN.factions) assert.ok(FACTIONS[f].motto && FACTIONS[f].history && FACTIONS[f].today);
  for (const f of FACTION_IDS) assert.equal(FACTIONS[f].id, f);
});

test("diminishing returns: full, then half, then a quarter", () => {
  assert.equal(diminished(8, 8), 8);
  assert.equal(diminished(24, 8), 16);
  assert.equal(diminished(28, 8), 17);
});

test("walking credits influence in that neighborhood, the same for every faction", () => {
  const cfg = flat();
  const t = newTerritory(["a"]);
  assert.equal(award(t, { player: "p", faction: "pathless", ground: "a", source: "walk", amount: 1 }, cfg), 1);
  assert.equal(award(t, { player: "q", faction: "order", ground: "a", source: "walk", amount: 1 }, cfg), 1);
  assert.equal(t.grounds.a.influence.pathless, t.grounds.a.influence.order);
});

test("one player alone hits diminishing returns in a neighborhood", () => {
  const cfg = flat();
  const t = newTerritory(["a"]);
  let got = 0;
  for (let i = 0; i < 40; i++) got += award(t, { player: "p", faction: "order", ground: "a", source: "walk", amount: 1 }, cfg);
  assert.equal(got, diminished(40, cfg.knee));
});

test("claiming and flipping need a margin; holders lose ground below the minimum", () => {
  const g: Ground = { id: "a", influence: { order: 20, pathless: 18 }, holder: null };
  assert.equal(settle(g), null, "too close to claim");
  g.influence.pathless = 10;
  assert.equal(settle(g), "order");
  g.holder = "order";
  g.influence.pathless = 22;
  assert.equal(settle(g), "order", "not enough to flip");
  g.influence.pathless = 20 * CLAN.flipMargin;
  assert.equal(settle(g), "pathless");
  const weak = { id: "b", influence: { order: CLAN.minHold - 1, pathless: 0 }, holder: "order" as const };
  assert.equal(settle(weak), null);
});

test("the nightly tick scores the day and fades influence", () => {
  const cfg = flat();
  const t = newTerritory(["a", "b"]);
  t.grounds.a.influence.order = 100;
  t.grounds.b.influence.pathless = 100;
  const rep = endDay(t, cfg);
  assert.deepEqual(rep.held, { order: 1, pathless: 1 });
  assert.equal(rep.flips.length, 2);
  assert.equal(t.score.order, 1);
  assert.ok(Math.abs(t.grounds.a.influence.order - 100 * (1 - cfg.decay)) < 1e-9);
  assert.ok(Math.abs(t.grounds.b.influence.pathless - 100 * (1 - cfg.decay)) < 1e-9);
  startSeason(t, cfg);
  assert.equal(t.score.order, 0);
  assert.ok(t.grounds.a.influence.order < 100 * cfg.season.carryOver);
});

test("catch-up favours the faction holding least", () => {
  const t = newTerritory(["a", "b", "c", "d"]);
  t.held = { order: 3, pathless: 1 };
  assert.ok(catchUp(t, "pathless", CLAN) > 1);
  assert.ok(catchUp(t, "order", CLAN) < 1);
  assert.ok(catchUp(t, "order", CLAN) >= CLAN.underdog.min);
  t.held = { order: 2, pathless: 2 };
  assert.equal(catchUp(t, "order", CLAN), 1, "even split");
});

test("a won event takes its neighborhood outright and keeps it through the night", () => {
  const t = newTerritory(["a"]);
  t.grounds.a.influence.order = 80;
  t.grounds.a.holder = "order";
  claimByEvent(t, "a", "pathless");
  assert.equal(t.grounds.a.holder, "pathless");
  endDay(t);
  assert.equal(t.grounds.a.holder, "pathless");
});

test("assignment goes to the faction that played least; invites honoured only when close", () => {
  const s = strength([
    { faction: "order", plays: 60, age: 30 },
    { faction: "pathless", plays: 0, age: 1 }, // newcomer prior
    { faction: "pathless", plays: 35, age: 30 },
  ]);
  assert.deepEqual(s, { order: 60, pathless: 35 + CLAN.assign.newcomer });
  assert.equal(assignFaction(s, 0.5), "pathless");
  assert.equal(assignFaction(s, 0.5, "order"), "pathless", "order is too far ahead");
  assert.equal(assignFaction({ order: 50, pathless: 45 }, 0.5, "order"), "order", "close enough");
  assert.equal(assignFaction({ order: 0, pathless: 0 }, 0.99), "pathless");
});

test("a run's offering pays where its floors were cleared", () => {
  const o = offering([
    { ground: "a", kind: "fight", cleared: true },
    { ground: "a", kind: "elite", cleared: true },
    { ground: "b", kind: "boss", cleared: true },
    { ground: "c", kind: "fight", cleared: false },
  ]);
  const { perFloor, perElite, perBoss } = CLAN.offering;
  assert.deepEqual(o, [
    { ground: "a", amount: 2 * perFloor + perElite },
    { ground: "b", amount: perFloor + perBoss },
  ]);
});

test("group boss: grows with the crowd, splits influence by damage, top faction gets a bonus", () => {
  const b = openBoss("pink-moment", "foothills");
  joinBoss(b, "p1", "order");
  joinBoss(b, "p2", "pathless");
  joinBoss(b, "p2", "pathless");
  assert.equal(b.maxHp, CLAN.boss.baseHp + 2 * CLAN.boss.hpPerPlayer);
  assert.equal(hitBoss(b, "p1", 100), 100);
  assert.equal(hitBoss(b, "nobody", 100), 0);
  assert.equal(hitBoss(b, "p2", 1000), b.maxHp - 100);
  assert.equal(hitBoss(b, "p1", 5), 0, "dead bosses take no damage");
  const r = resolveBoss(b);
  assert.ok(r.killed);
  assert.equal(r.top, "pathless");
  const pool = CLAN.boss.pool;
  assert.ok(Math.abs(r.influence.order + r.influence.pathless - (pool + CLAN.boss.topBonus + 2 * CLAN.boss.killBonus)) < 1e-9);
  assert.equal(r.gold.p2, CLAN.boss.goldBase + CLAN.boss.goldTop);
  assert.ok(r.gold.p1 < r.gold.p2);
});

test("duels: same spot only, stakes across factions, once a day per pair", () => {
  const a = { id: "a", faction: "order" as const, spot: "arcade", gold: 100 };
  const b = { id: "b", faction: "pathless" as const, spot: "arcade", gold: 100 };
  const c = { id: "c", faction: "order" as const, spot: "arcade", gold: 100 };
  assert.deepEqual(canDuel(a, { ...b, spot: "krotona" }, 0), { ok: false, reason: "not-together" });
  assert.deepEqual(canDuel(a, b, 5), { ok: true, stakes: true });
  assert.deepEqual(canDuel(a, b, 5, 5), { ok: true, stakes: false });
  assert.deepEqual(canDuel(a, c, 5), { ok: true, stakes: false });
  assert.equal(goldStake(100), 20);
  assert.equal(goldStake(3), 3);
  assert.equal(goldStake(1000), CLAN.duel.stakeMax);
  const r = resolveDuel(a, b, true);
  assert.deepEqual(r, { gold: 20, influence: CLAN.duel.influence });
  assert.equal(a.gold, 120);
  assert.equal(b.gold, 80);
});
