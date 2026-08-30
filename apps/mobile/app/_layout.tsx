import "react-native-gesture-handler";
import "../src/health/background-task";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppAuthProvider } from "../src/auth/auth-provider";
import { HealthSyncProvider } from "../src/health/health-sync-provider";
import { usePalette } from "../src/theme";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppAuthProvider>
          <AppNavigation />
          <HealthSyncProvider />
        </AppAuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigation() {
  const palette = usePalette();
  return <><StatusBar style={palette.background === "#F2F1F7" ? "dark" : "light"} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background }, animation: "slide_from_right" }}><Stack.Screen name="(tabs)" /><Stack.Screen name="auth" options={{ presentation: "modal", animation: "slide_from_bottom" }} /><Stack.Screen name="profile/circle" /><Stack.Screen name="invite/[token]" /></Stack></>;
}
