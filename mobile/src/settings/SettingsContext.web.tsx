import React, { createContext, useContext, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useDiary } from "../state/DiaryContext";
import type { SettingsState } from "./SettingsContext";

function readPreference(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(`memento-${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePreference(key: string, value: string) {
  try {
    window.localStorage.setItem(`memento-${key}`, value);
  } catch {
    // Settings still apply for the current session if storage is unavailable.
  }
}

const Context = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const diary = useDiary();
  const [theme, setThemeState] = useState<SettingsState["theme"]>(() =>
    readPreference("theme", "dark") === "light" ? "light" : "dark",
  );
  const [autoplay, setAutoplay] = useState(
    () => readPreference("autoplay", "true") !== "false",
  );
  const savedMoments = Object.values(diary.moments);
  const value = useMemo<SettingsState>(
    () => ({
      available: auth.configured && !!auth.ownerId,
      ready: diary.ready,
      reminderEnabled: false,
      reminderHour: 20,
      reminderMinute: 0,
      notificationPermission: "undetermined",
      reminderError: null,
      autoplay,
      theme,
      savedMediaBytes: savedMoments.reduce(
        (sum, moment) => sum + (moment.cloudBytes ?? 0),
        0,
      ),
      savedCount: savedMoments.length,
      setReminderEnabled: async () => {},
      setReminderTime: async () => {},
      setAutoplay: async (enabled) => {
        writePreference("autoplay", String(enabled));
        setAutoplay(enabled);
      },
      setTheme: async (next) => {
        writePreference("theme", next);
        setThemeState(next);
      },
      refresh: diary.refresh,
    }),
    [
      auth.configured,
      auth.ownerId,
      diary.ready,
      diary.refresh,
      savedMoments,
      autoplay,
      theme,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettings() {
  const state = useContext(Context);
  if (!state) throw new Error("SettingsProvider is missing");
  return state;
}
