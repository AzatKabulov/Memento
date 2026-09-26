import React from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { colors, type } from "../lib/theme";
import { ReminderTimePicker } from "../settings/ReminderTimePicker";
import { useSettings } from "../settings/SettingsContext";

function SettingLink({
  title,
  detail,
  onPress,
}: {
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.link}
    >
      <View style={styles.linkCopy}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDetail}>{detail}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function Settings() {
  const auth = useAuth();
  const settings = useSettings();
  const update = (work: Promise<void>) => {
    void work.catch(() =>
      Alert.alert("Could not save that setting", "Please try again."),
    );
  };
  const mediaSize =
    settings.savedMediaBytes < 1024 * 1024
      ? `${Math.round(settings.savedMediaBytes / 1024)} KB`
      : `${(settings.savedMediaBytes / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <SafeAreaView style={styles.page}>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.back()}
        style={styles.back}
      >
        <Text style={styles.backText}>‹ Calendar</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your space</Text>
        <Text style={styles.description}>
          A few quiet choices for keeping and revisiting your memories.
        </Text>

        <Text style={styles.sectionTitle}>Everyday</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.itemTitle}>Daily reminder</Text>
              <Text style={styles.itemDetail}>
                A gentle invitation when today is still empty.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily reminder"
              disabled={!settings.available || !settings.ready}
              value={settings.reminderEnabled}
              onValueChange={(value) =>
                update(settings.setReminderEnabled(value))
              }
              trackColor={{ true: colors.olive, false: colors.line }}
            />
          </View>
          {settings.reminderEnabled && (
            <View style={styles.timeRow}>
              <Text style={styles.itemTitle}>Remind me at</Text>
              <ReminderTimePicker
                hour={settings.reminderHour}
                minute={settings.reminderMinute}
                onChange={(hour, minute) =>
                  update(settings.setReminderTime(hour, minute))
                }
              />
              <Text style={styles.itemDetail}>
                Uses your phone’s local time. You can pause this anytime.
              </Text>
            </View>
          )}
          {settings.notificationPermission === "denied" && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.permission}
              onPress={() => void Linking.openSettings()}
            >
              <Text style={styles.permissionText}>
                Notifications are off in system settings. Open settings ›
              </Text>
            </TouchableOpacity>
          )}
          {!!settings.reminderError && (
            <Text style={styles.permissionText}>{settings.reminderError}</Text>
          )}
          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.rowCopy}>
              <Text style={styles.itemTitle}>Calendar video previews</Text>
              <Text style={styles.itemDetail}>
                Play a few visible video dates quietly.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Calendar video previews"
              disabled={!settings.available || !settings.ready}
              value={settings.autoplay}
              onValueChange={(value) => update(settings.setAutoplay(value))}
              trackColor={{ true: colors.olive, false: colors.line }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Keeping your diary</Text>
        <View style={styles.group}>
          <SettingLink
            title="Backup & restore"
            detail="See your private cloud copy and sync status"
            onPress={() => router.push("/backup")}
          />
          <View style={styles.rowDivider} />
          <SettingLink
            title="Export & import"
            detail="Keep a portable copy of your memories"
            onPress={() => router.push("/archive")}
          />
          {settings.available && (
            <View style={styles.usage}>
              <Text style={styles.itemTitle}>Saved on this phone</Text>
              <Text style={styles.itemDetail}>
                {settings.savedCount}{" "}
                {settings.savedCount === 1 ? "memory" : "memories"} ·{" "}
                {mediaSize} of saved media
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>About Memento</Text>
        <View style={styles.group}>
          <View style={styles.staticRow}>
            <Text style={styles.itemTitle}>Appearance</Text>
            <Text style={styles.itemDetail}>
              The diary currently uses its calm dark theme. A light theme is
              still being prepared.
            </Text>
          </View>
          <View style={styles.rowDivider} />
          <SettingLink
            title="Help & privacy"
            detail="How your diary and exports work"
            onPress={() => router.push("/help")}
          />
        </View>

        {auth.configured && auth.ownerId && (
          <>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.signOut}
              onPress={async () => {
                try {
                  await auth.signOut();
                  router.replace("/welcome");
                } catch {
                  Alert.alert("Could not sign out", "Please try again.");
                }
              }}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
            <Text style={styles.signOutNote}>
              Your local diary stays on this phone for this account.
            </Text>
          </>
        )}
        {!settings.available && (
          <Text style={styles.signOutNote}>
            This browser preview uses sample memories. Device settings become
            available after sign-in in the mobile app.
          </Text>
        )}
        <Text style={styles.version}>Memento · Volume 1 in progress</Text>
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
  back: { minHeight: 54, paddingHorizontal: 24, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 15 },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 48 },
  title: { color: colors.ink, fontFamily: type.display, fontSize: 36 },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  sectionTitle: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 23,
    marginTop: 35,
    marginBottom: 13,
  },
  group: {
    backgroundColor: colors.card,
    borderRadius: 25,
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  row: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 14 },
  rowCopy: { flex: 1, paddingVertical: 15 },
  rowDivider: { borderTopWidth: 1, borderTopColor: colors.line },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  itemDetail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  timeRow: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 12,
  },
  permission: {
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    justifyContent: "center",
  },
  permissionText: { color: colors.olive, fontSize: 12, lineHeight: 18 },
  link: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkCopy: { flex: 1, paddingVertical: 12 },
  arrow: { color: colors.ink, fontSize: 27, marginLeft: 12 },
  usage: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingVertical: 18,
  },
  staticRow: { minHeight: 75, justifyContent: "center", paddingVertical: 16 },
  signOut: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
  signOutText: { color: colors.ink, fontWeight: "700" },
  signOutNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 12,
  },
  version: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 27,
  },
});
