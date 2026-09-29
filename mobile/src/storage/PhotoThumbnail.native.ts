import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Calendar cells only need a small preview. Keep the original untouched for
// the moment screen, export, and cloud backup.
export async function createPhotoThumbnail(
  sourceUri: string,
  destination: File,
) {
  let generated: File | null = null;
  try {
    const image = await ImageManipulator.manipulate(sourceUri)
      .resize({ width: 512, height: null })
      .renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.78,
    });
    generated = new File(result.uri);
    await generated.copy(destination);
    if (!destination.exists || !destination.size)
      throw new Error("The calendar preview was empty.");
    return true;
  } catch {
    try {
      if (destination.exists) destination.delete();
    } catch {
      // The original photo is still usable even if preview cleanup fails.
    }
    // A preview failure must never prevent the original photo from being saved.
    return false;
  } finally {
    try {
      if (generated?.exists) generated.delete();
    } catch {
      // Cached manipulator output can be reclaimed by the OS.
    }
  }
}
