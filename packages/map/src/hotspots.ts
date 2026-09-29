import { distanceM, type LngLat } from "./area.ts";

/**
 * Run-node types, Slay the Spire's map laid over Ojai: walking the town is
 * choosing your path. Bosses are not standing hotspots; they only exist
 * inside timed events (events.ts).
 */
export type NodeType = "fight" | "elite" | "rest" | "shop" | "mystery";

export interface Hotspot {
  id: string;
  /** Real-world name, for us. Players may see `gameName` instead. */
  name: string;
  /** In-game name when the real one can't be used (real businesses). */
  gameName?: string;
  node: NodeType;
  /** Where the spot sits: a public, legal place to stand. */
  at: LngLat;
  /** How close a player must be to play the spot, in metres. */
  radiusM: number;
  /** One line on why it's here. */
  note: string;
  /** Unchecked facts, to confirm on the ground before launch. */
  verify?: string;
}

// Coordinates are from Overture Maps places and road/trail geometry (see
// tools/map), nudged onto the public side of the property where noted.
export const HOTSPOTS: Hotspot[] = [
  {
    id: "libbey-park",
    name: "Libbey Park",
    node: "fight",
    at: [-119.24533, 34.44707],
    radiusM: 70,
    note: "Central, walkable, busy. Edward Libbey, the glass magnate who remade downtown, is a lore figure.",
  },
  {
    id: "arcade",
    name: "The Ojai Arcade",
    node: "shop",
    at: [-119.24461, 34.44811],
    radiusM: 50,
    note: "Libbey's Mission Revival arcade: the company-town shop.",
  },
  {
    id: "barts-books",
    name: "Bart's Books",
    node: "mystery",
    at: [-119.24985, 34.4486],
    radiusM: 40,
    note: "Outdoor bookshop with honor-system shelves.",
    verify: "Real business: needs a parody name or their OK.",
  },
  {
    id: "post-office-tower",
    name: "Post Office Tower",
    node: "elite",
    at: [-119.24577, 34.44753],
    radiusM: 40,
    note: "Downtown landmark on the Arcade.",
    verify: "Sits ~35 m from the Playhouse spot; fine, but the two ranges overlap.",
  },
  {
    id: "valley-museum",
    name: "Ojai Valley Museum",
    node: "mystery",
    at: [-119.2479, 34.44781],
    radiusM: 40,
    note: "Local history; lore drops.",
  },
  {
    id: "krotona",
    name: "Krotona Institute of Theosophy",
    node: "rest",
    at: [-119.26973, 34.4376],
    radiusM: 50,
    note: "Theosophical HQ since 1924. Placed at the public library/bookshop entrance, not the grounds.",
    verify: "Public access and hours.",
  },
  {
    id: "meditation-mount",
    name: "Meditation Mount",
    node: "rest",
    at: [-119.16569, 34.45084],
    radiusM: 80,
    note: "Public meditation garden with a Pink Moment view, up Reeves Rd east of town.",
    verify: "Hours; outside the town line, so the play area stretches to cover it.",
  },
  {
    id: "shelf-road",
    name: "Shelf Road trailhead (Signal St)",
    node: "elite",
    at: [-119.24586, 34.46221],
    radiusM: 60,
    note: "The Pink Moment trail. West end, at the top of Signal St, off the roadway.",
  },
  {
    id: "trail-downtown",
    name: "Ojai Valley Trail at Fox St",
    node: "fight",
    at: [-119.24127, 34.44523],
    radiusM: 50,
    note: "Downtown end of the trail. The trail is a natural path of consecutive fights.",
  },
  {
    id: "trail-mira-monte",
    name: "Ojai Valley Trail at Mira Monte",
    node: "fight",
    at: [-119.27472, 34.43243],
    radiusM: 50,
    note: "Where the trail passes below Meiners Oaks.",
  },
  {
    id: "oak-grove",
    name: "The Oak Grove (Besant Rd)",
    node: "mystery",
    at: [-119.27765, 34.44318],
    radiusM: 50,
    note: "Where Krishnamurti gave his talks. Placed on Besant Rd by the Krishnamurti Foundation, outside the school campus.",
    verify: "Oak Grove School is next door; confirm the spot is public and off campus.",
  },
  {
    id: "el-roblar",
    name: "Meiners Oaks strip (El Roblar Dr)",
    node: "shop",
    at: [-119.2776, 34.4488],
    radiusM: 80,
    note: "The other town's main street: cafés, the nursery, Farmer and the Cook.",
  },
  {
    id: "soule-park",
    name: "Soule Park",
    node: "fight",
    at: [-119.22677, 34.44204],
    radiusM: 90,
    note: "Big county park at the east end.",
  },
  {
    id: "sarzotti-park",
    name: "Sarzotti Park",
    node: "fight",
    at: [-119.23615, 34.45175],
    radiusM: 70,
    note: "Public park just north-east of downtown.",
  },
  {
    id: "playhouse",
    name: "Ojai Playhouse",
    node: "mystery",
    at: [-119.24614, 34.44764],
    radiusM: 30,
    note: "Old cinema.",
    verify: "Real business: parody-name it.",
  },
];

export const hotspotById = (id: string) => HOTSPOTS.find((h) => h.id === id);

/** Hotspots whose play radius the point is inside, nearest first. */
export function hotspotsInRange(p: LngLat): Hotspot[] {
  return HOTSPOTS.map((h) => ({ h, d: distanceM(p, h.at) }))
    .filter(({ h, d }) => d <= h.radiusM)
    .sort((a, b) => a.d - b.d)
    .map(({ h }) => h);
}
