/**
 * All content as data: cards, Guides, enemies, events. Names and flavor are
 * free to rewrite; the numbers are balance and belong to the lab.
 *
 * Lore rule of thumb (see plan): historical figures by name, living people
 * only as archetypes, real businesses only under parody names.
 */
import type { CardDef, EnemyDef, GuideDef } from "./types";

// ─── Cards ────────────────────────────────────────────────────────────────────

export const CARDS: CardDef[] = [
  // Letting go: cards that pay off when you DON'T play them
  { id: "let_go", name: "Let Go", value: 3, suit: "spades", rarity: "common", effects: [{ k: "onDiscardDamage", n: 8 }], text: "Unplayed at end of turn: deal 8 damage.", flavor: "Freedom from the known." },
  { id: "sage_bundle", name: "Sage Bundle", value: 4, suit: "hearts", rarity: "common", effects: [{ k: "onDiscardBlock", n: 6 }], text: "Unplayed at end of turn: 6 block next turn." },
  { id: "oak_tree", name: "The Oak", value: 8, suit: "hearts", rarity: "common", effects: [{ k: "retain" }], text: "Stays in your hand between turns." },
  { id: "trust_fund", name: "Trust Fund", value: 5, suit: "diamonds", rarity: "rare", effects: [{ k: "free" }], text: "Costs no action.", flavor: "Never touched the principal." },
  { id: "cold_plunge", name: "Cold Plunge", value: 3, suit: "spades", rarity: "common", effects: [{ k: "free" }], text: "Costs no action." },

  // Plays
  { id: "heirloom_tomato", name: "Heirloom Tomato", value: 7, suit: "clubs", rarity: "common", effects: [{ k: "dmg", n: 5 }], text: "Also deals 5 damage.", flavor: "$14 a pound." },
  { id: "old_money", name: "Old Money", value: 9, suit: "diamonds", rarity: "common", effects: [{ k: "dmg", n: 4 }], text: "Also deals 4 damage." },
  { id: "shelf_road", name: "Shelf Road", value: 6, suit: "hearts", rarity: "common", effects: [{ k: "draw", n: 1 }], text: "Also draw 1." },
  { id: "second_opinion", name: "Second Opinion", value: 4, suit: "spades", rarity: "common", effects: [{ k: "draw", n: 1 }], text: "Also draw 1." },
  { id: "bike_lock", name: "Bike Lock", value: 5, suit: "clubs", rarity: "common", effects: [{ k: "block", n: 5 }], text: "Also 5 block." },
  { id: "pink_moment", name: "Pink Moment", value: 8, suit: "hearts", rarity: "rare", effects: [{ k: "wild" }], text: "Counts as every suit.", flavor: "The Topatopas blush for six minutes." },
  { id: "wildflower", name: "Wildflower", value: 3, suit: "clubs", rarity: "common", effects: [{ k: "wild" }], text: "Counts as every suit." },
  { id: "mahatma_letter", name: "Mahatma Letter", value: 6, suit: "spades", rarity: "rare", effects: [{ k: "pierce" }], text: "Its powers ignore immunity.", flavor: "Delivered by precipitation." },
  { id: "the_channeler", name: "The Channeler", value: 1, suit: "diamonds", rarity: "rare", effects: [{ k: "wild" }, { k: "pierce" }], text: "An Ace that counts as every suit and ignores immunity." },
  { id: "arcade_lease", name: "Arcade Lease", value: 10, suit: "diamonds", rarity: "common", effects: [], text: "A plain 10.", flavor: "Mission Revival. Triple net." },
  { id: "olive_oil", name: "Olive Oil Tasting", value: 2, suit: "diamonds", rarity: "common", effects: [{ k: "free" }], text: "Costs no action." },

  // Junk: enemies shove these into your deck; they leave after the fight
  { id: "junk_latte", name: "The $9 Latte", value: 0, suit: null, rarity: "junk", effects: [{ k: "junk" }], text: "Junk. Can't be played." },
  { id: "junk_ticket", name: "Parking Ticket", value: 0, suit: null, rarity: "junk", effects: [{ k: "junk" }, { k: "heavy", n: 3 }], text: "Junk. While in hand, attacks are +3." },
  { id: "junk_like", name: "A Like", value: 0, suit: null, rarity: "junk", effects: [{ k: "junk" }], text: "Junk. Can't be played." },
  { id: "junk_permit", name: "Permit Delay", value: 0, suit: null, rarity: "junk", effects: [{ k: "junk" }, { k: "heavy", n: 2 }], text: "Junk. While in hand, attacks are +2." },
];

export const PLAIN: CardDef = { id: "plain", name: "", value: 0, suit: null, rarity: "plain", effects: [], text: "" };

// ─── Guides (the rule-benders) ────────────────────────────────────────────────

export const GUIDES: GuideDef[] = [
  { id: "krishnamurti", name: "Krishnamurti", title: "The Pathless", rarity: "rare", text: "Combos have no cap.", flavor: "Truth is a pathless land." },
  { id: "blavatsky", name: "Blavatsky", title: "The Secret Doctrine", rarity: "rare", text: "Block no longer wears off between your turns." },
  { id: "leadbeater", name: "Leadbeater", title: "The Clairvoyant", rarity: "common", text: "Start each fight with 6 block." },
  { id: "besant", name: "Besant", title: "The Orator", rarity: "common", text: "Spade combos deal +4 damage." },
  { id: "libbey", name: "Libbey", title: "The Glassmaker", rarity: "common", text: "Diamonds draw 1 extra card.", flavor: "He rebuilt the town in his image. Mission Revival, naturally." },
  { id: "sound_bath", name: "The Sound Bath", title: "Gong Practitioner", rarity: "common", text: "Each card you discard unplayed: +1 block next turn." },
  { id: "life_coach", name: "The Life Coach", title: "Certified", rarity: "common", text: "Your first play each fight deals double." },
  { id: "crystal_shop", name: "The Crystal Shop", title: "Downtown", rarity: "common", text: "Hearts block +2." },
  { id: "realtor", name: "The Realtor", title: "Top Producer", rarity: "common", text: "+6 gold per fight. Catches pay 20." },
  { id: "farmers_market", name: "The Farmers Market", title: "Sundays", rarity: "common", text: "Clubs recall 1 extra card." },
  { id: "peoples_market", name: "The People's Market", title: "Thursdays", rarity: "rare", text: "Aces count as every suit." },
  { id: "pink_moment_g", name: "Pink Moment", title: "Sunset, Daily", rarity: "common", text: "Perfect fights also heal 6." },
  { id: "oak_grove", name: "The Oak Grove", title: "Besant Road", rarity: "rare", text: "Draw 1 more card each turn." },
  { id: "arcade", name: "The Arcade", title: "Ojai Avenue", rarity: "common", text: "Playing a card worth 10+ draws 1." },
  { id: "meditation_mount", name: "Meditation Mount", title: "Reeves Road", rarity: "common", text: "After each fight, heal 4." },
  { id: "ojai_day", name: "Ojai Day", title: "Every October", rarity: "rare", text: "+1 action on the first turn of each fight." },
  { id: "retreat", name: "The Silent Retreat", title: "Ten Days", rarity: "common", text: "Enemy attacks are 1 lower." },
  { id: "ceremony", name: "The Ceremony", title: "Upper Ojai", rarity: "common", text: "Your first play each fight ignores immunity." },
];

// ─── Enemies ─────────────────────────────────────────────────────────────────
// Each is immune to its suit(s) and shows its next move (intent). An exact kill (HP to exactly 0) catches it,
// and it joins your deck as a face card: normal = Jack (10), elite = Queen (15),
// boss = King (20), as in Regicide.

const atk = (n: number, times?: number) => ({ k: "attack" as const, n, ...(times ? { times } : {}) });
const blk = (n: number) => ({ k: "block" as const, n });
const buff = (n: number) => ({ k: "buff" as const, n });
const heal = (n: number) => ({ k: "heal" as const, n });
const hex = (card: string, count = 1) => ({ k: "hex" as const, card, count });
const none = { k: "none" as const };

export const ENEMIES: EnemyDef[] = [
  // Normal: beatable with the starting hearts and spades
  { id: "ebike_teen", name: "The E-Bike Teen", tier: "normal", hp: 28, suits: ["diamonds"], passive: none, intents: [[atk(3, 2)], [atk(3, 2)], [blk(4)]], text: "Fast, loud, everywhere. Hits twice.",
    catch: { value: 10, suit: "diamonds", effects: [{ k: "draw", n: 1 }], text: "Also draw 1." } },
  { id: "nine_latte", name: "The $9 Latte", tier: "normal", hp: 32, suits: ["clubs"], passive: none, intents: [[atk(6)], [hex("junk_latte")], [atk(4)]], text: "Slips $9 lattes into your deck.",
    catch: { value: 10, suit: "clubs", effects: [{ k: "dmg", n: 3 }], text: "Also deals 3 damage." } },
  { id: "influencer", name: "The Influencer", tier: "normal", hp: 26, suits: ["hearts"], passive: none, intents: [[hex("junk_like", 2)], [atk(7)], [atk(5)]], text: "Hearts can't block it. Spams Likes into your deck.",
    catch: { value: 10, suit: "hearts", effects: [{ k: "wild" }], text: "Counts as every suit." } },
  { id: "crystal_vendor", name: "The Crystal Vendor", tier: "normal", hp: 34, suits: ["diamonds"], passive: { k: "armor", n: 1 }, intents: [[atk(6)], [blk(6)], [atk(6)]], text: "Every hit deals 1 less.",
    catch: { value: 10, suit: "diamonds", effects: [{ k: "block", n: 4 }], text: "Also 4 block." } },
  { id: "short_term_rental", name: "The Short-Term Rental", tier: "normal", hp: 30, suits: ["diamonds"], passive: none, intents: [[atk(4)], [buff(2)], [atk(4)]], text: "Raises the rent.",
    catch: { value: 10, suit: "diamonds", effects: [], text: "A plain 10 of diamonds." } },
  { id: "parking_enforcer", name: "Parking Enforcement", tier: "normal", hp: 30, suits: ["clubs"], passive: none, intents: [[atk(5), hex("junk_ticket")], [atk(7)]], text: "Tickets. Each one makes attacks heavier.",
    catch: { value: 10, suit: "clubs", effects: [{ k: "onDiscardDamage", n: 6 }], text: "Unplayed at end of turn: deal 6 damage." } },
  { id: "manifestor", name: "The Manifestor", tier: "normal", hp: 28, suits: ["hearts"], passive: none, intents: [[heal(4)], [atk(6)], [atk(6)]], text: "Believes it will heal. Does.",
    catch: { value: 10, suit: "hearts", effects: [{ k: "retain" }], text: "Stays in your hand between turns." } },

  // Elite
  { id: "land_rover_mom", name: "The Oak Grove Mom", tier: "elite", hp: 60, suits: ["clubs"], passive: { k: "armor", n: 2 }, intents: [[atk(10)], [blk(10)], [atk(5, 2)]], text: "Land Rover. Idling. Every hit deals 2 less.",
    catch: { value: 15, suit: "clubs", effects: [{ k: "block", n: 5 }], text: "Also 5 block." } },
  { id: "developer", name: "The Developer", tier: "elite", hp: 64, suits: ["diamonds"], passive: none, intents: [[hex("junk_permit", 2)], [atk(9)], [buff(3)], [atk(9)]], text: "Permit delays pile up. Stakes rise.",
    catch: { value: 15, suit: "diamonds", effects: [{ k: "draw", n: 2 }], text: "Also draw 2." } },
  { id: "sound_healer", name: "The Sound Healer", tier: "elite", hp: 48, suits: ["hearts"], passive: none, intents: [[atk(8)], [heal(6)], [atk(8)]], text: "Heals on the off-beat.",
    catch: { value: 15, suit: "hearts", effects: [{ k: "onDiscardBlock", n: 6 }], text: "Unplayed at end of turn: 6 block next turn." } },

  // Boss
  { id: "order_of_star", name: "The Order of the Star", tier: "boss", hp: 60, suits: ["hearts"], passive: none, intents: [[atk(8)], [buff(2)], [atk(5, 2)], [hex("junk_permit"), blk(10)]], text: "The organization he dissolved in 1929. It did not take the hint.",
    catch: { value: 20, suit: "spades", effects: [{ k: "pierce" }], text: "Ignores immunity." } },
  { id: "masters", name: "The Masters of the Wisdom", tier: "boss", hp: 72, suits: ["hearts", "diamonds"], passive: { k: "silence" }, intents: [[atk(11)], [blk(12)], [atk(4, 3)], [hex("junk_like", 3)]], text: "Ascended. Your first play each fight has no power.",
    catch: { value: 20, suit: "hearts", effects: [{ k: "wild" }], text: "Counts as every suit." } },
];

// ─── Events ──────────────────────────────────────────────────────────────────

export interface EventDef {
  id: string;
  title: string;
  text: string;
  options: { label: string; needsCard?: boolean }[];
}

export const EVENTS: EventDef[] = [
  {
    id: "oak_grove_talk",
    title: "A Talk Under the Oaks",
    text: "An old man is speaking in the grove. He says there is no path.",
    options: [{ label: "Listen: let go of a card", needsCard: true }, { label: "Heckle: +25 gold, lose 5 HP" }, { label: "Walk on" }],
  },
  {
    id: "honor_shelf",
    title: "The Honor Shelf",
    text: "An outdoor bookshelf runs on the honor system. There's a coffee can for payment.",
    options: [{ label: "Take a rare card, pay 30 gold" }, { label: "Take it and pay nothing: lose 6 HP" }, { label: "Walk on" }],
  },
  {
    id: "krotona_library",
    title: "The Library at Krotona",
    text: "The Theosophical library is open to the public today.",
    options: [{ label: "Study: upgrade two random cards" }, { label: "Walk on" }],
  },
];

// ─── Lookups ─────────────────────────────────────────────────────────────────

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
export const GUIDE_BY_ID: Record<string, GuideDef> = Object.fromEntries(GUIDES.map((g) => [g.id, g]));
export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const EVENT_BY_ID: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

/** Card defs, including the catch cards generated from enemies ("catch_<enemy id>"). */
export function cardDef(id: string): CardDef {
  if (id === "plain") return PLAIN;
  if (id.startsWith("catch_")) {
    const e = ENEMY_BY_ID[id.slice(6)];
    const face = e.tier === "normal" ? "J" : e.tier === "elite" ? "Q" : "K";
    return { id, name: e.name, value: e.catch.value, suit: e.catch.suit, rarity: "catch", effects: e.catch.effects, text: e.catch.text, face };
  }
  return CARD_BY_ID[id];
}
