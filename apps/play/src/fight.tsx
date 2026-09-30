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
import { GameCard, Drops, Moon, Ribbon, ShieldMark, SCENES, SPRITES, UI, globById, sceneFor } from "./kit/pieces";
export { GameCard, Drops, Moon, Ribbon, ShieldMark, SCENES, SPRITES, UI, sceneFor };

type Act = (fn: (r: Run) => void) => boolean;

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
const FRONTS: Record<string, string> = globById(import.meta.glob<string>("./assets/front-*.webp", { eager: true, import: "default" }), "front");
/** Plate geometry at the size we ship (the tall manifest's 1080×2340 scaled by 2/3): ground line at 55%, quiet column centred. */
const PLATE = { w: 720, h: 1560, floor: 860, foeX: 0.5 };
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
  // The arc stays the same size however many cards you hold: outer cards tilt at most 12° and sink at most 14px
  const mid = (n - 1) / 2;
  const tilt = mid > 0 ? Math.min(4, 12 / mid) : 0;
  const dropAt = (off: number) => (mid > 0 ? (off / mid) ** 2 * Math.min(14, mid * 5) : 0);

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
            const off = i - mid;
            const isDrag = drag?.uid === c.uid;
            const lifted = valid === c.uid && !isDrag;
            const m = isJunk(c) ? 1 : multiplier(run, c);
            const style: React.CSSProperties = isDrag
              ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`, zIndex: 50 }
              : { transform: `translateY(${lifted ? -28 : dropAt(off)}px) rotate(${lifted ? 0 : off * tilt}deg)`, zIndex: lifted ? 40 : i };
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

const BLOTS = ["blot-attack-1", "blot-attack-2", "blot-attack-3"];

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
      <span className="mark">
        <Glyph name={glyph} fallback={icon} />
        <b>{text}</b>
      </span>
    </div>
  );
}

/** Your block: a blue shield laid over the blow it will soak. Dashed while it's only a card you're holding. */
function Guard({ block, adding }: { block: number; adding: number }) {
  if (block + adding <= 0) return null;
  return <ShieldMark n={block + adding} preview={adding > 0} />;
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

/** Stand-in for enemies without art yet: a shrouded figure in ink. */
function Silhouette() {
  return (
    <svg className="sprite silhouette" viewBox="0 0 120 220" aria-hidden="true">
      <path d="M60 8c-16 0-26 14-26 30 0 10 4 18 9 23-18 8-29 32-31 62-2 34 4 70 10 93h76c6-23 12-59 10-93-2-30-13-54-31-62 5-5 9-13 9-23 0-16-10-30-26-30z" />
    </svg>
  );
}

