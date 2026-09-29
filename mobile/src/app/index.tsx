import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Image } from "expo-image";
import { Redirect, router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurTargetView } from "expo-blur";
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
import { HoldPreview } from "../components/HoldPreview";
import {
  CameraIcon,
  ChevronIcon,
  PlayIcon,
  SettingsIcon,
} from "../components/DiaryIcons";
import { useSettings } from "../settings/SettingsContext";
import { VideoPoster } from "../components/VideoPoster";
import {
  calendarCells,
  dateFromDiary,
  diaryDate,
  momentLabel,
  monthLabel,
} from "../lib/dates";
import {
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
  type,
} from "../lib/theme";
import { pickMedia, showPickMediaError } from "../lib/pickMedia";
import { photoContentPosition } from "../lib/photoFrame";
import { useDiary, type Moment } from "../state/DiaryContext";

const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function CalendarScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useThemeColors();
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
  const { width, height } = useWindowDimensions();
  const compact = height < 700;
  const viewportWidth = Math.min(width, 480) - (Platform.OS === "web" ? 16 : 0);
  const narrow = viewportWidth < 360;
  const tile = Math.floor((viewportWidth - 48 - 6 * 5) / 7);
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const cells = calendarCells(year, month, 0);
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthCount = Object.keys(moments).filter((date) =>
    date.startsWith(monthKey),
  ).length;
  const visibleRows = new Set(
    cells
      .map((_, index) => Math.floor(index / 7))
      .filter((row) => {
        if (!scrollHeight) return true;
        const top = gridY + row * (tile + 11);
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
  const suppressPress = useRef(false);
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (suppressTimer.current) clearTimeout(suppressTimer.current);
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
    if (preview || suppressPress.current) return;
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
        <LinearGradient
          colors={
            theme === "dark"
              ? (["#1B1511", colors.paper, "#1C1511"] as const)
              : ([colors.paper, "#F7F3ED", "#F2EADF"] as const)
          }
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            onLayout={(event) =>
              setScrollHeight(event.nativeEvent.layout.height)
            }
            onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={32}
            onScrollBeginDrag={() => setScrolling(true)}
            onScrollEndDrag={resumeAfterScroll}
            onMomentumScrollBegin={() => setScrolling(true)}
            onMomentumScrollEnd={resumeAfterScroll}
          >
            <View style={styles.topline}>
              <View style={styles.brandLockup}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>M</Text>
                </View>
                <Text style={styles.brand}>Memento</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Settings"
                accessibilityRole="button"
                onPress={() => router.push("/settings")}
                style={styles.settings}
              >
                <SettingsIcon color={colors.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.headingRow}>
              <View style={styles.headingContent}>
                <Text style={styles.eyebrow}>COLLECT MOMENTS, NOT THINGS</Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Choose month and year"
                  onPress={() => {
                    setSelectedYear(year);
                    setYearOpen(true);
                  }}
                  style={[
                    styles.monthPicker,
                    narrow && styles.monthPickerNarrow,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.68}
                    style={[
                      styles.monthTitle,
                      narrow && styles.monthTitleNarrow,
                    ]}
                  >
                    {new Intl.DateTimeFormat("en", { month: "long" }).format(
                      visibleMonth,
                    )}
                  </Text>
                  <Text
                    style={[styles.yearText, narrow && styles.yearTextNarrow]}
                  >
                    {year}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.monthNav}>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  onPress={() => changeMonth(-1)}
                  style={styles.arrow}
                >
                  <ChevronIcon color={colors.muted} direction="left" />
                </TouchableOpacity>
                <View style={styles.arrowDivider} />
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
                  <ChevronIcon color={colors.muted} direction="right" />
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
                      suppressPress.current = true;
                      if (suppressTimer.current)
                        clearTimeout(suppressTimer.current);
                      suppressTimer.current = setTimeout(() => {
                        suppressPress.current = false;
                      }, 500);
                      if (moments[date]) setPreview(moments[date]);
                    }}
                  />
                ) : (
                  <View
                    key={`empty-${index}`}
                    style={{ width: tile, height: tile }}
                  />
                ),
              )}
            </View>
            {!compact && (
              <Text style={styles.monthCount}>
                {`${monthCount} ${monthCount === 1 ? "moment" : "moments"}, kept only for you`}
              </Text>
            )}
          </ScrollView>
        </View>
        <View style={[styles.bottomBar, compact && styles.bottomBarCompact]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              moments[today] ? "View today's moment" : "Capture today's moment"
            }
            style={[styles.addButton, compact && styles.addButtonCompact]}
            onPress={() => openDate(today)}
          >
            <LinearGradient
              colors={
                theme === "dark"
                  ? (["#EDCFA1", "#B48758", "#674B35"] as const)
                  : (["#BD8B58", "#94643A", "#765035"] as const)
              }
              style={[
                styles.captureMetal,
                compact && styles.captureMetalCompact,
              ]}
            >
              <View
                style={[
                  styles.captureFace,
                  compact && styles.captureFaceCompact,
                ]}
              >
                <CameraIcon color={theme === "dark" ? colors.ink : "#FFF4E4"} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </BlurTargetView>
      {preview && (
        <HoldPreview
          key={preview.date}
          initialDate={preview.date}
          moments={moments}
          width={width}
          height={height}
          blurTarget={blurTargetRef}
          reduceMotion={reduceMotion}
          onClose={() => setPreview(null)}
        />
      )}
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
                            summary.cover.sample ?? {
                              uri:
                                summary.cover.thumbnailUri ?? summary.cover.uri,
                            }
                          }
                          contentFit="cover"
                          contentPosition={photoContentPosition(summary.cover)}
                          cachePolicy="memory-disk"
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
}: {
  date: string;
  moment?: Moment;
  today: string;
  size: number;
  visible: boolean;
  playVideo: boolean;
  onOpen: () => void;
  onHold: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const day = dateFromDiary(date).getDate();
  const future = date > today;
  const photoSource = React.useMemo(
    () =>
      moment?.sample ?? {
        uri: moment?.thumbnailUri ?? moment?.uri,
      },
    [moment?.sample, moment?.thumbnailUri, moment?.uri],
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${momentLabel(date)}${moment ? `, ${moment.kind} moment` : future ? ", future date" : ", empty date"}`}
      disabled={future}
      onPress={onOpen}
      onLongPress={moment ? onHold : undefined}
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
                transition={120}
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
      paddingHorizontal: 24,
      paddingTop: 19,
      paddingBottom: 112,
      minHeight: "100%",
    },
    topline: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      height: 44,
    },
    brandLockup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    brandMark: {
      width: 30,
      height: 30,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: "rgba(226,191,138,0.42)",
      alignItems: "center",
      justifyContent: "center",
    },
    brandMarkText: {
      fontFamily: type.display,
      fontSize: 19,
      lineHeight: 24,
      color: colors.olive,
    },
    brand: {
      color: colors.ink,
      fontFamily: type.display,
      fontSize: 20,
      lineHeight: 26,
    },
    settings: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.chrome,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: "center",
      justifyContent: "center",
    },
    headingRow: {
      marginTop: 44,
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    headingContent: { flex: 1, minWidth: 0 },
    eyebrow: {
      color: colors.muted,
      fontFamily: type.bodySemibold,
      fontSize: 9,
      letterSpacing: 1.6,
      marginBottom: 5,
    },
    monthPicker: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 9,
    },
    monthPickerNarrow: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 0,
    },
    monthTitle: {
      fontFamily: type.display,
      color: colors.ink,
      fontSize: 58,
      lineHeight: 64,
      letterSpacing: -2,
      flexShrink: 1,
    },
    monthTitleNarrow: {
      fontSize: 45,
      lineHeight: 50,
      flexShrink: 0,
    },
    yearText: {
      color: colors.olive,
      fontFamily: type.bodyMedium,
      fontSize: 11,
      letterSpacing: 0.9,
      marginBottom: 10,
    },
    yearTextNarrow: {
      marginBottom: 0,
      marginTop: -2,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      height: 42,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.chrome,
      paddingHorizontal: 3,
      marginBottom: 18,
    },
    arrow: {
      width: 36,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
    },
    arrowDivider: {
      width: 1,
      height: 15,
      backgroundColor: colors.line,
    },
    arrowDisabled: { opacity: 0.35 },
    disabledText: { opacity: 0.35 },
    weekRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 30,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderColor: colors.line,
    },
    weekLabel: {
      textAlign: "center",
      color: colors.muted,
      fontFamily: type.bodySemibold,
      fontSize: 9,
      letterSpacing: 0.5,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 12,
      rowGap: 11,
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
    monthCount: {
      marginTop: 20,
      textAlign: "center",
      color: colors.muted,
      fontFamily: type.displayItalic,
      fontSize: 15,
    },
    bottomBar: {
      position: "absolute",
      alignSelf: "center",
      bottom: Platform.OS === "web" ? 24 : 16,
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.chrome,
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 16 },
      elevation: 10,
    },
    bottomBarCompact: {
      width: 60,
      height: 60,
      borderRadius: 30,
      bottom: 12,
    },
    addButton: {
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonCompact: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    captureMetal: {
      width: 76,
      height: 76,
      borderRadius: 38,
      borderWidth: 1.5,
      borderColor: "rgba(255,239,212,0.35)",
      alignItems: "center",
      justifyContent: "center",
    },
    captureMetalCompact: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    captureFace: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "#2A2019",
      borderWidth: 1,
      borderColor: "rgba(255,244,226,0.16)",
      alignItems: "center",
      justifyContent: "center",
    },
    captureFaceCompact: {
      width: 50,
      height: 50,
      borderRadius: 25,
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
