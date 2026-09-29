import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../auth/AuthContext";
import { listSavedMoments } from "../storage/MomentStore";
import { useDiary, type Moment } from "../state/DiaryContext";
import type { BackupState } from "./BackupContext";
import type { BackupConflict } from "./types";

const Context = createContext<BackupState | null>(null);

export function BackupProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const diary = useDiary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const available = auth.configured && !!auth.ownerId && diary.ready;

  const syncNow = useCallback(async () => {
    if (!available || busy) return;
    setBusy(true);
    setError(null);
    try {
      await diary.refresh();
      setLastChecked(new Date().toISOString());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load your diary.",
      );
    } finally {
      setBusy(false);
    }
  }, [available, busy, diary]);

  const value = useMemo<BackupState>(
    () => ({
      available,
      busy,
      phase: busy ? "Checking your account" : null,
      fraction: null,
      connection:
        typeof navigator !== "undefined" && !navigator.onLine
          ? "offline"
          : "ready",
      error,
      summary: available
        ? {
            pending: 0,
            conflicts: [],
            lastSynced: lastChecked,
            wifiOnly: false,
            needsAttention: 0,
          }
        : null,
      syncNow,
      setWifiOnly: async () => {},
      resolve: async (
        _conflict: BackupConflict,
        _choice: "phone" | "cloud",
      ) => {
        throw new Error("There are no unsynced copies in the web diary.");
      },
      loadCloudPreview: async (
        conflict: BackupConflict,
      ): Promise<Moment | null> => {
        if (!auth.ownerId || conflict.remote.deleted_at) return null;
        const moments = await listSavedMoments(auth.ownerId);
        return moments.find((moment) => moment.date === conflict.date) ?? null;
      },
      releaseCloudPreview: () => {},
    }),
    [available, busy, error, lastChecked, syncNow, auth.ownerId],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useBackup() {
  const state = useContext(Context);
  if (!state) throw new Error("BackupProvider is missing");
  return state;
}
