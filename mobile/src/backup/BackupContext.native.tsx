import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo from "@react-native-community/netinfo";
import { File } from "expo-file-system";
import { AppState } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useDiary } from "../state/DiaryContext";
import {
  backupSummary,
  retryPendingNow,
  setBackupPreference,
} from "../storage/BackupStore.native";
import {
  downloadCloudMedia,
  keepPhoneCopy,
  restoreCloudCopy,
  runCloudSync,
} from "./CloudBackup.native";
import type { BackupState } from "./BackupContext";
import type { BackupConflict, BackupSummary } from "./types";

const Context = createContext<BackupState | null>(null);

export function BackupProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const diary = useDiary();
  const diaryReady = diary.ready;
  const refreshDiary = diary.refresh;
  const [summary, setSummary] = useState<{
    ownerId: string;
    value: BackupSummary;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [fraction, setFraction] = useState<number | null>(null);
  const [connection, setConnection] = useState<
    "ready" | "offline" | "wifi" | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const running = useRef(false);
  const previews = useRef(new Set<string>());
  const owner = useRef(auth.ownerId);
  const foreground = useRef(
    AppState.currentState !== "background" &&
      AppState.currentState !== "inactive",
  );
  useEffect(() => {
    owner.current = auth.ownerId;
  }, [auth.ownerId]);

  const refreshSummary = useCallback(async (ownerId: string) => {
    const value = await backupSummary(ownerId);
    if (owner.current === ownerId) setSummary({ ownerId, value });
    return value;
  }, []);

  const syncNow = useCallback(
    async (manual = false) => {
      const ownerId = auth.ownerId;
      if (
        !auth.configured ||
        !ownerId ||
        !diaryReady ||
        running.current ||
        !foreground.current
      )
        return;
      running.current = true;
      setBusy(true);
      setError(null);
      try {
        if (manual) await retryPendingNow(ownerId);
        const latest = await refreshSummary(ownerId);
        const result = await runCloudSync(
          ownerId,
          latest.wifiOnly,
          () => owner.current === ownerId && foreground.current,
          (message, progress) => {
            if (owner.current === ownerId) {
              setPhase(message);
              setFraction(progress ?? null);
            }
          },
        );
        if (owner.current === ownerId) {
          setConnection(result.connection);
          if (result.restored) await refreshDiary();
          await refreshSummary(ownerId);
        }
      } catch (caught) {
        if (owner.current === ownerId)
          setError(
            caught instanceof Error
              ? caught.message
              : "Backup could not connect.",
          );
      } finally {
        running.current = false;
        if (owner.current === ownerId) {
          setBusy(false);
          setPhase(null);
          setFraction(null);
        }
      }
    },
    [auth.configured, auth.ownerId, diaryReady, refreshDiary, refreshSummary],
  );

  useEffect(() => {
    if (!auth.ownerId || !diaryReady) return;
    const ownerId = auth.ownerId;
    void refreshSummary(ownerId);
    void syncNow();
  }, [auth.ownerId, diaryReady, diary.moments, refreshSummary, syncNow]);

  useEffect(() => {
    const app = AppState.addEventListener("change", (state) => {
      foreground.current = state === "active";
      if (foreground.current) void syncNow();
    });
    const network = NetInfo.addEventListener(() => {
      if (foreground.current) void syncNow();
    });
    const timer = setInterval(() => {
      if (foreground.current) void syncNow();
    }, 60_000);
    return () => {
      app.remove();
      network();
      clearInterval(timer);
    };
  }, [syncNow]);

  const setWifiOnly = async (enabled: boolean) => {
    if (!auth.ownerId) return;
    await setBackupPreference(auth.ownerId, enabled);
    await refreshSummary(auth.ownerId);
    void syncNow();
  };

  const resolve = async (
    conflict: BackupConflict,
    choice: "phone" | "cloud",
  ) => {
    if (!auth.ownerId) return;
    if (running.current || busy)
      throw new Error("Wait for the current backup to finish.");
    const ownerId = auth.ownerId;
    let resolved = false;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      if (choice === "phone") await keepPhoneCopy(ownerId, conflict.remote);
      else {
        await restoreCloudCopy(
          ownerId,
          conflict.remote,
          (message, progress) => {
            setPhase(message);
            setFraction(progress ?? null);
          },
        );
        await diary.refresh();
      }
      await refreshSummary(ownerId);
      resolved = true;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not resolve this date.",
      );
      await refreshSummary(ownerId);
      throw caught;
    } finally {
      running.current = false;
      setBusy(false);
      setPhase(null);
      setFraction(null);
    }
    if (resolved) void syncNow();
  };

  const loadCloudPreview = async (conflict: BackupConflict) => {
    if (!auth.ownerId || conflict.remote.deleted_at) return null;
    const file = await downloadCloudMedia(auth.ownerId, conflict.remote);
    previews.current.add(file.uri);
    return {
      date: conflict.date,
      kind: conflict.remote.kind ?? "photo",
      uri: file.uri,
      caption: conflict.remote.caption,
      frame: conflict.remote.frame_y ?? "center",
      duration:
        conflict.remote.duration_ms == null
          ? undefined
          : conflict.remote.duration_ms / 1000,
    };
  };

  const releaseCloudPreview = (uri: string) => {
    if (!previews.current.delete(uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  };

  useEffect(() => {
    const current = previews.current;
    return () => {
      for (const uri of current) {
        const file = new File(uri);
        if (file.exists) file.delete();
      }
      current.clear();
    };
  }, [auth.ownerId]);

  const value: BackupState = {
    available: auth.configured && !!auth.ownerId,
    busy,
    phase,
    fraction,
    connection,
    error,
    summary: summary?.ownerId === auth.ownerId ? summary.value : null,
    syncNow,
    setWifiOnly,
    resolve,
    loadCloudPreview,
    releaseCloudPreview,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBackup() {
  const state = useContext(Context);
  if (!state) throw new Error("BackupProvider is missing");
  return state;
}
