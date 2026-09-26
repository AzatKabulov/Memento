import type { Moment } from "../state/DiaryContext";

// The web prototype has no durable-media promise. Native builds use SQLite and app documents.
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
