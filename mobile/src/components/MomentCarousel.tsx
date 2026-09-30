import React, { useMemo, useRef } from "react";
import { Animated, Easing, Platform, Pressable, View } from "react-native";
import { MomentMedia } from "./MomentMedia";
import type { Moment } from "../state/DiaryContext";

type Props = {
  moment: Moment;
  previous?: Moment;
  next?: Moment;
  size: number;
  height: number;
  zoomed: boolean;
  reduceMotion: boolean;
  focused: boolean;
  playing: boolean;
  onToggleZoom: () => void;
  onVideoPress: () => void;
  onNavigate: (moment: Moment) => void;
};

export function MomentCarousel({
  moment,
  previous,
  next,
  size,
  height,
  zoomed,
  reduceMotion,
  focused,
  playing,
  onToggleZoom,
  onVideoPress,
  onNavigate,
}: Props) {
  const [swipeX] = React.useState(() => new Animated.Value(0));
  const gesture = useRef({ x: 0, y: 0, lastX: 0, lastTime: 0 });
  const animating = useRef(false);
  const trackX = useMemo(() => Animated.add(swipeX, -size), [size, swipeX]);
  const slots = [previous, moment, next];

  const settle = (target: -1 | 0 | 1, velocity = 0) => {
    if (animating.current) return;
    const targetMoment = target < 0 ? previous : target > 0 ? next : undefined;
    if (target !== 0 && !targetMoment) target = 0;
    animating.current = true;
    const destination = target * -size;
    const duration = reduceMotion
      ? 0
      : Math.max(125, Math.min(235, 220 - Math.abs(velocity) * 55));
    Animated.timing(swipeX, {
      toValue: destination,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start(({ finished }) => {
      animating.current = false;
      if (!finished) return;
      if (targetMoment) {
        // The neighboring slide is already mounted. Recenter it as the new
        // current slide without reloading the outgoing or incoming image.
        swipeX.setValue(0);
        onNavigate(targetMoment);
      } else {
        swipeX.setValue(0);
      }
    });
  };

  return (
    <View
      style={{ width: size, height, overflow: "hidden" }}
      onTouchStart={(event) => {
        const { pageX, pageY, timestamp } = event.nativeEvent;
        gesture.current = {
          x: pageX,
          y: pageY,
          lastX: pageX,
          lastTime: timestamp,
        };
      }}
      onMoveShouldSetResponderCapture={(event) => {
        if (zoomed || animating.current) return false;
        const dx = event.nativeEvent.pageX - gesture.current.x;
        const dy = event.nativeEvent.pageY - gesture.current.y;
        return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.15;
      }}
      onResponderGrant={() => swipeX.stopAnimation()}
      onResponderMove={(event) => {
        if (animating.current || zoomed) return;
        const { pageX, timestamp } = event.nativeEvent;
        gesture.current.lastX = pageX;
        gesture.current.lastTime = timestamp;
        const dx = pageX - gesture.current.x;
        if ((dx > 0 && !previous) || (dx < 0 && !next)) {
          swipeX.setValue(dx * 0.22);
        } else {
          swipeX.setValue(dx);
        }
      }}
      onResponderRelease={(event) => {
        const dx = event.nativeEvent.pageX - gesture.current.x;
        const elapsed = Math.max(
          1,
          event.nativeEvent.timestamp - gesture.current.lastTime,
        );
        const velocity =
          (event.nativeEvent.pageX - gesture.current.lastX) / elapsed;
        if (Math.abs(dx) > 62 || Math.abs(velocity) > 0.55)
          settle(dx < 0 ? 1 : -1, velocity);
        else settle(0, velocity);
      }}
      onResponderTerminate={() => settle(0)}
      accessibilityActions={[
        { name: "increment", label: "Next moment" },
        { name: "decrement", label: "Previous moment" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") settle(1);
        if (event.nativeEvent.actionName === "decrement") settle(-1);
      }}
    >
      <Animated.View
        style={{
          width: size * 3,
          height,
          flexDirection: "row",
          transform: [{ translateX: trackX }],
          ...(Platform.OS === "web" ? { willChange: "transform" } : {}),
        }}
      >
        {slots.map((item, index) => (
          <View
            key={item?.date ?? `empty-${index}`}
            pointerEvents={index === 1 ? "auto" : "none"}
            style={{
              width: size,
              height,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {item &&
              (item.kind === "photo" ? (
                index === 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      zoomed ? "Zoom out photo" : "Zoom in photo"
                    }
                    onPress={onToggleZoom}
                    style={{
                      width: size,
                      height,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View style={{ transform: [{ scale: zoomed ? 2 : 1 }] }}>
                      <MomentMedia moment={item} size={size} height={height} />
                    </View>
                  </Pressable>
                ) : (
                  <MomentMedia moment={item} size={size} height={height} />
                )
              ) : (
                <MomentMedia
                  moment={item}
                  size={size}
                  focused={index === 1 && focused}
                  playing={index === 1 && playing}
                  onVideoPress={index === 1 ? onVideoPress : undefined}
                />
              ))}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}
