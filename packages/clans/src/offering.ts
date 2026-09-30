import { CLAN, type ClanConfig } from "./config.ts";

/**
 * Death as offering. Every run ends in defeat, and that is the moment it
 * turns into clan value: floors cleared, elites and bosses beaten, paid out
 * to the neighborhoods where those floors were walked. A great run helps
 * your faction; so does a long walk.
 */
export interface Floor {
  /** Neighborhood id where the floor was played. */
  ground: string;
  kind: "fight" | "elite" | "boss" | "rest" | "shop" | "mystery";
  /** False for the floor you died on. */
  cleared: boolean;
}

export function offering(floors: readonly Floor[], cfg: ClanConfig = CLAN): { ground: string; amount: number }[] {
  const by = new Map<string, number>();
  const { perFloor, perElite, perBoss } = cfg.offering;
  for (const f of floors) {
    if (!f.cleared) continue;
    const v = perFloor + (f.kind === "elite" ? perElite : f.kind === "boss" ? perBoss : 0);
    by.set(f.ground, (by.get(f.ground) ?? 0) + v);
  }
  return [...by].map(([ground, amount]) => ({ ground, amount }));
}
