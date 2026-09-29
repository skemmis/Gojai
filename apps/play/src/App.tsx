import { useState } from "react";
import {
  newRun,
  visitSpot,
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
import { CardView, CardPicker, GuideChip, Icon, PowerLine, SuitMark, POWER, sortCards, type IconName } from "./components";

type Act = (fn: (r: Run) => void) => boolean;

const randomSeed = () => Math.floor(Math.random() * 1e9);

export function App() {
  const [run, setRun] = useState<Run>(() => newRun(randomSeed()));
  const [error, setError] = useState<string | null>(null);
  const [seedText, setSeedText] = useState("");

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

  // Fights happen on the night table; everything else is ink on paper.
  const night = run.phase === "fight";
  return (
    <div className={`app ${night ? "night" : "paper"}`}>
      <StatusBar run={run} />
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <main>
        {run.phase === "map" && <MapScreen run={run} act={act} />}
        {run.phase === "fight" && <FightScreen run={run} act={act} />}
        {run.phase === "reward" && <RewardScreen run={run} act={act} />}
        {run.phase === "rest" && <RestScreen run={run} act={act} />}
        {run.phase === "shop" && <ShopScreen run={run} act={act} />}
        {run.phase === "event" && <EventScreen run={run} act={act} />}
        {run.phase === "over" && <OverScreen run={run} onNew={() => startNew(randomSeed())} />}
      </main>
      <footer className="row wrap">
        <span className="soft">Seed {run.seed}</span>
        <input className="seed" inputMode="numeric" placeholder="random" value={seedText} onChange={(e) => setSeedText(e.target.value)} />
        <button className="btn ghost" onClick={() => startNew()}>
          New run
        </button>
      </footer>
    </div>
  );
}

// ─── Status bar and Guides ───────────────────────────────────────────────────

function StatusBar({ run }: { run: Run }) {
  return (
    <header className="status">
      <div className="row between">
        <span className="label">Floor {run.floor}</span>
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
      {run.guides.length > 0 && (
        <div className="guides">
          {run.guides.map((g, i) => (
            <GuideChip key={g + i} id={g} />
          ))}
        </div>
      )}
    </header>
  );
}

// ─── Map ─────────────────────────────────────────────────────────────────────

function MapScreen({ run, act }: { run: Run; act: Act }) {
  const boss = isBossFloor(run.floor);
  return (
    <section className="sheet">
      <h2>{boss ? "An event spot" : "The next spot"}</h2>
      <p className="soft">
        {boss
          ? "Something big is waiting here. Beat it and you heal."
          : "Walk on and see what's there: usually a fight, sometimes an elite, somewhere to heal, a shop or an event."}
      </p>
      <p className="soft small">
        Deck {allCards(run).length} cards · cleared {score(run)} floors
      </p>
      <button className="btn big" onClick={() => act(visitSpot)}>
        {boss ? "Face it" : "Walk to the spot"}
      </button>
    </section>
  );
}

// ─── Fight ───────────────────────────────────────────────────────────────────

function FightScreen({ run, act }: { run: Run; act: Act }) {
  const f = run.fight!;
  const [sel, setSel] = useState<number | null>(null);
  const e = f.enemy;
  const def = ENEMY_BY_ID[e.id];
  const valid = sel !== null && run.hand.some((c) => c.uid === sel) ? sel : null;

  const doPlay = (uid: number) => {
    if (act((r) => play(r, uid))) setSel(null);
  };
  // Tap a card to see what it does; tap it again (or Play) to play it
  const tap = (uid: number) => (uid === valid ? doPlay(uid) : setSel(uid));
  const doEnd = () => {
    if (act(endTurn)) setSel(null);
  };

  const hpPct = Math.max(0, (e.hp / e.maxHp) * 100);
  const youPct = Math.max(0, (run.hp / run.maxHp) * 100);
  const max = Math.max(CONFIG.actionsPerTurn, f.actions);
  const pv = valid !== null ? previewPlay(run, valid) : null;

  return (
    <section className="fight">
      <Intent run={run} />

      <div className="foe">
        <h2 className="name">{e.name}</h2>
        <div className="meter">
          <i style={{ width: `${hpPct}%` }} />
          {pv && pv.damage > e.block && <u style={{ left: `${Math.max(0, ((e.hp - (pv.damage - e.block)) / e.maxHp) * 100)}%`, width: `${Math.min(hpPct, ((pv.damage - e.block) / e.maxHp) * 100)}%` }} />}
        </div>
        <div className="row between small">
          <span>
            <b className="num">{Math.max(0, e.hp)}</b> / {e.maxHp}
            {e.block > 0 && (
              <span className="blk">
                <Icon name="shield" /> <b className="num">{e.block}</b>
              </span>
            )}
          </span>
          <span className="row gap-s">
            <span className="soft">Immune</span>
            {e.suits.map((s) => (
              <SuitMark key={s} suit={s} />
            ))}
          </span>
        </div>
        <p className="trick">
          <span className="badge">{e.tier}</span> {def?.text}
        </p>
      </div>

      <div className="you row between">
        <span className="me">
          <b className="num">{run.hp}</b>
          <span className="soft">/ {run.maxHp} HP</span>
          <span className="blk" title="Your block">
            <Icon name="shield" /> <b className="num">{f.block}</b>
          </span>
        </span>
        <span className="actions" title={`${f.actions} actions left`}>
          <small>Actions</small>
          {Array.from({ length: max }, (_, i) => (
            <i key={i} className={i < f.actions ? "on" : ""} />
          ))}
        </span>
      </div>
      <div className="thin">
        <i style={{ width: `${youPct}%` }} />
      </div>

      <div className="hand">
        {sortCards(run.hand).map((c) => {
          const junk = isJunk(c);
          const m = !junk ? multiplier(run, c) : 1;
          return (
            <CardView
              key={c.uid}
              card={c}
              selected={valid === c.uid}
              onClick={() => tap(c.uid)}
              disabled={junk}
              off={!!playError(run, c.uid)}
              badge={m > 1 ? `×${m}` : undefined}
              power={c.value * m}
            />
          );
        })}
        {run.hand.length === 0 && <p className="soft">Your hand is empty.</p>}
      </div>

      <PlayBar run={run} sel={valid} onPlay={() => valid !== null && doPlay(valid)} onEnd={doEnd} />

      <div className="log">
        {f.log.slice(-4).map((l, i, a) => (
          <div key={f.log.length - a.length + i} className={i === a.length - 1 ? "" : "soft"}>
            {l}
          </div>
        ))}
      </div>
    </section>
  );
}

function describe(run: Run, a: EnemyAction): { icon: IconName; text: string; attack: boolean } {
  if (a.k === "attack") {
    const n = hitSize(run, a.n);
    return { icon: "blade", text: a.times && a.times > 1 ? `${n}×${a.times}` : `${n}`, attack: true };
  }
  if (a.k === "block") return { icon: "shield", text: `Block ${a.n}`, attack: false };
  if (a.k === "buff") return { icon: "up", text: `Attacks +${a.n}`, attack: false };
  if (a.k === "heal") return { icon: "cross", text: `Heal ${a.n}`, attack: false };
  return { icon: "letter", text: `${a.count > 1 ? `${a.count} × ` : ""}${cardDef(a.card).name}`, attack: false };
}

/** What the enemy will do when you end your turn: block if it's attacking, go all in if not. */
function Intent({ run }: { run: Run }) {
  const f = run.fight!;
  const hit = incoming(run);
  const through = Math.max(0, hit - f.block);
  return (
    <div className="intent-wrap">
      <div className="row gap-s center">
        {intent(run).map((a, i) => {
          const d = describe(run, a);
          return (
            <span key={i} className={`intent ${d.attack ? "atk" : ""}`}>
              <Icon name={d.icon} /> {d.text}
            </span>
          );
        })}
      </div>
      <div className="intent-note">
        {hit > 0 ? (through ? <span className="blood-text">You'd take {through}</span> : "Fully guarded") : "Not attacking: go all in"}
      </div>
    </div>
  );
}

function PlayBar({ run, sel, onPlay, onEnd }: { run: Run; sel: number | null; onPlay: () => void; onEnd: () => void }) {
  const f = run.fight!;
  const err = sel !== null ? playError(run, sel) : null;
  const pv = sel !== null ? previewPlay(run, sel) : null;
  return (
    <div className="playbar">
      <div className="preview">
        {sel === null && (
          <span className="soft">
            {f.turnPlays.length ? `Played ${f.turnPlays.map(cardName).join(", ")}. ` : ""}
            Tap a card to see it, tap again to play. Same value, new suit: ×2.
          </span>
        )}
        {err && <span className="blood-text">{err}</span>}
        {pv &&
          pv.powers.map((p) => (
            <span key={p.suit} className={`power ${p.immune ? "immune" : ""}`}>
              <Icon name={p.suit} /> {p.immune ? `${POWER[p.suit]}: immune` : <PowerLine suit={p.suit} n={p.amount} />}
            </span>
          ))}
        {pv && pv.mult > 1 && <span className="tag ink inline">{pv.mult === 2 ? "Pair ×2" : `Match ×${pv.mult}`}</span>}
        {pv && pv.cost === 0 && <span className="soft">Free</span>}
        {pv && (pv.exact ? <span className="tag gilt inline">Exact: catch</span> : pv.kills ? <b>Kills</b> : null)}
      </div>
      <div className="row gap">
        <button className="btn" disabled={!pv} onClick={onPlay}>
          Play
        </button>
        <button className={`btn ${f.actions === 0 ? "" : "ghost"}`} onClick={onEnd}>
          End turn
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
