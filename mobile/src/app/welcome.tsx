import React from "react";
import { router } from "expo-router";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, type } from "../lib/theme";
import { useDiary } from "../state/DiaryContext";

export default function Welcome() {
  const { enter } = useDiary();
  const start = () => {
    enter();
    router.replace("/");
  };
  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>A LITTLE SPACE FOR YOUR DAYS</Text>
        <Text style={styles.title}>Memento</Text>
        <Text style={styles.subtitle}>
          One moment a day.{"\n"}A life to look back on.
        </Text>
        <View style={styles.artWrap}>
          <Image
            source={require("../../assets/samples/rainy-window.png")}
            contentFit="cover"
            style={styles.backPhoto}
          />
          <Image
            source={require("../../assets/samples/morning-kitchen.png")}
            contentFit="cover"
            style={styles.frontPhoto}
          />
          <View style={styles.note}>
            <Text style={styles.noteText}>Keep the ordinary.</Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.primary}
          onPress={start}
        >
          <Text style={[styles.primaryText, { color: colors.buttonInk }]}>
            Open diary prototype
          </Text>
        </TouchableOpacity>
        <Text style={styles.noteBottom}>
          Account sign-in is a Volume 1 feature coming in Phase 4. This preview
          uses sample memories and does not save after restart.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 55,
    paddingBottom: 28,
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    fontFamily: type.display,
    color: colors.ink,
    fontSize: 55,
    marginTop: 5,
  },
  subtitle: { color: colors.ink, fontSize: 20, lineHeight: 30, marginTop: 12 },
  artWrap: {
    flex: 1,
    maxHeight: 390,
    marginVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  backPhoto: {
    width: 220,
    height: 270,
    borderRadius: 26,
    transform: [{ rotate: "9deg" }],
    position: "absolute",
    right: 14,
    top: 38,
  },
  frontPhoto: {
    width: 230,
    height: 290,
    borderRadius: 26,
    transform: [{ rotate: "-8deg" }],
    position: "absolute",
    left: 13,
    top: 9,
  },
  note: {
    backgroundColor: colors.card,
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 19,
    transform: [{ rotate: "-5deg" }],
    position: "absolute",
    bottom: 15,
    right: 4,
  },
  noteText: {
    fontFamily: type.display,
    fontStyle: "italic",
    fontSize: 17,
    color: colors.plum,
  },
  primary: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.plum,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  noteBottom: {
    textAlign: "center",
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 18,
  },
});
