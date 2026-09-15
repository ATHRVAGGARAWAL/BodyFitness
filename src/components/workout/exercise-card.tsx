"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { VoiceLogButton } from "@/components/workout/voice-log-button";
import { reduceable, T, usePrefersReducedMotion } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";
import type { Exercise, SetLog, VoiceSetParse } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Starting values for the editable weight field before an exercise has any history.
 * These seed a form input only — they never feed the displayed best or PR detection.
 */
const startingWeights: Record<string, { weight: number; reps: number }> = {
  "bench-press": { weight: 70, reps: 8 },
  "incline-db": { weight: 25, reps: 10 },
  "shoulder-press": { weight: 42.5, reps: 8 },
  "lat-pulldown": { weight: 62.5, reps: 10 },
  "barbell-row": { weight: 60, reps: 8 },
  "back-squat": { weight: 90, reps: 6 },
  "romanian-deadlift": { weight: 85, reps: 8 },
  "incline-bench": { weight: 60, reps: 8 },
  "front-squat": { weight: 70, reps: 7 },
};

interface DraftSet {
  weightKg: number;
  reps: number;
  complete: boolean;
  isPr: boolean;
}

/**
 * Row tint is a share of the row's own `currentColor`, so it tracks the theme without
 * hard-coded colours: a PR row switches its text colour to `success` and the tint follows.
 */
const rowTint = (share: number) => `color-mix(in srgb, currentColor ${share}%, transparent)`;

export function ExerciseCard({ exercise, dayId, index }: { exercise: Exercise; dayId: string; index: number }) {
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const logSet = useBodyFitnessStore((state) => state.logSet);
  const startRestTimer = useBodyFitnessStore((state) => state.startRestTimer);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const [expanded, setExpanded] = useState(index === 0);
  const reduced = usePrefersReducedMotion();
  const transition = reduceable(T.base, reduced);

  const previousBySet = useMemo(() => {
    const map = new Map<number, SetLog>();
    setLogs.filter((log) => log.exerciseId === exercise.id).forEach((log) => {
      if (!map.has(log.setNumber)) map.set(log.setNumber, log);
    });
    return map;
  }, [exercise.id, setLogs]);

  const [sets, setSets] = useState<DraftSet[]>(() =>
    Array.from({ length: exercise.sets }, (_, setIndex) => {
      const logged = previousBySet.get(setIndex + 1);
      if (logged) {
        return { weightKg: logged.weightKg, reps: logged.reps, complete: false, isPr: false };
      }
      const start = startingWeights[exercise.id];
      return {
        weightKg: start ? start.weight : 20,
        reps: start ? Math.max(exercise.repMin, start.reps - (setIndex > 1 ? 1 : 0)) : exercise.repMin,
        complete: false,
        isPr: false,
      };
    }),
  );

  const completedCount = sets.filter((set) => set.complete).length;
  const bestE1rm = Math.max(0, ...previousBySet.values().map((log) => log.e1rm));
  const restSeconds = exercise.restSeconds ?? restDefaults[exercise.type];
  const panelId = `exercise-${exercise.id}-sets`;

  function updateSet(setIndex: number, patch: Partial<DraftSet>) {
    setSets((current) => current.map((set, index) => index === setIndex ? { ...set, ...patch } : set));
  }

  function completeSet(setIndex: number) {
    const draft = sets[setIndex];
    const log = logSet({
      dayId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber: setIndex + 1,
      weightKg: draft.weightKg,
      reps: draft.reps,
      restPrescribedSeconds: restSeconds,
    });
    updateSet(setIndex, { complete: true, isPr: log.isPr });
    startRestTimer(exercise.name, restSeconds);
  }

  function fillFromVoice(result: VoiceSetParse) {
    const next = sets.findIndex((set) => !set.complete);
    if (next < 0) return;
    updateSet(next, {
      weightKg: result.weightKg ?? sets[next].weightKg,
      reps: result.reps ?? sets[next].reps,
    });
    setExpanded(true);
  }

  return (
    // Same surface as <Card>, on a motion element so the expand/collapse reflows siblings smoothly.
    <motion.article layout transition={T.layout} className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="number-font flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-medium">{exercise.name}</span>
          <span className="number-font mt-0.5 block text-xs text-muted-foreground">
            {exercise.sets} sets · {exercise.repMin}–{exercise.repMax} reps · <span className="uppercase tracking-[0.04em]">{exercise.type}</span>
          </span>
        </span>
        <span className="text-right">
          <span className={cn("number-font block text-sm font-medium", completedCount === exercise.sets && exercise.sets > 0 ? "text-success" : "text-foreground")}>
            {completedCount}<span className="text-subtle-foreground">/{exercise.sets}</span>
          </span>
          <span className="block text-xs text-subtle-foreground">complete</span>
        </span>
        {expanded ? <ChevronUp size={16} className="shrink-0 text-subtle-foreground" /> : <ChevronDown size={16} className="shrink-0 text-subtle-foreground" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 pb-4 pt-4">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Previous best</p>
                  <p className="number-font mt-1 text-lg font-semibold leading-none">
                    {bestE1rm ? bestE1rm.toFixed(1) : "—"}
                    <span className="ml-1 text-xs font-medium tracking-normal text-subtle-foreground">kg e1RM</span>
                  </p>
                  {!bestE1rm ? <p className="mt-1 text-xs text-muted-foreground">Log a set to establish a baseline.</p> : null}
                </div>
                <VoiceLogButton exerciseName={exercise.name} onParsed={fillFromVoice} />
              </div>

              <div className="mb-1.5 grid grid-cols-[32px_1fr_1fr_40px] gap-2 px-1 text-center text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">
                <span>Set</span><span>kg</span><span>reps</span><span aria-hidden />
              </div>
              <div className="flex flex-col gap-1.5">
                {sets.map((set, setIndex) => (
                  <motion.div
                    key={setIndex}
                    animate={{ backgroundColor: set.isPr ? rowTint(12) : set.complete ? rowTint(5) : rowTint(0) }}
                    transition={transition}
                    className={cn("grid min-h-12 grid-cols-[32px_1fr_1fr_40px] items-center gap-2 rounded-lg border border-border px-1.5", set.isPr && "text-success")}
                  >
                    <span className="number-font text-center font-mono text-xs text-subtle-foreground">{setIndex + 1}</span>
                    <SetInput value={set.weightKg} step={0.5} disabled={set.complete} onChange={(weightKg) => updateSet(setIndex, { weightKg })} />
                    <SetInput value={set.reps} disabled={set.complete} onChange={(reps) => updateSet(setIndex, { reps })} />
                    <button
                      type="button"
                      aria-label={`Complete set ${setIndex + 1}`}
                      disabled={set.complete}
                      onClick={() => completeSet(setIndex)}
                      className={cn(
                        "pressable flex size-9 items-center justify-center rounded-md border transition-colors",
                        set.isPr
                          ? "border-border bg-card text-success"
                          : set.complete
                            ? "border-border bg-card text-foreground"
                            : "border-transparent bg-primary text-primary-foreground hover:opacity-90",
                      )}
                    >
                      {set.isPr ? <Trophy size={15} /> : <Check size={16} strokeWidth={2.4} />}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function SetInput({ value, step = 1, disabled, onChange }: { value: number; step?: number; disabled: boolean; onChange: (value: number) => void }) {
  return (
    <Input
      aria-label="Set value"
      type="number"
      inputMode="decimal"
      step={step}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
      className="h-9 px-2 text-center text-sm font-medium disabled:border-transparent disabled:bg-transparent disabled:opacity-100 disabled:text-muted-foreground"
    />
  );
}
