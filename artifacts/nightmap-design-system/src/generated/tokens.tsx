/* GENERATED FROM tokens.json -- DO NOT EDIT. Run scripts/build-tokens.mjs. */
// Portable design tokens (colors as hex). Web consumes the theme via
// src/index.css; mobile (Expo) and any other platform import this object so the
// whole product shares one source of truth.
export const tokens = {
  "color": {
    "light": {
      "background": "#FAFAFB",
      "foreground": "#0B0B0F",
      "border": "#E8E8EE",
      "card": "#FFFFFF",
      "cardForeground": "#0B0B0F",
      "popover": "#FFFFFF",
      "popoverForeground": "#0B0B0F",
      "primary": "#FF4E62",
      "primaryForeground": "#0B0B0F",
      "secondary": "#F1F1F4",
      "secondaryForeground": "#1A1A22",
      "muted": "#F1F1F4",
      "mutedForeground": "#6B6B78",
      "accent": "#FF8A3D",
      "accentForeground": "#0B0B0F",
      "destructive": "#C6283D",
      "destructiveForeground": "#FFFFFF",
      "input": "#E8E8EE",
      "ring": "#FF4E62",
      "chart1": "#FF4E62",
      "chart2": "#FF8A3D",
      "chart3": "#1FBF6B",
      "chart4": "#3DA9FF",
      "chart5": "#7A3CFF",
      "sidebar": "#FAFAFB",
      "sidebarForeground": "#0B0B0F",
      "sidebarBorder": "#E8E8EE",
      "sidebarPrimary": "#FF4E62",
      "sidebarPrimaryForeground": "#0B0B0F",
      "sidebarAccent": "#F1F1F4",
      "sidebarAccentForeground": "#1A1A22",
      "sidebarRing": "#FF4E62"
    },
    "dark": {
      "background": "#0B0B0F",
      "foreground": "#F3F4F6",
      "border": "#2A3045",
      "card": "#161923",
      "cardForeground": "#F3F4F6",
      "popover": "#161923",
      "popoverForeground": "#F3F4F6",
      "primary": "#FF4E62",
      "primaryForeground": "#0B0B0F",
      "secondary": "#1C2030",
      "secondaryForeground": "#F3F4F6",
      "muted": "#1C2030",
      "mutedForeground": "#AAB3C5",
      "accent": "#FF8A3D",
      "accentForeground": "#0B0B0F",
      "destructive": "#FF4E62",
      "destructiveForeground": "#0B0B0F",
      "input": "#1C2030",
      "ring": "#FF4E62",
      "chart1": "#FF4E62",
      "chart2": "#FF8A3D",
      "chart3": "#1FBF6B",
      "chart4": "#3DA9FF",
      "chart5": "#7A3CFF",
      "sidebar": "#0B0B0F",
      "sidebarForeground": "#F3F4F6",
      "sidebarBorder": "#2A3045",
      "sidebarPrimary": "#FF4E62",
      "sidebarPrimaryForeground": "#0B0B0F",
      "sidebarAccent": "#1C2030",
      "sidebarAccentForeground": "#F3F4F6",
      "sidebarRing": "#FF4E62"
    }
  },
  "fontFamily": {
    "sans": [
      "Inter",
      "sans-serif"
    ],
    "serif": [
      "Georgia",
      "serif"
    ],
    "mono": [
      "Menlo",
      "monospace"
    ]
  },
  "radius": "1rem",
  "spacing": "0.25rem"
} as const;

export type Tokens = typeof tokens;
export default tokens;
