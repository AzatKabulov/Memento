import React, { forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
export type MemoryPagerHandle = {
  step: (direction: -1 | 1) => void;
};
type Props = {
  dates: string[];
  date: string;
  width: number;
  height: number;
  reduceMotion: boolean;
  enabled?: boolean;
  onChange: (date: string) => void;
  renderPage: (date: string, active: boolean) => React.ReactNode;
  dragY?: SharedValue<number>;
  onDismiss?: (direction: -1 | 1, velocity: number) => void;
  testID?: string;
};
// Absolute positions keep an incoming page mounted at exactly the same place
// after selection changes. There is no reset-to-center frame or image handoff.
export const MemoryPager = forwardRef<MemoryPagerHandle, Props>(
  function MemoryPager(
    {
      dates,
      date,
      width,
      height,
      reduceMotion,
      enabled = true,
      onChange,
      renderPage,
      dragY,
      onDismiss,
      testID,
    },
    ref,
  ) {
    const index = Math.max(0, dates.indexOf(date));
    const x = useSharedValue(-index * width);
    const startX = useSharedValue(-index * width);
    const axis = useSharedValue(0);
    const busy = useSharedValue(false);
    const vertical = !!dragY && !!onDismiss;
    const duration = reduceMotion ? 0 : 210;
    useLayoutEffect(() => {
      // Also handles an external date change or viewport resize before paint.
      x.set(-index * width);
      busy.set(false);
    }, [index, width, x, busy]);
    const select = (target: number) => onChange(dates[target]);
    const finish = (target: number, velocity = 0) => {
      "worklet";
      busy.set(true);
      const remaining = Math.abs(-target * width - x.get());
      const ms = reduceMotion
        ? 0
        : Math.max(
            100,
            Math.min(240, remaining / Math.max(1.2, Math.abs(velocity) / 1000)),
          );
      x.set(
        withTiming(
          -target * width,
          { duration: ms, easing: Easing.out(Easing.cubic) },
          (done) => {
            if (done) {
              busy.set(false);
              if (target !== index) runOnJS(select)(target);
            }
          },
        ),
      );
      if (dragY) dragY.set(withTiming(0, { duration: ms }));
    };
    useImperativeHandle(ref, () => ({
      step: (direction) => {
        const target = index + direction;
        if (busy.get() || !dates[target]) return;
        finish(target);
      },
    }));
    let pan = Gesture.Pan().enabled(enabled).maxPointers(1);
    pan = vertical
      ? pan.minDistance(4)
      : pan.activeOffsetX([-8, 8]).failOffsetY([-16, 16]);
    pan = pan
      .onStart(() => {
        cancelAnimation(x);
        if (dragY) cancelAnimation(dragY);
        busy.set(false);
        startX.set(x.get());
        axis.set(0);
      })
      .onUpdate((event) => {
        // Web recognizers send a zero-translation activation event. Wait for
        // real movement before locking an axis, or vertical drags become pans.
        if (
          !axis.get() &&
          Math.max(Math.abs(event.translationX), Math.abs(event.translationY)) <
            4
        )
          return;
        if (!axis.get())
          axis.set(
            vertical &&
              Math.abs(event.translationY) > Math.abs(event.translationX)
              ? 2
              : 1,
          );
        if (axis.get() === 2 && dragY) {
          // Assign position directly, including when the finger reverses direction.
          dragY.set(event.translationY);
        } else {
          const dx = Math.max(-width, Math.min(width, event.translationX));
          const edge =
            (index === 0 && dx > 0) || (index === dates.length - 1 && dx < 0);
          x.set(startX.get() + dx * (edge ? 0.22 : 1));
        }
      })
      .onEnd((event) => {
        if (axis.get() === 2 && onDismiss && dragY) {
          const y = event.translationY;
          if (
            Math.abs(y) > 70 ||
            (Math.abs(event.velocityY) > 700 && Math.abs(y) > 15)
          ) {
            runOnJS(onDismiss)(y > 0 ? 1 : -1, event.velocityY);
          } else dragY.set(withTiming(0, { duration }));
          return;
        }
        const dx = x.get() + index * width;
        const projected = dx + event.velocityX * 0.12;
        const step =
          Math.abs(projected) > width * 0.2 ? (projected < 0 ? 1 : -1) : 0;
        finish(
          Math.max(0, Math.min(dates.length - 1, index + step)),
          event.velocityX,
        );
      })
      .onFinalize((_event, success) => {
        if (!success) {
          x.set(withTiming(-index * width, { duration }));
          if (dragY) dragY.set(withTiming(0, { duration }));
        }
      });
    return (
      <GestureDetector gesture={pan} touchAction={vertical ? "none" : "pan-y"}>
        <View
          testID={testID}
          collapsable={false}
          style={{ width, height, overflow: "hidden" }}
          accessibilityActions={[
            { name: "increment", label: "Next moment" },
            { name: "decrement", label: "Previous moment" },
          ]}
          onAccessibilityAction={(event) => {
            const step = event.nativeEvent.actionName === "increment" ? 1 : -1;
            const target = index + step;
            if (dates[target]) finish(target);
          }}
        >
          {dates.slice(Math.max(0, index - 1), index + 2).map((key) => (
            <Page
              key={key}
              x={x}
              index={dates.indexOf(key)}
              width={width}
              height={height}
              active={key === date}
            >
              {renderPage(key, key === date)}
            </Page>
          ))}
        </View>
      </GestureDetector>
    );
  },
);
function Page({
  x,
  index,
  width,
  height,
  active,
  children,
}: {
  x: SharedValue<number>;
  index: number;
  width: number;
  height: number;
  active: boolean;
  children: React.ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() + index * width }],
  }));
  return (
    <Animated.View
      pointerEvents={active ? "auto" : "none"}
      style={[
        {
          position: "absolute",
          width,
          height,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}
