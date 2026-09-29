import { localDays, localParts, sunset, zoned, fullMoons } from "./time.ts";
import type { LngLat } from "./area.ts";

/** "HH:MM" Ojai wall-clock time. */
type Clock = `${number}:${number}`;

export type TimeRule =
  /** Daily, relative to sunset. */
  | { kind: "sunset"; startMin: number; endMin: number }
  /** Given weekdays (0 = Sunday), local clock times. */
  | { kind: "weekly"; days: number[]; start: Clock; end: Clock }
  /** The evening of each full moon. */
  | { kind: "fullMoon"; start: Clock; end: Clock }
  /** Fixed calendar dates each year ("MM-DD"). */
  | { kind: "annual"; dates: `${number}-${number}`[]; start: Clock; end: Clock }
  /** Real but not yet pinned down; listed so nothing is forgotten. */
  | { kind: "tbd"; when: string };

export type EventKind = "boss" | "market" | "raid" | "rare";

export interface TimedEvent {
  id: string;
  name: string;
  kind: EventKind;
  rule: TimeRule;
  /** Hotspot ids and/or extra venues where it happens. */
  hotspots: string[];
  venues?: { name: string; at: LngLat; verify?: string }[];
  note: string;
  verify?: string;
}

// From /mnt/project-files/gojai-plan/events-draft.md. The school-pickup
// event is left out: nothing is placed near schools.
export const EVENTS: TimedEvent[] = [
  {
    id: "pink-moment",
    name: "Pink Moment",
    kind: "boss",
    rule: { kind: "sunset", startMin: -15, endMin: 20 },
    hotspots: ["shelf-road", "meditation-mount"],
    note: "The Topatopa bluffs glow pink after sunset. Daily boss window; magenta cards only drop here.",
  },
  {
    id: "sunday-market",
    name: "Sunday Farmers Market",
    kind: "market",
    rule: { kind: "weekly", days: [0], start: "09:00", end: "13:00" },
    hotspots: ["arcade"],
    venues: [{ name: "Ojai Certified Farmers Market, 300 E Matilija St", at: [-119.24439, 34.449] }],
    note: "Behind the Arcade. Rare shop stock and a co-op boss.",
    verify: "Hours.",
  },
  {
    id: "thursday-market",
    name: "Thursday People's Market",
    kind: "market",
    rule: { kind: "weekly", days: [4], start: "15:00", end: "19:00" },
    hotspots: [],
    venues: [
      {
        name: "Ojai Community Farmers' Market (candidate)",
        at: [-119.2428, 34.4489],
        verify: "Open data puts it at 414 E Ojai Ave, which is a school site. Sam to confirm the real place.",
      },
    ],
    note: "The counter-market to Sunday's: the anti-establishment shop.",
    verify: "Day, hours and place all need Sam's confirmation.",
  },
  {
    id: "full-moon",
    name: "Full Moon",
    kind: "boss",
    rule: { kind: "fullMoon", start: "19:00", end: "23:00" },
    hotspots: ["meditation-mount", "oak-grove"],
    note: "Theosophical lore boss: the Masters, the astral plane.",
  },
  {
    id: "season-turn",
    name: "Solstice / Equinox",
    kind: "rare",
    rule: { kind: "annual", dates: ["03-20", "06-21", "09-22", "12-21"], start: "06:00", end: "22:00" },
    hotspots: ["krotona", "meditation-mount"],
    note: "Season change at the rest sites; the map reshuffles. Dates are the usual ones, off by a day some years.",
  },
  {
    id: "trail-rush",
    name: "Morning Trail Rush",
    kind: "rare",
    rule: { kind: "weekly", days: [0, 6], start: "07:00", end: "09:00" },
    hotspots: ["trail-downtown", "trail-mira-monte"],
    note: "E-bike Teen swarm along the Ojai Valley Trail. Fast fights.",
  },
  {
    id: "pathless-day",
    name: "The Pathless Land",
    kind: "raid",
    rule: { kind: "annual", dates: ["08-03"], start: "10:00", end: "18:00" },
    hotspots: ["oak-grove"],
    note: "Anniversary of Krishnamurti's 1929 speech. Factions dissolve for a day.",
  },
  {
    id: "ojai-day",
    name: "Ojai Day",
    kind: "raid",
    rule: { kind: "tbd", when: "Annual, October" },
    hotspots: ["libbey-park", "arcade"],
    note: "Town-wide raid, all factions.",
    verify: "Date.",
  },
  {
    id: "music-festival",
    name: "Ojai Music Festival",
    kind: "boss",
    rule: { kind: "tbd", when: "Annual, June" },
    hotspots: ["libbey-park"],
    note: "A boss runs the whole festival at Libbey Bowl.",
    verify: "Dates.",
  },
  {
    id: "lavender-festival",
    name: "Lavender Festival",
    kind: "rare",
    rule: { kind: "tbd", when: "Annual, June" },
    hotspots: ["libbey-park"],
    note: "Seasonal card set.",
    verify: "Dates and place.",
  },
];

export interface EventWindow {
  event: TimedEvent;
  start: Date;
  end: Date;
}

const clock = (c: Clock) => c.split(":").map(Number) as [number, number];

/** Every window of every scheduled event that overlaps [from, to], by start. */
export function windowsBetween(from: Date, to: Date, events: TimedEvent[] = EVENTS): EventWindow[] {
  const out: EventWindow[] = [];
  const days = localDays(new Date(from.getTime() - 864e5), to);
  const at = (d: { year: number; month: number; day: number }, c: Clock) => zoned(d.year, d.month, d.day, ...clock(c));
  for (const event of events) {
    const r = event.rule;
    const push = (start: Date, end: Date) => {
      if (end > from && start < to) out.push({ event, start, end });
    };
    if (r.kind === "sunset") {
      for (const d of days) {
        const s = sunset(d.year, d.month, d.day).getTime();
        push(new Date(s + r.startMin * 6e4), new Date(s + r.endMin * 6e4));
      }
    } else if (r.kind === "weekly") {
      for (const d of days) if (r.days.includes(d.weekday)) push(at(d, r.start), at(d, r.end));
    } else if (r.kind === "annual") {
      for (const d of days) {
        const md = `${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
        if ((r.dates as string[]).includes(md)) push(at(d, r.start), at(d, r.end));
      }
    } else if (r.kind === "fullMoon") {
      for (const m of fullMoons(new Date(from.getTime() - 2 * 864e5), new Date(to.getTime() + 864e5))) {
        const d = localParts(m);
        push(at(d, r.start), at(d, r.end));
      }
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

/** Events open right now. */
export const activeEvents = (now: Date) => windowsBetween(now, new Date(now.getTime() + 1));

/** Windows open now or starting within `days`. */
export function upcomingEvents(now: Date, days = 14): EventWindow[] {
  return windowsBetween(now, new Date(now.getTime() + days * 864e5));
}
