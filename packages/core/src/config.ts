/**
 * Every tunable number in one place. The balance lab can override these
 * (see setConfig); nothing else in core should hard-code a balance constant.
 */
export const DEFAULT_CONFIG = {
  handSize: 8,
  comboCap: 10,
  startRefreshes: 2,
  maxGuides: 5,
  /** After this many turns in one fight, your shield halves every turn (no stalling). */
  fatigueTurn: 20,
  startGold: 50,

  // Run structure
  bossEvery: 8,
  nodeChoices: 3,
  eliteFromFloor: 3,
  nodeWeights: { fight: 50, elite: 12, rest: 14, shop: 12, event: 12 },

  // Enemy scaling per floor (floor 1 = ×1)
  hpGrowth: 0.08,
  attackGrowth: 0.06,

  // Rewards
  fightGold: [12, 20] as [number, number],
  eliteGold: [25, 35] as [number, number],
  bossGold: 50,
  cardChoices: 3,
  guideChoices: 3,
  namedCardChance: 0.5,
  rareChance: 0.25,

  // Rest: Recover moves this many random discards back into your deck
  restRecover: 14,
  restUpgrade: 2,
  bossRecover: 10,

  // Shop
  shopCards: 4,
  shopGuides: 2,
  cardPrice: { plain: 20, common: 40, rare: 70 } as Record<string, number>,
  guidePrice: { common: 110, rare: 160 } as Record<string, number>,
  removeBase: 50,
  removeStep: 25,
  refreshPrice: 60,
};

export type Config = typeof DEFAULT_CONFIG;

/** The live config. The lab swaps it; the game never mutates it. */
export let CONFIG: Config = structuredClone(DEFAULT_CONFIG);

export function setConfig(patch: Partial<Config>): void {
  CONFIG = { ...structuredClone(DEFAULT_CONFIG), ...patch };
}
