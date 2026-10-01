import React from "react";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSettings } from "../settings/SettingsContext";

export type PreviewBackdropProps = {
  blurTarget: React.RefObject<View | null>;
  style: React.ComponentProps<typeof Animated.View>["style"];
};

export function PreviewBackdrop({ blurTarget, style }: PreviewBackdropProps) {
  const { theme } = useSettings();
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, style]}
    >
      <BlurView
        testID="preview-backdrop"
        blurTarget={blurTarget}
        intensity={28}
        tint={theme === "dark" ? "dark" : "light"}
        blurMethod="dimezisBlurViewSdk31Plus"
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
