/**
 * The run: an endless climb of floors. Each floor you pick one of three
 * nodes; every Nth floor is a boss. The run ends when your HP hits 0.
 * Score = floors cleared.
 *
 * In the real game each node is a place in Ojai; here they're abstract.
 */
import { CONFIG } from "./config";
import { ENEMIES, EVENTS, GUIDE_BY_ID, cardDef } from "./content";
import { heal, startFight } from "./fight";
import { cardKey, plainCard, randomGuides, randomNamed, randomRewardCard } from "./rewards";
import { makeRng, next, pick, sample } from "./rng";
import type { Card, NodeKind, Run, Tier } from "./types";

export function newRun(seed: number): Run {
  const run: Run = {
    seed,
    rng: makeRng(seed),
    floor: 1,
    gold: CONFIG.startGold,
    hp: CONFIG.playerHp,
    maxHp: CONFIG.playerHp,
    draw: [],
    hand: [],
    discard: [],
    guides: [],
    nextUid: 1,
    removals: 0,
    phase: "map",
    nodes: [],
    node: null,
    fight: null,
    reward: null,
    shop: null,
    event: null,
    stats: {
      fights: 0,
      turns: 0,
      plays: 0,
      matches: 0,
      endTurns: 0,
      powerUses: { hearts: 0, diamonds: 0, spades: 0, clubs: 0 },
      powerTotal: { hearts: 0, diamonds: 0, spades: 0, clubs: 0 },
      immuneHits: 0,
      catches: 0,
      perfects: 0,
      hpLost: 0,
      maxHit: 0,
      maxHitFloor: 0,
      diedTo: null,
      offers: [],
    },
  };
  // Start with Ace to 10 in hearts and spades: enough to attack and defend.
  // Diamonds and clubs come as rewards; face cards are earned by catching.
  for (const suit of CONFIG.startSuits) for (let v = 1; v <= 10; v++) run.draw.push(plainCard(run, v, suit));
  run.nodes = makeNodes(run);
  return run;
}

/** Floors cleared so far: the run's score. */
export function score(run: Run): number {
  return run.floor - 1;
}

export function isBossFloor(floor: number): boolean {
  return floor % CONFIG.bossEvery === 0;
}

function makeNodes(run: Run): NodeKind[] {
  if (isBossFloor(run.floor)) return ["boss"];
  const weights: Record<string, number> = { ...CONFIG.nodeWeights };
  if (run.floor < CONFIG.eliteFromFloor) delete weights.elite;
  if (run.floor === 1) weights.fight *= 3;
  const out: NodeKind[] = [];
  while (out.length < CONFIG.nodeChoices) {
    const pool = Object.entries(weights).filter(([k]) => !out.includes(k as NodeKind));
    if (pool.length === 0) break;
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let x = next(run.rng) * total;
    for (const [k, w] of pool) {
      x -= w;
      if (x < 0) {
        out.push(k as NodeKind);
        break;
      }
    }
  }
  return out;
}

function enemyFor(run: Run, tier: Tier): string {
  const pool = ENEMIES.filter((e) => e.tier === tier);
  if (tier === "boss") return pool[(Math.floor(run.floor / CONFIG.bossEvery) - 1) % pool.length].id;
  return pick(run.rng, pool).id;
}

/** Everything that isn't in play right now: the deck you'd see on a deck screen. */
export function allCards(run: Run): Card[] {
  return [...run.hand, ...run.draw, ...run.discard];
}

function removeCard(run: Run, uid: number): Card {
  for (const pile of [run.hand, run.draw, run.discard]) {
    const i = pile.findIndex((c) => c.uid === uid);
    if (i >= 0) return pile.splice(i, 1)[0];
  }
  throw new Error("No such card.");
}

function findCard(run: Run, uid: number): Card {
  const c = allCards(run).find((c) => c.uid === uid);
  if (!c) throw new Error("No such card.");
  return c;
}

/** New cards are shuffled into your draw pile. */
function addToDeck(run: Run, c: Card) {
  const at = Math.floor(next(run.rng) * (run.draw.length + 1));
  run.draw.splice(at, 0, c);
}

function advance(run: Run) {
  run.floor++;
  run.node = null;
  run.fight = null;
  run.reward = null;
  run.shop = null;
  run.event = null;
  run.phase = "map";
  run.nodes = makeNodes(run);
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export function chooseNode(run: Run, i: number): void {
  if (run.phase !== "map") throw new Error("Not on the map.");
  const kind = run.nodes[i];
  if (!kind) throw new Error("No such node.");
  run.node = kind;
  if (kind === "fight") startFight(run, enemyFor(run, "normal"));
  else if (kind === "elite") startFight(run, enemyFor(run, "elite"));
  else if (kind === "boss") startFight(run, enemyFor(run, "boss"));
  else if (kind === "rest") run.phase = "rest";
  else if (kind === "shop") openShop(run);
  else {
    run.event = pick(run.rng, EVENTS).id;
    run.phase = "event";
  }
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

export function takeRewardCard(run: Run, i: number): void {
  const r = run.reward;
  if (!r || r.cardTaken) throw new Error("No card to take.");
  addToDeck(run, r.cards[i]);
  r.cardTaken = true;
  run.stats.offers.push({ floor: run.floor, kind: "card", offered: r.cards.map(cardKey), picked: cardKey(r.cards[i]) });
}

export function guidesFull(run: Run): boolean {
  return run.guides.length >= CONFIG.maxGuides;
}

function addGuide(run: Run, id: string, replace?: number) {
  if (guidesFull(run)) {
    if (replace === undefined) throw new Error("Your Guides are full: pick one to replace.");
    run.guides.splice(replace, 1);
  }
  run.guides.push(id);
}

export function takeRewardGuide(run: Run, i: number, replace?: number): void {
  const r = run.reward;
  if (!r || r.guideTaken) throw new Error("No Guide to take.");
  addGuide(run, r.guides[i], replace);
  r.guideTaken = true;
  run.stats.offers.push({ floor: run.floor, kind: "guide", offered: r.guides.slice(), picked: r.guides[i] });
}

export function leaveReward(run: Run): void {
  const r = run.reward;
  if (!r) throw new Error("No reward.");
  if (!r.cardTaken) run.stats.offers.push({ floor: run.floor, kind: "card", offered: r.cards.map(cardKey), picked: null });
  if (!r.guideTaken) run.stats.offers.push({ floor: run.floor, kind: "guide", offered: r.guides.slice(), picked: null });
  advance(run);
}

// ─── Rest ────────────────────────────────────────────────────────────────────

export type RestChoice = "heal" | "upgrade" | "letgo";

export function restHeal(run: Run): number {
  return Math.round(run.maxHp * CONFIG.restHealPct);
}

export function rest(run: Run, choice: RestChoice, uid?: number): void {
  if (run.phase !== "rest") throw new Error("Not resting.");
  if (choice === "heal") {
    heal(run, restHeal(run));
  } else if (choice === "upgrade") {
    upgrade(findCard(run, uid!));
  } else {
    removeCard(run, uid!);
  }
  advance(run);
}

export function upgrade(c: Card): void {
  c.value = Math.min(10, c.value + CONFIG.restUpgrade);
}

// ─── Shop ────────────────────────────────────────────────────────────────────

function openShop(run: Run) {
  const cards = Array.from({ length: CONFIG.shopCards }, () => {
    const card = randomRewardCard(run);
    const rarity = cardDef(card.def).rarity;
    return { card, price: Math.round(CONFIG.cardPrice[rarity] * (0.9 + next(run.rng) * 0.2)), sold: false };
  });
  const guides = randomGuides(run, CONFIG.shopGuides).map((id) => ({
    id,
    price: Math.round(CONFIG.guidePrice[GUIDE_BY_ID[id].rarity] * (0.9 + next(run.rng) * 0.2)),
    sold: false,
  }));
  run.shop = {
    cards,
    guides,
    removePrice: CONFIG.removeBase + CONFIG.removeStep * run.removals,
    removed: false,
  };
  run.phase = "shop";
}

function spend(run: Run, n: number) {
  if (run.gold < n) throw new Error("Not enough gold.");
  run.gold -= n;
}

export function buyCard(run: Run, i: number): void {
  const s = run.shop!;
  const item = s.cards[i];
  if (item.sold) throw new Error("Sold.");
  spend(run, item.price);
  item.sold = true;
  addToDeck(run, item.card);
}

export function buyGuide(run: Run, i: number, replace?: number): void {
  const s = run.shop!;
  const item = s.guides[i];
  if (item.sold) throw new Error("Sold.");
  if (guidesFull(run) && replace === undefined) throw new Error("Your Guides are full: pick one to replace.");
  spend(run, item.price);
  item.sold = true;
  addGuide(run, item.id, replace);
}

export function buyRemoval(run: Run, uid: number): void {
  const s = run.shop!;
  if (s.removed) throw new Error("One removal per visit.");
  spend(run, s.removePrice);
  removeCard(run, uid);
  s.removed = true;
  run.removals++;
}

export function leaveShop(run: Run): void {
  if (run.phase !== "shop") throw new Error("Not in a shop.");
  advance(run);
}

// ─── Events ──────────────────────────────────────────────────────────────────

/** Lose HP outside a fight. Events never kill you: they leave you at 1. */
function hurt(run: Run, n: number) {
  run.hp = Math.max(1, run.hp - n);
}

export function chooseEvent(run: Run, option: number, uid?: number): void {
  if (run.phase !== "event" || !run.event) throw new Error("No event.");
  const id = run.event;
  if (id === "oak_grove_talk") {
    if (option === 0) removeCard(run, uid!);
    else if (option === 1) {
      run.gold += 25;
      hurt(run, 5);
    }
  } else if (id === "honor_shelf") {
    if (option === 0) {
      spend(run, 30);
      addToDeck(run, randomNamed(run, "rare"));
    } else if (option === 1) {
      addToDeck(run, randomNamed(run, "rare"));
      hurt(run, 6);
    }
  } else if (id === "krotona_library") {
    if (option === 0) for (const c of sample(run.rng, allCards(run).filter((c) => c.value < 10), 2)) upgrade(c);
  }
  advance(run);
}

