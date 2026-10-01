import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { dateFromDiary } from "../lib/dates";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";
import type { Moment } from "../state/DiaryContext";
import { MomentMedia } from "./MomentMedia";
import { MemoryPager } from "./MemoryPager";
export type PreviewOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};
export function HoldPreview({
  initialDate,
  moments,
  width,
  height,
  origin,
  reduceMotion,
  onClose,
}: {
  initialDate: string;
  moments: Record<string, Moment>;
  width: number;
  height: number;
  origin: PreviewOrigin;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const dates = useMemo(() => Object.keys(moments).sort(), [moments]);
  const [date, setDate] = useState(initialDate);
  const [audioDate, setAudioDate] = useState<string | null>(null);
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const dragY = useSharedValue(0);
  const closing = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const size = Math.min(width - 64, 330);
  const stageHeight = size + 132;
  // The media is centered between its 66px header and footer.
  const offsetX = origin.x + origin.width / 2 - width / 2;
  const offsetY = origin.y + origin.height / 2 - height / 2;
  const scale = origin.width / size;
  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: reduceMotion ? 0 : 250,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [progress, reduceMotion]);
  const dismiss = useCallback(
    (direction: -1 | 0 | 1, velocity = 0) => {
      if (closing.current) return;
      closing.current = true;
      setIsClosing(true);
      setAudioDate(null);
      const duration = reduceMotion
        ? 0
        : Math.max(130, Math.min(230, 230 - Math.abs(velocity) / 20));
      if (direction) {
        dragY.set(
          withTiming(direction * height, {
            duration,
            easing: Easing.out(Easing.cubic),
          }),
        );
      }
      progress.set(
        withTiming(
          0,
          { duration, easing: Easing.inOut(Easing.cubic) },
          (done) => {
            if (done) runOnJS(onClose)();
          },
        ),
      );
    },
    [reduceMotion, height, dragY, progress, onClose],
  );
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        dismiss(0);
        return true;
      },
    );
    return () => subscription.remove();
  }, [dismiss]);
  const backdrop = useAnimatedStyle(() => ({
    opacity:
      progress.get() * (1 - Math.min(0.55, Math.abs(dragY.get()) / height)),
  }));
  const expansion = useAnimatedStyle(() => ({
    transform: [
      { translateX: offsetX * (1 - progress.get()) },
      { translateY: offsetY * (1 - progress.get()) + dragY.get() },
      { scale: scale + (1 - scale) * progress.get() },
    ],
  }));
  const labels = useAnimatedStyle(() => ({
    opacity: Math.max(0, (progress.get() - 0.55) / 0.45),
  }));
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.tint, backdrop]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Close preview"
        onPress={() => dismiss(0)}
      />
      <Animated.View style={[{ width, height: stageHeight }, expansion]}>
        <MemoryPager
          testID="preview-pager"
          enabled={!isClosing}
          dates={dates}
          date={date}
          width={width}
          height={stageHeight}
          reduceMotion={reduceMotion}
          dragY={dragY}
          onDismiss={dismiss}
          onChange={(key) => {
            setDate(key);
            setAudioDate(null);
          }}
          renderPage={(key, active) => {
            const moment = moments[key];
            const when = dateFromDiary(key);
            return (
              <View
                style={{ width, height: stageHeight, alignItems: "center" }}
              >
                <Pressable
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel="Close preview"
                  onPress={() => dismiss(0)}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[styles.label, labels]}
                >
                  <Text style={styles.date}>
                    {new Intl.DateTimeFormat("en", {
                      month: "long",
                      day: "numeric",
                    }).format(when)}
                  </Text>
                  <Text style={styles.weekday}>
                    {new Intl.DateTimeFormat("en", { weekday: "long" }).format(
                      when,
                    )}
                  </Text>
                </Animated.View>
                <Pressable
                  onPress={() => {}}
                  style={{
                    width: size,
                    height: size,
                    borderRadius: moment.kind === "video" ? size / 2 : 28,
                    overflow: "hidden",
                  }}
                >
                  <MomentMedia
                    moment={moment}
                    size={size}
                    focused={active && audioDate === key}
                    playing={active}
                    onVideoPress={
                      moment.kind === "video"
                        ? () =>
                            setAudioDate((value) =>
                              value === key ? null : key,
                            )
                        : undefined
                    }
                  />
                </Pressable>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.footer, labels]}
                >
                  <Text style={styles.caption} numberOfLines={2}>
                    {moment.caption}
                  </Text>
                </Animated.View>
              </View>
            );
          }}
        />
      </Animated.View>
    </View>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 20,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    tint: { backgroundColor: colors.paper },
    label: { height: 66, alignItems: "center", justifyContent: "center" },
    date: { color: colors.ink, fontFamily: type.display, fontSize: 28 },
    weekday: { color: colors.muted, fontSize: 12, marginTop: 3 },
    footer: { height: 66, paddingHorizontal: 40, paddingTop: 14 },
    caption: {
      color: colors.ink,
      textAlign: "center",
      fontSize: 13,
      lineHeight: 20,
    },
  });
