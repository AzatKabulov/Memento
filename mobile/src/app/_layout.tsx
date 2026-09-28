import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
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
