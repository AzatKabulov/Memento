import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
  if (!fontsLoaded && !fontError) return null;
  return (
    <AuthProvider>
      <DiaryProvider>
        <SettingsProvider>
          <BackupProvider>
            <ThemedNavigator />
          </BackupProvider>
        </SettingsProvider>
      </DiaryProvider>
    </AuthProvider>
  );
}
