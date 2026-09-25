import React, { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Modal,
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
import { useDiary, type Moment } from "../state/DiaryContext";

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export default function CalendarScreen() {
  const { entered, moments } = useDiary();
  const today = diaryDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [preview, setPreview] = useState<Moment | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [screenFocused, setScreenFocused] = useState(true);
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 4 - 6 * 8) / 7);
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

  const changeMonth = (step: number) =>
    setVisibleMonth(new Date(year, month + step, 1));
  const openDate = (date: string) => {
    if (held.current) {
      held.current = false;
      return;
    }
    if (moments[date])
      router.push({ pathname: "/moment/[date]", params: { date } });
    else if (date <= today)
      router.push({ pathname: "/compose/[date]", params: { date } });
  };

  return (
    <SafeAreaView style={styles.page}>
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
                style={[styles.monthTitle, { fontSize: 25, letterSpacing: 2 }]}
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
              columnGap: 8,
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
      <View style={styles.bottomBar}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.addButton}
          onPress={() =>
            router.push({
              pathname: "/compose/[date]",
              params: { date: today },
            })
          }
        >
          <Text style={[styles.plus, { color: colors.buttonInk }]}>＋</Text>
          <Text style={[styles.addText, { color: colors.buttonInk }]}>
            Add today’s moment
          </Text>
        </TouchableOpacity>
      </View>
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
          { width: size, height: size, borderRadius: 3 },
          date === today && styles.todayTile,
        ]}
      >
        {moment ? (
          <>
            <MomentMedia
              moment={moment}
              size={size - 2}
              focused={false}
              playing={playVideo}
            />
            <View style={styles.tileShade} />
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
  page: { flex: 1, backgroundColor: colors.paper },
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
    backgroundColor: colors.card,
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
    backgroundColor: colors.card,
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
    borderColor: colors.line,
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
  tileShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 23,
    backgroundColor: "rgba(20,15,14,0.26)",
  },
  tileNumberFilled: {
    position: "absolute",
    color: colors.white,
    bottom: 3,
    fontSize: 12,
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
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 13,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  addButton: {
    height: 56,
    borderRadius: 18,
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
    borderRadius: 12,
    alignItems: "center",
  },
  yearMonthText: { color: colors.ink, fontSize: 13 },
});
