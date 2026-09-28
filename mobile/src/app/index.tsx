import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image } from "expo-image";
import { Redirect, router, useFocusEffect } from "expo-router";
import { BlurTargetView, BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Modal,
  AccessibilityInfo,
  AppState,
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
import { useSettings } from "../settings/SettingsContext";
import { VideoPoster } from "../components/VideoPoster";
import {
  calendarCells,
  dateFromDiary,
  diaryDate,
  momentLabel,
  monthLabel,
} from "../lib/dates";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";
import { pickMedia, showPickMediaError } from "../lib/pickMedia";
import { useDiary, type Moment } from "../state/DiaryContext";

const weekdays = ["M", "T", "W", "T", "F", "S", "S"];

export default function CalendarScreen() {
  const styles = useThemedStyles(createStyles);
  const { entered, ready, storageError, retryLoad, moments } = useDiary();
  const { autoplay, theme } = useSettings();
  const today = diaryDate(new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [preview, setPreview] = useState<Moment | null>(null);
  const [yearOpen, setYearOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [screenFocused, setScreenFocused] = useState(true);
  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [gridY, setGridY] = useState(0);
  const scrollIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTargetRef = useRef<View | null>(null);
  const { width } = useWindowDimensions();
  const viewportWidth = Math.min(width, 480) - (Platform.OS === "web" ? 16 : 0);
  const tile = Math.floor((viewportWidth - 36 - 6 * 5) / 7);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const cells = calendarCells(year, month);
  const visibleRows = new Set(
    cells
      .map((_, index) => Math.floor(index / 7))
      .filter((row) => {
        if (!scrollHeight) return true;
        const top = gridY + row * (tile + 36);
        return (
          top + tile >= scrollY - tile && top <= scrollY + scrollHeight + tile
        );
      }),
  );
  const previewVideos = cells
    .map((date, index) => ({ date, row: Math.floor(index / 7) }))
    .filter(({ date, row }) => {
      return !!date && moments[date]?.kind === "video" && visibleRows.has(row);
    })
    .map(({ date }) => date)
    .slice(0, 2);
  const canPreview =
    autoplay &&
    screenFocused &&
    appActive &&
    !reduceMotion &&
    !scrolling &&
    !yearOpen &&
    !preview;
  const yearSummaries = useMemo(() => {
    const result = new Map<string, { count: number; cover?: Moment }>();
    for (const moment of Object.values(moments)) {
      const key = moment.date.slice(0, 7);
      const value = result.get(key) ?? { count: 0 };
      value.count += 1;
      if (!value.cover || moment.date > value.cover.date) value.cover = moment;
      result.set(key, value);
    }
    return result;
  }, [moments]);
  const held = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    const app = AppState.addEventListener("change", (state) =>
      setAppActive(state === "active"),
    );
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
      if (scrollIdle.current) clearTimeout(scrollIdle.current);
    };
  }, []);

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
  const resumeAfterScroll = () => {
    if (scrollIdle.current) clearTimeout(scrollIdle.current);
    scrollIdle.current = setTimeout(() => setScrolling(false), 250);
  };
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          onLayout={(event) => setScrollHeight(event.nativeEvent.layout.height)}
          onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
          onScrollBeginDrag={() => setScrolling(true)}
          onScrollEndDrag={resumeAfterScroll}
          onMomentumScrollBegin={() => setScrolling(true)}
          onMomentumScrollEnd={resumeAfterScroll}
        >
          <View style={styles.topline}>
            <Text style={styles.brand}>MEMENTO</Text>
            <TouchableOpacity
              accessibilityLabel="Settings"
              accessibilityRole="button"
              onPress={() => router.push("/settings")}
              style={styles.settings}
            >
              <Text style={styles.settingsText}>•••</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headingRow}>
            <View style={styles.headingContent}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Choose month and year"
                onPress={() => {
                  setSelectedYear(year);
                  setYearOpen(true);
                }}
                style={styles.monthPicker}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.76}
                  style={[
                    styles.monthTitle,
                    { fontSize: viewportWidth < 360 ? 29 : 39 },
                  ]}
                >
                  {new Intl.DateTimeFormat("en", { month: "long" }).format(
                    visibleMonth,
                  )}
                </Text>
                <Text style={styles.yearText}>{year}</Text>
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
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Next month"
                disabled={
                  year === new Date().getFullYear() &&
                  month === new Date().getMonth()
                }
                onPress={() => changeMonth(1)}
                style={[
                  styles.arrow,
                  year === new Date().getFullYear() &&
                    month === new Date().getMonth() &&
                    styles.arrowDisabled,
                ]}
              >
                <Text style={styles.arrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.weekRow}>
            {weekdays.map((day, index) => (
              <Text key={index} style={[styles.weekLabel, { width: tile }]}>
                {day}
              </Text>
            ))}
          </View>
          <View
            onLayout={(event) => setGridY(event.nativeEvent.layout.y)}
            style={[
              styles.grid,
              {
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
                  visible={visibleRows.has(Math.floor(index / 7))}
                  playVideo={canPreview && previewVideos.includes(date)}
                  onOpen={() => openDate(date)}
                  onHold={() => {
                    held.current = true;
                    if (moments[date]) setPreview(moments[date]);
                  }}
                  onRelease={() => {
                    setPreview(null);
                    setTimeout(() => {
                      held.current = false;
                    }, 0);
                  }}
                />
              ) : (
                <View
                  key={`empty-${index}`}
                  style={{ width: tile, height: tile + 26 }}
                />
              ),
            )}
          </View>
        </ScrollView>
      </BlurTargetView>
      <BlurView
        blurTarget={blurTargetRef}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={65}
        tint={
          theme === "light"
            ? "systemThinMaterialLight"
            : "systemThinMaterialDark"
        }
        style={styles.bottomBar}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={
            moments[today] ? "View today's moment" : "Capture today's moment"
          }
          style={styles.addButton}
          onPress={() => openDate(today)}
        >
          <View style={styles.cameraBody}>
            <View style={styles.cameraTop} />
            <View style={styles.cameraLens} />
          </View>
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
              <Text style={styles.previewDate}>
                {new Intl.DateTimeFormat("en", {
                  month: "long",
                  day: "numeric",
                }).format(dateFromDiary(preview.date))}
              </Text>
              <Text style={styles.previewMeta}>
                {new Intl.DateTimeFormat("en", { weekday: "long" }).format(
                  dateFromDiary(preview.date),
                )}
              </Text>
              <View style={styles.previewMedia}>
                <MomentMedia
                  moment={preview}
                  size={Math.min(width - 100, 280)}
                  focused={false}
                />
              </View>
              <Text style={styles.previewCaption} numberOfLines={2}>
                {preview.caption || "A moment kept."}
              </Text>
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
        <View style={styles.yearBackdrop}>
          <SafeAreaView style={styles.yearPage}>
            <View style={styles.yearHeader}>
              <View>
                <Text style={styles.yearTitle}>Find a month</Text>
                <Text style={styles.yearSubtitle}>
                  Your moments, one month at a time.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setYearOpen(false)}
                style={styles.yearDone}
              >
                <Text style={styles.close}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.yearSelector}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Previous year"
                disabled={selectedYear <= 1900}
                onPress={() => setSelectedYear((value) => value - 1)}
                style={styles.yearStep}
              >
                <Text style={styles.yearStepText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.yearNumber}>{selectedYear}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Next year"
                disabled={selectedYear >= new Date().getFullYear()}
                onPress={() => setSelectedYear((value) => value + 1)}
                style={styles.yearStep}
              >
                <Text
                  style={[
                    styles.yearStepText,
                    selectedYear >= new Date().getFullYear() &&
                      styles.disabledText,
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.yearScroll}>
              <View style={styles.yearGrid}>
                {Array.from({ length: 12 }, (_, itemMonth) => {
                  const key = `${selectedYear}-${String(itemMonth + 1).padStart(2, "0")}`;
                  const summary = yearSummaries.get(key);
                  const future =
                    selectedYear === new Date().getFullYear() &&
                    itemMonth > new Date().getMonth();
                  return (
                    <TouchableOpacity
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={`${monthLabel(selectedYear, itemMonth)}, ${summary?.count ?? 0} moments`}
                      disabled={future}
                      style={[
                        styles.yearMonth,
                        future && styles.yearMonthFuture,
                      ]}
                      onPress={() => {
                        setVisibleMonth(new Date(selectedYear, itemMonth, 1));
                        setYearOpen(false);
                      }}
                    >
                      {summary?.cover?.kind === "photo" && (
                        <Image
                          source={
                            summary.cover.sample ?? { uri: summary.cover.uri }
                          }
                          contentFit="cover"
                          contentPosition={summary.cover.frame ?? "center"}
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      {summary?.cover?.kind === "video" && (
                        <View style={styles.yearVideoOnly}>
                          <VideoPoster
                            uri={summary.cover.uri}
                            size={160}
                            visible={yearOpen}
                          />
                        </View>
                      )}
                      <View style={styles.yearMonthLabel}>
                        <Text style={styles.yearMonthText}>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                          }).format(new Date(selectedYear, itemMonth, 1))}
                        </Text>
                        {!!summary?.count && (
                          <Text style={styles.yearMonthCount}>
                            {summary.count}{" "}
                            {summary.count === 1 ? "moment" : "moments"}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
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
  onRelease,
}: {
  date: string;
  moment?: Moment;
  today: string;
  size: number;
  visible: boolean;
  playVideo: boolean;
  onOpen: () => void;
  onHold: () => void;
  onRelease: () => void;
}) {
  const styles = useThemedStyles(createStyles);
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
      style={{ width: size, height: size + 26, alignItems: "center" }}
    >
      <View
        style={[
          styles.tile,
          { width: size, height: size },
          !moment && styles.emptyTile,
          !moment && date === today && styles.todayTile,
          !moment && future && styles.futureTile,
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
            {moment.kind === "video" && <Text style={styles.videoDot}>▶</Text>}
          </>
        ) : (
          <Text style={[styles.tileNumber, future && styles.futureNumber]}>
            {day}
          </Text>
        )}
      </View>
      {moment && (
        <Text maxFontSizeMultiplier={1.2} style={styles.tileNumberFilled}>
          {day}
        </Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    scroll: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 120,
      minHeight: "100%",
    },
    topline: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    brand: {
      color: colors.olive,
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 2.1,
    },
    settings: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
    settingsText: { fontSize: 14, color: colors.ink, marginTop: -7 },
    headingRow: {
      marginTop: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    headingContent: { flex: 1, minWidth: 0 },
    monthPicker: { minHeight: 98, justifyContent: "center" },
    monthTitle: {
      fontFamily: type.display,
      color: colors.ink,
      fontSize: 39,
      fontWeight: "700",
      letterSpacing: -1.3,
    },
    yearText: { color: colors.muted, fontSize: 16, marginTop: 1 },
    monthNav: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 8,
    },
    arrow: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 21,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    arrowText: {
      color: colors.ink,
      fontSize: 28,
      lineHeight: 30,
      marginTop: -4,
    },
    arrowDisabled: { opacity: 0.35 },
    disabledText: { opacity: 0.35 },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 22,
      marginBottom: 18,
    },
    weekLabel: {
      textAlign: "center",
      color: colors.muted,
      fontSize: 11,
      fontWeight: "700",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
    },
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
    todayTile: {
      borderColor: colors.olive,
      borderWidth: 2,
      backgroundColor: colors.todayTile,
    },
    futureTile: { opacity: 0.48 },
    tileNumber: { color: colors.muted, fontSize: 12 },
    futureNumber: { opacity: 0.32 },
    tileNumberFilled: {
      color: colors.muted,
      textAlign: "center",
      marginTop: 4,
      fontSize: 11,
    },
    videoDot: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "34%",
      color: colors.white,
      fontSize: 14,
      textAlign: "center",
      textShadowColor: "#000",
      textShadowRadius: 8,
    },
    bottomBar: {
      position: "absolute",
      alignSelf: "center",
      bottom: Platform.OS === "web" ? 20 : 16,
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.chrome,
    },
    addButton: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    cameraBody: {
      width: 26,
      height: 19,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    cameraTop: {
      position: "absolute",
      top: -6,
      width: 10,
      height: 5,
      borderTopLeftRadius: 3,
      borderTopRightRadius: 3,
      backgroundColor: colors.ink,
    },
    cameraLens: {
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 2,
      borderColor: colors.ink,
    },
    previewShade: {
      flex: 1,
      backgroundColor: "rgba(7,5,4,0.82)",
      justifyContent: "center",
      alignItems: "center",
    },
    previewCard: {
      backgroundColor: colors.card,
      borderRadius: 30,
      padding: 18,
      width: "84%",
      maxWidth: 350,
      borderWidth: 1,
      borderColor: colors.line,
    },
    previewDate: {
      color: colors.ink,
      fontFamily: type.display,
      fontSize: 22,
      fontWeight: "700",
    },
    previewMeta: { color: colors.muted, marginTop: 4, fontSize: 12 },
    previewMedia: {
      marginTop: 16,
      borderRadius: 22,
      overflow: "hidden",
      alignSelf: "center",
    },
    previewCaption: {
      marginTop: 12,
      color: colors.ink,
      fontSize: 13,
    },
    yearBackdrop: { flex: 1, backgroundColor: colors.paper },
    yearPage: {
      flex: 1,
      width: "100%",
      maxWidth: 480,
      alignSelf: "center",
      backgroundColor: colors.paper,
      paddingHorizontal: 22,
      paddingTop: 20,
    },
    yearHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    yearTitle: { fontFamily: type.display, fontSize: 28, color: colors.ink },
    yearSubtitle: { color: colors.muted, fontSize: 12, marginTop: 5 },
    yearDone: {
      minWidth: 54,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    close: { color: colors.plum, fontSize: 15, fontWeight: "700" },
    yearSelector: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 22,
    },
    yearStep: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    yearStepText: { color: colors.ink, fontSize: 28, lineHeight: 32 },
    yearNumber: { color: colors.ink, fontFamily: type.display, fontSize: 30 },
    yearScroll: { paddingBottom: 28 },
    yearGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    yearMonth: {
      width: "48%",
      minHeight: 122,
      backgroundColor: colors.card,
      borderRadius: 23,
      overflow: "hidden",
      justifyContent: "flex-end",
    },
    yearMonthFuture: { opacity: 0.35 },
    yearVideoOnly: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: "#48413D",
      alignItems: "center",
      justifyContent: "center",
    },
    yearMonthLabel: {
      paddingHorizontal: 15,
      paddingVertical: 12,
      minHeight: 46,
      backgroundColor: "rgba(20,18,17,0.72)",
    },
    yearMonthText: {
      color: colors.white,
      fontFamily: type.display,
      fontSize: 17,
    },
    yearMonthCount: {
      color: colors.white,
      fontSize: 10,
      opacity: 0.8,
      marginTop: 2,
    },
  });
