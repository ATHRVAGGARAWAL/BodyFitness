import { Ionicons } from "@expo/vector-icons";
import { effectiveStepSnapshot } from "@bodyfitness/core";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppAuth } from "../../src/auth/auth-provider";
import { apiConfigured } from "../../src/api/client";
import { AppButton, Card, DataTile, PageHeader, Screen, SectionHeader, SourceBadge } from "../../src/components/ui";
import { refreshNativeSteps } from "../../src/health/health-sync";
import { localDateKey } from "../../src/lib/date";
import { enablePushNotifications } from "../../src/notifications";
import { deleteCloudAccount, syncCloud } from "../../src/sync/sync-engine";
import { useMobileStore, type ThemePreference } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

export default function ProfileScreen() {
  const palette = usePalette();
  const auth = useAppAuth();
  const profile = useMobileStore((state) => state.profile);
  const updateProfile = useMobileStore((state) => state.updateProfile);
  const healthPermission = useMobileStore((state) => state.healthPermission);
  const healthMessage = useMobileStore((state) => state.healthMessage);
  const theme = useMobileStore((state) => state.themePreference);
  const setTheme = useMobileStore((state) => state.setThemePreference);
  const setManualSteps = useMobileStore((state) => state.setManualSteps);
  const clearManualOverride = useMobileStore((state) => state.clearManualOverride);
  const provider = useMobileStore((state) => state.providerSteps[localDateKey()] ?? null);
  const manual = useMobileStore((state) => state.manualSteps[localDateKey()] ?? null);
  const pushToken = useMobileStore((state) => state.pushToken);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [birthDate, setBirthDate] = useState(profile.birthDate ?? "");
  const [manualInput, setManualInput] = useState(manual?.steps ? String(manual.steps) : "");
  const [message, setMessage] = useState<string | null>(null);
  const steps = effectiveStepSnapshot(provider, manual);

  const saveProfile = async () => {
    const normalizedHandle = handle.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24);
    if (normalizedHandle.length < 3) return setMessage("Your private handle needs at least three characters.");
    if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || ageFromBirthDate(birthDate) < 13)) return setMessage("Enter a valid birth date. BodyFitness accounts require age 13+.");
    updateProfile({ ...profile, displayName: displayName.trim() || "Athlete", handle: normalizedHandle, birthDate: birthDate || null, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" });
    setMessage("Profile saved locally. It will sync when signed in.");
    if (auth.signedIn) await syncCloud(auth.getToken).catch((error) => setMessage(error instanceof Error ? error.message : "Profile sync failed."));
  };

  const connectHealth = async () => {
    setMessage("Requesting read-only step access…");
    try {
      await refreshNativeSteps({ requestPermission: true });
      setMessage("Native steps connected. Updates occur on app launch/resume and best-effort background windows.");
      if (auth.signedIn) await syncCloud(auth.getToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Health connection failed.");
    }
  };

  const saveManualSteps = () => {
    const value = Number(manualInput);
    if (!Number.isFinite(value) || value < 0 || value > 200_000) return setMessage("Enter a step count between 0 and 200,000.");
    setManualSteps(value);
    setMessage("Manual override saved. Clear it to restore the connected device value.");
  };

  const enableNotifications = async () => {
    setMessage("Requesting notification permission…");
    try { await enablePushNotifications(); setMessage("Notifications enabled. The token will register on the next sync."); if (auth.signedIn) await syncCloud(auth.getToken); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Notifications could not be enabled."); }
  };

  const exportData = async () => {
    if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) return setMessage("File sharing is unavailable on this device.");
    const path = `${FileSystem.cacheDirectory}bodyfitness-export-${localDateKey()}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(useMobileStore.getState(), null, 2));
    await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Export BodyFitness data" });
  };

  const removeAccount = () => Alert.alert("Delete cloud account?", "This permanently removes synced profile, social connections, steps, and logs. Device-local data stays until you remove the app.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void (async () => { const token = await auth.getToken(); if (token) await deleteCloudAccount(token); await auth.deleteIdentity(); setMessage("Cloud account deleted. Local guest data remains on this device."); })().catch((error) => setMessage(error instanceof Error ? error.message : "Deletion failed.")) }]);

  return (
    <Screen>
      <PageHeader eyebrow="Private by default" title="Profile" />
      <Card style={styles.identityHero}><View style={[styles.avatar, { backgroundColor: palette.accentSoft }]}><Text style={[styles.avatarText, { color: palette.accent }]}>{displayName.trim().slice(0, 1).toUpperCase() || "A"}</Text></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: palette.label }]}>{displayName || "Athlete"}</Text><Text style={[styles.handle, { color: palette.secondary }]}>@{handle || "athlete"}</Text><Text style={[styles.accountStatus, { color: palette.tertiary }]}>{auth.signedIn ? `Cloud sync · ${auth.email}` : "Guest mode · stored on this device"}</Text></View></Card>

      {message ? <DataTile><Text accessibilityLiveRegion="polite" style={[styles.message, { color: palette.secondary }]}>{message}</Text></DataTile> : null}

      <SectionHeader title="Identity" caption="Birth date is private and used only to enforce the 13+ requirement." />
      <Card style={styles.form}><Field label="DISPLAY NAME" value={displayName} onChangeText={setDisplayName} /><Field autoCapitalize="none" label="PRIVATE HANDLE" value={handle} onChangeText={setHandle} /><Field keyboardType="numbers-and-punctuation" label="BIRTH DATE · YYYY-MM-DD" value={birthDate} onChangeText={setBirthDate} /><AppButton label="Save profile" onPress={() => void saveProfile()} /></Card>

      <SectionHeader title="Friends & Family" caption="Mutual invitations, no public discovery, location, contact upload, or messages." />
      <Pressable accessibilityRole="button" onPress={() => router.push("/profile/circle")}><Card style={styles.rowCard}><View style={[styles.rowIcon, { backgroundColor: palette.accentSoft }]}><Ionicons name="people" size={22} color={palette.accent} /></View><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.label }]}>Your Circle</Text><Text style={[styles.rowBody, { color: palette.secondary }]}>Manage invitations, achievements, and per-person sharing.</Text></View><Ionicons name="chevron-forward" size={19} color={palette.tertiary} /></Card></Pressable>

      <SectionHeader title="Steps and health" caption="The iPhone web app cannot read Apple Health. This native app uploads the daily aggregate for the PWA." />
      <Card style={styles.form}><View style={styles.sourceRow}><View style={{ flex: 1 }}><Text style={[styles.rowTitle, { color: palette.label }]}>Native step source</Text><Text style={[styles.rowBody, { color: palette.secondary }]}>{healthMessage ?? healthStatusCopy(healthPermission)}</Text></View><Ionicons name={healthPermission === "connected" ? "checkmark-circle" : "heart-outline"} size={25} color={healthPermission === "connected" ? palette.success : palette.steps} /></View><SourceBadge source={steps?.source ?? null} syncedAt={steps?.syncedAt ?? null} />{healthPermission === "denied" ? <AppButton label="Open device settings" variant="secondary" onPress={() => void Linking.openSettings()} /> : <AppButton label={healthPermission === "connected" ? "Refresh native steps" : "Connect read-only steps"} onPress={() => void connectHealth()} />}</Card>
      <Card style={styles.form}><Text style={[styles.rowTitle, { color: palette.label }]}>Manual override</Text><Text style={[styles.rowBody, { color: palette.secondary }]}>Useful when no native device is connected. It replaces—not adds to—the device total.</Text><View style={styles.manualRow}><TextInput accessibilityLabel="Manual step count" keyboardType="number-pad" placeholder="Steps" placeholderTextColor={palette.tertiary} value={manualInput} onChangeText={setManualInput} style={[styles.input, styles.manualInput, { color: palette.label, backgroundColor: palette.surfaceElevated, borderColor: palette.border }]} /><AppButton label="Set" style={styles.setButton} onPress={saveManualSteps} /></View>{manual ? <AppButton label="Clear override and restore device" variant="secondary" onPress={() => { clearManualOverride(); setManualInput(""); }} /> : null}</Card>

      <SectionHeader title="Appearance" />
      <Card style={styles.segment}>{(["system", "light", "dark"] as ThemePreference[]).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: theme === value }} onPress={() => setTheme(value)} style={[styles.segmentItem, { backgroundColor: theme === value ? palette.accentSoft : "transparent", borderColor: theme === value ? palette.accent : "transparent" }]}><Ionicons name={value === "system" ? "phone-portrait-outline" : value === "light" ? "sunny-outline" : "moon-outline"} color={theme === value ? palette.accent : palette.secondary} size={18} /><Text style={{ color: theme === value ? palette.accent : palette.secondary, fontSize: 11, fontWeight: "800", textTransform: "capitalize" }}>{value}</Text></Pressable>)}</Card>

      <SectionHeader title="Cloud and notifications" />
      <Card style={styles.form}><AppButton label="Export my data" variant="secondary" onPress={() => void exportData().catch((error) => setMessage(error instanceof Error ? error.message : "Export failed."))} />{auth.signedIn ? <><AppButton label="Sync now" onPress={() => void syncCloud(auth.getToken).catch((error) => setMessage(error instanceof Error ? error.message : "Sync failed."))} /><AppButton label={pushToken ? "Notifications enabled" : "Enable notifications"} disabled={Boolean(pushToken)} variant="secondary" onPress={() => void enableNotifications()} /><AppButton label="Sign out" variant="secondary" onPress={() => void auth.signOut()} /><AppButton label="Delete cloud account" variant="danger" onPress={removeAccount} /></> : <><Text style={[styles.rowBody, { color: palette.secondary }]}>Sign in with Apple, Google, or an email link to sync and use Friends & Family. Guest tracking remains available.</Text><AppButton label={auth.configured && apiConfigured ? "Sign in" : "Cloud setup required"} disabled={!auth.configured || !apiConfigured} onPress={() => router.push("/auth")} /></>}</Card>

      <SectionHeader title="Privacy defaults" />
      <Card style={styles.form}><PrivacyLine title="Goal completion" value="Shared by default" /><PrivacyLine title="Achievements" value="Shared by default" /><PrivacyLine title="Exact steps" value="Opt-in per connection" /><PrivacyLine title="Workouts and PRs" value="Opt-in per connection" /><PrivacyLine title="Weight, meals, photos" value="Never in Circle feed" /></Card>
    </Screen>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { const palette = usePalette(); return <View><Text style={[styles.fieldLabel, { color: palette.tertiary }]}>{label}</Text><TextInput placeholderTextColor={palette.tertiary} style={[styles.input, { color: palette.label, backgroundColor: palette.surfaceElevated, borderColor: palette.border }]} {...props} /></View>; }
function PrivacyLine({ title, value }: { title: string; value: string }) { const palette = usePalette(); return <View style={styles.privacyLine}><Text style={[styles.privacyTitle, { color: palette.label }]}>{title}</Text><Text style={[styles.privacyValue, { color: palette.secondary }]}>{value}</Text></View>; }
function ageFromBirthDate(value: string) { const birth = new Date(`${value}T12:00:00`); const now = new Date(); let age = now.getFullYear() - birth.getFullYear(); if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1; return age; }
function healthStatusCopy(status: string) { if (status === "connected") return "Connected. BodyFitness refreshes on launch and resume."; if (status === "unavailable") return "Native health data is unavailable on this device."; if (status === "error") return "The last health refresh failed."; return "Connect once after reviewing the read-only step permission."; }

const styles = StyleSheet.create({
  identityHero: { flexDirection: "row", alignItems: "center", gap: 13 }, avatar: { width: 59, height: 59, borderRadius: 19, alignItems: "center", justifyContent: "center" }, avatarText: { fontSize: 24, fontWeight: "900" }, name: { fontSize: 20, fontWeight: "900" }, handle: { marginTop: 2, fontSize: 12, fontWeight: "700" }, accountStatus: { marginTop: 5, fontSize: 9 }, message: { fontSize: 11, lineHeight: 17 },
  form: { gap: 12 }, fieldLabel: { marginBottom: 6, fontSize: 8, fontWeight: "900", letterSpacing: 0.9 }, input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 }, rowCard: { flexDirection: "row", alignItems: "center", gap: 12 }, rowIcon: { width: 47, height: 47, borderRadius: 15, alignItems: "center", justifyContent: "center" }, rowTitle: { fontSize: 14, fontWeight: "800" }, rowBody: { marginTop: 4, fontSize: 11, lineHeight: 16 }, sourceRow: { flexDirection: "row", alignItems: "center", gap: 12 }, manualRow: { flexDirection: "row", gap: 9 }, manualInput: { flex: 1 }, setButton: { width: 82 },
  segment: { flexDirection: "row", padding: 5, gap: 4 }, segmentItem: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }, privacyLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 35 }, privacyTitle: { flex: 1, fontSize: 12, fontWeight: "700" }, privacyValue: { fontSize: 10, textAlign: "right" },
});
