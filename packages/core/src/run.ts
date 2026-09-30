/**
 * The run: an endless climb of floors. Like Pokémon Go, each floor you
 * walk to a spot and find out what's there: usually a fight, sometimes an
 * elite, a place to heal, a shop or an event. Every Nth floor is an event
 * spot (like a gym) with a boss. The run ends when your HP hits 0.
 * Score = floors cleared.
 *
 * In the real game each spot is a place in Ojai; here they're abstract.
 */
import { BASE_ODDS } from "@gojai/map";
import { CONFIG } from "./config";
import { ENEMIES, EVENTS, GUIDE_BY_ID, cardDef } from "./content";
import { difficultyTier, fightsWon, heal, isJunk, startFight } from "./fight";
import { cardKey, plainCard, randomGuides, randomNamed, randomRewardCard } from "./rewards";
import { makeRng, next, pick, sample } from "./rng";
import type { Card, EncounterKind, NodeKind, Run, SpotContext, Tier } from "./types";

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
    node: null,
    spot: null,
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
      cycles: 0,
      deckOuts: 0,
      idleTurns: 0,
      deadHands: 0,
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
  for (const { suit, values } of CONFIG.startExtra) for (const v of values) run.draw.push(plainCard(run, v, suit));
  return run;
}

/** Floors cleared so far: the run's score. */
export function score(run: Run): number {
  return run.floor - 1;
}

export function isBossFloor(floor: number): boolean {
  return CONFIG.tierEvery === 0 && floor % CONFIG.bossEvery === 0;
}

/** The next fight is a boss: every bossEvery-th floor, or with stepped difficulty the last fight of each tier. */
export function bossNext(run: Run): boolean {
  if (CONFIG.tierEvery > 0) return fightsWon(run) % CONFIG.tierEvery === CONFIG.tierEvery - 1;
  return isBossFloor(run.floor);
}

/** What you find at a spot, rolled with the map's odds. Used by the lab's walk; the map screen rolls its own. */
function rollEncounter(run: Run): EncounterKind {
  const total = Object.values(BASE_ODDS).reduce((s, w) => s + w, 0);
  let x = next(run.rng) * total;
  for (const [k, w] of Object.entries(BASE_ODDS)) {
    x -= w;
    if (x < 0) return k as EncounterKind;
  }
  return "fight";
}

function enemyFor(run: Run, tier: Tier): string {
  const pool = ENEMIES.filter((e) => e.tier === tier);
  if (tier === "boss") {
    const n = CONFIG.tierEvery > 0 ? difficultyTier(run) : Math.floor(run.floor / CONFIG.bossEvery) - 1;
    return pool[n % pool.length].id;
  }
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
  run.spot = null;
  run.fight = null;
  run.reward = null;
  run.shop = null;
  run.event = null;
  run.phase = "map";
}

// ─── Map ─────────────────────────────────────────────────────────────────────

/** Walk to the next spot and find out what's there (the lab's stand-in for the map). */
export function visitSpot(run: Run): void {
  if (run.phase !== "map") throw new Error("Not on the map.");
  enterEncounter(run, rollEncounter(run));
}

/**
 * Start an encounter the map already rolled. This is the entry point for the
 * map screen: it decides what a spot holds and where it is, and the run
 * plays it out and returns to the "map" phase when it's done. The run keeps
 * its pacing: the first spot is a fight, elites wait a few floors, and every
 * Nth floor is a boss whatever the spot rolled.
 */
/** What a spot's roll becomes on this floor: the run's own pacing sits on top of what the spot rolled. */
export function encounterFor(run: Run, encounter: EncounterKind): NodeKind {
  const kind: NodeKind = encounter === "mystery" ? "event" : encounter;
  // Stepped difficulty: the tier's last fight is its boss, wherever you pick it; shops and rests stay what they are
  if (CONFIG.tierEvery > 0) {
    if (bossNext(run) && (kind === "fight" || kind === "elite")) return "boss";
    // Elites wait until you've beaten the first boss, so the first tier stays gentle
    if (kind === "elite" && difficultyTier(run) === 0) return "fight";
  } else if (isBossFloor(run.floor)) return "boss";
  if (run.floor === 1) return "fight";
  if (kind === "elite" && run.floor < CONFIG.eliteFromFloor) return "fight";
  return kind;
}

export function enterEncounter(run: Run, encounter: EncounterKind, spot: SpotContext | null = null): void {
  if (run.phase !== "map") throw new Error("Not on the map.");
  const kind = encounterFor(run, encounter);
  run.node = kind;
  run.spot = spot;
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

/** Instead of taking a new card, upgrade one you already have (up to 10). */
export function takeRewardUpgrade(run: Run, uid: number): void {
  const r = run.reward;
  if (!r || r.cardTaken) throw new Error("No card to take.");
  if (!CONFIG.rewardUpgrade) throw new Error("Rewards can't upgrade cards.");
  const c = findCard(run, uid);
  if (isJunk(c) || c.value >= CONFIG.upgradeCap) throw new Error("That card can't be upgraded.");
  const targets = CONFIG.rewardUpgradeScope === "rank" ? allCards(run).filter((x) => !isJunk(x) && x.def === c.def && x.value === c.value) : [c];
  for (const t of targets) t.value = Math.min(CONFIG.upgradeCap, t.value + CONFIG.rewardUpgrade);
  r.cardTaken = true;
  run.stats.offers.push({ floor: run.floor, kind: "card", offered: r.cards.map(cardKey), picked: "upgrade" });
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
  c.value = Math.min(CONFIG.upgradeCap, c.value + CONFIG.restUpgrade);
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
    if (option === 0) for (const c of sample(run.rng, allCards(run).filter((c) => c.value < CONFIG.upgradeCap), 2)) upgrade(c);
  }
  advance(run);
}

