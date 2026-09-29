/**
 * Local time, sunset and full moons for Ojai. Pure functions, no deps, so the
 * server and the phone compute the same windows.
 */
export const TZ = "America/Los_Angeles";
/** Where sun times are computed: the valley floor (downtown). */
export const OJAI_LAT = 34.448;
export const OJAI_LNG = -119.245;

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = Sunday
}

/** The Ojai wall-clock reading of an instant. */
export function localParts(d: Date): LocalParts {
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(d)) p[type] = value;
  return {
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: +p.hour,
    minute: +p.minute,
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** The instant at an Ojai wall-clock time (handles PST/PDT). */
export function zoned(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const want = Date.UTC(year, month - 1, day, hour, minute);
  let t = want;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(t));
    const got = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    if (got === want) break;
    t += want - got;
  }
  return new Date(t);
}

/** A calendar day in Ojai. */
export interface LocalDay {
  year: number;
  month: number;
  day: number;
  weekday: number;
}

/** Every Ojai calendar day touched by [from, to]. */
export function localDays(from: Date, to: Date): LocalDay[] {
  const a = localParts(from);
  const days: LocalDay[] = [];
  // Walk in UTC-noon steps from the first local date; noon avoids DST edges.
  for (let t = Date.UTC(a.year, a.month - 1, a.day, 12); ; t += 864e5) {
    const u = new Date(t);
    const day = { year: u.getUTCFullYear(), month: u.getUTCMonth() + 1, day: u.getUTCDate(), weekday: u.getUTCDay() };
    if (zoned(day.year, day.month, day.day) > to) break;
    days.push(day);
  }
  return days;
}

// ─── Sun (after suncalc / the NOAA sunrise equation) ─────────────────────────
const rad = Math.PI / 180;
const DAY_MS = 864e5;
const J1970 = 2440588;
const J2000 = 2451545;
const OBLIQUITY = rad * 23.4397;
const toJulian = (d: Date) => d.getTime() / DAY_MS - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY_MS);

/** Sunset (sun's upper limb at the horizon) on an Ojai calendar day. */
export function sunset(year: number, month: number, day: number, lat = OJAI_LAT, lng = OJAI_LNG): Date {
  const date = zoned(year, month, day, 12);
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toJulian(date) - J2000;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const h0 = rad * -0.833;
  const w = Math.acos((Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const a = 0.0009 + (w + lw) / (2 * Math.PI) + n;
  return fromJulian(J2000 + a + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L));
}

// ─── Moon ────────────────────────────────────────────────────────────────────
const SYNODIC_DAYS = 29.530588853;
/** A known new moon: 2000-01-06 18:14 UTC. */
const NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14);

/**
 * Full moons between two instants, by mean synodic month. Good to about
 * half a day, which is fine for "the night of the full moon".
 */
export function fullMoons(from: Date, to: Date): Date[] {
  const period = SYNODIC_DAYS * DAY_MS;
  const first = NEW_MOON_2000 + period / 2;
  const out: Date[] = [];
  for (let k = Math.ceil((from.getTime() - first) / period); ; k++) {
    const t = first + k * period;
    if (t > to.getTime()) break;
    out.push(new Date(t));
  }
  return out;
}
