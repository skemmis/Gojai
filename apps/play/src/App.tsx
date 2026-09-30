import { useCallback, useEffect, useMemo, useState } from "react";
import { MapScreen as WorldMap } from "@gojai/map-app/MapScreen";
import { visit, spotOpened, type Spot, type SpotState, type Visits } from "@gojai/map";
import {
  newRun,
  enterEncounter,
  isBossFloor,
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
  isJunk,
  restHeal,
  score,
  ENEMY_BY_ID,
  EVENT_BY_ID,
  GUIDE_BY_ID,
  CONFIG,
} from "@gojai/core";
import * as core from "@gojai/core";
import type { Card, Run, Suit } from "@gojai/core";
import { FightScreen } from "./fight";
import "./screens.css";
import { sortCards } from "./components";
import {
  Back,
  Choice,
  Emblem,
  GameCard,
  Gold,
  GuideCard,
  InkLink,
  Line,
  Price,
  RunStatus,
  SCENES,
  Screen,
  ScrollButton,
  Sheet,
  Switch,
  Title,
  UI,
  sceneFor,
} from "./kit";
import { BoardsScreen, ClanScreen, JoinScreen, LiveScreen, MapChrome, ProfileScreen, SpotSheet, type View } from "./clan/screens";
import { ME, catchUp, cleared, groundName, holders, join, loadTown, newTown, runOver, saveTown, walked, type Town } from "./clan/town";

type Act = (fn: (r: Run) => void) => boolean;

const UI_CHECK = new URLSearchParams(location.search).has("uicheck");
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
  const [town, setTown] = useState<Town>(() => {
    const t = loadTown() ?? newTown(randomSeed());
    catchUp(t);
    return t;
  });
  const [view, setView] = useState<View>("map");
  const [picked, setPicked] = useState<{ spot: Spot; state: SpotState; now: Date } | null>(null);
  const [now, setNow] = useState(() => new Date());
  // Who you are to the map (finds differ per player), which spots you've opened, and test mode
  const [playerId] = useState(() => {
    const id = stored("player", "") || `p${randomSeed()}`;
    store("player", id);
    return id;
  });
  const [visits, setVisits] = useState<Visits>(() => stored("visits", {}));
  const [anywhere, setAnywhere] = useState<boolean>(() => stored("anywhere", true));

  useEffect(() => saveTown(town), [town]);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setTown((t) => {
        const c = structuredClone(t);
        return catchUp(c) ? c : t;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const changeTown = (fn: (t: Town) => void) =>
    setTown((t) => {
      const c = structuredClone(t);
      fn(c);
      return c;
    });

  /** Apply a rules change to the run, and tell the clan layer what it meant: a floor passed, a catch, a run's end. */
  const act: Act = (fn) => {
    const r = structuredClone(run);
    try {
      fn(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
    setError(null);
    const was = run.phase;
    if (was !== r.phase) {
      changeTown((t) => {
        if (r.phase === "reward" && r.reward?.caught && r.fight && t.me && !t.me.caught.includes(r.fight.enemy.id)) t.me.caught.push(r.fight.enemy.id);
        if (r.phase === "map" && was !== "over") cleared(t);
        if (r.phase === "over") runOver(t, r.stats.catches);
      });
    }
    setRun(r);
    return true;
  };

  // The UI check (tools/ui-check) steers the run straight to screens it can't reach by play
  if (UI_CHECK) Object.assign(window, { __act: act, __core: core });

  const enter = () => {
    if (!picked || picked.state.kind !== "open") return;
    const o = spotOpened(picked.spot, picked.state.find, new Date());
    const boss = isBossFloor(run.floor);
    const ok = act((r) => enterEncounter(r, o.find, { spotId: o.spot.id, name: o.spot.gameName ?? o.spot.name, place: o.place, live: o.liveEvents }));
    if (!ok) return;
    changeTown((t) => void walked(t, o.spot.id, o.find, boss));
    const v = visit(visits, o.spot, o.at);
    setVisits(v);
    store("visits", v);
    setPicked(null);
  };

  const startNew = (seed = randomSeed()) => {
    setRun(newRun(seed));
    setError(null);
    setView("map");
  };

  const heldBy = useMemo(() => holders(town), [town.territory]);
  const hoodBadge = useCallback((id: string) => (heldBy[id] ? UI[heldBy[id] === "order" ? "star" : "acorn"] : undefined), [heldBy]);

  const onMap = run.phase === "map";
  const back = () => setView("map");
  return (
    <div className={`app ${run.phase === "fight" ? "night" : "screens"} ${onMap && view === "map" ? "on-map" : ""}`}>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {/* The map stays mounted under every other screen, so it keeps its place and loads once */}
      <div className="world" hidden={!onMap || view !== "map"}>
        <WorldMap
          bare
          playerId={playerId}
          visits={visits}
          anywhere={anywhere}
          autoLocate={!anywhere}
          hoodBadge={hoodBadge}
          onSelect={(spot, state, at) => setPicked({ spot, state, now: at })}
        />
        {town.me && (
          <MapChrome
            run={run}
            town={town}
            now={now}
            go={setView}
            anywhere={anywhere}
            toggleAnywhere={() => {
              setAnywhere(!anywhere);
              store("anywhere", !anywhere);
            }}
          />
        )}
        {picked && <SpotSheet {...picked} town={town} run={run} onEnter={enter} onClose={() => setPicked(null)} />}
      </div>
      {!town.me && <JoinScreen town={town} seed={Number(playerId.slice(1)) || 1} onJoin={(name, p, dealt) => changeTown((t) => join(t, name, p, dealt))} />}
      {town.me && onMap && view === "deck" && <DeckScreen run={run} back={back} />}
      {town.me && onMap && view === "clan" && <ClanScreen town={town} now={now} back={back} />}
      {town.me && onMap && view === "boards" && <BoardsScreen town={town} back={back} />}
      {town.me && onMap && view === "live" && <LiveScreen town={town} now={now} back={back} />}
      {town.me && onMap && view === "you" && (
        <ProfileScreen town={town} back={back} seed={run.seed} onNewRun={() => startNew()} setPortrait={(s) => changeTown((t) => ((t.portraits[ME] = s), t.me && (t.me.portrait = `gen:${s}`)))} />
      )}
      {run.phase === "fight" && (
        <main>
          <FightScreen run={run} act={act} />
        </main>
      )}
      {run.phase === "reward" && <RewardScreen run={run} act={act} town={town} />}
      {run.phase === "rest" && <RestScreen run={run} act={act} />}
      {run.phase === "shop" && <ShopScreen run={run} act={act} />}
      {run.phase === "event" && <EventScreen run={run} act={act} />}
      {run.phase === "over" && <OverScreen run={run} town={town} onNew={() => startNew()} />}
    </div>
  );
}

// ─── Shared run pieces ───────────────────────────────────────────────────────

/** Pick a card from a set, laid out in the deck grid, on a sheet over the current screen. */
function CardPicker({ title, cards, onPick, onCancel }: { title: string; cards: Card[]; onPick: (uid: number) => void; onCancel: () => void }) {
  return (
    <div className="picker-layer">
      <div className="k-screen-head">
        <Back onClick={onCancel} />
        <Title>{title}</Title>
      </div>
      <div className="card-grid">
        {sortCards(cards).map((c) => (
          <button key={c.uid} className="card-pick" onClick={() => onPick(c.uid)}>
            <GameCard card={c} />
          </button>
        ))}
      </div>
    </div>
  );
}

function GuideReplace({ run, onPick, onCancel }: { run: Run; onPick: (i: number) => void; onCancel: () => void }) {
  return (
    <div className="picker-layer">
      <div className="k-screen-head">
        <Back onClick={onCancel} />
        <Title>Guides Full</Title>
      </div>
      <p className="k-label">Let one go for the new one</p>
      <div className="guide-row">
        {run.guides.map((g, i) => (
          <GuideCard key={g + i} {...GUIDE_BY_ID[g]} rare={GUIDE_BY_ID[g].rarity === "rare"} onClick={() => onPick(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Deck ────────────────────────────────────────────────────────────────────

const SUIT_TABS: { id: "all" | Suit; label: string }[] = [
  { id: "all", label: "All" },
  { id: "spades", label: "♠ Spades" },
  { id: "hearts", label: "♥ Hearts" },
  { id: "diamonds", label: "♦ Diamonds" },
  { id: "clubs", label: "♣ Clubs" },
];

function DeckScreen({ run, back }: { run: Run; back: () => void }) {
  const [suit, setSuit] = useState<"all" | Suit>("all");
  const cards = allCards(run);
  const shown = sortCards(cards.filter((c) => suit === "all" || c.suit === suit));
  const count = (s: Suit) => cards.filter((c) => c.suit === s).length;
  return (
    <Screen className="deck" title="Your Deck" backdrop={SCENES[sceneFor(run)]} dim={0.6} onBack={back}>
      <p className="k-label">{cards.length} cards</p>
      <Switch options={SUIT_TABS.filter((t) => t.id === "all" || count(t.id) > 0)} value={suit} onChange={setSuit} />
      <div className="card-grid">
        {shown.map((c) => (
          <GameCard key={c.uid} card={c} />
        ))}
      </div>
      {run.guides.length > 0 && (
        <>
          <p className="k-label">Guides</p>
          <div className="guide-row">
            {run.guides.map((g, i) => (
              <GuideCard key={g + i} {...GUIDE_BY_ID[g]} rare={GUIDE_BY_ID[g].rarity === "rare"} />
            ))}
          </div>
        </>
      )}
    </Screen>
  );
}

// ─── Reward ──────────────────────────────────────────────────────────────────

function RewardScreen({ run, act, town }: { run: Run; act: Act; town: Town }) {
  const r = run.reward!;
  const [pending, setPending] = useState<number | null>(null);
  const takeGuide = (i: number) => {
    if (guidesFull(run)) setPending(i);
    else act((x) => takeRewardGuide(x, i));
  };
  const floor = town.floors[town.floors.length - 1];
  return (
    <Screen
      className="reward"
      title={run.fight?.exact ? "Caught" : "Victory"}
      backdrop={SCENES[sceneFor(run)]}
      dim={0.55}
      action={r.cardTaken ? <ScrollButton onClick={() => act(leaveReward)}>Continue</ScrollButton> : <InkLink onClick={() => act(leaveReward)}>Skip the card</InkLink>}
    >
      <RunStatus hp={run.hp} max={run.maxHp} gold={run.gold} />
      <div className="spoils">
        <Gold n={r.gold} big />
        {r.perfect && <span className="k-label gilt">Perfect · no damage taken</span>}
      </div>
      {r.caught && (
        <div className="caught">
          <GameCard card={r.caught} />
          <p>
            <b>{cardName(r.caught)}</b> joins your deck.
          </p>
        </div>
      )}
      <p className="k-label">{r.cardTaken ? "Card taken" : "Pick a card"}</p>
      <div className="card-row">
        {r.cards.map((c, i) => (
          <button key={c.uid} className="card-pick" disabled={r.cardTaken} onClick={() => act((x) => takeRewardCard(x, i))}>
            <GameCard card={c} off={r.cardTaken} />
          </button>
        ))}
      </div>
      {r.guides.length > 0 && !r.guideTaken && (
        <>
          <p className="k-label">Pick a Guide</p>
          <div className="guide-row">
            {r.guides.map((g, i) => (
              <GuideCard key={g} {...GUIDE_BY_ID[g]} rare={GUIDE_BY_ID[g].rarity === "rare"} onClick={() => takeGuide(i)} />
            ))}
          </div>
        </>
      )}
      {town.me && floor && (
        <p className="influence">
          <Emblem faction={town.me.faction} /> Walking here gave {town.me.faction === "order" ? "the Order" : "the Pathless"} ground in {groundName(floor.ground)}
        </p>
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
    </Screen>
  );
}

// ─── Rest ────────────────────────────────────────────────────────────────────

function RestScreen({ run, act }: { run: Run; act: Act }) {
  const [mode, setMode] = useState<null | "upgrade" | "letgo">(null);
  const cards = allCards(run).filter((c) => !isJunk(c) && (mode !== "upgrade" || c.value < 10));
  const heal = Math.min(restHeal(run), run.maxHp - run.hp);
  return (
    <Screen className="rest" title="The Oak Bench" backdrop={SCENES.rest} dim={0.1}>
      <RunStatus hp={run.hp} max={run.maxHp} gold={run.gold} />
      <div className="grow" />
      <div className="choices">
        <Choice title="Heal" detail={`+${heal} HP`} off={heal <= 0} onClick={() => act((r) => rest(r, "heal"))} />
        <Choice title="Upgrade" detail={`A card gains +${CONFIG.restUpgrade}`} onClick={() => setMode("upgrade")} />
        <Choice title="Let go" detail="Remove a card for good" onClick={() => setMode("letgo")} />
      </div>
      {mode && (
        <CardPicker
          title={mode === "upgrade" ? "Upgrade a Card" : "Let a Card Go"}
          cards={cards}
          onCancel={() => setMode(null)}
          onPick={(uid) => act((r) => rest(r, mode, uid))}
        />
      )}
    </Screen>
  );
}

// ─── Shop ────────────────────────────────────────────────────────────────────

function ShopScreen({ run, act }: { run: Run; act: Act }) {
  const s = run.shop!;
  const [removing, setRemoving] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  return (
    <Screen className="shop" title="The Crystal Shop" backdrop={SCENES.shop} dim={0.3} action={<ScrollButton onClick={() => act(leaveShop)}>Leave</ScrollButton>}>
      <RunStatus hp={run.hp} max={run.maxHp} gold={run.gold} />
      <div className="grow" />
      <div className="wares">
        {s.cards.map((it, i) => (
          <div key={it.card.uid} className="ware">
            <button className="card-pick" disabled={it.sold || run.gold < it.price} onClick={() => act((r) => buyCard(r, i))}>
              <GameCard card={it.card} off={it.sold || run.gold < it.price} />
            </button>
            <Price n={it.price} sold={it.sold} short={!it.sold && run.gold < it.price} />
          </div>
        ))}
      </div>
      <div className="wares guides">
        {s.guides.map((g, i) => (
          <div key={g.id} className="ware">
            <GuideCard
              {...GUIDE_BY_ID[g.id]}
              rare={GUIDE_BY_ID[g.id].rarity === "rare"}
              off={g.sold || run.gold < g.price}
              onClick={() => {
                if (g.sold) return;
                if (guidesFull(run)) setPending(i);
                else act((r) => buyGuide(r, i));
              }}
            />
            <Price n={g.price} sold={g.sold} short={!g.sold && run.gold < g.price} />
          </div>
        ))}
      </div>
      <Choice title="Remove a card" detail={s.removed ? "Done for this visit" : `${s.removePrice} gold`} off={s.removed || run.gold < s.removePrice} onClick={() => setRemoving(true)} />
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
      {removing && (
        <CardPicker
          title="Remove a Card"
          cards={allCards(run).filter((c) => !isJunk(c))}
          onCancel={() => setRemoving(false)}
          onPick={(uid) => {
            if (act((r) => buyRemoval(r, uid))) setRemoving(false);
          }}
        />
      )}
    </Screen>
  );
}

// ─── Event ───────────────────────────────────────────────────────────────────

function EventScreen({ run, act }: { run: Run; act: Act }) {
  const ev = EVENT_BY_ID[run.event!];
  const [picking, setPicking] = useState<number | null>(null);
  // Walking on is the quiet way out, not a choice like the others
  const leave = ev.options.findIndex((o) => o.label === "Walk on");
  return (
    <Screen
      className="event"
      title={ev.title}
      backdrop={SCENES[ev.id] ?? SCENES.honor_shelf}
      dim={0.1}
      action={leave >= 0 ? <InkLink onClick={() => act((r) => chooseEvent(r, leave))}>Walk on</InkLink> : undefined}
    >
      <Sheet nail className="story">
        <p>{ev.text}</p>
      </Sheet>
      <RunStatus hp={run.hp} max={run.maxHp} gold={run.gold} />
      <div className="grow" />
      <div className="choices">
        {ev.options.map((o, i) => {
          if (i === leave) return null;
          // The name of the choice in the display face; its cost or effect (numbers) in the sans under it
          const [title, detail] = splitChoice(o.label);
          return <Choice key={i} title={title} detail={detail} onClick={() => (o.needsCard ? setPicking(i) : act((r) => chooseEvent(r, i)))} />;
        })}
      </div>
      {picking !== null && (
        <CardPicker title="Choose a Card" cards={allCards(run).filter((c) => !isJunk(c))} onCancel={() => setPicking(null)} onPick={(uid) => act((r) => chooseEvent(r, picking, uid))} />
      )}
    </Screen>
  );
}

/** "Heckle: +25 gold, lose 5 HP" → ["Heckle", "+25 gold, lose 5 HP"]; "Take a rare card, pay 30 gold" → ["Take a rare card", "pay 30 gold"]. */
function splitChoice(label: string): [string, string | undefined] {
  const colon = label.indexOf(": ");
  if (colon > 0) return [label.slice(0, colon), label.slice(colon + 2)];
  const comma = label.lastIndexOf(", ");
  if (comma > 0 && /\d/.test(label.slice(comma))) return [label.slice(0, comma), label.slice(comma + 2)];
  return [label, undefined];
}

// ─── Game over ───────────────────────────────────────────────────────────────

function OverScreen({ run, town, onNew }: { run: Run; town: Town; onNew: () => void }) {
  const st = run.stats;
  const killer = st.diedTo ? (ENEMY_BY_ID[st.diedTo]?.name ?? st.diedTo) : "unknown";
  const gift = town.lastOffering ?? [];
  const total = Math.round(gift.reduce((s, g) => s + g.amount, 0) * 10) / 10;
  const me = town.me;
  return (
    <Screen className="over" title="The Path Ends" backdrop={SCENES[sceneFor(run)]} dim={0.65} action={<ScrollButton onClick={onNew}>Walk again</ScrollButton>}>
      <p className="fell">Fell to {killer}</p>
      <Sheet nail>
        <Line k="Floors cleared" v={score(run)} />
        <Line k="Perfect fights" v={st.perfects} />
        <Line k="Caught" v={st.catches} />
        <Line k="Biggest hit" v={st.maxHit} />
        <Line k="Guides" v={run.guides.map((g) => GUIDE_BY_ID[g].name).join(", ") || "none"} />
      </Sheet>
      {me && gift.length > 0 && (
        <>
          <p className="k-label">Your offering</p>
          <Sheet>
            {gift.map((g) => (
              <Line key={g.ground} k={<><Emblem faction={me.faction} /> {groundName(g.ground)}</>} v={`+${g.amount}`} />
            ))}
            <Line className="total" k={`To ${me.faction === "order" ? "the Order" : "the Pathless"}`} v={`+${total}`} />
          </Sheet>
        </>
      )}
    </Screen>
  );
}
