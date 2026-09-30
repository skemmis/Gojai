import { makeRng, pick, next } from "@gojai/core";
import type { FactionId } from "./factions.ts";

/**
 * Generated profile portraits (Sam, 2026-09-29): every player gets a random
 * character drawn in the house ink style. Same approach as Fantasy-Reality's
 * avatars (shared/archetypes.ts + image/client.ts): an archetype carries the
 * look (headwear, props, bearing), and separate layers (age, who, build,
 * hair, the faction's touch) are rolled on top, so two players rarely match.
 *
 * Everything is rolled from a seed, so a portrait is just `gen:<seed>`: the
 * server stores the seed and the image, and the recipe can always be rebuilt.
 * Archetypes are locals of the valley, drawn straight. The satire is for the
 * enemies; players are the people walking through it.
 */
export interface Archetype {
  id: string;
  name: string;
  /** The look only: headwear, clothes, props, bearing. Never face or skin. */
  look: string;
}

export const ARCHETYPES: Archetype[] = [
  { id: "pilgrim", name: "Pilgrim", look: "a long weathered travelling coat, a plain wooden walking staff held upright, a small bundle over the shoulder, dust on the collar" },
  { id: "beekeeper", name: "Beekeeper", look: "a beekeeper's veil thrown back over a wide hat, a smoker can in one hand, a few bees resting on the sleeve" },
  { id: "potter", name: "Potter", look: "a clay-streaked canvas apron, sleeves rolled up, a small lustre-glazed bowl held in both hands, clay dried on the fingers" },
  { id: "orchard-hand", name: "Orchard Hand", look: "a picking bag slung across the chest full of small tangerines, a straw hat, a pair of pruning shears in a belt loop" },
  { id: "rancher", name: "Rancher", look: "a sweat-stained cattleman's hat, a denim work shirt, a coiled rope over one shoulder, sun creases around the eyes" },
  { id: "trail-runner", name: "Trail Runner", look: "a sweat-soaked cap worn backwards, a thin running vest with a water flask, a number bib pinned crooked" },
  { id: "birdwatcher", name: "Birdwatcher", look: "heavy binoculars on a leather strap, a canvas field hat, a small notebook and pencil, a feather tucked in the hatband" },
  { id: "stargazer", name: "Stargazer", look: "a knitted watch cap, a thick scarf, a folded star chart, a small brass telescope under one arm" },
  { id: "bookseller", name: "Bookseller", look: "half-moon reading glasses on a cord, a cardigan with stretched pockets full of paperbacks, a pencil behind the ear" },
  { id: "tarot-reader", name: "Tarot Reader", look: "a fringed shawl, many rings, a fanned hand of tarot cards held close to the chest, a headscarf" },
  { id: "painter", name: "Painter", look: "a paint-spattered smock, a floppy beret, a brush held between the teeth, a wooden palette on the thumb" },
  { id: "poet", name: "Poet", look: "a rumpled linen jacket, an open notebook, ink-stained fingers, a long knitted scarf wound twice round the neck" },
  { id: "hermit", name: "Hermit", look: "a heavy hooded cloak, a small lantern held up at chest height, a long unkempt beard or long grey hair, a rope belt" },
  { id: "horse-rider", name: "Rider", look: "a riding helmet or dusty cowboy hat, a quilted vest, a riding crop tucked under the arm, a horseshoe charm on a cord" },
  { id: "surfer", name: "Surfer", look: "salt-stiff tangled hair, a faded hooded poncho, a shell necklace, a surfboard fin poking over one shoulder" },
  { id: "tennis-player", name: "Tennis Player", look: "a crisp visor, a cable-knit tennis sweater over the shoulders, a wooden racquet held against the chest" },
  { id: "mail-carrier", name: "Mail Carrier", look: "a postal cap, a heavy leather satchel of letters, a single envelope held out as if delivering it" },
  { id: "night-watch", name: "Night Watch", look: "a peaked watchman's cap, a long coat buttoned to the chin, a hooded lantern, a ring of old keys on the belt" },
  { id: "gardener", name: "Gardener", look: "a battered sun hat, earth-stained gloves, a trowel, a bunch of sage and lavender held like a bouquet" },
  { id: "stonemason", name: "Stonemason", look: "a flat cap, a leather apron, a mallet and chisel, stone dust whitening the eyebrows and shoulders" },
  { id: "cyclist", name: "Cyclist", look: "a cycling cap with the brim flipped up, a wool jersey, a spare tyre looped over one shoulder, goggles pushed up" },
  { id: "dog-walker", name: "Dog Walker", look: "a waxed jacket, several tangled leashes gathered in one fist, a whistle on a lanyard, a scruffy dog peering up at the edge of the frame" },
  { id: "monk", name: "Monk", look: "a plain shaved head or close-cropped hair, a simple wrapped robe, a string of wooden beads held in one hand" },
  { id: "astrologer", name: "Astrologer", look: "a hooded cloak embroidered with moons and stars, a brass astrolabe on a chain, a rolled horoscope" },
  { id: "musician", name: "Musician", look: "a guitar slung across the back, a battered trilby, a harmonica on a neck holder" },
  { id: "photographer", name: "Photographer", look: "an old folding camera held at the chest, a light meter on a cord, a vest full of film canisters" },
  { id: "herbalist", name: "Herbalist", look: "a satchel sprouting dried herbs, small corked bottles on a bandolier, a mortar and pestle in hand" },
  { id: "firewatch", name: "Fire Lookout", look: "a ranger's campaign hat, a pair of field glasses, a two-way radio on the belt, a bandana at the neck" },
  { id: "cook", name: "Cook", look: "a stained apron, a tea towel over the shoulder, a wooden spoon held like a sceptre, sleeves pushed up" },
  { id: "librarian", name: "Librarian", look: "a buttoned cardigan, spectacles pushed up into the hair, a stack of books held against the hip, a date stamp in hand" },
  { id: "wanderer", name: "Wanderer", look: "a threadbare blanket worn as a cloak, bare feet or worn sandals, a tin cup hanging from the belt, a far-off look" },
  { id: "scholar", name: "Scholar", look: "a high-collared old-fashioned coat, a pocket watch chain, a heavy leather-bound book held open" },
];

/** Who the character is. Rolled independently of the archetype. */
export const AGES = ["young", "middle-aged", "old", "very old"] as const;
export const WHO = ["woman", "man", "person"] as const;
export const BUILDS = ["slight", "wiry", "sturdy", "tall and thin", "short and broad", "stooped"] as const;
export const HAIR = [
  "long loose hair", "cropped hair", "a grey braid", "wild curly hair", "a shaved head", "hair tied back",
  "a tidy bun", "untidy hair under the hat", "a thick beard", "a thin moustache",
] as const;
/** Facial hair only for men; everyone else rolls from the rest. */
const HAIR_NO_FACIAL = HAIR.slice(0, -2);
export const POSES = [
  "standing still, looking straight at the viewer", "standing in three-quarter view, eyes lowered",
  "mid-stride, walking", "standing looking up, as if at the bluffs", "paused mid-step, glancing back over the shoulder",
] as const;

/** A small, quiet touch of the player's faction, so portraits read as one side or the other. */
export const FACTION_TOUCH: Record<FactionId, string[]> = {
  order: [
    "a small five-pointed star pin on the collar",
    "a silver star pendant on a chain",
    "a ceremonial sash with a star emblem",
  ],
  pathless: [
    "an acorn on a cord around the neck",
    "an oak leaf tucked into a buttonhole",
    "nothing that marks them as belonging to anything",
  ],
};

export interface Character {
  seed: number;
  archetype: Archetype;
  age: (typeof AGES)[number];
  who: (typeof WHO)[number];
  build: (typeof BUILDS)[number];
  hair: (typeof HAIR)[number];
  pose: (typeof POSES)[number];
  touch: string;
}

/** Roll a character from a seed. Same seed and faction, same character. */
export function rollCharacter(seed: number, faction: FactionId): Character {
  const r = makeRng(seed);
  next(r);
  const archetype = pick(r, ARCHETYPES);
  const age = pick(r, AGES);
  const who = pick(r, WHO);
  return {
    seed,
    archetype,
    age,
    who,
    build: pick(r, BUILDS),
    hair: pick(r, who === "man" ? HAIR : HAIR_NO_FACIAL),
    pose: pick(r, POSES),
    touch: pick(r, FACTION_TOUCH[faction]),
  };
}

export const characterName = (c: Character) => `The ${c.archetype.name}`;

/**
 * The enemy sprite prompt (gojai-art/sprites/raw/gen2.mjs), block for block,
 * so players and enemies read as one cast: same ink, same sprite framing on a
 * green key, keyed out and shown on the same backdrops. Only the tone line
 * changes: enemies are quietly wrong, players are just quietly odd.
 */
export const SPRITE_STYLE =
  "A rough, gritty black ink drawing in the manner of Eddie Campbell's artwork for From Hell: nervous, broken, scratchy dip-pen lines, dry-brush blacks, uneven frantic cross-hatching, visible nib drag, heavy shadow on one side. Off-white paper tones inside the figure. Hand-drawn, not digital, not pixel art, no grey wash, no gradients.";
export const PLAYER_TONE =
  "Tone: restrained and solemn, in the spirit of Gustave Doré: character carried by shadow, stillness, scale and posture, never by expression. No fangs, no snarl, no glowing eyes, nothing cartoonish or heavy-metal. Human, a little weathered, quietly odd rather than wrong. Deadpan.";
export const SPRITE_FRAME =
  "A single full-body game sprite for a card-battle game like Slay the Spire, shown whole from head to feet with nothing cropped. The figure stands on a perfectly flat, solid pure green (#00FF00) chroma-key background that fills the entire frame and every gap, including between the legs and arms: no ground, no cast shadow, no spatter, no border, no paper texture on the background.";
export const SPRITE_INK = "Black ink and off-white paper only, no other colour.";

/** Players face right, across the table from the enemies (who face left). */
export function portraitPrompt(c: Character): string {
  const a = /^[aeiou]/.test(c.age) ? "an" : "a";
  return [
    SPRITE_STYLE,
    PLAYER_TONE,
    SPRITE_FRAME,
    SPRITE_INK,
    `Subject: A player character called ${characterName(c)}, one of the walkers of the Ojai valley: ${a} ${c.age} ${c.who}, ${c.build}, with ${c.hair}, ${c.pose}, ${c.archetype.look}. Also: ${c.touch}. Drawn full length, from the top of the head down to both feet. Shown FACING RIGHT or toward the viewer, turned toward the right edge of the frame.`,
    "No signature, no watermark.",
  ].join("\n\n");
}
