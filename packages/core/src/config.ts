/**
 * Every tunable number in one place. The balance lab can override these
 * (see setConfig); nothing else in core should hard-code a balance constant.
 */
export const DEFAULT_CONFIG = {
  playerHp: 40,
  actionsPerTurn: 3,
  drawPerTurn: 5,
  maxHand: 10,
  comboCap: 10,
  maxGuides: 5,
  startGold: 50,
  startSuits: ["hearts", "spades"] as ("hearts" | "diamonds" | "spades" | "clubs")[],
  /** Plain reward cards lean toward the suits you don't start with. */
  rewardSuitWeights: { hearts: 1, spades: 1, diamonds: 2, clubs: 2 },

  // Suit powers
  /** Diamonds draw 1 + floor(N / this). */
  diamondsPer: 4,
  /** Clubs recall 1 + floor(N / this) cards from discard to hand. */
  clubsPer: 5,

  // Perfect fight (no HP lost): bonus gold and a guaranteed rare in the card choice
  perfectGoldPct: 0.5,

  // Run structure
  bossEvery: 8,
  nodeChoices: 3,
  eliteFromFloor: 3,
  nodeWeights: { fight: 50, elite: 12, rest: 14, shop: 12, event: 12 },

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
