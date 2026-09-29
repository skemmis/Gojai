import { test } from "node:test";
import assert from "node:assert/strict";
import { newRun, startFight, play, endTurn, playError, previewPlay, plainCard, allCards, visitSpot, enterEncounter, takeRewardCard, leaveReward, intent, incoming, CONFIG } from "./index";
import type { Run, Suit } from "./index";

function withHand(run: Run, cards: [number, Suit][]) {
  run.discard.push(...run.hand.splice(0));
  for (const [v, s] of cards) run.hand.push(plainCard(run, v, s));
  return run.hand.map((c) => c.uid);
}

test("a run starts with Ace to 10 in hearts and spades and full HP", () => {
  const run = newRun(1);
  assert.equal(allCards(run).length, 20);
  assert.deepEqual([...new Set(allCards(run).map((c) => c.suit))].sort(), ["hearts", "spades"]);
  assert.equal(run.hp, CONFIG.playerHp);
  assert.equal(run.phase, "map");
});

test("a turn is a hand of 5 and 3 actions", () => {
  const run = newRun(1);
  startFight(run, "ebike_teen");
  assert.equal(run.hand.length, 5);
  assert.equal(run.fight!.actions, 3);
});

test("a card matching one already played this turn, in another suit, counts double", () => {
  const run = newRun(2);
  startFight(run, "ebike_teen");
  const [h, sp, sp2, c] = withHand(run, [[5, "hearts"], [5, "spades"], [5, "spades"], [5, "clubs"]]);
  assert.equal(previewPlay(run, sp)!.damage, 5); // nothing played yet
  play(run, h);
  assert.equal(previewPlay(run, sp)!.mult, 2);
  assert.equal(previewPlay(run, sp)!.damage, 10);
  play(run, sp);
  assert.equal(previewPlay(run, sp2)!.mult, 2); // same suit as the spade: no extra step
  assert.equal(previewPlay(run, c)!.mult, 3); // third suit: three of a kind
});

test("matching resets each turn", () => {
  const run = newRun(15);
  startFight(run, "short_term_rental");
  const [h] = withHand(run, [[6, "hearts"]]);
  play(run, h);
  endTurn(run);
  const [sp] = withHand(run, [[6, "spades"]]);
  assert.equal(previewPlay(run, sp)!.mult, 1);
});

test("each play costs an action; with none left you must end your turn", () => {
  const run = newRun(12);
  startFight(run, "ebike_teen");
  const [a, b, c, d] = withHand(run, [[2, "hearts"], [3, "hearts"], [4, "hearts"], [5, "hearts"]]);
  play(run, a);
  play(run, b);
  play(run, c); // three actions, three cards
  assert.equal(run.fight!.actions, 0);
  assert.notEqual(playError(run, d), null);
});

test("only spades deal damage; an enemy is immune to its own suit", () => {
  const run = newRun(3);
  startFight(run, "crystal_vendor"); // diamonds, armor 1
  const [sp, he, di] = withHand(run, [[7, "spades"], [7, "hearts"], [5, "diamonds"], [10, "spades"]]);
  assert.equal(previewPlay(run, sp)!.damage, 6); // 7 − armor 1
  assert.equal(previewPlay(run, he)!.damage, 0); // hearts defend, don't hit
  const p = previewPlay(run, di)!;
  assert.deepEqual(p.powers.map((x) => [x.suit, x.immune]), [["diamonds", true]]);
});

test("hearts block the enemy's attack, then block wears off", () => {
  const run = newRun(4);
  startFight(run, "nine_latte"); // first intent: attack 6
  assert.equal(incoming(run), 6);
  const [h] = withHand(run, [[4, "hearts"]]);
  play(run, h);
  assert.equal(run.fight!.block, 4);
  endTurn(run);
  assert.equal(run.hp, CONFIG.playerHp - 2);
  assert.equal(run.fight!.block, 0);
  assert.equal(run.fight!.hpLost, 2);
});

test("the enemy's intents cycle and are visible ahead of time", () => {
  const run = newRun(5);
  startFight(run, "nine_latte");
  assert.equal(intent(run)[0].k, "attack");
  withHand(run, []);
  endTurn(run);
  assert.equal(intent(run)[0].k, "hex");
});

test("clubs recall your best cards from the discard pile", () => {
  const run = newRun(11);
  startFight(run, "short_term_rental");
  withHand(run, [[9, "spades"], [2, "hearts"]]);
  run.discard = [];
  const [c] = withHand(run, [[4, "clubs"]]); // 9♠ and 2♥ are now the discard pile
  play(run, c);
  assert.ok(run.hand.some((x) => x.value === 9 && x.suit === "spades"));
});

test("diamonds draw 1 + 1 per 4 value", () => {
  const run = newRun(13);
  startFight(run, "ebike_teen"); // immune to diamonds
  run.fight!.enemy.suits = [];
  const [d] = withHand(run, [[8, "diamonds"]]);
  play(run, d);
  assert.equal(run.hand.length, 3);
});

test("an exact kill catches the enemy as a face card", () => {
  const run = newRun(5);
  startFight(run, "manifestor"); // hearts
  run.fight!.enemy.hp = 4;
  const [a] = withHand(run, [[4, "spades"], [9, "hearts"]]);
  play(run, a); // exactly 4
  assert.equal(run.fight!.phase, "won");
  assert.equal(run.fight!.exact, true);
  assert.ok(allCards(run).some((c) => c.def === "catch_manifestor" && c.value === 10));
  assert.equal(run.phase, "reward");
});

test("a perfect fight pays bonus gold and offers a rare", () => {
  const run = newRun(14);
  startFight(run, "ebike_teen");
  run.fight!.enemy.hp = 5;
  const [a] = withHand(run, [[10, "spades"]]);
  play(run, a);
  assert.equal(run.fight!.perfect, true);
  assert.equal(run.reward!.perfect, true);
  assert.ok(run.reward!.gold >= Math.round(CONFIG.fightGold[0] * (1 + CONFIG.perfectGoldPct)));
  assert.ok(run.reward!.cards.some((c) => c.def !== "plain"));
});

test("you lose when your HP hits 0", () => {
  const run = newRun(6);
  startFight(run, "crystal_vendor");
  run.hp = 3;
  withHand(run, []);
  endTurn(run);
  assert.equal(run.fight!.phase, "lost");
  assert.equal(run.phase, "over");
});

test("hex junk joins your deck and leaves after the fight", () => {
  const run = newRun(7);
  startFight(run, "nine_latte");
  withHand(run, []);
  endTurn(run); // attack
  endTurn(run); // hex
  assert.ok(allCards(run).some((x) => x.def === "junk_latte"));
  run.fight!.enemy.hp = 3;
  const [d] = withHand(run, [[3, "spades"]]);
  play(run, d);
  assert.equal(run.fight!.phase, "won");
  assert.ok(!allCards(run).some((x) => x.def === "junk_latte"));
});

test("a whole floor: fight, reward, next floor", () => {
  const run = newRun(9);
  visitSpot(run); // the first spot is always a fight
  let guard = 0;
  while (run.phase === "fight" && guard++ < 500) {
    const spade = run.hand.filter((c) => c.suit === "spades").sort((x, y) => y.value - x.value)[0];
    if (spade && run.fight!.actions > 0) play(run, spade.uid);
    else endTurn(run);
  }
  if (run.phase === "reward") {
    takeRewardCard(run, 0);
    leaveReward(run);
    assert.equal(run.floor, 2);
    assert.equal(run.phase, "map");
  } else {
    assert.ok(["rest", "shop", "event", "over"].includes(run.phase));
  }
});

test("the same seed plays out the same way", () => {
  const a = newRun(42), b = newRun(42);
  startFight(a, "influencer");
  startFight(b, "influencer");
  assert.deepEqual(a.hand, b.hand);
});

test("the map can hand the run an encounter it rolled, with its place", () => {
  const run = newRun(5);
  enterEncounter(run, "rest", { spotId: "s1", place: "libbey_park" });
  assert.equal(run.phase, "rest");
  assert.equal(run.spot?.place, "libbey_park");
  const other = newRun(6);
  enterEncounter(other, "mystery");
  assert.equal(other.phase, "event");
  assert.equal(other.node, "event");
});
