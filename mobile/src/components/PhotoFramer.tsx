import React, { useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {
  focalAfterDrag,
  focalPoint,
  photoContentPosition,
} from "../lib/photoFrame";
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
  const focalRef = useRef(focal);
  const startRef = useRef(focal);
  const dimensions = useRef({ width: 0, height: 0 });
  const touchStart = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const photoSource = useMemo(
    () => moment.sample ?? { uri: moment.uri },
    [moment.sample, moment.uri],
  );
  useEffect(() => {
    focalRef.current = focal;
  }, [focal]);

  return (
    <View
      onStartShouldSetResponderCapture={() => true}
      onResponderGrant={(event) => {
        startRef.current = focalRef.current;
        touchStart.current = {
          x: event.nativeEvent.pageX,
          y: event.nativeEvent.pageY,
        };
      }}
      onResponderMove={(event) => {
        const next = focalAfterDrag(
          startRef.current,
          event.nativeEvent.pageX - touchStart.current.x,
          event.nativeEvent.pageY - touchStart.current.y,
          size,
          dimensions.current.width,
          dimensions.current.height,
        );
        if (next.x !== focalRef.current.x || next.y !== focalRef.current.y) {
          focalRef.current = next;
          onChange(next.x, next.y);
        }
      }}
      accessibilityLabel="Drag photo to choose its calendar crop"
      style={[styles.frame, { width: size, height: size }]}
    >
      {!loaded && (
        <View style={styles.loading} pointerEvents="none">
          {!failed && <ActivityIndicator color="#E2BF8A" />}
          <Text style={styles.loadingText}>
            {failed ? "This photo could not be opened" : "Preparing photo…"}
          </Text>
        </View>
      )}
      <Image
        source={photoSource}
        contentFit="cover"
        contentPosition={photoContentPosition(moment)}
        cachePolicy="memory-disk"
        priority="high"
        transition={120}
        onLoad={({ source }) => {
          dimensions.current = { width: source.width, height: source.height };
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
        style={StyleSheet.absoluteFill}
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
