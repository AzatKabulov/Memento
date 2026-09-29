import { useMemo } from "react";
import { useSettings } from "../settings/SettingsContext";

export const palettes = {
  dark: {
    paper: "#17120F",
    card: "#2A211B",
    ink: "#F2EADB",
    muted: "#AA9B89",
    line: "#3D3028",
    plum: "#F2EADB",
    blush: "#49342B",
    olive: "#E2BF8A",
    white: "#FFFFFF",
    buttonInk: "#211916",
    emptyTile: "#1C1612",
    emptyTileBorder: "#352920",
    todayTile: "#38291F",
    chrome: "#261D18",
    iconSurface: "#2D2421",
    warning: "#EAAFA6",
  },
  light: {
    paper: "#F7F3ED",
    card: "#FFFCF7",
    ink: "#281F1A",
    muted: "#655B53",
    line: "#D8CFC4",
    plum: "#4A3329",
    blush: "#E9D9C9",
    olive: "#865127",
    white: "#FFFFFF",
    buttonInk: "#FFF9F0",
    emptyTile: "#EEE7DD",
    emptyTileBorder: "#D8CABD",
    todayTile: "#F4E3D0",
    chrome: "#FFF9F0",
    iconSurface: "#EFE5DA",
    warning: "#A84131",
  },
} as const;

export type ThemeColors = { [K in keyof typeof palettes.dark]: string };

export function useThemeColors(): ThemeColors {
  const { theme } = useSettings();
  return palettes[theme];
}

const styleCache = new WeakMap<Function, WeakMap<ThemeColors, unknown>>();

export function useThemedStyles<T>(
  createStyles: (colors: ThemeColors) => T,
): T {
  const colors = useThemeColors();
  return useMemo(() => {
    let variants = styleCache.get(createStyles);
    if (!variants) {
      variants = new WeakMap();
      styleCache.set(createStyles, variants);
    }
    let styles = variants.get(colors) as T | undefined;
    if (!styles) {
      styles = createStyles(colors);
      variants.set(colors, styles);
    }
    return styles;
  }, [colors, createStyles]);
}

export const type = {
  display: "InstrumentSerif_400Regular",
  displayItalic: "InstrumentSerif_400Regular_Italic",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemibold: "DMSans_600SemiBold",
};
