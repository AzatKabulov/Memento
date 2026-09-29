import React, { useEffect, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer, type VideoPlayer } from "expo-video";
import type { Moment } from "../state/DiaryContext";
import { photoContentPosition } from "../lib/photoFrame";

export function MomentMedia({
  moment,
  size,
  height = size,
  focused = false,
  playing = true,
  onVideoPress,
}: {
  moment: Moment;
  size: number;
  height?: number;
  focused?: boolean;
  playing?: boolean;
  onVideoPress?: () => void;
}) {
  const imageSource = useMemo(
    () => moment.sample ?? { uri: moment.uri },
    [moment.sample, moment.uri],
  );
  const previewSource = useMemo(
    () => (moment.thumbnailUri ? { uri: moment.thumbnailUri } : undefined),
    [moment.thumbnailUri],
  );
  if (moment.kind === "video" && moment.uri) {
    return (
      <VideoMedia
        key={moment.uri}
        uri={moment.uri}
        size={size}
        focused={focused}
        playing={playing}
        onVideoPress={onVideoPress}
      />
    );
  }
  return (
    <Image
      source={imageSource}
      placeholder={previewSource}
      placeholderContentFit="cover"
      transition={140}
      cachePolicy="memory-disk"
      contentFit="cover"
      contentPosition={photoContentPosition(moment)}
      style={{
        width: size,
        height,
        borderRadius: moment.kind === "video" ? size / 2 : 5,
      }}
    />
  );
}

function setPlayerMuted(player: VideoPlayer, muted: boolean) {
  player.muted = muted;
}

function VideoMedia({
  uri,
  size,
  focused,
  playing,
  onVideoPress,
}: {
  uri: string;
  size: number;
  focused: boolean;
  playing: boolean;
  onVideoPress?: () => void;
}) {
  const player = useVideoPlayer(uri, (video) => {
    video.loop = true;
    video.muted = !focused;
  });

  useEffect(() => {
    setPlayerMuted(player, !focused);
  }, [player, focused]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
    // useVideoPlayer releases the player on unmount; cleanup must not call it again.
  }, [player, playing]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: "#302C29",
      }}
    >
      <VideoView
        player={player}
        nativeControls={false}
        contentFit="cover"
        surfaceType="textureView"
        style={{ width: size, height: size }}
      />
      {onVideoPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={focused ? "Mute video" : "Unmute video"}
          onPress={onVideoPress}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: 17,
          }}
        >
          <Text
            pointerEvents="none"
            style={{
              overflow: "hidden",
              color: "#FFF9F0",
              fontSize: 11,
              fontWeight: "700",
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderRadius: 16,
              backgroundColor: "rgba(22,16,13,0.65)",
            }}
          >
            {focused ? "Sound on" : "Sound off"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
