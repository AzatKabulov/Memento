import React, { forwardRef, useImperativeHandle, useLayoutEffect } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  ReduceMotion,
  type SharedValue,
} from "react-native-reanimated";
export type MemoryPagerHandle = {
  step: (direction: -1 | 1) => void;
};
export type DragRelease = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
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
  dragX?: SharedValue<number>;
  onDismiss?: (release: DragRelease) => void;
  testID?: string;
};
// Gesture callbacks read their runtime clock; rendering never reads it.
function gestureTime() {
  "worklet";
  return Date.now();
}
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
      dragX,
      onDismiss,
      testID,
    },
    ref,
  ) {
    const index = Math.max(0, dates.indexOf(date));
    const x = useSharedValue(-index * width);
    const startX = useSharedValue(-index * width);
    const startY = useSharedValue(0);
    const lastMoveAt = useSharedValue(0);
    const busy = useSharedValue(false);
    const freeDrag = !!dragY && !!onDismiss;
    const duration = reduceMotion ? 0 : 210;
    useLayoutEffect(() => {
      // Also handles an external date change or viewport resize before paint.
      x.set(-index * width);
      busy.set(false);
    }, [index, width, x, busy]);
    const select = (target: number) => onChange(dates[target]);
    const finish = (target: number, velocity = 0, velocityY = 0) => {
      "worklet";
      busy.set(true);
      const remaining = Math.abs(-target * width - x.get());
      const ms = reduceMotion
        ? 0
        : Math.max(
            100,
            Math.min(240, remaining / Math.max(1.2, Math.abs(velocity) / 1000)),
          );
      const completed = (done?: boolean) => {
        "worklet";
        if (done) {
          busy.set(false);
          if (target !== index) runOnJS(select)(target);
        }
      };
      const spring = {
        stiffness: 320,
        damping: 28,
        mass: 0.7,
        overshootClamping: true,
        reduceMotion: reduceMotion ? ReduceMotion.Always : ReduceMotion.Never,
      };
      x.set(
        target === index && freeDrag
          ? withSpring(-target * width, { ...spring, velocity }, completed)
          : withTiming(
              -target * width,
              { duration: ms, easing: Easing.out(Easing.cubic) },
              completed,
            ),
      );
      if (dragX) dragX.set(withSpring(0, { ...spring, velocity }));
      if (dragY) dragY.set(withSpring(0, { ...spring, velocity: velocityY }));
    };
    useImperativeHandle(ref, () => ({
      step: (direction) => {
        const target = index + direction;
        if (busy.get() || !dates[target]) return;
        finish(target);
      },
    }));
    let pan = Gesture.Pan().enabled(enabled).maxPointers(1);
    pan = freeDrag
      ? pan.minDistance(4)
      : pan.activeOffsetX([-8, 8]).failOffsetY([-16, 16]);
    pan = pan
      .onStart(() => {
        cancelAnimation(x);
        if (dragY) cancelAnimation(dragY);
        if (dragX) cancelAnimation(dragX);
        busy.set(false);
        startX.set(x.get());
        startY.set(dragY?.get() ?? 0);
        lastMoveAt.set(gestureTime());
      })
      .onUpdate((event) => {
        lastMoveAt.set(gestureTime());
        const dx = Math.max(-width, Math.min(width, event.translationX));
        const edge =
          (index === 0 && dx > 0) || (index === dates.length - 1 && dx < 0);
        x.set(startX.get() + dx * (edge && !freeDrag ? 0.22 : 1));
        // A preview follows both coordinates for the entire held gesture.
        // Navigation versus dismissal is decided only when the finger lifts.
        if (dragY) dragY.set(startY.get() + event.translationY);
        if (dragX) dragX.set(x.get() + index * width);
      })
      .onEnd((event) => {
        // Web can retain the last move's velocity while the finger rests.
        // Release from rest must not turn a small adjustment into navigation.
        const resting = gestureTime() - lastMoveAt.get() > 80;
        const velocityX = resting ? 0 : event.velocityX;
        const velocityY = resting ? 0 : event.velocityY;
        const dx = x.get() + index * width;
        if (onDismiss && dragY) {
          const y = dragY.get();
          if (
            Math.abs(y) > Math.abs(dx) * 0.65 &&
            (Math.abs(y) > 70 ||
              (Math.abs(velocityY) > 700 && Math.abs(y) > 15))
          ) {
            runOnJS(onDismiss)({
              x: dx,
              y,
              velocityX,
              velocityY,
            });
            return;
          }
        }
        const projected = dx + velocityX * 0.12;
        const step =
          Math.abs(projected) > width * 0.2 ? (projected < 0 ? 1 : -1) : 0;
        finish(
          Math.max(0, Math.min(dates.length - 1, index + step)),
          velocityX,
          velocityY,
        );
      })
      .onFinalize((_event, success) => {
        if (!success) {
          x.set(withTiming(-index * width, { duration }));
          if (dragY) dragY.set(withTiming(0, { duration }));
          if (dragX) dragX.set(withTiming(0, { duration }));
        }
      });
    return (
      <GestureDetector gesture={pan} touchAction={freeDrag ? "none" : "pan-y"}>
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
