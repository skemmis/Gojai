/**
 * A heuristic player. Not smart, but consistent: each action it takes the
 * play worth most right now: a kill if it can, block up to the enemy's
 * incoming attack, otherwise damage, with draw and recall valued when
 * there are actions left to use them. Good enough to rank cards and find
 * broken things; not a measure of how well a human can play.
 */
import { incoming, isJunk, playError, previewPlay, sumEffect, type Card, type Run } from "@gojai/core";

export type Move = { k: "play"; uids: number[] } | { k: "end" };

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

export function chooseMove(run: Run): Decision {
  const f = run.fight!;
  const e = f.enemy;
  const threat = Math.max(0, incoming(run) - f.block);
  const options: { move: Move; score: number }[] = [{ move: { k: "end" }, score: 0 }];

  for (const uids of legalPlays(run)) {
    const p = previewPlay(run, uids)!;
    const spent = uids.map((u) => run.hand.find((c) => c.uid === u)!);
    const actionsAfter = f.actions - p.cost;
    let score: number;
    if (p.kills) {
      score = 1000 + (p.exact ? 60 : 0) - p.total * 0.1;
    } else {
      const through = Math.max(0, p.damage - e.block);
      score = through * 1.0;
      score += Math.min(p.block, threat) * 1.3 + Math.max(0, p.block - threat) * 0.05;
      // Cards drawn or recalled only matter if there's an action left to play them
      const future = actionsAfter > 0 ? 2.5 : 0.2;
      score += Math.min(p.draw, run.draw.length + run.discard.length) * future;
      score += Math.min(p.recall, run.discard.length) * future * 1.2;
      // Cards that pay off when let go are better held
      score -= spent.reduce((s, c) => s + sumEffect(c, "onDiscardDamage") + sumEffect(c, "onDiscardBlock"), 0);
      // Spend an action on the biggest thing; small free plays are always fine
      if (p.cost === 0) score += 0.5;
    }
    options.push({ move: { k: "play", uids }, score });
  }

  options.sort((a, b) => b.score - a.score);
  const [a, b] = options;
  const margin = b ? Math.abs(a.score - b.score) / Math.max(1, Math.abs(a.score)) : 1;
  return { move: a.move, margin };
}
