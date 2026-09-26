import React, { useRef, useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useBackup } from "../backup/BackupContext";
import type { BackupConflict } from "../backup/types";
import { MomentMedia } from "../components/MomentMedia";
import { momentLabel } from "../lib/dates";
import { colors, type } from "../lib/theme";
import { useDiary, type Moment } from "../state/DiaryContext";

export default function BackupScreen() {
  const backup = useBackup();
  const diary = useDiary();
  const { width } = useWindowDimensions();
  const mediaSize = Math.min(width - 90, 240);
  const [selected, setSelected] = useState<BackupConflict | null>(null);
  const [cloudMoment, setCloudMoment] = useState<Moment | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const previewRequest = useRef(0);
  const previewUri = useRef<string | null>(null);
  const summary = backup.summary;
  const status = !backup.available
    ? "On this phone"
    : backup.busy
      ? "Checking backup"
      : summary?.conflicts.length || summary?.needsAttention || backup.error
        ? "Needs attention"
        : summary?.pending
          ? "Waiting to back up"
          : summary?.lastSynced
            ? "Backed up"
            : "On this phone";

  const closeCompare = () => {
    previewRequest.current += 1;
    if (previewUri.current) backup.releaseCloudPreview(previewUri.current);
    previewUri.current = null;
    setSelected(null);
    setCloudMoment(null);
    setLoadingPreview(false);
  };
  const compare = async (conflict: BackupConflict) => {
    const request = ++previewRequest.current;
    setSelected(conflict);
    setCloudMoment(null);
    setPreviewError(false);
    setLoadingPreview(!conflict.remote.deleted_at);
    if (conflict.remote.deleted_at) return;
    try {
      const moment = await backup.loadCloudPreview(conflict);
      if (request !== previewRequest.current) {
        if (moment?.uri) backup.releaseCloudPreview(moment.uri);
        return;
      }
      previewUri.current = moment?.uri ?? null;
      setCloudMoment(moment);
      if (!moment) setPreviewError(true);
    } catch {
      if (request === previewRequest.current) setPreviewError(true);
    } finally {
      if (request === previewRequest.current) setLoadingPreview(false);
    }
  };
  const resolve = (choice: "phone" | "cloud") => {
    if (!selected) return;
    Alert.alert(
      choice === "phone" ? "Keep this phone’s copy?" : "Use the cloud copy?",
      "The other copy will be replaced after you confirm. Both copies remain untouched until then.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Use this copy",
          onPress: async () => {
            try {
              await backup.resolve(selected, choice);
              closeCompare();
            } catch {
              Alert.alert(
                "Could not resolve this date",
                "Your copies are still preserved. Please try again.",
              );
            }
          },
        },
      ],
    );
  };
  const canChoose =
    !!selected &&
    !backup.busy &&
    !loadingPreview &&
    !previewError &&
    (!!selected.remote.deleted_at || !!cloudMoment);

  return (
    <SafeAreaView style={styles.page}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Settings</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>KEEP YOUR MEMORIES</Text>
        <Text style={styles.title}>Backup & restore</Text>
        <Text style={styles.intro}>
          Your phone keeps the diary first. When connected, Memento makes a
          private copy for your account.
        </Text>
        <View style={styles.statusCard}>
          <Text style={styles.cardLabel}>CURRENT STATE</Text>
          <Text style={styles.status}>{status}</Text>
          {!backup.available ? (
            <Text style={styles.detail}>
              This preview has sample memories only. Cloud backup is available
              in the iPhone and Android app after sign-in.
            </Text>
          ) : (
            <>
              <Text style={styles.detail}>
                {backup.busy
                  ? (backup.phase ?? "Checking your diary…")
                  : backup.connection === "wifi"
                    ? "Waiting for Wi-Fi. Your moments stay on this phone."
                    : backup.connection === "offline"
                      ? "Waiting for a connection. Your moments stay on this phone."
                      : summary?.pending
                        ? `${summary.pending} ${summary.pending === 1 ? "change" : "changes"} waiting.`
                        : "Your account’s cloud copy was checked."}
              </Text>
              {backup.fraction != null && (
                <Text style={styles.progress}>
                  {Math.round(backup.fraction * 100)}% transferred
                </Text>
              )}
              {summary?.lastSynced && (
                <Text style={styles.lastCheck}>
                  Last cloud check:{" "}
                  {new Date(summary.lastSynced).toLocaleString()}
                </Text>
              )}
            </>
          )}
        </View>
        {!!backup.error && <Text style={styles.error}>{backup.error}</Text>}
        {backup.available && (
          <>
            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Wi-Fi only</Text>
                <Text style={styles.settingHint}>
                  Wait for Wi-Fi before uploading or restoring media.
                </Text>
              </View>
              <Switch
                value={summary?.wifiOnly ?? true}
                onValueChange={(value) => void backup.setWifiOnly(value)}
                accessibilityLabel="Wi-Fi only backup"
                trackColor={{ true: colors.olive, false: colors.line }}
              />
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={backup.busy}
              onPress={() => void backup.syncNow(true)}
              style={[styles.syncButton, backup.busy && styles.disabled]}
            >
              <Text style={styles.syncText}>
                {backup.busy ? "Syncing…" : "Sync now"}
              </Text>
            </TouchableOpacity>
            {!!summary?.conflicts.length && (
              <View style={styles.conflicts}>
                <Text style={styles.sectionTitle}>Dates to decide</Text>
                <Text style={styles.sectionNote}>
                  Two devices changed these dates. Compare both copies before
                  choosing.
                </Text>
                {summary.conflicts.map((conflict) => (
                  <TouchableOpacity
                    key={conflict.date}
                    accessibilityRole="button"
                    onPress={() => void compare(conflict)}
                    style={styles.conflictRow}
                  >
                    <Text style={styles.conflictDate}>
                      {momentLabel(conflict.date)}
                    </Text>
                    <Text style={styles.compare}>Compare ›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
        <Text style={styles.note}>
          Backup runs while Memento is open and connectivity allows. A cloud
          copy reflects synced changes; it is not a separate history of every
          past version.
        </Text>
      </ScrollView>
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeCompare}
      >
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Compare this day</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={closeCompare}
              style={styles.done}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
          {selected && (
            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalDate}>{momentLabel(selected.date)}</Text>
              <Text style={styles.copyLabel}>ON THIS PHONE</Text>
              {diary.moments[selected.date] ? (
                <>
                  <MomentMedia
                    moment={diary.moments[selected.date]}
                    size={mediaSize}
                    focused={false}
                  />
                  <Text style={styles.copyCaption}>
                    {diary.moments[selected.date].caption || "No caption"}
                  </Text>
                </>
              ) : (
                <Text style={styles.deleted}>Removed on this phone</Text>
              )}
              <Text style={styles.copyLabel}>IN THE CLOUD</Text>
              {selected.remote.deleted_at ? (
                <Text style={styles.deleted}>Removed on another device</Text>
              ) : loadingPreview ? (
                <Text style={styles.deleted}>Loading the other copy…</Text>
              ) : previewError || !cloudMoment ? (
                <Text style={styles.deleted}>
                  Could not load the cloud media. Close and try again.
                </Text>
              ) : (
                <>
                  <MomentMedia
                    moment={cloudMoment}
                    size={mediaSize}
                    focused={false}
                  />
                  <Text style={styles.copyCaption}>
                    {cloudMoment.caption || "No caption"}
                  </Text>
                </>
              )}
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!canChoose}
                  onPress={() => resolve("phone")}
                  style={[styles.choice, !canChoose && styles.disabled]}
                >
                  <Text style={styles.choiceText}>Keep phone copy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={!canChoose}
                  onPress={() => resolve("cloud")}
                  style={[styles.choice, !canChoose && styles.disabled]}
                >
                  <Text style={styles.choiceText}>Use cloud copy</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 50 },
  eyebrow: {
    color: colors.olive,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  title: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 34,
    marginTop: 8,
  },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 13 },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    padding: 21,
    marginTop: 30,
  },
  cardLabel: {
    color: colors.olive,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  status: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 26,
    marginTop: 8,
  },
  detail: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 },
  progress: { color: colors.ink, fontSize: 12, marginTop: 10 },
  lastCheck: { color: colors.muted, fontSize: 11, marginTop: 14 },
  error: { color: "#EAAFA6", fontSize: 12, lineHeight: 18, marginTop: 14 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 28,
  },
  settingCopy: { flex: 1 },
  settingTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  settingHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 5,
  },
  syncButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.plum,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  syncText: { color: colors.buttonInk, fontWeight: "700", fontSize: 14 },
  disabled: { opacity: 0.4 },
  conflicts: { marginTop: 34 },
  sectionTitle: { color: colors.ink, fontFamily: type.display, fontSize: 23 },
  sectionNote: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  conflictRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conflictDate: { color: colors.ink, fontSize: 13 },
  compare: { color: colors.olive, fontSize: 12, fontWeight: "700" },
  note: { color: colors.muted, fontSize: 11, lineHeight: 18, marginTop: 32 },
  modalPage: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 58,
  },
  modalTitle: { color: colors.ink, fontFamily: type.display, fontSize: 24 },
  done: { minWidth: 48, minHeight: 44, justifyContent: "center" },
  doneText: { color: colors.ink, fontWeight: "700" },
  modalContent: { paddingBottom: 50, alignItems: "center" },
  modalDate: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 20,
    marginTop: 14,
  },
  copyLabel: {
    color: colors.olive,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 28,
    marginBottom: 11,
  },
  copyCaption: {
    color: colors.ink,
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  deleted: { color: colors.muted, fontSize: 13, padding: 25 },
  choiceRow: { flexDirection: "row", gap: 10, marginTop: 30 },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 9,
  },
  choiceText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
