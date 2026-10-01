import { useCallback, useEffect, useRef, useState } from "react";
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { DragRelease } from "./MemoryPager";

export type PreviewOrigin = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function usePreviewMotion({
  origin,
  width,
  height,
  size,
  reduceMotion,
  onClose,
}: {
  origin: PreviewOrigin;
  width: number;
  height: number;
  size: number;
  reduceMotion: boolean;
  onClose: () => void;
}) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const flightX = useSharedValue(0);
  const flying = useSharedValue(false);
  const closing = useRef(false);
  const [isClosing, setIsClosing] = useState(false);
  const offsetX = origin.x + origin.width / 2 - width / 2;
  const offsetY = origin.y + origin.height / 2 - height / 2;
  const tileScale = origin.width / size;
  useEffect(() => {
    progress.set(
      withTiming(1, {
        duration: reduceMotion ? 0 : 270,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [progress, reduceMotion]);
  const dismiss = useCallback(
    (release?: DragRelease) => {
      if (closing.current) return;
      closing.current = true;
      setIsClosing(true);
      const speed = release
        ? Math.hypot(release.velocityX, release.velocityY)
        : 0;
      const duration = reduceMotion
        ? 0
        : Math.max(160, Math.min(240, 240 - speed / 25));
      const timing = { duration, easing: Easing.out(Easing.cubic) };
      if (release) {
        // Continue the release vector, rather than pulling a diagonal drag
        // onto a vertical rail. The pager already supplies its current X.
        flying.set(true);
        const projectedX = release.x + release.velocityX * 0.16;
        const projectedY = release.y + release.velocityY * 0.16;
        const distance = Math.max(1, Math.hypot(projectedX, projectedY));
        const travel = Math.hypot(width, height);
        flightX.set(withTiming((projectedX / distance) * travel, timing));
        dragY.set(
          withTiming(release.y + (projectedY / distance) * travel, timing),
        );
      }
      // This completion owns closing, independently of interrupted drag values.
      progress.set(
        withTiming(0, timing, (done) => {
          if (done) runOnJS(onClose)();
        }),
      );
    },
    [reduceMotion, width, height, flying, flightX, dragY, progress, onClose],
  );
  const backdrop = useAnimatedStyle(() => ({
    opacity:
      progress.get() *
      (1 - Math.min(0.45, Math.hypot(dragX.get(), dragY.get()) / height)),
  }));
  const expansion = useAnimatedStyle(() => {
    const p = progress.get();
    const distance = Math.hypot(dragX.get(), dragY.get());
    const liftScale = 1 - Math.min(0.06, distance / height / 5);
    return {
      opacity: flying.get() ? p : 1,
      transform: [
        { translateX: flying.get() ? flightX.get() : offsetX * (1 - p) },
        {
          translateY: (flying.get() ? 0 : offsetY * (1 - p)) + dragY.get(),
        },
        {
          scale:
            (flying.get() ? 1 : tileScale + (1 - tileScale) * p) * liftScale,
        },
      ],
    };
  });
  const labels = useAnimatedStyle(() => ({
    opacity: Math.max(0, (progress.get() - 0.55) / 0.45),
  }));
  return { dragX, dragY, dismiss, isClosing, backdrop, expansion, labels };
}
