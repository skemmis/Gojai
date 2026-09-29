/**
 * The fight: Regicide's loop, one enemy at a time, inside a run.
 *
 *   1. PLAY a card, a same-value combo (total ≤ 10), or an Ace + any card.
 *   2. Each suit in the play fires its POWER with N = total value, unless
 *      the enemy is immune to that suit. Order: hearts, diamonds, spades, clubs.
 *   3. DAMAGE = total (×2 with clubs). HP to exactly 0 = the enemy is CAUGHT.
 *   4. The enemy ATTACKS: discard cards worth at least (attack − shield),
 *      or the run is over.
 *
 * There's no HP bar: your deck is your life. The draw pile never reshuffles;
 * only Hearts (and rests) bring discarded cards back.
 *
 * Every function here mutates the run in place. Callers that need an
 * untouched copy (UI undo, bot lookahead) clone first.
 */
import { CONFIG } from "./config";
import { cardDef, ENEMY_BY_ID } from "./content";
import { shuffle, next, int } from "./rng";
import { giveFightReward } from "./rewards";
import type { Card, Effect, EnemyState, Fight, PlayLog, Run, Suit, Tier } from "./types";
import { SUITS } from "./types";

// ─── Card helpers ─────────────────────────────────────────────────────────────

export function effects(c: Card): Effect[] {
  return cardDef(c.def).effects;
}

export function has(c: Card, k: Effect["k"]): boolean {
  return effects(c).some((e) => e.k === k);
}

export function sumEffect(c: Card, k: "dmg" | "draw" | "payBonus" | "onPayDamage" | "onPayRecover" | "heavy"): number {
  let s = 0;
  for (const e of effects(c)) if (e.k === k) s += e.n;
  return s;
}

export function isJunk(c: Card): boolean {
  return has(c, "junk");
}

export function cardName(c: Card): string {
  const d = cardDef(c.def);
  if (d.name) return d.name;
  const v = c.value === 1 ? "A" : String(c.value);
  return `${v} ${c.suit ?? ""}`.trim();
}

export function hasGuide(run: Run, id: string): boolean {
  return run.guides.includes(id);
}

export function handSize(run: Run): number {
  return CONFIG.handSize + (hasGuide(run, "oak_grove") ? 1 : 0);
}

export function cardSuits(run: Run, c: Card): Suit[] {
  if (has(c, "wild")) return SUITS;
  if (c.value === 1 && hasGuide(run, "peoples_market")) return SUITS;
  return c.suit ? [c.suit] : [];
}

/** What a card is worth when discarded to pay an attack. */
export function payValue(c: Card): number {
  if (isJunk(c)) return 0;
  return Math.max(0, c.value) + sumEffect(c, "payBonus");
}

export function payCapacity(run: Run): number {
  return run.hand.reduce((s, c) => s + payValue(c), 0);
}

// ─── Pile helpers ─────────────────────────────────────────────────────────────

export function drawCards(run: Run, n: number): number {
  let drawn = 0;
  const cap = handSize(run);
  while (drawn < n && run.hand.length < cap && run.draw.length > 0) {
    run.hand.push(run.draw.shift()!);
    drawn++;
  }
  return drawn;
}

/** Shuffle the discard pile, then move n of its cards to the bottom of the draw pile. */
export function recover(run: Run, n: number): number {
  shuffle(run.rng, run.discard);
  const moved = run.discard.splice(0, n);
  run.draw.push(...moved);
  return moved.length;
}

function takeFromHand(run: Run, uids: number[]): Card[] {
  const out: Card[] = [];
  for (const uid of uids) {
    const i = run.hand.findIndex((c) => c.uid === uid);
    if (i >= 0) out.push(...run.hand.splice(i, 1));
  }
  return out;
}

function log(run: Run, msg: string) {
  run.fight?.log.push(msg);
}

// ─── Starting a fight ────────────────────────────────────────────────────────

export function scaledEnemy(id: string, floor: number): EnemyState {
  const d = ENEMY_BY_ID[id];
  const f = floor - 1;
  return {
    id: d.id,
    name: d.name,
    tier: d.tier,
    hp: Math.round(d.hp * (1 + CONFIG.hpGrowth * f)),
    maxHp: Math.round(d.hp * (1 + CONFIG.hpGrowth * f)),
    attack: Math.round(d.attack * (1 + CONFIG.attackGrowth * f)),
    suits: d.suits.slice(),
    trick: d.trick,
  };
}

export function startFight(run: Run, enemyId: string): void {
  const enemy = scaledEnemy(enemyId, run.floor);
  run.fight = {
    enemy,
    shield: run.carriedShield,
    turn: 1,
    plays: 0,
    yieldedLast: false,
    phase: "play",
    owed: 0,
    attacksLeft: 0,
    exact: false,
    lastPlay: null,
    log: [`${enemy.name} blocks the way.`],
  };
  run.carriedShield = 0;
  run.phase = "fight";
  run.stats.fights++;
  if (hasGuide(run, "leadbeater")) drawCards(run, 2);
  checkEmptyHanded(run);
}

// ─── Playing ─────────────────────────────────────────────────────────────────

/** null if the play is legal, else the reason it isn't. */
export function playError(run: Run, uids: number[]): string | null {
  const f = run.fight;
  if (!f || f.phase !== "play") return "Not your move.";
  if (uids.length === 0) return "Pick a card.";
  const cards = uids.map((u) => run.hand.find((c) => c.uid === u));
  if (cards.some((c) => !c)) return "That card isn't in your hand.";
  const cs = cards as Card[];
  if (cs.some(isJunk)) return "Junk can't be played.";
  if (cs.length === 1) return null;
  const aces = cs.filter((c) => c.value === 1).length;
  if (cs.length === 2 && aces >= 1) return null; // Ace + any card
  const v = cs[0].value;
  if (!cs.every((c) => c.value === v)) return "A combo is cards of the same value, or an Ace plus one card.";
  if (cs.length > 4) return "Four cards at most.";
  const total = cs.reduce((s, c) => s + c.value, 0);
  if (total > CONFIG.comboCap && !hasGuide(run, "krishnamurti")) return `A combo can total ${CONFIG.comboCap} at most.`;
  return null;
}

export interface PlayPreview {
  total: number;
  damage: number;
  powers: { suit: Suit; n: number; immune: boolean }[];
  kills: boolean;
  exact: boolean;
}

function playNumbers(run: Run, cs: Card[]) {
  const f = run.fight!;
  const total = cs.reduce((s, c) => s + c.value, 0);
  const suits = new Set<Suit>();
  for (const c of cs) for (const s of cardSuits(run, c)) suits.add(s);
  const pierce = cs.some((c) => has(c, "pierce")) || (f.plays === 0 && hasGuide(run, "ceremony"));
  const silenced = f.plays === 0 && f.enemy.trick.k === "silence";
  const powers = SUITS.filter((s) => suits.has(s)).map((s) => ({
    suit: s,
    n: total,
    immune: silenced || (!pierce && f.enemy.suits.includes(s)),
  }));
  const clubs = powers.some((p) => p.suit === "clubs" && !p.immune);
  let damage = total + cs.reduce((s, c) => s + sumEffect(c, "dmg"), 0);
  if (cs.length > 1 && hasGuide(run, "besant")) damage += 4;
  if (clubs) damage *= 2;
  if (f.plays === 0 && hasGuide(run, "life_coach")) damage *= 2;
  if (f.enemy.trick.k === "armor") damage = Math.max(0, damage - f.enemy.trick.n);
  return { total, powers, damage };
}

export function previewPlay(run: Run, uids: number[]): PlayPreview | null {
  if (playError(run, uids)) return null;
  const cs = uids.map((u) => run.hand.find((c) => c.uid === u)!) as Card[];
  const { total, powers, damage } = playNumbers(run, cs);
  const hp = run.fight!.enemy.hp;
  return { total, damage, powers, kills: damage >= hp, exact: damage === hp };
}

export function play(run: Run, uids: number[]): void {
  const err = playError(run, uids);
  if (err) throw new Error(err);
  const f = run.fight!;
  const cs = takeFromHand(run, uids);
  const { total, powers, damage } = playNumbers(run, cs);

  for (const p of powers) {
    if (p.immune) {
      run.stats.immuneHits++;
      continue;
    }
    run.stats.powerUses[p.suit]++;
    run.stats.powerTotal[p.suit] += p.n;
    if (p.suit === "hearts") {
      const n = recover(run, p.n + (hasGuide(run, "farmers_market") ? 2 : 0));
      log(run, `Hearts: recovered ${n} cards.`);
    } else if (p.suit === "diamonds") {
      const n = drawCards(run, p.n + (hasGuide(run, "libbey") ? 1 : 0));
      log(run, `Diamonds: drew ${n}.`);
    } else if (p.suit === "spades") {
      const n = p.n + (hasGuide(run, "crystal_shop") ? 2 : 0);
      f.shield += n;
      log(run, `Spades: shield +${n} (now ${f.shield}).`);
    } else {
      log(run, `Clubs: double damage.`);
    }
  }
  run.discard.push(...cs);

  let extraDraw = cs.reduce((s, c) => s + sumEffect(c, "draw"), 0);
  if (hasGuide(run, "arcade")) extraDraw += cs.filter((c) => c.value >= 10).length;
  if (extraDraw) drawCards(run, extraDraw);

  f.plays++;
  f.yieldedLast = false;
  run.stats.plays++;
  if (cs.length > 1) run.stats.combos++;
  f.lastPlay = { cards: cs.map((c) => c.uid), damage, powers: powers.filter((p) => !p.immune).map((p) => p.suit), immune: powers.filter((p) => p.immune).map((p) => p.suit) };
  if (damage > run.stats.maxHit) {
    run.stats.maxHit = damage;
    run.stats.maxHitFloor = run.floor;
  }
  log(run, `You play ${cs.map(cardName).join(" + ")} (${total}) for ${damage} damage.`);
  hit(run, damage);
  if (f.phase === "play") enemyTurn(run);
}

/** Take the enemy's attack without playing. */
export function yieldTurn(run: Run): void {
  const f = run.fight;
  if (!f || f.phase !== "play") throw new Error("Not your move.");
  if (f.yieldedLast) throw new Error("You can't yield two turns in a row.");
  f.yieldedLast = true;
  run.stats.yields++;
  f.lastPlay = null;
  log(run, "You yield.");
  enemyTurn(run);
}

/** Discard your whole hand and draw a fresh one. Limited uses per run. */
export function refresh(run: Run): void {
  const f = run.fight;
  if (!f || (f.phase !== "play" && f.phase !== "pay")) throw new Error("Only during a fight.");
  if (run.refreshes <= 0) throw new Error("No Refreshes left.");
  run.refreshes--;
  run.stats.refreshes++;
  run.discard.push(...run.hand.splice(0));
  drawCards(run, handSize(run));
  log(run, "Refresh: a new hand.");
  if (f.phase === "pay") checkCanPay(run);
  else checkEmptyHanded(run);
}

function hit(run: Run, damage: number) {
  const f = run.fight!;
  f.enemy.hp -= damage;
  if (f.enemy.hp <= 0) winFight(run, f.enemy.hp === 0);
}

// ─── The enemy's turn ────────────────────────────────────────────────────────

function enemyTurn(run: Run) {
  const f = run.fight!;
  f.attacksLeft = f.enemy.trick.k === "twice" ? 2 : 1;
  if (f.enemy.trick.k === "hex") {
    const junk: Card = { uid: run.nextUid++, def: f.enemy.trick.card, value: 0, suit: null };
    const at = Math.floor(next(run.rng) * (run.draw.length + 1));
    run.draw.splice(at, 0, junk);
    log(run, `${f.enemy.name} slips ${cardName(junk)} into your deck.`);
  }
  nextAttack(run);
}

export function incomingAttack(run: Run): number {
  const f = run.fight!;
  const heavy = run.hand.reduce((s, c) => s + sumEffect(c, "heavy"), 0);
  const retreat = hasGuide(run, "retreat") ? 1 : 0;
  return Math.max(0, f.enemy.attack + heavy - f.shield - retreat);
}

function nextAttack(run: Run) {
  const f = run.fight!;
  if (f.attacksLeft <= 0) return endEnemyTurn(run);
  f.attacksLeft--;
  const owed = incomingAttack(run);
  if (owed <= 0) {
    log(run, `${f.enemy.name} attacks. Your shield holds.`);
    return nextAttack(run);
  }
  f.owed = owed;
  f.phase = "pay";
  log(run, `${f.enemy.name} attacks for ${owed}. Discard cards worth ${owed}.`);
  checkCanPay(run);
}

function checkCanPay(run: Run) {
  const f = run.fight!;
  if (payCapacity(run) < f.owed && run.refreshes <= 0) loseFight(run, "couldn't cover the attack");
}

export function payError(run: Run, uids: number[]): string | null {
  const f = run.fight;
  if (!f || f.phase !== "pay") return "Nothing to pay.";
  const cs = uids.map((u) => run.hand.find((c) => c.uid === u));
  if (cs.some((c) => !c)) return "That card isn't in your hand.";
  const worth = (cs as Card[]).reduce((s, c) => s + payValue(c), 0);
  if (worth < f.owed) return `Worth ${worth}; you owe ${f.owed}.`;
  return null;
}

export function pay(run: Run, uids: number[]): void {
  const err = payError(run, uids);
  if (err) throw new Error(err);
  const f = run.fight!;
  const cs = takeFromHand(run, uids);
  run.discard.push(...cs);
  log(run, `You let go of ${cs.map(cardName).join(", ")}.`);

  const recoverN = cs.reduce((s, c) => s + sumEffect(c, "onPayRecover"), 0);
  if (recoverN) recover(run, recoverN);
  if (cs.length >= 3 && hasGuide(run, "sound_bath")) drawCards(run, 1);
  f.phase = "play";
  const dmg = cs.reduce((s, c) => s + sumEffect(c, "onPayDamage"), 0);
  if (dmg) {
    log(run, `Letting go deals ${dmg}.`);
    hit(run, dmg);
    if (f.phase !== "play") return;
  }
  nextAttack(run);
}

function endEnemyTurn(run: Run) {
  const f = run.fight!;
  const t = f.enemy.trick;
  if (t.k === "rage") f.enemy.attack += t.n;
  if (t.k === "regen") f.enemy.hp = Math.min(f.enemy.maxHp, f.enemy.hp + t.n);
  if (f.turn >= CONFIG.fatigueTurn) f.shield = Math.floor(f.shield / 2);
  f.turn++;
  run.stats.turns++;
  f.phase = "play";
  checkEmptyHanded(run);
}

/** An empty hand with no Refresh left is the end. */
function checkEmptyHanded(run: Run) {
  const f = run.fight!;
  if (f.phase === "play" && run.hand.filter((c) => !isJunk(c)).length === 0 && run.refreshes <= 0) {
    loseFight(run, "empty-handed");
  }
}

// ─── Ending ──────────────────────────────────────────────────────────────────

function stripJunk(run: Run) {
  run.draw = run.draw.filter((c) => !isJunk(c));
  run.hand = run.hand.filter((c) => !isJunk(c));
  run.discard = run.discard.filter((c) => !isJunk(c));
}

export const TIER_GOLD: Record<Tier, () => [number, number]> = {
  normal: () => CONFIG.fightGold,
  elite: () => CONFIG.eliteGold,
  boss: () => [CONFIG.bossGold, CONFIG.bossGold],
};

function winFight(run: Run, exact: boolean) {
  const f = run.fight!;
  f.phase = "won";
  f.exact = exact;
  stripJunk(run);
  if (hasGuide(run, "blavatsky")) run.carriedShield = Math.min(5, Math.floor(f.shield / 2));
  if (hasGuide(run, "meditation_mount")) recover(run, 4);
  if (exact && hasGuide(run, "pink_moment_g")) recover(run, 5);
  if (f.enemy.tier === "boss") {
    recover(run, CONFIG.bossRecover);
    drawCards(run, handSize(run));
    if (hasGuide(run, "ojai_day")) run.refreshes++;
  }
  log(run, exact ? `Exact. ${f.enemy.name} is caught.` : `${f.enemy.name} is defeated.`);

  const [lo, hi] = TIER_GOLD[f.enemy.tier]();
  let gold = int(run.rng, lo, hi);
  if (hasGuide(run, "realtor")) gold += exact ? 20 : 6;
  let caught: Card | null = null;
  if (exact) {
    run.stats.catches++;
    const def = cardDef(`catch_${f.enemy.id}`);
    caught = { uid: run.nextUid++, def: def.id, value: def.value, suit: def.suit };
    run.draw.unshift(caught); // Regicide: the caught royal goes on top of your deck
  }
  giveFightReward(run, f.enemy.tier, gold, caught);
}

function loseFight(run: Run, why: string) {
  const f = run.fight!;
  f.phase = "lost";
  run.stats.diedTo = f.enemy.id;
  log(run, `You fall to ${f.enemy.name}: ${why}.`);
  run.phase = "over";
}
