import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { focalAfterDrag, focalPoint } from "../lib/photoFrame";
import type { Moment } from "../state/DiaryContext";

export function PhotoFramer({
  moment,
  size,
  onChange,
}: {
  moment: Moment;
  size: number;
  onChange: (x: number, y: number) => void;
}) {
  const focal = focalPoint(moment);
  const startRef = useRef(focal);
  const dimensions = useRef({ width: 0, height: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const [positionX] = useState(() => new Animated.Value(0));
  const [positionY] = useState(() => new Animated.Value(0));
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const photoSource = useMemo(
    () => moment.sample ?? { uri: moment.uri },
    [moment.sample, moment.uri],
  );
  const scale =
    imageSize.width && imageSize.height
      ? Math.max(size / imageSize.width, size / imageSize.height)
      : 0;
  const renderWidth = imageSize.width * scale;
  const renderHeight = imageSize.height * scale;
  const overflowX = Math.max(0, renderWidth - size);
  const overflowY = Math.max(0, renderHeight - size);

  useEffect(() => {
    positionX.setValue((-overflowX * focal.x) / 100);
    positionY.setValue((-overflowY * focal.y) / 100);
  }, [focal.x, focal.y, overflowX, overflowY, positionX, positionY]);

  return (
    <View
      onStartShouldSetResponderCapture={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        startRef.current = focal;
        touchStart.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        };
      }}
      onResponderMove={(event) => {
        if (!scale) return;
        const dx = event.nativeEvent.pageX - touchStart.current.x;
        const dy = event.nativeEvent.pageY - touchStart.current.y;
        positionX.setValue(
          Math.max(
            -overflowX,
            Math.min(0, (-overflowX * startRef.current.x) / 100 + dx),
          ),
        );
        positionY.setValue(
          Math.max(
            -overflowY,
            Math.min(0, (-overflowY * startRef.current.y) / 100 + dy),
          ),
        );
      }}
      onResponderRelease={(event) => {
        const next = focalAfterDrag(
          startRef.current,
          event.nativeEvent.pageX - touchStart.current.x,
          event.nativeEvent.pageY - touchStart.current.y,
          size,
          dimensions.current.width,
          dimensions.current.height,
        );
        if (next.x !== startRef.current.x || next.y !== startRef.current.y)
          onChange(next.x, next.y);
      }}
      accessibilityLabel="Drag photo to choose its calendar crop"
      style={[styles.frame, { width: size, height: size }]}
    >
      {!scale && (
        <View style={styles.loading} pointerEvents="none">
          {!failed && <ActivityIndicator color="#E2BF8A" />}
          <Text style={styles.loadingText}>
            {failed ? "This photo could not be opened" : "Preparing photo…"}
          </Text>
        </View>
      )}
      {scale > 0 && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: renderWidth,
            height: renderHeight,
            transform: [{ translateX: positionX }, { translateY: positionY }],
          }}
        >
          <Image
            source={photoSource}
            contentFit="fill"
            cachePolicy="memory-disk"
            priority="high"
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
      <Image
        source={photoSource}
        cachePolicy="memory-disk"
        priority="high"
        onLoad={({ source }) => {
          dimensions.current = { width: source.width, height: source.height };
          setImageSize({ width: source.width, height: source.height });
        }}
        onError={() => setFailed(true)}
        style={styles.measureImage}
      />
      <View pointerEvents="none" style={styles.guideVertical} />
      <View pointerEvents="none" style={styles.guideHorizontal} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "#2A211B",
  },
  measureImage: { position: "absolute", width: 1, height: 1, opacity: 0 },
  loading: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { color: "#DCC9B5", fontSize: 12 },
  guideVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  guideHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.32)",
  },
});
