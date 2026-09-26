import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DiaryProvider } from "../state/DiaryContext";
import { AuthProvider } from "../auth/AuthContext";
import { BackupProvider } from "../backup/BackupContext";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <DiaryProvider>
        <BackupProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
              animation: "fade",
            }}
          />
        </BackupProvider>
      </DiaryProvider>
    </AuthProvider>
  );
}
