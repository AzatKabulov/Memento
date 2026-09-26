import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export type PickedMedia = {
  uri: string;
  kind: "photo" | "video";
  duration?: number;
};

export async function pickMedia(): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsEditing: false,
    quality: 0.85,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  if (asset.type === "video") {
    if (typeof asset.duration !== "number")
      throw new Error("video-duration-unknown");
    if (asset.duration > 60_000) throw new Error("video-too-long");
    return { uri: asset.uri, kind: "video", duration: asset.duration / 1000 };
  }
  return { uri: asset.uri, kind: "photo" };
}

export function showPickMediaError(error: unknown) {
  const reason = error instanceof Error ? error.message : "";
  if (reason === "video-too-long")
    Alert.alert(
      "Choose a shorter video",
      "Memento moments are up to 60 seconds.",
    );
  else if (reason === "video-duration-unknown")
    Alert.alert(
      "Could not read video length",
      "Choose another video and try again.",
    );
  else
    Alert.alert(
      "Could not open your library",
      "Check photo access in Settings and try again.",
    );
}
