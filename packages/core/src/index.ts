import type { Achievement, HealthSource, StepSnapshot } from "@bodyfitness/contracts";

export const designTokens = {
  background: "#09090d",
  surface: "#121218",
  surfaceElevated: "#181820",
  accent: "#7c5cff",
  energy: "#ff668a",
  protein: "#b7f36b",
  steps: "#65d9ff",
  success: "#7ee787",
  warning: "#ffbd59",
  danger: "#ff5d69",
} as const;

export function effectiveStepSnapshot(
  provider: StepSnapshot | null,
  manual: StepSnapshot | null,
): StepSnapshot | null {
  if (manual?.isManualOverride) return manual;
  return provider ?? manual;
}

export interface AchievementInput {
  userId: string;
  date: string;
  steps: number;
  stepTarget: number;
  currentStepStreak: number;
  workoutCount: number;
  personalRecords: Array<{ id: string; name: string; achievedAt: string }>;
}

export function deriveAchievements(input: AchievementInput): Achievement[] {
  const achievements: Achievement[] = [];
  if (input.steps >= input.stepTarget) {
    achievements.push({
      id: `step-goal:${input.userId}:${input.date}`,
      userId: input.userId,
      kind: "step-goal",
      title: "Step target complete",
      description: `${input.steps.toLocaleString("en-US")} steps logged`,
      achievedAt: `${input.date}T23:59:59.000Z`,
      periodKey: input.date,
      metadata: { steps: input.steps, target: input.stepTarget },
    });
  }
  if (input.currentStepStreak > 0 && input.currentStepStreak % 7 === 0) {
    achievements.push({
      id: `step-streak:${input.userId}:${input.currentStepStreak}`,
      userId: input.userId,
      kind: "step-streak",
      title: `${input.currentStepStreak}-day movement streak`,
      description: "Daily step target maintained",
      achievedAt: `${input.date}T23:59:59.000Z`,
      periodKey: String(input.currentStepStreak),
      metadata: { days: input.currentStepStreak },
    });
  }
  for (const milestone of [1, 10, 25, 50, 100]) {
    if (input.workoutCount === milestone) {
      achievements.push({
        id: `workout-count:${input.userId}:${milestone}`,
        userId: input.userId,
        kind: "workout-count",
        title: `${milestone} workout${milestone === 1 ? "" : "s"} completed`,
        description: "Training consistency milestone",
        achievedAt: `${input.date}T23:59:59.000Z`,
        periodKey: String(milestone),
        metadata: { count: milestone },
      });
    }
  }
  achievements.push(
    ...input.personalRecords.map((record) => ({
      id: `personal-record:${input.userId}:${record.id}`,
      userId: input.userId,
      kind: "personal-record" as const,
      title: `New ${record.name} PR`,
      description: "Personal strength record",
      achievedAt: record.achievedAt,
      periodKey: record.id,
      metadata: { recordId: record.id },
    })),
  );
  return achievements;
}

export function healthSourceLabel(source: HealthSource | null): string {
  if (source === "apple-health") return "Apple Health";
  if (source === "health-connect") return "Health Connect";
  if (source === "cloud") return "Synced device";
  if (source === "manual") return "Manual";
  return "Not connected";
}
