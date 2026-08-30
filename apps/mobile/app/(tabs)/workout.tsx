import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton, Card, DataTile, PageHeader, Screen, SectionHeader } from "../../src/components/ui";
import { useMobileStore } from "../../src/store/mobile-store";
import { usePalette } from "../../src/theme";

const routines = [
  { name: "Push strength", duration: 50, accent: "#FF668A", exercises: ["Bench press", "Shoulder press", "Triceps pressdown"] },
  { name: "Pull strength", duration: 50, accent: "#65D9FF", exercises: ["Deadlift", "Lat pulldown", "Cable row"] },
  { name: "Leg strength", duration: 55, accent: "#B7F36B", exercises: ["Back squat", "Romanian deadlift", "Leg press"] },
];

export default function WorkoutScreen() {
  const palette = usePalette();
  const completeWorkout = useMobileStore((state) => state.completeWorkout);
  const workouts = useMobileStore((state) => state.workouts);
  const [active, setActive] = useState<(typeof routines)[number] | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const start = async (routine: (typeof routines)[number]) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActive(routine);
    setElapsed(0);
  };

  const finish = async () => {
    if (!active) return;
    const minutes = Math.max(1, Math.round(elapsed / 60));
    completeWorkout(active.name, minutes);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setActive(null);
  };

  return (
    <Screen>
      <PageHeader eyebrow="Train with intent" title="Workout" />
      {active ? <Card style={styles.active}><Text style={[styles.activeKicker, { color: active.accent }]}>WORKOUT ACTIVE</Text><Text style={[styles.activeTitle, { color: palette.label }]}>{active.name}</Text><Text accessibilityLabel={`${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds elapsed`} style={[styles.timer, { color: palette.label }]}>{String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}</Text><View style={styles.exerciseList}>{active.exercises.map((exercise, index) => <DataTile key={exercise} style={styles.exercise}><Text style={[styles.exerciseIndex, { color: active.accent }]}>{String(index + 1).padStart(2, "0")}</Text><Text style={[styles.exerciseName, { color: palette.label }]}>{exercise}</Text><Ionicons name="checkmark-circle-outline" size={21} color={palette.tertiary} /></DataTile>)}</View><AppButton label="Finish workout" onPress={() => void finish()} /></Card> : null}

      <SectionHeader title="Your plan" caption="Simple strength sessions with enough recovery to progress." />
      {routines.map((routine) => <Pressable key={routine.name} disabled={Boolean(active)} onPress={() => void start(routine)}><Card style={styles.routine}><View style={[styles.routineIcon, { backgroundColor: `${routine.accent}20` }]}><Ionicons name="barbell" size={23} color={routine.accent} /></View><View style={styles.routineCopy}><Text style={[styles.routineTitle, { color: palette.label }]}>{routine.name}</Text><Text style={[styles.routineBody, { color: palette.secondary }]}>{routine.exercises.join(" · ")}</Text></View><Text style={[styles.duration, { color: palette.tertiary }]}>{routine.duration}m</Text></Card></Pressable>)}

      <SectionHeader title="Recent training" />
      {workouts.slice(0, 4).map((workout) => <DataTile key={workout.id} style={styles.history}><Ionicons name="checkmark-done" size={18} color={palette.success} /><View style={styles.routineCopy}><Text style={[styles.historyTitle, { color: palette.label }]}>{workout.name}</Text><Text style={[styles.routineBody, { color: palette.tertiary }]}>{new Date(workout.completedAt).toLocaleDateString()} · {workout.durationMinutes} min</Text></View></DataTile>)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  active: { gap: 13 }, activeKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 }, activeTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -0.8 }, timer: { fontSize: 44, lineHeight: 50, fontWeight: "900", letterSpacing: -1.7, fontVariant: ["tabular-nums"] },
  exerciseList: { gap: 8 }, exercise: { flexDirection: "row", alignItems: "center", gap: 12 }, exerciseIndex: { fontSize: 10, fontWeight: "900" }, exerciseName: { flex: 1, fontSize: 13, fontWeight: "700" },
  routine: { flexDirection: "row", alignItems: "center", gap: 12 }, routineIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" }, routineCopy: { flex: 1 }, routineTitle: { fontSize: 15, fontWeight: "800" }, routineBody: { marginTop: 4, fontSize: 10, lineHeight: 15 }, duration: { fontSize: 11, fontWeight: "800" },
  history: { flexDirection: "row", alignItems: "center", gap: 11 }, historyTitle: { fontSize: 13, fontWeight: "800" },
});
