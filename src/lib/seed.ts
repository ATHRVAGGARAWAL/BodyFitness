import type {
  Habit,
  MealEntry,
  ProgressPoint,
  UserProfile,
  WorkoutDay,
} from "@/lib/types";
import { localDateKey, shiftDate } from "@/lib/date";
import { calculateTargets } from "@/lib/calculations";

export const defaultProfile: UserProfile = {
  age: 24,
  sex: "male",
  heightCm: 178,
  currentWeightKg: 85,
  goalWeightKg: 78,
  bodyFatPercent: null,
  occupationActivity: "mixed",
  averageSteps: 7_500,
  trainingDays: 5,
  sessionMinutes: 70,
  sleepHours: 7.5,
  activityMultiplier: 1.55,
  deficitPercent: 10,
};

export const defaultTargets = calculateTargets(defaultProfile);

export const defaultHabits: Habit[] = [
  { id: "habit-protein-first", label: "Start with dal, eggs or curd" },
  { id: "habit-gravy", label: "Keep gravy to one ladle" },
  { id: "habit-produce", label: "Add salad or fruit" },
  { id: "habit-drinks", label: "Skip sugary drinks" },
];

function exercise(
  id: string,
  name: string,
  type: "compound" | "isolation",
  sets: number,
  repMin: number,
  repMax: number,
) {
  return { id, name, type, sets, repMin, repMax };
}

export const defaultWorkoutPlan: WorkoutDay[] = [
  {
    id: "push",
    name: "Push",
    accent: "#ff668a",
    exercises: [
      exercise("bench-press", "Barbell Bench Press", "compound", 4, 5, 8),
      exercise("incline-db", "Incline Dumbbell Press", "compound", 3, 8, 12),
      exercise("shoulder-press", "Seated Shoulder Press", "compound", 3, 6, 10),
      exercise("lateral-raise", "Cable Lateral Raise", "isolation", 3, 12, 18),
      exercise("triceps-pushdown", "Triceps Pushdown", "isolation", 3, 10, 15),
    ],
  },
  {
    id: "pull",
    name: "Pull",
    accent: "#65d9ff",
    exercises: [
      exercise("lat-pulldown", "Lat Pulldown", "compound", 4, 6, 10),
      exercise("barbell-row", "Barbell Row", "compound", 3, 6, 10),
      exercise("seated-row", "Seated Cable Row", "compound", 3, 8, 12),
      exercise("rear-delt", "Rear Delt Fly", "isolation", 3, 12, 18),
      exercise("barbell-curl", "Barbell Curl", "isolation", 3, 8, 12),
    ],
  },
  {
    id: "legs",
    name: "Legs",
    accent: "#ffbd59",
    exercises: [
      exercise("back-squat", "Back Squat", "compound", 4, 5, 8),
      exercise("romanian-deadlift", "Romanian Deadlift", "compound", 3, 6, 10),
      exercise("leg-press", "Leg Press", "compound", 3, 8, 12),
      exercise("leg-curl", "Lying Leg Curl", "isolation", 3, 10, 15),
      exercise("calf-raise", "Standing Calf Raise", "isolation", 4, 10, 15),
    ],
  },
  {
    id: "upper",
    name: "Upper",
    accent: "#7c5cff",
    exercises: [
      exercise("incline-bench", "Incline Bench Press", "compound", 3, 6, 10),
      exercise("pull-up", "Pull-up", "compound", 3, 6, 10),
      exercise("chest-row", "Chest-supported Row", "compound", 3, 8, 12),
      exercise("db-shoulder", "Dumbbell Shoulder Press", "compound", 3, 8, 12),
      exercise("cable-curl", "Cable Curl", "isolation", 3, 10, 15),
      exercise("overhead-triceps", "Overhead Triceps Extension", "isolation", 3, 10, 15),
    ],
  },
  {
    id: "lower",
    name: "Lower",
    accent: "#b7f36b",
    exercises: [
      exercise("front-squat", "Front Squat", "compound", 3, 5, 8),
      exercise("hip-thrust", "Hip Thrust", "compound", 3, 8, 12),
      exercise("split-squat", "Bulgarian Split Squat", "compound", 3, 8, 12),
      exercise("seated-leg-curl", "Seated Leg Curl", "isolation", 3, 10, 15),
      exercise("seated-calf", "Seated Calf Raise", "isolation", 4, 12, 18),
    ],
  },
];

export function demoMeals(): MealEntry[] {
  const today = localDateKey();
  return [
    {
      id: "demo-breakfast",
      name: "Masala omelette & toast",
      loggedAt: `${today}T08:20:00`,
      calories: 510,
      proteinG: 31,
      carbsG: 42,
      fatG: 24,
      source: "camera",
    },
    {
      id: "demo-lunch",
      name: "Dal, rice, roti & sabzi",
      loggedAt: `${today}T13:12:00`,
      calories: 760,
      proteinG: 29,
      carbsG: 118,
      fatG: 22,
      source: "camera",
    },
    {
      id: "demo-shake",
      name: "Whey banana shake",
      loggedAt: `${today}T17:35:00`,
      calories: 360,
      proteinG: 38,
      carbsG: 42,
      fatG: 5,
      source: "manual",
    },
  ];
}

export function demoProgress(): ProgressPoint[] {
  const today = localDateKey();
  return Array.from({ length: 12 }, (_, index) => {
    const weeksAgo = 11 - index;
    const date = shiftDate(today, -weeksAgo * 7);
    return {
      date,
      week: new Intl.DateTimeFormat("en-IN", { month: "short", day: "numeric" }).format(
        new Date(`${date}T12:00:00`),
      ),
      weight: Number((85 - index * 0.22 + Math.sin(index) * 0.15).toFixed(1)),
      e1rm: Number((76 + index * 0.72 + Math.sin(index / 2) * 0.6).toFixed(1)),
    };
  });
}
