/**
 * The three factions. Each is one camp from Ojai's spiritual history, with a
 * modern satirical face, and one small clan-layer perk. Perks only touch
 * territory (never a run), and the clan lab checks that none of them wins
 * more than its share. Lore notes are for writers; players see `motto`.
 *
 * Satire rules (plan.md): historical figures are fair game, living people only
 * as archetypes, Krishnamurti paraphrased rather than quoted.
 */
export type FactionId = "order" | "pathless" | "readymades";

export const FACTION_IDS: readonly FactionId[] = ["order", "pathless", "readymades"];

export type PerFaction<T> = Record<FactionId, T>;

export const perFaction = <T>(f: (id: FactionId) => T): PerFaction<T> =>
  ({ order: f("order"), pathless: f("pathless"), readymades: f("readymades") });

export type Perk = "lodge" | "walkOn" | "readymade";

export interface Faction {
  id: FactionId;
  name: string;
  /** One line players see. */
  motto: string;
  /** Who they were. */
  history: string;
  /** Who they are in Ojai now: the satirical face. */
  today: string;
  /** Where they feel at home (neighborhood ids from @gojai/map). Flavour only. */
  haunts: string[];
  perk: Perk;
  perkText: string;
}

export const FACTIONS: PerFaction<Faction> = {
  order: {
    id: "order",
    name: "The Order of the Star",
    motto: "Everything in its place, and a fee for each level.",
    history:
      "The Theosophists: Annie Besant and C. W. Leadbeater, the hidden Masters, degrees of initiation. They raised a boy from Madras to be the World Teacher, built Krotona on the hill in 1924, and bought up the valley to wait for him.",
    today:
      "Tiered memberships, the retreat with a waitlist, the sound bath priced by chakra, the board that runs the board. They hold ground the way the old families hold land.",
    haunts: ["country-club", "arbolada", "the-mount"],
    perk: "lodge",
    perkText: "Lodges: ground the Order holds loses influence more slowly overnight.",
  },
  pathless: {
    id: "pathless",
    name: "The Pathless",
    motto: "We are not a faction.",
    history:
      "Krishnamurti, who in 1929 dissolved the Order built around him, told its members that truth has no road to it, and spent the rest of his life speaking under the Oak Grove in Meiners Oaks.",
    today:
      "The silent-walk crowd, the people who quote him on Instagram, the ones who left the retreat early. No ranks, no leaders, no badges on their profiles, and a very organised group chat about not being organised.",
    haunts: ["meiners-oaks", "trail", "foothills"],
    perk: "walkOn",
    perkText: "Walk On: the first spot you play in each neighborhood each day gives extra influence.",
  },
  readymades: {
    id: "readymades",
    name: "The Readymades",
    motto: "Chocolate, young men, and a urinal in a gallery.",
    history:
      "Beatrice Wood, the Mama of Dada: Duchamp's friend, co-editor of The Blind Man in 1917, a Theosophist who followed Krishnamurti to Ojai, threw lustre pots until she was 105, and said she owed it all to chocolate and young men.",
    today:
      "Gallery row, the art walk, the ceramicist with a trust fund, the installation nobody asked for on somebody else's lawn. They don't hold ground; they vandalise yours.",
    haunts: ["west-matilija", "arcade", "east-end"],
    perk: "readymade",
    perkText: "Readymade: influence you earn in ground another faction holds counts extra.",
  },
};
