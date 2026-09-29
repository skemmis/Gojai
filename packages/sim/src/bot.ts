/**
 * A heuristic player. Not smart, but consistent: it values damage, the
 * powers, catching, and keeping enough cards in hand to survive the next
 * attack. Good enough to rank cards and find broken things; not a measure
 * of how well a human can play.
 */
import {
  cardSuits,
  hasGuide,
  handSize,
  incomingAttack,
  isJunk,
  payValue,
  playError,
  previewPlay,
  sumEffect,
  type Card,
  type Run,
} from "@gojai/core";

export type Move = { k: "play"; uids: number[] } | { k: "yield" } | { k: "refresh" };

export interface Decision {
  move: Move;
  /** Gap between the best and second-best option, relative to the best. */
  margin: number;
}

/** Every legal play from this hand. */
export function legalPlays(run: Run): number[][] {
  const cards = run.hand.filter((c) => !isJunk(c));
  const out: number[][] = [];
  const seen = new Set<string>();
  const add = (uids: number[]) => {
    const key = uids.slice().sort((a, b) => a - b).join(",");
    if (seen.has(key) || playError(run, uids)) return;
    seen.add(key);
    out.push(uids);
  };
  for (const c of cards) add([c.uid]);
  // Ace + any card
  for (const a of cards.filter((c) => c.value === 1)) for (const b of cards) if (b.uid !== a.uid) add([a.uid, b.uid]);
  // Same-value combos
  const byValue = new Map<number, Card[]>();
  for (const c of cards) byValue.set(c.value, [...(byValue.get(c.value) ?? []), c]);
  for (const group of byValue.values()) {
    const n = group.length;
    for (let mask = 3; mask < 1 << n; mask++) {
      const pick = group.filter((_, i) => mask & (1 << i));
      if (pick.length >= 2 && pick.length <= 4) add(pick.map((c) => c.uid));
    }
  }
  return out;
}

/** How much we'd rather keep a card than spend it. */
function keepValue(run: Run, c: Card): number {
  if (isJunk(c)) return -5;
  let v = c.value;
  const suits = cardSuits(run, c);
  if (suits.includes("spades")) v += 2;
  if (suits.includes("diamonds")) v += 1.5;
  if (suits.includes("hearts")) v += 1;
  if (suits.includes("clubs")) v += 1;
  if (c.value === 1) v += 3;
  if (suits.length > 1) v += 3;
  v -= sumEffect(c, "payBonus") * 0.8 + sumEffect(c, "onPayDamage") * 0.8 + sumEffect(c, "onPayRecover") * 0.8;
  return v;
}

/** The cheapest set of cards that covers `owed`. Junk rides along for free. */
export function choosePayment(run: Run, owed: number): number[] | null {
  const junk = run.hand.filter(isJunk);
  const cards = run.hand.filter((c) => !isJunk(c));
  const n = cards.length;
  let best: { cost: number; uids: number[] } | null = null;
  for (let mask = 1; mask < 1 << n; mask++) {
    let worth = 0;
    let cost = 0;
    const uids: number[] = [];
    for (let i = 0; i < n; i++)
      if (mask & (1 << i)) {
        worth += payValue(cards[i]);
        cost += keepValue(run, cards[i]);
        uids.push(cards[i].uid);
      }
    if (worth < owed) continue;
    cost += (worth - owed) * 0.3;
    if (!best || cost < best.cost) best = { cost, uids };
  }
  if (!best) return null;
  return [...best.uids, ...junk.map((c) => c.uid)];
}

const AVG_DRAW = 5;

export function chooseMove(run: Run): Decision {
  const f = run.fight!;
  const e = f.enemy;
  const options: { move: Move; score: number }[] = [];
  const nonJunk = run.hand.filter((c) => !isJunk(c));
  if (nonJunk.length === 0) return { move: run.refreshes > 0 ? { k: "refresh" } : { k: "yield" }, margin: 1 };

  const turnsLeft = Math.max(1, e.hp / 12);
  for (const uids of legalPlays(run)) {
    const p = previewPlay(run, uids)!;
    const spent = uids.map((u) => run.hand.find((c) => c.uid === u)!);
    const spentKeep = spent.reduce((s, c) => s + keepValue(run, c), 0);
    let score = -spentKeep;
    if (p.kills) {
      score += 200 + (p.exact ? 60 : 0);
    } else {
      score += (p.damage / e.hp) * 40;
      let drawn = 0;
      let shield = f.shield;
      for (const pw of p.powers) {
        if (pw.immune) continue;
        if (pw.suit === "clubs") score += Math.min(pw.n, run.discard.length) * 0.9;
        if (pw.suit === "diamonds") {
          drawn = Math.min(pw.n + (hasGuide(run, "libbey") ? 1 : 0), handSize(run) - (run.hand.length - uids.length), run.draw.length);
          score += drawn * 3;
        }
        if (pw.suit === "hearts") {
          const s = pw.n + (hasGuide(run, "crystal_shop") ? 2 : 0);
          const useful = Math.max(0, Math.min(s, e.attack - shield));
          shield += s;
          score += useful * Math.min(turnsLeft, 4) * 0.9;
        }
      }
      for (const c of spent) drawn += sumEffect(c, "draw");
      // Can we still cover the attack that follows?
      const heavy = run.hand.reduce((s, c) => s + sumEffect(c, "heavy"), 0);
      const owed = Math.max(0, e.attack + heavy - shield - (hasGuide(run, "retreat") ? 1 : 0));
      const left = run.hand.filter((c) => !uids.includes(c.uid)).reduce((s, c) => s + payValue(c), 0) + drawn * AVG_DRAW;
      if (left < owed) score -= run.refreshes > 0 ? 60 : 400;
      else score -= owed * 0.6; // the attack will cost us about this much
    }
    options.push({ move: { k: "play", uids }, score });
  }
  // Yield: no progress, full attack
  const owed = incomingAttack(run);
  const cap = run.hand.reduce((s, c) => s + payValue(c), 0);
  if (!f.yieldedLast) options.push({ move: { k: "yield" }, score: cap < owed ? -500 : -owed * 0.6 - 15 });
  if (run.refreshes > 0 && nonJunk.length <= 2) options.push({ move: { k: "refresh" }, score: -20 });

  options.sort((a, b) => b.score - a.score);
  const [a, b] = options;
  const margin = b ? Math.abs(a.score - b.score) / Math.max(1, Math.abs(a.score)) : 1;
  return { move: a.move, margin };
}

