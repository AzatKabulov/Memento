import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BlurView } from "expo-blur";
import {
  Animated,
  BackHandler,
  Easing,
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
const slideDuration = (remaining: number, velocity: number) =>
  Math.max(100, Math.min(320, remaining / Math.max(0.9, Math.abs(velocity))));

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
  const dates = useMemo(() => Object.keys(moments).sort(), [moments]);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, dates.indexOf(initialDate)),
  );
  const [audioDate, setAudioDate] = useState<string | null>(null);
  const [trackX] = useState(
    () => new Animated.Value(-Math.max(0, dates.indexOf(initialDate)) * width),
  );
  const [verticalY] = useState(() => new Animated.Value(0));
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

  useLayoutEffect(() => {
    // Keep the absolute track position: the arriving keyed card stays mounted.
    moving.current = false;
  }, [activeIndex]);

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
      Animated.timing(verticalY, {
        toValue: direction * height || 22,
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
    const targetIndex = activeIndex + direction;
    if (!dates[targetIndex]) {
      Animated.spring(trackX, {
        toValue: -activeIndex * width,
        speed: 22,
        bounciness: 4,
        useNativeDriver: true,
      }).start();
      return;
    }
    if (reduceMotion) {
      trackX.setValue(-targetIndex * width);
      verticalY.setValue(0);
      setAudioDate(null);
      setActiveIndex(targetIndex);
      return;
    }
    moving.current = true;
    // The whole keyed track follows the finger; no image is remounted at handoff.
    Animated.parallel([
      Animated.timing(trackX, {
        toValue: -targetIndex * width,
        duration: slideDuration(width - Math.abs(displacement), velocity),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(verticalY, {
        toValue: 0,
        duration: slideDuration(width - Math.abs(displacement), velocity),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished) {
        moving.current = false;
        return;
      }
      setAudioDate(null);
      setActiveIndex(targetIndex);
    });
  }

  function settle() {
    Animated.parallel([
      Animated.spring(trackX, {
        toValue: -activeIndex * width,
        speed: 22,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.spring(verticalY, {
        toValue: 0,
        speed: 22,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
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
  }, [activeIndex]);

  const date = dates[activeIndex];
  const current = moments[date];
  if (!current) return null;
  const visibleDates = dates.slice(
    Math.max(0, activeIndex - 1),
    activeIndex + 2,
  );

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
        {visibleDates.map((visibleDate) => {
          const slideIndex = dates.indexOf(visibleDate);
          const isActive = slideIndex === activeIndex;
          return (
            <PreviewSlide
              key={visibleDate}
              moment={moments[visibleDate]}
              slideIndex={slideIndex}
              isActive={isActive}
              soundOn={isActive && audioDate === visibleDate}
              onVideoPress={() =>
                setAudioDate((value) =>
                  value === visibleDate ? null : visibleDate,
                )
              }
              mediaSize={mediaSize}
              cardWidth={cardWidth}
              screenWidth={width}
              trackX={trackX}
              verticalY={verticalY}
              cardOpacity={cardOpacity}
              cardScale={cardScale}
              onTouchStart={(event) => {
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
              onStartShouldSetResponderCapture={() =>
                isActive &&
                !moving.current &&
                moments[visibleDate].kind !== "video"
              }
              onMoveShouldSetResponderCapture={(event) =>
                isActive &&
                !moving.current &&
                (Math.abs(event.nativeEvent.pageX - touch.current.x) > 8 ||
                  Math.abs(event.nativeEvent.pageY - touch.current.y) > 8)
              }
              onResponderGrant={() => {
                trackX.stopAnimation();
                verticalY.stopAnimation();
              }}
              onResponderMove={(event) => {
                if (moving.current) return;
                const { pageX, pageY, timestamp } = event.nativeEvent;
                const elapsed = timestamp - touch.current.lastTime;
                if (elapsed >= 12) {
                  touch.current.velocityX =
                    (pageX - touch.current.lastX) / elapsed;
                  touch.current.velocityY =
                    (pageY - touch.current.lastY) / elapsed;
                  touch.current.lastX = pageX;
                  touch.current.lastY = pageY;
                  touch.current.lastTime = timestamp;
                }
                trackX.setValue(-activeIndex * width + pageX - touch.current.x);
                verticalY.setValue(pageY - touch.current.y);
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
              accessibilityLabel={`Preview for ${visibleDate}`}
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
            />
          );
        })}
      </View>
      <Text style={styles.hint}>
        Swipe to browse · Swipe up or down to close
      </Text>
    </View>
  );
}

function PreviewSlide({
  moment,
  slideIndex,
  isActive,
  soundOn,
  onVideoPress,
  mediaSize,
  cardWidth,
  screenWidth,
  trackX,
  verticalY,
  cardOpacity,
  cardScale,
  ...responderProps
}: {
  moment: Moment;
  slideIndex: number;
  isActive: boolean;
  soundOn: boolean;
  onVideoPress: () => void;
  mediaSize: number;
  cardWidth: number;
  screenWidth: number;
  trackX: Animated.Value;
  verticalY: Animated.Value;
  cardOpacity: Animated.Value;
  cardScale: Animated.AnimatedInterpolation<number>;
} & React.ComponentProps<typeof Animated.View>) {
  const styles = useThemedStyles(createStyles);
  const slideX = useMemo(
    () => Animated.add(trackX, slideIndex * screenWidth),
    [trackX, slideIndex, screenWidth],
  );
  return (
    <Animated.View
      {...(isActive ? responderProps : {})}
      pointerEvents={isActive ? "auto" : "none"}
      style={[
        styles.animatedCard,
        {
          width: cardWidth,
          left: (screenWidth - cardWidth) / 2,
          opacity: cardOpacity,
          transform: [
            { translateX: slideX },
            { translateY: verticalY },
            { scale: cardScale },
          ],
        },
      ]}
    >
      <PreviewCard
        moment={moment}
        mediaSize={mediaSize}
        soundOn={soundOn}
        onVideoPress={onVideoPress}
      />
    </Animated.View>
  );
}

const PreviewCard = React.memo(function PreviewCard({
  moment,
  mediaSize,
  soundOn,
  onVideoPress,
}: {
  moment: Moment;
  mediaSize: number;
  soundOn: boolean;
  onVideoPress: () => void;
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
        <MomentMedia
          moment={moment}
          size={mediaSize}
          focused={soundOn}
          onVideoPress={moment.kind === "video" ? onVideoPress : undefined}
        />
      </View>
      <Text style={styles.caption} numberOfLines={2}>
        {moment.caption || "A moment kept."}
      </Text>
    </View>
  );
});

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
