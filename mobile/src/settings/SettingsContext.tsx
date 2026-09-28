import React, { createContext, useContext } from "react";

export type SettingsState = {
  available: boolean;
  ready: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  notificationPermission: "granted" | "denied" | "undetermined";
  reminderError: string | null;
  autoplay: boolean;
  theme: "dark" | "light";
  savedMediaBytes: number;
  savedCount: number;
  setReminderEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setAutoplay: (enabled: boolean) => Promise<void>;
  setTheme: (theme: "dark" | "light") => Promise<void>;
  refresh: () => Promise<void>;
};

const defaults: SettingsState = {
  available: false,
  ready: true,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  notificationPermission: "undetermined",
  reminderError: null,
  autoplay: true,
  theme: "dark",
  savedMediaBytes: 0,
  savedCount: 0,
  setReminderEnabled: async () => {},
  setReminderTime: async () => {},
  setAutoplay: async () => {},
  setTheme: async () => {},
  refresh: async () => {},
};

const Context = createContext(defaults);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<SettingsState["theme"]>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      return window.localStorage.getItem("memento-theme") === "light"
        ? "light"
        : "dark";
    } catch {
      return "dark";
    }
  });
  const value: SettingsState = {
    ...defaults,
    theme,
    setTheme: async (next) => {
      try {
        window.localStorage.setItem("memento-theme", next);
      } catch {
        // The preview remains usable when browser storage is disabled.
      }
      setThemeState(next);
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettings() {
  return useContext(Context);
}
