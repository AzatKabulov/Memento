import React, { createContext, useContext, useMemo, useState } from "react";
import { diaryDate, shiftDate } from "../lib/dates";

export type Moment = {
  date: string;
  kind: "photo" | "video";
  uri?: string;
  sample?: number;
  caption: string;
  duration?: number;
};

type DiaryState = {
  entered: boolean;
  enter: () => void;
  moments: Record<string, Moment>;
  save: (moment: Moment) => void;
  remove: (date: string) => void;
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
  const [entered, setEntered] = useState(false);
  const [moments, setMoments] = useState<Record<string, Moment>>(() =>
    Object.fromEntries(sampleMoments.map((moment) => [moment.date, moment])),
  );
  const value = useMemo<DiaryState>(
    () => ({
      entered,
      enter: () => setEntered(true),
      moments,
      save: (moment) =>
        setMoments((current) => ({ ...current, [moment.date]: moment })),
      remove: (date) =>
        setMoments((current) => {
          const next = { ...current };
          delete next[date];
          return next;
        }),
    }),
    [entered, moments],
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
