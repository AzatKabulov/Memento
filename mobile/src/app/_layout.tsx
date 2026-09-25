import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DiaryProvider } from "../state/DiaryContext";
import { colors } from "../lib/theme";

export default function RootLayout() {
  return (
    <DiaryProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: "fade",
        }}
      />
    </DiaryProvider>
  );
}
