import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import { supabase } from "../../auth/client";
import {
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
  type,
} from "../../lib/theme";

export default function ResetPassword() {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const missingLink = !supabase || !code;
  useEffect(() => {
    if (!supabase || !code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) setMessage(error.message);
      else setReady(true);
    });
  }, [code]);

  async function update() {
    if (!supabase || password.length < 8) {
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMessage(error.message);
    else router.replace("/");
  }

  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.title}>A new password</Text>
      <Text style={styles.detail}>
        {ready
          ? "Choose a password for your Memento account."
          : message ||
            (missingLink
              ? "This reset link is missing its code."
              : "Checking your link…")}
      </Text>
      {ready && (
        <>
          <TextInput
            accessibilityLabel="New password"
            autoComplete="new-password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="New password"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {!!message && <Text style={styles.detail}>{message}</Text>}
          <TouchableOpacity
            accessibilityRole="button"
            onPress={update}
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Save password</Text>
          </TouchableOpacity>
        </>
      )}
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.replace("/auth")}
      >
        <Text style={styles.link}>Back to sign in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.paper,
      justifyContent: "center",
      padding: 28,
    },
    title: { color: colors.ink, fontFamily: type.display, fontSize: 32 },
    detail: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.card,
      color: colors.ink,
      borderRadius: 22,
      minHeight: 56,
      marginTop: 25,
      paddingHorizontal: 17,
    },
    primary: {
      backgroundColor: colors.plum,
      borderRadius: 28,
      minHeight: 56,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 25,
    },
    primaryText: { color: colors.buttonInk, fontWeight: "700" },
    link: { color: colors.ink, marginTop: 28, fontSize: 13 },
  });
