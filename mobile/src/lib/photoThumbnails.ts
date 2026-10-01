// Native thumbnails are managed with the local diary's media files.
export function activatePhotoThumbnails(_owner: string | null): void {}
export function peekPhotoThumbnail(
  _owner: string,
  _path: string,
): string | undefined {
  return undefined;
}
export async function removePhotoThumbnail(
  _owner: string,
  _path: string,
): Promise<void> {}
export async function cachedPhotoThumbnail(
  _owner: string,
  _path: string,
): Promise<string | undefined> {
  return undefined;
}
export async function preparePhotoThumbnail(
  _owner: string,
  _path: string,
  _uri: string,
): Promise<string | undefined> {
  return undefined;
}
export async function clearPhotoThumbnails(_owner: string): Promise<void> {}
