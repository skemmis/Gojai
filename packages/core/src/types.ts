import type { Rng } from "./rng";

/**
 * A standard deck. Each suit has one job (N = the play's total value):
 *   spades   → Attack: deal N damage (the only suit that hits)
 *   hearts   → Defend: N block against this turn's attacks
 *   diamonds → Draw:   draw 1 card, +1 per 4 value (A–3: 1, 4–7: 2, 8–10: 3)
 *   clubs    → Recall: your best cards come back from the discard pile to your hand
 */
export type Suit = "hearts" | "diamonds" | "spades" | "clubs";
export const SUITS: Suit[] = ["hearts", "diamonds", "spades", "clubs"];

export type Effect =
  | { k: "dmg"; n: number } // played: +n damage
  | { k: "block"; n: number } // played: +n block
  | { k: "draw"; n: number } // played: draw n
  | { k: "free" } // costs no action
  | { k: "wild" } // counts as every suit
  | { k: "pierce" } // played: powers ignore the enemy's immunity
  | { k: "retain" } // not discarded at the end of your turn
  | { k: "onDiscardDamage"; n: number } // discarded unplayed at end of turn: deal n
  | { k: "onDiscardBlock"; n: number } // discarded unplayed at end of turn: +n block next turn
  // junk
  | { k: "junk" } // can't be played; leaves your deck after the fight
  | { k: "heavy"; n: number }; // junk: while in hand, enemy attacks are +n

export type Rarity = "plain" | "common" | "rare" | "catch" | "junk";

export interface CardDef {
  id: string;
  name: string;
  value: number; // 1 = Ace
  suit: Suit | null;
  rarity: Rarity;
  effects: Effect[];
  text: string;
  flavor?: string;
  /** Caught enemies are the face cards: normal = J, elite = Q, boss = K. */
  face?: "J" | "Q" | "K";
}

/** A card in a run. Value and suit are copied so upgrades can change them. */
export interface Card {
  uid: number;
  def: string; // "plain" for plain cards
  value: number;
  suit: Suit | null;
}

export interface GuideDef {
  id: string;
  name: string;
  title: string;
  rarity: "common" | "rare";
  text: string;
  flavor?: string;
}

/** Always-on enemy traits. */
export type Passive =
  | { k: "none" }
  | { k: "armor"; n: number } // each hit deals n less
  | { k: "regen"; n: number } // heals n after every turn
  | { k: "silence" }; // your first play each fight has no power

/** One thing an enemy does on its turn. You see it coming (the intent). */
export type EnemyAction =
  | { k: "attack"; n: number; times?: number }
  | { k: "block"; n: number }
  | { k: "buff"; n: number } // its attacks are +n for the rest of the fight
  | { k: "hex"; card: string; count: number } // junk shuffled into your draw pile
  | { k: "heal"; n: number };

export type Tier = "normal" | "elite" | "boss";

export interface EnemyDef {
  id: string;
  name: string;
  tier: Tier;
  hp: number;
  /** Immune to these suits' powers. */
  suits: Suit[];
  passive: Passive;
  /** Intents cycle in order; each intent is one or more actions. */
  intents: EnemyAction[][];
  text: string;
  /** The card you get for an exact kill. */
  catch: { value: number; suit: Suit; effects: Effect[]; text: string };
}

export interface EnemyState {
  id: string;
  name: string;
  tier: Tier;
  hp: number;
  maxHp: number;
  block: number;
  /** Floor scaling for attack, block and heal numbers. */
  scale: number;
  buff: number;
  suits: Suit[];
  passive: Passive;
  intentIdx: number;
}

export interface PlayLog {
  cards: number[];
  damage: number;
  powers: Suit[];
  immune: Suit[];
}

export interface Fight {
  enemy: EnemyState;
  block: number;
  actions: number;
  turn: number;
  plays: number;
  /** Cards played this turn, for matching. */
  turnPlays: Card[];
  hpLost: number;
  phase: "play" | "won" | "lost";
  exact: boolean;
  perfect: boolean;
  lastPlay: PlayLog | null;
  log: string[];
}

export type NodeKind = "fight" | "elite" | "rest" | "shop" | "event" | "boss";

export interface ShopState {
  cards: { card: Card; price: number; sold: boolean }[];
  guides: { id: string; price: number; sold: boolean }[];
  removePrice: number;
  removed: boolean;
}

export interface RewardState {
  gold: number;
  cards: Card[];
  guides: string[];
  caught: Card | null;
  perfect: boolean;
  cardTaken: boolean;
  guideTaken: boolean;
}

export interface OfferLog {
  floor: number;
  kind: "card" | "guide";
  offered: string[];
  picked: string | null;
}

export interface RunStats {
  fights: number;
  turns: number;
  plays: number;
  /** Plays that got the matching bonus. */
  matches: number;
  endTurns: number;
  powerUses: Record<Suit, number>;
  powerTotal: Record<Suit, number>;
  immuneHits: number;
  catches: number;
  perfects: number;
  hpLost: number;
  maxHit: number;
  maxHitFloor: number;
  diedTo: string | null;
  offers: OfferLog[];
}

export type Phase = "map" | "fight" | "reward" | "rest" | "shop" | "event" | "over";

export interface Run {
  seed: number;
  rng: Rng;
  floor: number;
  gold: number;
  hp: number;
  maxHp: number;
  /** Your deck lives in these piles; each fight shuffles them back together. */
  draw: Card[];
  hand: Card[];
  discard: Card[];
  guides: string[];
  nextUid: number;
  removals: number;
  phase: Phase;
  /** What you found at the current spot. */
  node: NodeKind | null;
  fight: Fight | null;
  reward: RewardState | null;
  shop: ShopState | null;
  event: string | null;
  stats: RunStats;
}
