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
  savedMediaBytes: number;
  savedCount: number;
  setReminderEnabled: (enabled: boolean) => Promise<void>;
  setReminderTime: (hour: number, minute: number) => Promise<void>;
  setAutoplay: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const unavailable: SettingsState = {
  available: false,
  ready: true,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  notificationPermission: "undetermined",
  reminderError: null,
  autoplay: true,
  savedMediaBytes: 0,
  savedCount: 0,
  setReminderEnabled: async () => {},
  setReminderTime: async () => {},
  setAutoplay: async () => {},
  refresh: async () => {},
};

const Context = createContext(unavailable);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={unavailable}>{children}</Context.Provider>;
}

export function useSettings() {
  return useContext(Context);
}
