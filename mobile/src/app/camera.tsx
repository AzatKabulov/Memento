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
import { dateFromDiary, diaryDate } from "../lib/dates";
import { pickMedia, showPickMediaError } from "../lib/pickMedia";
import { colors } from "../lib/theme";

export default function CameraScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const [cameraPermission, requestCamera, getCameraPermission] =
    useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();
  const [mode, setMode] = useState<"picture" | "video">("picture");
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [torch, setTorch] = useState(false);
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
          onPress={() => router.replace("/")}
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
            onPress={() => router.replace("/")}
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
    <SafeAreaView style={styles.page}>
      <View style={styles.top}>
        <TouchableOpacity
          onPress={() => router.replace("/")}
          style={styles.circleButton}
          accessibilityRole="button"
          accessibilityLabel="Back to calendar"
        >
          <Text style={styles.circleIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topIdentity}>
          <Text style={styles.dateTitle}>
            {new Intl.DateTimeFormat("en", {
              month: "long",
              day: "numeric",
            }).format(dateFromDiary(date))}
          </Text>
          <Text style={styles.dateSubtitle}>Add today’s moment</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={torch ? "Turn off light" : "Turn on light"}
          accessibilityState={{ selected: torch }}
          disabled={recording || facing === "front"}
          onPress={() => setTorch((value) => !value)}
          style={[styles.circleButton, facing === "front" && styles.disabled]}
        >
          <Text style={styles.flashIcon}>ϟ</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.viewfinder}>
        {focused && (
          <CameraView
            key={`${mode}-${facing}`}
            ref={camera}
            style={StyleSheet.absoluteFill}
            mode={mode}
            facing={facing}
            enableTorch={torch && facing === "back"}
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
        <View pointerEvents="none" style={styles.frameGuides}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>MEMENTO</Text>
          </View>
          <View style={styles.verticalOne} />
          <View style={styles.verticalTwo} />
          <View style={styles.horizontalOne} />
          <View style={styles.horizontalTwo} />
          <View style={styles.recordDot} />
        </View>
      </View>
      <View style={styles.controls}>
        <View style={styles.modes}>
          <TouchableOpacity
            disabled={recording}
            onPress={() => {
              if (mode !== "picture") {
                setCameraReady(false);
                setMode("picture");
              }
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
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={recording}
            onPress={() => {
              if (mode !== "video") {
                setCameraReady(false);
                setMode("video");
              }
            }}
            style={[
              styles.modeButton,
              mode === "video" && styles.modeButtonSelected,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "video" }}
          >
            <Text
              style={[styles.modeText, mode === "video" && styles.modeSelected]}
            >
              Video
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.shutterRow}>
          <View style={styles.sideSpace}>
            <Text style={styles.limit}>
              {recording
                ? `${elapsed}s / 60s`
                : mode === "video"
                  ? "60 SEC"
                  : "1×"}
            </Text>
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
              !cameraReady && !recording && styles.disabled,
            ]}
          >
            <View
              style={[styles.shutterInner, recording && styles.shutterStop]}
            />
          </TouchableOpacity>
          <View style={styles.sideSpace}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
              disabled={recording}
              onPress={() => {
                setCameraReady(false);
                setTorch(false);
                setFacing((current) => (current === "back" ? "front" : "back"));
              }}
              style={styles.flip}
            >
              <Text style={styles.flipText}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={recording}
          style={styles.library}
          onPress={chooseFromLibrary}
        >
          <Text style={styles.libraryText}>▣ Choose from library</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.paper,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  viewfinder: {
    flex: 1,
    minHeight: 200,
    marginHorizontal: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 34,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  frameGuides: { ...StyleSheet.absoluteFill },
  badge: {
    position: "absolute",
    top: 18,
    left: 17,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: "rgba(20,15,12,0.65)",
  },
  badgeText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  verticalOne: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "33.33%",
    width: 1,
    backgroundColor: "rgba(255,239,217,0.20)",
  },
  verticalTwo: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "66.66%",
    width: 1,
    backgroundColor: "rgba(255,239,217,0.20)",
  },
  horizontalOne: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "33.33%",
    height: 1,
    backgroundColor: "rgba(255,239,217,0.20)",
  },
  horizontalTwo: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "66.66%",
    height: 1,
    backgroundColor: "rgba(255,239,217,0.20)",
  },
  recordDot: {
    position: "absolute",
    top: 22,
    right: 18,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.olive,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  circleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  circleIcon: {
    color: colors.ink,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -4,
  },
  flashIcon: { color: colors.ink, fontSize: 27, lineHeight: 32 },
  dateTitle: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  dateSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  disabled: { opacity: 0.45 },
  topIdentity: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  controls: {
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 12,
  },
  modes: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 16,
    padding: 4,
    borderRadius: 24,
    backgroundColor: colors.card,
  },
  modeButton: {
    minWidth: 90,
    minHeight: 34,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonSelected: {
    backgroundColor: "#3D2F27",
    borderWidth: 1,
    borderColor: "#645043",
  },
  modeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  modeSelected: { color: colors.ink },
  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 18,
  },
  sideSpace: { width: 72, alignItems: "center", justifyContent: "center" },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderColor: colors.muted,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#F7D7AB",
  },
  shutterRecording: { borderColor: "#D8896B" },
  shutterStop: {
    width: 25,
    height: 25,
    borderRadius: 5,
    backgroundColor: "#D8896B",
  },
  limit: {
    color: colors.ink,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  flip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  flipText: { color: colors.ink, fontSize: 25, lineHeight: 29 },
  library: {
    minHeight: 50,
    width: "100%",
    paddingHorizontal: 22,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  libraryText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
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
