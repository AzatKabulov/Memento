import React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ReduceMotion,
} from "react-native-reanimated";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function SoftButton({
  style,
  children,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));
  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ disabled: props.disabled ?? false }}
      onPressIn={(event) => {
        scale.set(
          withTiming(0.97, {
            duration: 100,
            reduceMotion: ReduceMotion.System,
          }),
        );
        props.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(
          withTiming(1, {
            duration: 170,
            reduceMotion: ReduceMotion.System,
          }),
        );
        props.onPressOut?.(event);
      }}
      style={[style, animated, props.disabled && { opacity: 0.65 }]}
    >
      {children}
    </AnimatedPressable>
  );
}
