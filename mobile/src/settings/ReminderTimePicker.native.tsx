import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemedStyles, type ThemeColors } from "../lib/theme";

export function ReminderTimePicker({
  hour,
  minute,
  onChange,
}: {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => new Date(2026, 0, 1, hour, minute));
  const label = new Date(2026, 0, 1, hour, minute).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Reminder time ${label}. Change time`}
        style={styles.button}
        onPress={() => {
          setDraft(new Date(2026, 0, 1, hour, minute));
          setOpen(true);
        }}
      >
        <Text style={styles.time}>{label}</Text>
        <Text style={styles.change}>Change</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.picker}>
          <DateTimePicker
            value={draft}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, chosen) => {
              if (Platform.OS === "android") {
                setOpen(false);
                if (event.type === "set" && chosen)
                  onChange(chosen.getHours(), chosen.getMinutes());
              } else if (chosen) setDraft(chosen);
            }}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.done}
              onPress={() => {
                onChange(draft.getHours(), draft.getMinutes());
                setOpen(false);
              }}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    button: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    time: { color: colors.ink, fontSize: 15 },
    change: { color: colors.olive, fontSize: 13, fontWeight: "700" },
    picker: { paddingBottom: 10 },
    done: { minHeight: 44, alignItems: "center", justifyContent: "center" },
    doneText: { color: colors.ink, fontWeight: "700" },
  });
