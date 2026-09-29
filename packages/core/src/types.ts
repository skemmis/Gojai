import type { Rng } from "./rng";

/**
 * A standard deck. Each suit has one job:
 *   spades   → Attack:  deal N damage (the only suit that hits)
 *   hearts   → Defend:  shield N against attacks for the rest of the fight
 *   diamonds → Draw:    draw N cards (up to hand size)
 *   clubs    → Recycle: move N cards from your discard pile to your draw pile
 */
export type Suit = "hearts" | "diamonds" | "spades" | "clubs";
export const SUITS: Suit[] = ["hearts", "diamonds", "spades", "clubs"];

export type Effect =
  | { k: "dmg"; n: number } // played: +n damage
  | { k: "draw"; n: number } // played: draw n
  | { k: "wild" } // counts as every suit
  | { k: "pierce" } // played: powers ignore the enemy's immunity
  | { k: "payBonus"; n: number } // discarded to pay an attack: worth +n
  | { k: "onPayDamage"; n: number } // discarded to pay an attack: deal n damage
  | { k: "onPayRecover"; n: number } // discarded to pay an attack: recover n cards
  // junk
  | { k: "junk" } // can't be played; worth 0 when paying; gone after the fight
  | { k: "heavy"; n: number }; // junk: while in hand, enemy attacks are +n

export type Rarity = "plain" | "common" | "rare" | "catch" | "junk";

export interface CardDef {
  id: string;
  name: string;
  value: number; // 1 = Ace (the companion: combos with any card)
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

export type Trick =
  | { k: "none" }
  | { k: "twice" } // attacks twice per turn
  | { k: "rage"; n: number } // attack +n after every turn
  | { k: "hex"; card: string } // each attack also shuffles a junk card into your deck
  | { k: "armor"; n: number } // each play deals n less
  | { k: "regen"; n: number } // heals n after every turn
  | { k: "silence" }; // your first play each fight has no power

export type Tier = "normal" | "elite" | "boss";

export interface EnemyDef {
  id: string;
  name: string;
  tier: Tier;
  hp: number;
  attack: number;
  /** Immune to these suits' powers. */
  suits: Suit[];
  trick: Trick;
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
  attack: number;
  suits: Suit[];
  trick: Trick;
}

export interface PlayLog {
  cards: number[];
  damage: number;
  powers: Suit[];
  immune: Suit[];
}

export interface Fight {
  enemy: EnemyState;
  shield: number;
  turn: number;
  plays: number;
  yieldedLast: boolean;
  /** "play" = your move; "pay" = discard to cover `owed`; then back to play. */
  phase: "play" | "pay" | "won" | "lost";
  owed: number;
  attacksLeft: number; // for "twice"
  exact: boolean;
  lastPlay: PlayLog | null;
  log: string[];
}

export type NodeKind = "fight" | "elite" | "rest" | "shop" | "event" | "boss";

export interface ShopState {
  cards: { card: Card; price: number; sold: boolean }[];
  guides: { id: string; price: number; sold: boolean }[];
  removePrice: number;
  removed: boolean;
  refreshPrice: number;
  refreshBought: boolean;
}

export interface RewardState {
  gold: number;
  cards: Card[];
  guides: string[];
  caught: Card | null;
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
  combos: number;
  yields: number;
  powerUses: Record<Suit, number>;
  powerTotal: Record<Suit, number>;
  immuneHits: number;
  catches: number;
  refreshes: number;
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
  /** Your deck is your life: draw pile + hand + discard pile. */
  draw: Card[];
  hand: Card[];
  discard: Card[];
  refreshes: number;
  guides: string[];
  nextUid: number;
  removals: number;
  carriedShield: number;
  phase: Phase;
  nodes: NodeKind[];
  node: NodeKind | null;
  fight: Fight | null;
  reward: RewardState | null;
  shop: ShopState | null;
  event: string | null;
  stats: RunStats;
}
