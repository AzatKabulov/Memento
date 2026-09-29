import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { dateFromDiary } from "../lib/dates";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";
import type { Moment } from "../state/DiaryContext";
import { MomentMedia } from "./MomentMedia";

const animationDuration = (velocity: number) =>
  Math.max(115, Math.min(260, 250 - Math.abs(velocity) * 95));

export function HoldPreview({
  initialDate,
  moments,
  width,
  height,
  blurTarget,
  reduceMotion,
  onClose,
}: {
  initialDate: string;
  moments: Record<string, Moment>;
  width: number;
  height: number;
  blurTarget: React.RefObject<View | null>;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [date, setDate] = useState(initialDate);
  const [incomingDate, setIncomingDate] = useState<string | null>(null);
  const dates = useMemo(() => Object.keys(moments).sort(), [moments]);
  const [position] = useState(() => new Animated.ValueXY());
  const [incomingX] = useState(() => new Animated.Value(0));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const moving = useRef(false);
  const touch = useRef({
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const mediaSize = Math.min(width - 100, 280);
  const cardWidth = Math.min(width - 44, 350);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : 170,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: reduceMotion ? 0 : 170,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, cardOpacity, reduceMotion]);

  function dismiss(direction: -1 | 0 | 1, velocity = 0) {
    if (moving.current) return;
    moving.current = true;
    const duration = reduceMotion ? 0 : animationDuration(velocity);
    Animated.parallel([
      Animated.timing(position, {
        toValue: { x: 0, y: direction * height || 22 },
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  }

  function navigate(direction: -1 | 1, displacement: number, velocity: number) {
    if (moving.current) return;
    const index = dates.indexOf(date);
    const target = dates[index + direction];
    if (!target) {
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        speed: 22,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (reduceMotion) {
      position.setValue({ x: 0, y: 0 });
      setDate(target);
      return;
    }
    moving.current = true;
    // Both cards travel the same remaining distance in the same time.
    incomingX.setValue(direction * width + displacement);
    setIncomingDate(target);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(position.x, {
          toValue: -direction * width,
          duration: animationDuration(velocity),
          useNativeDriver: true,
        }),
        Animated.timing(incomingX, {
          toValue: 0,
          duration: animationDuration(velocity),
          useNativeDriver: true,
        }),
      ]).start(() => {
        position.setValue({ x: 0, y: 0 });
        setDate(target);
        setIncomingDate(null);
        moving.current = false;
      });
    });
  }

  function settle() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      speed: 22,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  function finishGesture(dx: number, dy: number, vx: number, vy: number) {
    if (moving.current) return;
    if (
      Math.abs(dy) > Math.abs(dx) &&
      (Math.abs(dy) > 65 || Math.abs(vy) > 0.6)
    )
      dismiss(dy > 0 ? 1 : -1, vy);
    else if (
      Math.abs(dx) > Math.abs(dy) &&
      (Math.abs(dx) > 55 || Math.abs(vx) > 0.6)
    )
      navigate(dx < 0 ? 1 : -1, dx, vx);
    else settle();
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        dismiss(0);
        return true;
      },
    );
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const current = moments[date];
  const incoming = incomingDate ? moments[incomingDate] : null;
  if (!current) return null;

  const cardScale = cardOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  return (
    <View style={styles.overlay}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}
      >
        <BlurView
          blurTarget={blurTarget}
          blurMethod="dimezisBlurViewSdk31Plus"
          intensity={75}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </Animated.View>
      <Pressable
        accessibilityLabel="Close preview"
        accessibilityRole="button"
        style={StyleSheet.absoluteFill}
        onPress={() => dismiss(0)}
      />
      <View
        pointerEvents="box-none"
        style={[styles.stage, { height: mediaSize + 155 }]}
      >
        <Animated.View
          onStartShouldSetResponderCapture={() => true}
          onResponderGrant={(event) => {
            position.stopAnimation();
            const { pageX, pageY, timestamp } = event.nativeEvent;
            touch.current = {
              x: pageX,
              y: pageY,
              lastX: pageX,
              lastY: pageY,
              lastTime: timestamp,
              velocityX: 0,
              velocityY: 0,
            };
          }}
          onResponderMove={(event) => {
            if (moving.current) return;
            const { pageX, pageY, timestamp } = event.nativeEvent;
            const elapsed = timestamp - touch.current.lastTime;
            if (elapsed >= 12) {
              touch.current.velocityX = (pageX - touch.current.lastX) / elapsed;
              touch.current.velocityY = (pageY - touch.current.lastY) / elapsed;
              touch.current.lastX = pageX;
              touch.current.lastY = pageY;
              touch.current.lastTime = timestamp;
            }
            position.setValue({
              x: pageX - touch.current.x,
              y: pageY - touch.current.y,
            });
          }}
          onResponderRelease={(event) => {
            const { pageX, pageY, timestamp } = event.nativeEvent;
            const elapsed = timestamp - touch.current.lastTime;
            const recentlyMoving = elapsed < 100;
            finishGesture(
              pageX - touch.current.x,
              pageY - touch.current.y,
              recentlyMoving ? touch.current.velocityX : 0,
              recentlyMoving ? touch.current.velocityY : 0,
            );
          }}
          onResponderTerminate={settle}
          accessibilityLabel={`Preview for ${date}`}
          accessibilityHint="Swipe left or right for another memory. Swipe up or down to close."
          accessibilityActions={[
            { name: "increment", label: "Next memory" },
            { name: "decrement", label: "Previous memory" },
            { name: "escape", label: "Close preview" },
          ]}
          onAccessibilityAction={(event) => {
            const action = event.nativeEvent.actionName;
            if (action === "escape") dismiss(0);
            if (action === "increment") navigate(1, 0, 0);
            if (action === "decrement") navigate(-1, 0, 0);
          }}
          style={[
            styles.animatedCard,
            {
              width: cardWidth,
              left: (width - cardWidth) / 2,
              opacity: cardOpacity,
              transform: [
                { translateX: position.x },
                { translateY: position.y },
                { scale: cardScale },
              ],
            },
          ]}
        >
          <PreviewCard moment={current} mediaSize={mediaSize} />
        </Animated.View>
        {incoming && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.animatedCard,
              {
                width: cardWidth,
                left: (width - cardWidth) / 2,
                transform: [{ translateX: incomingX }],
              },
            ]}
          >
            <PreviewCard moment={incoming} mediaSize={mediaSize} />
          </Animated.View>
        )}
      </View>
      <Text style={styles.hint}>
        Swipe to browse · Swipe up or down to close
      </Text>
    </View>
  );
}

function PreviewCard({
  moment,
  mediaSize,
}: {
  moment: Moment;
  mediaSize: number;
}) {
  const styles = useThemedStyles(createStyles);
  const when = dateFromDiary(moment.date);
  return (
    <View style={styles.card}>
      <Text style={styles.date}>
        {new Intl.DateTimeFormat("en", {
          month: "long",
          day: "numeric",
        }).format(when)}
      </Text>
      <Text style={styles.weekday}>
        {new Intl.DateTimeFormat("en", { weekday: "long" }).format(when)}
      </Text>
      <View
        style={[
          styles.media,
          {
            width: mediaSize,
            height: mediaSize,
            borderRadius: moment.kind === "video" ? mediaSize / 2 : 22,
          },
        ]}
      >
        <MomentMedia moment={moment} size={mediaSize} focused={false} />
      </View>
      <Text style={styles.caption} numberOfLines={2}>
        {moment.caption || "A moment kept."}
      </Text>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 20,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    tint: { backgroundColor: "rgba(7,5,4,0.65)" },
    stage: {
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
    },
    animatedCard: {
      position: "absolute",
      zIndex: 1,
    },
    card: {
      width: "100%",
      backgroundColor: colors.card,
      borderRadius: 30,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.line,
      shadowColor: "#000",
      shadowOpacity: Platform.OS === "ios" ? 0.25 : 0,
      shadowRadius: 22,
      elevation: 8,
    },
    date: {
      color: colors.ink,
      fontFamily: type.display,
      fontSize: 25,
    },
    weekday: { color: colors.muted, marginTop: 4, fontSize: 12 },
    media: {
      marginTop: 16,
      overflow: "hidden",
      alignSelf: "center",
    },
    caption: {
      marginTop: 14,
      color: colors.ink,
      fontSize: 13,
      lineHeight: 19,
    },
    hint: {
      position: "absolute",
      bottom: 23,
      color: "#F2EADB",
      opacity: 0.72,
      fontSize: 11,
      textAlign: "center",
    },
  });
