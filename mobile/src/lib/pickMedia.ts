import * as ImagePicker from "expo-image-picker";
import { Alert, Linking } from "react-native";
import { mediaLimitIssue, mediaLimitMessage } from "./mediaRules";

export type PickedMedia = {
  uri: string;
  kind: "photo" | "video";
  duration?: number;
  fileSize?: number;
};

export function validatePickedAsset(
  asset: ImagePicker.ImagePickerAsset,
): PickedMedia {
  if (asset.type !== "image" && asset.type !== "video")
    throw new Error("unsupported-media");
  const kind = asset.type === "video" ? "video" : "photo";
  const duration =
    typeof asset.duration === "number" ? asset.duration / 1000 : undefined;
  const issue = mediaLimitIssue(kind, duration, asset.fileSize);
  if (issue) throw new Error(issue);
  if (kind === "video") {
    return { uri: asset.uri, kind, duration, fileSize: asset.fileSize };
  }
  return { uri: asset.uri, kind, fileSize: asset.fileSize };
}

export async function pickMedia(): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsEditing: false,
    quality: 0.85,
    selectionLimit: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  return validatePickedAsset(asset);
}

export function showPickMediaError(error: unknown) {
  const reason = error instanceof Error ? error.message : "";
  if (reason === "video-too-long")
    Alert.alert("Choose a shorter video", mediaLimitMessage(reason));
  else if (reason === "media-too-large")
    Alert.alert("This file is too large", mediaLimitMessage(reason));
  else if (reason === "unsupported-media")
    Alert.alert(
      "Unsupported file",
      "Choose a photo or video from your library.",
    );
  else if (reason === "video-duration-unknown")
    Alert.alert("Could not read video length", mediaLimitMessage(reason));
  else if (reason === "media-empty")
    Alert.alert("Empty file", mediaLimitMessage(reason));
  else
    Alert.alert(
      "Could not open your library",
      "Check photo access in your phone’s settings, then try again.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Open settings", onPress: () => Linking.openSettings() },
      ],
    );
}
