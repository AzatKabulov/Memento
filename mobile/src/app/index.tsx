import React, { useCallback, useRef, useState } from "react";
import { Image } from "expo-image";
import { Redirect, router, useFocusEffect } from "expo-router";
import { BlurTargetView, BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { MomentMedia } from "../components/MomentMedia";
import {
  calendarCells,
  dateFromDiary,
  diaryDate,
  momentLabel,
  monthLabel,
} from "../lib/dates";
import { colors, type } from "../lib/theme";
import { pickMedia, showPickMediaError } from "../lib/pickMedia";
import { useDiary, type Moment } from "../state/DiaryContext";

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export default function CalendarScreen() {
  const { entered, ready, storageError, retryLoad, moments } = useDiary();
  const today = diaryDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [preview, setPreview] = useState<Moment | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const blurTargetRef = useRef<View | null>(null);
  const { width } = useWindowDimensions();
  const viewportWidth = Math.min(width - (Platform.OS === "web" ? 16 : 0), 480);
  const tile = Math.floor((viewportWidth - 4 - 6 * 5) / 7);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const cells = calendarCells(year, month);
  const filled = cells.filter((date) => date && moments[date]).length;
  const previewVideos = cells
    .filter((date) => date && moments[date]?.kind === "video")
    .slice(0, 2);
  const held = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  if (!entered) return <Redirect href="/welcome" />;
  if (!ready)
    return (
      <SafeAreaView style={styles.page}>
        <Text style={styles.loading}>
          {storageError || "Opening your diary…"}
        </Text>
        {!!storageError && (
          <TouchableOpacity
            style={styles.retry}
            onPress={retryLoad}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );

  const changeMonth = (step: number) =>
    setVisibleMonth(new Date(year, month + step, 1));
  const openDate = async (date: string) => {
    if (held.current) {
      held.current = false;
      return;
    }
    if (moments[date])
      router.push({ pathname: "/moment/[date]", params: { date } });
    else if (date === today)
      router.push({ pathname: "/camera", params: { date } });
    else if (date < today) {
      try {
        const media = await pickMedia();
        if (media)
          router.push({
            pathname: "/compose/[date]",
            params: {
              date,
              uri: media.uri,
              kind: media.kind,
              source: "library",
              duration: media.duration?.toString(),
            },
          });
      } catch (error) {
        showPickMediaError(error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.page}>
      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.topline}>
            <View style={{ width: 44 }} />
            <Text style={styles.brand}>Memento</Text>
            <TouchableOpacity
              accessibilityLabel="Settings"
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
              style={styles.settings}
            >
              <Text style={styles.settingsText}>•••</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.eyebrow}>YOUR DAYS, ONE MOMENT AT A TIME</Text>
          <View style={styles.headingRow}>
            <View>
              <Text style={styles.sectionKicker}>THE CALENDAR</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose year"
                onPress={() => setYearOpen(true)}
                style={{ minHeight: 48, justifyContent: "center" }}
              >
                <Text
                  style={[
                    styles.monthTitle,
                    { fontSize: 25, letterSpacing: 2 },
                  ]}
                >
                  {monthLabel(year, month).toUpperCase()}{" "}
                  <Text style={styles.down}>⌄</Text>
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.todayPill}
              onPress={() =>
                setVisibleMonth(
                  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                )
              }
            >
              <Text style={styles.todayText}>Today</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.monthNav}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              onPress={() => changeMonth(-1)}
              style={styles.arrow}
            >
              <Text style={styles.arrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthNote}>
              {filled} {filled === 1 ? "moment" : "moments"} kept this month
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next month"
              onPress={() => changeMonth(1)}
              style={styles.arrow}
            >
              <Text style={styles.arrowText}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.weekRow, { marginHorizontal: -18 }]}>
            {weekdays.map((day, index) => (
              <Text key={index} style={[styles.weekLabel, { width: tile }]}>
                {day}
              </Text>
            ))}
          </View>
          <View
            style={[
              styles.grid,
              {
                marginHorizontal: -18,
                columnGap: 5,
                justifyContent: "flex-start",
              },
            ]}
          >
            {cells.map((date, index) =>
              date ? (
                <DateTile
                  key={date}
                  date={date}
                  moment={moments[date]}
                  today={today}
                  size={tile}
                  playVideo={
                    screenFocused && !preview && previewVideos.includes(date)
                  }
                  onOpen={() => openDate(date)}
                  onHold={() => {
                    held.current = true;
                    if (moments[date]) setPreview(moments[date]);
                  }}
                  onRelease={() => setPreview(null)}
                />
              ) : (
                <View
                  key={`empty-${index}`}
                  style={{ width: tile, height: tile + 15 }}
                />
              ),
            )}
          </View>
          <View style={styles.tip}>
            <Text style={styles.tipTitle}>A little note</Text>
            <Text style={styles.tipText}>
              Some days have a photo. Some days are simply lived. Both belong
              here.
            </Text>
          </View>
        </ScrollView>
      </BlurTargetView>
      <BlurView
        blurTarget={blurTargetRef}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={65}
        tint="systemThinMaterialDark"
        style={styles.bottomBar}
      >
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.addButton}
          onPress={() => openDate(today)}
        >
          <Text style={[styles.plus, { color: colors.buttonInk }]}>＋</Text>
          <Text style={[styles.addText, { color: colors.buttonInk }]}>
            {moments[today] ? "View today’s moment" : "Capture today’s moment"}
          </Text>
        </TouchableOpacity>
      </BlurView>
      <Modal
        visible={!!preview}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPreview(null);
          held.current = false;
        }}
      >
        <Pressable
          style={styles.previewShade}
          onPress={() => {
            setPreview(null);
            held.current = false;
          }}
        >
          {preview && (
            <View style={styles.previewCard}>
              <MomentMedia
                moment={preview}
                size={Math.min(width - 100, 280)}
                focused={false}
              />
              <Text style={styles.previewDate}>
                {momentLabel(preview.date)}
              </Text>
              <Text style={styles.previewCaption} numberOfLines={2}>
                {preview.caption || "A moment kept."}
              </Text>
              <Text style={styles.previewHint}>Tap the date to open</Text>
            </View>
          )}
        </Pressable>
      </Modal>
      <Modal
        visible={yearOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setYearOpen(false)}
      >
        <SafeAreaView style={styles.yearPage}>
          <View style={styles.yearHeader}>
            <Text style={styles.yearTitle}>Find a month</Text>
            <TouchableOpacity onPress={() => setYearOpen(false)}>
              <Text style={styles.close}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            {Array.from(
              { length: 12 },
              (_, i) => new Date().getFullYear() - i,
            ).map((itemYear) => (
              <View key={itemYear}>
                <Text style={styles.yearLabel}>{itemYear}</Text>
                <View style={styles.yearGrid}>
                  {Array.from({ length: 12 }, (_, itemMonth) => (
                    <TouchableOpacity
                      key={itemMonth}
                      style={styles.yearMonth}
                      onPress={() => {
                        setVisibleMonth(new Date(itemYear, itemMonth, 1));
                        setYearOpen(false);
                      }}
                    >
                      <Text style={styles.yearMonthText}>
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                        }).format(new Date(itemYear, itemMonth, 1))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function DateTile({
  date,
  moment,
  today,
  size,
  playVideo,
  onOpen,
  onHold,
  onRelease,
}: {
  date: string;
  moment?: Moment;
  today: string;
  size: number;
  playVideo: boolean;
  onOpen: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const day = dateFromDiary(date).getDate();
  const future = date > today;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${momentLabel(date)}${moment ? `, ${moment.kind} moment` : future ? ", future date" : ", empty date"}`}
      disabled={future}
      onPress={onOpen}
      onLongPress={moment ? onHold : undefined}
      onPressOut={onRelease}
      delayLongPress={300}
      style={{ width: size, height: size + 5, alignItems: "center" }}
    >
      <View
        style={[
          styles.tile,
          { width: size, height: size },
          date === today && styles.todayTile,
        ]}
      >
        {moment ? (
          <>
            {moment.kind === "photo" ? (
              <Image
                source={moment.sample ?? { uri: moment.uri }}
                contentFit="cover"
                contentPosition={moment.frame ?? "center"}
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <MomentMedia
                moment={moment}
                size={size}
                focused={false}
                playing={playVideo}
              />
            )}
            <Text style={styles.tileNumberFilled}>{day}</Text>
            {moment.kind === "video" && <Text style={styles.videoDot}>●</Text>}
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

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.paper,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  loading: { color: colors.ink, textAlign: "center", marginTop: 80 },
  retry: {
    alignSelf: "center",
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 15,
    borderRadius: 22,
    backgroundColor: colors.card,
  },
  retryText: { color: colors.ink, fontWeight: "700" },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110 },
  topline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { fontFamily: type.display, color: colors.ink, fontSize: 27 },
  settings: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsText: { fontSize: 15, color: colors.ink, marginTop: -8 },
  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginTop: 4,
  },
  headingRow: {
    marginTop: 43,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionKicker: {
    color: colors.olive,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.7,
  },
  monthTitle: {
    fontFamily: type.display,
    color: colors.ink,
    fontSize: 32,
    marginTop: 8,
  },
  down: { fontFamily: undefined, fontSize: 22, color: colors.muted },
  todayPill: {
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  todayText: { color: colors.plum, fontWeight: "600", fontSize: 13 },
  monthNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 14,
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  arrowText: { color: colors.ink, fontSize: 29, lineHeight: 30, marginTop: -4 },
  monthNote: { color: colors.muted, fontSize: 12 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  weekLabel: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    backgroundColor: colors.card,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  todayTile: { borderColor: colors.plum, borderWidth: 2 },
  tileNumber: { color: colors.muted, fontSize: 14 },
  futureNumber: { opacity: 0.32 },
  tileNumberFilled: {
    position: "absolute",
    color: colors.white,
    bottom: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "rgba(20,15,14,0.56)",
    textAlign: "center",
    lineHeight: 18,
    fontSize: 11,
    fontWeight: "700",
  },
  videoDot: {
    position: "absolute",
    right: 5,
    top: 4,
    color: colors.white,
    fontSize: 8,
  },
  tip: {
    marginTop: 26,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    paddingTop: 20,
  },
  tipTitle: {
    fontFamily: type.display,
    fontStyle: "italic",
    fontSize: 21,
    color: colors.plum,
  },
  tipText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 260,
  },
  bottomBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: Platform.OS === "web" ? 12 : 10,
    padding: 8,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.23)",
    backgroundColor: "rgba(55,53,52,0.48)",
  },
  addButton: {
    height: 56,
    borderRadius: 24,
    backgroundColor: colors.plum,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  plus: { color: colors.white, fontSize: 24, marginTop: -2 },
  addText: { color: colors.white, fontSize: 15, fontWeight: "700" },
  previewShade: {
    flex: 1,
    backgroundColor: "rgba(30,23,27,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    maxWidth: "88%",
  },
  previewDate: {
    marginTop: 20,
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 20,
    textAlign: "center",
  },
  previewCaption: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  previewHint: { marginTop: 14, fontSize: 11, color: colors.olive },
  yearPage: { flex: 1, backgroundColor: colors.paper, padding: 24 },
  yearHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  yearTitle: { fontFamily: type.display, fontSize: 28, color: colors.ink },
  close: { color: colors.plum, fontSize: 15, fontWeight: "700" },
  yearLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  yearMonth: {
    width: "22%",
    backgroundColor: colors.card,
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: "center",
  },
  yearMonthText: { color: colors.ink, fontSize: 13 },
});
