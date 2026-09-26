import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import { AppState, Platform } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { diaryDate } from "../lib/dates";
import { useDiary } from "../state/DiaryContext";
import {
  loadLocalSettings,
  saveLocalSetting,
  type LocalSettings,
} from "../storage/SettingsStore.native";
import { reminderDates } from "./reminderDates";
import type { SettingsState } from "./SettingsContext";

const Context = createContext<SettingsState | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function permission() {
  const result = await Notifications.getPermissionsAsync();
  return result.granted
    ? "granted"
    : result.status === "denied"
      ? "denied"
      : "undetermined";
}

async function reconcile(
  ownerId: string | null,
  settings: LocalSettings | null,
  savedDates: ReadonlySet<string>,
  allowed: boolean,
) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter(
    (request) => request.content.data?.mementoReminder === true,
  );
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local";
  const wanted = new Map<string, Date>();
  if (ownerId && settings?.reminderEnabled && allowed) {
    for (const item of reminderDates(
      diaryDate(now),
      settings.reminderHour,
      settings.reminderMinute,
      savedDates,
      now,
    ))
      wanted.set(
        `${ownerId}:${item.date}:${settings.reminderHour}:${settings.reminderMinute}:${timezone}`,
        item.at,
      );
  }
  const retained = new Set<string>();
  for (const request of ours) {
    const key = String(request.content.data?.mementoKey ?? "");
    if (wanted.has(key) && !retained.has(key)) retained.add(key);
    else
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
  if (!wanted.size) return;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("gentle-reminders", {
      name: "Daily memories",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  for (const [key, at] of wanted) {
    if (retained.has(key)) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "A moment for today",
        body: "If you feel like it, save one little memory.",
        data: { mementoReminder: true, mementoKey: key },
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
        ...(Platform.OS === "android" ? { channelId: "gentle-reminders" } : {}),
      },
    });
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const diary = useDiary();
  const [stored, setStored] = useState<{
    ownerId: string;
    value: LocalSettings;
  } | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<SettingsState["notificationPermission"]>("undetermined");
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [activity, setActivity] = useState(0);
  const queue = useRef(Promise.resolve());
  const ownerId = auth.ownerId;
  const settings = stored?.ownerId === ownerId ? stored.value : null;

  const refresh = useCallback(async () => {
    const currentPermission = await permission();
    setNotificationPermission(currentPermission);
    if (!ownerId) return;
    const value = await loadLocalSettings(ownerId);
    setStored({ ownerId, value });
  }, [ownerId]);

  useEffect(() => {
    void Promise.resolve()
      .then(refresh)
      .catch(() =>
        setReminderError(
          "Settings could not be loaded. Reopen Memento and try again.",
        ),
      );
  }, [refresh, diary.moments, activity]);

  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setActivity((value) => value + 1);
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") setActivity((value) => value + 1);
    }, 30 * 60_000);
    return () => {
      listener.remove();
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (ownerId && !settings) return;
    const savedDates = new Set(Object.keys(diary.moments));
    queue.current = queue.current
      .catch(() => {})
      .then(() =>
        reconcile(
          ownerId,
          settings,
          savedDates,
          notificationPermission === "granted",
        ),
      )
      .then(
        () => setReminderError(null),
        () =>
          setReminderError(
            "Reminders could not be scheduled. Reopen Memento and try again.",
          ),
      );
  }, [ownerId, settings, diary.moments, notificationPermission, activity]);

  const setPreference = async (
    key: "reminder_enabled" | "reminder_hour" | "reminder_minute" | "autoplay",
    value: string,
  ) => {
    if (!ownerId) return;
    await saveLocalSetting(ownerId, key, value);
    await refresh();
  };

  const state: SettingsState = {
    available: !!ownerId,
    ready: !ownerId || !!settings,
    reminderEnabled: settings?.reminderEnabled ?? false,
    reminderHour: settings?.reminderHour ?? 20,
    reminderMinute: settings?.reminderMinute ?? 0,
    notificationPermission,
    reminderError,
    autoplay: settings?.autoplay ?? true,
    savedMediaBytes: settings?.savedMediaBytes ?? 0,
    savedCount: settings?.savedCount ?? 0,
    setReminderEnabled: async (enabled) => {
      if (enabled && notificationPermission !== "granted") {
        if (Platform.OS === "android")
          await Notifications.setNotificationChannelAsync("gentle-reminders", {
            name: "Daily memories",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        const result = await Notifications.requestPermissionsAsync();
        setNotificationPermission(result.granted ? "granted" : "denied");
        if (!result.granted) return;
      }
      await setPreference("reminder_enabled", String(enabled));
    },
    setReminderTime: async (hour, minute) => {
      if (
        !Number.isInteger(hour) ||
        hour < 0 ||
        hour > 23 ||
        !Number.isInteger(minute) ||
        minute < 0 ||
        minute > 59
      )
        throw new Error("Choose a valid reminder time.");
      if (!ownerId) return;
      await saveLocalSetting(ownerId, "reminder_hour", String(hour));
      await saveLocalSetting(ownerId, "reminder_minute", String(minute));
      await refresh();
    },
    setAutoplay: async (enabled) => setPreference("autoplay", String(enabled)),
    refresh,
  };
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useSettings() {
  const state = useContext(Context);
  if (!state) throw new Error("SettingsProvider is missing");
  return state;
}
