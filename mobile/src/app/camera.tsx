import React, { useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { diaryDate } from "../lib/dates";
import { colors } from "../lib/theme";

export default function CameraScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();
  const [mode, setMode] = useState<"picture" | "video">("picture");
  const [recording, setRecording] = useState(false);
  const camera = useRef<CameraView>(null);
  const busy = useRef(false);

  if (date !== diaryDate(new Date()))
    return (
      <SafeAreaView style={styles.page}>
        <Text style={styles.message}>
          The camera can only capture today’s moment.
        </Text>
      </SafeAreaView>
    );
  if (!cameraPermission?.granted)
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.permission}>
          <Text style={styles.permissionTitle}>A moment from today</Text>
          <Text style={styles.message}>
            Allow camera access to take a photo or record a short video.
          </Text>
          <TouchableOpacity
            style={[styles.allow, { backgroundColor: colors.plum }]}
            onPress={requestCamera}
          >
            <Text style={[styles.allowText, { color: colors.buttonInk }]}>
              Allow camera
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>Back to editor</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

  async function capture() {
    if (!camera.current || busy.current) return;
    if (mode === "video") {
      if (!microphonePermission?.granted) {
        const result = await requestMicrophone();
        if (!result.granted) {
          Alert.alert(
            "Microphone access needed",
            "Allow microphone access to record a video with sound.",
          );
          return;
        }
      }
      busy.current = true;
      setRecording(true);
      try {
        const result = await camera.current.recordAsync({ maxDuration: 60 });
        if (result?.uri)
          router.replace({
            pathname: "/compose/[date]",
            params: { date, uri: result.uri, kind: "video" },
          });
      } catch {
        Alert.alert(
          "Recording failed",
          "Please try again or choose a video from your library.",
        );
      } finally {
        busy.current = false;
        setRecording(false);
      }
    } else {
      busy.current = true;
      try {
        const result = await camera.current.takePictureAsync({ quality: 0.85 });
        if (result?.uri)
          router.replace({
            pathname: "/compose/[date]",
            params: { date, uri: result.uri, kind: "photo" },
          });
      } catch {
        Alert.alert(
          "Photo failed",
          "Please try again or choose a photo from your library.",
        );
      } finally {
        busy.current = false;
      }
    }
  }

  return (
    <View style={styles.page}>
      <CameraView
        ref={camera}
        style={styles.camera}
        mode={mode}
        facing="back"
        mute={false}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => router.back()} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <Text style={styles.topText}>TODAY’S MOMENT</Text>
          <View style={styles.close} />
        </View>
        <View style={styles.controls}>
          <View style={styles.modes}>
            <TouchableOpacity
              disabled={recording}
              onPress={() => setMode("picture")}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "picture" && styles.modeSelected,
                ]}
              >
                PHOTO
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={recording}
              onPress={() => setMode("video")}
            >
              <Text
                style={[
                  styles.modeText,
                  mode === "video" && styles.modeSelected,
                ]}
              >
                VIDEO
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              recording
                ? "Stop recording"
                : mode === "video"
                  ? "Record video"
                  : "Take photo"
            }
            onPress={
              recording ? () => camera.current?.stopRecording() : capture
            }
            style={[styles.shutter, recording && styles.shutterRecording]}
          >
            <View
              style={[styles.shutterInner, recording && styles.shutterStop]}
            />
          </TouchableOpacity>
          <Text style={styles.limit}>
            {recording
              ? "Recording · tap to stop"
              : mode === "video"
                ? "Up to 60 seconds"
                : "Tap to capture"}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#171417" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "space-between" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 21,
    paddingTop: 10,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 31, marginTop: -4 },
  topText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  controls: { alignItems: "center", paddingBottom: 30 },
  modes: { flexDirection: "row", gap: 26, marginBottom: 23 },
  modeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  modeSelected: { color: "#fff" },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderColor: "#fff",
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
  },
  shutterRecording: { borderColor: "#F8E8E4" },
  shutterStop: {
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: "#C8534F",
  },
  limit: { color: "#fff", fontSize: 12, marginTop: 14 },
  permission: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    alignItems: "center",
  },
  permissionTitle: {
    color: "#fff",
    fontFamily: "Georgia",
    fontSize: 29,
    textAlign: "center",
  },
  message: {
    color: "#E9D8D5",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 12,
  },
  allow: {
    backgroundColor: colors.paper,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 15,
    marginTop: 24,
  },
  allowText: { color: colors.plum, fontWeight: "700" },
  backText: { color: "#fff", marginTop: 23 },
});
