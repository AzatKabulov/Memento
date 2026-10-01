import React, { useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { dateFromDiary } from "../lib/dates";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";
import type { Moment } from "../state/DiaryContext";
import { MomentMedia } from "./MomentMedia";
import { MemoryPager } from "./MemoryPager";
import { PreviewBackdrop } from "./PreviewBackdrop";
import { usePreviewMotion, type PreviewOrigin } from "./usePreviewMotion";
export type { PreviewOrigin } from "./usePreviewMotion";
export function HoldPreview({
  initialDate,
  moments,
  width,
  height,
  origin,
  blurTarget,
  reduceMotion,
  onClose,
}: {
  initialDate: string;
  moments: Record<string, Moment>;
  width: number;
  height: number;
  origin: PreviewOrigin;
  blurTarget: React.RefObject<View | null>;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const dates = useMemo(() => Object.keys(moments).sort(), [moments]);
  const [date, setDate] = useState(initialDate);
  const [audioDate, setAudioDate] = useState<string | null>(null);
  const size = Math.min(width - 64, 330);
  const stageHeight = size + 132;
  const { dragX, dragY, dismiss, isClosing, backdrop, expansion, labels } =
    usePreviewMotion({ origin, width, height, size, reduceMotion, onClose });
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        dismiss();
        return true;
      },
    );
    return () => subscription.remove();
  }, [dismiss]);
  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <PreviewBackdrop blurTarget={blurTarget} style={backdrop} />
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="Close preview"
        onPress={() => dismiss()}
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
          dragX={dragX}
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
                  onPress={() => dismiss()}
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
