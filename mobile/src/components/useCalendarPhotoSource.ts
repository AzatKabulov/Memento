import { useMemo } from "react";
import type { Moment } from "../state/DiaryContext";

export function useCalendarPhotoSource(moment?: Moment) {
  return useMemo(
    () => moment?.sample ?? { uri: moment?.thumbnailUri ?? moment?.uri },
    [moment?.sample, moment?.thumbnailUri, moment?.uri],
  );
}
