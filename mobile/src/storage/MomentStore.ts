import type { Moment } from "../state/DiaryContext";

// TypeScript's fallback for platform-specific MomentStore.native/MomentStore.web modules.
export async function listSavedMoments(_ownerId: string): Promise<Moment[]> {
  return [];
}

export async function saveMomentLocally(
  _ownerId: string,
  moment: Moment,
): Promise<Moment> {
  return moment;
}

export async function deleteMomentLocally(
  _ownerId: string,
  _date: string,
): Promise<void> {}

export async function backfillPhotoThumbnails(
  _ownerId: string,
  _onReady: (date: string, photoUri: string, thumbnailUri: string) => void,
): Promise<void> {}
