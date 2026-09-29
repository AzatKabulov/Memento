import React, { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
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
      <Image
        source={moment.sample ?? { uri: moment.uri }}
        contentFit="cover"
        contentPosition={photoContentPosition(moment)}
        onLoad={({ source }) => {
          dimensions.current = { width: source.width, height: source.height };
        }}
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
