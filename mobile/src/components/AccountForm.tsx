import React, { useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import Animated, { FadeIn, ReduceMotion } from "react-native-reanimated";
import { useAuth } from "../auth/AuthContext";
import {
  useThemeColors,
  useThemedStyles,
  type ThemeColors,
  type,
} from "../lib/theme";
import { SoftButton } from "./SoftButton";

type Mode = "signIn" | "signUp" | "reset";
export function AccountForm({ mode = "signIn" }: { mode?: Mode }) {
  const auth = useAuth();
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signUp";
  const reset = mode === "reset";

  async function submit() {
    if (busy) return;
    setMessage("");
    setError(false);
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(true);
      setMessage("Enter a valid email address.");
      return;
    }
    if (!reset && (!password || (signup && password.length < 8))) {
      setError(true);
      setMessage(
        signup
          ? "Use at least 8 characters for your password."
          : "Enter your password.",
      );
      return;
    }
    setBusy(true);
    try {
      if (reset) {
        await auth.sendPasswordReset(address);
        setMessage("Check your email for a password-reset link.");
      } else if (signup) {
        const verification = await auth.signUpEmail(address, password);
        if (verification)
          setMessage("Check your email to confirm your account, then sign in.");
        else router.replace("/");
      } else {
        await auth.signInEmail(address, password);
        router.replace("/");
      }
    } catch (failure) {
      setError(true);
      setMessage(
        failure instanceof Error ? failure.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (auth.ownerId && !auth.loading) return <Redirect href="/" />;

  return (
    <SafeAreaView style={styles.page}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.brand}>
            <View style={styles.mark}>
              <Text style={styles.monogram}>M</Text>
            </View>
            <Text style={styles.wordmark}>Memento</Text>
          </View>
          <Animated.View
            entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}
          >
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>
                {reset
                  ? "A FRESH START"
                  : signup
                    ? "YOUR STORY STARTS HERE"
                    : "A MOMENT TO YOURSELF"}
              </Text>
              <Text style={styles.title}>
                {reset
                  ? "Find your way back."
                  : signup
                    ? "Make room\nfor your moments."
                    : "Your life,\none day at a time."}
              </Text>
              <Text style={styles.subtitle}>
                {reset
                  ? "We’ll send you a link to reset your password."
                  : signup
                    ? "Create your own little corner of time."
                    : "Sign in to pick up where you left off."}
              </Text>
            </View>
            <View style={styles.form}>
              <Text style={styles.label}>Email address</Text>
              <View
                style={[styles.field, focused === "email" && styles.focused]}
              >
                <TextInput
                  accessibilityLabel="Email address"
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                  returnKeyType={reset ? "go" : "next"}
                  onSubmitEditing={() =>
                    reset ? void submit() : passwordRef.current?.focus()
                  }
                />
              </View>
              {!reset && (
                <>
                  <View style={styles.passwordLabel}>
                    <Text style={styles.label}>Password</Text>
                    {!signup && (
                      <Pressable
                        disabled={busy}
                        accessibilityRole="button"
                        style={styles.smallLink}
                        onPress={() => router.push("/auth/forgot-password")}
                      >
                        <Text style={styles.linkText}>Forgot?</Text>
                      </Pressable>
                    )}
                  </View>
                  <View
                    style={[
                      styles.field,
                      focused === "password" && styles.focused,
                    ]}
                  >
                    <TextInput
                      ref={passwordRef}
                      accessibilityLabel="Password"
                      editable={!busy}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={
                        signup ? "new-password" : "current-password"
                      }
                      textContentType={signup ? "newPassword" : "password"}
                      secureTextEntry={!revealed}
                      value={password}
                      onChangeText={setPassword}
                      placeholder={
                        signup ? "At least 8 characters" : "Your password"
                      }
                      placeholderTextColor={colors.muted}
                      style={styles.input}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      returnKeyType="go"
                      onSubmitEditing={() => void submit()}
                    />
                    <Pressable
                      style={styles.reveal}
                      accessibilityRole="button"
                      accessibilityLabel={
                        revealed ? "Hide password" : "Show password"
                      }
                      onPress={() => setRevealed((value) => !value)}
                    >
                      <Svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <Path
                          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                          stroke={colors.muted}
                          strokeWidth={1.5}
                        />
                        <Circle
                          cx={12}
                          cy={12}
                          r={3}
                          stroke={colors.muted}
                          strokeWidth={1.5}
                        />
                        {!revealed && (
                          <Path
                            d="m4 4 16 16"
                            stroke={colors.muted}
                            strokeWidth={1.5}
                          />
                        )}
                      </Svg>
                    </Pressable>
                  </View>
                </>
              )}
              {!!message && (
                <Text
                  accessibilityRole={error ? "alert" : undefined}
                  accessibilityLiveRegion="polite"
                  style={[styles.message, error && { color: colors.warning }]}
                >
                  {message}
                </Text>
              )}
              <SoftButton
                disabled={busy || auth.loading}
                onPress={() => void submit()}
                style={styles.primary}
                accessibilityLabel={
                  signup
                    ? "Create account"
                    : reset
                      ? "Send reset link"
                      : "Sign in"
                }
              >
                {busy || auth.loading ? (
                  <ActivityIndicator color={colors.buttonInk} />
                ) : (
                  <Text style={styles.primaryText}>
                    {signup
                      ? "Create account"
                      : reset
                        ? "Send reset link"
                        : "Sign in"}
                    <Text> →</Text>
                  </Text>
                )}
              </SoftButton>
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>
                  {signup
                    ? "Already have an account?"
                    : reset
                      ? "Remember your password?"
                      : "New to Memento?"}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  style={styles.smallLink}
                  onPress={() =>
                    router.replace(signup || reset ? "/auth" : "/auth/sign-up")
                  }
                >
                  <Text style={styles.switchLink}>
                    {signup || reset ? "Sign in" : "Create account"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
          <Text style={styles.quote}>Collect moments, not things.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.paper },
    content: {
      flexGrow: 1,
      width: "100%",
      maxWidth: 460,
      alignSelf: "center",
      paddingHorizontal: 30,
      paddingTop: 28,
      paddingBottom: 28,
    },
    brand: { flexDirection: "row", alignItems: "center", gap: 10 },
    mark: {
      width: 38,
      height: 42,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.olive,
      alignItems: "center",
      justifyContent: "center",
    },
    monogram: { color: colors.olive, fontFamily: type.display, fontSize: 28 },
    wordmark: { color: colors.ink, fontFamily: type.display, fontSize: 27 },
    heading: { marginTop: 56, marginBottom: 32 },
    eyebrow: {
      color: colors.olive,
      fontFamily: type.bodyMedium,
      fontSize: 9,
      letterSpacing: 1.8,
    },
    title: {
      color: colors.ink,
      fontFamily: type.display,
      fontSize: 48,
      lineHeight: 50,
      marginTop: 14,
      letterSpacing: -0.6,
    },
    subtitle: {
      color: colors.muted,
      fontFamily: type.body,
      fontSize: 13,
      lineHeight: 21,
      marginTop: 16,
    },
    form: { gap: 10 },
    label: { color: colors.ink, fontFamily: type.bodyMedium, fontSize: 12 },
    field: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 56,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.line,
      backgroundColor: colors.card,
    },
    focused: { borderColor: colors.olive },
    input: {
      flex: 1,
      minHeight: 54,
      paddingHorizontal: 18,
      color: colors.ink,
      fontFamily: type.body,
      fontSize: 16,
      ...(Platform.OS === "web" ? { outlineWidth: 0 } : {}),
    },
    reveal: {
      width: 48,
      height: 54,
      justifyContent: "center",
      alignItems: "center",
    },
    passwordLabel: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
    },
    smallLink: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 5,
    },
    linkText: {
      color: colors.muted,
      fontFamily: type.bodyMedium,
      fontSize: 12,
    },
    primary: {
      minHeight: 56,
      borderRadius: 28,
      backgroundColor: colors.plum,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },
    primaryText: {
      color: colors.buttonInk,
      fontFamily: type.bodySemibold,
      fontSize: 15,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      flexWrap: "wrap",
      marginTop: 9,
    },
    switchText: { color: colors.muted, fontFamily: type.body, fontSize: 12 },
    switchLink: {
      color: colors.olive,
      fontFamily: type.bodySemibold,
      fontSize: 12,
    },
    message: {
      color: colors.ink,
      fontFamily: type.body,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 8,
    },
    quote: {
      color: colors.muted,
      fontFamily: type.displayItalic,
      fontSize: 18,
      textAlign: "center",
      marginTop: "auto",
      paddingTop: 38,
    },
  });
