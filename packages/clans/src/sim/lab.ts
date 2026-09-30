import fs from "node:fs";
import { CLAN, type ClanConfig } from "../config.ts";
import { FACTIONS, FACTION_IDS, perFaction, type FactionId } from "../factions.ts";
import { runSeason, BASE, GROUND_IDS, ADJACENT, spotsByGround, type Scenario, type SeasonResult } from "./world.ts";

/**
 * Clan lab: plays many seasons per scenario and asks whether the
 * auto-balanced factions stay competitive. Usage:
 *   npm run clans:lab -- [--seasons 200] [--out lab-reports/clans.md]
 */

const args = process.argv.slice(2);
const opt = (k: string, d: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const SEASONS = Number(opt("seasons", "200"));
const OUT = opt("out", "lab-reports/clans.md");

const cfg = (patch: (c: ClanConfig) => void): ClanConfig => {
  const c = structuredClone(CLAN);
  patch(c);
  return c;
};

const SCENARIOS: Scenario[] = [
  { name: "baseline", note: "120 at launch, 6 signups a day, friends invite friends, won events flip ground.", ...BASE },
  { name: "head-count assigner", note: "Assign by member count instead of recent play.", ...BASE, assigner: "count" },
  { name: "no invites", note: "Everyone auto-assigned, friends split up.", ...BASE, invites: false },
  { name: "founding clique", note: "12 devoted friends sign up at launch and all ask for the Order; the invite rule decides.", ...BASE, clique: 12 },
  { name: "forced clique", note: "The same 12 all get the Order, invite rule ignored.", ...BASE, clique: 12, forceClique: true },
  {
    name: "forced clique, no catch-up",
    note: "Forced clique with the underdog multiplier off.",
    ...BASE,
    clique: 12,
    forceClique: true,
    cfg: cfg((c) => void (c.underdog = { k: 0, min: 1, max: 1 })),
  },
  { name: "events don't flip", note: "Won events only add influence (the earlier rule).", ...BASE, eventsFlip: false },
  { name: "no decay", note: "Influence fades 2% a night instead of 15%.", ...BASE, cfg: cfg((c) => void (c.decay = 0.02)) },
  { name: "small town", note: "40 at launch, 1 signup a day: an early playtest.", ...BASE, launch: 40, perDay: 1 },
];

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const q = (xs: number[], p: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))];

interface Row {
  sc: Scenario;
  results: SeasonResult[];
}

const t0 = Date.now();
const rows: Row[] = SCENARIOS.map((sc) => ({ sc, results: Array.from({ length: SEASONS }, (_, i) => runSeason(sc, 1000 + i)) }));
const secs = ((Date.now() - t0) / 1000).toFixed(1);

const flags: string[] = [];
const out: string[] = [];
out.push(`# Clan lab report`, ``, `${SEASONS} seasons of ${CLAN.season.days} days per scenario, ${secs}s. Map: ${GROUND_IDS.length} neighborhoods, real spots and timed events from @gojai/map.`, ``);

out.push(`## Who wins the season`, ``);
out.push(`Win = most neighborhood-days held; fair is 50% each. Dominance = the winner's share of all neighborhood-days (p90 over seasons).`, ``);
out.push(`| scenario | ${FACTION_IDS.map((f) => FACTIONS[f].name).join(" | ")} | dominance mean / p90 | nobody holds | flips/day | lead changes | locked |`);
out.push(`|---|${FACTION_IDS.map(() => "---").join("|")}|---|---|---|---|---|`);
for (const { sc, results } of rows) {
  const on = (f: FactionId) => sc.cfg.factions.includes(f);
  const cell = (f: FactionId, x: number) => (on(f) ? pct(x) : "–");
  const fair = 1 / sc.cfg.factions.length;
  const wins = perFaction((f) => results.filter((r) => r.winner === f).length / results.length);
  const dom = results.map((r) => r.dominance);
  out.push(
    `| ${sc.name} | ${FACTION_IDS.map((f) => cell(f, wins[f])).join(" | ")} | ${pct(mean(dom))} / ${pct(q(dom, 0.9))} | ${pct(mean(results.map((r) => r.neutral)))} | ${(mean(results.map((r) => r.flips)) / CLAN.season.days).toFixed(2)} | ${mean(results.map((r) => r.leadChanges)).toFixed(1)} | ${mean(results.map((r) => r.locked)).toFixed(1)} |`,
  );
  const hi = Math.max(...sc.cfg.factions.map((f) => wins[f]));
  const lo = Math.min(...sc.cfg.factions.map((f) => wins[f]));
  if (hi > fair + 0.12 || lo < fair - 0.13) flags.push(`**${sc.name}**: season wins range ${pct(lo)} to ${pct(hi)}.`);
  if (q(dom, 0.9) > fair + 0.2) flags.push(`**${sc.name}**: in 1 season of 10 the winner holds ${pct(q(dom, 0.9))} of the map.`);
  if (mean(results.map((r) => r.locked)) > 4) flags.push(`**${sc.name}**: ${mean(results.map((r) => r.locked)).toFixed(1)} neighborhoods never really change hands.`);
}
out.push(``, `Flips/day: neighborhoods changing holder per day. Lead changes: times the faction holding the most neighborhoods changed. Locked: neighborhoods held by one faction for 90%+ of the season.`, ``);

out.push(`## Where influence comes from`, ``, `Share of all influence earned, by source (baseline mean), and play share by faction at season end (last 14 days).`, ``);
out.push(`| scenario | walking | offerings | bosses | duels | play share ${FACTION_IDS.map((f) => FACTIONS[f].name.replace("The ", "")).join(" / ")} | players | boss kills | duels/season |`);
out.push(`|---|---|---|---|---|---|---|---|---|`);
for (const { sc, results } of rows) {
  const src = { walk: 0, offering: 0, boss: 0, duel: 0 };
  for (const r of results) for (const f of sc.cfg.factions) for (const k of Object.keys(src) as (keyof typeof src)[]) src[k] += r.ledger[f][k];
  const tot = src.walk + src.offering + src.boss + src.duel;
  const play = perFaction((f) => mean(results.map((r) => r.playShare[f])));
  out.push(
    `| ${sc.name} | ${pct(src.walk / tot)} | ${pct(src.offering / tot)} | ${pct(src.boss / tot)} | ${pct(src.duel / tot)} | ${FACTION_IDS.map((f) => (sc.cfg.factions.includes(f) ? pct(play[f]) : "–")).join(" / ")} | ${Math.round(mean(results.map((r) => r.players)))} | ${pct(mean(results.map((r) => r.bossKills / (r.bosses || 1))))} | ${Math.round(mean(results.map((r) => r.duels)))} |`,
  );
}

out.push(``, `## Flags`, ``, ...(flags.length ? flags.map((f) => `- ${f}`) : ["- None."]), ``);

out.push(`## Map as the bots walk it`, ``);
out.push(`Locked = share of baseline seasons where one faction held it 90%+ of the days.`, ``);
out.push(`| neighborhood | spots | locked | next to |`, `|---|---|---|---|`);
const base = rows[0].results;
for (const g of GROUND_IDS)
  out.push(`| ${g} | ${spotsByGround[g].length} | ${pct(base.filter((r) => r.lockedIds.includes(g)).length / base.length)} | ${ADJACENT[g].join(", ")} |`);

out.push(``, `## Scenarios`, ``, ...SCENARIOS.map((s) => `- **${s.name}**: ${s.note}`), ``);

const md = out.join("\n");
fs.mkdirSync(OUT.replace(/\/[^/]*$/, ""), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(md);
