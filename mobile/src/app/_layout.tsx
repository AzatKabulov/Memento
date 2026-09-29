import React, { useEffect, useRef, useState } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { InstrumentSerif_400Regular_Italic } from "@expo-google-fonts/instrument-serif/400Regular_Italic";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_500Medium } from "@expo-google-fonts/dm-sans/500Medium";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { DiaryProvider } from "../state/DiaryContext";
import { AuthProvider } from "../auth/AuthContext";
import { BackupProvider } from "../backup/BackupContext";
import { SettingsProvider, useSettings } from "../settings/SettingsContext";
import { useThemeColors } from "../lib/theme";

if (Platform.OS !== "web") {
  SplashScreen.setOptions({ fade: false });
  void SplashScreen.preventAutoHideAsync();
}

function ThemedNavigator() {
  const colors = useThemeColors();
  const { theme } = useSettings();
  return (
    <>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: "fade",
        }}
      />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const [showQuote, setShowQuote] = useState(true);
  const [launchReady, setLaunchReady] = useState(false);
  const [quoteOpacity] = useState(() => new Animated.Value(1));
  const splashHidden = useRef(false);

  useEffect(() => {
    if (!launchReady || (!fontsLoaded && !fontError)) return;
    const timer = setTimeout(() => {
      Animated.timing(quoteOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start(() => setShowQuote(false));
    }, 1150);
    return () => clearTimeout(timer);
  }, [fontsLoaded, fontError, launchReady, quoteOpacity]);

  if (!fontsLoaded && !fontError) return null;
  return (
    <View
      style={styles.root}
      onLayout={() => {
        if (splashHidden.current) return;
        splashHidden.current = true;
        if (Platform.OS === "web") {
          setLaunchReady(true);
        } else {
          void SplashScreen.hideAsync().then(
            () => setTimeout(() => setLaunchReady(true), 1050),
            () => setTimeout(() => setLaunchReady(true), 1050),
          );
        }
      }}
    >
      <AuthProvider>
        <DiaryProvider>
          <SettingsProvider>
            <BackupProvider>
              <ThemedNavigator />
            </BackupProvider>
          </SettingsProvider>
        </DiaryProvider>
      </AuthProvider>
      {showQuote && (
        <Animated.View style={[styles.quoteScreen, { opacity: quoteOpacity }]}>
          <StatusBar style="light" />
          {launchReady && (
            <Text
              style={[
                styles.quote,
                fontsLoaded && { fontFamily: "InstrumentSerif_400Regular" },
              ]}
            >
              Time passes.{"\n"}Moments stay.
            </Text>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  quoteScreen: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#4B3026",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 34,
    zIndex: 100,
  },
  quote: {
    color: "#F6EBDC",
    fontSize: 37,
    lineHeight: 45,
    letterSpacing: 0.3,
    textAlign: "center",
  },
});
