/**
 * The balance lab. Plays thousands of runs and writes a report that answers:
 *
 *   How far do runs get, and what ends them?        (depth, killers)
 *   Which enemies are walls, and which are free?     (death rate per encounter)
 *   Are all four suit powers pulling their weight?   (power usage, immunity)
 *   Is catching too easy or too hard?                (exact-kill rate)
 *   Are early fights easy? How often perfect?        (HP lost, perfect rate)
 *   Which cards and Guides are must-picks or traps?  (picked vs passed)
 *   Which Guide pairs are suspiciously strong?       (pair lift)
 *   Are there real decisions each turn?              (close calls)
 *
 *   npm run lab -- --runs 2000 --out lab-reports/latest.md
 */
import fs from "node:fs";
import path from "node:path";
import { CARD_BY_ID, ENEMY_BY_ID, GUIDE_BY_ID, SUITS, type Suit } from "@gojai/core";
import { playRun, type RunRecord } from "./runner";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const RUNS = parseInt(arg("runs", "1000"), 10);
const SEED = parseInt(arg("seed", "1"), 10);
const OUT = arg("out", "");
const FAIL_ON_FLAGS = process.argv.includes("--strict");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const f1 = (x: number) => x.toFixed(1);
const pc = (x: number) => `${Math.round(x * 100)}%`;
const sign = (x: number) => (x >= 0 ? `+${f1(x)}` : f1(x));

function table(headers: string[], rows: (string | number)[][]): string {
  return [`| ${headers.join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
}

function cardLabel(key: string): string {
  if (key.startsWith("plain_")) return `plain ${key.slice(6)}`;
  return CARD_BY_ID[key]?.name ?? key;
}

// ─── Run the runs ────────────────────────────────────────────────────────────

const t0 = Date.now();
const greedy: RunRecord[] = [];
const explore: RunRecord[] = [];
for (let i = 0; i < RUNS; i++) {
  greedy.push(playRun(SEED + i, "greedy"));
  explore.push(playRun(SEED + 1_000_000 + i, "explore"));
}
const all = [...greedy, ...explore];
const secs = (Date.now() - t0) / 1000;

const flags: string[] = [];
const out: string[] = [];
out.push(`# Balance lab report`);
out.push(`${RUNS} greedy + ${RUNS} explore runs, seed ${SEED}, ${f1(secs)}s. Greedy = sensible picks. Explore = random reward picks, for fair card ratings.`);

// ─── Depth ───────────────────────────────────────────────────────────────────

out.push(`## How far runs get (floors cleared)`);
const depthRow = (name: string, rs: RunRecord[]) => {
  const d = rs.map((r) => r.depth);
  return [name, f1(mean(d)), pct(d, 0.1), pct(d, 0.5), pct(d, 0.9), Math.max(...d)];
};
out.push(table(["policy", "mean", "p10", "median", "p90", "best"], [depthRow("greedy", greedy), depthRow("explore", explore)]));

const bossWall = greedy.filter((r) => r.depth === 7).length / greedy.length;
if (bossWall > 0.4) flags.push(`First boss is a wall: ${pc(bossWall)} of greedy runs die on floor 8.`);

// ─── Enemies ─────────────────────────────────────────────────────────────────

out.push(`## Enemies`);
out.push(`Death rate = share of encounters that ended the run. Catch rate = share won with an exact kill. Perfect = share won without losing HP. HP lost is per won fight (you start with 40).`);
const byEnemy = new Map<string, { n: number; deaths: number; catches: number; perfects: number; hpLost: number[]; turns: number[] }>();
for (const r of all)
  for (const e of r.encounters) {
    const s = byEnemy.get(e.enemy) ?? { n: 0, deaths: 0, catches: 0, perfects: 0, hpLost: [], turns: [] };
    s.n++;
    if (!e.won) s.deaths++;
    else s.hpLost.push(e.hpLost);
    if (e.exact) s.catches++;
    if (e.perfect) s.perfects++;
    s.turns.push(e.turns);
    byEnemy.set(e.enemy, s);
  }
const enemyRows = [...byEnemy.entries()]
  .sort((a, b) => b[1].deaths / b[1].n - a[1].deaths / a[1].n)
  .map(([id, s]) => {
    const d = ENEMY_BY_ID[id];
    const dr = s.deaths / s.n;
    if (d.tier === "normal" && dr > 0.25) flags.push(`${d.name} kills ${pc(dr)} of the runs that meet it (normal enemy).`);
    const won = Math.max(1, s.n - s.deaths);
    return [d.name, d.tier, s.n, pc(dr), f1(mean(s.hpLost)), pc(s.perfects / won), pc(s.catches / won), f1(mean(s.turns))];
  });
out.push(table(["enemy", "tier", "met", "death rate", "HP lost", "perfect", "catch rate", "avg turns"], enemyRows));

// Early fights should be easy: the first few floors are a walk in the park
const early = all.flatMap((r) => r.encounters.filter((e) => e.tier === "normal" && e.floor <= 4));
const earlyWon = early.filter((e) => e.won);
const earlyDeath = 1 - earlyWon.length / Math.max(1, early.length);
const earlyPerfect = earlyWon.filter((e) => e.perfect).length / Math.max(1, earlyWon.length);
out.push(`Early fights (normal, floors 1-4): ${early.length} fought, death rate ${pc(earlyDeath)}, HP lost ${f1(mean(earlyWon.map((e) => e.hpLost)))}, perfect ${pc(earlyPerfect)}, ${f1(mean(early.map((e) => e.turns)))} turns.`);
if (earlyPerfect < 0.4) flags.push(`Early fights are fiddly: only ${pc(earlyPerfect)} of floor 1-4 normal fights are perfect.`);
if (earlyDeath > 0.02) flags.push(`Early fights aren't easy: ${pc(earlyDeath)} of floor 1-4 normal fights end the run.`);

// ─── Powers ──────────────────────────────────────────────────────────────────

out.push(`## Suit powers`);
const totals = (k: "powerUses" | "powerTotal") => Object.fromEntries(SUITS.map((s) => [s, all.reduce((a, r) => a + r.stats[k][s], 0)])) as Record<Suit, number>;
const uses = totals("powerUses");
const amount = totals("powerTotal");
const useSum = SUITS.reduce((a, s) => a + uses[s], 0);
out.push(table(["suit", "share of powers fired", "avg N"], SUITS.map((s) => [s, pc(uses[s] / useSum), f1(amount[s] / Math.max(1, uses[s]))])));
for (const s of SUITS) if (uses[s] / useSum < 0.12) flags.push(`${s} power is rarely used (${pc(uses[s] / useSum)} of powers).`);
const plays = all.reduce((a, r) => a + r.stats.plays, 0);
const immune = all.reduce((a, r) => a + r.stats.immuneHits, 0);
const matched = all.reduce((a, r) => a + r.stats.matches, 0);
const fights = all.reduce((a, r) => a + r.stats.fights, 0);
const perfects = all.reduce((a, r) => a + r.stats.perfects, 0);
out.push(`Plays: ${plays}. Matched (pair or better): ${pc(matched / plays)} of plays. Powers blocked by immunity: ${immune}. Perfect fights: ${pc(perfects / fights)}. Catches per run: ${f1(mean(all.map((r) => r.stats.catches)))}.`);

// ─── Cards: picked vs passed ─────────────────────────────────────────────────

out.push(`## Cards: picked vs passed (explore runs)`);
out.push(`Δ = mean floors cleared by runs that took the card minus runs that were offered it and passed. Positive = helps. Small n is noise.`);
const cardStat = new Map<string, { picked: number[]; passed: number[] }>();
for (const r of explore)
  for (const o of r.stats.offers) {
    if (o.kind !== "card") continue;
    for (const key of new Set(o.offered)) {
      const s = cardStat.get(key) ?? { picked: [], passed: [] };
      (o.picked === key ? s.picked : s.passed).push(r.depth - o.floor);
      cardStat.set(key, s);
    }
  }
const namedRows = [...cardStat.entries()]
  .filter(([k, s]) => !k.startsWith("plain_") && s.picked.length >= 15 && s.passed.length >= 15)
  .map(([k, s]) => ({ k, d: mean(s.picked) - mean(s.passed), n: s.picked.length }))
  .sort((a, b) => b.d - a.d);
out.push(table(["card", "Δ floors", "picked n"], namedRows.map((x) => [cardLabel(x.k), sign(x.d), x.n])));
for (const x of namedRows) {
  if (x.d > 3 && x.n >= 40) flags.push(`Card "${cardLabel(x.k)}" looks like a must-pick (Δ ${sign(x.d)}).`);
  if (x.d < -1.5 && x.n >= 40) flags.push(`Card "${cardLabel(x.k)}" looks like a trap (Δ ${sign(x.d)}).`);
}
const plainRows = [...cardStat.entries()]
  .filter(([k]) => k.startsWith("plain_"))
  .map(([k, s]) => [k.slice(6), sign(mean(s.picked) - mean(s.passed)), s.picked.length] as [string, string, number])
  .sort((a, b) => Number(a[0]) - Number(b[0]));
out.push(`Plain cards by value:`);
out.push(table(["value", "Δ floors", "picked n"], plainRows));

// ─── Guides ──────────────────────────────────────────────────────────────────

out.push(`## Guides: picked vs passed (explore runs)`);
const guideStat = new Map<string, { picked: number[]; passed: number[] }>();
for (const r of explore)
  for (const o of r.stats.offers) {
    if (o.kind !== "guide") continue;
    for (const id of o.offered) {
      const s = guideStat.get(id) ?? { picked: [], passed: [] };
      (o.picked === id ? s.picked : s.passed).push(r.depth - o.floor);
      guideStat.set(id, s);
    }
  }
const guideRows = [...guideStat.entries()]
  .map(([id, s]) => ({ id, d: mean(s.picked) - mean(s.passed), n: s.picked.length, m: s.passed.length }))
  .filter((x) => x.n >= 5 && x.m >= 5)
  .sort((a, b) => b.d - a.d);
out.push(table(["guide", "does", "Δ floors", "picked n"], guideRows.map((x) => [`${GUIDE_BY_ID[x.id].name}`, GUIDE_BY_ID[x.id].text, sign(x.d), x.n])));
for (const x of guideRows) {
  if (x.d > 4 && x.n >= 30) flags.push(`Guide "${GUIDE_BY_ID[x.id].name}" looks broken (Δ ${sign(x.d)}).`);
  if (x.d < -1 && x.n >= 30) flags.push(`Guide "${GUIDE_BY_ID[x.id].name}" hurts runs that take it (Δ ${sign(x.d)}).`);
}

// ─── Guide pairs ─────────────────────────────────────────────────────────────

out.push(`## Guide pairs (combos)`);
out.push(`Lift = how much deeper runs holding both Guides went than the two Guides' separate effects predict. Big positive lift = a combo worth a look.`);
const base = mean(all.map((r) => r.depth));
const single = new Map<string, number[]>();
const pair = new Map<string, number[]>();
for (const r of all) {
  const gs = [...new Set(r.guides)].sort();
  for (const g of gs) single.set(g, [...(single.get(g) ?? []), r.depth]);
  for (let i = 0; i < gs.length; i++)
    for (let j = i + 1; j < gs.length; j++) {
      const k = `${gs[i]}|${gs[j]}`;
      pair.set(k, [...(pair.get(k) ?? []), r.depth]);
    }
}
const pairRows = [...pair.entries()]
  .filter(([, v]) => v.length >= 15)
  .map(([k, v]) => {
    const [a, b] = k.split("|");
    const lift = mean(v) - (mean(single.get(a)!) + mean(single.get(b)!) - base);
    return { a, b, lift, n: v.length, m: mean(v) };
  })
  .sort((x, y) => y.lift - x.lift)
  .slice(0, 8);
out.push(table(["pair", "runs", "mean depth", "lift"], pairRows.map((x) => [`${GUIDE_BY_ID[x.a].name} + ${GUIDE_BY_ID[x.b].name}`, x.n, f1(x.m), sign(x.lift)])));
for (const x of pairRows) if (x.lift > 6) flags.push(`Guide combo ${GUIDE_BY_ID[x.a].name} + ${GUIDE_BY_ID[x.b].name}: lift ${sign(x.lift)}.`);

// ─── Decisions and outliers ──────────────────────────────────────────────────

out.push(`## Decisions`);
const margins = all.flatMap((r) => r.margins);
out.push(`Close calls (best and second-best move within 10%): ${pc(margins.filter((m) => m < 0.1).length / Math.max(1, margins.length))} of ${margins.length} decisions. Higher means more real choices per turn.`);
const hits = all.map((r) => r.maxHit);
out.push(`Biggest single hit: ${Math.max(...hits)} (median run's biggest: ${pct(hits, 0.5)}).`);

// ─── Flags ───────────────────────────────────────────────────────────────────

out.splice(2, 0, `## Flags\n${flags.length ? flags.map((f) => `- ${f}`).join("\n") : "- Nothing flagged."}`);
const report = out.join("\n\n") + "\n";
if (OUT) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, report);
  console.log(`Wrote ${OUT}`);
}
console.log(report);
if (FAIL_ON_FLAGS && flags.length) process.exit(1);
