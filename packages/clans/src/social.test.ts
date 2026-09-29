import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOARDS, newBook, addPlayer, record, rollWeek, rollSeason, standing, keepers, emptyStats,
  portraitsFor, framesFor, titles, validName, sanitize, drawsEarned, SIGNUP_DRAWS,
  rollCharacter, portraitPrompt, FACTION_TOUCH, type Profile,
} from "./index.ts";

const board = (id: string) => BOARDS.find((b) => b.id === id)!;

function town() {
  const b = newBook();
  addPlayer(b, { id: "ann", name: "Ann", faction: "order", friends: ["bo"] });
  addPlayer(b, { id: "bo", name: "Bo", faction: "pathless", friends: ["ann"] });
  addPlayer(b, { id: "cy", name: "Cy", faction: "pathless", friends: [] });
  addPlayer(b, { id: "di", name: "Di", faction: "order", friends: [] });
  return b;
}

test("boards rank by their metric, ties share a rank, idle players aren't listed", () => {
  const b = town();
  for (let i = 0; i < 5; i++) record(b, "ann", { kind: "spot" });
  for (let i = 0; i < 5; i++) record(b, "bo", { kind: "spot" });
  for (let i = 0; i < 9; i++) record(b, "cy", { kind: "spot" });
  const s = standing(b, board("walkers-week"), { kind: "everyone" }, "bo");
  assert.deepEqual(s.top.map((r) => [r.player, r.rank, r.value]), [["cy", 1, 9], ["ann", 2, 5], ["bo", 2, 5]]);
  assert.equal(s.you?.rank, 2);
});

test("scopes: faction and friends", () => {
  const b = town();
  for (const p of ["ann", "bo", "cy", "di"]) record(b, p, { kind: "boss", damage: p.length * 10 + p.charCodeAt(0) });
  const board_ = board("slayers-season");
  assert.deepEqual(standing(b, board_, { kind: "faction", faction: "order" }, "ann").top.map((r) => r.player).sort(), ["ann", "di"]);
  assert.deepEqual(standing(b, board_, { kind: "friends", of: "ann" }, "ann").top.map((r) => r.player).sort(), ["ann", "bo"]);
});

test("a viewer far down the board sees the rows around them", () => {
  const b = newBook();
  for (let i = 0; i < 30; i++) {
    addPlayer(b, { id: `p${i}`, name: `P${i}`, faction: "order", friends: [] });
    record(b, `p${i}`, { kind: "runEnd", floorsCleared: 100 - i, catches: 0 });
  }
  const s = standing(b, board("hall"), { kind: "everyone" }, "p20");
  assert.equal(s.top.length, 10);
  assert.deepEqual(s.around.map((r) => r.player), ["p18", "p19", "p20", "p21", "p22"]);
});

test("duel ties go to fewer losses", () => {
  const b = town();
  record(b, "ann", { kind: "duel", won: true });
  record(b, "ann", { kind: "duel", won: false });
  record(b, "bo", { kind: "duel", won: true });
  const s = standing(b, board("duelists-season"), { kind: "everyone" }, "ann");
  assert.deepEqual(s.top.map((r) => [r.player, r.rank]), [["bo", 1], ["ann", 2]]);
});

test("weeks and seasons roll over; all time stays", () => {
  const b = town();
  record(b, "ann", { kind: "runEnd", floorsCleared: 22, catches: 2 });
  rollWeek(b);
  assert.equal(b.stats.ann.week.depth, 0);
  assert.equal(b.stats.ann.season.depth, 22);
  rollSeason(b);
  assert.equal(b.stats.ann.season.catches, 0);
  assert.equal(b.stats.ann.all.depth, 22);
  assert.equal(b.stats.ann.all.catches, 2);
});

test("keepers come from the faction holding the ground", () => {
  const b = town();
  record(b, "ann", { kind: "influence", ground: "arcade", amount: 10 });
  record(b, "bo", { kind: "influence", ground: "arcade", amount: 30 });
  record(b, "di", { kind: "influence", ground: "arcade", amount: 12 });
  assert.deepEqual(keepers(b, { arcade: "order", trail: null }), { arcade: "di", trail: null });
  assert.deepEqual(keepers(b, { arcade: "pathless" }), { arcade: "bo" });
});

test("profiles offer only what's earned: dealt characters, caught enemies, frames, titles", () => {
  const p: Profile = { id: "ann", name: "Ann", faction: "order", portrait: "gen:99", dealt: [4, 17, 23], frame: "gilt", title: "Keeper of The Arcade", caught: ["nine_latte"], kept: ["arcade"], seasonsWon: 0 };
  const s = { ...emptyStats(), spots: 60, depth: 12 };
  assert.deepEqual(portraitsFor(p), ["gen:4", "gen:17", "gen:23", "enemy:nine_latte"]);
  assert.deepEqual(framesFor(p, s), ["plain", "rule", "keeper"]);
  const name = (g: string) => (g === "arcade" ? "The Arcade" : g);
  assert.ok(titles(p, s, name).includes("Keeper of The Arcade"));
  const clean = sanitize(p, s, name);
  assert.equal(clean.portrait, "gen:4", "a seed you weren't dealt falls back to your first");
  assert.equal(clean.frame, "plain");
  assert.equal(clean.title, "Keeper of The Arcade");
  assert.equal(sanitize({ ...p, portrait: "enemy:nine_latte" }, s).portrait, "enemy:nine_latte");
  assert.equal(drawsEarned(2), SIGNUP_DRAWS + 2);
});

test("characters are rolled from a seed, in the house style, with the faction's touch", () => {
  const a = rollCharacter(7, "order");
  assert.deepEqual(rollCharacter(7, "order"), a);
  assert.ok(FACTION_TOUCH.order.includes(a.touch));
  const prompt = portraitPrompt(a);
  assert.ok(prompt.includes("#2A1E14") && prompt.includes(a.archetype.look) && prompt.includes(a.touch));
  const looks = new Set(Array.from({ length: 200 }, (_, i) => rollCharacter(i, "pathless")).map((c) => `${c.archetype.id}|${c.age}|${c.who}|${c.hair}`));
  assert.ok(looks.size > 180, `${looks.size} distinct of 200`);
  for (let i = 0; i < 300; i++) {
    const c = rollCharacter(i, "pathless");
    if (c.who !== "man") assert.ok(!/beard|moustache/.test(c.hair), `seed ${i}: ${c.who} with ${c.hair}`);
  }
});

test("display names", () => {
  assert.ok(validName("Oak Grove Mom"));
  assert.ok(validName("José_9"));
  assert.ok(!validName("x"));
  assert.ok(!validName("a".repeat(21)));
  assert.ok(!validName("<script>"));
  assert.ok(!validName("two  spaces"));
});
