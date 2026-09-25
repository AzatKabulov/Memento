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
import { colors, type } from "../lib/theme";

const futureAreas = [
  ["Reminders", "A gentle invitation to remember today"],
  ["Appearance", "Light and dark diary themes"],
  ["Video previews", "Quiet playback in the calendar"],
  ["Backup & restore", "A private copy of your memories"],
  ["Export diary", "Take your memories with you"],
  ["Account", "Sign-in, recovery and deletion"],
];

export default function Settings() {
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.back()}
        >
          <Text style={styles.back}>‹ Calendar</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.eyebrow}>YOUR SPACE</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.description}>
          The diary stays yours. These controls will arrive as the private
          storage and account features are built.
        </Text>
        <View style={styles.list}>
          {futureAreas.map(([name, description]) => (
            <View key={name} style={styles.item}>
              <View>
                <Text style={styles.itemTitle}>{name}</Text>
                <Text style={styles.itemText}>{description}</Text>
              </View>
              <Text style={styles.soon}>LATER</Text>
            </View>
          ))}
        </View>
        <Text style={styles.version}>
          Memento prototype · Volume 1 in progress
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  header: { height: 58, paddingHorizontal: 23, justifyContent: "center" },
  back: { color: colors.ink, fontSize: 15 },
  scroll: { paddingHorizontal: 24, paddingTop: 31, paddingBottom: 40 },
  eyebrow: {
    color: colors.olive,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  title: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 36,
    marginTop: 8,
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 13,
  },
  list: {
    marginTop: 30,
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingHorizontal: 17,
  },
  item: {
    minHeight: 75,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  itemText: { color: colors.muted, fontSize: 11, marginTop: 4 },
  soon: {
    color: colors.olive,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
  version: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 11,
    marginTop: 28,
  },
});
