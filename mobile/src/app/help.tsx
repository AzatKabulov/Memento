import React from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemedStyles, type ThemeColors, type } from "../lib/theme";

const notes = [
  [
    "One day, one moment",
    "Tap an empty date to add a photo or video. For a past date, choose media from your library. You can replace a moment later.",
  ],
  [
    "Gentle reminders",
    "Reminders are optional and only scheduled for dates without a saved moment. They follow your phone’s local time when Memento opens or returns to the foreground.",
  ],
  [
    "Private by default",
    "Volume 1 has no sharing calendar or public profile. Signed-in accounts keep separate local diaries. Cloud copies depend on a connected backup service and your backup status.",
  ],
  [
    "Keep your own copy",
    "Export & import creates a portable archive of saved media, dates, and captions. Anyone with that archive can read it, so keep it in a place you trust.",
  ],
  [
    "Leaving this phone",
    "Before changing phones, check Backup & restore and save an archive. Sign-out leaves this account’s local diary on this phone.",
  ],
];

export default function HelpScreen() {
  const styles = useThemedStyles(createStyles);
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
        <Text style={styles.title}>A little guidance</Text>
        <Text style={styles.intro}>
          Memento is a private place for ordinary days. Missing one is okay.
        </Text>
        {notes.map(([title, body]) => (
          <View key={title} style={styles.note}>
            <Text style={styles.heading}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        ))}
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
    back: { minHeight: 54, paddingHorizontal: 24, justifyContent: "center" },
    backText: { color: colors.ink, fontSize: 15 },
    content: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 48 },
    title: { color: colors.ink, fontFamily: type.display, fontSize: 34 },
    intro: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 22,
      marginTop: 11,
      marginBottom: 15,
    },
    note: {
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    heading: { color: colors.ink, fontSize: 15, fontWeight: "700" },
    body: { color: colors.muted, fontSize: 13, lineHeight: 21, marginTop: 7 },
  });
