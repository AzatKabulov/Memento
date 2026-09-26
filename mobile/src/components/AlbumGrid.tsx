import React from "react";
import { Image } from "expo-image";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MomentMedia } from "./MomentMedia";
import { dateFromDiary, momentLabel } from "../lib/dates";
import { colors, type } from "../lib/theme";
import type { Moment } from "../state/DiaryContext";

export function AlbumGrid({
  dates,
  moments,
  today,
  playing,
  onOpen,
  onHold,
  onRelease,
}: {
  dates: string[];
  moments: Record<string, Moment>;
  today: string;
  playing: boolean;
  onOpen: (date: string) => void;
  onHold: (moment: Moment) => void;
  onRelease: () => void;
}) {
  const { width } = useWindowDimensions();
  const viewportWidth = Math.min(width - (Platform.OS === "web" ? 16 : 0), 480);
  const cardWidth = Math.floor((viewportWidth - 40 - 20) / 3);
  const cardHeight = Math.round(cardWidth * 1.28);
  const previewDates = dates
    .filter((date) => moments[date]?.kind === "video")
    .slice(0, 2);

  return (
    <View style={styles.grid}>
      {dates.map((date) => {
        const moment = moments[date];
        const future = date > today;
        const day = dateFromDiary(date).getDate();
        const weekday = new Intl.DateTimeFormat("en", {
          weekday: "short",
        }).format(dateFromDiary(date));

        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityLabel={`${momentLabel(date)}${moment ? `, ${moment.kind} moment` : future ? ", future date" : ", empty date"}`}
            disabled={future}
            onPress={() => onOpen(date)}
            onLongPress={moment ? () => onHold(moment) : undefined}
            onPressOut={onRelease}
            delayLongPress={300}
            style={[
              styles.card,
              { width: cardWidth, height: cardHeight },
              date === today && styles.todayCard,
            ]}
          >
            {moment?.kind === "photo" && (
              <Image
                source={moment.sample ?? { uri: moment.uri }}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
            )}
            {moment?.kind === "video" && (
              <MomentMedia
                moment={moment}
                size={cardWidth - 14}
                focused={false}
                playing={playing && previewDates.includes(date)}
              />
            )}
            {!moment && (
              <Text style={[styles.emptyNumber, future && styles.future]}>
                {day}
              </Text>
            )}
            <View style={[styles.dateBadge, moment && styles.dateBadgeOnMedia]}>
              <Text style={styles.badgeText}>
                {weekday.toUpperCase()} {day}
              </Text>
            </View>
            {!moment && !future && (
              <Text style={styles.addHint}>
                {date === today ? "CAPTURE" : "ADD"}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  todayCard: { borderColor: colors.ink, borderWidth: 1.5 },
  dateBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "rgba(22,22,22,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  dateBadgeOnMedia: { backgroundColor: "rgba(22,22,22,0.52)" },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyNumber: {
    color: "rgba(241,234,226,0.32)",
    fontFamily: type.display,
    fontSize: 42,
  },
  future: { opacity: 0.38 },
  addHint: {
    position: "absolute",
    bottom: 11,
    color: colors.muted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
});
