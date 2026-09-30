import { useState } from "react";
import { cardDef, cardName, isJunk, GUIDE_BY_ID, CONFIG } from "@gojai/core";
import type { Card, Suit } from "@gojai/core";

/** Suits are read by shape and by their power line, never by colour (docs/ART_DIRECTION.md). */
export const POWER: Record<Suit, string> = { spades: "Strike", hearts: "Guard", diamonds: "Draw", clubs: "Recall" };

/** Ink glyphs from the style guide: suits plus the few icons the fight needs. */
const PATHS = {
  spades: "M12 1.5C8.5 6.5 2.5 9.5 2.5 14a4.5 4.5 0 0 0 8 2.8L9 22.5h6l-1.5-5.7a4.5 4.5 0 0 0 8-2.8c0-4.5-6-7.5-9.5-12.5z",
  hearts: "M12 21.5C5 16 1.8 12.4 1.8 8.3A5.3 5.3 0 0 1 12 6a5.3 5.3 0 0 1 10.2 2.3c0 4.1-3.2 7.7-10.2 13.2z",
  diamonds: "M12 1.5l8.5 10.5L12 22.5 3.5 12z",
  clubs: "M12 2.2a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zM6.6 9a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zM17.4 9a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2zM11 13h2l1.8 9.5H9.2z",
  blade: "M21.5 2.5l-.8 4.3-9.2 9.2-2.5-2.5 9.2-9.2zM6.3 12.6l5.1 5.1-1.6 1.6-1.2-1.2-3.4 3.4-2.3-2.3 3.4-3.4-1.2-1.2z",
  shield: "M12 1.8l8.5 3.2v6.3c0 5.4-3.7 9.4-8.5 11-4.8-1.6-8.5-5.6-8.5-11V5z",
  eye: "M12 5C6.5 5 2.6 9.3 1.5 12c1.1 2.7 5 7 10.5 7s9.4-4.3 10.5-7C21.4 9.3 17.5 5 12 5zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z",
  up: "M12 3l8 9h-5v9H9v-9H4z",
  cross: "M9 2h6v7h7v6h-7v7H9v-7H2V9h7z",
  letter: "M2 5h20v14H2zM3.5 6.5L12 13l8.5-6.5",
  draw: "M4 3h11v15H4zM6 5v11h7V5zM17 7h3v14H8v-2h10V7z",
  recall: "M12 4a8 8 0 1 1-7.4 5H2l4-5 4 5H7.8A5 5 0 1 0 12 7z",
} as const;
export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={`ico ${className ?? ""}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function SuitMark({ suit }: { suit: Suit }) {
  return (
    <span className="suit" title={suit}>
      <Icon name={suit} />
    </span>
  );
}

export function rankLabel(c: Card): string {
  const d = cardDef(c.def);
  if (d.face) return d.face;
  if (isJunk(c)) return "–";
  return c.value === 1 ? "A" : String(c.value);
}

/** What a card of this suit and value does: damage, block, or cards drawn/recalled. */
export function powerAmount(suit: Suit, value: number): number {
  if (CONFIG.powerByValue) return value;
  if (suit === "diamonds") return 1 + Math.floor(value / CONFIG.diamondsPer);
  if (suit === "clubs") return 1 + Math.floor(value / CONFIG.clubsPer);
  return value;
}

/** A power line like "Strike 7". Only a strike's number is red. */
export function PowerLine({ suit, n }: { suit: Suit; n: number }) {
  return (
    <>
      {POWER[suit]} <b className={suit === "spades" ? "blood-text" : ""}>{n}</b>
    </>
  );
}

export function CardView({
  card,
  selected,
  onClick,
  disabled,
  off,
  small,
  badge,
  power,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** Can't be played right now: cross-hatched. */
  off?: boolean;
  small?: boolean;
  /** A tag on the card, e.g. the matching bonus it would get. */
  badge?: string;
  /** The card's value after bonuses (matching); defaults to its value. */
  power?: number;
}) {
  const d = cardDef(card.def);
  const junk = isJunk(card);
  const named = !!d.name;
  const cls = ["card", selected ? "up" : "", off || junk ? "off" : "", small ? "small" : ""].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={named ? `${d.name}: ${d.text}` : cardName(card)}>
      {(d.rarity === "rare" || d.face) && <span className="tag gilt">{d.face ? "CAUGHT" : "RARE"}</span>}
      {badge && <span className="tag ink">{badge}</span>}
      <span className="rk">
        {rankLabel(card)}
        {card.suit && <Icon name={card.suit} />}
      </span>
      <span className="face">
        {named ? (
          <>
            <span className="card-name">{d.name}</span>
            <span className="card-text">{d.text}</span>
          </>
        ) : (
          card.suit && <Icon name={card.suit} className="pip" />
        )}
      </span>
      <span className="pw">{card.suit && !junk ? <PowerLine suit={card.suit} n={powerAmount(card.suit, power ?? card.value)} /> : "Junk"}</span>
    </button>
  );
}

export function GuideChip({ id, onClick, selected }: { id: string; onClick?: () => void; selected?: boolean }) {
  const g = GUIDE_BY_ID[id];
  const [open, setOpen] = useState(false);
  return (
    <button className={`guide ${selected ? "selected" : ""}`} title={g.text} onClick={onClick ?? (() => setOpen((o) => !o))}>
      {g.rarity === "rare" && <span className="tag gilt">RARE</span>}
      <span className="guide-name">{g.name}</span>
      <span className="guide-title">{g.title}</span>
      {(open || onClick) && <span className="guide-text">{g.text}</span>}
    </button>
  );
}

const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
export function sortCards(cs: Card[]): Card[] {
  return cs.slice().sort((a, b) => a.value - b.value || (SUIT_ORDER[a.suit ?? ""] ?? 9) - (SUIT_ORDER[b.suit ?? ""] ?? 9) || a.uid - b.uid);
}

export function CardPicker({ title, cards, onPick, onCancel }: { title: string; cards: Card[]; onPick: (uid: number) => void; onCancel: () => void }) {
  return (
    <div className="panel picker">
      <div className="row between">
        <h3>{title}</h3>
        <button className="btn ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="cards">
        {sortCards(cards).map((c) => (
          <CardView key={c.uid} card={c} small onClick={() => onPick(c.uid)} />
        ))}
      </div>
    </div>
  );
}
