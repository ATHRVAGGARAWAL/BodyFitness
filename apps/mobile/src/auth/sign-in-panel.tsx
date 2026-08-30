import { useSSO } from "@clerk/expo";
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton, Card } from "../components/ui";
import { usePalette } from "../theme";

export function ClerkSignInPanel({ onComplete }: { onComplete: () => void }) {
  const palette = usePalette();
  const { startSSOFlow } = useSSO();
  const signInHook = useSignIn();
  const signUpHook = useSignUp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const oauth = async (strategy: "oauth_apple" | "oauth_google") => {
    setBusy(strategy);
    setMessage(null);
    try {
      const result = await startSSOFlow({ strategy, redirectUrl: Linking.createURL("/auth") });
      if (result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onComplete();
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const emailLink = async () => {
    const identifier = email.trim().toLowerCase();
    if (!identifier.includes("@")) return setMessage("Enter a valid email address.");
    if (!signInHook.isLoaded || !signInHook.signIn || !signUpHook.isLoaded || !signUpHook.signUp) return;
    setBusy("email");
    setMessage("Sending a private sign-in link…");
    const redirectUrl = Linking.createURL("/auth");
    try {
      const signIn = await signInHook.signIn.create({ identifier });
      const factor = signIn.supportedFirstFactors?.find((item) => item.strategy === "email_link");
      if (!factor || !("emailAddressId" in factor)) throw new Error("Email-link sign-in is not enabled for this Clerk application.");
      const result = await signIn.createEmailLinkFlow().startEmailLinkFlow({ redirectUrl, emailAddressId: factor.emailAddressId });
      if (result.status === "complete" && result.createdSessionId) {
        await signInHook.setActive({ session: result.createdSessionId });
        onComplete();
        return;
      }
      setMessage("Open the link sent to your email on this device.");
    } catch (error) {
      if (hasCode(error, "form_identifier_not_found")) {
        try {
          const signUp = await signUpHook.signUp.create({ emailAddress: identifier });
          const result = await signUp.createEmailLinkFlow().startEmailLinkFlow({ redirectUrl });
          if (result.status === "complete" && result.createdSessionId) {
            await signUpHook.setActive({ session: result.createdSessionId });
            onComplete();
            return;
          }
          setMessage("Open the account link sent to your email on this device.");
        } catch (signUpError) {
          setMessage(errorMessage(signUpError));
        }
      } else {
        setMessage(errorMessage(error));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={[styles.title, { color: palette.label }]}>Unlock sync and your Circle</Text>
      <Text style={[styles.body, { color: palette.secondary }]}>Personal tracking works without an account. Sign in only when you want encrypted session sync, native step uploads, and private Friends & Family.</Text>
      {Platform.OS === "ios" ? <AppButton disabled={Boolean(busy)} label={busy === "oauth_apple" ? "Opening Apple…" : "Continue with Apple"} onPress={() => void oauth("oauth_apple")} /> : null}
      <AppButton disabled={Boolean(busy)} label={busy === "oauth_google" ? "Opening Google…" : "Continue with Google"} variant="secondary" onPress={() => void oauth("oauth_google")} />
      <View style={styles.divider}><View style={[styles.line, { backgroundColor: palette.border }]} /><Text style={[styles.or, { color: palette.tertiary }]}>OR EMAIL LINK</Text><View style={[styles.line, { backgroundColor: palette.border }]} /></View>
      <TextInput accessibilityLabel="Email address" autoCapitalize="none" autoComplete="email" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={palette.tertiary} value={email} onChangeText={setEmail} style={[styles.input, { color: palette.label, borderColor: palette.border, backgroundColor: palette.surfaceElevated }]} />
      <AppButton disabled={Boolean(busy)} label="Email me a sign-in link" onPress={() => void emailLink()} />
      {busy === "email" ? <ActivityIndicator color={palette.accent} /> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, { color: palette.secondary }]}>{message}</Text> : null}
      <Text style={[styles.privacy, { color: palette.tertiary }]}>Accounts are private by default. Birth date is used only for the 13+ gate and is never shown socially.</Text>
    </Card>
  );
}

function hasCode(error: unknown, code: string) {
  if (!error || typeof error !== "object" || !("errors" in error)) return false;
  const errors = (error as { errors?: Array<{ code?: string }> }).errors;
  return Boolean(errors?.some((item) => item.code === code));
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "errors" in error) {
    const first = (error as { errors?: Array<{ longMessage?: string; message?: string }> }).errors?.[0];
    if (first) return first.longMessage ?? first.message ?? "Sign-in could not be completed.";
  }
  return error instanceof Error ? error.message : "Sign-in could not be completed.";
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  title: { fontSize: 20, fontWeight: "900", letterSpacing: -0.5 },
  body: { fontSize: 12, lineHeight: 18, marginBottom: 3 },
  input: { minHeight: 51, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 },
  divider: { flexDirection: "row", alignItems: "center", gap: 9, marginVertical: 2 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  or: { fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  message: { textAlign: "center", fontSize: 11, lineHeight: 16 },
  privacy: { textAlign: "center", fontSize: 9, lineHeight: 14 },
});
