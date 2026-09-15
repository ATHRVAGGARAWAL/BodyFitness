import { mealTotalsForDate } from "@/lib/calculations";
import { localDateKey, shiftDate } from "@/lib/date";
import type { CoachRequest, Goal } from "@/lib/ai/schemas";
import type { BodyFitnessStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";

/** Infers a goal from the profile when the user has not chosen one explicitly. */
export function inferGoal(profile: UserProfile): Goal {
  if (profile.goal) return profile.goal;
  const delta = profile.goalWeightKg - profile.currentWeightKg;
  if (delta <= -2) return profile.deficitPercent <= 12 ? "recomp" : "fat-loss";
  if (delta >= 2) return "muscle-gain";
  return "maintain";
}

type CoachState = Pick<BodyFitnessStore, "profile" | "targets" | "meals" | "dailyByDate" | "sessions" | "setLogs" | "weightEntries">;

/** Builds the review payload from store state. Pure, so it is unit-testable. */
export function buildCoachRequest(state: CoachState, days = 7, today = localDateKey()): CoachRequest {
  const dates = Array.from({ length: days }, (_, index) => shiftDate(today, index - (days - 1)));
  const trainedDates = new Set(
    state.sessions.filter((session) => session.endedAt).map((session) => localDateKey(session.startedAt)),
  );
  const windowStart = dates[0];

  return {
    goal: inferGoal(state.profile),
    targets: {
      calories: state.targets.calories,
      proteinG: state.targets.proteinG,
      carbsG: state.targets.carbsG,
      fatG: state.targets.fatG,
      waterMl: state.targets.waterMl,
      steps: state.targets.steps,
    },
    profile: {
      age: state.profile.age,
      sex: state.profile.sex,
      currentWeightKg: state.profile.currentWeightKg,
      goalWeightKg: state.profile.goalWeightKg,
    },
    days: dates.map((date) => {
      const totals = mealTotalsForDate(state.meals, date);
      const daily = state.dailyByDate[date];
      const logged = totals.calories > 0 || Boolean(daily && (daily.waterMl > 0 || daily.steps > 0));
      return {
        date,
        calories: Math.round(totals.calories),
        proteinG: Math.round(totals.proteinG),
        carbsG: Math.round(totals.carbsG),
        fatG: Math.round(totals.fatG),
        waterMl: Math.round(daily?.waterMl ?? 0),
        steps: Math.round(daily?.steps ?? 0),
        trained: trainedDates.has(date),
        logged,
      };
    }),
    weights: state.weightEntries
      .filter((entry) => entry.date >= shiftDate(today, -30))
      .slice(0, 30)
      .map((entry) => ({ date: entry.date, weightKg: entry.weightKg })),
    personalRecords: state.setLogs.filter((log) => log.isPr && localDateKey(log.completedAt) >= windowStart).length,
  };
}

/** True when there is enough data for a review to say anything useful. */
export function hasEnoughForReview(request: CoachRequest) {
  return request.days.filter((day) => day.logged).length >= 2;
}
