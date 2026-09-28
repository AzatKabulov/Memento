import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { supabase } from "../../auth/client";
import { useThemedStyles, type ThemeColors, type } from "../../lib/theme";

export default function AuthCallback() {
  const styles = useThemedStyles(createStyles);
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [error, setError] = useState("");
  const missingLink = !supabase || !code;
  useEffect(() => {
    if (!supabase || !code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setError(error.message);
      else router.replace("/");
    });
  }, [code]);
  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.title}>
        {error || missingLink ? "Link needs attention" : "Opening your diary…"}
      </Text>
      {!!(error || missingLink) && (
        <Text style={styles.detail}>
          {error || "This sign-in link could not be opened."}
        </Text>
      )}
      {!!(error || missingLink) && (
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.replace("/auth")}
        >
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.paper,
      justifyContent: "center",
      padding: 30,
    },
    title: { color: colors.ink, fontFamily: type.display, fontSize: 29 },
    detail: { color: colors.muted, fontSize: 14, marginTop: 16 },
    link: { color: colors.ink, fontWeight: "700", marginTop: 25 },
  });
