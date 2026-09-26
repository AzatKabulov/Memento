import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { diaryDate, shiftDate } from "../lib/dates";
import { useAuth } from "../auth/AuthContext";
import {
  deleteMomentLocally,
  listSavedMoments,
  saveMomentLocally,
} from "../storage/MomentStore";

export type Moment = {
  date: string;
  kind: "photo" | "video";
  source?: "camera" | "library";
  uri?: string;
  sample?: number;
  caption: string;
  duration?: number;
  frame?: "top" | "center" | "bottom";
};

type DiaryState = {
  entered: boolean;
  ready: boolean;
  storageError: string | null;
  retryLoad: () => void;
  refresh: () => Promise<void>;
  enter: () => void;
  moments: Record<string, Moment>;
  save: (moment: Moment) => Promise<void>;
  remove: (date: string) => Promise<void>;
};

const today = diaryDate(new Date());
const sampleMoments: Moment[] = [
  {
    date: shiftDate(today, -2),
    kind: "photo",
    sample: require("../../assets/samples/morning-kitchen.png"),
    caption: "The morning light stayed a little longer today.",
  },
  {
    date: shiftDate(today, -5),
    kind: "photo",
    sample: require("../../assets/samples/rainy-window.png"),
    caption: "Rain on the way home.",
  },
  {
    date: shiftDate(today, -9),
    kind: "photo",
    sample: require("../../assets/samples/park-walk.png"),
    caption: "A quiet walk before dinner.",
  },
];

const DiaryContext = createContext<DiaryState | null>(null);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [previewEntered, setPreviewEntered] = useState(false);
  const [previewMoments, setPreviewMoments] = useState<Record<string, Moment>>(
    () =>
      Object.fromEntries(sampleMoments.map((moment) => [moment.date, moment])),
  );
  const [saved, setSaved] = useState<{
    ownerId: string;
    moments: Record<string, Moment>;
  } | null>(null);
  const [storageFailure, setStorageFailure] = useState<{
    ownerId: string;
    message: string;
  } | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (!auth.configured || !auth.ownerId) return;
    const ownerId = auth.ownerId;
    let active = true;
    listSavedMoments(ownerId)
      .then((moments) => {
        if (active)
          setSaved({
            ownerId,
            moments: Object.fromEntries(
              moments.map((moment) => [moment.date, moment]),
            ),
          });
      })
      .catch(() => {
        if (active) {
          setSaved(null);
          setStorageFailure({
            ownerId,
            message:
              "Your diary could not be opened. Your saved files have not been changed.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [auth.configured, auth.ownerId, loadAttempt]);

  const ready =
    !auth.configured || (!!auth.ownerId && saved?.ownerId === auth.ownerId);
  const storageError =
    storageFailure?.ownerId === auth.ownerId ? storageFailure.message : null;
  const moments = useMemo(
    () =>
      auth.configured
        ? saved?.ownerId === auth.ownerId
          ? saved.moments
          : {}
        : previewMoments,
    [auth.configured, auth.ownerId, saved, previewMoments],
  );
  const value = useMemo<DiaryState>(
    () => ({
      entered: auth.configured ? !!auth.ownerId : previewEntered,
      ready,
      storageError,
      retryLoad: () => {
        setStorageFailure(null);
        setLoadAttempt((current) => current + 1);
      },
      refresh: async () => {
        if (!auth.configured || !auth.ownerId) return;
        const ownerId = auth.ownerId;
        const latest = await listSavedMoments(ownerId);
        setSaved((current) =>
          current?.ownerId === ownerId
            ? {
                ownerId,
                moments: Object.fromEntries(
                  latest.map((moment) => [moment.date, moment]),
                ),
              }
            : current,
        );
      },
      enter: () => setPreviewEntered(true),
      moments,
      save: async (moment) => {
        if (auth.configured) {
          if (!auth.ownerId) throw new Error("Sign in before saving a moment.");
          const savedMoment = await saveMomentLocally(auth.ownerId, moment);
          setSaved((current) =>
            current?.ownerId === auth.ownerId
              ? {
                  ownerId: current.ownerId,
                  moments: { ...current.moments, [moment.date]: savedMoment },
                }
              : current,
          );
        } else
          setPreviewMoments((current) => ({
            ...current,
            [moment.date]: moment,
          }));
      },
      remove: async (date) => {
        if (auth.configured) {
          if (!auth.ownerId)
            throw new Error("Sign in before editing your diary.");
          await deleteMomentLocally(auth.ownerId, date);
          setSaved((current) => {
            if (current?.ownerId !== auth.ownerId) return current;
            const next = { ...current.moments };
            delete next[date];
            return { ownerId: current.ownerId, moments: next };
          });
        } else
          setPreviewMoments((current) => {
            const next = { ...current };
            delete next[date];
            return next;
          });
      },
    }),
    [
      auth.configured,
      auth.ownerId,
      previewEntered,
      ready,
      storageError,
      moments,
    ],
  );
  return (
    <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>
  );
}

export function useDiary() {
  const state = useContext(DiaryContext);
  if (!state) throw new Error("DiaryProvider is missing");
  return state;
}
