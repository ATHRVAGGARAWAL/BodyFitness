import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { useAppAuth } from "../../src/auth/auth-provider";
import { AppButton, Card, PageHeader, Screen } from "../../src/components/ui";
import { acceptCircleInvite, syncCloud } from "../../src/sync/sync-engine";
import { usePalette } from "../../src/theme";

export default function AcceptInviteScreen() {
  const palette = usePalette();
  const auth = useAppAuth();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accept = async () => { setBusy(true); try { const bearer = await auth.getToken(); if (!bearer) throw new Error("Sign in before accepting this private invite."); await acceptCircleInvite(bearer, token); await syncCloud(auth.getToken); setMessage("Invite accepted. You are now mutually connected."); } catch (error) { setMessage(error instanceof Error ? error.message : "Invite acceptance failed."); } finally { setBusy(false); } };
  return <Screen><PageHeader eyebrow="Private invitation" title="Join Circle" /><Card><Text style={{ color: palette.label, fontSize: 18, fontWeight: "900" }}>Mutual connection request</Text><Text style={{ color: palette.secondary, fontSize: 12, lineHeight: 18, marginVertical: 10 }}>Accepting lets both people see only the categories each person chooses to share. There is no location tracking or public profile.</Text>{message ? <Text style={{ color: palette.secondary, fontSize: 11, marginBottom: 10 }}>{message}</Text> : null}{!auth.signedIn ? <AppButton label="Sign in first" onPress={() => router.push("/auth")} /> : <AppButton disabled={busy} label={busy ? "Accepting…" : "Accept invitation"} onPress={() => void accept()} />}<AppButton label="Open Circle" variant="secondary" style={{ marginTop: 9 }} onPress={() => router.replace("/profile/circle")} /></Card></Screen>;
}
