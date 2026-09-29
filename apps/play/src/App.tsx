import { useState } from "react";
import { MapScreen as WorldMap } from "@gojai/map-app/MapScreen";
import { visit, type SpotOpened, type Visits } from "@gojai/map";
import {
  newRun,
  enterEncounter,
  isBossFloor,
  play,
  playError,
  previewPlay,
  endTurn,
  intent,
  incoming,
  hitSize,
  multiplier,
  takeRewardCard,
  takeRewardGuide,
  leaveReward,
  guidesFull,
  rest,
  buyCard,
  buyGuide,
  buyRemoval,
  leaveShop,
  chooseEvent,
  allCards,
  cardName,
  cardDef,
  isJunk,
  restHeal,
  score,
  ENEMY_BY_ID,
  EVENT_BY_ID,
  GUIDE_BY_ID,
  CONFIG,
} from "@gojai/core";
import type { Run, Suit, EnemyAction } from "@gojai/core";
import { FightScreen } from "./fight";
import { CardView, CardPicker, GuideChip, Icon, PowerLine, SuitMark, POWER, sortCards, type IconName } from "./components";

type Act = (fn: (r: Run) => void) => boolean;

const randomSeed = () => Math.floor(Math.random() * 1e9);

/** Per-viewer conveniences kept in this browser only; the page works without them. */
function stored<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`pathless.${key}`);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(`pathless.${key}`, JSON.stringify(value));
  } catch {
    /* private window or blocked storage: keep going without it */
  }
}

export function App() {
  const [run, setRun] = useState<Run>(() => newRun(randomSeed()));
  const [error, setError] = useState<string | null>(null);
  const [seedText, setSeedText] = useState("");
  // Who you are to the map (finds differ per player), which spots you've opened, and test mode
  const [playerId] = useState(() => {
    const id = stored("player", "") || `p${randomSeed()}`;
    store("player", id);
    return id;
  });
  const [visits, setVisits] = useState<Visits>(() => stored("visits", {}));
  const [anywhere, setAnywhere] = useState<boolean>(() => stored("anywhere", true));

  const openSpot = (o: SpotOpened) => {
    const ok = act((r) =>
      enterEncounter(r, o.find, { spotId: o.spot.id, name: o.spot.gameName ?? o.spot.name, place: o.place, live: o.liveEvents }),
    );
    if (!ok) return;
    const v = visit(visits, o.spot, o.at);
    setVisits(v);
    store("visits", v);
  };

  const act: Act = (fn) => {
    const r = structuredClone(run);
    try {
      fn(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
    setError(null);
    setRun(r);
    return true;
  };

  const startNew = (seed?: number) => {
    const s = seed ?? (seedText.trim() ? Number(seedText.trim()) : randomSeed());
    if (!Number.isFinite(s)) return setError("Seed must be a number.");
    setRun(newRun(Math.floor(s)));
    setError(null);
  };

  // Fights happen on the night table; the map is the home screen; everything else is ink on paper.
  const night = run.phase === "fight";
  const onMap = run.phase === "map";
  return (
    <div className={`app ${night ? "night" : "paper"} ${onMap ? "on-map" : ""}`}>
      {!onMap && <StatusBar run={run} />}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <main>
          {/* The map stays mounted under every other screen, so it keeps its place and loads once */}
          <div className="world" hidden={!onMap}>
            <WorldMap
              playerId={playerId}
              visits={visits}
              anywhere={anywhere}
              autoLocate={!anywhere}
              onOpen={openSpot}
              tools={
                <>
                <span className="run-chip" title={isBossFloor(run.floor) ? "A boss waits at the next spot" : `Floor ${run.floor}`}>
                  <b>{isBossFloor(run.floor) ? "Boss" : `F${run.floor}`}</b> {run.hp}/{run.maxHp} <i className="chip-coin" />
                  {run.gold}
                </span>
                <button
                  className={`test ${anywhere ? "on" : ""}`}
                  onClick={() => {
                    setAnywhere(!anywhere);
                    store("anywhere", !anywhere);
                  }}
                  title="Test mode: open any spot from anywhere"
                >
                  {anywhere ? "Test mode" : "On foot"}
                </button>
                </>
              }
            />
          </div>
        {run.phase === "fight" && <FightScreen run={run} act={act} />}
        {run.phase === "reward" && <RewardScreen run={run} act={act} />}
        {run.phase === "rest" && <RestScreen run={run} act={act} />}
        {run.phase === "shop" && <ShopScreen run={run} act={act} />}
        {run.phase === "event" && <EventScreen run={run} act={act} />}
        {run.phase === "over" && <OverScreen run={run} onNew={() => startNew(randomSeed())} />}
      </main>
      {!night && !onMap && (
      <footer className="row wrap">
        <span className="soft">Seed {run.seed}</span>
        <input className="seed" inputMode="numeric" placeholder="random" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
        <button className="btn ghost" onClick={() => startNew()}>
          New run
        </button>
      </footer>
      )}
    </div>
  );
}

// ─── Status bar and Guides ───────────────────────────────────────────────────

function StatusBar({ run }: { run: Run }) {
  return (
    <header className="status">
      <div className="row between">
        <span className="label">
          Floor {run.floor}
        </span>
        <span className="row gap">
          {run.phase !== "fight" && (
            <span className="label">
              HP <b className="num">{run.hp}</b>/{run.maxHp}
            </span>
          )}
          <span className="gold">
            <i />
            <b className="num">{run.gold}</b>
          </span>
        </span>
      </div>
      {run.guides.length > 0 && run.phase !== "fight" && (
        <div className="guides">
          {run.guides.map((g, i) => (
            <GuideChip key={g + i} id={g} />
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Reward ──────────────────────────────────────────────────────────────────

function GuideReplace({ run, onPick, onCancel }: { run: Run; onPick: (i: number) => void; onCancel: () => void }) {
  return (
    <div className="panel picker">
      <div className="row between">
        <h3>Guides full: replace which?</h3>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="guides">
        {run.guides.map((g, i) => (
          <GuideChip key={g + i} id={g} onClick={() => onPick(i)} />
        ))}
      </div>
    </div>
  );
}

function RewardScreen({ run, act }: { run: Run; act: Act }) {
  const r = run.reward!;
  const [pending, setPending] = useState<number | null>(null);
  const takeGuide = (i: number) => {
    if (guidesFull(run)) setPending(i);
    else act((x) => takeRewardGuide(x, i));
  };
  return (
    <section className="sheet reward">
      <h2 className="title">{run.fight?.exact ? "Caught" : "Victory"}</h2>
      {r.perfect && <span className="band gilt">Perfect · no damage taken</span>}
      <p className="soft">
        Gold <b className="gilt-text num big-num">+{r.gold}</b>
      </p>
      {r.caught && (
        <div className="caught">
          <CardView card={r.caught} />
          <p>
            <b>{cardName(r.caught)}</b> joins your deck.
          </p>
        </div>
      )}
      <h3 className="label center">{r.cardTaken ? "Card taken" : "Pick a card"}</h3>
      <div className="cards center">
        {r.cards.map((c, i) => (
          <CardView key={c.uid} card={c} disabled={r.cardTaken} off={r.cardTaken} onClick={() => act((x) => takeRewardCard(x, i))} />
        ))}
      </div>
      {r.guides.length > 0 && (
        <>
          <h3 className="label center">{r.guideTaken ? "Guide taken" : "Pick a Guide"}</h3>
          {!r.guideTaken && (
            <div className="guides center">
              {r.guides.map((g, i) => (
                <GuideChip key={g} id={g} onClick={() => takeGuide(i)} />
              ))}
            </div>
          )}
          {pending !== null && (
            <GuideReplace
              run={run}
              onCancel={() => setPending(null)}
              onPick={(ri) => {
                act((x) => takeRewardGuide(x, pending, ri));
                setPending(null);
              }}
            />
          )}
        </>
      )}
      <div className="foot row between">
        <span className="soft small">HP {run.hp}/{run.maxHp}</span>
        <button className="btn" onClick={() => act(leaveReward)}>
          {r.cardTaken ? "Continue" : "Skip and continue"}
        </button>
      </div>
    </section>
  );
}

// ─── Rest ────────────────────────────────────────────────────────────────────

function RestScreen({ run, act }: { run: Run; act: Act }) {
  const [mode, setMode] = useState<null | "upgrade" | "letgo">(null);
  const cards = allCards(run).filter((c) => !isJunk(c) && (mode !== "upgrade" || c.value < 10));
  return (
    <section className="sheet">
      <h2>A quiet bench under the oaks</h2>
      <p className="soft">Choose one.</p>
      <div className="choices">
        <button className="choice" onClick={() => act((r) => rest(r, "heal"))}>
          <b>Heal</b>
          <span>
            +{Math.min(restHeal(run), run.maxHp - run.hp)} HP ({run.hp}/{run.maxHp})
          </span>
        </button>
        <button className="choice" onClick={() => setMode("upgrade")}>
          <b>Upgrade</b>
          <span>A card gains +{CONFIG.restUpgrade} value</span>
        </button>
        <button className="choice" onClick={() => setMode("letgo")}>
          <b>Let go</b>
          <span>Remove a card for good</span>
        </button>
      </div>
      {mode && (
        <CardPicker
          title={mode === "upgrade" ? "Upgrade which card?" : "Let go of which card?"}
          cards={cards}
          onCancel={() => setMode(null)}
          onPick={(uid) => act((r) => rest(r, mode, uid))}
        />
      )}
    </section>
  );
}

// ─── Shop ────────────────────────────────────────────────────────────────────

function ShopScreen({ run, act }: { run: Run; act: Act }) {
  const s = run.shop!;
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  return (
    <section className="sheet">
      <h2>The shop</h2>
      <h3 className="label">Cards</h3>
      <div className="cards">
        {s.cards.map((it, i) => (
          <div key={it.card.uid} className="ware">
            <CardView card={it.card} disabled={it.sold} off={it.sold || run.gold < it.price} onClick={() => act((r) => buyCard(r, i))} />
            <Price sold={it.sold} price={it.price} gold={run.gold} />
          </div>
        ))}
      </div>
      <h3 className="label">Guides</h3>
      <div className="guides">
        {s.guides.map((g, i) => (
          <div key={g.id} className="ware">
            <GuideChip
              id={g.id}
              onClick={() => {
                if (g.sold) return;
                if (guidesFull(run)) setPending(i);
                else act((r) => buyGuide(r, i));
              }}
            />
            <Price sold={g.sold} price={g.price} gold={run.gold} />
          </div>
        ))}
      </div>
      {pending !== null && (
        <GuideReplace
          run={run}
          onCancel={() => setPending(null)}
          onPick={(ri) => {
            act((r) => buyGuide(r, pending, ri));
            setPending(null);
          }}
        />
      )}
      <div className="foot row between wrap">
        <button className="btn ghost" disabled={s.removed} onClick={() => setRemoving(true)}>
          {s.removed ? "Removed" : `Remove a card · ${s.removePrice}`}
        </button>
        <button className="btn" onClick={() => act(leaveShop)}>
          Leave
        </button>
      </div>
      {removing && (
        <CardPicker
          title={`Remove which card? (${s.removePrice} gold)`}
          cards={allCards(run).filter((c) => !isJunk(c))}
          onCancel={() => setRemoving(false)}
          onPick={(uid) => {
            if (act((r) => buyRemoval(r, uid))) setRemoving(false);
          }}
        />
      )}
    </section>
  );
}

function Price({ sold, price, gold }: { sold: boolean; price: number; gold: number }) {
  if (sold) return <span className="soft small">Sold</span>;
  return (
    <span className={`gold small ${gold < price ? "short" : ""}`}>
      <i />
      <b className="num">{price}</b>
    </span>
  );
}

// ─── Event ───────────────────────────────────────────────────────────────────

function EventScreen({ run, act }: { run: Run; act: Act }) {
  const ev = EVENT_BY_ID[run.event!];
  const [picking, setPicking] = useState<number | null>(null);
  return (
    <section className="sheet">
      <h2>{ev.title}</h2>
      <p>{ev.text}</p>
      <div className="options">
        {ev.options.map((o, i) => (
          <button key={i} className="choice" onClick={() => (o.needsCard ? setPicking(i) : act((r) => chooseEvent(r, i)))}>
            <b>{o.label}</b>
          </button>
        ))}
      </div>
      {picking !== null && (
        <CardPicker
          title="Choose a card"
          cards={allCards(run).filter((c) => !isJunk(c))}
          onCancel={() => setPicking(null)}
          onPick={(uid) => act((r) => chooseEvent(r, picking, uid))}
        />
      )}
    </section>
  );
}

// ─── Game over ───────────────────────────────────────────────────────────────

function OverScreen({ run, onNew }: { run: Run; onNew: () => void }) {
  const st = run.stats;
  const killer = st.diedTo ? (ENEMY_BY_ID[st.diedTo]?.name ?? st.diedTo) : "unknown";
  const rows: [string, string | number][] = [
    ["Floors cleared", score(run)],
    ["Fell to", killer],
    ["Fights", st.fights],
    ["Perfect fights", st.perfects],
    ["Catches", st.catches],
    ["Plays / matched", `${st.plays} / ${st.matches}`],
    ["Biggest hit", st.maxHit ? `${st.maxHit} (floor ${st.maxHitFloor})` : "0"],
    ["HP lost", st.hpLost],
    ["Guides", run.guides.map((g) => GUIDE_BY_ID[g].name).join(", ") || "none"],
  ];
  return (
    <section className="sheet over">
      <h2 className="title">The path ends</h2>
      {run.fight && <p className="soft">{run.fight.log[run.fight.log.length - 1]}</p>}
      <table className="stats-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="soft">{k}</td>
              <td className="num">{v}</td>
            </tr>
          ))}
          <tr>
            <td className="soft">Powers used</td>
            <td className="num">
              {(Object.keys(st.powerUses) as Suit[]).map((s) => (
                <span key={s} className="pw-used">
                  <Icon name={s} /> {st.powerUses[s]}
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <button className="btn big" onClick={onNew}>
        New run
      </button>
    </section>
  );
}
