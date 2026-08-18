"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { VoiceLogButton } from "@/components/workout/voice-log-button";
import { epley1Rm, isProgressiveOverload } from "@/lib/calculations";
import { useBodyFitnessStore } from "@/lib/store";
import type { Exercise, SetLog, VoiceSetParse } from "@/lib/types";
import { cn } from "@/lib/utils";

const samplePrevious: Record<string, { weight: number; reps: number }> = {
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

export function ExerciseCard({ exercise, dayId, index }: { exercise: Exercise; dayId: string; index: number }) {
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const logSet = useBodyFitnessStore((state) => state.logSet);
  const startRestTimer = useBodyFitnessStore((state) => state.startRestTimer);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const [expanded, setExpanded] = useState(index === 0);

  const previousBySet = useMemo(() => {
    const map = new Map<number, SetLog>();
    setLogs.filter((log) => log.exerciseId === exercise.id).forEach((log) => {
      if (!map.has(log.setNumber)) map.set(log.setNumber, log);
    });
    return map;
  }, [exercise.id, setLogs]);

  const [sets, setSets] = useState<DraftSet[]>(() =>
    Array.from({ length: exercise.sets }, (_, setIndex) => {
      const previous = samplePrevious[exercise.id];
      return {
        weightKg: previous ? previous.weight : 20,
        reps: previous ? Math.max(exercise.repMin, previous.reps - (setIndex > 1 ? 1 : 0)) : exercise.repMin,
        complete: false,
        isPr: false,
      };
    }),
  );

  const completedCount = sets.filter((set) => set.complete).length;
  const bestE1rm = Math.max(0, ...previousBySet.values().map((log) => log.e1rm), samplePrevious[exercise.id] ? epley1Rm(samplePrevious[exercise.id].weight, samplePrevious[exercise.id].reps) : 0);

  function updateSet(setIndex: number, patch: Partial<DraftSet>) {
    setSets((current) => current.map((set, index) => index === setIndex ? { ...set, ...patch } : set));
  }

  function completeSet(setIndex: number) {
    const draft = sets[setIndex];
    const previous = previousBySet.get(setIndex + 1) ?? (samplePrevious[exercise.id] ? {
      weightKg: samplePrevious[exercise.id].weight,
      reps: samplePrevious[exercise.id].reps,
    } : undefined);
    const log = logSet({
      dayId,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      setNumber: setIndex + 1,
      weightKg: draft.weightKg,
      reps: draft.reps,
    });
    const isPr = log.isPr || isProgressiveOverload(draft, previous);
    updateSet(setIndex, { complete: true, isPr });
    startRestTimer(exercise.name, exercise.restSeconds ?? restDefaults[exercise.type]);
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
    <motion.article layout className="ios-card overflow-hidden">
      <motion.span layout className="absolute inset-y-5 left-0 w-[2px] rounded-full bg-[#30d158] shadow-[0_0_10px_#30d158]" animate={{ opacity: expanded ? 1 : 0.34 }} />
      <button onClick={() => setExpanded((value) => !value)} className="flex min-h-[78px] w-full items-center gap-3 px-4 text-left">
        <span className="number-font flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-white/[0.055] text-base font-bold text-white/42 ring-1 ring-white/[0.055]">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15px] font-semibold">{exercise.name}</p>
          <p className="mt-1 text-[10px] capitalize text-white/32">{exercise.sets} sets · {exercise.repMin}–{exercise.repMax} reps · {exercise.type}</p>
        </div>
        <div className="text-right">
          <p className="number-font m-0 text-sm font-bold text-[#30d158]">{completedCount}/{exercise.sets}</p>
          <p className="m-0 text-[9px] text-white/25">complete</p>
        </div>
        {expanded ? <ChevronUp size={17} className="text-white/28" /> : <ChevronDown size={17} className="text-white/28" />}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="border-t border-white/[0.065] bg-black/10 px-3 pb-4 pt-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div><p className="m-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">Previous best</p><p className="number-font mt-1 text-sm font-bold">{bestE1rm ? bestE1rm.toFixed(1) : "—"} <span className="text-[9px] tracking-normal text-white/30">kg e1RM</span></p></div>
                <VoiceLogButton exerciseName={exercise.name} onParsed={fillFromVoice} />
              </div>

              <div className="mb-1 grid grid-cols-[30px_1fr_1fr_46px] gap-2 px-1 text-center text-[9px] font-bold uppercase tracking-[0.08em] text-white/25">
                <span>Set</span><span>kg</span><span>reps</span><span />
              </div>
              <div className="space-y-2">
                {sets.map((set, setIndex) => (
                  <motion.div
                    key={setIndex}
                    animate={{ backgroundColor: set.isPr ? "rgba(48,209,88,.16)" : set.complete ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.025)" }}
                    className="grid min-h-[54px] grid-cols-[30px_1fr_1fr_46px] items-center gap-2 rounded-[16px] px-2 ring-1 ring-white/[0.035]"
                  >
                    <span className="number-font text-center text-xs font-bold text-white/32">{setIndex + 1}</span>
                    <SetInput value={set.weightKg} step={0.5} disabled={set.complete} onChange={(weightKg) => updateSet(setIndex, { weightKg })} />
                    <SetInput value={set.reps} disabled={set.complete} onChange={(reps) => updateSet(setIndex, { reps })} />
                    <button
                      aria-label={`Complete set ${setIndex + 1}`}
                      disabled={set.complete}
                      onClick={() => completeSet(setIndex)}
                      className={cn("pressable flex h-9 w-9 items-center justify-center rounded-full", set.complete ? "bg-[#30d158] text-black shadow-[0_0_18px_rgba(48,209,88,.25)]" : "bg-white/10 text-white/65")}
                    >
                      {set.isPr ? <Trophy size={15} /> : <Check size={16} strokeWidth={2.7} />}
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
  return <input aria-label="Set value" className="number-font h-10 w-full rounded-[12px] border border-white/[0.045] bg-black/35 px-2 text-center text-sm font-semibold outline-none transition focus:border-[#64d2ff]/40 focus:ring-2 focus:ring-[#0a84ff]/35 disabled:border-transparent disabled:bg-transparent" type="number" inputMode="decimal" step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />;
}
