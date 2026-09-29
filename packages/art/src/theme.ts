// The Pathless Land: app design tokens (1910s tarot direction, 2026-09-29).
// Illustrations are rough pen-and-ink with one misregistered spot colour; the
// UI stays out of their way. Ink and paper do almost all the work, and each
// spot ink owns exactly one meaning. See docs/ART_DIRECTION.md.

export const color = {
  // Paper side (map, menus, cards, rewards)
  paper: "#ECE3CF",
  paperDeep: "#E0D3B7", // pressed / secondary panels
  ink: "#2A1E14", // same sepia ink as the illustrations (locked 2026-09-29)
  inkSoft: "#5B5347", // secondary text on paper
  rule: "#B8AA8E", // hairlines on paper

  // Night side (the fight table; sprites are drawn to sit on it)
  night: "#15120E",
  nightRaised: "#241E17",
  onNight: "#EAE0CB",
  onNightSoft: "#A69A84",
  ruleNight: "#3D342A",

  // Spot inks: one meaning each, never decoration.
  blood: "#C8261E", // damage and danger: enemy attacks, HP lost, strike values
  gilt: "#C79A2A", // reward: gold, catches (J/Q/K), rares, perfect fights
  giltText: "#8A6410", // gilt when it must be read as text on paper
  pink: "#E8488C", // Pink Moment: live, time-bound events. Nothing else is pink.
} as const;

export const font = {
  // IM Fell English SC: period display type for names and titles only (min 18px).
  display: '"IM Fell English SC", "IM Fell English", Georgia, serif',
  // Libre Franklin (Franklin Gothic, 1902): every other word and every number.
  ui: '"Libre Franklin", "Franklin Gothic Medium", system-ui, sans-serif',
} as const;

// Type scale (px). Numbers that decide a turn are big and heavy.
export const size = { label: 12, body: 15, name: 20, title: 28, key: 44 } as const;

export const rule = {
  frameOuter: 3, // tarot card / panel outer rule
  frameGap: 3,
  frameInner: 1,
  radius: 2, // corners are square; 2px only to soften on screen
} as const;

/** Spot inks print slightly off-register, like shelf-2.png. Offset in px. */
export const misregister = { x: 2, y: -1 } as const;
