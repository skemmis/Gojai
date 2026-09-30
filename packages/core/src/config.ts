/**
 * Every tunable number in one place. The balance lab can override these
 * (see setConfig); nothing else in core should hard-code a balance constant.
 */
export const DEFAULT_CONFIG = {
  playerHp: 40,
  actionsPerTurn: 3,
  drawPerTurn: 0,
  maxHand: 8,
  maxGuides: 5,
  startGold: 50,
  startSuits: ["hearts", "spades", "diamonds", "clubs"] as ("hearts" | "diamonds" | "spades" | "clubs")[],
  /** Extra starting cards beyond the full suits above, e.g. a few diamonds and clubs. */
  startExtra: [] as { suit: "hearts" | "diamonds" | "spades" | "clubs"; values: number[] }[],

  // Hand rules (Sam, 2026-09-30: trying Regicide's "keep your hand")
  /** Keep unplayed cards between turns instead of discarding them. */
  keepHand: true,
  /** Cards drawn when a fight starts. */
  startHand: 8,
  /** Discard a card to draw one, for this many actions. null = not allowed. */
  cycleCost: null as number | null,
  /** An empty draw pile reshuffles the discard pile. Off = only clubs bring cards back. */
  reshuffle: true,
  /** Where clubs send recalled cards: your hand, or the bottom of the draw pile. */
  clubsTo: "deck" as "hand" | "deck",
  /**
   * What clubs do: "discard" = you pick up to N cards from your hand to
   * discard, firing their discard effects (Sam, 2026-09-30); "recall" = bring
   * N back from the discard pile (clubsTo says where).
   */
  clubsPower: "discard" as "discard" | "recall",
  /**
   * Every card hits for its value, Regicide style, and its suit power comes
   * on top: spades hit double, hearts also block, diamonds also draw, clubs
   * also recall. Off = only spades hit.
   */
  allDamage: false,
  /** Enemies shrug off one suit's power. */
  immunity: false,
  /** Plain reward cards lean toward the suits you don't start with. */
  rewardSuitWeights: { hearts: 1, spades: 1, diamonds: 2, clubs: 2 },

  // Suit powers
  /** Diamonds draw N and clubs return N (Sam, 2026-09-30). Off = the per-4 / per-5 steps below. */
  powerByValue: true,
  /** Diamonds draw 1 + floor(N / this). */
  diamondsPer: 4,
  /** Clubs recall 1 + floor(N / this) cards from discard to hand. */
  clubsPer: 5,

  // Perfect fight (no HP lost): bonus gold and a guaranteed rare in the card choice
  perfectGoldPct: 0.5,

  // Run structure
  bossEvery: 8,
  eliteFromFloor: 3,
  // What a spot holds comes from the map (BASE_ODDS / findAt in @gojai/map).
  // The first spot is always a fight, and elites wait for eliteFromFloor.

  /**
   * Stepped difficulty (Sam, 2026-09-30): every this-many fights won, enemies
   * jump a tier and the last fight of each tier is its boss. Within a tier
   * they don't grow. 0 = the old per-floor growth below, boss every bossEvery.
   */
  tierEvery: 10,
  /** Each tier adds this share of base HP and of base attack. */
  tierHp: 0.8,
  tierAtk: 0.5,
  /** Every enemy's HP times this (all-cards-hit fights need more). */
  enemyHpMult: 0.6,

  // Enemy scaling per floor (floor 1 = ×1)
  hpGrowth: 0.04,
  attackGrowth: 0.03,

  // Rewards
  fightGold: [12, 20] as [number, number],
  eliteGold: [25, 35] as [number, number],
  bossGold: 50,
  cardChoices: 3,
  guideChoices: 3,
  namedCardChance: 0.5,
  rareChance: 0.25,

  // Rest
  restHealPct: 0.3,
  restUpgrade: 2,
  /** A reward upgrade raises just the card you pick, or every card of its rank (like a Balatro planet levelling a hand). */
  rewardUpgradeScope: "card" as "card" | "rank",
  /** No upgrade takes a card past this value. */
  upgradeCap: 10,
  /** A fight reward can upgrade one of your cards by this much instead of adding one (Sam, 2026-09-30, per Balatro). 0 = off. */
  rewardUpgrade: 2,
  bossHealPct: 0.3,

  // Shop
  shopCards: 4,
  shopGuides: 2,
  cardPrice: { plain: 20, common: 40, rare: 70 } as Record<string, number>,
  guidePrice: { common: 110, rare: 160 } as Record<string, number>,
  removeBase: 50,
  removeStep: 25,
};

export type Config = typeof DEFAULT_CONFIG;

/** The live config. The lab swaps it; the game never mutates it. */
export let CONFIG: Config = structuredClone(DEFAULT_CONFIG);

export function setConfig(patch: Partial<Config>): void {
  CONFIG = { ...structuredClone(DEFAULT_CONFIG), ...patch };
}
