/**
 * Seeded RNG (mulberry32). The state is a plain number stored on the game
 * state, so a whole run is reproducible from its seed and serializes as JSON.
 */
export interface Rng {
  s: number;
}

export function makeRng(seed: number): Rng {
  return { s: seed >>> 0 };
}

export function next(r: Rng): number {
  r.s = (r.s + 0x6d2b79f5) >>> 0;
  let t = r.s;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function int(r: Rng, lo: number, hi: number): number {
  return lo + Math.floor(next(r) * (hi - lo + 1));
}

export function pick<T>(r: Rng, xs: readonly T[]): T {
  return xs[Math.floor(next(r) * xs.length)];
}

export function shuffle<T>(r: Rng, xs: T[]): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(next(r) * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}

/** k distinct picks (fewer if xs is short). */
export function sample<T>(r: Rng, xs: readonly T[], k: number): T[] {
  return shuffle(r, xs.slice()).slice(0, k);
}

export function weighted<T extends string>(r: Rng, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let x = next(r) * total;
  for (const [k, w] of entries) {
    x -= w;
    if (x < 0) return k;
  }
  return entries[entries.length - 1][0];
}
