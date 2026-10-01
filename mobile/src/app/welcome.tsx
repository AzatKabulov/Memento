import React from "react";
import { Redirect, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { useDiary } from "../state/DiaryContext";
import { useThemeColors, type } from "../lib/theme";
import { SoftButton } from "../components/SoftButton";
export default function Welcome() {
  const auth = useAuth();
  const { enter } = useDiary();
  const colors = useThemeColors();
  if (auth.configured) return <Redirect href={auth.ownerId ? "/" : "/auth"} />;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 32,
          maxWidth: 460,
          alignSelf: "center",
          width: "100%",
        }}
      >
        <Text
          style={{
            color: colors.olive,
            fontFamily: type.display,
            fontSize: 74,
            textAlign: "center",
          }}
        >
          M
        </Text>
        <Text
          style={{
            color: colors.ink,
            fontFamily: type.display,
            fontSize: 46,
            textAlign: "center",
            marginTop: 20,
          }}
        >
          Memento
        </Text>
        <Text
          style={{
            color: colors.muted,
            fontFamily: type.displayItalic,
            fontSize: 24,
            textAlign: "center",
            marginVertical: 32,
          }}
        >
          Collect moments, not things.
        </Text>
        <SoftButton
          accessibilityLabel="Open diary prototype"
          onPress={() => {
            enter();
            router.replace("/");
          }}
          style={{
            backgroundColor: colors.plum,
            borderRadius: 28,
            minHeight: 56,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: colors.buttonInk,
              fontFamily: type.bodySemibold,
              fontSize: 15,
            }}
          >
            Open diary prototype
          </Text>
        </SoftButton>
      </View>
    </SafeAreaView>
  );
}
