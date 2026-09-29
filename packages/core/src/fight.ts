/**
 * The fight, Slay the Spire style, played with a standard deck.
 *
 * Each turn you draw 5 and get 3 ACTIONS. Playing a card costs 1 action;
 * so does a combo (cards of the same value totalling ≤ 10, or an Ace plus
 * any card), which is how you squeeze more out of a turn. Each suit does
 * one job, with N = the play's total value:
 *
 *   ♣ clubs    recall: your best card(s) come back from the discard pile
 *   ♦ diamonds draw 1 + floor(N / 4)
 *   ♥ hearts   N block against this turn's attacks
 *   ♠ spades   N damage (the only suit that hits)
 *
 * Powers resolve in that order, unless the enemy is immune to the suit.
 * The enemy's next move (its INTENT) is always visible, so you know when
 * to block and when to go all in. End your turn: unplayed cards are
 * discarded, the enemy acts, your block wears off, and you draw again.
 *
 * Kill the enemy with EXACT damage (HP to exactly 0) and it's caught: it
 * joins your deck as a J/Q/K. Win without losing any HP and it's a PERFECT
 * fight: bonus gold and a guaranteed rare in the card choice.
 *
 * Every function here mutates the run in place. Callers that need an
 * untouched copy (UI undo, bot lookahead) clone first.
 */
import { CONFIG } from "./config";
import { cardDef, ENEMY_BY_ID } from "./content";
import { int, next, shuffle } from "./rng";
import { giveFightReward } from "./rewards";
import type { Card, EnemyAction, EnemyState, Effect, Run, Suit, Tier } from "./types";
import { SUITS } from "./types";

/** The order suit powers resolve in: recall and draw before you defend and hit. */
export const POWER_ORDER: Suit[] = ["clubs", "diamonds", "hearts", "spades"];

// ─── Card helpers ─────────────────────────────────────────────────────────────

export function effects(c: Card): Effect[] {
  return cardDef(c.def).effects;
}

export function has(c: Card, k: Effect["k"]): boolean {
  return effects(c).some((e) => e.k === k);
}

type NumericEffect = Extract<Effect, { n: number }>["k"];
export function sumEffect(c: Card, k: NumericEffect): number {
  let s = 0;
  for (const e of effects(c)) if (e.k === k) s += (e as { n: number }).n;
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

export function cardSuits(run: Run, c: Card): Suit[] {
  if (has(c, "wild")) return SUITS;
  if (c.value === 1 && hasGuide(run, "peoples_market")) return SUITS;
  return c.suit ? [c.suit] : [];
}

// ─── Pile helpers ─────────────────────────────────────────────────────────────

export function drawCards(run: Run, n: number): number {
  let drawn = 0;
  while (drawn < n && run.hand.length < CONFIG.maxHand) {
    if (run.draw.length === 0) {
      if (run.discard.length === 0) break;
      run.draw = shuffle(run.rng, run.discard.splice(0));
      log(run, "Your discard pile is shuffled into your deck.");
    }
    run.hand.push(run.draw.shift()!);
    drawn++;
  }
  return drawn;
}

/** Clubs: bring your best n non-junk cards back from the discard pile to your hand. */
export function recall(run: Run, n: number): Card[] {
  const best = run.discard
    .filter((c) => !isJunk(c))
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(0, Math.min(n, CONFIG.maxHand - run.hand.length)));
  for (const c of best) run.discard.splice(run.discard.indexOf(c), 1);
  run.hand.push(...best);
  return best;
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

export function heal(run: Run, n: number): number {
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + n);
  return run.hp - before;
}

// ─── Enemies ─────────────────────────────────────────────────────────────────

export function scaledEnemy(id: string, floor: number): EnemyState {
  const d = ENEMY_BY_ID[id];
  const f = floor - 1;
  const hp = Math.round(d.hp * (1 + CONFIG.hpGrowth * f));
  return {
    id: d.id,
    name: d.name,
    tier: d.tier,
    hp,
    maxHp: hp,
    block: 0,
    scale: 1 + CONFIG.attackGrowth * f,
    buff: 0,
    suits: d.suits.slice(),
    passive: d.passive,
    intentIdx: 0,
  };
}

/** The enemy's next move, with this floor's numbers filled in. */
export function intent(run: Run): EnemyAction[] {
  const e = run.fight!.enemy;
  const d = ENEMY_BY_ID[e.id];
  const raw = d.intents[e.intentIdx % d.intents.length];
  return raw.map((a) => {
    if (a.k === "attack") return { ...a, n: Math.round(a.n * e.scale) + e.buff };
    if (a.k === "block" || a.k === "heal") return { ...a, n: Math.round(a.n * e.scale) };
    return a;
  });
}

/** Damage one of the enemy's attacks would do to you right now, after heavy junk and Guides. */
export function hitSize(run: Run, n: number): number {
  const heavy = run.hand.reduce((s, c) => s + sumEffect(c, "heavy"), 0);
  return Math.max(0, n + heavy - (hasGuide(run, "retreat") ? 1 : 0));
}

/** Total damage coming at you this turn, before block. */
export function incoming(run: Run): number {
  let total = 0;
  for (const a of intent(run)) if (a.k === "attack") total += hitSize(run, a.n) * (a.times ?? 1);
  return total;
}

// ─── Starting a fight ────────────────────────────────────────────────────────

export function startFight(run: Run, enemyId: string): void {
  const enemy = scaledEnemy(enemyId, run.floor);
  run.draw = shuffle(run.rng, [...run.draw, ...run.hand, ...run.discard]);
  run.hand = [];
  run.discard = [];
  run.fight = {
    enemy,
    block: hasGuide(run, "leadbeater") ? 6 : 0,
    actions: 0,
    turn: 0,
    plays: 0,
    hpLost: 0,
    phase: "play",
    exact: false,
    perfect: false,
    lastPlay: null,
    log: [`${enemy.name} blocks the way.`],
  };
  run.phase = "fight";
  run.stats.fights++;
  startTurn(run);
}

function startTurn(run: Run) {
  const f = run.fight!;
  f.turn++;
  run.stats.turns++;
  f.actions = CONFIG.actionsPerTurn + (f.turn === 1 && hasGuide(run, "ojai_day") ? 1 : 0);
  drawCards(run, CONFIG.drawPerTurn + (hasGuide(run, "oak_grove") ? 1 : 0));
}

// ─── Playing ─────────────────────────────────────────────────────────────────

export function actionCost(cs: Card[]): number {
  return cs.every((c) => has(c, "free")) ? 0 : 1;
}

/** null if the play is legal, else the reason it isn't. */
export function playError(run: Run, uids: number[]): string | null {
  const f = run.fight;
  if (!f || f.phase !== "play") return "Not your move.";
  if (uids.length === 0) return "Pick a card.";
  const cards = uids.map((u) => run.hand.find((c) => c.uid === u));
  if (cards.some((c) => !c)) return "That card isn't in your hand.";
  const cs = cards as Card[];
  if (cs.some(isJunk)) return "Junk can't be played.";
  if (f.actions < actionCost(cs)) return "No actions left. End your turn.";
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

export interface PowerPreview {
  suit: Suit;
  /** What it does: damage for spades, block for hearts, cards for diamonds/clubs. */
  amount: number;
  immune: boolean;
}

export interface PlayPreview {
  total: number;
  damage: number;
  block: number;
  draw: number;
  recall: number;
  cost: number;
  powers: PowerPreview[];
  kills: boolean;
  exact: boolean;
}

function playNumbers(run: Run, cs: Card[]): PlayPreview {
  const f = run.fight!;
  const e = f.enemy;
  const total = cs.reduce((s, c) => s + c.value, 0);
  const suits = new Set<Suit>();
  for (const c of cs) for (const s of cardSuits(run, c)) suits.add(s);
  const pierce = cs.some((c) => has(c, "pierce")) || (f.plays === 0 && hasGuide(run, "ceremony"));
  const silenced = f.plays === 0 && e.passive.k === "silence";
  const blocked = (s: Suit) => silenced || (!pierce && e.suits.includes(s));

  let damage = cs.reduce((s, c) => s + sumEffect(c, "dmg"), 0);
  let block = cs.reduce((s, c) => s + sumEffect(c, "block"), 0);
  let draw = cs.reduce((s, c) => s + sumEffect(c, "draw"), 0);
  let recallN = 0;
  if (hasGuide(run, "arcade")) draw += cs.filter((c) => c.value >= 10).length;
  const powers: PowerPreview[] = [];
  for (const s of POWER_ORDER) {
    if (!suits.has(s)) continue;
    const immune = blocked(s);
    let amount = 0;
    if (s === "clubs") amount = 1 + Math.floor(total / CONFIG.clubsPer) + (hasGuide(run, "farmers_market") ? 1 : 0);
    if (s === "diamonds") amount = 1 + Math.floor(total / CONFIG.diamondsPer) + (hasGuide(run, "libbey") ? 1 : 0);
    if (s === "hearts") amount = total + (hasGuide(run, "crystal_shop") ? 2 : 0);
    if (s === "spades") amount = total + (cs.length > 1 && hasGuide(run, "besant") ? 4 : 0);
    powers.push({ suit: s, amount, immune });
    if (immune) continue;
    if (s === "clubs") recallN += amount;
    if (s === "diamonds") draw += amount;
    if (s === "hearts") block += amount;
    if (s === "spades") damage += amount;
  }
  if (f.plays === 0 && hasGuide(run, "life_coach")) damage *= 2;
  if (e.passive.k === "armor" && damage > 0) damage = Math.max(0, damage - e.passive.n);
  const through = Math.max(0, damage - e.block);
  return {
    total,
    damage,
    block,
    draw,
    recall: recallN,
    cost: actionCost(cs),
    powers,
    kills: through >= e.hp,
    exact: through === e.hp,
  };
}

export function previewPlay(run: Run, uids: number[]): PlayPreview | null {
  if (playError(run, uids)) return null;
  const cs = uids.map((u) => run.hand.find((c) => c.uid === u)!) as Card[];
  return playNumbers(run, cs);
}

export function play(run: Run, uids: number[]): void {
  const err = playError(run, uids);
  if (err) throw new Error(err);
  const f = run.fight!;
  const cs = takeFromHand(run, uids);
  const p = playNumbers(run, cs);
  f.actions -= p.cost;

  for (const pw of p.powers) {
    if (pw.immune) {
      run.stats.immuneHits++;
      continue;
    }
    run.stats.powerUses[pw.suit]++;
    run.stats.powerTotal[pw.suit] += pw.amount;
  }
  run.discard.push(...cs);
  if (p.recall) {
    const back = recall(run, p.recall);
    if (back.length) log(run, `Clubs: ${back.map(cardName).join(", ")} back to your hand.`);
  }
  if (p.draw) drawCards(run, p.draw);
  if (p.block) f.block += p.block;

  f.plays++;
  run.stats.plays++;
  if (cs.length > 1) run.stats.combos++;
  f.lastPlay = {
    cards: cs.map((c) => c.uid),
    damage: p.damage,
    powers: p.powers.filter((x) => !x.immune).map((x) => x.suit),
    immune: p.powers.filter((x) => x.immune).map((x) => x.suit),
  };
  if (p.damage > run.stats.maxHit) {
    run.stats.maxHit = p.damage;
    run.stats.maxHitFloor = run.floor;
  }
  const bits = [p.damage ? `${p.damage} damage` : "", p.block ? `${p.block} block` : ""].filter(Boolean).join(", ");
  log(run, `You play ${cs.map(cardName).join(" + ")}${bits ? `: ${bits}` : ""}.`);
  if (p.damage) hitEnemy(run, p.damage);
}

function hitEnemy(run: Run, damage: number) {
  const f = run.fight!;
  const e = f.enemy;
  const soaked = Math.min(e.block, damage);
  e.block -= soaked;
  e.hp -= damage - soaked;
  if (e.hp <= 0) winFight(run, e.hp === 0);
}

// ─── Ending your turn and the enemy's turn ───────────────────────────────────

export function endTurn(run: Run): void {
  const f = run.fight;
  if (!f || f.phase !== "play") throw new Error("Not your move.");
  run.stats.endTurns++;

  // Unplayed cards: discard (with their "let go" effects), except retained ones
  let nextBlock = 0;
  const kept: Card[] = [];
  for (const c of run.hand) {
    if (has(c, "retain")) {
      kept.push(c);
      continue;
    }
    nextBlock += sumEffect(c, "onDiscardBlock") + (hasGuide(run, "sound_bath") && !isJunk(c) ? 1 : 0);
    const dmg = sumEffect(c, "onDiscardDamage");
    if (dmg) {
      log(run, `Letting go of ${cardName(c)} deals ${dmg}.`);
      hitEnemy(run, dmg);
    }
  }
  const heavyHand = run.hand.slice(); // heavy junk counts while you're holding it
  run.discard.push(...run.hand.filter((c) => !kept.includes(c)));
  run.hand = kept;
  if (f.phase !== "play") return; // a let-go card finished it

  // The enemy acts
  const e = f.enemy;
  e.block = 0;
  const heavy = heavyHand.reduce((s, c) => s + sumEffect(c, "heavy"), 0);
  for (const a of intent(run)) {
    if (a.k === "attack") {
      for (let i = 0; i < (a.times ?? 1); i++) {
        const dmg = Math.max(0, a.n + heavy - (hasGuide(run, "retreat") ? 1 : 0));
        const soaked = Math.min(f.block, dmg);
        f.block -= soaked;
        const hurt = dmg - soaked;
        run.hp -= hurt;
        f.hpLost += hurt;
        run.stats.hpLost += hurt;
        log(run, hurt ? `${e.name} hits you for ${hurt}.` : `${e.name} attacks. Blocked.`);
        if (run.hp <= 0) return loseFight(run);
      }
    } else if (a.k === "block") {
      e.block += a.n;
      log(run, `${e.name} braces for ${a.n}.`);
    } else if (a.k === "buff") {
      e.buff += a.n;
      log(run, `${e.name} gets stronger: attacks +${a.n}.`);
    } else if (a.k === "heal") {
      e.hp = Math.min(e.maxHp, e.hp + a.n);
      log(run, `${e.name} heals ${a.n}.`);
    } else if (a.k === "hex") {
      for (let i = 0; i < a.count; i++) {
        const junk: Card = { uid: run.nextUid++, def: a.card, value: 0, suit: null };
        const at = Math.floor(next(run.rng) * (run.draw.length + 1));
        run.draw.splice(at, 0, junk);
      }
      log(run, `${e.name} shuffles ${a.count > 1 ? `${a.count} × ` : ""}${cardDef(a.card).name} (junk) into your deck.`);
    }
  }
  if (e.passive.k === "regen") e.hp = Math.min(e.maxHp, e.hp + e.passive.n);
  e.intentIdx++;

  // Your block wears off, unless Blavatsky
  if (!hasGuide(run, "blavatsky")) f.block = 0;
  f.block += nextBlock;
  startTurn(run);
}

// ─── Ending the fight ────────────────────────────────────────────────────────

export const TIER_GOLD: Record<Tier, () => [number, number]> = {
  normal: () => CONFIG.fightGold,
  elite: () => CONFIG.eliteGold,
  boss: () => [CONFIG.bossGold, CONFIG.bossGold],
};

/** Put every card back in the deck, minus junk. */
function gatherDeck(run: Run) {
  run.draw = [...run.draw, ...run.hand, ...run.discard].filter((c) => !isJunk(c));
  run.hand = [];
  run.discard = [];
}

function winFight(run: Run, exact: boolean) {
  const f = run.fight!;
  f.phase = "won";
  f.exact = exact;
  f.perfect = f.hpLost === 0;
  gatherDeck(run);
  if (f.perfect) {
    run.stats.perfects++;
    if (hasGuide(run, "pink_moment_g")) heal(run, 6);
  }
  if (hasGuide(run, "meditation_mount")) heal(run, 4);
  if (f.enemy.tier === "boss") heal(run, Math.round(run.maxHp * CONFIG.bossHealPct));
  log(run, exact ? `Exact. ${f.enemy.name} is caught.` : `${f.enemy.name} is defeated.`);
  if (f.perfect) log(run, "Perfect fight: you took no damage.");

  const [lo, hi] = TIER_GOLD[f.enemy.tier]();
  let gold = int(run.rng, lo, hi);
  if (f.perfect) gold += Math.round(gold * CONFIG.perfectGoldPct);
  if (hasGuide(run, "realtor")) gold += exact ? 20 : 6;
  let caught: Card | null = null;
  if (exact) {
    run.stats.catches++;
    const def = cardDef(`catch_${f.enemy.id}`);
    caught = { uid: run.nextUid++, def: def.id, value: def.value, suit: def.suit };
    run.draw.push(caught);
  }
  giveFightReward(run, f.enemy.tier, gold, caught, f.perfect);
}

function loseFight(run: Run) {
  const f = run.fight!;
  f.phase = "lost";
  run.hp = 0;
  run.stats.diedTo = f.enemy.id;
  log(run, `You fall to ${f.enemy.name}.`);
  run.phase = "over";
}
