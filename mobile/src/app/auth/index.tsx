import React, { useState } from "react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { colors, type } from "../../lib/theme";

type Mode = "signIn" | "signUp" | "reset";

export default function AccountScreen() {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const address = email.trim().toLowerCase();
      if (!address) throw new Error("Enter your email address.");
      if (mode === "reset") {
        await auth.sendPasswordReset(address);
        setMessage("Check your email for a password-reset link.");
      } else {
        if (!password) throw new Error("Enter your password.");
        if (mode === "signUp") {
          const needsVerification = await auth.signUpEmail(address, password);
          if (needsVerification)
            setMessage(
              "Check your email to verify your account, then sign in.",
            );
          else router.replace("/");
        } else {
          await auth.signInEmail(address, password);
          router.replace("/");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.eyebrow}>YOUR PRIVATE SPACE</Text>
        <Text style={styles.title}>
          {mode === "signUp"
            ? "Begin your diary"
            : mode === "reset"
              ? "Find your way back"
              : "Welcome back"}
        </Text>
        <Text style={styles.intro}>
          {mode === "signUp"
            ? "Create an account to keep your moments yours."
            : mode === "reset"
              ? "We’ll email you a link to choose a new password."
              : "Sign in to open your diary."}
        </Text>
        <View style={styles.form}>
          <Text style={styles.label}>EMAIL</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {mode !== "reset" && (
            <>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                accessibilityLabel="Password"
                autoCapitalize="none"
                autoComplete={
                  mode === "signUp" ? "new-password" : "current-password"
                }
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </>
          )}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <TouchableOpacity
            disabled={busy}
            onPress={submit}
            style={[styles.primary, busy && styles.busy]}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>
              {busy
                ? "Please wait…"
                : mode === "signUp"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send reset link"
                    : "Sign in"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.links}>
          {mode !== "signIn" && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setMode("signIn");
                setMessage("");
              }}
            >
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          )}
          {mode !== "signUp" && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setMode("signUp");
                setMessage("");
              }}
            >
              <Text style={styles.link}>Create an account</Text>
            </TouchableOpacity>
          )}
          {mode !== "reset" && (
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setMode("reset");
                setMessage("");
              }}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.paper },
  content: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 10,
    paddingBottom: 36,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  back: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.ink, fontSize: 15 },
  eyebrow: {
    color: colors.olive,
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "700",
    marginTop: 58,
  },
  title: {
    color: colors.ink,
    fontFamily: type.display,
    fontSize: 36,
    marginTop: 10,
  },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 22, marginTop: 13 },
  form: { marginTop: 44 },
  label: {
    color: colors.olive,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 22,
  },
  input: {
    minHeight: 56,
    borderRadius: 22,
    backgroundColor: colors.card,
    color: colors.ink,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  message: { color: colors.ink, fontSize: 13, lineHeight: 20, marginTop: 20 },
  primary: {
    minHeight: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.plum,
    marginTop: 29,
  },
  busy: { opacity: 0.6 },
  primaryText: { color: colors.buttonInk, fontWeight: "700", fontSize: 15 },
  links: { alignItems: "center", gap: 18, marginTop: 27 },
  link: { color: colors.ink, fontSize: 13 },
});
