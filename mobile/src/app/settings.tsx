import React from "react";
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
import { colors, type } from "../lib/theme";
import { useAuth } from "../auth/AuthContext";

const futureAreas = [
  ["Reminders", "A gentle invitation to remember today"],
  ["Appearance", "Light and dark diary themes"],
  ["Video previews", "Quiet playback in the calendar"],
  ["Export diary", "Take your memories with you"],
  ["Account", "Google/Apple sign-in and account deletion"],
];

export default function Settings() {
  const auth = useAuth();
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
          The diary stays yours. Choose how your memories are kept and how
          Memento feels each day.
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
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.push("/backup")}
          style={styles.backupLink}
        >
          <View>
            <Text style={styles.itemTitle}>Backup & restore</Text>
            <Text style={styles.itemText}>
              Your private cloud copy and sync status
            </Text>
          </View>
          <Text style={styles.backupArrow}>›</Text>
        </TouchableOpacity>
        {auth.configured && auth.ownerId && (
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
        )}
        {auth.configured && auth.ownerId && (
          <Text style={styles.signOutNote}>
            Signing out keeps this account’s local diary on this phone. Another
            account cannot open it.
          </Text>
        )}
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
    borderRadius: 26,
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
  signOut: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },
  signOutText: { color: colors.ink, fontWeight: "700" },
  backupLink: {
    marginTop: 14,
    minHeight: 74,
    paddingHorizontal: 17,
    borderRadius: 24,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backupArrow: { color: colors.ink, fontSize: 28 },
  signOutNote: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 10,
  },
});
