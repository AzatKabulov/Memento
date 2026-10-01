import React, { forwardRef } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { MomentMedia } from "./MomentMedia";
import { MemoryPager, type MemoryPagerHandle } from "./MemoryPager";
import type { Moment } from "../state/DiaryContext";

type Props = {
  moment: Moment;
  moments: Record<string, Moment>;
  dates: string[];
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

export const MomentCarousel = forwardRef<MemoryPagerHandle, Props>(
  function MomentCarousel(
    {
      moment,
      moments,
      dates,
      size,
      height,
      zoomed,
      reduceMotion,
      focused,
      playing,
      onToggleZoom,
      onVideoPress,
      onNavigate,
    },
    ref,
  ) {
    return (
      <MemoryPager
        ref={ref}
        testID="moment-pager"
        dates={dates}
        date={moment.date}
        width={size}
        height={height}
        reduceMotion={reduceMotion}
        enabled={!zoomed}
        onChange={(date) => onNavigate(moments[date])}
        renderPage={(date, active) => (
          <MediaPage
            moment={moments[date]}
            size={size}
            height={height}
            zoomed={active && zoomed}
            reduceMotion={reduceMotion}
            focused={active && focused}
            playing={active && playing}
            onToggleZoom={onToggleZoom}
            onVideoPress={onVideoPress}
          />
        )}
      />
    );
  },
);

function MediaPage({
  moment,
  size,
  height,
  zoomed,
  reduceMotion,
  focused,
  playing,
  onToggleZoom,
  onVideoPress,
}: Omit<Props, "moments" | "dates" | "onNavigate">) {
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withTiming(zoomed ? 2 : 1, { duration: reduceMotion ? 0 : 200 }),
      },
    ],
  }));
  return (
    <View
      style={{
        width: size,
        height,
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: moment.kind === "photo" ? 30 : 0,
      }}
    >
      {moment.kind === "photo" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={zoomed ? "Zoom out photo" : "Zoom in photo"}
          onPress={onToggleZoom}
        >
          <Animated.View style={zoomStyle}>
            <MomentMedia
              moment={moment}
              size={size}
              height={height}
              focused={focused}
              playing={playing}
            />
          </Animated.View>
        </Pressable>
      ) : (
        <Animated.View style={zoomStyle}>
          <MomentMedia
            moment={moment}
            size={size}
            height={size}
            focused={focused}
            playing={playing}
            onVideoPress={onVideoPress}
          />
        </Animated.View>
      )}
    </View>
  );
}
