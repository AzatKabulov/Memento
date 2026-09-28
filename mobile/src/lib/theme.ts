import { useMemo } from "react";
import { useSettings } from "../settings/SettingsContext";

export const palettes = {
  dark: {
    paper: "#100D0C",
    card: "#201A18",
    ink: "#F6EDE0",
    muted: "#A89A8D",
    line: "#392F29",
    plum: "#F6EDE0",
    blush: "#49342B",
    olive: "#D5A063",
    white: "#FFFFFF",
    buttonInk: "#211916",
    emptyTile: "#201A18",
    emptyTileBorder: "#3B312C",
    todayTile: "#38291F",
    chrome: "#2A201B",
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
  display: "Georgia",
};
