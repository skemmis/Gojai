/**
 * Plays one whole run with the bot and records what the lab needs.
 *
 * Two policies:
 *   greedy  — sensible picks; its depth is the "how far does a decent
 *             player get" number.
 *   explore — reward picks are uniformly random (skip included), so the lab
 *             can compare runs that took a card against runs that were
 *             offered it and passed. That's what makes card ratings fair.
 */
import {
  allCards,
  buyCard,
  buyGuide,
  cardDef,
  chooseEvent,
  chooseNode,
  endTurn,
  EVENT_BY_ID,
  guidesFull,
  isJunk,
  leaveReward,
  leaveShop,
  newRun,
  play,
  rest,
  score,
  takeRewardCard,
  takeRewardGuide,
  makeRng,
  next,
  type Card,
  type NodeKind,
  type Run,
} from "@gojai/core";
import { chooseMove } from "./bot";

export type Policy = "greedy" | "explore";

export interface Encounter {
  enemy: string;
  tier: string;
  floor: number;
  turns: number;
  won: boolean;
  exact: boolean;
  perfect: boolean;
  hpLost: number;
}

export interface RunRecord {
  seed: number;
  policy: Policy;
  depth: number;
  diedTo: string | null;
  guides: string[];
  deckSize: number;
  encounters: Encounter[];
  stats: Run["stats"];
  margins: number[];
  maxHit: number;
}

const MAX_FLOOR = 400;

function health(run: Run): number {
  return run.hp / run.maxHp;
}

function worstCard(run: Run): Card | undefined {
  return allCards(run)
    .filter((c) => !isJunk(c) && c.def === "plain")
    .sort((a, b) => a.value - b.value)[0];
}

function pickNode(run: Run, policy: Policy, r: () => number): number {
  const nodes = run.nodes;
  const idx = (k: NodeKind) => nodes.indexOf(k);
  if (nodes.length === 1) return 0;
  if (policy === "explore" && r() < 0.25) return Math.floor(r() * nodes.length);
  const h = health(run);
  if (h < 0.5 && idx("rest") >= 0) return idx("rest");
  if (run.gold >= 110 && idx("shop") >= 0) return idx("shop");
  if (h >= 0.75 && idx("elite") >= 0) return idx("elite");
  if (idx("event") >= 0 && h >= 0.6) return idx("event");
  if (idx("fight") >= 0) return idx("fight");
  if (idx("rest") >= 0) return idx("rest");
  return 0;
}

function fightLoop(run: Run, margins: number[]) {
  let guard = 0;
  while (run.phase === "fight" && run.fight && run.fight.phase === "play") {
    const f = run.fight;
    if (guard++ > 3000) throw new Error(`stuck fight, seed ${run.seed}: ${JSON.stringify({ e: f.enemy, block: f.block, hp: run.hp, log: f.log.slice(-6) })}`);
    const d = chooseMove(run);
    margins.push(d.margin);
    if (d.move.k === "play") play(run, d.move.uids);
    else endTurn(run);
  }
}

export function playRun(seed: number, policy: Policy): RunRecord {
  const run = newRun(seed);
  const rr = makeRng(seed ^ 0x5eed);
  const r = () => next(rr);
  const encounters: Encounter[] = [];
  const margins: number[] = [];

  while (run.phase !== "over" && run.floor < MAX_FLOOR) {
    if (run.phase === "map") {
      chooseNode(run, pickNode(run, policy, r));
      if ((run.phase as string) === "fight") {
        const start = run.fight!;
        const enemy = start.enemy.id, tier = start.enemy.tier, floor = run.floor;
        fightLoop(run, margins);
        const f = run.fight!;
        encounters.push({ enemy, tier, floor, turns: f.turn, won: f.phase === "won", exact: f.exact, perfect: f.perfect, hpLost: f.hpLost });
      }
    } else if (run.phase === "reward") {
      const rw = run.reward!;
      if (policy === "explore") {
        const i = Math.floor(r() * (rw.cards.length + 1));
        if (i < rw.cards.length) takeRewardCard(run, i);
        if (rw.guides.length) {
          const g = Math.floor(r() * (rw.guides.length + 1));
          if (g < rw.guides.length) takeRewardGuide(run, g, guidesFull(run) ? Math.floor(r() * run.guides.length) : undefined);
        }
      } else {
        const ranked = rw.cards
          .map((c, i) => ({ i, v: cardDef(c.def).rarity === "rare" ? 20 : c.def !== "plain" ? 12 + c.value : c.value + (c.suit === "diamonds" || c.suit === "clubs" ? 5 : 0) }))
          .sort((a, b) => b.v - a.v);
        if (ranked[0].v >= 7) takeRewardCard(run, ranked[0].i);
        if (rw.guides.length && !guidesFull(run)) takeRewardGuide(run, Math.floor(r() * rw.guides.length));
      }
      leaveReward(run);
    } else if (run.phase === "rest") {
      const w = worstCard(run);
      if (health(run) < 0.7 || !w) rest(run, "heal");
      else rest(run, "upgrade", w.uid);
    } else if (run.phase === "shop") {
      const s = run.shop!;
      for (let i = 0; i < s.guides.length; i++)
        if (!s.guides[i].sold && run.gold >= s.guides[i].price && !guidesFull(run) && (policy === "greedy" || r() < 0.5)) buyGuide(run, i);
      for (let i = 0; i < s.cards.length; i++)
        if (!s.cards[i].sold && run.gold >= s.cards[i].price && (policy === "greedy" ? s.cards[i].card.def !== "plain" : r() < 0.5)) buyCard(run, i);
      leaveShop(run);
    } else if (run.phase === "event") {
      const ev = EVENT_BY_ID[run.event!];
      let opt = policy === "explore" ? Math.floor(r() * ev.options.length) : ev.options.length - 1;
      if (ev.id === "honor_shelf" && opt === 0 && run.gold < 30) opt = 2;
      if (ev.id === "krotona_library" && policy === "greedy") opt = 0;
      const w = worstCard(run);
      if (ev.options[opt].needsCard && !w) opt = ev.options.length - 1;
      chooseEvent(run, opt, ev.options[opt].needsCard ? w!.uid : undefined);
    }
  }
  return {
    seed,
    policy,
    depth: score(run),
    diedTo: run.stats.diedTo,
    guides: run.guides.slice(),
    deckSize: allCards(run).length,
    encounters,
    stats: run.stats,
    margins,
    maxHit: run.stats.maxHit,
  };
}
