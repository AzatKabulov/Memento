import React, { createContext, useContext } from "react";
import type { BackupConflict, BackupSummary } from "./types";
import type { Moment } from "../state/DiaryContext";

export type BackupState = {
  available: boolean;
  busy: boolean;
  phase: string | null;
  fraction: number | null;
  connection: "ready" | "offline" | "wifi" | null;
  error: string | null;
  summary: BackupSummary | null;
  syncNow: (manual?: boolean) => Promise<void>;
  setWifiOnly: (enabled: boolean) => Promise<void>;
  resolve: (
    conflict: BackupConflict,
    choice: "phone" | "cloud",
  ) => Promise<void>;
  loadCloudPreview: (conflict: BackupConflict) => Promise<Moment | null>;
  releaseCloudPreview: (uri: string) => void;
};

const unavailable: BackupState = {
  available: false,
  busy: false,
  phase: null,
  fraction: null,
  connection: null,
  error: null,
  summary: null,
  syncNow: async () => {},
  setWifiOnly: async () => {},
  resolve: async () => {},
  loadCloudPreview: async () => null,
  releaseCloudPreview: () => {},
};

const Context = createContext(unavailable);

export function BackupProvider({ children }: { children: React.ReactNode }) {
  return <Context.Provider value={unavailable}>{children}</Context.Provider>;
}

export function useBackup() {
  return useContext(Context);
}
