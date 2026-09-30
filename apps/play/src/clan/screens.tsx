/**
 * The clan screens: the map's own chrome, the spot sheet, first-time join,
 * profile, leaderboards, the season and territory, and the live boss board.
 * Each follows its Gemini render (/mnt/project-files/gojai-ui/renders/,
 * Sam's picks in https://claude.ai/artifact/WEyz2iBYAm6w1ahMd7ZLue).
 */
import { useMemo, useState } from "react";
import { spotOpened, upcomingEvents, type EventWindow, type Find, type Spot, type SpotState } from "@gojai/map";
import { BOARDS, CLAN, FACTIONS, settle, standing, validName, type FactionId, type Scope } from "@gojai/clans";
import { isBossFloor, type Run } from "@gojai/core";
import { Drops, Ribbon, SCENES, SPRITES } from "../fight";
import { ArchCard, Back, Backdrop, Emblem, Gold, InkLink, Line, Medallion, Rope, ScrollButton, Seal, Sheet, UI } from "../pieces";
import {
  ME,
  PORTRAIT_NAMES,
  dayOf,
  dealFaces,
  factionFor,
  groundName,
  groundOfSpot,
  influenceIn,
  lastFullMoon,
  seasonDays,
  seasonName,
  type Town,
} from "./town";

export type View = "map" | "deck" | "clan" | "boards" | "you" | "live";

const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });
const mins = (ms: number) => Math.max(1, Math.round(ms / 6e4));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function liveNow(now: Date): EventWindow[] {
  return upcomingEvents(now, 1).filter((w) => w.start <= now && w.end > now);
}

// ─── The map's chrome ────────────────────────────────────────────────────────

/** Over the map: run status on a torn strip, your face top right, live events as pink tags, and the four seals along the bottom. */
export function MapChrome({
  run,
  town,
  now,
  go,
  anywhere,
  toggleAnywhere,
}: {
  run: Run;
  town: Town;
  now: Date;
  go: (v: View) => void;
  anywhere: boolean;
  toggleAnywhere: () => void;
}) {
  const live = liveNow(now);
  return (
    <>
      <header className="map-top">
        <div className="strip">
          <span className="floor">{isBossFloor(run.floor) ? "Boss next" : `Floor ${run.floor}`}</span>
          <Drops hp={run.hp} max={run.maxHp} loss={0} who="you" />
          <Gold n={run.gold} />
        </div>
        <Medallion seed={town.portraits[ME]} className="me" onClick={() => go("you")} label="Your profile" />
      </header>
      <div className="map-notes">
        <button className={`note test ${anywhere ? "on" : ""}`} onClick={toggleAnywhere} title="Test mode opens any spot from anywhere">
          {anywhere ? "Test mode · open anywhere" : "On foot"}
        </button>
        {live.map((w) => (
          <button key={w.event.id} className="note live" onClick={() => go("live")}>
            <b>{w.event.name}</b> until {clock.format(w.end)}
          </button>
        ))}
      </div>
      <nav className="map-nav">
        <Seal onClick={() => go("deck")}>Deck</Seal>
        <Seal onClick={() => go("clan")}>Clan</Seal>
        <Seal onClick={() => go("boards")}>Boards</Seal>
        <Seal onClick={() => go("you")}>You</Seal>
      </nav>
    </>
  );
}

// ─── A spot, opened on the map ───────────────────────────────────────────────

const WAITS: Record<Find, string> = {
  fight: "A fight waits here",
  elite: "Something worse waits here",
  rest: "A quiet place to rest",
  shop: "A shop is open",
  mystery: "Something is happening here",
};
const FIND_PLATE: Partial<Record<Find, string>> = { rest: "rest", shop: "shop", mystery: "honor_shelf" };
const PLACE_PLATES = ["arcade", "libbey-park", "ojai-valley-trail", "shelf-road"];

/** A torn sheet rising over the darkened map: the spot, who holds its ground, what waits, and Enter. */
export function SpotSheet({
  spot,
  state,
  now,
  town,
  run,
  onEnter,
  onClose,
}: {
  spot: Spot;
  state: SpotState;
  now: Date;
  town: Town;
  run: Run;
  onEnter: () => void;
  onClose: () => void;
}) {
  const ground = groundOfSpot(spot.id);
  const g = ground ? town.territory.grounds[ground] : undefined;
  const holder = g?.holder ?? null;
  const inf = ground ? influenceIn(town, ground) : { order: 0, pathless: 0 };
  const find = state.kind === "open" ? state.find : undefined;
  const boss = find && isBossFloor(run.floor);
  const place = spotOpened(spot, find ?? "fight", now).place?.replace(/_/g, "-");
  const plate = (find && FIND_PLATE[find]) || (place && SCENES[place] ? place : PLACE_PLATES[spot.id.length % PLACE_PLATES.length]);
  const mine = town.me?.faction ?? null;
  return (
    <div className="spot-layer" onClick={onClose}>
      <div className="spot-sheet" onClick={(e) => e.stopPropagation()}>
        <Sheet nail>
          <Ribbon name={spot.gameName ?? spot.name.replace(/ \(.*\)/, "")} />
          <p className="held">
            {ground ? groundName(ground) : "Outside the valley"}
            {" · "}
            {holder ? (
              <>
                held by {FACTIONS[holder].name} <Emblem faction={holder} />
              </>
            ) : (
              "held by nobody"
            )}
          </p>
          <div className="vignette">
            <img src={SCENES[plate]} alt="" draggable={false} />
          </div>
          <p className="waits">
            {state.kind === "open" && (boss ? "The boss of this walk waits here" : WAITS[state.find])}
            {state.kind === "far" && (Number.isFinite(state.distanceM) ? `Walk closer: ${Math.round(state.distanceM - spot.radiusM)} m to go` : "Walk here to open it")}
            {state.kind === "cooling" && "You've opened this one"}
          </p>
          {ground && (
            <div className="tug">
              <b className="num">{Math.round(inf.order)}</b>
              <Rope order={inf.order} pathless={inf.pathless} />
              <b className="num">{Math.round(inf.pathless)}</b>
            </div>
          )}
          {mine && ground && state.kind === "open" && (
            <p className="gain">
              <Emblem faction={mine} /> +{CLAN.walk} influence for walking here
            </p>
          )}
          <div className="acts">
            <InkLink onClick={onClose}>Walk on</InkLink>
            {state.kind === "open" && <ScrollButton onClick={onEnter}>Enter</ScrollButton>}
          </div>
          {state.kind === "cooling" && (
            <p className="reroll">
              <img src={UI.hourglass} alt="" /> new roll in {mins(state.until.getTime() - now.getTime())} min
            </p>
          )}
        </Sheet>
      </div>
    </div>
  );
}

// ─── First time: faces and faction ───────────────────────────────────────────

export function JoinScreen({ town, seed, onJoin }: { town: Town; seed: number; onJoin: (name: string, portrait: number, dealt: number[]) => void }) {
  const dealt = useMemo(() => dealFaces(seed), [seed]);
  const [pick, setPick] = useState(1);
  const [name, setName] = useState("");
  const faction = useMemo(() => factionFor(town), [town]);
  const f = FACTIONS[faction];
  const ok = validName(name);
  return (
    <section className="screen join">
      <Backdrop src={SCENES["ojai-valley-trail"]} dim={0.35} />
      <Ribbon name="You are dealt three faces" />
      <div className="fan3">
        {dealt.map((s, i) => (
          <ArchCard key={s} seed={s} name={PORTRAIT_NAMES[s]} className={`pos${i} ${pick === i ? "up" : ""}`} onClick={() => setPick(i)} />
        ))}
      </div>
      <Sheet nail className="faction-sheet">
        <Emblem faction={faction} className="big" />
        <h2>{f.name}</h2>
        <p className="motto">{f.motto}</p>
        <p className="why">The valley needs you on this side.</p>
      </Sheet>
      <label className="ink-field" htmlFor="join-name">
        <input id="join-name" value={name} maxLength={20} placeholder="Your name" onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
      </label>
      <ScrollButton disabled={!ok} onClick={() => onJoin(name, dealt[pick], dealt)}>
        Begin
      </ScrollButton>
    </section>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];

export function ProfileScreen({
  town,
  back,
  setPortrait,
  onNewRun,
  seed,
}: {
  town: Town;
  back: () => void;
  setPortrait: (s: number) => void;
  onNewRun: () => void;
  seed: number;
}) {
  const me = town.me!;
  const st = town.book.stats[ME];
  const s = st.season;
  const face = town.portraits[ME];
  const [choosing, setChoosing] = useState(false);
  const title = me.title ?? (me.faction === "order" ? "Initiate of the Star" : "Of No Path");
  return (
    <section className="screen profile">
      <Backdrop src={SCENES["shelf-road"]} dim={0.4} />
      <Back onClick={back} />
      <div className="tarot">
        <ArchCard seed={face} name={me.name} />
        <span className="numeral">{ROMAN[Math.min(21, st.all.depth)] || "0"}</span>
      </div>
      <p className="title-line">
        {title} <Emblem faction={me.faction} />
      </p>
      <div className="ledger">
        <Line k="Spots walked" v={s.spots} />
        <Line k="Deepest descent" v={s.depth} />
        <Line k="Influence given" v={Math.round(s.influence)} />
        <Line k="Caught" v={s.catches} />
      </div>
      {me.caught.length > 0 && (
        <div className="caught-shelf" aria-label="Caught">
          {me.caught.slice(-5).map((id) => (
            <span key={id} className="pinned">
              {SPRITES[id] && <img src={SPRITES[id]} alt={id} />}
            </span>
          ))}
        </div>
      )}
      {choosing ? (
        <div className="faces">
          {me.dealt.map((d) => (
            <Medallion key={d} seed={d} className={d === face ? "on" : ""} onClick={() => (setPortrait(d), setChoosing(false))} label={PORTRAIT_NAMES[d]} />
          ))}
        </div>
      ) : (
        <InkLink onClick={() => setChoosing(true)}>Change portrait</InkLink>
      )}
      <div className="run-tools">
        <span className="small soft">Run seed {seed}</span>
        <InkLink onClick={onNewRun}>Start a new run</InkLink>
      </div>
    </section>
  );
}

// ─── Leaderboards ────────────────────────────────────────────────────────────

const TABS = ["walkers-week", "deepest-season", "offerings-season", "slayers-season"];
const TAB_NAME: Record<string, string> = { "walkers-week": "Walkers", "deepest-season": "Deepest", "offerings-season": "Offerings", "slayers-season": "Slayers" };
const WINDOW_WORD = { week: "this week", season: "this season", all: "all time" } as const;

export function BoardsScreen({ town, back }: { town: Town; back: () => void }) {
  const [tab, setTab] = useState(TABS[0]);
  const [scopeKind, setScope] = useState<Scope["kind"]>("everyone");
  const board = BOARDS.find((b) => b.id === tab)!;
  const me = town.me!;
  const scope: Scope = scopeKind === "everyone" ? { kind: "everyone" } : scopeKind === "faction" ? { kind: "faction", faction: me.faction } : { kind: "friends", of: ME };
  const st = standing(town.book, board, scope, ME, 6);
  const shown = new Set(st.top.map((r) => r.player));
  return (
    <section className="screen boards">
      <Backdrop src={SCENES["libbey-park"]} dim={0.45} />
      <Back onClick={back} />
      <Ribbon name={`${board.name} · ${WINDOW_WORD[board.window]}`} />
      <nav className="tabs">
        {TABS.map((id) => (
          <button key={id} className={`tab ${id === tab ? "on" : ""}`} onClick={() => setTab(id)}>
            {TAB_NAME[id]}
          </button>
        ))}
      </nav>
      <Sheet className="board-sheet">
        <div className="scopes">
          {(["everyone", "faction", "friends"] as const).map((k) => (
            <button key={k} className={scopeKind === k ? "on" : ""} onClick={() => setScope(k)}>
              {k === "everyone" ? "Everyone" : k === "faction" ? "Faction" : "Friends"}
            </button>
          ))}
        </div>
        <ol className="ranks">
          {st.top.map((r) => (
            <RankRow key={r.player} town={town} r={r} unit={board.unit} />
          ))}
        </ol>
        {st.top.length === 0 && <p className="empty">Nobody here yet. Walk a spot to be first.</p>}
      </Sheet>
      {st.you && !shown.has(ME) && (
        <>
          <p className="gap" aria-hidden="true">
            · · ·
          </p>
          <Sheet wide className="you-row">
            <ol className="ranks">
              <RankRow town={town} r={st.you} unit={board.unit} />
            </ol>
          </Sheet>
        </>
      )}
      {!st.you && <p className="nudge">You're not on this board yet.</p>}
    </section>
  );
}

function RankRow({ town, r, unit }: { town: Town; r: { rank: number; player: string; name: string; faction: FactionId; value: number }; unit: string }) {
  return (
    <li className={`rank ${r.player === ME ? "me" : ""}`} title={`${r.value} ${unit}`}>
      <span className={`n ${r.rank <= 3 ? "laurel" : ""}`}>
        {r.rank <= 3 && <img src={UI.laurel} alt="" />}
        <b>{r.rank}</b>
      </span>
      <Medallion seed={town.portraits[r.player]} className="tiny" />
      <Line k={
        <>
          {r.name} <Emblem faction={r.faction} />
        </>
      } v={r.value} />
    </li>
  );
}

// ─── The season and the town ─────────────────────────────────────────────────

export function ClanScreen({ town, now, back }: { town: Town; now: Date; back: () => void }) {
  const t = town.territory;
  const me = town.me!;
  const days = seasonDays();
  const day = Math.min(days, dayOf(town, now.getTime()) + 1);
  const ends = new Date(lastFullMoon(town.seasonStart) + days * 864e5);
  const grounds = Object.values(t.grounds).sort((a, b) => b.influence.order + b.influence.pathless - (a.influence.order + a.influence.pathless));
  const flips = town.lastFlips.filter((f) => f.to);
  return (
    <section className="screen clan">
      <Backdrop src={SCENES["arcade"]} dim={0.45} />
      <Back onClick={back} />
      <Ribbon name={seasonName(town.seasonStart)} />
      <p className="season-day">
        Day {day} of {days} · ends at the full moon, {dayFmt.format(ends)}
      </p>
      <div className="score" aria-label="Neighborhood-days held this season">
        <Emblem faction="order" className="big" />
        <b className="num">{t.score.order}</b>
        <span className="vs">
          <img src={UI.rope} alt="" />
        </span>
        <b className="num">{t.score.pathless}</b>
        <Emblem faction="pathless" className="big" />
      </div>
      <p className="score-note">neighborhood-days held · you walk for {FACTIONS[me.faction].name}</p>
      <Sheet className="ground-sheet">
        {grounds.map((g) => {
          const next = settle(g);
          const turning = next !== g.holder;
          return (
            <div key={g.id} className="ground">
              <Line k={groundName(g.id)} v={g.holder ? <Emblem faction={g.holder} /> : <span className="soft">none</span>} />
              <Rope order={g.influence.order} pathless={g.influence.pathless} className="small" />
              {turning && <em className="turning">{next ? `goes to ${next === "order" ? "the Order" : "the Pathless"} at 4 AM` : "falls empty at 4 AM"}</em>}
            </div>
          );
        })}
      </Sheet>
      {flips.length > 0 && (
        <p className="last-night">
          Last night: {flips.map((f) => `${groundName(f.ground)} went to ${f.to === "order" ? "the Order" : "the Pathless"}`).join("; ")}.
        </p>
      )}
    </section>
  );
}

// ─── Live boss ───────────────────────────────────────────────────────────────

/** The one pink screen: the live event's boss, the faction damage race, and who's hitting hardest. */
export function LiveScreen({ town, now, back }: { town: Town; now: Date; back: () => void }) {
  const w = liveNow(now)[0];
  if (!w) {
    return (
      <section className="screen live">
        <Backdrop src={SCENES["shelf-road"]} dim={0.3} />
        <Back onClick={back} />
        <Ribbon name="Nothing live" />
        <p className="season-day">The next event shows here while it's on.</p>
      </section>
    );
  }
  const ground = w.event.spots.map(groundOfSpot).find(Boolean);
  // Until the server runs shared bosses, the crowd is the town's walkers, hitting through the window.
  const done = (now.getTime() - w.start.getTime()) / (w.end.getTime() - w.start.getTime());
  const crowd = town.bots.filter((b, i) => (i * 37 + w.event.id.length) % 6 === 0);
  const hits = crowd.map((b, i) => ({ id: b.id, faction: b.faction, dmg: Math.round((30 + ((i * 53) % 70)) * done * 3) }));
  const maxHp = CLAN.boss.baseHp + CLAN.boss.hpPerPlayer * crowd.length;
  const dealt = hits.reduce((s, h) => s + h.dmg, 0);
  const race = { order: 0, pathless: 0 };
  for (const h of hits) race[h.faction] += h.dmg;
  const top = [...hits].sort((a, b) => b.dmg - a.dmg).slice(0, 3);
  const plate = w.event.id === "pink-moment" ? "shelf-road" : ground && SCENES[ground] ? ground : "arcade";
  return (
    <section className="screen live">
      <Backdrop src={SCENES[plate]} pink />
      <Back onClick={back} />
      <Ribbon name={w.event.name} />
      <Drops hp={Math.max(0, maxHp - dealt)} max={maxHp} loss={0} who="foe" />
      <div className="live-tags">
        <span className="pink-tag">
          Ends in <b>{mins(w.end.getTime() - now.getTime())} min</b>
        </span>
        <span className="pink-tag">
          <b>{plural(crowd.length, "walker")}</b> here
        </span>
      </div>
      <div className="score">
        <Emblem faction="order" className="big" />
        <b className="num">{race.order.toLocaleString()}</b>
        <span className="vs">
          <img src={UI.rope} alt="" />
        </span>
        <b className="num">{race.pathless.toLocaleString()}</b>
        <Emblem faction="pathless" className="big" />
      </div>
      <p className="score-note">The leader takes {ground ? groundName(ground) : "the ground"}</p>
      <Sheet wide className="hitters">
        {top.map((h, i) => (
          <Line key={h.id} k={`${i + 1}. ${town.book.players[h.id]?.name ?? h.id}`} v={h.dmg} />
        ))}
      </Sheet>
      <p className="nudge">Group fights open once the game has its server. Until then the town fights without you.</p>
    </section>
  );
}
