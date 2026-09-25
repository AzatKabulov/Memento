import React, { useCallback, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MomentMedia } from "../../components/MomentMedia";
import { momentLabel } from "../../lib/dates";
import { colors, type } from "../../lib/theme";
import { useDiary } from "../../state/DiaryContext";

export default function MomentScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const { moments, remove } = useDiary();
  const [screenFocused, setScreenFocused] = useState(true);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const moment = moments[date];
  const { width } = useWindowDimensions();
  const mediaSize = Math.min(width - 52, 420);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  if (!moment) {
    return (
      <SafeAreaView style={styles.page}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.backText}>‹ Calendar</Text>
        </TouchableOpacity>
        <Text style={styles.missing}>This moment is no longer here.</Text>
      </SafeAreaView>
    );
  }

  const deleteMoment = () =>
    Alert.alert(
      "Remove this moment?",
      "This removes it from the prototype diary.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            remove(date);
            router.replace("/");
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹ Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/compose/[date]", params: { date } })
          }
        >
          <Text style={styles.edit}>Edit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>A MOMENT KEPT</Text>
        <Text style={styles.date}>{momentLabel(date)}</Text>
        <View style={styles.mediaWrap}>
          <MomentMedia
            moment={moment}
            size={mediaSize}
            focused={screenFocused && !muted}
            playing={screenFocused && !paused}
          />
        </View>
        {moment.kind === "video" && (
          <View style={styles.videoControls}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPaused((value) => !value)}
              style={styles.videoControl}
            >
              <Text style={styles.videoControlText}>
                {paused ? "Play" : "Pause"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setMuted((value) => !value)}
              style={styles.videoControl}
            >
              <Text style={styles.videoControlText}>
                {muted ? "Unmute" : "Mute"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>
            {moment.caption || "No words needed for this one."}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={deleteMoment}
          style={styles.remove}
        >
          <Text style={styles.removeText}>Remove moment</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  header: {
    height: 60,
    paddingHorizontal: 23,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 15 },
  edit: { color: colors.plum, fontSize: 15, fontWeight: "700" },
  scroll: { paddingHorizontal: 26, paddingTop: 25, paddingBottom: 60 },
  eyebrow: {
    color: colors.olive,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "700",
  },
  date: {
    fontFamily: type.display,
    fontSize: 31,
    color: colors.ink,
    marginTop: 9,
  },
  mediaWrap: {
    alignSelf: "center",
    marginTop: 28,
    shadowColor: "#45383F",
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  videoControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 17,
  },
  videoControl: {
    minWidth: 80,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 21,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  videoControlText: { color: colors.plum, fontSize: 12, fontWeight: "700" },
  captionWrap: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    marginTop: 34,
    paddingTop: 22,
  },
  caption: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 23,
    lineHeight: 33,
  },
  remove: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 42,
  },
  removeText: { color: colors.muted, fontSize: 13 },
  missing: { padding: 24, color: colors.muted },
});
