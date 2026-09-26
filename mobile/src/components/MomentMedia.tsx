import React, { useEffect } from "react";
import { View } from "react-native";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer, type VideoPlayer } from "expo-video";
import type { Moment } from "../state/DiaryContext";

export function MomentMedia({
  moment,
  size,
  focused = false,
  playing = true,
}: {
  moment: Moment;
  size: number;
  focused?: boolean;
  playing?: boolean;
}) {
  if (moment.kind === "video" && moment.uri) {
    return (
      <VideoMedia
        key={moment.uri}
        uri={moment.uri}
        size={size}
        focused={focused}
        playing={playing}
      />
    );
  }
  return (
    <Image
      source={moment.sample ?? { uri: moment.uri }}
      contentFit="cover"
      contentPosition={moment.frame ?? "center"}
      style={{
        width: size,
        height: size,
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
}: {
  uri: string;
  size: number;
  focused: boolean;
  playing: boolean;
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
    return () => {
      player.pause();
    };
  }, [player, focused, playing]);

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
    </View>
  );
}
