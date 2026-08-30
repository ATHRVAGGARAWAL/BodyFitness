import { Ionicons } from "@expo/vector-icons";
import { deriveAchievements, effectiveStepSnapshot } from "@bodyfitness/core";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { AppButton, Card, DataTile, PageHeader, Screen, SectionHeader } from "../../src/components/ui";
import { lastSevenDays, localDateKey } from "../../src/lib/date";
import { useMobileStore } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

export default function ProgressScreen() {
  const palette = usePalette();
  const provider = useMobileStore((state) => state.providerSteps);
  const manual = useMobileStore((state) => state.manualSteps);
  const target = useMobileStore((state) => state.stepTarget);
  const workouts = useMobileStore((state) => state.workouts);
  const weights = useMobileStore((state) => state.weights);
  const addWeight = useMobileStore((state) => state.addWeight);
  const [weight, setWeight] = useState("");
  const days = lastSevenDays();
  const today = effectiveStepSnapshot(provider[localDateKey()] ?? null, manual[localDateKey()] ?? null);
  const achievements = deriveAchievements({ userId: "mobile", date: localDateKey(), steps: today?.steps ?? 0, stepTarget: target, currentStepStreak: calculateStreak(days, provider, manual, target), workoutCount: workouts.length, personalRecords: [] });

  const saveWeight = () => {
    const value = Number(weight);
    if (!Number.isFinite(value) || value < 25 || value > 350) return;
    addWeight(value);
    setWeight("");
  };

  return (
    <Screen>
      <PageHeader eyebrow="Signals over noise" title="Progress" />
      <Card>
        <Text style={[styles.chartTitle, { color: palette.label }]}>Seven-day steps</Text>
        <View style={styles.chart}>{days.map((date) => { const snapshot = effectiveStepSnapshot(provider[date] ?? null, manual[date] ?? null); const ratio = Math.min(1, (snapshot?.steps ?? 0) / target); return <View key={date} style={styles.barColumn}><View style={[styles.barTrack, { backgroundColor: palette.fill }]}><View style={[styles.barFill, { height: `${Math.max(4, ratio * 100)}%`, backgroundColor: ratio >= 1 ? palette.success : palette.steps }]} /></View><Text style={[styles.day, { color: palette.tertiary }]}>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</Text></View>; })}</View>
      </Card>

      <SectionHeader title="Body weight" caption="Stored in your private account data and never shared by default." />
      <Card style={styles.weightCard}><View style={styles.weightRow}><TextInput accessibilityLabel="Weight in kilograms" keyboardType="decimal-pad" placeholder="Weight in kg" placeholderTextColor={palette.tertiary} value={weight} onChangeText={setWeight} style={[styles.input, { color: palette.label, borderColor: palette.border, backgroundColor: palette.surfaceElevated }]} /><AppButton label="Log" style={styles.logButton} onPress={saveWeight} /></View>{weights[0] ? <Text style={[styles.latest, { color: palette.secondary }]}>Latest: <Text style={{ color: palette.label, fontWeight: "900" }}>{weights[0].weightKg.toFixed(1)} kg</Text> on {new Date(`${weights[0].date}T12:00:00`).toLocaleDateString()}</Text> : null}</Card>

      <SectionHeader title="Achievements" />
      {achievements.length ? achievements.map((achievement) => <DataTile key={achievement.id} style={styles.achievement}><View style={[styles.trophy, { backgroundColor: palette.accentSoft }]}><Ionicons name="trophy" size={19} color={palette.accent} /></View><View style={styles.achievementCopy}><Text style={[styles.achievementTitle, { color: palette.label }]}>{achievement.title}</Text><Text style={[styles.achievementBody, { color: palette.secondary }]}>{achievement.description}</Text></View></DataTile>) : <Card><Text style={[styles.emptyTitle, { color: palette.label }]}>Your next milestone is close</Text><Text style={[styles.emptyBody, { color: palette.secondary }]}>Complete today’s step target or finish a workout to unlock an achievement.</Text></Card>}
    </Screen>
  );
}

function calculateStreak(days: string[], provider: Record<string, import("@bodyfitness/contracts").StepSnapshot>, manual: Record<string, import("@bodyfitness/contracts").StepSnapshot>, target: number) {
  let streak = 0;
  for (const date of [...days].reverse()) {
    const snapshot = effectiveStepSnapshot(provider[date] ?? null, manual[date] ?? null);
    if ((snapshot?.steps ?? 0) < target) break;
    streak += 1;
  }
  return streak;
}

const styles = StyleSheet.create({
  chartTitle: { fontSize: 16, fontWeight: "800" }, chart: { height: 170, flexDirection: "row", gap: 9, alignItems: "flex-end", marginTop: 17 }, barColumn: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" }, barTrack: { width: "100%", maxWidth: 30, height: 138, borderRadius: 10, overflow: "hidden", justifyContent: "flex-end" }, barFill: { width: "100%", borderRadius: 10 }, day: { marginTop: 7, fontSize: 9, fontWeight: "900" },
  weightCard: { gap: 12 }, weightRow: { flexDirection: "row", gap: 9 }, input: { flex: 1, minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 }, logButton: { width: 82 }, latest: { fontSize: 11 },
  achievement: { flexDirection: "row", alignItems: "center", gap: 12 }, trophy: { width: 43, height: 43, borderRadius: 14, alignItems: "center", justifyContent: "center" }, achievementCopy: { flex: 1 }, achievementTitle: { fontSize: 13, fontWeight: "800" }, achievementBody: { marginTop: 3, fontSize: 10 }, emptyTitle: { fontSize: 15, fontWeight: "800" }, emptyBody: { marginTop: 5, fontSize: 11, lineHeight: 17 },
});
