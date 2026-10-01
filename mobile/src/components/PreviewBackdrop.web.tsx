import React from "react";
import { StyleSheet, type ViewStyle } from "react-native";
import Animated from "react-native-reanimated";
import { useThemeColors } from "../lib/theme";
import type { PreviewBackdropProps } from "./PreviewBackdrop";

export function PreviewBackdrop({ style }: PreviewBackdropProps) {
  const colors = useThemeColors();
  // Keep the filter on the fading element itself. An opacity wrapper creates
  // a backdrop root that prevents Safari from sampling the calendar behind it.
  const filter: ViewStyle & {
    backdropFilter: string;
    WebkitBackdropFilter: string;
  } = {
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    backgroundColor: `${colors.paper}38`,
  };
  return (
    <Animated.View
      testID="preview-backdrop"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, filter, style]}
    />
  );
}
