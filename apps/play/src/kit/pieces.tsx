/**
 * The shared inked pieces first built for the fight screen, moved here so
 * every screen draws from one library (kit/index.tsx re-exports them).
 * CSS for these lives in styles.css under the same class names, which
 * tools/ui-check/check.mjs measures (.ribbon span, .shield-mark b, .gcard .seal b ...).
 */
import { CONFIG, cardDef, isJunk } from "@gojai/core";
import type { Card, Run, Suit } from "@gojai/core";
import { Icon, rankLabel, powerAmount, type IconName } from "../components";

/** Enemy sprites from the art thread, keyed by enemy id (assets/enemy-<id>.webp). Missing ones stand in as a silhouette. */
export const SPRITES: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>("../assets/enemy-*.webp", { eager: true, import: "default" })).map(([path, url]) => [
    path.replace(/^.*enemy-(.*)\.webp$/, "$1"),
    url,
  ]),
);

/** Fight backgrounds from the art thread: full-height night plates of real places (assets/scene-<id>.webp); a front layer at the edges (assets/front-<id>.webp) where one exists. */
export const globById = (files: Record<string, string>, prefix: string) =>
  Object.fromEntries(Object.entries(files).map(([path, url]) => [path.replace(new RegExp(`^.*${prefix}-(.*)\\.webp$`), "$1"), url]));
export const SCENES: Record<string, string> = globById(import.meta.glob<string>("../assets/scene-*.webp", { eager: true, import: "default" }), "scene");

/** Plates a fight can land on when the spot's place has no plate of its own: the run seed and floor pick one. */
const PLATES = ["arcade", "libbey-park", "ojai-valley-trail", "shelf-road"];

export function sceneFor(run: Run): string {
  const place = run.spot?.place?.replace(/_/g, "-");
  if (place && SCENES[place]) return place;
  return PLATES[Math.abs((run.seed ?? 0) * 31 + run.floor) % PLATES.length];
}


/** The Moon deck: A–10 in every suit, drawn with pips but no numbers. The game overlays the live value. */
const CARD_ART: Record<string, string> = globById(import.meta.glob<string>("../assets/card-*.webp", { eager: true, import: "default" }), "card");

/** Each plain card has its own plate, matched to its current value, so an upgrade redraws the pips too. */
function artFor(card: Card, named: boolean): string | undefined {
  if (!card.suit || named) return undefined;
  return CARD_ART[card.value === 1 ? `ace-${card.suit}` : `${card.value}-${card.suit}`];
}

/** A wax seal in the card's corner carries its live value: an irregular blob, not a box, so it sits on the art like a mark pressed into it. */
/* TODO(no code art): replace with an inked seal piece from the art pipeline. */
const SEAL =
  "M93.3 45.3Q95.3 50.0 92.0 54.4Q88.6 58.8 90.3 64.5Q92.0 70.2 86.4 72.4Q80.7 74.5 79.7 80.3Q78.8 86.1 73.2 86.3Q67.6 86.5 63.7 89.8Q59.8 93.1 54.9 92.1Q50.0 91.0 45.1 92.0Q40.2 93.0 36.3 89.9Q32.3 86.7 27.4 85.7Q22.4 84.6 20.8 79.6Q19.2 74.5 14.0 72.2Q8.8 69.8 8.8 64.6Q8.8 59.4 7.1 54.7Q5.5 50.0 8.3 45.6Q11.1 41.1 9.6 35.5Q8.1 29.8 12.3 26.6Q16.5 23.3 18.8 18.6Q21.1 13.8 26.8 13.6Q32.4 13.4 35.9 8.4Q39.3 3.3 44.7 7.1Q50.0 10.8 55.3 7.3Q60.6 3.8 64.0 8.8Q67.4 13.8 72.6 14.5Q77.8 15.1 79.3 20.3Q80.9 25.4 85.8 27.9Q90.8 30.4 91.0 35.5Q91.2 40.6 93.3 45.3Z";

const SUIT_ICON: Record<Suit, IconName> = { spades: "blade", hearts: "shield", diamonds: "draw", clubs: "recall" };



/** Inked UI pieces from the art thread (assets/ui-<id>.webp): blots, shield, moons, drops, piles, ribbon, scroll. */
export const UI: Record<string, string> = globById(import.meta.glob<string>("../assets/ui-*.webp", { eager: true, import: "default" }), "ui");

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


export function ShieldMark({ n, small, preview }: { n: number; small?: boolean; preview?: boolean }) {
  return (
    <div className={`shield-mark ${small ? "small" : ""} ${preview ? "preview" : ""}`} title="Block">
      <img src={UI.shield} alt="" draggable={false} />
      <b>{n}</b>
    </div>
  );
}


/**
 * Life: one drop of blood as the sign for it, then the exact number. The
 * coming loss hangs over the number in red. The enemy's and yours are drawn
 * the same. (Ten drops filled like vials read as busy, so they went.)
 */
export function Drops({ hp, max, loss, who }: { hp: number; max: number; loss: number; who: "foe" | "you" }) {
  return (
    <div className={`drops ${who} ${loss > 0 ? "at-risk" : ""}`} title={`${Math.max(0, hp)} of ${max} life`}>
      <img className="drop" src={UI["blood-drop-flat"]} alt="" draggable={false} />
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


export function GameCard({ card, mult = 1, off, dud, armed }: { card: Card; mult?: number; off?: boolean; dud?: boolean; armed?: boolean }) {
  const d = cardDef(card.def);
  const junk = isJunk(card);
  const art = junk ? undefined : artFor(card, !!d.name);
  const value = card.value * mult;
  // When every card hits, the seal shows what it hits for (its value); otherwise its suit power
  const sealN = card.suit ? (CONFIG.allDamage ? value : powerAmount(card.suit, value)) : 0;
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
        <span className={`seal ${sealN >= 10 ? "wide" : ""}`} aria-label={`${card.suit} ${sealN}`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <path d={SEAL} />
            <circle cx="50" cy="50" r="33" />
          </svg>
          <span className="stamp">
            <Icon name={card.suit} />
            <b>{sealN}</b>
          </span>
        </span>
      ) : card.suit && !junk ? (
        <span className={`pw pw-${card.suit}`}>
          <Icon name={SUIT_ICON[card.suit]} />
          <b>{powerAmount(card.suit, value)}</b>
        </span>
      ) : (
        <span className="pw junk">{d.name}</span>
      )}
    </div>
  );
}

