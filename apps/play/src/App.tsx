import { useEffect, useRef, useState } from "react";
import {
  newRun,
  chooseNode,
  play,
  playError,
  previewPlay,
  yieldTurn,
  refresh,
  pay,
  payValue,
  payCapacity,
  incomingAttack,
  takeRewardCard,
  takeRewardGuide,
  leaveReward,
  guidesFull,
  rest,
  buyCard,
  buyGuide,
  buyRemoval,
  buyRefresh,
  leaveShop,
  chooseEvent,
  allCards,
  cardName,
  isJunk,
  handSize,
  score,
  ENEMY_BY_ID,
  EVENT_BY_ID,
  GUIDE_BY_ID,
  CONFIG,
} from "@gojai/core";
import type { Run, NodeKind, Suit } from "@gojai/core";
import { CardView, CardPicker, GuideChip, SuitMark, SUIT_COLOR, POWER, SYM, sortCards } from "./components";

type Act = (fn: (r: Run) => void) => boolean;
interface Flash {
  color: string;
  big: boolean;
  key: number;
}

const randomSeed = () => Math.floor(Math.random() * 1e9);

export function App() {
  const [run, setRun] = useState<Run>(() => newRun(randomSeed()));
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [seedText, setSeedText] = useState("");
  const flashKey = useRef(0);
  const timers = useRef<number[]>([]);
  const errTimer = useRef<number>(0);

  const doFlash = (colors: string[], big = false) => {
    timers.current.forEach(clearTimeout);
    timers.current = colors.map((color, i) =>
      window.setTimeout(() => setFlash({ color, big, key: ++flashKey.current }), i * 220),
    );
  };

  const showError = (msg: string) => {
    setError(msg);
    clearTimeout(errTimer.current);
    errTimer.current = window.setTimeout(() => setError(null), 2600);
  };

  const act: Act = (fn) => {
    const r = structuredClone(run);
    const wasWon = r.fight?.phase === "won";
    try {
      fn(r);
    } catch (e) {
      showError(e instanceof Error ? e.message : String(e));
      return false;
    }
    setError(null);
    const f = r.fight;
    if (f && !wasWon && f.phase === "won" && f.exact) doFlash(["#fff", ...(f.lastPlay?.powers ?? []).map((s) => SUIT_COLOR[s])], true);
    setRun(r);
    return true;
  };

  const startNew = (seed?: number) => {
    const s = seed ?? (seedText.trim() ? Number(seedText.trim()) : randomSeed());
    if (!Number.isFinite(s)) return showError("Seed must be a number.");
    setRun(newRun(Math.floor(s)));
    setError(null);
    setFlash(null);
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return (
    <div className="app">
      {flash && <div key={flash.key} className={`flash ${flash.big ? "big" : ""}`} style={{ ["--flash" as string]: flash.color }} />}
      <Header run={run} />
      {error && <div className="error">! {error}</div>}
      <main>
        {run.phase === "map" && <MapScreen run={run} act={act} />}
        {run.phase === "fight" && <FightScreen run={run} act={act} onPowers={(s) => doFlash(s.map((x) => SUIT_COLOR[x]))} />}
        {run.phase === "reward" && <RewardScreen run={run} act={act} />}
        {run.phase === "rest" && <RestScreen run={run} act={act} />}
        {run.phase === "shop" && <ShopScreen run={run} act={act} />}
        {run.phase === "event" && <EventScreen run={run} act={act} />}
        {run.phase === "over" && <OverScreen run={run} onNew={() => startNew(randomSeed())} />}
      </main>
      <footer className="panel row wrap">
        <span className="dim">SEED {run.seed}</span>
        <input className="seed" inputMode="numeric" placeholder="random" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
        <button className="btn" onClick={() => startNew()}>
          New run
        </button>
      </footer>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header({ run }: { run: Run }) {
  const life = run.draw.length + run.hand.length + run.discard.length;
  return (
    <header className="panel">
      <div className="row between wrap">
        <h1>GOJAI</h1>
        <div className="stats">
          <span>FL {run.floor}</span>
          <span>SC {score(run)}</span>
          <span className="s-diamonds">$ {run.gold}</span>
          <span>RF {run.refreshes}</span>
        </div>
      </div>
      <div className="life">
        <div className="life-total">
          <span className="dim">LIFE</span> <b>{life}</b>
        </div>
        <div className="piles">
          <div>
            <b>{run.draw.length}</b>
            <span>draw</span>
          </div>
          <div>
            <b>
              {run.hand.length}/{handSize(run)}
            </b>
            <span>hand</span>
          </div>
          <div>
            <b>{run.discard.length}</b>
            <span>discard</span>
          </div>
        </div>
      </div>
      <div className="guides">
        {run.guides.length === 0 ? (
          <span className="dim">No Guides ({run.guides.length}/{CONFIG.maxGuides})</span>
        ) : (
          run.guides.map((g, i) => <GuideChip key={g + i} id={g} />)
        )}
      </div>
    </header>
  );
}

// ─── Map ─────────────────────────────────────────────────────────────────────

const NODE_INFO: Record<NodeKind, { label: string; icon: string; sub: string }> = {
  fight: { label: "Fight", icon: "⚔", sub: "A local nuisance" },
  elite: { label: "Elite", icon: "☠", sub: "Tougher. Offers a Guide" },
  boss: { label: "Boss", icon: "♛", sub: "Big fight. Recover after" },
  rest: { label: "Rest", icon: "☾", sub: "Recover or improve" },
  shop: { label: "Shop", icon: "$", sub: "Spend gold" },
  event: { label: "Event", icon: "?", sub: "Something happens" },
};

function MapScreen({ run, act }: { run: Run; act: Act }) {
  return (
    <section className="panel">
      <h2>Floor {run.floor}: choose a path</h2>
      <div className="nodes">
        {run.nodes.map((n, i) => (
          <button key={i} className={`node node-${n}`} onClick={() => act((r) => chooseNode(r, i))}>
            <span className="node-icon">{NODE_INFO[n].icon}</span>
            <span className="node-label">{NODE_INFO[n].label}</span>
            <span className="node-sub">{NODE_INFO[n].sub}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Fight ───────────────────────────────────────────────────────────────────

function FightScreen({ run, act, onPowers }: { run: Run; act: Act; onPowers: (s: Suit[]) => void }) {
  const f = run.fight!;
  const [sel, setSel] = useState<number[]>([]);
  const e = f.enemy;
  const def = ENEMY_BY_ID[e.id];
  const toggle = (uid: number) => setSel((s) => (s.includes(uid) ? s.filter((u) => u !== uid) : [...s, uid]));
  const valid = sel.filter((u) => run.hand.some((c) => c.uid === u));

  const doPlay = () => {
    let powers: Suit[] = [];
    const ok = act((r) => {
      play(r, valid);
      powers = r.fight?.lastPlay?.powers ?? [];
      if (r.fight?.phase === "won" && r.fight.exact) powers = [];
    });
    if (ok) {
      setSel([]);
      if (powers.length) onPowers(powers);
    }
  };
  const doAct = (fn: (r: Run) => void) => {
    if (act(fn)) setSel([]);
  };

  const attack = incomingAttack(run);
  const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);

  return (
    <section>
      <div className={`panel enemy tier-${e.tier}`}>
        <div className="row between">
          <h2>{e.name}</h2>
          <span className="badge">{e.tier}</span>
        </div>
        <div className="hpbar">
          <div className="hpfill" style={{ width: `${hpPct}%` }} />
          <span className="hptext">
            HP {e.hp}/{e.maxHp}
          </span>
        </div>
        <div className="row wrap gap">
          <span>
            ATK <b>{attack}</b>
            {attack !== e.attack && <span className="dim"> ({e.attack})</span>}
          </span>
          <span>
            SHIELD <b className="s-spades">{f.shield}</b>
          </span>
          <span>
            IMMUNE{" "}
            {e.suits.map((s) => (
              <span key={s} className="immune">
                <SuitMark suit={s} />
              </span>
            ))}
          </span>
          <span className="dim">TURN {f.turn}</span>
        </div>
        <p className="trick">{def?.text}</p>
      </div>

      {f.phase === "play" && <PlayBar run={run} sel={valid} onPlay={doPlay} onYield={() => doAct(yieldTurn)} onRefresh={() => doAct(refresh)} />}
      {f.phase === "pay" && <PayBar run={run} sel={valid} onPay={() => doAct((r) => pay(r, valid))} onRefresh={() => doAct(refresh)} />}

      <div className="hand">
        {sortCards(run.hand).map((c) => (
          <CardView
            key={c.uid}
            card={c}
            selected={valid.includes(c.uid)}
            onClick={() => toggle(c.uid)}
            disabled={f.phase === "play" && isJunk(c)}
          />
        ))}
        {run.hand.length === 0 && <p className="dim">Your hand is empty.</p>}
      </div>

      <div className="panel log">
        {f.log.slice(-6).map((l, i, a) => (
          <div key={f.log.length - a.length + i} className={i === a.length - 1 ? "" : "dim"}>
            &gt; {l}
          </div>
        ))}
      </div>
    </section>
  );
}

function PlayBar({ run, sel, onPlay, onYield, onRefresh }: { run: Run; sel: number[]; onPlay: () => void; onYield: () => void; onRefresh: () => void }) {
  const err = sel.length ? playError(run, sel) : null;
  const pv = sel.length ? previewPlay(run, sel) : null;
  return (
    <div className="panel bar">
      <div className="preview">
        {!sel.length && <span className="dim">Select a card or combo to play. Same value ≤{CONFIG.comboCap}, or Ace + any.</span>}
        {err && <span className="warn">{err}</span>}
        {pv && (
          <>
            <span>
              DMG <b className="big">{pv.damage}</b>
            </span>
            {pv.powers.map((p) => (
              <span key={p.suit} className={`power ${p.immune ? "blocked" : ""}`}>
                <SuitMark suit={p.suit} /> {POWER[p.suit]} {p.suit === "clubs" ? "×2" : p.n}
                {p.immune && " BLOCKED"}
              </span>
            ))}
            {pv.exact ? <span className="exact">EXACT — catch!</span> : pv.kills ? <span className="kill">KILL</span> : null}
          </>
        )}
      </div>
      <div className="row gap wrap">
        <button className="btn primary" disabled={!pv} onClick={onPlay}>
          Play
        </button>
        <button className="btn" onClick={onYield}>
          Yield
        </button>
        <button className="btn" disabled={run.refreshes <= 0} onClick={onRefresh}>
          Refresh ({run.refreshes})
        </button>
      </div>
    </div>
  );
}

function PayBar({ run, sel, onPay, onRefresh }: { run: Run; sel: number[]; onPay: () => void; onRefresh: () => void }) {
  const f = run.fight!;
  const worth = sel.reduce((s, u) => s + payValue(run.hand.find((c) => c.uid === u)!), 0);
  const enough = worth >= f.owed;
  const cap = payCapacity(run);
  return (
    <div className="panel bar pay">
      <div className="preview">
        <span className="owe">
          OWE <b className="big">{f.owed}</b>
        </span>
        <span className={enough ? "ok" : "warn"}>
          SELECTED <b className="big">{worth}</b>
        </span>
        <span className="dim">hand worth {cap}</span>
        {cap < f.owed && <span className="warn">Can't cover it: Refresh!</span>}
      </div>
      <div className="row gap wrap">
        <button className="btn primary" disabled={!enough} onClick={onPay}>
          Pay
        </button>
        <button className="btn" disabled={run.refreshes <= 0} onClick={onRefresh}>
          Refresh ({run.refreshes})
        </button>
      </div>
    </div>
  );
}

// ─── Reward ──────────────────────────────────────────────────────────────────

function GuideReplace({ run, onPick, onCancel }: { run: Run; onPick: (i: number) => void; onCancel: () => void }) {
  return (
    <div className="panel picker">
      <div className="row between">
        <h3>Guides full: replace which?</h3>
        <button className="btn" onClick={onCancel}>
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
    <section className="panel">
      <h2>{run.fight?.exact ? "Caught!" : "Victory"}</h2>
      <p>
        +<span className="s-diamonds">{r.gold}</span> gold
      </p>
      {r.caught && (
        <div className="caught">
          <CardView card={r.caught} />
          <p>
            <b>{cardName(r.caught)}</b> joins your deck on top.
          </p>
        </div>
      )}
      <h3>Pick a card {r.cardTaken && <span className="dim">(taken)</span>}</h3>
      <div className="hand">
        {r.cards.map((c, i) => (
          <CardView key={c.uid} card={c} disabled={r.cardTaken} onClick={() => act((x) => takeRewardCard(x, i))} />
        ))}
      </div>
      {r.guides.length > 0 && (
        <>
          <h3>Pick a Guide {r.guideTaken && <span className="dim">(taken)</span>}</h3>
          {!r.guideTaken && (
            <div className="guides">
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
      <div className="row gap">
        <button className="btn primary" onClick={() => act(leaveReward)}>
          {r.cardTaken ? "Continue" : "Skip & continue"}
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
    <section className="panel">
      <h2>Rest</h2>
      <p className="dim">A quiet bench under the oaks. Choose one.</p>
      <div className="nodes">
        <button className="node" onClick={() => act((r) => rest(r, "recover"))}>
          <span className="node-icon s-hearts">♥</span>
          <span className="node-label">Recover</span>
          <span className="node-sub">
            {CONFIG.restRecover} discards back to deck, refill hand
          </span>
        </button>
        <button className="node" onClick={() => setMode("upgrade")}>
          <span className="node-icon">+{CONFIG.restUpgrade}</span>
          <span className="node-label">Upgrade</span>
          <span className="node-sub">A card gains +{CONFIG.restUpgrade} value</span>
        </button>
        <button className="node" onClick={() => setMode("letgo")}>
          <span className="node-icon">✂</span>
          <span className="node-label">Let Go</span>
          <span className="node-sub">Remove a card for good</span>
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
    <section className="panel">
      <div className="row between">
        <h2>Shop</h2>
        <span className="s-diamonds">$ {run.gold}</span>
      </div>
      <h3>Cards</h3>
      <div className="hand">
        {s.cards.map((it, i) => (
          <div key={it.card.uid} className={`ware ${it.sold ? "sold" : ""}`}>
            <CardView card={it.card} disabled={it.sold} onClick={() => act((r) => buyCard(r, i))} />
            <span className={run.gold >= it.price ? "" : "dim"}>{it.sold ? "SOLD" : `$${it.price}`}</span>
          </div>
        ))}
      </div>
      <h3>Guides</h3>
      <div className="guides">
        {s.guides.map((g, i) => (
          <div key={g.id} className={`ware ${g.sold ? "sold" : ""}`}>
            <GuideChip
              id={g.id}
              onClick={() => {
                if (g.sold) return;
                if (guidesFull(run)) setPending(i);
                else act((r) => buyGuide(r, i));
              }}
            />
            <span>{g.sold ? "SOLD" : `$${g.price}`}</span>
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
      <h3>Services</h3>
      <div className="row gap wrap">
        <button className="btn" disabled={s.removed} onClick={() => setRemoving(true)}>
          {s.removed ? "Removed" : `Remove a card $${s.removePrice}`}
        </button>
        <button className="btn" disabled={s.refreshBought} onClick={() => act(buyRefresh)}>
          {s.refreshBought ? "Refresh bought" : `+1 Refresh $${s.refreshPrice}`}
        </button>
        <button className="btn primary" onClick={() => act(leaveShop)}>
          Leave
        </button>
      </div>
      {removing && (
        <CardPicker
          title={`Remove which card? ($${s.removePrice})`}
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

// ─── Event ───────────────────────────────────────────────────────────────────

function EventScreen({ run, act }: { run: Run; act: Act }) {
  const ev = EVENT_BY_ID[run.event!];
  const [picking, setPicking] = useState<number | null>(null);
  return (
    <section className="panel">
      <h2>{ev.title}</h2>
      <p>{ev.text}</p>
      <div className="options">
        {ev.options.map((o, i) => (
          <button key={i} className="btn option" onClick={() => (o.needsCard ? setPicking(i) : act((r) => chooseEvent(r, i)))}>
            {o.label}
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
  const killer = st.diedTo ? ENEMY_BY_ID[st.diedTo]?.name ?? st.diedTo : "unknown";
  const rows: [string, string | number][] = [
    ["Floors cleared", score(run)],
    ["Died to", killer],
    ["Fights", st.fights],
    ["Turns", st.turns],
    ["Plays / combos", `${st.plays} / ${st.combos}`],
    ["Catches", st.catches],
    ["Biggest hit", st.maxHit ? `${st.maxHit} (floor ${st.maxHitFloor})` : "0"],
    ["Blocked powers", st.immuneHits],
    ["Refreshes used", st.refreshes],
    ["Guides", run.guides.map((g) => GUIDE_BY_ID[g].name).join(", ") || "none"],
  ];
  return (
    <section className="panel over">
      <h2 className="gameover">GAME OVER</h2>
      {run.fight && (
        <div className="log">
          {run.fight.log.slice(-3).map((l, i) => (
            <div key={i} className="dim">
              &gt; {l}
            </div>
          ))}
        </div>
      )}
      <table className="stats-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="dim">{k}</td>
              <td>{v}</td>
            </tr>
          ))}
          <tr>
            <td className="dim">Powers used</td>
            <td>
              {(Object.keys(st.powerUses) as Suit[]).map((s) => (
                <span key={s} className={`s-${s}`} style={{ marginRight: 8 }}>
                  {SYM[s]}
                  {st.powerUses[s]}
                </span>
              ))}
            </td>
          </tr>
        </tbody>
      </table>
      <button className="btn primary" onClick={onNew}>
        New run
      </button>
    </section>
  );
}
