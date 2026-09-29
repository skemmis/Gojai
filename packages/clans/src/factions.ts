/**
 * The factions. Each is a camp from Ojai's spiritual history with a modern
 * satirical face. Factions have no special abilities (Sam, 2026-09-29): they
 * differ in lore, look and who you walk with, never in rules. Lore notes are
 * for writers; players see `motto`.
 *
 * Satire rules (plan.md): historical figures are fair game, living people only
 * as archetypes, Krishnamurti paraphrased rather than quoted.
 *
 * Two factions, the 1929 split itself (Sam, 2026-09-29). The rules take any
 * number of factions (`CLAN.factions`), so a third camp can arrive later;
 * candidates are in docs/CLANS.md.
 */
export type FactionId = "order" | "pathless";

export const FACTION_IDS: readonly FactionId[] = ["order", "pathless"];

export type PerFaction<T> = Record<FactionId, T>;

export const perFaction = <T>(f: (id: FactionId) => T): PerFaction<T> =>
  ({ order: f("order"), pathless: f("pathless") });

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
}

export const FACTIONS: PerFaction<Faction> = {
  order: {
    id: "order",
    name: "The Order of the Star",
    motto: "Everything in its place, and a fee for each level.",
    history:
      "The Theosophists: Annie Besant and C. W. Leadbeater, the hidden Masters, degrees of initiation. They raised a boy from Madras to be the World Teacher, built Krotona on the hill in 1924, and bought up the valley to wait for him.",
    today:
      "Tiered memberships, the retreat with a waitlist, the sound bath priced by chakra, the board that runs the board.",
    haunts: ["country-club", "arbolada", "the-mount"],
  },
  pathless: {
    id: "pathless",
    name: "The Pathless",
    motto: "We are not a faction.",
    history:
      "Krishnamurti, who in 1929 dissolved the Order built around him, told its members that truth has no road to it, and spent the rest of his life speaking under the Oak Grove in Meiners Oaks.",
    today:
      "The silent-walk crowd, the people who quote him on Instagram, the ones who left the retreat early. No ranks, no leaders, and a very organised group chat about not being organised.",
    haunts: ["meiners-oaks", "trail", "foothills"],
  },
};
