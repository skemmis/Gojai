/**
 * The clan screens: the map's own chrome, the spot sheet, first-time join,
 * profile, leaderboards, the season and territory, and the live boss board.
 * Built only from the design library (../kit); layouts take their cue from
 * the Gemini renders in /mnt/project-files/gojai-ui/renders/.
 */
import { useMemo, useState } from "react";
import { spotOpened, upcomingEvents, type EventWindow, type Find, type Spot, type SpotState } from "@gojai/map";
import { BOARDS, CLAN, FACTIONS, settle, standing, validName, type FactionId, type Scope } from "@gojai/clans";
import { encounterFor, isBossFloor, type NodeKind, type Run } from "@gojai/core";
import { ArchCard, Drops, Emblem, Gold, InkLink, LiveTag, Line, Medallion, Note, Rope, RunStatus, SCENES, SPRITES, Screen, ScrollButton, Seal, Sheet, Switch, Title, UI } from "../kit";
import { ME, PORTRAIT_NAMES, dayOf, dealFaces, factionFor, groundName, groundOfSpot, influenceIn, lastFullMoon, seasonDays, seasonName, type Town } from "./town";

export type View = "map" | "deck" | "clan" | "boards" | "you" | "live";

const clock = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "short", day: "numeric" });
const mins = (ms: number) => Math.max(1, Math.round(ms / 6e4));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const sideName = (f: FactionId) => (f === "order" ? "the Order" : "the Pathless");

export function liveNow(now: Date): EventWindow[] {
  return upcomingEvents(now, 1).filter((w) => w.start <= now && w.end > now);
}

// ─── The map's chrome ────────────────────────────────────────────────────────

/** Over the map: run status on a torn sheet, your face top right, notes (test mode, live events), and the four seals along the bottom. */
export function MapChrome({ run, town, now, go, anywhere, toggleAnywhere }: { run: Run; town: Town; now: Date; go: (v: View) => void; anywhere: boolean; toggleAnywhere: () => void }) {
  const live = liveNow(now);
  return (
    <>
      <header className="map-top">
        <Sheet wide className="map-status">
          <RunStatus hp={run.hp} max={run.maxHp} gold={run.gold} floor={isBossFloor(run.floor) ? "Boss next" : `Floor ${run.floor}`} />
        </Sheet>
        <Medallion seed={town.portraits[ME]} size="l" onClick={() => go("you")} label="Your profile" />
      </header>
      <div className="map-notes">
        <Note onClick={toggleAnywhere}>{anywhere ? "Test mode · open anywhere" : "On foot"}</Note>
        {live.map((w) => (
          <LiveTag key={w.event.id} onClick={() => go("live")}>
            <b>{w.event.name}</b> until {clock.format(w.end)}
          </LiveTag>
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

const WAITS: Record<NodeKind, string> = {
  fight: "A fight waits here",
  elite: "Something worse waits here",
  boss: "The boss of this walk waits here",
  rest: "A quiet place to rest",
  shop: "A shop is open",
  event: "Something is happening here",
};
const KIND_PLATE: Partial<Record<NodeKind, string>> = { rest: "rest", shop: "shop", event: "honor_shelf" };
const PLACE_PLATES = ["arcade", "libbey-park", "ojai-valley-trail", "shelf-road"];

/** A torn sheet rising over the darkened map: the spot, who holds its ground, what waits, and Enter. */
export function SpotSheet({ spot, state, now, town, run, onEnter, onClose }: { spot: Spot; state: SpotState; now: Date; town: Town; run: Run; onEnter: () => void; onClose: () => void }) {
  const ground = groundOfSpot(spot.id);
  const holder = ground ? (town.territory.grounds[ground]?.holder ?? null) : null;
  const inf = ground ? influenceIn(town, ground) : { order: 0, pathless: 0 };
  // What entering does on this floor (floor 1 is always a fight, boss floors a boss), not just what the spot rolled
  const kind = state.kind === "open" ? encounterFor(run, state.find) : undefined;
  const place = spotOpened(spot, state.kind === "open" ? state.find : "fight", now).place?.replace(/_/g, "-");
  const plate = (kind && KIND_PLATE[kind]) || (place && SCENES[place] ? place : PLACE_PLATES[spot.id.length % PLACE_PLATES.length]);
  const mine = town.me?.faction ?? null;
  return (
    <div className="spot-layer" onClick={onClose}>
      <div className="spot-sheet" onClick={(e) => e.stopPropagation()}>
        <Title>{spot.gameName ?? spot.name.replace(/ \(.*\)/, "")}</Title>
        <Sheet nail>
          <p className="held k-label">
            {ground ? groundName(ground) : "Outside the valley"} · {holder ? <>held by {sideName(holder)} <Emblem faction={holder} /></> : "held by nobody"}
          </p>
          <div className="vignette">
            <img src={SCENES[plate]} alt="" draggable={false} />
          </div>
          <p className="waits">
            {kind && WAITS[kind]}
            {state.kind === "far" && (Number.isFinite(state.distanceM) ? `Walk closer: ${Math.round(state.distanceM - spot.radiusM)} m to go` : "Walk here to open it")}
            {state.kind === "cooling" && (
              <>
                <img className="hourglass" src={UI.hourglass} alt="" /> Opened. A new roll in {mins(state.until.getTime() - now.getTime())} min
              </>
            )}
          </p>
          {ground && (
            <div className="tug">
              <b>{Math.round(inf.order)}</b>
              <Rope order={inf.order} pathless={inf.pathless} />
              <b>{Math.round(inf.pathless)}</b>
            </div>
          )}
          {mine && ground && state.kind === "open" && (
            <p className="gain">
              <Emblem faction={mine} /> +{CLAN.walk} influence for walking here
            </p>
          )}
        </Sheet>
        <div className="acts">
          <InkLink onClick={onClose}>Walk on</InkLink>
          {state.kind === "open" && <ScrollButton onClick={onEnter}>Enter</ScrollButton>}
        </div>
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
  return (
    <Screen
      className="join"
      title="You are dealt three faces"
      backdrop={SCENES["ojai-valley-trail"]}
      action={
        <ScrollButton disabled={!validName(name)} onClick={() => onJoin(name, dealt[pick], dealt)}>
          Begin
        </ScrollButton>
      }
    >
      <div className="fan3">
        {dealt.map((s, i) => (
          <ArchCard key={s} seed={s} name={PORTRAIT_NAMES[s]} up={pick === i} onClick={() => setPick(i)} />
        ))}
      </div>
      <Sheet nail className="faction-sheet">
        <Emblem faction={faction} big />
        <h2 className="k-name">{f.name}</h2>
        <p className="motto">{f.motto}</p>
        <p className="why">The valley needs you on this side.</p>
      </Sheet>
      <label className="ink-field" htmlFor="join-name">
        <span className="k-label">Your name</span>
        <input id="join-name" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
      </label>
    </Screen>
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export function ProfileScreen({ town, back, setPortrait, onNewRun, seed }: { town: Town; back: () => void; setPortrait: (s: number) => void; onNewRun: () => void; seed: number }) {
  const me = town.me!;
  const s = town.book.stats[ME].season;
  const face = town.portraits[ME];
  const [choosing, setChoosing] = useState(false);
  const title = me.title ?? (me.faction === "order" ? "Initiate of the Star" : "Of No Path");
  return (
    <Screen className="profile" title="You" backdrop={SCENES["shelf-road"]} onBack={back}>
      <ArchCard seed={face} name={me.name} />
      <p className="title-line">
        {title} <Emblem faction={me.faction} />
      </p>
      {choosing ? (
        <div className="faces">
          {me.dealt.map((d) => (
            <Medallion key={d} seed={d} size="l" on={d === face} onClick={() => (setPortrait(d), setChoosing(false))} label={PORTRAIT_NAMES[d]} />
          ))}
        </div>
      ) : (
        <InkLink onClick={() => setChoosing(true)}>Change portrait</InkLink>
      )}
      <Sheet>
        <Line k="Spots walked" v={s.spots} />
        <Line k="Deepest descent" v={s.depth} />
        <Line k="Influence given" v={Math.round(s.influence)} />
        <Line k="Caught" v={s.catches} />
      </Sheet>
      {me.caught.length > 0 && (
        <div className="caught-shelf" aria-label="Caught">
          {me.caught.slice(-5).map((id) => (
            <Sheet key={id} className="pinned">
              {SPRITES[id] && <img src={SPRITES[id]} alt={id} />}
            </Sheet>
          ))}
        </div>
      )}
      <div className="run-tools">
        <span className="k-label">Run seed {seed}</span>
        <InkLink onClick={onNewRun}>Start a new run</InkLink>
      </div>
    </Screen>
  );
}

// ─── Leaderboards ────────────────────────────────────────────────────────────

const TABS = [
  { id: "walkers-week", label: "Walkers" },
  { id: "deepest-season", label: "Deepest" },
  { id: "offerings-season", label: "Offerings" },
  { id: "slayers-season", label: "Slayers" },
];
const SCOPES = [
  { id: "everyone" as const, label: "Everyone" },
  { id: "faction" as const, label: "Your faction" },
  { id: "friends" as const, label: "Friends" },
];
const WINDOW_WORD = { week: "this week", season: "this season", all: "all time" } as const;

export function BoardsScreen({ town, back }: { town: Town; back: () => void }) {
  const [tab, setTab] = useState(TABS[0].id);
  const [scopeKind, setScope] = useState<Scope["kind"]>("everyone");
  const board = BOARDS.find((b) => b.id === tab)!;
  const me = town.me!;
  const scope: Scope = scopeKind === "everyone" ? { kind: "everyone" } : scopeKind === "faction" ? { kind: "faction", faction: me.faction } : { kind: "friends", of: ME };
  const st = standing(town.book, board, scope, ME, 6);
  const shown = st.top.some((r) => r.player === ME);
  return (
    <Screen className="boards" title={`${board.name} · ${WINDOW_WORD[board.window]}`} backdrop={SCENES["libbey-park"]} dim={0.5} onBack={back}>
      <Switch big options={TABS} value={tab} onChange={setTab} />
      <Switch options={SCOPES} value={scopeKind} onChange={setScope} />
      <Sheet className="board-sheet">
        <ol className="ranks">
          {st.top.map((r) => (
            <RankRow key={r.player} town={town} r={r} />
          ))}
        </ol>
        {st.top.length === 0 && <p className="empty">Nobody here yet. Walk a spot to be first.</p>}
      </Sheet>
      {st.you && !shown && (
        <Sheet wide className="you-row">
          <ol className="ranks">
            <RankRow town={town} r={st.you} />
          </ol>
        </Sheet>
      )}
      {!st.you && <p className="nudge">You're not on this board yet.</p>}
      <p className="k-label unit">Counted in {board.unit}</p>
    </Screen>
  );
}

function RankRow({ town, r }: { town: Town; r: { rank: number; player: string; name: string; faction: FactionId; value: number } }) {
  return (
    <li className={`rank ${r.player === ME ? "me" : ""}`}>
      <span className={`n ${r.rank <= 3 ? "laurel" : ""}`}>
        {r.rank <= 3 && <img src={UI.laurel} alt="" />}
        <b>{r.rank}</b>
      </span>
      <Medallion seed={town.portraits[r.player]} size="s" />
      <Line
        k={
          <>
            {r.name} <Emblem faction={r.faction} />
          </>
        }
        v={r.value}
      />
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
  const grounds = Object.values(t.grounds).sort((a, b) => groundName(a.id).localeCompare(groundName(b.id)));
  const flips = town.lastFlips.filter((f) => f.to);
  return (
    <Screen className="clan" title={seasonName(town.seasonStart)} backdrop={SCENES["arcade"]} dim={0.5} onBack={back}>
      <p className="season-day">
        Day {day} of {days} · ends at the full moon, {dayFmt.format(ends)}
      </p>
      <Score order={t.score.order} pathless={t.score.pathless} note={`neighborhood-days held · you walk for ${sideName(me.faction)}`} />
      <Sheet className="ground-sheet">
        {grounds.map((g) => {
          const next = settle(g);
          return (
            <div key={g.id} className="ground">
              <Line k={groundName(g.id)} v={g.holder ? <Emblem faction={g.holder} /> : <span className="none">nobody</span>} />
              <Rope small order={g.influence.order} pathless={g.influence.pathless} />
              {next !== g.holder && <em className="turning">{next ? `goes to ${sideName(next)} at 4 AM` : "falls empty at 4 AM"}</em>}
            </div>
          );
        })}
      </Sheet>
      {flips.length > 0 && <p className="last-night">Last night: {flips.map((f) => `${groundName(f.ground)} went to ${sideName(f.to!)}`).join("; ")}.</p>}
    </Screen>
  );
}

/** Two factions facing each other across the rope, each with its number. */
function Score({ order, pathless, note }: { order: number; pathless: number; note: string }) {
  return (
    <div className="score-block">
      <div className="score">
        <Emblem faction="order" big />
        <b>{order.toLocaleString()}</b>
        <span className="vs">
          <img src={UI.rope} alt="" />
        </span>
        <b>{pathless.toLocaleString()}</b>
        <Emblem faction="pathless" big />
      </div>
      <p className="score-note">{note}</p>
    </div>
  );
}

// ─── Live boss ───────────────────────────────────────────────────────────────

/** The one pink screen: the live event's boss, the faction damage race, and who's hitting hardest. */
export function LiveScreen({ town, now, back }: { town: Town; now: Date; back: () => void }) {
  const w = liveNow(now)[0];
  if (!w) {
    return (
      <Screen className="live" title="Nothing live" backdrop={SCENES["shelf-road"]} onBack={back}>
        <p className="season-day">The next event shows here while it's on.</p>
      </Screen>
    );
  }
  const ground = w.event.spots.map(groundOfSpot).find(Boolean);
  // Until the server runs shared bosses, the crowd is the town's walkers, hitting through the window.
  const done = (now.getTime() - w.start.getTime()) / (w.end.getTime() - w.start.getTime());
  const crowd = town.bots.filter((_, i) => (i * 37 + w.event.id.length) % 6 === 0);
  const hits = crowd.map((b, i) => ({ id: b.id, faction: b.faction, dmg: Math.round((30 + ((i * 53) % 70)) * done * 3) }));
  const maxHp = CLAN.boss.baseHp + CLAN.boss.hpPerPlayer * crowd.length;
  const dealt = hits.reduce((s, h) => s + h.dmg, 0);
  const race = { order: 0, pathless: 0 };
  for (const h of hits) race[h.faction] += h.dmg;
  const top = [...hits].sort((a, b) => b.dmg - a.dmg).slice(0, 3);
  const plate = w.event.id === "pink-moment" ? "shelf-road" : ground && SCENES[ground] ? ground : "arcade";
  return (
    <Screen className="live" title={w.event.name} backdrop={SCENES[plate]} dim={0} pink onBack={back}>
      <Drops hp={Math.max(0, maxHp - dealt)} max={maxHp} loss={0} who="foe" />
      <div className="live-tags">
        <LiveTag>
          Ends in <b>{mins(w.end.getTime() - now.getTime())} min</b>
        </LiveTag>
        <LiveTag>
          <b>{plural(crowd.length, "walker")}</b> here
        </LiveTag>
      </div>
      <Score order={race.order} pathless={race.pathless} note={`The leader takes ${ground ? groundName(ground) : "the ground"}`} />
      <Sheet wide className="hitters">
        {top.map((h, i) => (
          <Line key={h.id} k={`${i + 1}. ${town.book.players[h.id]?.name ?? h.id}`} v={h.dmg} />
        ))}
      </Sheet>
      <p className="nudge">Group fights open once the game has its server. Until then the town fights without you.</p>
    </Screen>
  );
}
