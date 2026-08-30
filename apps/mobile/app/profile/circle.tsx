import { Ionicons } from "@expo/vector-icons";
import type { SharingPolicy } from "@bodyfitness/contracts";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useAppAuth } from "../../src/auth/auth-provider";
import { AppButton, Card, DataTile, EmptyState, PageHeader, Screen, SectionHeader, SourceBadge } from "../../src/components/ui";
import { createCircleInvite, removeCircleConnection, syncCloud, updateSharing } from "../../src/sync/sync-engine";
import { useMobileStore } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

export default function CircleScreen() {
  const palette = usePalette();
  const auth = useAppAuth();
  const circle = useMobileStore((state) => state.circle);
  const setCircle = useMobileStore((state) => state.setCircle);
  const [handle, setHandle] = useState("");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { if (auth.signedIn) void syncCloud(auth.getToken).catch(() => undefined); }, [auth.getToken, auth.signedIn]);

  const invite = async (exact: boolean) => {
    const normalized = handle.trim().toLowerCase();
    if (exact && normalized.length < 3) return setMessage("Enter the exact private handle.");
    setBusy(true); setMessage(null);
    try { const token = await auth.getToken(); if (!token) throw new Error("Sign in first."); const result = await createCircleInvite(token, exact ? normalized : undefined); setInviteUrl(result.inviteUrl); setMessage(`Invite expires ${new Date(result.expiresAt).toLocaleDateString()}.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Invite creation failed."); }
    finally { setBusy(false); }
  };

  const changeSharing = async (connectionId: string, sharing: SharingPolicy) => {
    const previous = circle;
    setCircle({ ...circle, members: circle.members.map((member) => member.connection.id === connectionId ? { ...member, connection: { ...member.connection, sharing } } : member) });
    try { const token = await auth.getToken(); if (!token) throw new Error("Sign in first."); await updateSharing(token, connectionId, sharing); }
    catch (error) { setCircle(previous); setMessage(error instanceof Error ? error.message : "Privacy update failed."); }
  };

  const remove = (connectionId: string, name: string) => Alert.alert(`Remove ${name}?`, "Access is revoked immediately for both people.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void (async () => { const token = await auth.getToken(); if (!token) return; await removeCircleConnection(token, connectionId); await syncCloud(auth.getToken); })().catch((error) => setMessage(error instanceof Error ? error.message : "Removal failed.")) }]);

  return (
    <Screen>
      <PageHeader eyebrow="Friends & Family" title="Your Circle" action={<Pressable accessibilityLabel="Close Circle" onPress={() => router.back()} style={[styles.close, { borderColor: palette.border, backgroundColor: palette.surfaceElevated }]}><Ionicons name="close" size={21} color={palette.label} /></Pressable>} />
      {!auth.signedIn ? <Card style={styles.center}><Ionicons name="lock-closed" size={29} color={palette.accent} /><Text style={[styles.centerTitle, { color: palette.label }]}>Sign in to use your Circle</Text><Text style={[styles.centerBody, { color: palette.secondary }]}>Connections are mutual and private. There is no public discovery or contact-book upload.</Text><AppButton label="Sign in" onPress={() => router.push("/auth")} /></Card> : <>
        {message ? <DataTile><Text style={[styles.message, { color: palette.secondary }]}>{message}</Text></DataTile> : null}
        <SectionHeader title="Invite privately" caption="Use an exact handle, or create a seven-day link and QR code." />
        <Card style={styles.form}><TextInput autoCapitalize="none" accessibilityLabel="Exact private handle" placeholder="exact_handle" placeholderTextColor={palette.tertiary} value={handle} onChangeText={setHandle} style={[styles.input, { color: palette.label, borderColor: palette.border, backgroundColor: palette.surfaceElevated }]} /><View style={styles.buttonRow}><AppButton disabled={busy} label="Invite handle" style={{ flex: 1 }} onPress={() => void invite(true)} /><AppButton disabled={busy} label="Create link" variant="secondary" style={{ flex: 1 }} onPress={() => void invite(false)} /></View>{inviteUrl ? <View style={styles.qrWrap}><View style={styles.qr}><QRCode value={inviteUrl} size={150} color="#09090D" backgroundColor="#FFFFFF" /></View><Text numberOfLines={2} style={[styles.link, { color: palette.secondary }]}>{inviteUrl}</Text><AppButton label="Share invite" variant="secondary" onPress={() => void Share.share({ message: `Join my private BodyFitness Circle: ${inviteUrl}` })} /></View> : null}</Card>

        <SectionHeader title="Members" caption="Default: goal progress and achievements. Exact steps and other details are opt-in." />
        {!circle.members.length ? <EmptyState title="No connections yet" body="Create a private invitation above. Both people must accept before anything is shared." /> : circle.members.map((member) => <Card key={member.connection.id} style={styles.member}><View style={styles.memberHead}><View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><Text style={[styles.avatarText, { color: palette.accent }]}>{member.connection.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[styles.memberName, { color: palette.label }]}>{member.connection.displayName}</Text><Text style={[styles.memberHandle, { color: palette.secondary }]}>@{member.connection.handle}</Text></View><Pressable accessibilityLabel={`Remove ${member.connection.displayName}`} onPress={() => remove(member.connection.id, member.connection.displayName)}><Ionicons name="trash-outline" size={20} color={palette.danger} /></Pressable></View>{member.summary ? <DataTile><View style={styles.summary}><View><Text style={[styles.summaryValue, { color: palette.label }]}>{Math.round(member.summary.stepGoalPercent * 100)}%</Text><Text style={[styles.summaryLabel, { color: palette.tertiary }]}>GOAL</Text></View><View><Text style={[styles.summaryValue, { color: palette.label }]}>{member.summary.steps?.toLocaleString() ?? "Private"}</Text><Text style={[styles.summaryLabel, { color: palette.tertiary }]}>STEPS</Text></View><View><Text style={[styles.summaryValue, { color: palette.label }]}>{member.summary.streakDays}</Text><Text style={[styles.summaryLabel, { color: palette.tertiary }]}>STREAK</Text></View></View><SourceBadge source={member.summary.source} syncedAt={member.summary.syncedAt} /></DataTile> : null}<PrivacyToggle label="Share exact steps" value={member.connection.sharing.exactSteps} onValueChange={(value) => void changeSharing(member.connection.id, { ...member.connection.sharing, exactSteps: value })} /><PrivacyToggle label="Share workout summaries" value={member.connection.sharing.workoutSummaries} onValueChange={(value) => void changeSharing(member.connection.id, { ...member.connection.sharing, workoutSummaries: value })} /><PrivacyToggle label="Share personal records" value={member.connection.sharing.personalRecords} onValueChange={(value) => void changeSharing(member.connection.id, { ...member.connection.sharing, personalRecords: value })} />{member.achievements.slice(0, 2).map((achievement) => <View key={achievement.id} style={styles.achievement}><Ionicons name="trophy" size={16} color={palette.warning} /><Text style={[styles.achievementText, { color: palette.secondary }]}>{achievement.title}</Text></View>)}</Card>)}
      </>}
    </Screen>
  );
}

function PrivacyToggle({ label, value, onValueChange }: { label: string; value: boolean; onValueChange: (value: boolean) => void }) { const palette = usePalette(); return <View style={styles.toggleRow}><Text style={[styles.toggleLabel, { color: palette.label }]}>{label}</Text><Switch accessibilityLabel={label} value={value} onValueChange={onValueChange} trackColor={{ false: palette.fill, true: palette.success }} thumbColor="#FFFFFF" /></View>; }

const styles = StyleSheet.create({
  close: { width: 46, height: 46, borderWidth: 1, borderRadius: 15, alignItems: "center", justifyContent: "center" }, center: { alignItems: "center", gap: 12, paddingVertical: 25 }, centerTitle: { fontSize: 18, fontWeight: "900" }, centerBody: { maxWidth: 300, textAlign: "center", fontSize: 12, lineHeight: 18 }, message: { fontSize: 11, lineHeight: 17 }, form: { gap: 11 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 }, buttonRow: { flexDirection: "row", gap: 9 }, qrWrap: { alignItems: "center", gap: 10, marginTop: 4 }, qr: { padding: 13, borderRadius: 18, backgroundColor: "#FFF" }, link: { maxWidth: 300, textAlign: "center", fontSize: 9 }, member: { gap: 11 }, memberHead: { flexDirection: "row", alignItems: "center", gap: 11 }, avatar: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 17, fontWeight: "900" }, memberName: { fontSize: 15, fontWeight: "800" }, memberHandle: { marginTop: 2, fontSize: 10 }, summary: { flexDirection: "row", justifyContent: "space-between", marginBottom: 9 }, summaryValue: { fontSize: 16, fontWeight: "900" }, summaryLabel: { marginTop: 2, fontSize: 8, fontWeight: "900" }, toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 43 }, toggleLabel: { fontSize: 12, fontWeight: "700" }, achievement: { flexDirection: "row", alignItems: "center", gap: 8 }, achievementText: { fontSize: 10 },
});
