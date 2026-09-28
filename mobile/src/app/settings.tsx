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
import {
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
  type,
} from "../lib/theme";
import { ReminderTimePicker } from "../settings/ReminderTimePicker";
import { useSettings } from "../settings/SettingsContext";

function SettingLink({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: string;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      style={styles.link}
    >
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>
      <View style={styles.linkCopy}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDetail}>{detail}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function Settings() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.topline}>
          <Text style={styles.brand}>MEMENTO</Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Back to calendar"
            onPress={() => router.replace("/")}
            style={styles.back}
          >
            <Text style={styles.backText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>Keep your diary yours.</Text>

        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.themeGroup}>
          {(["dark", "light"] as const).map((theme) => (
            <TouchableOpacity
              key={theme}
              accessibilityRole="radio"
              accessibilityState={{ checked: settings.theme === theme }}
              accessibilityLabel={`${theme === "dark" ? "Dark" : "Light"} theme`}
              onPress={() => update(settings.setTheme(theme))}
              style={[
                styles.themeOption,
                settings.theme === theme && styles.themeOptionSelected,
              ]}
            >
              <Text style={styles.themeOptionText}>
                {theme === "dark" ? "Dark" : "Light"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>DAILY RITUAL</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>◷</Text>
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.itemTitle}>Reminder</Text>
              <Text style={styles.itemDetail}>
                {settings.reminderEnabled
                  ? `Every day at ${new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, settings.reminderHour, settings.reminderMinute))}`
                  : "Off · turn on for a gentle nudge"}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Daily reminder"
              disabled={!settings.available || !settings.ready}
              value={settings.reminderEnabled}
              onValueChange={(value) =>
                update(settings.setReminderEnabled(value))
              }
              trackColor={{ true: "#528767", false: colors.line }}
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
        </View>

        <Text style={styles.sectionTitle}>YOUR DATA</Text>
        <View style={styles.group}>
          <SettingLink
            icon="☁"
            title="Cloud backup"
            detail="See backup and restore status"
            onPress={() => router.push("/backup")}
          />
          <SettingLink
            icon="⇧"
            title="Export diary"
            detail="Take a portable copy of your memories"
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

        {auth.configured && auth.ownerId && (
          <>
            <Text style={styles.sectionTitle}>ACCOUNT</Text>
            <View style={styles.group}>
              <SettingLink
                icon="○"
                title="Account"
                detail={auth.email ?? "Email account"}
                onPress={() =>
                  Alert.alert("Account", auth.email ?? "Signed in with email", [
                    {
                      text: "Sign out",
                      onPress: async () => {
                        try {
                          await auth.signOut();
                          router.replace("/welcome");
                        } catch {
                          Alert.alert(
                            "Could not sign out",
                            "Please try again.",
                          );
                        }
                      },
                    },
                    { text: "Cancel", style: "cancel" },
                  ])
                }
              />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>▶</Text>
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.itemTitle}>Video previews</Text>
              <Text style={styles.itemDetail}>
                Play visible calendar videos quietly.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Calendar video previews"
              disabled={!settings.available || !settings.ready}
              value={settings.autoplay}
              onValueChange={(value) => update(settings.setAutoplay(value))}
              trackColor={{ true: "#528767", false: colors.line }}
            />
          </View>
          <SettingLink
            icon="?"
            title="Help & privacy"
            detail="How your diary and exports work"
            onPress={() => router.push("/help")}
          />
        </View>

        {!settings.available && (
          <Text style={styles.signOutNote}>
            This browser preview uses sample memories. Device settings become
            available after sign-in in the mobile app.
          </Text>
        )}
        <Text style={styles.version}>
          Memento never has a public profile, feed, likes, or streaks.
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    back: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    backText: { color: colors.ink, fontSize: 24, lineHeight: 27 },
    scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 48 },
    title: {
      color: colors.ink,
      fontFamily: type.display,
      fontSize: 38,
      fontWeight: "700",
      marginTop: 8,
    },
    description: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 22,
      marginTop: 2,
    },
    sectionTitle: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1.2,
      marginTop: 31,
      marginBottom: 9,
      marginLeft: 3,
    },
    themeGroup: {
      flexDirection: "row",
      padding: 5,
      gap: 5,
      borderRadius: 23,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.line,
    },
    themeOption: {
      flex: 1,
      minHeight: 44,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    themeOptionSelected: { backgroundColor: colors.blush },
    themeOptionText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
    group: {
      gap: 9,
    },
    row: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.iconSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    iconText: { color: colors.ink, fontSize: 19, fontWeight: "600" },
    rowCopy: { flex: 1, paddingVertical: 15 },
    itemTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
    itemDetail: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    timeRow: {
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: 22,
      padding: 16,
    },
    permission: {
      minHeight: 48,
      borderTopWidth: 1,
      borderTopColor: colors.line,
      justifyContent: "center",
    },
    permissionText: { color: colors.olive, fontSize: 12, lineHeight: 18 },
    link: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    linkCopy: { flex: 1, paddingVertical: 12 },
    arrow: { color: colors.muted, fontSize: 27, marginLeft: 6 },
    usage: {
      padding: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
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
      marginTop: 29,
      lineHeight: 16,
    },
  });
