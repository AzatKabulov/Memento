import React, { useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import {
  Alert,
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { diaryDate } from "../lib/dates";
import { pickMedia, showPickMediaError } from "../lib/pickMedia";
import { colors } from "../lib/theme";

export default function CameraScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [cameraPermission, requestCamera, getCameraPermission] =
    useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();
  const [mode, setMode] = useState<"picture" | "video">("picture");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [recording, setRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [focused, setFocused] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const camera = useRef<CameraView>(null);
  const busy = useRef(false);
  const startedAt = useRef(0);
  const stopRequested = useRef(false);

  useFocusEffect(
    React.useCallback(() => {
      setFocused(true);
      return () => {
        camera.current?.stopRecording();
        setFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const seconds = Math.min(
        60,
        Math.floor((Date.now() - startedAt.current) / 1000),
      );
      setElapsed(seconds);
      if (seconds >= 60 && !stopRequested.current) {
        stopRequested.current = true;
        camera.current?.stopRecording();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" && recording) camera.current?.stopRecording();
      if (state === "active") void getCameraPermission().catch(() => {});
    });
    return () => subscription.remove();
  }, [recording, getCameraPermission]);

  async function chooseFromLibrary() {
    if (recording || busy.current) return;
    try {
      const media = await pickMedia();
      if (media)
        router.replace({
          pathname: "/compose/[date]",
          params: {
            date,
            uri: media.uri,
            kind: media.kind,
            source: "library",
            duration: media.duration?.toString(),
          },
        });
    } catch (error) {
      showPickMediaError(error);
    }
  }

  if (date !== diaryDate(new Date()))
    return (
      <SafeAreaView style={styles.page}>
        <Text style={styles.message}>
          The camera can only capture today’s moment.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.allow}
          accessibilityRole="button"
        >
          <Text style={styles.allowText}>Back to calendar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  if (!cameraPermission?.granted)
    return (
      <SafeAreaView style={styles.page}>
        <View style={styles.permission}>
          <View style={styles.permissionEmblem}>
            <View style={styles.permissionLens} />
          </View>
          <Text style={styles.permissionTitle}>A moment from today</Text>
          <Text style={styles.message}>
            Let Memento open your camera to keep today as a photo or a short
            video.
          </Text>
          <TouchableOpacity
            style={[styles.allow, { backgroundColor: colors.plum }]}
            onPress={() =>
              cameraPermission?.canAskAgain
                ? requestCamera()
                : Linking.openSettings()
            }
            accessibilityRole="button"
          >
            <Text style={[styles.allowText, { color: colors.buttonInk }]}>
              {cameraPermission?.canAskAgain === false
                ? "Open settings"
                : "Allow camera"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.library}
            onPress={chooseFromLibrary}
            accessibilityRole="button"
          >
            <Text style={styles.libraryText}>Choose from library</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.permissionBack}
            accessibilityRole="button"
          >
            <Text style={styles.backText}>Back to calendar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );

  async function capture() {
    if (!camera.current || busy.current || !cameraReady) return;
    if (mode === "video") {
      if (Platform.OS === "web") {
        Alert.alert(
          "Record on your phone",
          "Video recording is available in the iPhone and Android app. You can choose a video from your library here.",
        );
        return;
      }
      if (!microphonePermission?.granted) {
        const result = await requestMicrophone();
        if (!result.granted) {
          Alert.alert(
            "Microphone access needed",
            "Allow microphone access to record with sound. If access is blocked, enable it in your phone’s settings.",
            [
              { text: "Not now", style: "cancel" },
              { text: "Open settings", onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }
      busy.current = true;
      startedAt.current = Date.now();
      stopRequested.current = false;
      setElapsed(0);
      setRecording(true);
      try {
        const result = await camera.current.recordAsync({ maxDuration: 60 });
        if (result?.uri)
          router.replace({
            pathname: "/compose/[date]",
            params: {
              date,
              uri: result.uri,
              kind: "video",
              source: "camera",
              duration: String(
                Math.min(60, (Date.now() - startedAt.current) / 1000),
              ),
            },
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
            params: { date, uri: result.uri, kind: "photo", source: "camera" },
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
      {focused && (
        <CameraView
          key={`${mode}-${facing}`}
          ref={camera}
          style={styles.camera}
          mode={mode}
          facing={facing}
          mute={false}
          onCameraReady={() => setCameraReady(true)}
          onMountError={() =>
            Alert.alert(
              "Camera unavailable",
              "Try again or choose a moment from your library.",
            )
          }
        />
      )}
      <View pointerEvents="none" style={styles.viewfinder}>
        <View style={styles.viewfinderTop}>
          <View style={styles.viewfinderMark} />
          <Text style={styles.viewfinderText}>
            {facing === "front" ? "FRONT LENS" : "BACK LENS"}
          </Text>
          <View style={styles.viewfinderMark} />
        </View>
      </View>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.top}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close camera"
          >
            <Text style={styles.closeText}>×</Text>
          </TouchableOpacity>
          <View style={styles.topIdentity}>
            <Text style={styles.brand}>Memento</Text>
            <Text style={styles.topText}>TODAY’S MOMENT</Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Switch camera"
            disabled={recording}
            onPress={() => {
              setCameraReady(false);
              setFacing((current) => (current === "back" ? "front" : "back"));
            }}
            style={styles.flip}
          >
            <Text style={styles.flipText}>Flip</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.controls}>
          <View style={styles.controlsHeader}>
            <View style={styles.recordLamp} />
            <Text style={styles.controlsHeading}>
              {recording ? "RECORDING" : "READY TO KEEP"}
            </Text>
            <Text style={styles.frameCount}>
              {mode === "video" ? "VIDEO" : "PHOTO"} · 01
            </Text>
          </View>
          <View style={styles.modes}>
            <TouchableOpacity
              disabled={recording}
              onPress={() => {
                if (mode === "picture") return;
                setCameraReady(false);
                setMode("picture");
              }}
              style={[
                styles.modeButton,
                mode === "picture" && styles.modeButtonSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "picture" }}
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
              onPress={() => {
                if (mode === "video") return;
                setCameraReady(false);
                setMode("video");
              }}
              style={[
                styles.modeButton,
                mode === "video" && styles.modeButtonSelected,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === "video" }}
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
          <View style={styles.shutterRow}>
            <View style={styles.shutterSide} />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                recording
                  ? "Stop recording"
                  : mode === "video"
                    ? "Record video"
                    : "Take photo"
              }
              disabled={!cameraReady && !recording}
              onPress={
                recording
                  ? () => {
                      if (!stopRequested.current) {
                        stopRequested.current = true;
                        camera.current?.stopRecording();
                      }
                    }
                  : capture
              }
              style={[
                styles.shutter,
                recording && styles.shutterRecording,
                !cameraReady && !recording && styles.shutterDisabled,
              ]}
            >
              <View
                style={[styles.shutterInner, recording && styles.shutterStop]}
              />
            </TouchableOpacity>
            <Text style={styles.shutterSide}>
              {mode === "video" ? "60 SEC" : "1 SHOT"}
            </Text>
          </View>
          <Text style={styles.limit}>
            {recording
              ? `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")} / 01:00 · tap to stop`
              : mode === "video"
                ? "Up to 60 seconds"
                : "Tap to capture"}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            disabled={recording}
            style={styles.library}
            onPress={chooseFromLibrary}
          >
            <Text style={styles.libraryText}>Choose from library</Text>
          </TouchableOpacity>
          <Text style={styles.controlsFoot}>ONE DAY · ONE MOMENT</Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#171717" },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: "space-between" },
  viewfinder: {
    position: "absolute",
    top: 128,
    bottom: 285,
    left: 17,
    right: 17,
    borderWidth: 1,
    borderColor: "rgba(245,231,206,0.62)",
    borderRadius: 30,
    justifyContent: "flex-start",
  },
  viewfinderTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
  },
  viewfinderMark: {
    width: 13,
    height: 1,
    backgroundColor: "rgba(245,231,206,0.75)",
  },
  viewfinderText: {
    color: "#F5E7CE",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 21,
    paddingTop: 7,
  },
  close: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(30,27,24,0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 31, marginTop: -4 },
  flip: {
    minWidth: 52,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "rgba(30,27,24,0.66)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipText: { color: "#F5E7CE", fontSize: 13, fontWeight: "700" },
  topIdentity: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(30,27,24,0.60)",
  },
  brand: {
    color: "#F5E7CE",
    fontFamily: "Georgia",
    fontSize: 18,
    lineHeight: 22,
  },
  topText: {
    color: "#D5C4A9",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  controls: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 32,
    backgroundColor: "rgba(34,31,28,0.88)",
    borderWidth: 1,
    borderColor: "rgba(245,231,206,0.25)",
  },
  controlsHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordLamp: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#D8896B",
  },
  controlsHeading: {
    color: "#F5E7CE",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.3,
  },
  frameCount: {
    color: "#BEAD92",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.1,
    marginLeft: "auto",
  },
  modes: { flexDirection: "row", gap: 10, marginTop: 20, marginBottom: 14 },
  modeButton: {
    minWidth: 94,
    minHeight: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonSelected: { backgroundColor: "rgba(245,231,206,0.16)" },
  modeText: {
    color: "#BEAD92",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  modeSelected: { color: "#F5E7CE" },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  shutterSide: {
    width: 70,
    color: "#BEAD92",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textAlign: "center",
  },
  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: "#F5E7CE",
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F5E7CE",
  },
  shutterRecording: { borderColor: "#D8896B" },
  shutterDisabled: { opacity: 0.5 },
  shutterStop: {
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: "#D8896B",
  },
  limit: {
    color: "#F5E7CE",
    fontSize: 12,
    marginTop: 10,
    fontVariant: ["tabular-nums"],
  },
  library: {
    minHeight: 45,
    marginTop: 16,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(245,231,206,0.4)",
    backgroundColor: "rgba(245,231,206,0.09)",
    alignItems: "center",
    justifyContent: "center",
  },
  libraryText: { color: "#F5E7CE", fontSize: 13, fontWeight: "700" },
  controlsFoot: {
    color: "#9F907C",
    fontSize: 9,
    letterSpacing: 2,
    marginTop: 15,
  },
  permission: {
    flex: 1,
    justifyContent: "center",
    padding: 30,
    alignItems: "center",
  },
  permissionEmblem: {
    width: 90,
    height: 90,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#7E6E59",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },
  permissionLens: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 7,
    borderColor: "#F5E7CE",
  },
  permissionTitle: {
    color: "#F5E7CE",
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
    borderRadius: 24,
    marginTop: 24,
  },
  allowText: { color: colors.plum, fontWeight: "700" },
  permissionBack: { minHeight: 44, justifyContent: "center", marginTop: 12 },
  backText: { color: "#F5E7CE" },
});
