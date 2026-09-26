import React from "react";
import { Text } from "react-native";
import { colors } from "../lib/theme";

export function ReminderTimePicker({
  hour,
  minute,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const label = new Date(2026, 0, 1, hour, minute).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return <Text style={{ color: colors.ink, fontSize: 14 }}>{label}</Text>;
}
