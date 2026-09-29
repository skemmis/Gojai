import { useState } from "react";
import { cardDef, cardName, isJunk, GUIDE_BY_ID } from "@gojai/core";
import type { Card, Suit } from "@gojai/core";

export const SYM: Record<Suit, string> = { hearts: "♥", diamonds: "♦", spades: "♠", clubs: "♣" };
export const SUIT_COLOR: Record<Suit, string> = {
  hearts: "#ff2e88",
  diamonds: "#ffd400",
  spades: "#00e5ff",
  clubs: "#7dff3a",
};
export const POWER: Record<Suit, string> = { hearts: "Block", diamonds: "Draw", spades: "Attack", clubs: "Recall" };

export function valueLabel(c: Card): string {
  const d = cardDef(c.def);
  if (d.face) return d.face;
  if (isJunk(c)) return "×";
  return c.value === 1 ? "A" : String(c.value);
}

export function SuitMark({ suit }: { suit: Suit }) {
  return <span className={`s-${suit}`}>{SYM[suit]}</span>;
}

export function CardView({
  card,
  selected,
  onClick,
  disabled,
  small,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  const d = cardDef(card.def);
  const junk = isJunk(card);
  const named = !!d.name;
  const cls = ["card", card.suit ? `s-${card.suit}` : "", junk ? "junk" : "", selected ? "selected" : "", d.face ? "face" : "", small ? "small" : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} title={named ? `${d.name}: ${d.text}` : cardName(card)}>
      <span className="card-corner">
        <span className="card-val">{valueLabel(card)}</span>
        {card.suit && <span className="card-suit">{SYM[card.suit]}</span>}
      </span>
      {!named && card.suit && <span className="card-pip">{SYM[card.suit]}</span>}
      {named && (
        <span className="card-body">
          <span className="card-name">{d.name}</span>
          <span className="card-text">{d.text}</span>
        </span>
      )}
      {d.face && <span className="card-facetag">{card.value}</span>}
    </button>
  );
}

export function GuideChip({ id, onClick, selected }: { id: string; onClick?: () => void; selected?: boolean }) {
  const g = GUIDE_BY_ID[id];
  const [open, setOpen] = useState(false);
  return (
    <button
      className={`guide ${selected ? "selected" : ""} ${g.rarity === "rare" ? "rare" : ""}`}
      title={g.text}
      onClick={onClick ?? (() => setOpen((o) => !o))}
    >
      <span className="guide-name">{g.name}</span>
      <span className="guide-title">{g.title}</span>
      {(open || onClick) && <span className="guide-text">{g.text}</span>}
    </button>
  );
}

const SUIT_ORDER: Record<string, number> = { hearts: 0, diamonds: 1, spades: 2, clubs: 3 };
export function sortCards(cs: Card[]): Card[] {
  return cs.slice().sort((a, b) => a.value - b.value || (SUIT_ORDER[a.suit ?? ""] ?? 9) - (SUIT_ORDER[b.suit ?? ""] ?? 9) || a.uid - b.uid);
}

export function CardPicker({
  title,
  cards,
  onPick,
  onCancel,
}: {
  title: string;
  cards: Card[];
  onPick: (uid: number) => void;
  onCancel: () => void;
}) {
  return (
    <div className="panel picker">
      <div className="row between">
        <h3>{title}</h3>
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
      <div className="hand">
        {sortCards(cards).map((c) => (
          <CardView key={c.uid} card={c} small onClick={() => onPick(c.uid)} />
        ))}
      </div>
    </div>
  );
}
