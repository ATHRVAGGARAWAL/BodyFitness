import { Ionicons } from "@expo/vector-icons";
import { effectiveStepSnapshot } from "@bodyfitness/core";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppAuth } from "../../src/auth/auth-provider";
import { AppButton, Card, DataTile, PageHeader, ProgressRing, Screen, SectionHeader, SourceBadge } from "../../src/components/ui";
import { refreshNativeSteps } from "../../src/health/health-sync";
import { localDateKey } from "../../src/lib/date";
import { syncCloud } from "../../src/sync/sync-engine";
import { useMobileStore } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

export default function HomeScreen() {
  const palette = usePalette();
  const auth = useAppAuth();
  const date = localDateKey();
  const provider = useMobileStore((state) => state.providerSteps[date] ?? null);
  const manual = useMobileStore((state) => state.manualSteps[date] ?? null);
  const target = useMobileStore((state) => state.stepTarget);
  const circle = useMobileStore((state) => state.circle);
  const healthPermission = useMobileStore((state) => state.healthPermission);
  const syncStatus = useMobileStore((state) => state.syncStatus);
  const clearManualOverride = useMobileStore((state) => state.clearManualOverride);
  const steps = effectiveStepSnapshot(provider, manual);

  const refresh = async () => {
    await Haptics.selectionAsync();
    if (healthPermission === "connected") await refreshNativeSteps().catch(() => undefined);
    if (auth.signedIn) await syncCloud(auth.getToken).catch(() => undefined);
  };

  return (
    <Screen>
      <PageHeader eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} title={`Hi, ${auth.displayName?.split(" ")[0] ?? "Athlete"}`} action={<Pressable accessibilityLabel="Refresh health and cloud data" onPress={() => void refresh()} style={[styles.iconButton, { backgroundColor: palette.surfaceElevated, borderColor: palette.border }]}><Ionicons name={syncStatus === "syncing" ? "sync" : "refresh"} size={20} color={palette.accent} /></Pressable>} />
      <Card style={styles.hero}>
        <View style={styles.heroRow}><ProgressRing value={steps?.steps ?? 0} target={target} /><View style={styles.heroCopy}><Text style={[styles.heroKicker, { color: palette.steps }]}>DAILY MOVEMENT</Text><Text style={[styles.heroTitle, { color: palette.label }]}>{Math.round(Math.min(1, (steps?.steps ?? 0) / target) * 100)}% complete</Text><Text style={[styles.heroBody, { color: palette.secondary }]}>One primary health source is used, so the same steps are never added twice.</Text><SourceBadge source={steps?.source ?? null} syncedAt={steps?.syncedAt ?? null} /></View></View>
        {manual?.isManualOverride ? <AppButton label="Clear manual override" variant="secondary" onPress={() => clearManualOverride(date)} /> : null}
      </Card>

      <SectionHeader title="Today at a glance" />
      <View style={styles.metricRow}>
        <DataTile style={styles.metric}><Ionicons name="flame" size={18} color={palette.energy} /><Text style={[styles.metricValue, { color: palette.label }]}>{Math.round((steps?.steps ?? 0) * 0.04)}</Text><Text style={[styles.metricLabel, { color: palette.tertiary }]}>ACTIVE KCAL</Text></DataTile>
        <DataTile style={styles.metric}><Ionicons name="fitness" size={18} color={palette.protein} /><Text style={[styles.metricValue, { color: palette.label }]}>10K</Text><Text style={[styles.metricLabel, { color: palette.tertiary }]}>STEP TARGET</Text></DataTile>
        <DataTile style={styles.metric}><Ionicons name="cloud-done" size={18} color={palette.accent} /><Text style={[styles.metricValue, { color: palette.label }]}>{syncStatus === "synced" ? "ON" : auth.signedIn ? "…" : "LOCAL"}</Text><Text style={[styles.metricLabel, { color: palette.tertiary }]}>SYNC</Text></DataTile>
      </View>

      <SectionHeader title="Circle pulse" caption="Only goal summaries and achievements your connections chose to share." />
      <Pressable accessibilityRole="button" accessibilityLabel="Open Friends and Family Circle" onPress={() => router.push("/profile/circle")}>
        <Card style={styles.circleCard}>
          <View style={[styles.circleIcon, { backgroundColor: palette.accentSoft }]}><Ionicons name="people" size={24} color={palette.accent} /></View>
          <View style={styles.circleCopy}><Text style={[styles.circleTitle, { color: palette.label }]}>{circle.members.length ? `${circle.members.length} people in your Circle` : "Build a private Circle"}</Text><Text style={[styles.circleBody, { color: palette.secondary }]}>{circle.members.length ? `${circle.members.filter((member) => (member.summary?.stepGoalPercent ?? 0) >= 1).length} reached a goal today` : "Invite friends or family by exact handle, QR code, or expiring link."}</Text></View>
          <Ionicons name="chevron-forward" size={19} color={palette.tertiary} />
        </Card>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hero: { gap: 13 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroCopy: { flex: 1, gap: 7 },
  heroKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.1 },
  heroTitle: { fontSize: 20, lineHeight: 22, fontWeight: "900", letterSpacing: -0.5 },
  heroBody: { fontSize: 11, lineHeight: 16 },
  metricRow: { flexDirection: "row", gap: 9 },
  metric: { flex: 1, minHeight: 108, justifyContent: "space-between" },
  metricValue: { marginTop: 9, fontSize: 20, fontWeight: "900", fontVariant: ["tabular-nums"] },
  metricLabel: { marginTop: 3, fontSize: 8, fontWeight: "900", letterSpacing: 0.7 },
  circleCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  circleIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  circleCopy: { flex: 1 },
  circleTitle: { fontSize: 15, fontWeight: "800" },
  circleBody: { marginTop: 4, fontSize: 11, lineHeight: 16 },
});
