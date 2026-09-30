/**
 * A heuristic player. Not smart, but consistent: each turn it tries every
 * order of up to 3 cards from its hand (so it sees pairs), scores each
 * sequence (a kill if it can, block up to the enemy's incoming attack,
 * otherwise damage, with draw and recall valued when there's an action
 * left to use them) and plays the first card of the best one. Good enough
 * to rank cards and find broken things; not a measure of how well a human
 * can play.
 */
import { CONFIG, cycleError, incoming, isJunk, playError, previewPlay, sumEffect, type Card, type Run } from "@gojai/core";

export type Move = { k: "play"; uid: number } | { k: "cycle"; uid: number } | { k: "discard"; uids: number[] } | { k: "end" };

export interface Decision {
  move: Move;
  /** Gap between the best and second-best option, relative to the best. */
  margin: number;
}

/** Every card you could play right now. */
export function legalPlays(run: Run): Card[] {
  return run.hand.filter((c) => !isJunk(c) && !playError(run, c.uid));
}

/** Score playing `seq` in order this turn. Temporarily marks cards played to get matching right. */
function scoreSequence(run: Run, seq: Card[]): number {
  const f = run.fight!;
  const e = f.enemy;
  const saved = { plays: f.turnPlays, actions: f.actions, count: f.plays };
  let threat = Math.max(0, incoming(run) - f.block);
  let hp = e.hp;
  let eBlock = e.block;
  let score = 0;
  try {
    for (let i = 0; i < seq.length; i++) {
      const c = seq[i];
      const p = previewPlay(run, c.uid);
      if (!p) return -Infinity;
      const soaked = Math.min(eBlock, p.damage);
      eBlock -= soaked;
      const through = p.damage - soaked;
      if (through >= hp) return score + 1000 + (through === hp ? 60 : 0) - i;
      hp -= through;
      score += through;
      const useful = Math.min(p.block, threat);
      threat -= useful;
      score += useful * 1.3 + (p.block - useful) * 0.05;
      const future = i < seq.length - 1 || f.actions - p.cost > seq.length - 1 - i ? 2.5 : 0.2;
      score += Math.min(p.draw, run.draw.length + run.discard.length) * future;
      score += Math.min(p.recall, run.discard.length) * future * 1.2;
      // Cards that pay off when let go are better held
      score -= sumEffect(c, "onDiscardDamage") + sumEffect(c, "onDiscardBlock");
      f.turnPlays = [...f.turnPlays, c];
      f.actions -= p.cost;
      f.plays++;
    }
    return score;
  } finally {
    f.turnPlays = saved.plays;
    f.actions = saved.actions;
    f.plays = saved.count;
  }
}

export function chooseMove(run: Run): Decision {
  const f = run.fight!;
  // A club asked which cards to discard: junk and discard-effect cards first, then small cards
  if (f.discarding > 0) {
    const worth = (c: Card) => (isJunk(c) ? -100 : -(sumEffect(c, "onDiscardDamage") + sumEffect(c, "onDiscardBlock")) * 3 + c.value);
    const uids = run.hand
      .filter((c) => worth(c) <= 4)
      .sort((a, b) => worth(a) - worth(b))
      .slice(0, f.discarding)
      .map((c) => c.uid);
    return { move: { k: "discard", uids }, margin: 1 };
  }
  const cards = legalPlays(run);
  const depth = Math.min(f.actions, cards.length, 3);
  // Best sequence starting with each card
  const bestFirst = new Map<number, number>();
  const walk = (seq: Card[]) => {
    if (seq.length) {
      const s = scoreSequence(run, seq);
      const k = seq[0].uid;
      if (s > (bestFirst.get(k) ?? -Infinity)) bestFirst.set(k, s);
    }
    if (seq.length >= Math.max(1, depth)) return;
    for (const c of cards) if (!seq.includes(c)) walk([...seq, c]);
  };
  if (cards.length) walk([]);

  const options: { move: Move; score: number }[] = [{ move: { k: "end" }, score: 0 }];
  for (const [uid, score] of bestFirst) options.push({ move: { k: "play", uid }, score });
  // Swapping a card for a fresh one: worth it for junk, or a small card nothing needs right now
  if (CONFIG.cycleCost !== null && run.draw.length > 0) {
    for (const c of run.hand) {
      if (cycleError(run, c.uid)) continue;
      const kept = c.suit === "diamonds" || c.suit === "clubs" ? 1 : 0.4;
      options.push({ move: { k: "cycle", uid: c.uid }, score: isJunk(c) ? 5 : 1.8 - c.value * kept });
    }
  }
  options.sort((a, b) => b.score - a.score);
  const [a, b] = options;
  const margin = b ? Math.abs(a.score - b.score) / Math.max(1, Math.abs(a.score)) : 1;
  return { move: a.move, margin };
}
