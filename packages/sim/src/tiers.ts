/**
 * The proposed fight rules plus stepped difficulty (Sam, 2026-09-30), tuned
 * side by side. Fights won is the depth; "static" never improves its deck, so
 * the gap between it and greedy is how much deckbuilding matters.
 *
 *   npx tsx packages/sim/src/tiers.ts --runs 300
 */
import { setConfig, type Config } from "@gojai/core";
import { playRun, type Policy, type RunRecord } from "./runner";

const RUNS = parseInt(process.argv[process.argv.indexOf("--runs") + 1] ?? "300", 10) || 300;
const ONLY = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : "";

export const NEW_RULES: Partial<Config> = {
  keepHand: true,
  drawPerTurn: 0,
  maxHand: 8,
  startHand: 8,
  immunity: false,
  allDamage: true,
  startExtra: [
    { suit: "diamonds", values: [2, 4, 6, 8] },
    { suit: "clubs", values: [3, 6] },
  ],
};

const tiers = (hp: number, atk: number, mult: number): Partial<Config> => ({ ...NEW_RULES, enemyHpMult: mult, tierEvery: 10, tierHp: hp, tierAtk: atk });

const t = (hp: number, atk: number, mult: number): Partial<Config> => ({ enemyHpMult: mult, tierHp: hp, tierAtk: atk });
const VARIANTS: [string, Partial<Config>][] = [
  ["no upgrade in rewards", { rewardUpgrade: 0 }],
  ["upgrade one card +2 (cap 10)", {}],
  ["upgrade one card +3 (cap 20)", { rewardUpgrade: 3, upgradeCap: 20 }],
  ["upgrade a whole rank +1 (cap 20)", { rewardUpgrade: 1, upgradeCap: 20, rewardUpgradeScope: "rank" }],
  ["upgrade a whole rank +2 (cap 20)", { rewardUpgrade: 2, upgradeCap: 20, rewardUpgradeScope: "rank" }],
];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const med = (xs: number[]) => xs.slice().sort((a, b) => a - b)[xs.length >> 1];

function batch(policy: Policy, route: boolean): RunRecord[] {
  const rs: RunRecord[] = [];
  for (let i = 0; i < RUNS; i++) rs.push(playRun(1 + i, policy, { route }));
  return rs;
}

console.log("| rules | fights won: greedy, picks route | greedy, random walk | never improves deck | turns per fight | HP lost per fight | out of cards per fight | where greedy runs end (tier: share) |");
console.log("|---|---|---|---|---|---|---|---|");
if (process.argv.includes("--killers")) {
  setConfig({});
  const k = new Map<string, number>();
  for (let i = 0; i < RUNS; i++) {
    const r = playRun(1 + i, "greedy", { route: true });
    if (r.wins < 10) {
      const last = r.encounters[r.encounters.length - 1];
      const key = `${r.diedTo} (${last?.tier}, fight ${r.wins + 1})`;
      k.set(key, (k.get(key) ?? 0) + 1);
    }
  }
  console.log([...k.entries()].sort((a, b) => b[1] - a[1]).join("\n"));
  process.exit(0);
}
for (const [name, patch] of VARIANTS) {
  if (ONLY && !name.includes(ONLY)) continue;
  setConfig(patch);
  const route = batch("greedy", true);
  const walk = batch("greedy", false);
  const stat = batch("static", true);
  const sum = (rs: RunRecord[], k: (r: RunRecord) => number) => rs.reduce((a, r) => a + k(r), 0);
  const fights = sum(route, (r) => r.stats.fights);
  const w = (rs: RunRecord[]) => `${mean(rs.map((r) => r.wins)).toFixed(1)} (median ${med(rs.map((r) => r.wins))})`;
  const every = patch.tierEvery || 8;
  const ends = new Map<number, number>();
  for (const r of route) ends.set(Math.floor(r.wins / every), (ends.get(Math.floor(r.wins / every)) ?? 0) + 1);
  const endStr = [...ends.entries()].sort((a, b) => a[0] - b[0]).slice(0, 6).map(([t, n]) => `${t + 1}: ${Math.round((100 * n) / RUNS)}%`).join(", ");
  console.log(
    `| ${name} | ${w(route)} | ${w(walk)} | ${w(stat)} | ${(sum(route, (r) => r.stats.turns) / fights).toFixed(1)} | ${(sum(route, (r) => r.stats.hpLost) / fights).toFixed(1)} | ${(sum(route, (r) => r.stats.deckOuts) / fights).toFixed(2)} | ${endStr} |`,
  );
}
