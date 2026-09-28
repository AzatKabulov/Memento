import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import { createVideoPlayer, type VideoThumbnail } from "expo-video";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useThemedStyles, type ThemeColors } from "../lib/theme";

const thumbnails = new Map<string, VideoThumbnail>();
const pending = new Map<string, Promise<VideoThumbnail | null>>();
const mounted = new Map<string, number>();
let thumbnailQueue = Promise.resolve();

function trimThumbnails() {
  for (const [uri, thumbnail] of thumbnails) {
    if (thumbnails.size <= 96) break;
    if (mounted.get(uri)) continue;
    thumbnail.release();
    thumbnails.delete(uri);
  }
}

function thumbnailFor(uri: string): Promise<VideoThumbnail | null> {
  const saved = thumbnails.get(uri);
  if (saved) return Promise.resolve(saved);
  const existing = pending.get(uri);
  if (existing) return existing;

  const request = thumbnailQueue.then(async () => {
    let player: ReturnType<typeof createVideoPlayer> | null = null;
    try {
      player = createVideoPlayer(uri);
      const [thumbnail] = await player.generateThumbnailsAsync(0, {
        maxWidth: 320,
        maxHeight: 320,
      });
      if (thumbnail) {
        thumbnails.set(uri, thumbnail);
        trimThumbnails();
      }
      return thumbnail ?? null;
    } catch {
      return null;
    } finally {
      player?.release();
    }
  });
  pending.set(uri, request);
  thumbnailQueue = request.then(() => undefined);
  void request.finally(() => pending.delete(uri));
  return request;
}

export function VideoPoster({
  uri,
  size,
  visible,
}: {
  uri?: string;
  size: number;
  visible: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const [thumbnail, setThumbnail] = useState<VideoThumbnail | null>(
    uri ? (thumbnails.get(uri) ?? null) : null,
  );

  useEffect(() => {
    if (!uri) return;
    mounted.set(uri, (mounted.get(uri) ?? 0) + 1);
    return () => {
      const count = (mounted.get(uri) ?? 1) - 1;
      if (count) mounted.set(uri, count);
      else mounted.delete(uri);
      trimThumbnails();
    };
  }, [uri]);

  useEffect(() => {
    if (!uri || !visible || Platform.OS === "web") return;
    let active = true;
    void thumbnailFor(uri).then((result) => {
      if (active) setThumbnail(result);
    });
    return () => {
      active = false;
    };
  }, [uri, visible]);

  return (
    <View style={[styles.poster, { width: size, height: size }]}>
      {thumbnail ? (
        <Image
          source={thumbnail}
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Text style={styles.fallback}>▶</Text>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    poster: {
      backgroundColor: "#48413D",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      borderRadius: 1000,
    },
    fallback: { color: colors.ink, fontSize: 15, opacity: 0.8 },
  });
