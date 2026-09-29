import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import {
  Alert,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { MomentMedia } from "../../components/MomentMedia";
import { PhotoFramer } from "../../components/PhotoFramer";
import {
  focalPoint,
  frameForFocalY,
  type FocalPoint,
} from "../../lib/photoFrame";
import { diaryDate, momentLabel } from "../../lib/dates";
import { pickMedia, showPickMediaError } from "../../lib/pickMedia";
import {
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
  type,
} from "../../lib/theme";
import { useDiary, type Moment } from "../../state/DiaryContext";
import { useAuth } from "../../auth/AuthContext";

export default function Compose() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { width, height } = useWindowDimensions();
  const cropSize = Math.min(width - 64, height - 220, 340);
  const params = useLocalSearchParams<{
    date: string;
    uri?: string;
    kind?: "photo" | "video";
    source?: "camera" | "library";
    duration?: string;
  }>();
  const date = params.date;
  const today = diaryDate(new Date());
  const { moments, save } = useDiary();
  const auth = useAuth();
  const existing = moments[date];
  const [draft, setDraft] = useState<Moment | null>(() =>
    params.uri
      ? {
          date,
          kind: params.kind === "video" ? "video" : "photo",
          source: params.source === "camera" ? "camera" : "library",
          uri: params.uri,
          caption: existing?.caption ?? "",
          duration: params.duration ? Number(params.duration) : undefined,
          frame: "center",
          focalX: 50,
          focalY: 50,
        }
      : (existing ?? null),
  );
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [saving, setSaving] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropStart, setCropStart] = useState<FocalPoint | null>(null);

  if (!date || date > today)
    return (
      <SafeAreaView style={styles.page}>
        <Text style={styles.invalid}>This date is not available.</Text>
      </SafeAreaView>
    );

  async function pickFromLibrary() {
    try {
      const asset = await pickMedia();
      if (!asset) return;
      setDraft({
        date,
        kind: asset.kind,
        source: "library",
        uri: asset.uri,
        caption,
        duration: asset.duration,
        frame: "center",
        focalX: 50,
        focalY: 50,
      });
    } catch (error) {
      showPickMediaError(error);
    }
  }

  async function finish() {
    if (!draft || saving) return;
    setSaving(true);
    try {
      await save({
        ...draft,
        date,
        caption: caption.trim(),
        frame: frameForFocalY(focalPoint(draft).y),
      });
      router.replace({ pathname: "/moment/[date]", params: { date } });
    } catch (error) {
      Alert.alert(
        "Could not save this moment",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openCrop() {
    if (draft?.kind !== "photo") return;
    Keyboard.dismiss();
    setCropStart(focalPoint(draft));
    setCropOpen(true);
  }

  function cancelCrop() {
    if (cropStart)
      setDraft((current) =>
        current?.kind === "photo"
          ? { ...current, focalX: cropStart.x, focalY: cropStart.y }
          : current,
      );
    setCropOpen(false);
    setCropStart(null);
  }

  function keepCrop() {
    setCropOpen(false);
    setCropStart(null);
  }

  function leave() {
    if (
      draft &&
      (!existing ||
        draft.uri !== existing.uri ||
        caption !== existing.caption ||
        focalPoint(draft).x !== focalPoint(existing).x ||
        focalPoint(draft).y !== focalPoint(existing).y)
    ) {
      Alert.alert("Leave this draft?", "Unsaved changes will be lost.", [
        { text: "Keep writing", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => router.back() },
      ]);
    } else router.back();
  }

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={leave}
          style={styles.back}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {existing ? "Edit moment" : "New moment"}
        </Text>
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>A MOMENT FOR</Text>
        <Text style={styles.date}>{momentLabel(date)}</Text>
        <View style={styles.preview}>
          {draft?.kind === "photo" ? (
            <Pressable
              onPress={openCrop}
              accessibilityRole="button"
              accessibilityLabel="Adjust photo position in calendar"
              accessibilityHint="Opens a focused photo positioning view"
              style={styles.adjustTrigger}
            >
              <MomentMedia moment={draft} size={270} focused={false} />
              <View style={styles.adjustLabel} pointerEvents="none">
                <Text style={styles.adjustLabelText}>Adjust photo</Text>
              </View>
            </Pressable>
          ) : draft ? (
            <MomentMedia moment={draft} size={270} focused={false} />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyGlyph}>＋</Text>
              <Text style={styles.emptyText}>Your moment goes here</Text>
            </View>
          )}
        </View>
        {draft?.kind === "photo" && (
          <View style={styles.framing}>
            <Text style={styles.fieldLabel}>POSITION IN YOUR CALENDAR</Text>
            <Text style={styles.frameHint}>
              Tap to adjust its calendar crop.
            </Text>
          </View>
        )}
        <Text style={styles.fieldLabel}>CHOOSE YOUR MOMENT</Text>
        <View style={styles.sources}>
          {date === today && (
            <Pressable
              style={styles.source}
              accessibilityRole="button"
              accessibilityLabel="Take a photo or video"
              onPress={() =>
                router.push({ pathname: "/camera", params: { date } })
              }
            >
              <View style={styles.sourceBadge}>
                <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M3 7.5h3l1.5-2h9l1.5 2h3v11H3v-11Z"
                    stroke={colors.olive}
                    strokeWidth={1.6}
                    strokeLinejoin="round"
                  />
                  <Circle
                    cx={12}
                    cy={13}
                    r={3.2}
                    stroke={colors.olive}
                    strokeWidth={1.6}
                  />
                </Svg>
              </View>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>Camera</Text>
                <Text style={styles.sourceHint}>Capture today</Text>
              </View>
              <Text style={styles.sourceArrow}>›</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.source}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo or video from your library"
            onPress={pickFromLibrary}
          >
            <View style={styles.sourceBadge}>
              <Svg width={25} height={25} viewBox="0 0 24 24" fill="none">
                <Rect
                  x={3}
                  y={4}
                  width={18}
                  height={16}
                  rx={2.5}
                  stroke={colors.olive}
                  strokeWidth={1.6}
                />
                <Circle
                  cx={16.5}
                  cy={9}
                  r={1.5}
                  stroke={colors.olive}
                  strokeWidth={1.4}
                />
                <Path
                  d="m4 17 5-5 4 4 2-2 5 4"
                  stroke={colors.olive}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <View style={styles.sourceCopy}>
              <Text style={styles.sourceTitle}>Photo library</Text>
              <Text style={styles.sourceHint}>Choose a photo or video</Text>
            </View>
            <Text style={styles.sourceArrow}>›</Text>
          </Pressable>
        </View>
        <Text style={styles.fieldLabel}>A FEW WORDS, IF YOU LIKE</Text>
        <TextInput
          multiline
          value={caption}
          onChangeText={setCaption}
          maxLength={500}
          placeholder="What would you like to remember?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          accessibilityLabel="Moment caption"
        />
        <Text style={styles.counter}>{caption.length}/500</Text>
        {!auth.configured && (
          <Text style={styles.prototype}>
            Preview mode: changes are cleared when you close the app.
          </Text>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.save, !draft && styles.saveDisabled]}
          disabled={!draft || saving}
          accessibilityRole="button"
          accessibilityState={{ busy: saving, disabled: !draft || saving }}
          onPress={finish}
        >
          <Text style={[styles.saveText, { color: colors.buttonInk }]}>
            {saving ? "Preparing your moment…" : "Keep this moment"}
          </Text>
        </TouchableOpacity>
      </View>
      <Modal
        visible={cropOpen && draft?.kind === "photo"}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={cancelCrop}
      >
        <SafeAreaView style={styles.cropBackdrop}>
          <View style={styles.cropPanel}>
            <View style={styles.cropHeader}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={cancelCrop}
                style={styles.cropAction}
              >
                <Text style={styles.cropCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.cropTitle}>Position photo</Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={keepCrop}
                style={styles.cropAction}
              >
                <Text style={styles.cropDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
            {draft?.kind === "photo" && (
              <PhotoFramer
                key={draft.uri ?? "sample"}
                moment={draft}
                size={cropSize}
                onChange={(x, y) =>
                  setDraft((current) =>
                    current ? { ...current, focalX: x, focalY: y } : current,
                  )
                }
              />
            )}
            <Text style={styles.cropHint}>Drag to reposition.</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.paper },
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      height: 58,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    back: { width: 44, height: 44, justifyContent: "center" },
    backText: { fontSize: 36, color: colors.ink, marginTop: -8 },
    headerTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
    scroll: { paddingHorizontal: 24, paddingBottom: 110 },
    eyebrow: {
      color: colors.olive,
      fontWeight: "700",
      letterSpacing: 1.8,
      fontSize: 10,
      marginTop: 26,
    },
    date: {
      fontFamily: type.display,
      fontSize: 28,
      color: colors.ink,
      marginTop: 7,
    },
    preview: {
      height: 310,
      marginTop: 25,
      borderRadius: 25,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
    },
    adjustTrigger: {
      width: 270,
      height: 270,
      borderRadius: 20,
      overflow: "hidden",
    },
    adjustLabel: {
      position: "absolute",
      bottom: 12,
      alignSelf: "center",
      borderRadius: 16,
      paddingHorizontal: 15,
      paddingVertical: 8,
      backgroundColor: "rgba(23,18,15,0.8)",
    },
    adjustLabelText: { color: "#F2EADB", fontSize: 12, fontWeight: "700" },
    cropBackdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 12,
      backgroundColor: "rgba(12,9,7,0.8)",
    },
    cropPanel: {
      width: "100%",
      maxWidth: 430,
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 24,
      borderRadius: 28,
      backgroundColor: colors.card,
    },
    cropHeader: {
      width: "100%",
      height: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    cropAction: {
      minWidth: 56,
      minHeight: 48,
      justifyContent: "center",
    },
    cropCancelText: { color: colors.muted, fontSize: 14 },
    cropDoneText: {
      color: colors.olive,
      fontSize: 14,
      fontWeight: "700",
      textAlign: "right",
    },
    cropTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
    cropHint: {
      color: colors.muted,
      fontSize: 13,
      textAlign: "center",
      marginTop: 20,
    },
    emptyPreview: { alignItems: "center" },
    emptyGlyph: { fontSize: 48, color: colors.blush },
    emptyText: {
      fontFamily: type.display,
      color: colors.muted,
      fontSize: 17,
      marginTop: 6,
    },
    fieldLabel: {
      color: colors.muted,
      fontWeight: "700",
      letterSpacing: 1.5,
      fontSize: 10,
      marginTop: 27,
      marginBottom: 12,
    },
    framing: { marginTop: 7 },
    frameHint: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 12,
    },
    sources: { gap: 10 },
    source: {
      minHeight: 76,
      borderRadius: 22,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
      paddingHorizontal: 15,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
    },
    sourceBadge: {
      width: 46,
      height: 46,
      borderRadius: 18,
      backgroundColor: colors.iconSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    sourceCopy: { flex: 1 },
    sourceTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.ink,
    },
    sourceHint: { fontSize: 12, color: colors.muted, marginTop: 3 },
    sourceArrow: { fontSize: 28, color: colors.muted, marginTop: -3 },
    input: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 16,
      minHeight: 105,
      textAlignVertical: "top",
      color: colors.ink,
      fontSize: 15,
    },
    counter: {
      textAlign: "right",
      color: colors.muted,
      fontSize: 11,
      marginTop: 6,
    },
    prototype: {
      color: colors.muted,
      fontSize: 11,
      lineHeight: 17,
      marginTop: 22,
    },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 20,
      backgroundColor: colors.paper,
      borderTopWidth: 1,
      borderColor: colors.line,
    },
    save: {
      height: 55,
      borderRadius: 28,
      backgroundColor: colors.plum,
      alignItems: "center",
      justifyContent: "center",
    },
    saveDisabled: { opacity: 0.4 },
    saveText: { color: colors.white, fontWeight: "700", fontSize: 15 },
    invalid: { color: colors.ink, padding: 24 },
  });
