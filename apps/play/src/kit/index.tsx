/**
 * The Pathless Land design library. Every screen is built from these parts
 * and nothing else (docs/DESIGN.md); the living style guide (kit.html,
 * apps/play/src/kit/StyleGuide.tsx) shows each one in every state.
 *
 * Every ornament is an inked piece from the art pipeline (assets/ui-*.webp:
 * the fight pieces from gojai-art/ui/, the rest from gojai-ui/pieces/).
 * Code only places, sizes, tints and prints on them.
 *
 * One part per job:
 *   Screen title ............ Title (the paper ribbon)
 *   The one main action ..... ScrollButton
 *   A quieter action ........ InkLink
 *   Going back .............. Back (the pointing hand)
 *   Map navigation .......... Seal
 *   A choice with a detail .. Choice (torn scrap)
 *   A panel of content ...... Sheet
 *   Lists and records ....... Line (ledger with dotted leaders)
 *   Tabs and filters ........ Switch
 *   Gold / price ............ Gold, Price
 *   HP and gold off the table RunStatus
 *   HP / actions / block .... Drops, Moon, ShieldMark (from the fight)
 *   Cards and Guides ........ GameCard, GuideCard
 *   Factions ................ Emblem, Rope
 *   People .................. Medallion (small), ArchCard (large)
 *   Status notes ............ Note (paper), LiveTag (pink: live events only)
 *   Places .................. Backdrop
 */
import type { CSSProperties, ReactNode } from "react";
import type { FactionId } from "@gojai/clans";
import { UI, SCENES, SPRITES, Ribbon, Drops, Moon, ShieldMark, GameCard, sceneFor, globById } from "./pieces";
import "./kit.css";

export { UI, SCENES, SPRITES, Drops, Moon, ShieldMark, GameCard, sceneFor };

/** Generated player portraits (full-body ink figures, gojai-art/portraits/v4), keyed by seed. */
export const PORTRAITS: Record<string, string> = globById(import.meta.glob<string>("../assets/portrait-*.webp", { eager: true, import: "default" }), "portrait");

// ─── Titles and actions ──────────────────────────────────────────────────────

/** A screen's name on the paper ribbon. Every screen has exactly one, at the top. */
export function Title({ children }: { children: string }) {
  return <Ribbon name={children} />;
}

/** The one main action on a screen (Enter, Continue, End turn, Begin): a curled paper scroll. */
export function ScrollButton({ children, onClick, disabled, small, ready }: { children: ReactNode; onClick?: () => void; disabled?: boolean; small?: boolean; ready?: boolean }) {
  return (
    <button className={`k-scroll ${small ? "small" : ""} ${ready ? "ready" : ""}`} onClick={onClick} disabled={disabled}>
      <img src={UI.scroll} alt="" draggable={false} />
      <span>{children}</span>
    </button>
  );
}

/** A quieter action printed straight on the page and underlined in ink (Walk on, Skip, Change portrait). */
export function InkLink({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="k-link" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/** Back: a printer's pointing hand, top left of every screen that has somewhere to go back to. */
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button className="k-back" onClick={onClick} aria-label="Back">
      <img src={UI.manicule} alt="" draggable={false} />
    </button>
  );
}

/** A wax seal with a short word pressed on it: the map's navigation. The word sits on the inner disc (22–78%). */
export function Seal({ children, onClick, label }: { children: ReactNode; onClick?: () => void; label?: string }) {
  return (
    <button className="k-seal" onClick={onClick} aria-label={label}>
      <img src={UI.seal} alt="" draggable={false} />
      <span>{children}</span>
    </button>
  );
}

/**
 * A choice that needs a line of explanation (rest, events, removing a card):
 * a torn paper scrap with the choice in the display face and its cost or
 * effect under it. `off` hatches it when it can't be taken.
 */
export function Choice({ title, detail, onClick, off, selected }: { title: ReactNode; detail?: ReactNode; onClick?: () => void; off?: boolean; selected?: boolean }) {
  return (
    <button className={`k-choice ${off ? "off" : ""} ${selected ? "selected" : ""}`} onClick={onClick} disabled={off}>
      <b>{title}</b>
      {detail && <span>{detail}</span>}
    </button>
  );
}

// ─── Surfaces ────────────────────────────────────────────────────────────────

/**
 * A torn sheet of paper holding content of any height; the art is
 * nine-sliced so its torn edges keep their shape. Tall for panels, wide for
 * a single line or row. `nail` pins it at the top.
 */
export function Sheet({ children, wide, className = "", nail }: { children: ReactNode; wide?: boolean; className?: string; nail?: boolean }) {
  return <div className={`k-sheet ${wide ? "wide" : "tall"} ${nail ? "nailed" : ""} ${className}`}>{children}</div>;
}

/** A place behind the screen: a full-bleed night plate, top-anchored, dimmed so paper and type read. Pink only during a live event. */
export function Backdrop({ src, dim = 0, pink }: { src?: string; dim?: number; pink?: boolean }) {
  return (
    <div className="k-backdrop" aria-hidden="true">
      {src && <img src={src} alt="" draggable={false} style={{ opacity: 1 - dim }} />}
      {pink && <div className="wash" />}
    </div>
  );
}

/**
 * The frame every non-map screen uses: the place behind, Back at top left,
 * the title ribbon, the content, and the main action pinned at the bottom.
 */
export function Screen({
  children,
  title,
  backdrop,
  dim = 0.4,
  pink,
  onBack,
  action,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  backdrop?: string;
  dim?: number;
  pink?: boolean;
  onBack?: () => void;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`k-screen ${className}`}>
      <Backdrop src={backdrop} dim={dim} pink={pink} />
      <div className="k-screen-head">
        {onBack && <Back onClick={onBack} />}
        {title && <Title>{title}</Title>}
      </div>
      <div className="k-screen-body">{children}</div>
      {action && <div className="k-screen-foot">{action}</div>}
    </section>
  );
}

// ─── Records ─────────────────────────────────────────────────────────────────

/** A ledger line with dotted leaders: label ........ value. The only way lists are drawn. */
export function Line({ k, v, className = "" }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={`k-line ${className}`}>
      <span className="k">{k}</span>
      <span className="dots" aria-hidden="true" />
      <span className="v">{v}</span>
    </div>
  );
}

/** Tabs and filters: ink words, the chosen one underlined. One style everywhere. */
export function Switch<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  return (
    <div className="k-switch" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={o.id === value} className={o.id === value ? "on" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A small paper note pinned over the map or a screen (test mode, a hint). */
export function Note({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button className="k-note" onClick={onClick} disabled={!onClick}>
      {children}
    </button>
  );
}

/** A pink tag: the only pink surface in the app, and only while an event is live. */
export function LiveTag({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button className="k-live" onClick={onClick} disabled={!onClick}>
      {children}
    </button>
  );
}

// ─── Values ──────────────────────────────────────────────────────────────────

/** Gold: the inked coin and the number. Gilt is reward, so the number is gilt too. */
export function Gold({ n, big }: { n: number; big?: boolean }) {
  return (
    <span className={`k-gold ${big ? "big" : ""}`}>
      <img src={UI.coin} alt="" draggable={false} />
      <b>{n}</b>
    </span>
  );
}

/** A price on a small gilt tag. `short` (faded) when you can't afford it. */
export function Price({ n, short, sold }: { n: number; short?: boolean; sold?: boolean }) {
  return (
    <span className={`k-price ${short ? "short" : ""} ${sold ? "sold" : ""}`}>
      <img src={UI["tag-gilt"]} alt="" draggable={false} />
      <b>{sold ? "Sold" : n}</b>
    </span>
  );
}

/** Your blood and gold between fights (map, rest, shop, reward, events): one drop and the number, then gold, always on its paper plate, right under the title. */
export function RunStatus({ hp, max, gold, floor }: { hp: number; max: number; gold: number; floor?: string }) {
  return (
    <Sheet wide className="k-status">
      {floor && <span className="k-label">{floor}</span>}
      <span className="hp">
        <img src={UI["blood-drop-flat"] ?? UI["blood-drop"]} alt="" draggable={false} />
        <b>{hp}</b>/{max}
      </span>
      <Gold n={gold} />
    </Sheet>
  );
}

// ─── Factions and people ─────────────────────────────────────────────────────

/** The two factions are told apart by shape only: the Order's solid star, the Pathless acorn. */
export function Emblem({ faction, big }: { faction: FactionId | null; big?: boolean }) {
  if (!faction) return null;
  return <img className={`k-emblem ${big ? "big" : ""}`} src={UI[faction === "order" ? "star" : "acorn"]} alt={faction === "order" ? "The Order of the Star" : "The Pathless"} draggable={false} />;
}

/** Influence as a tug of war on a knotted rope: the knot leans toward whoever leads. */
export function Rope({ order, pathless, small }: { order: number; pathless: number; small?: boolean }) {
  const total = order + pathless;
  const lean = total ? (pathless - order) / total : 0;
  return (
    <span className={`k-rope ${small ? "small" : ""}`} aria-label={`Order ${Math.round(order)}, Pathless ${Math.round(pathless)}`}>
      <Emblem faction="order" />
      <span className="cord">
        <img src={UI.rope} alt="" draggable={false} style={{ transform: `translateX(${lean * 22}%)` }} />
      </span>
      <Emblem faction="pathless" />
    </span>
  );
}

/** A player's face in a round engraved frame: the head of their full-body portrait in the frame's hole (17.7–82%). */
export function Medallion({ seed, size = "m", onClick, label, on }: { seed: number | undefined; size?: "s" | "m" | "l"; onClick?: () => void; label?: string; on?: boolean }) {
  const url = seed !== undefined ? PORTRAITS[String(seed)] : undefined;
  const inner = (
    <>
      <span className="hole">{url && <img src={url} alt="" draggable={false} />}</span>
      <img className="ring" src={UI.medallion} alt="" draggable={false} />
    </>
  );
  const cls = `k-medallion ${size} ${on ? "on" : ""}`;
  return onClick ? (
    <button className={cls} onClick={onClick} aria-label={label}>
      {inner}
    </button>
  ) : (
    <span className={cls}>{inner}</span>
  );
}

/** A portrait standing in a tarot arch, a name on its banner (window 16.6–83.9% × 11.1–78.6%, banner 79–87%). */
export function ArchCard({ seed, name, onClick, up }: { seed: number; name?: string; onClick?: () => void; up?: boolean }) {
  const T = onClick ? "button" : "div";
  return (
    <T className={`k-arch ${up ? "up" : ""}`} onClick={onClick}>
      <span className="window">{PORTRAITS[String(seed)] && <img src={PORTRAITS[String(seed)]} alt="" draggable={false} />}</span>
      <img className="frame" src={UI.arch} alt="" draggable={false} />
      {name && (
        <span className="banner" style={{ "--len": Math.max(8, name.length) } as CSSProperties}>
          {name}
        </span>
      )}
    </T>
  );
}

// ─── Guides ──────────────────────────────────────────────────────────────────

/** A Guide: a narrow paper card with its name, who it is, and what it does. Gilt corner mark when rare. */
export function GuideCard({ name, title, text, rare, onClick, off }: { name: string; title: string; text: string; rare?: boolean; onClick?: () => void; off?: boolean }) {
  const T = onClick ? "button" : "div";
  return (
    <T className={`k-guide ${off ? "off" : ""} ${rare ? "rare" : ""}`} onClick={onClick} disabled={onClick ? off : undefined}>
      <b className="name">{name}</b>
      <span className="who">{title}</span>
      <span className="text">{text}</span>
    </T>
  );
}
