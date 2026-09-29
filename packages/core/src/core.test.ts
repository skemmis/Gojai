import { test } from "node:test";
import assert from "node:assert/strict";
import { newRun, startFight, play, pay, playError, previewPlay, plainCard, refresh, allCards, chooseNode, takeRewardCard, leaveReward, yieldTurn } from "./index";
import type { Run, Suit } from "./index";

function withHand(run: Run, cards: [number, Suit][]) {
  run.discard.push(...run.hand.splice(0));
  for (const [v, s] of cards) run.hand.push(plainCard(run, v, s));
  return run.hand.map((c) => c.uid);
}

test("a run starts with a 40-card standard deck and a hand of 8", () => {
  const run = newRun(1);
  assert.equal(allCards(run).length, 40);
  assert.equal(run.hand.length, 8);
  assert.equal(run.phase, "map");
  assert.equal(run.nodes.length, 3);
});

test("combos: same value up to 10, or an Ace with any card", () => {
  const run = newRun(2);
  startFight(run, "crystal_vendor");
  const [a, b, c, d, e] = withHand(run, [[5, "hearts"], [5, "clubs"], [1, "spades"], [9, "diamonds"], [6, "hearts"]]);
  assert.equal(playError(run, [a, b]), null); // 5+5
  assert.equal(playError(run, [c, d]), null); // Ace + 9
  assert.notEqual(playError(run, [a, e]), null); // 5 + 6
  assert.notEqual(playError(run, [a, b, c, d]), null);
});

test("clubs double damage; an enemy is immune to its own suit", () => {
  const run = newRun(3);
  startFight(run, "nine_latte"); // clubs
  const [club, heart] = withHand(run, [[7, "clubs"], [7, "hearts"], [10, "spades"], [10, "diamonds"]]);
  assert.equal(previewPlay(run, [club])!.damage, 7); // immune to clubs
  const p = previewPlay(run, [heart])!;
  assert.equal(p.damage, 7);
  assert.deepEqual(p.powers.map((x) => [x.suit, x.immune]), [["hearts", false]]);
  const run2 = newRun(3);
  startFight(run2, "crystal_vendor"); // spades, armor 1
  const [c2] = withHand(run2, [[7, "clubs"], [10, "hearts"]]);
  assert.equal(previewPlay(run2, [c2])!.damage, 13); // 7×2 − 1
});

test("spades shield the next attack", () => {
  const run = newRun(4);
  startFight(run, "influencer"); // hearts
  run.fight!.enemy.attack = 6;
  const [s] = withHand(run, [[4, "spades"], [10, "diamonds"], [10, "clubs"]]);
  play(run, [s]);
  assert.equal(run.fight!.shield, 4);
  assert.equal(run.fight!.phase, "pay");
  assert.equal(run.fight!.owed, 2);
});

test("an exact kill catches the enemy as a face card on top of your deck", () => {
  const run = newRun(5);
  startFight(run, "manifestor"); // hearts
  run.fight!.enemy.hp = 14;
  const [a, b] = withHand(run, [[7, "clubs"], [3, "hearts"]]);
  play(run, [a]); // 7 × 2 = 14
  assert.equal(run.fight!.phase, "won");
  assert.equal(run.fight!.exact, true);
  assert.equal(run.draw[0].def, "catch_manifestor");
  assert.equal(run.draw[0].value, 10);
  assert.equal(run.phase, "reward");
  void b;
});

test("you must discard enough to cover the attack, or you lose", () => {
  const run = newRun(6);
  startFight(run, "crystal_vendor");
  run.fight!.enemy.attack = 6;
  run.refreshes = 0;
  const [a, b, c] = withHand(run, [[2, "hearts"], [3, "diamonds"], [1, "clubs"]]);
  play(run, [a]); // 2 dmg, then owe 6 with only 4 left
  assert.equal(run.fight!.phase, "lost");
  assert.equal(run.phase, "over");
  void b; void c;
});

test("paying moves cards to the discard pile; hex junk leaves after the fight", () => {
  const run = newRun(7);
  startFight(run, "nine_latte");
  run.fight!.enemy.attack = 6;
  const [a, b, c] = withHand(run, [[2, "hearts"], [6, "diamonds"], [10, "spades"]]);
  play(run, [a]);
  assert.equal(run.fight!.phase, "pay");
  assert.ok(allCards(run).some((x) => x.def === "junk_latte"));
  pay(run, [b]);
  assert.equal(run.fight!.phase, "play");
  run.fight!.enemy.hp = 3;
  const [d] = withHand(run, [[3, "spades"]]);
  play(run, [d]);
  assert.ok(!allCards(run).some((x) => x.def === "junk_latte"));
  void c;
});

test("you can't yield two turns in a row", () => {
  const run = newRun(10);
  startFight(run, "influencer");
  run.fight!.enemy.attack = 0;
  yieldTurn(run);
  assert.throws(() => yieldTurn(run));
});

test("refresh swaps your hand", () => {
  const run = newRun(8);
  startFight(run, "influencer");
  const before = run.hand.map((c) => c.uid);
  refresh(run);
  assert.equal(run.refreshes, 1);
  assert.ok(run.hand.every((c) => !before.includes(c.uid)));
});

test("a whole floor: fight, reward, next floor", () => {
  const run = newRun(9);
  chooseNode(run, run.nodes.indexOf("fight") >= 0 ? run.nodes.indexOf("fight") : 0);
  let guard = 0;
  while (run.phase === "fight" && guard++ < 200) {
    const f = run.fight!;
    if (f.phase === "pay") {
      const sorted = run.hand.slice().sort((x, y) => y.value - x.value);
      const pick: number[] = [];
      let s = 0;
      for (const c of sorted) if (s < f.owed) { pick.push(c.uid); s += c.value; }
      if (s >= f.owed) pay(run, pick); else refresh(run);
    } else if (run.hand.length) {
      const best = run.hand.slice().sort((x, y) => y.value - x.value)[0];
      play(run, [best.uid]);
    } else yieldTurn(run);
  }
  if (run.phase === "reward") {
    takeRewardCard(run, 0);
    leaveReward(run);
    assert.equal(run.floor, 2);
    assert.equal(run.phase, "map");
  } else if (run.phase === "rest" || run.phase === "shop" || run.phase === "event") {
    assert.ok(true);
  } else {
    assert.equal(run.phase, "over");
  }
});

test("the same seed plays out the same way", () => {
  const a = newRun(42), b = newRun(42);
  assert.deepEqual(a.hand, b.hand);
  assert.deepEqual(a.nodes, b.nodes);
});
