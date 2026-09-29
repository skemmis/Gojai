/**
 * The fight screen, laid out like a card-battler table (Slay the Spire,
 * Balatro): the enemy and its intent up top, your hand fanned along the
 * bottom. Drag a card up onto the table to play it; each card spends one
 * action from the orb. Almost no words: numbers and icons carry the state.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardDef, CONFIG, endTurn, hitSize, incoming, intent, isJunk, multiplier, play, playError, previewPlay } from "@gojai/core";
import type { Card, EnemyAction, Run, Suit } from "@gojai/core";
import { Icon, rankLabel, powerAmount, sortCards, type IconName } from "./components";
import cardBack from "./assets/card-back.webp";
import vignette from "./assets/scene-vignette.webp";

type Act = (fn: (r: Run) => void) => boolean;

/** Enemy sprites from the art thread, keyed by enemy id (assets/enemy-<id>.webp). Missing ones stand in as a silhouette. */
const SPRITES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("./assets/enemy-*.webp", { eager: true, import: "default" })).map(([path, url]) => [
    path.replace(/^.*enemy-(.*)\.webp$/, "$1"),
    url,
  ]),
);
/** Drawn intent glyphs, used as masks so they take the ink colour (red for attacks). */
const GLYPHS: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("./assets/intent-*.webp", { eager: true, import: "default" })).map(([path, url]) => [
    path.replace(/^.*intent-(.*)\.webp$/, "$1"),
    url,
  ]),
);

function Glyph({ name, fallback }: { name: string; fallback: IconName }) {
  const url = GLYPHS[name];
  if (!url) return <Icon name={fallback} />;
  return <span className="glyph" style={{ maskImage: `url(${url})`, WebkitMaskImage: `url(${url})` }} aria-hidden="true" />;
}
/** Fight backgrounds from the art thread: portrait night plates of real places (assets/scene-<id>.webp), each with a front layer at the edges (assets/front-<id>.webp). */
const globById = (files: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(new RegExp(`^.*${prefix}-(.*)\\.webp$`), "$1"), url]));
const SCENES: Record<string, string> = globById(import.meta.glob<string>("./assets/scene-*.webp", { eager: true, import: "default" }), "scene");
const FRONTS: Record<string, string> = globById(import.meta.glob<string>("./assets/front-*.webp", { eager: true, import: "default" }), "front");
/** Plate geometry at the size we ship (the manifest's 1080×1440 scaled by 0.75): ground line at 78%, quiet column centred. */
const PLATE = { w: 810, h: 1080, floor: 842, foeX: 0.5 };
/** Plates a fight can land on when the spot's place has no plate of its own: the run seed and floor pick one. */
const PLATES = ["arcade", "libbey-park", "ojai-valley-trail", "shelf-road"];

function sceneFor(run: Run): string {
  const place = run.spot?.place?.replace(/_/g, "-");
  if (place && SCENES[place]) return place;
  return PLATES[Math.abs((run.seed ?? 0) * 31 + run.floor) % PLATES.length];
}

/** Pink Moment is a live event: the map says when it's on at a spot. `?pink` previews it anywhere. */
function pinkMoment(run: Run): boolean {
  if (run.spot?.live?.includes("pink-moment")) return true;
  return typeof location !== "undefined" && new URLSearchParams(location.search).has("pink");
}

/** Time of day is a value shift only, never a hue: the plates are night, so day lifts them a little. */
function daylight(): number {
  const h = new Date().getHours();
  if (h >= 8 && h < 17) return 1.25;
  if ((h >= 6 && h < 8) || (h >= 17 && h < 19)) return 1.12;
  return 1;
}

/**
 * The place behind the enemy. Scaled so the plate's ground line meets the
 * sprite's feet and its quiet column sits under the sprite, while still
 * covering the whole zone. The front layer is drawn separately, over the sprite.
 */
function plateBox(zone: { w: number; h: number }, feet: number) {
  const s = Math.max(zone.w / PLATE.w, feet / PLATE.floor, (zone.h - feet) / (PLATE.h - PLATE.floor));
  const w = PLATE.w * s;
  const h = PLATE.h * s;
  const left = Math.min(0, Math.max(zone.w - w, zone.w / 2 - PLATE.foeX * w));
  return { s, box: { left, top: feet - PLATE.floor * s, width: w, height: h } };
}

function Scene({ id, zone, feet, pink }: { id: string; zone: { w: number; h: number }; feet: number; pink: boolean }) {
  const url = SCENES[id];
  if (!url || !zone.w) return null;
  const { s, box } = plateBox(zone, feet);
  return (
    <div className="scene" aria-hidden="true">
      <img className="plate" src={url} style={{ ...box, filter: `brightness(${daylight()})` }} alt="" draggable={false} />
      {pink && <div className="pink-wash" style={{ ...box, height: box.height * 0.38 }} />}
      <div className="fog" style={{ top: feet - 60 * s, height: 140 * s }} />
      <img className="plate" src={vignette} style={box} alt="" draggable={false} />
    </div>
  );
}

function SceneFront({ id, zone, feet }: { id: string; zone: { w: number; h: number }; feet: number }) {
  const url = FRONTS[id];
  if (!url || !zone.w) return null;
  const { box } = plateBox(zone, feet);
  return (
    <div className="scene front" aria-hidden="true">
      <img className="plate" src={url} style={{ ...box, filter: `brightness(${daylight()})` }} alt="" draggable={false} />
    </div>
  );
}

/** The Moon deck: A–10 in every suit, drawn with pips but no numbers. The game overlays the live value. */
const CARD_ART: Record<string, string> = globById(import.meta.glob<string>("./assets/card-*.webp", { eager: true, import: "default" }), "card");

/** Each plain card has its own plate, matched to its current value, so an upgrade redraws the pips too. */
function artFor(card: Card, named: boolean): string | undefined {
  if (!card.suit || named) return undefined;
  return CARD_ART[card.value === 1 ? `ace-${card.suit}` : `${card.value}-${card.suit}`];
}

const SUIT_ICON: Record<Suit, IconName> = { spades: "blade", hearts: "shield", diamonds: "draw", clubs: "recall" };

/** Extra room kept either side of the hand for the action orb and End turn (they sit above the outer cards, which fan lower). */
const FLANK = 0;

interface Floater {
  id: number;
  text: string;
  kind: "dmg" | "block" | "heal";
  where: "foe" | "you";
}

export function FightScreen({ run, act }: { run: Run; act: Act }) {
  const f = run.fight!;
  const e = f.enemy;
  const [sel, setSel] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ uid: number; dx: number; dy: number; armed: boolean } | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [shake, setShake] = useState<"foe" | "you" | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0, feet: 0 });
  const handRef = useRef<HTMLDivElement>(null);
  const prev = useRef({ foe: e.hp, you: run.hp, block: f.block, foeBlock: e.block });
  const nextId = useRef(0);

  // Hit feedback: float the change and shake whoever took it
  useEffect(() => {
    const p = prev.current;
    const add: Floater[] = [];
    const foeLost = p.foe - e.hp;
    const youLost = p.you - run.hp;
    if (foeLost > 0) add.push({ id: nextId.current++, text: `-${foeLost}`, kind: "dmg", where: "foe" });
    if (foeLost < 0) add.push({ id: nextId.current++, text: `+${-foeLost}`, kind: "heal", where: "foe" });
    if (youLost > 0) add.push({ id: nextId.current++, text: `-${youLost}`, kind: "dmg", where: "you" });
    if (f.block > p.block && youLost <= 0) add.push({ id: nextId.current++, text: `+${f.block - p.block}`, kind: "block", where: "you" });
    prev.current = { foe: e.hp, you: run.hp, block: f.block, foeBlock: e.block };
    if (!add.length) return;
    setFloaters((fl) => [...fl, ...add]);
    if (foeLost > 0) setShake("foe");
    else if (youLost > 0) setShake("you");
    const t = window.setTimeout(() => {
      setFloaters((fl) => fl.filter((x) => !add.includes(x)));
      setShake(null);
    }, 900);
    return () => window.clearTimeout(t);
  }, [e.hp, run.hp, f.block, e.block]);

  const cards = sortCards(run.hand);
  const valid = sel !== null && run.hand.some((c) => c.uid === sel) ? sel : null;
  const focus = drag?.uid ?? valid;
  const pv = focus !== null ? previewPlay(run, focus) : null;

  const doPlay = (uid: number) => {
    if (act((r) => play(r, uid))) setSel(null);
  };

  // ─── Drag to play ─────────────────────────────────────────────────────────
  const start = useRef({ x: 0, y: 0, moved: false });
  const playLine = () => {
    const h = handRef.current?.getBoundingClientRect();
    return h ? h.top - 30 : window.innerHeight * 0.6;
  };
  const onDown = (c: Card) => (ev: React.PointerEvent) => {
    if (isJunk(c)) return;
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    start.current = { x: ev.clientX, y: ev.clientY, moved: false };
    setDrag({ uid: c.uid, dx: 0, dy: 0, armed: false });
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!drag) return;
    const dx = ev.clientX - start.current.x;
    const dy = ev.clientY - start.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) start.current.moved = true;
    setDrag({ ...drag, dx, dy, armed: ev.clientY < playLine() });
  };
  const onUp = (ev: React.PointerEvent) => {
    if (!drag) return;
    const uid = drag.uid;
    const armed = ev.clientY < playLine();
    const tapped = !start.current.moved;
    setDrag(null);
    if (armed && !playError(run, uid)) doPlay(uid);
    // A tap lifts the card to show what it would do; tapping it again plays it
    else if (tapped) {
      if (valid === uid && !playError(run, uid)) doPlay(uid);
      else setSel(uid);
    }
  };

  // Fan the hand: overlap more as it grows, tilt from the middle
  const n = cards.length;
  const [width, setWidth] = useState(390);
  useLayoutEffect(() => {
    const onResize = () => setWidth(Math.min(tableRef.current?.clientWidth ?? 390, 560));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Measure where the sprite stands so the scene's floor line meets its feet
  useLayoutEffect(() => {
    const measure = () => {
      const z = zoneRef.current?.getBoundingClientRect();
      const sp = spriteRef.current?.getBoundingClientRect();
      if (!z || !sp) return;
      const next = { w: Math.round(z.width), h: Math.round(z.height), feet: Math.round(sp.bottom - z.top) };
      setStage((o) => (o.w === next.w && o.h === next.h && o.feet === next.feet ? o : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (zoneRef.current) ro.observe(zoneRef.current);
    return () => ro.disconnect();
  }, [e.id]);
  const scene = sceneFor(run);

  const cardW = width < 420 ? 78 : 92;
  const overlap = n > 1 ? Math.max(0, (n * cardW - (width - 24 - 2 * FLANK)) / (n - 1)) : 0;

  const hit = incoming(run);
  const through = Math.max(0, hit - f.block - (pv ? pv.block : 0));
  const youPct = Math.max(0, (run.hp / run.maxHp) * 100);
  const lossPct = Math.min(youPct, (through / run.maxHp) * 100);
  const maxActions = Math.max(CONFIG.actionsPerTurn, f.actions);
  const tier = e.tier;

  return (
    <div className={`table ${shake === "you" ? "shake" : ""}`} ref={tableRef} onPointerMove={onMove} onPointerUp={onUp}>
      {/* ─── Enemy ─── */}
      <div className={`foe-zone ${drag?.armed ? "armed" : ""}`} ref={zoneRef}>
        <Scene id={scene} zone={stage} feet={stage.feet} pink={pinkMoment(run)} />
        <SceneFront id={scene} zone={stage} feet={stage.feet} />
        <div className={`sprite-wrap ${shake === "foe" ? "hit" : ""} tier-${tier}`} ref={spriteRef}>
          {SPRITES[e.id] ? <img className="sprite" src={SPRITES[e.id]} alt={e.name} draggable={false} /> : <Silhouette />}
          {floaters
            .filter((x) => x.where === "foe")
            .map((x) => (
              <span key={x.id} className={`floater ${x.kind}`}>
                {x.text}
              </span>
            ))}
        </div>
        <div className="foe-plate">
          <div className="foe-name">{e.name}</div>
          <Vitals who="foe" hp={e.hp} max={e.maxHp} block={e.block} loss={pv ? Math.max(0, pv.damage - e.block) : 0} />
          {/* What it will do next, under it and facing your own bar */}
          <div className="intents">
            {intent(run).map((a, i) => (
              <IntentBadge key={i} run={run} a={a} />
            ))}
          </div>
          {e.suits.length > 0 && (
            <div className="immune" title="Immune">
              {e.suits.map((s) => (
                <span key={s} className="no">
                  <Icon name={s} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── You ─── */}
      <div className="you-zone">
        <div className="you-bar">
          <Vitals who="you" hp={run.hp} max={run.maxHp} block={f.block} adding={pv?.block ?? 0} loss={through} />
          {floaters
            .filter((x) => x.where === "you")
            .map((x) => (
              <span key={x.id} className={`floater ${x.kind}`}>
                {x.text}
              </span>
            ))}
        </div>
      </div>

      {/* ─── Hand ─── */}
      <div className="hand-zone" ref={handRef}>
        {/* Actions left (bottom-left) and End turn (bottom-right) flank the hand, as in Slay the Spire */}
        <div className="orb" title={`${f.actions} actions left`}>
          <b>{f.actions}</b>
          <small>/{maxActions}</small>
        </div>
        <button className={`end ${f.actions === 0 ? "ready" : ""}`} onClick={() => act(endTurn) && setSel(null)}>
          End
          <br />
          turn
        </button>
        <Pile n={run.draw.length} side="left" />
        <div className="fan" style={{ ["--card-w" as string]: `${cardW}px` }}>
          {cards.map((c, i) => {
            const mid = (n - 1) / 2;
            const off = i - mid;
            const isDrag = drag?.uid === c.uid;
            const lifted = valid === c.uid && !isDrag;
            const m = isJunk(c) ? 1 : multiplier(run, c);
            const style: React.CSSProperties = isDrag
              ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`, zIndex: 50 }
              : { transform: `translateY(${lifted ? -28 : Math.abs(off) * Math.abs(off) * 2.5}px) rotate(${lifted ? 0 : off * 4}deg)`, zIndex: lifted ? 40 : i };
            return (
              <div key={c.uid} className="slot" style={{ marginLeft: i ? -overlap : 0, ...style }} onPointerDown={onDown(c)}>
                <GameCard card={c} mult={m} off={!!playError(run, c.uid)} armed={isDrag && drag.armed} />
              </div>
            );
          })}
        </div>
        <Pile n={run.discard.length} side="right" />
      </div>
      {pv && (
        <div className="play-hint">
          {pv.mult > 1 && <span className="mult">×{pv.mult}</span>}
          {pv.exact && <span className="catch">Exact · catch</span>}
        </div>
      )}
    </div>
  );
}

// ─── Pieces ──────────────────────────────────────────────────────────────────

function IntentBadge({ run, a }: { run: Run; a: EnemyAction }) {
  if (a.k === "attack") {
    const n = hitSize(run, a.n);
    return (
      <span className="intent atk">
        <Glyph name="attack" fallback="blade" />
        <b>{n}</b>
        {a.times && a.times > 1 && <small>×{a.times}</small>}
      </span>
    );
  }
  const map: Record<string, [string, IconName, string]> = {
    block: ["block", "shield", "n" in a ? String(a.n) : ""],
    buff: ["charging", "up", "n" in a ? `+${a.n}` : ""],
    heal: ["heal", "cross", "n" in a ? String(a.n) : ""],
    hex: ["debuff", "letter", a.k === "hex" ? `${a.count}` : ""],
  };
  const [glyph, icon, text] = map[a.k];
  const title = a.k === "hex" ? `Adds ${a.count} × ${cardDef(a.card).name} to your deck` : a.k;
  return (
    <span className="intent" title={title}>
      <Glyph name={glyph} fallback={icon} />
      <b>{text}</b>
    </span>
  );
}

/**
 * HP and block, drawn the same for the enemy and for you so the two read as a
 * pair: a shield (hollow at 0) then the bar, with what's about to be lost hatched.
 * `adding` is block a held card would add, shown hatched on the shield.
 */
function Vitals({ hp, max, block, adding = 0, loss, who }: { hp: number; max: number; block: number; adding?: number; loss: number; who: "foe" | "you" }) {
  const pct = Math.max(0, (hp / max) * 100);
  const cut = Math.min(pct, (loss / max) * 100);
  const shown = block + adding;
  return (
    <div className={`vitals ${who}`}>
      <span className={`shield-mark ${shown > 0 ? "" : "empty"} ${adding > 0 ? "preview" : ""}`} title={who === "you" ? "Your block" : "Its block"}>
        <b>{shown}</b>
      </span>
      <div className="bar">
        <i style={{ width: `${pct}%` }} />
        {cut > 0 && <u style={{ left: `${pct - cut}%`, width: `${cut}%` }} />}
      </div>
      <span className="num">
        <b>{Math.max(0, hp)}</b>/{max}
      </span>
    </div>
  );
}

function Pile({ n, side }: { n: number; side: "left" | "right" }) {
  return (
    <div className={`pile ${side}`} title={side === "left" ? "Draw pile" : "Discard pile"}>
      <span className="back" style={{ backgroundImage: `url(${cardBack})` }} />
      <b>{n}</b>
    </div>
  );
}

export function GameCard({ card, mult = 1, off, armed }: { card: Card; mult?: number; off?: boolean; armed?: boolean }) {
  const d = cardDef(card.def);
  const junk = isJunk(card);
  const art = junk ? undefined : artFor(card, !!d.name);
  const value = card.value * mult;
  const cls = ["gcard", card.suit ? `s-${card.suit}` : "", off || junk ? "off" : "", armed ? "armed" : "", art ? "art" : "", d.face ? "face" : "", d.rarity === "rare" ? "rare" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls} title={d.name ? `${d.name}: ${d.text}` : undefined}>
      {mult > 1 && <span className="mult-tag">×{mult}</span>}
      <span className="rk">
        {rankLabel(card)}
        {card.suit && <Icon name={card.suit} />}
      </span>
      <span className="face">
        {art ? (
          <img src={art} alt="" draggable={false} />
        ) : d.name ? (
          <span className="card-name">{d.name}</span>
        ) : (
          card.suit && <Icon name={card.suit} className="pip" />
        )}
      </span>
      {card.suit && !junk ? (
        <span className={`pw pw-${card.suit}`}>
          <Icon name={SUIT_ICON[card.suit]} />
          <b>{powerAmount(card.suit, value)}</b>
        </span>
      ) : (
        <span className="pw">{d.name}</span>
      )}
    </div>
  );
}

/** Stand-in for enemies without art yet: a shrouded figure in ink. */
function Silhouette() {
  return (
    <svg className="sprite silhouette" viewBox="0 0 120 220" aria-hidden="true">
      <path d="M60 8c-16 0-26 14-26 30 0 10 4 18 9 23-18 8-29 32-31 62-2 34 4 70 10 93h76c6-23 12-59 10-93-2-30-13-54-31-62 5-5 9-13 9-23 0-16-10-30-26-30z" />
    </svg>
  );
}

