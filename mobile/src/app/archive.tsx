import React, { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  inspectDiaryArchive,
  pickDiaryArchive,
  restoreDiaryArchive,
  shareDiaryArchive,
  type InspectedArchive,
} from "../archive/DiaryArchive";
import { useAuth } from "../auth/AuthContext";
import { colors, type } from "../lib/theme";
import { useDiary } from "../state/DiaryContext";

export default function ArchiveScreen() {
  const auth = useAuth();
  const diary = useDiary();
  const ownerRef = useRef(auth.ownerId);
  useEffect(() => {
    ownerRef.current = auth.ownerId;
  }, [auth.ownerId]);
  const cancelled = useRef(false);
  const lastProgress = useRef(0);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [fraction, setFraction] = useState(0);
  const [inspected, setInspected] = useState<InspectedArchive | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const available = auth.configured && !!auth.ownerId;
  const duplicateCount =
    inspected?.manifest.entries.filter((entry) => !!diary.moments[entry.date])
      .length ?? 0;

  const progress = (label: string, completed: number, total: number) => {
    const now = Date.now();
    if (now - lastProgress.current < 80 && completed < total) return;
    lastProgress.current = now;
    setPhase(label);
    setFraction(total > 0 ? completed / total : 0);
  };
  const start = (ownerId: string) => {
    cancelled.current = false;
    lastProgress.current = 0;
    setBusy(true);
    setMessage(null);
    setFraction(0);
    return () => !cancelled.current && ownerRef.current === ownerId;
  };
  const finish = () => {
    setBusy(false);
    setPhase(null);
    setFraction(0);
  };
  const showError = (error: unknown) => {
    setMessage(
      error instanceof Error
        ? error.message
        : "The archive could not be opened. Try again.",
    );
  };

  const exportAll = async () => {
    if (!auth.ownerId || busy) return;
    const ownerId = auth.ownerId;
    const active = start(ownerId);
    try {
      await shareDiaryArchive(ownerId, progress, active);
      setMessage(
        "The share sheet closed. Check the destination you chose for the archive.",
      );
    } catch (error) {
      showError(error);
    } finally {
      finish();
    }
  };

  const chooseArchive = async () => {
    if (!auth.ownerId || busy) return;
    const ownerId = auth.ownerId;
    try {
      const file = await pickDiaryArchive();
      if (!file) return;
      const active = start(ownerId);
      setInspected(null);
      try {
        const result = await inspectDiaryArchive(file, progress, active);
        setInspected(result);
      } finally {
        finish();
      }
    } catch (error) {
      showError(error);
      finish();
    }
  };

  const importArchive = (duplicates: "skip" | "replace") => {
    if (!inspected || !auth.ownerId || busy) return;
    const run = async () => {
      const ownerId = auth.ownerId!;
      const active = start(ownerId);
      try {
        const result = await restoreDiaryArchive(
          ownerId,
          inspected,
          new Set(Object.keys(diary.moments)),
          duplicates,
          progress,
          active,
        );
        setMessage(
          `${result.restored} ${result.restored === 1 ? "memory" : "memories"} restored${result.skipped ? `; ${result.skipped} existing dates skipped` : ""}.`,
        );
        setInspected(null);
      } catch (error) {
        showError(error);
      } finally {
        try {
          await diary.refresh();
        } catch {
          /* Keep the stored result even if refresh needs a retry. */
        }
        finish();
      }
    };
    if (duplicates === "replace" && duplicateCount) {
      Alert.alert(
        `Replace ${duplicateCount} existing ${duplicateCount === 1 ? "date" : "dates"}?`,
        "The archive copy will replace the moment on this phone for each matching date. You can export your current diary first.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Replace dates",
            style: "destructive",
            onPress: () => void run(),
          },
        ],
      );
    } else void run();
  };

  return (
    <SafeAreaView style={styles.page}>
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.back}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>‹ Settings</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Your diary, to keep</Text>
        <Text style={styles.intro}>
          Save a copy of your photos, videos, dates, and captions to Files or
          another place you trust.
        </Text>
        {!available && (
          <Text style={styles.note}>
            Archive tools are available after sign-in on iPhone and Android.
            This preview contains sample memories.
          </Text>
        )}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Export diary</Text>
          <Text style={styles.detail}>
            Creates one .tar archive with your original saved media and a
            Memento manifest. Exported files are readable by anyone you share
            them with.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!available || busy}
            onPress={() => void exportAll()}
            style={[styles.button, (!available || busy) && styles.disabled]}
          >
            <Text style={styles.buttonText}>Create archive</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Restore from archive</Text>
          <Text style={styles.detail}>
            Memento checks every file before importing. Choose what happens if a
            date already has a memory.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={!available || busy}
            onPress={() => void chooseArchive()}
            style={[
              styles.secondaryButton,
              (!available || busy) && styles.disabled,
            ]}
          >
            <Text style={styles.secondaryText}>Choose archive</Text>
          </TouchableOpacity>
          {inspected && (
            <View style={styles.inspection}>
              <Text style={styles.inspectionTitle}>
                {inspected.manifest.entries.length} memories checked
              </Text>
              <Text style={styles.detail}>
                {duplicateCount} dates are already in this diary.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                disabled={busy}
                onPress={() => importArchive("skip")}
                style={styles.option}
              >
                <Text style={styles.optionText}>Import new dates only</Text>
              </TouchableOpacity>
              {duplicateCount > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={busy}
                  onPress={() => importArchive("replace")}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>
                    Use archive copies for matching dates
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        {busy && (
          <View style={styles.progressBox}>
            <Text style={styles.progress}>
              {phase ?? "Preparing…"} · {Math.round(fraction * 100)}%
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.cancel}
              onPress={() => {
                cancelled.current = true;
                setMessage("Stopping after the current file…");
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
        {!!message && <Text style={styles.message}>{message}</Text>}
        <Text style={styles.footnote}>
          Import works while Memento stays open. If you stop after some dates,
          those already imported remain saved.
        </Text>
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
  back: { minHeight: 54, justifyContent: "center", paddingHorizontal: 24 },
  backText: { color: colors.ink, fontSize: 15 },
  content: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 48 },
  title: { color: colors.ink, fontFamily: type.display, fontSize: 34 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 12 },
  note: { color: colors.muted, fontSize: 12, lineHeight: 19, marginTop: 20 },
  group: {
    marginTop: 31,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  groupTitle: { color: colors.ink, fontFamily: type.display, fontSize: 23 },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  button: {
    minHeight: 52,
    backgroundColor: colors.plum,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  buttonText: { color: colors.buttonInk, fontWeight: "700", fontSize: 14 },
  secondaryButton: {
    minHeight: 52,
    backgroundColor: colors.card,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  secondaryText: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.4 },
  inspection: {
    marginTop: 18,
    padding: 18,
    backgroundColor: colors.card,
    borderRadius: 22,
  },
  inspectionTitle: { color: colors.ink, fontWeight: "700", fontSize: 14 },
  option: {
    minHeight: 48,
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 8,
  },
  optionText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  progressBox: {
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progress: { color: colors.ink, fontSize: 13 },
  cancel: {
    minWidth: 60,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: colors.olive, fontWeight: "700" },
  message: { color: colors.ink, fontSize: 13, lineHeight: 20, marginTop: 20 },
  footnote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 35,
  },
});
