import React, { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  AccessibilityInfo,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MomentMedia } from "../../components/MomentMedia";
import { shareMoment } from "../../archive/DiaryArchive";
import { dateFromDiary } from "../../lib/dates";
import { colors, type } from "../../lib/theme";
import { useDiary } from "../../state/DiaryContext";

export default function MomentScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <MomentView key={date} date={date} />;
}

function MomentView({ date }: { date: string }) {
  const { moments, remove } = useDiary();
  const [screenFocused, setScreenFocused] = useState(true);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const touchStart = useRef<number | null>(null);
  const moment = moments[date];
  const { width } = useWindowDimensions();
  const mediaSize = Math.min(width - 52, 420);
  const dates = Object.keys(moments).sort();
  const position = dates.indexOf(date);
  const previous = position > 0 ? dates[position - 1] : null;
  const next =
    position >= 0 && position < dates.length - 1 ? dates[position + 1] : null;

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && enabled) setPaused(true);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);

  const goTo = (target: string | null) => {
    if (target)
      router.replace({ pathname: "/moment/[date]", params: { date: target } });
  };

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
      "This removes the saved photo or video and its caption from your diary.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await remove(date);
              router.replace("/");
            } catch {
              Alert.alert("Could not remove this moment", "Please try again.");
            }
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backCircle}
          accessibilityRole="button"
          accessibilityLabel="Back to calendar"
          onPress={() => router.replace("/")}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel}>MOMENT</Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Moment options"
          style={styles.moreCircle}
          onPress={() =>
            Alert.alert("Moment options", undefined, [
              {
                text: "Edit moment",
                onPress: () =>
                  router.push({
                    pathname: "/compose/[date]",
                    params: { date },
                  }),
              },
              {
                text: "Remove moment",
                style: "destructive",
                onPress: deleteMoment,
              },
              { text: "Cancel", style: "cancel" },
            ])
          }
        >
          <Text style={styles.moreIcon}>•••</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.date}>
          {new Intl.DateTimeFormat("en", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }).format(dateFromDiary(date))}
        </Text>
        <Text style={styles.dateMeta}>
          {new Intl.DateTimeFormat("en", { weekday: "long" }).format(
            dateFromDiary(date),
          )}
        </Text>
        <View
          style={[
            styles.mediaWrap,
            {
              width: mediaSize,
              height: moment.kind === "photo" ? mediaSize * 1.18 : mediaSize,
            },
          ]}
          onTouchStart={(event) => {
            touchStart.current = event.nativeEvent.pageX;
          }}
          onTouchEnd={(event) => {
            if (touchStart.current === null || zoomed) return;
            const distance = event.nativeEvent.pageX - touchStart.current;
            touchStart.current = null;
            if (distance > 75) goTo(previous);
            if (distance < -75) goTo(next);
          }}
        >
          {moment.kind === "photo" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={zoomed ? "Zoom out photo" : "Zoom in photo"}
              onPress={() => setZoomed((value) => !value)}
              style={styles.photoFrame}
            >
              <View style={{ transform: [{ scale: zoomed ? 2 : 1 }] }}>
                <MomentMedia
                  moment={moment}
                  size={mediaSize}
                  height={mediaSize * 1.18}
                />
              </View>
            </Pressable>
          ) : (
            <MomentMedia
              moment={moment}
              size={mediaSize}
              focused={screenFocused && appActive && !muted}
              playing={screenFocused && appActive && !paused}
            />
          )}
        </View>
        {moment.kind === "photo" && (
          <Text style={styles.mediaHint}>
            {zoomed ? "Tap to fit" : "Tap to look closer"}
          </Text>
        )}
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
        {!!moment.caption && (
          <Text style={styles.caption}>{moment.caption}</Text>
        )}
        <View style={styles.primaryActions}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/compose/[date]", params: { date } })
            }
            style={styles.editMoment}
          >
            <Text style={styles.editMomentText}>✎ Edit moment</Text>
          </TouchableOpacity>
          <View style={styles.privatePill}>
            <Text style={styles.privateText}>Private diary</Text>
          </View>
        </View>
        <View style={styles.memoryNav}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Previous saved moment"
            disabled={!previous}
            onPress={() => goTo(previous)}
            style={[
              styles.memoryNavButton,
              !previous && styles.memoryNavDisabled,
            ]}
          >
            <Text style={styles.memoryNavText}>‹ Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Next saved moment"
            disabled={!next}
            onPress={() => goTo(next)}
            style={[styles.memoryNavButton, !next && styles.memoryNavDisabled]}
          >
            <Text style={styles.memoryNavText}>Next ›</Text>
          </TouchableOpacity>
        </View>
        {!!moment.uri && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              void shareMoment(moment).catch(() =>
                Alert.alert("Could not share this moment", "Please try again."),
              )
            }
            style={styles.share}
          >
            <Text style={styles.shareText}>Share original file</Text>
          </TouchableOpacity>
        )}
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
  page: {
    flex: 1,
    backgroundColor: colors.paper,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  header: {
    height: 62,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backCircle: { width: 44, height: 44, justifyContent: "center" },
  backIcon: { color: colors.ink, fontSize: 34, lineHeight: 38, marginTop: -4 },
  headerLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginRight: "auto",
    marginLeft: 2,
  },
  moreCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  moreIcon: { color: colors.ink, fontSize: 15, marginTop: -7 },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 15 },
  scroll: { paddingHorizontal: 26, paddingTop: 16, paddingBottom: 60 },
  date: {
    fontFamily: type.display,
    fontSize: 30,
    fontWeight: "700",
    color: colors.ink,
  },
  dateMeta: { color: colors.muted, fontSize: 13, marginTop: 5 },
  mediaWrap: {
    alignSelf: "center",
    marginTop: 24,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 5,
  },
  photoFrame: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaHint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 12,
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
  caption: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 22,
    lineHeight: 32,
    marginTop: 22,
    marginBottom: 6,
  },
  primaryActions: { flexDirection: "row", gap: 10, marginTop: 26 },
  editMoment: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  editMomentText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  privatePill: {
    flex: 1,
    minHeight: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  privateText: { color: colors.muted, fontSize: 13 },
  memoryNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  memoryNavButton: {
    minHeight: 44,
    flex: 1,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  memoryNavDisabled: { opacity: 0.35 },
  memoryNavText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  share: {
    alignSelf: "center",
    minHeight: 48,
    paddingHorizontal: 22,
    borderRadius: 24,
    backgroundColor: colors.card,
    justifyContent: "center",
    marginTop: 26,
  },
  shareText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  remove: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    marginTop: 42,
  },
  removeText: { color: colors.muted, fontSize: 13 },
  missing: { padding: 24, color: colors.muted },
});
