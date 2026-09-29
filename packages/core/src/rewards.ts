/**
 * Making new cards and Guides, and handing out fight rewards.
 */
import { CONFIG } from "./config";
import { CARDS, GUIDES, cardDef } from "./content";
import { int, next, pick, weighted } from "./rng";
import type { Card, Run, Tier } from "./types";

export function makeCard(run: Run, def: string, value?: number, suit?: Card["suit"]): Card {
  const d = cardDef(def);
  return { uid: run.nextUid++, def, value: value ?? d.value, suit: suit === undefined ? d.suit : suit };
}

export function plainCard(run: Run, value: number, suit: Card["suit"]): Card {
  return makeCard(run, "plain", value, suit);
}

const NAMED = CARDS.filter((c) => c.rarity === "common" || c.rarity === "rare");

export function randomNamed(run: Run, rarity?: "common" | "rare"): Card {
  const r = rarity ?? (next(run.rng) < CONFIG.rareChance ? "rare" : "common");
  return makeCard(run, pick(run.rng, NAMED.filter((c) => c.rarity === r)).id);
}

export function randomRewardCard(run: Run): Card {
  if (next(run.rng) < CONFIG.namedCardChance) return randomNamed(run);
  return plainCard(run, int(run.rng, 1, 10), weighted(run.rng, CONFIG.rewardSuitWeights));
}

export function randomGuides(run: Run, k: number): string[] {
  const pool = GUIDES.filter((g) => !run.guides.includes(g.id));
  // Rares show up a third as often
  const weighted = pool.flatMap((g) => (g.rarity === "rare" ? [g.id] : [g.id, g.id, g.id]));
  const out = new Set<string>();
  let guard = 0;
  while (out.size < Math.min(k, pool.length) && guard++ < 200) out.add(pick(run.rng, weighted));
  return [...out];
}

/** A card's id for the lab: named cards by id, plain cards by "value+suit". */
export function cardKey(c: Card): string {
  return c.def === "plain" ? `plain_${c.value}` : c.def;
}

export function giveFightReward(run: Run, tier: Tier, gold: number, caught: Card | null): void {
  run.gold += gold;
  const cards = Array.from({ length: CONFIG.cardChoices }, () => randomRewardCard(run));
  const guides = tier === "normal" ? [] : randomGuides(run, CONFIG.guideChoices);
  run.reward = { gold, cards, guides, caught, cardTaken: false, guideTaken: guides.length === 0 };
  run.phase = "reward";
}

