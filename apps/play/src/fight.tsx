/**
 * The fight screen, laid out like a card-battler table (Slay the Spire,
 * Balatro): the enemy and its intent up top, your hand fanned along the
 * bottom. Drag a card up onto the table to play it; each card spends one
 * moon. The place runs the full height of the screen; everything on it is
 * drawn as things you'd find there (a name ribbon, blood, a shield, moons, a
 * scroll), no boxes.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cardDef, CONFIG, endTurn, hitSize, incoming, intent, isJunk, multiplier, play, playError, previewPlay } from "@gojai/core";
import type { Card, EnemyAction, Run, Suit } from "@gojai/core";
import { Icon, rankLabel, powerAmount, sortCards, type IconName } from "./components";
import vignette from "./assets/scene-vignette.webp";

type Act = (fn: (r: Run) => void) => boolean;

/** Enemy sprites from the art thread, keyed by enemy id (assets/enemy-<id>.webp). Missing ones stand in as a silhouette. */
export const SPRITES: Record<string, string> = Object.fromEntries(
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
/** Fight backgrounds from the art thread: full-height night plates of real places (assets/scene-<id>.webp); a front layer at the edges (assets/front-<id>.webp) where one exists. */
const globById = (files: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(new RegExp(`^.*${prefix}-(.*)\\.webp$`), "$1"), url]));
export const SCENES: Record<string, string> = globById(import.meta.glob<string>("./assets/scene-*.webp", { eager: true, import: "default" }), "scene");
const FRONTS: Record<string, string> = globById(import.meta.glob<string>("./assets/front-*.webp", { eager: true, import: "default" }), "front");
/** Plate geometry at the size we ship (the tall manifest's 1080×2340 scaled by 2/3): ground line at 55%, quiet column centred. */
const PLATE = { w: 720, h: 1560, floor: 860, foeX: 0.5 };
/** Plates a fight can land on when the spot's place has no plate of its own: the run seed and floor pick one. */
const PLATES = ["arcade", "libbey-park", "ojai-valley-trail", "shelf-road"];

export function sceneFor(run: Run): string {
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
 * The place behind the whole table, top to bottom. Scaled so the plate's
 * ground line meets the sprite's feet and its quiet column sits under the
 * sprite, while still covering the screen; the plate's ground runs on under
 * your hand and fades to the night table by itself.
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

/** A wax seal in the card's corner carries its live value: an irregular blob, not a box, so it sits on the art like a mark pressed into it. */
const SEAL =
  "M93.3 45.3Q95.3 50.0 92.0 54.4Q88.6 58.8 90.3 64.5Q92.0 70.2 86.4 72.4Q80.7 74.5 79.7 80.3Q78.8 86.1 73.2 86.3Q67.6 86.5 63.7 89.8Q59.8 93.1 54.9 92.1Q50.0 91.0 45.1 92.0Q40.2 93.0 36.3 89.9Q32.3 86.7 27.4 85.7Q22.4 84.6 20.8 79.6Q19.2 74.5 14.0 72.2Q8.8 69.8 8.8 64.6Q8.8 59.4 7.1 54.7Q5.5 50.0 8.3 45.6Q11.1 41.1 9.6 35.5Q8.1 29.8 12.3 26.6Q16.5 23.3 18.8 18.6Q21.1 13.8 26.8 13.6Q32.4 13.4 35.9 8.4Q39.3 3.3 44.7 7.1Q50.0 10.8 55.3 7.3Q60.6 3.8 64.0 8.8Q67.4 13.8 72.6 14.5Q77.8 15.1 79.3 20.3Q80.9 25.4 85.8 27.9Q90.8 30.4 91.0 35.5Q91.2 40.6 93.3 45.3Z";

const SUIT_ICON: Record<Suit, IconName> = { spades: "blade", hearts: "shield", diamonds: "draw", clubs: "recall" };


interface Floater {
  id: number;
  text: string;
  kind: "dmg" | "block" | "heal" | "immune";
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

  // A play the enemy shrugged off (immune to every suit on the card) says so over it
  const lastPlays = useRef(f.plays);
  useEffect(() => {
    if (f.plays === lastPlays.current) return;
    lastPlays.current = f.plays;
    const lp = f.lastPlay;
    if (!lp || lp.powers.length || !lp.immune.length) return;
    const fl: Floater = { id: nextId.current++, text: "Immune", kind: "immune", where: "foe" };
    setFloaters((x) => [...x, fl]);
    const t = window.setTimeout(() => setFloaters((x) => x.filter((y) => y !== fl)), 1100);
    return () => window.clearTimeout(t);
  }, [f.plays]);

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
    const onResize = () => setWidth(Math.min((tableRef.current?.clientWidth ?? 390) - 32, 560));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // Measure where the sprite stands so the scene's floor line meets its feet
  useLayoutEffect(() => {
    const measure = () => {
      const z = tableRef.current?.getBoundingClientRect();
      const sp = spriteRef.current?.getBoundingClientRect();
      if (!z || !sp) return;
      const next = { w: Math.round(z.width), h: Math.round(z.height), feet: Math.round(sp.bottom - z.top) };
      setStage((o) => (o.w === next.w && o.h === next.h && o.feet === next.feet ? o : next));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (tableRef.current) ro.observe(tableRef.current);
    return () => ro.disconnect();
  }, [e.id]);
  const scene = sceneFor(run);

  const cardW = width < 420 ? 78 : 92;
  const overlap = n > 1 ? Math.max(0, (n * cardW - (width - 24)) / (n - 1)) : 0;

  const hit = incoming(run);
  const through = Math.max(0, hit - f.block - (pv ? pv.block : 0));
  const maxActions = Math.max(CONFIG.actionsPerTurn, f.actions);
  const tier = e.tier;

  return (
    <div className={`table ${shake === "you" ? "shake" : ""}`} ref={tableRef} onPointerMove={onMove} onPointerUp={onUp}>
      <Scene id={scene} zone={stage} feet={stage.feet} pink={pinkMoment(run)} />
      <SceneFront id={scene} zone={stage} feet={stage.feet} />

      {/* ─── Enemy ─── */}
      <div className={`foe-zone ${drag?.armed ? "armed" : ""}`} ref={zoneRef}>
        <Ribbon name={e.name} />
        {/* Its life hangs right under its name, so it can't be mistaken for yours */}
        <div className="foe-life">
          {e.block > 0 && <ShieldMark n={e.block} small />}
          <Drops who="foe" hp={e.hp} max={e.maxHp} loss={pv ? Math.max(0, pv.damage - e.block) : 0} />
          {e.suits.length > 0 && (
            <div className="immune" title={`Immune to ${e.suits.join(" and ")}`}>
              {e.suits.map((s) => (
                <span key={s} className={`no s-${s}`}>
                  <Icon name={s} />
                </span>
              ))}
            </div>
          )}
        </div>
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
        {/* What it will do next, splashed beside it; your block is laid over its attack */}
        <div className="threats">
          {intent(run).map((a, i) => (
            <Threat key={i} run={run} a={a} adding={pv?.block ?? 0} />
          ))}
          {!intent(run).some((a) => a.k === "attack") && <Guard block={f.block} adding={pv?.block ?? 0} />}
        </div>
      </div>

      {/* ─── You: your blood, mirroring its own, and End turn ─── */}
      <div className="you-zone">
        <Drops who="you" hp={run.hp} max={run.maxHp} loss={through} />
        <button className={`end ${f.actions === 0 ? "ready" : ""}`} onClick={() => act(endTurn) && setSel(null)}>
          <Scroll />
          <span>End turn</span>
        </button>
        {floaters
          .filter((x) => x.where === "you")
          .map((x) => (
            <span key={x.id} className={`floater ${x.kind}`}>
              {x.text}
            </span>
          ))}
      </div>

      {/* ─── Hand ─── */}
      <div className="hand-zone" ref={handRef}>
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
                <GameCard card={c} mult={m} off={!!playError(run, c.uid)} dud={isDud(run, c)} armed={isDrag && drag.armed} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── The table's edge: draw pile, moons (actions) in the middle, discard ─── */}
      <div className="rail">
        <Pile n={run.draw.length} side="left" />
        <div className="moons" title={`${f.actions} of ${maxActions} actions left`}>
          {Array.from({ length: maxActions }, (_, i) => (
            <Moon key={i} lit={i < f.actions} />
          ))}
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

/** Inked UI pieces from the art thread (assets/ui-<id>.webp): blots, shield, moons, drops, piles, ribbon, scroll. */
export const UI: Record<string, string> = globById(import.meta.glob<string>("./assets/ui-*.webp", { eager: true, import: "default" }), "ui");
const BLOTS = ["blot-attack-1", "blot-attack-2", "blot-attack-3"];

/** The enemy's name on a paper ribbon across the top of the scene, like a tarot title. */
export function Ribbon({ name }: { name: string }) {
  const size = Math.min(22, 330 / Math.max(10, name.length));
  return (
    <div className="ribbon">
      <img src={UI.ribbon} alt="" draggable={false} />
      <span style={{ fontSize: size }}>{name}</span>
    </div>
  );
}

/**
 * Its next move, splashed beside it. An attack is a blot of blood carrying
 * what will actually get through your block (a flurry shows its blows
 * underneath, "3 × 2"). While you only hold a block card, the new number is
 * outlined and your shield faint; once the block is played and covers the
 * whole blow, the blood dries brown. Anything else it does is an ink mark on a paper blot.
 */
function Threat({ run, a, adding }: { run: Run; a: EnemyAction; adding: number }) {
  const f = run.fight!;
  if (a.k === "attack") {
    const each = hitSize(run, a.n);
    const hit = each * (a.times ?? 1);
    const guard = f.block + adding;
    const left = Math.max(0, hit - guard);
    // Only block you've actually played dries the blood; a card you're holding just previews it
    const stopped = hit - f.block <= 0;
    return (
      <div className={`threat atk ${stopped ? "stopped" : ""} ${adding > 0 ? "previewing" : ""}`} title={`Attack ${hit}`}>
        <img className="blot" src={UI[stopped ? "blot-attack-dry" : BLOTS[run.floor % BLOTS.length]]} alt="" draggable={false} />
        <b>{left}</b>
        {a.times && a.times > 1 && (
          <small className="times">
            {each} × {a.times}
          </small>
        )}
        <Guard block={f.block} adding={adding} />
      </div>
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
    <div className="threat" title={title}>
      <img className="blot" src={UI["blot-paper"]} alt="" draggable={false} />
      <Glyph name={glyph} fallback={icon} />
      <b>{text}</b>
    </div>
  );
}

/** Your block: a blue shield laid over the blow it will soak. Dashed while it's only a card you're holding. */
function Guard({ block, adding }: { block: number; adding: number }) {
  if (block + adding <= 0) return null;
  return <ShieldMark n={block + adding} preview={adding > 0} />;
}

export function ShieldMark({ n, small, preview }: { n: number; small?: boolean; preview?: boolean }) {
  return (
    <div className={`shield-mark ${small ? "small" : ""} ${preview ? "preview" : ""}`} title="Block">
      <img src={UI.shield} alt="" draggable={false} />
      <b>{n}</b>
    </div>
  );
}

/**
 * Life as ten drops of blood, each a tenth of the whole, filled like a vial
 * from the bottom; the exact number sits beside them. Drops that the next
 * blow would drain are hatched. The enemy's and yours are drawn the same.
 */
export function Drops({ hp, max, loss, who }: { hp: number; max: number; loss: number; who: "foe" | "you" }) {
  const per = max / 10;
  const after = Math.max(0, hp - loss);
  return (
    <div className={`drops ${who}`}>
      <div className="row">
        {Array.from({ length: 10 }, (_, i) => {
          const lo = i * per;
          const fill = Math.min(1, Math.max(0, (hp - lo) / per));
          const risk = loss > 0 && hp > lo && after < lo + per;
          return (
            <span key={i} className={`drop ${risk ? "risk" : ""}`} aria-hidden="true">
              <img src={UI["blood-drop-flat-empty"]} alt="" draggable={false} />
              {fill > 0 && <img className="full" src={UI["blood-drop-flat"]} style={{ clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }} alt="" draggable={false} />}
            </span>
          );
        })}
      </div>
      <span className="num">
        <b>{Math.max(0, hp)}</b>/{max}
        {loss > 0 && <em className="loss">−{Math.min(loss, hp)}</em>}
      </span>
    </div>
  );
}

/** One action: a gibbous moon while it's yours to spend, a dark new moon once spent. */
export function Moon({ lit }: { lit: boolean }) {
  return <img className={`moon ${lit ? "lit" : ""}`} src={UI[lit ? "moon-gibbous" : "moon-new"]} alt="" draggable={false} />;
}

/** A paper scroll, for End turn. */
function Scroll() {
  return <img src={UI.scroll} alt="" draggable={false} />;
}

function Pile({ n, side }: { n: number; side: "left" | "right" }) {
  return (
    <div className={`pile ${side} ${n === 0 ? "empty" : ""}`} title={side === "left" ? "Draw pile" : "Discard pile"}>
      <img src={UI[n === 0 ? "pile-empty" : side === "left" ? "pile-draw" : "pile-discard"]} alt="" draggable={false} />
      <b>{n}</b>
      <small>{side === "left" ? "Draw" : "Discard"}</small>
    </div>
  );
}

/** A card that would do nothing right now: every suit on it is one the enemy is immune to (or its first play is silenced). */
function isDud(run: Run, c: Card): boolean {
  if (isJunk(c) || !run.hand.some((x) => x.uid === c.uid)) return false;
  const p = previewPlay(run, c.uid);
  return !!p && p.powers.length > 0 && p.powers.every((x) => x.immune) && !p.damage && !p.block && !p.draw && !p.recall;
}

export function GameCard({ card, mult = 1, off, dud, armed }: { card: Card; mult?: number; off?: boolean; dud?: boolean; armed?: boolean }) {
  const d = cardDef(card.def);
  const junk = isJunk(card);
  const art = junk ? undefined : artFor(card, !!d.name);
  const value = card.value * mult;
  const cls = ["gcard", card.suit ? `s-${card.suit}` : "", off || junk ? "off" : "", dud ? "dud" : "", armed ? "armed" : "", art ? "art" : "", d.face ? "face" : "", d.rarity === "rare" ? "rare" : ""].filter(Boolean).join(" ");
  return (
    <div className={cls} title={d.name ? `${d.name}: ${d.text}` : undefined}>
      {mult > 1 && <span className="mult-tag">×{mult}</span>}
      {!art && (
        <span className="rk">
          {rankLabel(card)}
          {card.suit && <Icon name={card.suit} />}
        </span>
      )}
      <span className="face">
        {art ? (
          <img src={art} alt="" draggable={false} />
        ) : d.name ? (
          <span className="card-name">{d.name}</span>
        ) : (
          card.suit && <Icon name={card.suit} className="pip" />
        )}
      </span>
      {art && card.suit ? (
        <span className={`seal ${powerAmount(card.suit, value) >= 10 ? "wide" : ""}`} aria-label={`${card.suit} ${powerAmount(card.suit, value)}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d={SEAL} />
            <circle cx="50" cy="50" r="33" />
          </svg>
          <b>{powerAmount(card.suit, value)}</b>
        </span>
      ) : card.suit && !junk ? (
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

