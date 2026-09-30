import { test } from "node:test";
import assert from "node:assert/strict";
import { newRun, startFight, play, endTurn, playError, previewPlay, plainCard, allCards, visitSpot, enterEncounter, takeRewardCard, leaveReward, intent, incoming, CONFIG, ENEMY_BY_ID, takeRewardUpgrade, discardCards, makeCard, guideCounter } from "./index";
import type { Run, Suit } from "./index";

function withHand(run: Run, cards: [number, Suit][]) {
  run.discard.push(...run.hand.splice(0));
  for (const [v, s] of cards) run.hand.push(plainCard(run, v, s));
  return run.hand.map((c) => c.uid);
}

test("a run starts with a full deck, Ace to 10 in every suit, and full HP", () => {
  const run = newRun(1);
  assert.equal(allCards(run).length, 40);
  assert.deepEqual([...new Set(allCards(run).map((c) => c.suit))].sort(), ["clubs", "diamonds", "hearts", "spades"]);
  assert.equal(run.hp, CONFIG.playerHp);
  assert.equal(run.phase, "map");
});

test("a fight opens with a hand of 8 and 3 actions a turn", () => {
  const run = newRun(1);
  startFight(run, "ebike_teen");
  assert.equal(run.hand.length, 8);
  assert.equal(run.fight!.actions, 3);
});

test("you keep your hand between turns and only draw by playing diamonds", () => {
  const run = newRun(1);
  startFight(run, "ebike_teen");
  const [a] = withHand(run, [[5, "hearts"], [6, "hearts"], [7, "hearts"]]);
  play(run, a);
  endTurn(run);
  assert.equal(run.hand.length, 2);
  const [d] = withHand(run, [[8, "diamonds"]]);
  play(run, d);
  assert.equal(run.hand.length, 8); // 8♦ draws 8, but a hand holds 8
});

test("a card matching one already played this turn, in another suit, counts double", () => {
  const run = newRun(2);
  startFight(run, "ebike_teen");
  const [h, sp, sp2, c] = withHand(run, [[5, "hearts"], [5, "spades"], [5, "spades"], [5, "clubs"]]);
  assert.equal(previewPlay(run, sp)!.damage, 5);
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

test("only spades hit, for their value; no enemy is immune", () => {
  const run = newRun(3);
  startFight(run, "crystal_vendor"); // armor 1
  const [sp, he, di] = withHand(run, [[7, "spades"], [7, "hearts"], [5, "diamonds"], [10, "spades"]]);
  assert.equal(previewPlay(run, sp)!.damage, 6); // 7 − armor 1
  assert.equal(previewPlay(run, he)!.damage, 0); // hearts only block
  assert.equal(previewPlay(run, he)!.block, 7);
  const p = previewPlay(run, di)!;
  assert.deepEqual(p.powers.map((x) => [x.suit, x.immune]), [["diamonds", false]]);
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

test("clubs let you discard up to their value, and discarding fires discard effects", () => {
  const run = newRun(11);
  startFight(run, "short_term_rental");
  const [c, x, y, z] = withHand(run, [[2, "clubs"], [3, "hearts"], [4, "hearts"], [5, "hearts"]]);
  play(run, c);
  assert.equal(run.fight!.discarding, 2);
  assert.notEqual(playError(run, x), null, "pick the discards before playing on");
  assert.throws(() => discardCards(run, [x, y, z]), "at most the club's value");
  discardCards(run, [x, y]);
  assert.deepEqual(run.hand.map((h) => h.uid), [z]);
  assert.equal(playError(run, z), null);
  const hp = run.fight!.enemy.hp;
  const letGo = makeCard(run, "let_go");
  const [c2] = withHand(run, [[1, "clubs"]]);
  run.hand.push(letGo);
  play(run, c2);
  discardCards(run, [letGo.uid]);
  assert.ok(run.fight!.enemy.hp <= hp - 8, "Let Go deals 8 when discarded");
});

test("diamonds draw as many cards as their value", () => {
  const run = newRun(13);
  startFight(run, "ebike_teen");
  const [d] = withHand(run, [[3, "diamonds"]]);
  play(run, d);
  assert.equal(run.hand.length, 3);
});

test("an empty draw pile reshuffles the discard pile", () => {
  const run = newRun(16);
  startFight(run, "short_term_rental");
  run.draw = [];
  const [d] = withHand(run, [[2, "diamonds"]]);
  play(run, d);
  assert.equal(run.hand.length, 2, "drew from the reshuffled discard pile");
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
  const first = newRun(4);
  enterEncounter(first, "rest");
  assert.equal(first.phase, "fight", "the first spot is always a fight");
  const run = newRun(5);
  run.floor = 2;
  enterEncounter(run, "rest", { spotId: "s1", place: "libbey-park" });
  assert.equal(run.phase, "rest");
  assert.equal(run.spot?.place, "libbey-park");
  const early = newRun(7);
  early.floor = 2;
  early.stats.fights = 1;
  enterEncounter(early, "elite");
  assert.equal(early.fight?.enemy.tier, "normal", "elites wait for the second tier");
  const boss = newRun(8);
  boss.floor = 12;
  boss.stats.fights = CONFIG.tierEvery - 1;
  enterEncounter(boss, "shop");
  assert.equal(boss.phase, "shop", "a shop stays a shop even with the boss next");
  enterEncounter(Object.assign(boss, { phase: "map" }), "fight");
  assert.equal(boss.fight?.enemy.tier, "boss", "the tier's last fight is its boss");
  const tier2 = newRun(9);
  tier2.floor = 13;
  tier2.stats.fights = CONFIG.tierEvery;
  enterEncounter(tier2, "fight");
  const base = newRun(9);
  base.floor = 2;
  base.stats.fights = 1;
  enterEncounter(base, "fight");
  const scale = (r: Run) => r.fight!.enemy.maxHp / ENEMY_BY_ID[r.fight!.enemy.id].hp;
  assert.ok(scale(tier2) > scale(base) * 1.5, "enemies jump a tier after each boss");
  const other = newRun(6);
  other.floor = 3;
  enterEncounter(other, "mystery");
  assert.equal(other.phase, "event");
  assert.equal(other.node, "event");
});

test("a fight reward can upgrade one of your cards instead of adding one", () => {
  const run = newRun(21);
  startFight(run, "ebike_teen");
  run.fight!.enemy.hp = 1;
  const [a] = withHand(run, [[1, "spades"]]);
  play(run, a);
  const target = allCards(run).find((c) => c.value === 4)!;
  const size = allCards(run).length;
  takeRewardUpgrade(run, target.uid);
  assert.equal(target.value, 4 + CONFIG.rewardUpgrade);
  assert.equal(allCards(run).length, size, "no card added");
  assert.throws(() => takeRewardCard(run, 0), "it takes the card choice");
});

test("Guides grow: Farmers Market adds to spades for the fight, Crystal Shop to hearts for the run", () => {
  const run = newRun(21);
  run.guides.push("farmers_market", "crystal_shop");
  startFight(run, "ebike_teen");
  const [c, d, sp, h] = withHand(run, [[1, "clubs"], [1, "diamonds"], [5, "spades"], [5, "hearts"]]);
  play(run, c);
  discardCards(run, []);
  play(run, d);
  assert.equal(previewPlay(run, sp)!.damage, 6, "5♠ +1 from the club");
  assert.equal(previewPlay(run, h)!.block, 6, "5♥ +1 from the diamond");
  assert.equal(guideCounter(run, "crystal_shop")!.n, 1);
});

test("the Arcade strikes on every 4th card played", () => {
  const run = newRun(22);
  run.guides.push("arcade");
  startFight(run, "short_term_rental");
  const hp = run.fight!.enemy.hp;
  const [a, b, c] = withHand(run, [[2, "hearts"], [3, "hearts"], [4, "hearts"]]);
  play(run, a); play(run, b); play(run, c);
  endTurn(run);
  const [d] = withHand(run, [[5, "hearts"]]);
  play(run, d);
  assert.equal(run.fight!.enemy.hp, hp - 6);
});
