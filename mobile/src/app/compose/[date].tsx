import React, { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MomentMedia } from "../../components/MomentMedia";
import { diaryDate, momentLabel } from "../../lib/dates";
import { pickMedia, showPickMediaError } from "../../lib/pickMedia";
import { colors, type } from "../../lib/theme";
import { useDiary, type Moment } from "../../state/DiaryContext";

export default function Compose() {
  const params = useLocalSearchParams<{
    date: string;
    uri?: string;
    kind?: "photo" | "video";
  }>();
  const date = params.date;
  const today = diaryDate(new Date());
  const { moments, save } = useDiary();
  const existing = moments[date];
  const [draft, setDraft] = useState<Moment | null>(() =>
    params.uri
      ? {
          date,
          kind: params.kind === "video" ? "video" : "photo",
          uri: params.uri,
          caption: existing?.caption ?? "",
        }
      : (existing ?? null),
  );
  const [caption, setCaption] = useState(existing?.caption ?? "");
  const [saving, setSaving] = useState(false);

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
        uri: asset.uri,
        caption,
        duration: asset.duration,
      });
    } catch (error) {
      showPickMediaError(error);
    }
  }

  function finish() {
    if (!draft || saving) return;
    setSaving(true);
    save({ ...draft, date, caption: caption.trim() });
    router.replace({ pathname: "/moment/[date]", params: { date } });
  }

  function leave() {
    if (
      draft &&
      (!existing || draft.uri !== existing.uri || caption !== existing.caption)
    ) {
      Alert.alert(
        "Leave this draft?",
        "Changes in this prototype will be lost.",
        [
          { text: "Keep writing", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => router.back() },
        ],
      );
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
          {draft ? (
            <MomentMedia moment={draft} size={270} focused={false} />
          ) : (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyGlyph}>＋</Text>
              <Text style={styles.emptyText}>Your moment goes here</Text>
            </View>
          )}
        </View>
        <Text style={styles.fieldLabel}>CHOOSE YOUR MOMENT</Text>
        <View style={styles.sources}>
          {date === today && (
            <TouchableOpacity
              style={styles.source}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/camera", params: { date } })
              }
            >
              <Text style={styles.sourceIcon}>◎</Text>
              <Text style={styles.sourceTitle}>Camera</Text>
              <Text style={styles.sourceHint}>For today</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.source}
            accessibilityRole="button"
            onPress={pickFromLibrary}
          >
            <Text style={styles.sourceIcon}>▧</Text>
            <Text style={styles.sourceTitle}>Photo library</Text>
            <Text style={styles.sourceHint}>Photo or video</Text>
          </TouchableOpacity>
        </View>
        {date !== today && (
          <Text style={styles.guidance}>
            For a past day, choose a photo or video from your library.
          </Text>
        )}
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
        <Text style={styles.prototype}>
          Prototype preview: moments stay in memory while the app is open.
          Private storage and backup are built in later phases.
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.save, !draft && styles.saveDisabled]}
          disabled={!draft || saving}
          accessibilityRole="button"
          onPress={finish}
        >
          <Text style={[styles.saveText, { color: colors.buttonInk }]}>
            Keep this moment
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  sources: { flexDirection: "row", gap: 12 },
  source: {
    flex: 1,
    minHeight: 103,
    borderRadius: 24,
    backgroundColor: colors.card,
    padding: 14,
    justifyContent: "center",
  },
  sourceIcon: { fontSize: 24, color: colors.plum },
  sourceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 6,
  },
  sourceHint: { fontSize: 11, color: colors.muted, marginTop: 2 },
  guidance: { marginTop: 10, color: colors.muted, fontSize: 12 },
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
