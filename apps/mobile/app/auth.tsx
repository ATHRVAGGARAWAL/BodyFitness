import { router } from "expo-router";
import { Text } from "react-native";
import { clerkConfigured, useAppAuth } from "../src/auth/auth-provider";
import { ClerkSignInPanel } from "../src/auth/sign-in-panel";
import { AppButton, Card, PageHeader, Screen } from "../src/components/ui";
import { usePalette } from "../src/theme";

export default function AuthScreen() {
  const palette = usePalette();
  const auth = useAppAuth();
  return <Screen><PageHeader eyebrow="Private cloud" title="Sign in" />{!clerkConfigured ? <Card><Text style={{ color: palette.label, fontSize: 16, fontWeight: "900" }}>Clerk is not configured</Text><Text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18, marginTop: 7 }}>Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the mobile environment. Guest tracking remains fully available.</Text></Card> : auth.signedIn ? <Card><Text style={{ color: palette.label, fontSize: 16, fontWeight: "900" }}>You’re signed in</Text><Text style={{ color: palette.secondary, fontSize: 12, marginVertical: 10 }}>{auth.email}</Text><AppButton label="Return to profile" onPress={() => router.back()} /></Card> : <ClerkSignInPanel onComplete={() => router.back()} />}</Screen>;
}
