import React, { useEffect, useMemo } from "react";
import { Pressable, View } from "react-native";
import { SoundIcon } from "./DiaryIcons";
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
      transition={0}
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
        playsInline
        contentFit="cover"
        surfaceType="textureView"
        style={{ width: size, height: size }}
      />
      {onVideoPress && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={focused ? "Mute video" : "Unmute video"}
          onPress={() => {
            // Start audio within the tap itself, preserving Safari's user activation.
            setPlayerMuted(player, focused);
            if (playing) player.play();
            onVideoPress();
          }}
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
          <View
            pointerEvents="none"
            style={{
              overflow: "hidden",
              padding: 9,
              borderRadius: 22,
              backgroundColor: "rgba(22,16,13,0.65)",
            }}
          >
            <SoundIcon muted={!focused} color="#FFF9F0" />
          </View>
        </Pressable>
      )}
    </View>
  );
}
