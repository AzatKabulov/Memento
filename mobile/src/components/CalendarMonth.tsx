import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { MomentMedia } from "./MomentMedia";
import { VideoPoster } from "./VideoPoster";
import { PlayIcon } from "./DiaryIcons";
import type { PreviewOrigin } from "./HoldPreview";
import type { Moment } from "../state/DiaryContext";
import { calendarCells, dateFromDiary, momentLabel } from "../lib/dates";
import { photoContentPosition } from "../lib/photoFrame";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";
import { useCalendarPhotoSource } from "./useCalendarPhotoSource";

export function CalendarMonth({
  month,
  moments,
  today,
  tile,
  active,
  canPreview,
  onOpen,
  onHold,
}: {
  month: string;
  moments: Record<string, Moment>;
  today: string;
  tile: number;
  active: boolean;
  canPreview: boolean;
  onOpen: (date: string) => void;
  onHold: (date: string, origin: PreviewOrigin) => void;
}) {
  const when = dateFromDiary(month);
  const cells = calendarCells(when.getFullYear(), when.getMonth(), 0);
  const videos = cells
    .filter((date) => date && moments[date]?.kind === "video")
    .slice(0, 2);
  return (
    <View
      style={{
        width: tile * 7 + 30,
        height: 6 * (tile + 11),
        flexDirection: "row",
        flexWrap: "wrap",
        alignContent: "flex-start",
        columnGap: 5,
        rowGap: 11,
      }}
    >
      {cells.map((date, index) =>
        date ? (
          <DateTile
            key={date}
            date={date}
            moment={moments[date]}
            today={today}
            size={tile}
            visible={active}
            playVideo={active && canPreview && videos.includes(date)}
            onOpen={() => onOpen(date)}
            onHold={(origin) => onHold(date, origin)}
          />
        ) : (
          <View key={`empty-${index}`} style={{ width: tile, height: tile }} />
        ),
      )}
    </View>
  );
}

function DateTile({
  date,
  moment,
  today,
  size,
  visible,
  playVideo,
  onOpen,
  onHold,
}: {
  date: string;
  moment?: Moment;
  today: string;
  size: number;
  visible: boolean;
  playVideo: boolean;
  onOpen: () => void;
  onHold: (origin: PreviewOrigin) => void;
}) {
  const tileRef = useRef<View>(null);
  const styles = useThemedStyles(createStyles);
  const day = dateFromDiary(date).getDate();
  const future = date > today;
  const photoSource = useCalendarPhotoSource(moment);
  return (
    <Pressable
      ref={tileRef}
      accessibilityRole="button"
      accessibilityLabel={`${momentLabel(date)}${moment ? `, ${moment.kind} moment` : future ? ", future date" : ", empty date"}`}
      disabled={future}
      onPress={onOpen}
      onLongPress={
        moment
          ? () =>
              tileRef.current?.measureInWindow((x, y, width, height) =>
                onHold({ x, y, width, height }),
              )
          : undefined
      }
      delayLongPress={300}
      hitSlop={3}
      style={{ width: size, height: size, alignItems: "center" }}
    >
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: moment?.kind === "video" ? size / 2 : 16,
          },
          !moment && styles.emptyTile,
          moment && styles.filledTile,
          !moment && date === today && styles.todayTile,
          !moment && future && styles.futureTile,
        ]}
      >
        {moment ? (
          <>
            {moment.kind === "photo" ? (
              <Image
                source={photoSource}
                contentFit="cover"
                contentPosition={photoContentPosition(moment)}
                cachePolicy="memory-disk"
                transition={0}
                style={StyleSheet.absoluteFill}
              />
            ) : playVideo ? (
              <MomentMedia
                moment={moment}
                size={size}
                focused={false}
                playing
              />
            ) : (
              <VideoPoster uri={moment.uri} size={size} visible={visible} />
            )}
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", "rgba(12, 8, 5, 0.65)"]}
              style={styles.photoShade}
            />
            <Text
              maxFontSizeMultiplier={1.2}
              style={[
                styles.tileNumberFilled,
                moment.kind === "video" && styles.videoNumber,
              ]}
            >
              {day}
            </Text>
            {moment.kind === "video" && (
              <View style={styles.videoBadge}>
                <PlayIcon color="#FFF4E4" />
              </View>
            )}
          </>
        ) : (
          <Text style={[styles.tileNumber, future && styles.futureNumber]}>
            {day}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    tile: {
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    emptyTile: {
      backgroundColor: colors.emptyTile,
      borderWidth: 1,
      borderColor: colors.emptyTileBorder,
    },
    filledTile: { backgroundColor: colors.blush },
    todayTile: {
      borderColor: colors.olive,
      borderWidth: 1.5,
      backgroundColor: colors.todayTile,
    },
    futureTile: { opacity: 0.33 },
    tileNumber: {
      color: colors.muted,
      fontFamily: type.body,
      fontSize: 11,
    },
    futureNumber: { opacity: 0.32 },
    tileNumberFilled: {
      color: "#FFF4E4",
      fontFamily: type.bodySemibold,
      position: "absolute",
      left: 7,
      bottom: 5,
      fontSize: 10,
      textShadowColor: "rgba(0,0,0,0.5)",
      textShadowRadius: 3,
    },
    videoNumber: {
      left: 0,
      right: 0,
      top: 6,
      bottom: undefined,
      textAlign: "center",
    },
    photoShade: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "55%",
    },
    videoBadge: {
      position: "absolute",
      width: 17,
      height: 17,
      borderRadius: 9,
      right: 5,
      bottom: 5,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(23,18,15,0.72)",
      borderWidth: 1,
      borderColor: "rgba(242,234,219,0.26)",
    },
  });
