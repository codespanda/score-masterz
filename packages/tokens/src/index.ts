/** Score Masterz design tokens, shared by the web and mobile apps. Mirrors the design canvas. */
export const colors = {
  ground: "#F3F5F1",
  surface: "#FFFFFF",
  ink: "#0E1A13",
  inkSoft: "#3C4A42",
  muted: "#5A6B61",
  line: "#DCE3DD",
  lineSoft: "#EAEFEB",
  inputBorder: "#C7D2CA",

  pitch: "#0B5D3B",
  pitchTint: "#E7F0EA",
  scoreboard: "#08291C",
  scoreboardRaised: "#0B3D29",
  onScoreboardMuted: "#9FB5A9",
  onScoreboardSoft: "#C9D8CF",

  gold: "#F2B705",
  goldTint: "#FDF3D0",
  goldInk: "#6B4E00",

  live: "#E2531B",
  wicket: "#B42318",
} as const;

/** Preset team colours offered when creating a team. */
export const teamColors = [
  { name: "Green", value: "#1F6F4E" },
  { name: "Gold", value: "#C79300" },
  { name: "Rust", value: "#B4501B" },
  { name: "Blue", value: "#2952A3" },
  { name: "Purple", value: "#6B3FA0" },
  { name: "Black", value: "#1A1F1C" },
] as const;

export const fonts = {
  display: "Barlow Condensed",
  body: "DM Sans",
} as const;

export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Minimum touch target, in px / dp. */
export const touchTarget = 44;
