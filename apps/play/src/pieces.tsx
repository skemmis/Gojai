/**
 * Paper things the screens are built from, all inked pieces from the art
 * pipeline (assets/ui-*.webp, made in /mnt/project-files/gojai-ui/pieces/):
 * torn sheets, tags, wax seals, scrolls, the faction marks and portrait
 * frames. Code only places them and prints on them (docs/DESIGN.md).
 */
import type { ReactNode } from "react";
import type { FactionId } from "@gojai/clans";
import { UI } from "./fight";

const globById = (files: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(new RegExp(`^.*${prefix}-(.*)\\.webp$`), "$1"), url]));
/** Generated player portraits (full-body ink figures, gojai-art/portraits/v4), keyed by seed. */
export const PORTRAITS: Record<string, string> = globById(import.meta.glob<string>("./assets/portrait-*.webp", { eager: true, import: "default" }), "portrait");

export { UI };

/** A curled paper scroll with a word on it: the app's one kind of main button (End turn, Enter, Continue). */
export function ScrollButton({ children, onClick, disabled, small }: { children: ReactNode; onClick?: () => void; disabled?: boolean; small?: boolean }) {
  return (
    <button className={`scroll-btn ${small ? "small" : ""}`} onClick={onClick} disabled={disabled}>
      <img src={UI.scroll} alt="" draggable={false} />
      <span>{children}</span>
    </button>
  );
}

/** A quiet choice printed straight on the page, underlined in ink ("Walk on", "Back"). */
export function InkLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button className="ink-link" onClick={onClick}>
      {children}
    </button>
  );
}

/** Back: a printer's pointing hand, as in old book margins. */
export function Back({ onClick }: { onClick: () => void }) {
  return (
    <button className="back" onClick={onClick} aria-label="Back">
      <img src={UI.manicule} alt="" draggable={false} />
    </button>
  );
}

/**
 * A torn sheet of paper holding content of any height. The sheet art is
 * nine-sliced (border-image) so its torn edges keep their shape; `nail`
 * keeps the nail at the top.
 */
export function Sheet({ children, wide, className = "", nail }: { children: ReactNode; wide?: boolean; className?: string; nail?: boolean }) {
  return <div className={`sheet-paper ${wide ? "wide" : "tall"} ${nail ? "nailed" : ""} ${className}`}>{children}</div>;
}

/** A hanging paper tag you can tap (rest choices). Text sits on the body below the punched hole (measured: hole ends at 23%). */
export function Tag({ children, onClick, disabled, gilt }: { children: ReactNode; onClick?: () => void; disabled?: boolean; gilt?: boolean }) {
  return (
    <button className={`tag-btn ${gilt ? "gilt" : ""}`} onClick={onClick} disabled={disabled}>
      <img src={UI[gilt ? "tag-gilt" : "tag"]} alt="" draggable={false} />
      <span className="tag-body">{children}</span>
    </button>
  );
}

/** A small gilt price tag on a string. */
export function Price({ n, short, sold }: { n: number; short?: boolean; sold?: boolean }) {
  return (
    <span className={`price ${short ? "short" : ""}`}>
      <img src={UI["tag-gilt"]} alt="" draggable={false} />
      <b>{sold ? "Sold" : n}</b>
    </span>
  );
}

/** A wax seal with a short word or number pressed on it (map buttons, gold). Calm centre measured at 20–85%. */
export function Seal({ children, onClick, gilt, className = "", label }: { children?: ReactNode; onClick?: () => void; gilt?: boolean; className?: string; label?: string }) {
  const body = (
    <>
      <img src={UI[gilt ? "seal-gilt" : "seal"]} alt="" draggable={false} />
      <span className="seal-mark">{children}</span>
    </>
  );
  return onClick ? (
    <button className={`seal-btn ${gilt ? "gilt" : ""} ${className}`} onClick={onClick} aria-label={label}>
      {body}
    </button>
  ) : (
    <span className={`seal-btn ${gilt ? "gilt" : ""} ${className}`}>{body}</span>
  );
}

/** Gold: a small gilt seal and the number. */
export function Gold({ n }: { n: number }) {
  return (
    <span className="coin">
      <img src={UI["seal-gilt"]} alt="" draggable={false} />
      <b className="num">{n}</b>
    </span>
  );
}

/** The two factions are told apart by shape only: the Order's solid star, the Pathless acorn. */
export function Emblem({ faction, className = "" }: { faction: FactionId | null; className?: string }) {
  if (!faction) return null;
  return <img className={`emblem ${className}`} src={UI[faction === "order" ? "star" : "acorn"]} alt={faction === "order" ? "The Order of the Star" : "The Pathless"} draggable={false} />;
}

/** A player's face in a round engraved frame: the head of their full-body portrait, set in the frame's hole (17.7–82%). */
export function Medallion({ seed, className = "", onClick, label }: { seed: number | undefined; className?: string; onClick?: () => void; label?: string }) {
  const url = seed !== undefined ? PORTRAITS[String(seed)] : undefined;
  const inner = (
    <>
      <span className="hole">{url && <img src={url} alt="" draggable={false} />}</span>
      <img className="ring" src={UI.medallion} alt="" draggable={false} />
    </>
  );
  return onClick ? (
    <button className={`medallion ${className}`} onClick={onClick} aria-label={label}>
      {inner}
    </button>
  ) : (
    <span className={`medallion ${className}`}>{inner}</span>
  );
}

/** A portrait standing in a tarot arch, with a name on the arch's banner (window 16.6–83.9% × 11.1–78.6%, banner 79–87%). */
export function ArchCard({ seed, name, className = "", onClick }: { seed: number; name?: string; className?: string; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag className={`arch-card ${className}`} onClick={onClick}>
      <span className="window">{PORTRAITS[String(seed)] && <img src={PORTRAITS[String(seed)]} alt="" draggable={false} />}</span>
      <img className="frame" src={UI.arch} alt="" draggable={false} />
      {name && <span className="banner">{name}</span>}
    </Tag>
  );
}

/** Influence in a neighborhood as a tug of war on a knotted rope: the knot leans toward whoever leads. */
export function Rope({ order, pathless, className = "" }: { order: number; pathless: number; className?: string }) {
  const total = order + pathless;
  const lean = total ? (pathless - order) / total : 0;
  return (
    <span className={`rope ${className}`} aria-label={`Order ${Math.round(order)}, Pathless ${Math.round(pathless)}`}>
      <Emblem faction="order" />
      <span className="cord">
        <img src={UI.rope} alt="" draggable={false} style={{ transform: `translateX(${lean * 22}%)` }} />
      </span>
      <Emblem faction="pathless" />
    </span>
  );
}

/** A ledger line with dotted leaders: label ........ value. */
export function Line({ k, v, className = "" }: { k: ReactNode; v: ReactNode; className?: string }) {
  return (
    <div className={`ledger-line ${className}`}>
      <span className="k">{k}</span>
      <span className="dots" aria-hidden="true" />
      <span className="v">{v}</span>
    </div>
  );
}

/** A full-bleed night plate behind a screen, top-anchored like the fight's. */
export function Backdrop({ src, dim = 0, pink }: { src?: string; dim?: number; pink?: boolean }) {
  if (!src) return <div className="backdrop" />;
  return (
    <div className="backdrop" aria-hidden="true">
      <img src={src} alt="" draggable={false} style={{ opacity: 1 - dim }} />
      {pink && <div className="pink-wash" />}
    </div>
  );
}
