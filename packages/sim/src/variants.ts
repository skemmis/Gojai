/**
 * Hand-rule variants side by side (Sam, 2026-09-30: keep your hand between
 * turns, Regicide style, and the dead-hand problem that brings).
 *
 *   npx tsx packages/sim/src/variants.ts --runs 400
 */
import { setConfig, type Config } from "@gojai/core";
import { playRun, type RunRecord } from "./runner";

const RUNS = parseInt(process.argv[process.argv.indexOf("--runs") + 1] ?? "400", 10) || 400;

const FOUR = { startSuits: ["hearts", "spades"] as Config["startSuits"], startExtra: [{ suit: "diamonds" as const, values: [2, 4, 6, 8] }, { suit: "clubs" as const, values: [3, 6] }] };
const keep = { keepHand: true, drawPerTurn: 0, maxHand: 8, startHand: 8, immunity: false };

const all = { ...keep, ...FOUR, allDamage: true };
const VARIANTS: [string, Partial<Config>][] = [
  ["Today: discard hand, draw 5", {}],
  ["Today, no immunity", { immunity: false }],
  ["Keep hand, start 8, no draw", { ...keep }],
  ["+ some ♦♣ in the start deck", { ...keep, ...FOUR }],
  ["+ swap a card for 1 action", { ...keep, ...FOUR, cycleCost: 1 }],
  ["All cards hit, keep hand, start 8", all],
  ["All cards hit + swap", { ...all, cycleCost: 1 }],
  ["All cards hit + clubs to deck, no reshuffle", { ...all, reshuffle: false, clubsTo: "deck" }],
  ["All cards hit + clubs to deck, no reshuffle, swap", { ...all, reshuffle: false, clubsTo: "deck", cycleCost: 1 }],
  ["All cards hit, discard hand, draw 5", { immunity: false, ...FOUR, allDamage: true }],
];

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pc = (x: number) => `${Math.round(x * 100)}%`;

console.log("| rules | floors cleared (mean / median) | dead hands | idle turns | swaps per fight | turns per fight | ♦ plays per fight | ♣ plays per fight | HP lost per fight |");
console.log("|---|---|---|---|---|---|---|---|---|");
for (const [name, patch] of VARIANTS) {
  setConfig(patch);
  const rs: RunRecord[] = [];
  for (let i = 0; i < RUNS; i++) rs.push(playRun(1 + i, "greedy"));
  const sum = (k: (r: RunRecord) => number) => rs.reduce((a, r) => a + k(r), 0);
  const turns = sum((r) => r.stats.turns);
  const fights = sum((r) => r.stats.fights);
  const depth = rs.map((r) => r.depth).sort((a, b) => a - b);
  console.log(
    `| ${name} | ${mean(depth).toFixed(1)} / ${depth[depth.length >> 1]} | ${pc(sum((r) => r.stats.deadHands) / turns)} | ${pc(sum((r) => r.stats.idleTurns) / turns)} | ${(sum((r) => r.stats.cycles) / fights).toFixed(1)} | ${(turns / fights).toFixed(1)} | ${(sum((r) => r.stats.powerUses.diamonds) / fights).toFixed(1)} | ${(sum((r) => r.stats.powerUses.clubs) / fights).toFixed(1)} | ${(sum((r) => r.stats.hpLost) / fights).toFixed(1)} |`,
  );
}
