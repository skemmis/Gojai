/**
 * The fight, played with a standard deck.
 *
 * A fight opens with a hand of 8 and you KEEP your hand between turns
 * (Regicide style): the only way to get more cards is to play diamonds.
 * An empty draw pile reshuffles the discard pile (Slay the Spire style). Each turn you get 3 ACTIONS; each card you
 * play costs 1. Each suit does one job, with N = the card's value:
 *
 *   ♣ clubs    discard: pick up to N cards in your hand to discard
 *              (firing their discard effects), to dig toward better ones
 *   ♦ diamonds draw N
 *   ♥ hearts   N block against this turn's attacks
 *   ♠ spades   hit for N (only spades hit)
 *
 * (Every rule here is a CONFIG switch, so the lab can compare them: the old
 * "every card hits, spades double" (allDamage) and "draw 5 a turn, enemies
 * immune to a suit" are still one setConfig away.)
 *
 * GUIDES are Balatro-joker style: several grow as you play (Farmers Market,
 * Crystal Shop, Sound Bath, Meditation Mount, Arcade), counted in run.grow
 * and fight.grow and shown on the fight screen.
 *
 * MATCHING: play a card of the same value as one you already played this
 * turn, in a different suit, and it counts double (a pair). A third of
 * that value in yet another suit counts triple.
 *
 * The enemy's next move (its INTENT) is always visible, so you know when
 * to block and when to go all in. End your turn: the enemy acts, your
 * block wears off, and you play on with the hand you kept.
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

/** A growing Guide's count: for the run, or for this fight (Farmers Market, Arcade). */
export function growth(run: Run, id: string): number {
  const fightOnly = id === "farmers_market" || id === "arcade";
  const store = fightOnly ? run.fight?.grow : run.grow;
  return store?.[id] ?? 0;
}

function grow(run: Run, id: string, by = 1) {
  if (!hasGuide(run, id)) return;
  const fightOnly = id === "farmers_market" || id === "arcade";
  const store = fightOnly ? (run.fight!.grow ??= {}) : (run.grow ??= {});
  store[id] = (store[id] ?? 0) + by;
}

/** Spades' bonus from growing Guides. */
function spadeBonus(run: Run): number {
  return growth(run, "farmers_market") + Math.floor(growth(run, "sound_bath") / 4);
}

/** The small number a Guide shows on the fight screen, or null when it doesn't count anything. */
export function guideCounter(run: Run, id: string): { n: number; label: string } | null {
  const n = (x: number, one: string, many: string) => ({ n: x, label: x === 1 ? one : many });
  switch (id) {
    case "farmers_market": return n(growth(run, id), "Spades hit +1 this fight.", `Spades hit +${growth(run, id)} this fight.`);
    case "crystal_shop": return n(growth(run, id), "Hearts block +1.", `Hearts block +${growth(run, id)}.`);
    case "sound_bath": {
      const k = Math.floor(growth(run, id) / 4);
      return { n: k, label: `Spades hit +${k}. ${growth(run, id) % 4} of the next 4 discards done.` };
    }
    case "meditation_mount": return { n: 2 * growth(run, id), label: `You start each fight with ${2 * growth(run, id)} block.` };
    case "arcade": {
      const k = 4 - (growth(run, id) % 4);
      return n(k, "Strikes on your next play.", `Strikes in ${k} plays.`);
    }
    default: return null;
  }
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
      if (run.discard.length === 0 || !CONFIG.reshuffle) break;
      run.draw = shuffle(run.rng, run.discard.splice(0));
      log(run, "Your discard pile is shuffled into your deck.");
    }
    run.hand.push(run.draw.shift()!);
    drawn++;
  }
  return drawn;
}

/**
 * Clubs: bring your best n non-junk cards back from the discard pile, to
 * your hand or (clubsTo "deck") shuffled under your draw pile.
 */
export function recall(run: Run, n: number): Card[] {
  const toHand = CONFIG.clubsTo === "hand";
  const pool = run.discard.filter((c) => !isJunk(c));
  // To your hand: your best cards. Back into the deck: any n of them, like shuffling a handful back in
  const best = (toHand ? pool.sort((a, b) => b.value - a.value) : shuffle(run.rng, pool)).slice(
    0,
    Math.max(0, toHand ? Math.min(n, CONFIG.maxHand - run.hand.length) : n),
  );
  for (const c of best) run.discard.splice(run.discard.indexOf(c), 1);
  if (toHand) run.hand.push(...best);
  else run.draw = shuffle(run.rng, [...run.draw, ...best]);
  return best;
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

/** Fights won so far this run (every fight you lose ends it). */
export function fightsWon(run: Run): number {
  return run.stats.fights - (run.fight && run.fight.phase !== "won" ? 1 : 0);
}

/** Which difficulty tier the next or current fight is in (0 = first), when difficulty is stepped. */
export function difficultyTier(run: Run): number {
  return CONFIG.tierEvery > 0 ? Math.floor(fightsWon(run) / CONFIG.tierEvery) : 0;
}

export function scaledEnemy(id: string, floor: number, tier = 0): EnemyState {
  const d = ENEMY_BY_ID[id];
  const stepped = CONFIG.tierEvery > 0;
  const f = stepped ? 0 : floor - 1;
  const hp = Math.round(d.hp * CONFIG.enemyHpMult * (stepped ? 1 + CONFIG.tierHp * tier : 1 + CONFIG.hpGrowth * f));
  return {
    id: d.id,
    name: d.name,
    tier: d.tier,
    hp,
    maxHp: hp,
    block: 0,
    scale: stepped ? 1 + CONFIG.tierAtk * tier : 1 + CONFIG.attackGrowth * f,
    buff: 0,
    suits: CONFIG.immunity ? d.suits.slice() : [],
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
  const enemy = scaledEnemy(enemyId, run.floor, difficultyTier(run));
  run.draw = shuffle(run.rng, [...run.draw, ...run.hand, ...run.discard]);
  run.hand = [];
  run.discard = [];
  run.fight = {
    enemy,
    block: (hasGuide(run, "leadbeater") ? 6 : 0) + (hasGuide(run, "meditation_mount") ? 2 * growth(run, "meditation_mount") : 0),
    actions: 0,
    turn: 0,
    plays: 0,
    turnPlays: [],
    hpLost: 0,
    discarding: 0,
    grow: {},
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
  f.turnPlays = [];
  run.stats.turns++;
  f.actions = CONFIG.actionsPerTurn + (f.turn === 1 && hasGuide(run, "ojai_day") ? 1 : 0);
  drawCards(run, (f.turn === 1 ? CONFIG.startHand : CONFIG.drawPerTurn) + (hasGuide(run, "oak_grove") ? 1 : 0));
  // Out of cards entirely (nothing playable, nothing to draw): the discard pile is shuffled back and you draw a fresh hand
  if (!CONFIG.reshuffle && run.draw.length === 0 && !run.hand.some((c) => !isJunk(c)) && run.discard.length) {
    run.draw = shuffle(run.rng, run.discard.splice(0));
    log(run, "Out of cards: your discard pile is shuffled back in.");
    drawCards(run, CONFIG.startHand);
    run.stats.deckOuts++;
  }
  if (!run.hand.some((c) => !isJunk(c))) run.stats.deadHands++;
}

// ─── Playing ─────────────────────────────────────────────────────────────────

export function actionCost(c: Card): number {
  return has(c, "free") ? 0 : 1;
}

/** null if the card can be played, else the reason it can't. */
export function playError(run: Run, uid: number): string | null {
  const f = run.fight;
  if (!f || f.phase !== "play") return "Not your move.";
  if (f.discarding > 0) return "Pick the cards to discard first.";
  const c = run.hand.find((x) => x.uid === uid);
  if (!c) return "That card isn't in your hand.";
  if (isJunk(c)) return "Junk can't be played.";
  if (f.actions < actionCost(c)) return "No actions left. End your turn.";
  return null;
}

/** null if this card can be discarded to draw one, else the reason it can't. Junk can. */
export function cycleError(run: Run, uid: number): string | null {
  const f = run.fight;
  if (CONFIG.cycleCost === null) return "You can't swap cards.";
  if (!f || f.phase !== "play") return "Not your move.";
  if (!run.hand.some((x) => x.uid === uid)) return "That card isn't in your hand.";
  if (f.actions < CONFIG.cycleCost) return "No actions left. End your turn.";
  return null;
}

/** Discard a card to draw one. Costs CONFIG.cycleCost actions and doesn't count as a play. */
export function cycle(run: Run, uid: number): void {
  const err = cycleError(run, uid);
  if (err) throw new Error(err);
  const f = run.fight!;
  const c = run.hand.find((x) => x.uid === uid)!;
  run.hand.splice(run.hand.indexOf(c), 1);
  f.actions -= CONFIG.cycleCost!;
  if (!isJunk(c)) run.discard.push(c);
  run.stats.cycles++;
  const got = drawCards(run, 1);
  log(run, `You let go of ${cardName(c)}${got ? " and draw a card" : ", but your deck is empty"}.`);
}

/**
 * Matching: how many cards of the same value, in a different suit, you've
 * already played this turn. A pair doubles the card's value; three of a
 * kind triples it.
 */
export function matches(run: Run, c: Card): number {
  const mine = cardSuits(run, c);
  const other = new Set<string>();
  for (const p of run.fight!.turnPlays) {
    if (p.value !== c.value) continue;
    const theirs = cardSuits(run, p);
    if (theirs.length > 1 || mine.length > 1) other.add(`wild${p.uid}`); // wild cards match anything
    else if (theirs[0] !== mine[0]) other.add(theirs[0]);
  }
  return other.size;
}

export function multiplier(run: Run, c: Card): number {
  const m = matches(run, c);
  if (m === 0) return 1;
  return 1 + m + (hasGuide(run, "krishnamurti") ? 1 : 0);
}

export interface PowerPreview {
  suit: Suit;
  /** What it does: damage for spades, block for hearts, cards for diamonds/clubs. */
  amount: number;
  immune: boolean;
}

export interface PlayPreview {
  /** The card's value after the matching bonus. */
  total: number;
  mult: number;
  damage: number;
  block: number;
  draw: number;
  recall: number;
  cost: number;
  powers: PowerPreview[];
  kills: boolean;
  exact: boolean;
}

function playNumbers(run: Run, c: Card): PlayPreview {
  const f = run.fight!;
  const e = f.enemy;
  const mult = multiplier(run, c);
  const suits = cardSuits(run, c);
  // The Ceremony: the third card of one suit in a turn does double
  const third = hasGuide(run, "ceremony") && suits.some((s) => f.turnPlays.filter((p) => cardSuits(run, p).includes(s)).length >= 2);
  const total = c.value * mult * (third ? 2 : 1);
  const pierce = has(c, "pierce");
  const silenced = f.plays === 0 && e.passive.k === "silence";
  const blocked = (s: Suit) => silenced || (!pierce && e.suits.includes(s));

  let damage = sumEffect(c, "dmg");
  let block = sumEffect(c, "block");
  let draw = sumEffect(c, "draw");
  let recallN = 0;
  const powers: PowerPreview[] = [];
  for (const s of POWER_ORDER) {
    if (!suits.includes(s)) continue;
    const immune = blocked(s);
    let amount = 0;
    if (s === "clubs") amount = CONFIG.powerByValue ? total : 1 + Math.floor(total / CONFIG.clubsPer);
    if (s === "diamonds") amount = CONFIG.powerByValue ? total : 1 + Math.floor(total / CONFIG.diamondsPer);
    if (s === "hearts") amount = total + growth(run, "crystal_shop");
    if (s === "spades") {
      amount = (CONFIG.allDamage ? 2 * total : total) + spadeBonus(run);
      if (mult > 1 && hasGuide(run, "besant")) amount += 4;
      if (c.value >= 7 && hasGuide(run, "libbey")) amount += 3;
      // The Life Coach: your first spade each turn hits double
      if (hasGuide(run, "life_coach") && !f.turnPlays.some((p) => cardSuits(run, p).includes("spades"))) amount *= 2;
    }
    powers.push({ suit: s, amount, immune });
    if (immune) continue;
    if (s === "clubs") recallN += amount;
    if (s === "diamonds") draw += amount;
    if (s === "hearts") block += amount;
    if (s === "spades") damage += amount;
  }
  // Every card hits for its value; spades' power already counts it
  if (CONFIG.allDamage && !suits.includes("spades")) damage += total;
  if (e.passive.k === "armor" && damage > 0) damage = Math.max(0, damage - e.passive.n);
  const through = Math.max(0, damage - e.block);
  return {
    total,
    mult,
    damage,
    block,
    draw,
    recall: recallN,
    cost: actionCost(c),
    powers,
    kills: through >= e.hp,
    exact: through === e.hp,
  };
}

export function previewPlay(run: Run, uid: number): PlayPreview | null {
  if (playError(run, uid)) return null;
  return playNumbers(run, run.hand.find((c) => c.uid === uid)!);
}

export function play(run: Run, uid: number): void {
  const err = playError(run, uid);
  if (err) throw new Error(err);
  const f = run.fight!;
  const c = run.hand.find((x) => x.uid === uid)!;
  const p = playNumbers(run, c);
  run.hand.splice(run.hand.indexOf(c), 1);
  f.actions -= p.cost;

  for (const pw of p.powers) {
    if (pw.immune) {
      run.stats.immuneHits++;
      continue;
    }
    run.stats.powerUses[pw.suit]++;
    run.stats.powerTotal[pw.suit] += pw.amount;
  }
  f.turnPlays.push(c);
  if (p.powers.some((x) => x.suit === "clubs" && !x.immune)) grow(run, "farmers_market");
  if (p.powers.some((x) => x.suit === "diamonds" && !x.immune)) grow(run, "crystal_shop");
  if (p.recall && CONFIG.clubsPower === "discard") {
    // You pick which ones next (see discardCards), after the rest of this play resolves
    f.discarding = Math.min(p.recall, run.hand.length);
  } else if (p.recall) {
    const back = recall(run, p.recall);
    if (back.length) log(run, `Clubs: ${back.map(cardName).join(", ")} back to your ${CONFIG.clubsTo === "hand" ? "hand" : "deck"}.`);
  }
  run.discard.push(c); // after the recall, so a club can't bring itself back
  if (p.draw) drawCards(run, p.draw);
  if (p.block) f.block += p.block;

  f.plays++;
  run.stats.plays++;
  if (p.mult > 1) run.stats.matches++;
  f.lastPlay = {
    cards: [c.uid],
    damage: p.damage,
    powers: p.powers.filter((x) => !x.immune).map((x) => x.suit),
    immune: p.powers.filter((x) => x.immune).map((x) => x.suit),
  };
  if (p.damage > run.stats.maxHit) {
    run.stats.maxHit = p.damage;
    run.stats.maxHitFloor = run.floor;
  }
  const bits = [p.damage ? `${p.damage} damage` : "", p.block ? `${p.block} block` : ""].filter(Boolean).join(", ");
  const tag = p.mult === 2 ? " (pair ×2)" : p.mult > 2 ? ` (match ×${p.mult})` : "";
  log(run, `You play ${cardName(c)}${tag}${bits ? `: ${bits}` : ""}.`);
  if (p.damage) hitEnemy(run, p.damage);
  // The Arcade: every 4th card you play in a fight deals 6
  if (f.phase === "play" && hasGuide(run, "arcade")) {
    grow(run, "arcade");
    if (growth(run, "arcade") % 4 === 0) {
      log(run, "The Arcade strikes for 6.");
      hitEnemy(run, 6);
    }
  }
}

/**
 * Clubs: discard the cards you picked (up to the club's value; none is fine).
 * Each fires its discard effect: damage now, or block now.
 */
export function discardCards(run: Run, uids: number[]): void {
  const f = run.fight;
  if (!f || f.phase !== "play" || f.discarding <= 0) throw new Error("Nothing to discard.");
  if (uids.length > f.discarding) throw new Error(`Discard at most ${f.discarding}.`);
  const picked = uids.map((uid) => {
    const c = run.hand.find((x) => x.uid === uid);
    if (!c) throw new Error("That card isn't in your hand.");
    return c;
  });
  f.discarding = 0;
  for (const c of picked) {
    run.hand.splice(run.hand.indexOf(c), 1);
    if (!isJunk(c)) run.discard.push(c);
    run.stats.discards++;
    f.block += sumEffect(c, "onDiscardBlock");
    grow(run, "sound_bath");
    const dmg = sumEffect(c, "onDiscardDamage");
    if (dmg) {
      log(run, `Discarding ${cardName(c)} deals ${dmg}.`);
      hitEnemy(run, dmg);
      if (f.phase !== "play") return;
    }
  }
  if (picked.length) log(run, `You discard ${picked.map(cardName).join(", ")}.`);
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
  if (f.turnPlays.length === 0) run.stats.idleTurns++;
  f.discarding = 0; // a club's discard you never picked is just skipped

  // Unplayed cards: discard (with their "let go" effects), except retained ones
  let nextBlock = 0;
  const kept: Card[] = [];
  for (const c of run.hand) {
    if (CONFIG.keepHand || has(c, "retain")) {
      kept.push(c);
      continue;
    }
    nextBlock += sumEffect(c, "onDiscardBlock");
    grow(run, "sound_bath");
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
    grow(run, "meditation_mount");
  }
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
