import { useEffect, useMemo, useState } from "react";
import type { Moment } from "../state/DiaryContext";
import {
  peekPhotoThumbnail,
  preparePhotoThumbnail,
} from "../lib/photoThumbnails";

export function useCalendarPhotoSource(moment?: Moment) {
  const uri = moment?.uri;
  const path = moment?.kind === "photo" ? moment.cloudPath : undefined;
  const owner = path?.split("/")[0];
  const [prepared, setPrepared] = useState<{
    path: string;
    uri: string;
  } | null>(null);
  useEffect(() => {
    if (!owner || !path || !uri || moment?.thumbnailUri) return;
    let active = true;
    void preparePhotoThumbnail(owner, path, uri).then((thumbnail) => {
      if (active && thumbnail) setPrepared({ path, uri: thumbnail });
    });
    return () => {
      active = false;
    };
  }, [owner, path, uri, moment?.thumbnailUri]);
  const preview =
    moment?.thumbnailUri ??
    (prepared?.path === path ? prepared?.uri : undefined) ??
    (owner && path ? peekPhotoThumbnail(owner, path) : undefined);
  return useMemo(
    () => moment?.sample ?? { uri: preview ?? uri },
    [moment?.sample, preview, uri],
  );
}
