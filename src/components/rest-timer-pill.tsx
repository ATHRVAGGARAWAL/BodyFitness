"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Plus, TimerReset, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { overlayDrop, reduceable, T, usePrefersReducedMotion } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";

export function RestTimerPill() {
  const timer = useBodyFitnessStore((state) => state.restTimer);
  const pause = useBodyFitnessStore((state) => state.pauseRestTimer);
  const resume = useBodyFitnessStore((state) => state.resumeRestTimer);
  const addTime = useBodyFitnessStore((state) => state.addRestTime);
  const clear = useBodyFitnessStore((state) => state.clearRestTimer);
  const reduced = usePrefersReducedMotion();
  const [now, setNow] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!timer.endsAt) return;
    const tick = () => setNow(Date.now());
    const initial = window.setTimeout(tick, 0);
    const interval = window.setInterval(tick, 250);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [timer.endsAt]);

  // Three-way branch: first paint shows the full duration to avoid a 0 flash.
  const remaining = timer.endsAt
    ? now === 0
      ? timer.durationSeconds
      : Math.max(0, Math.ceil((timer.endsAt - now) / 1_000))
    : (timer.pausedRemaining ?? 0);

  useEffect(() => {
    if (timer.endsAt && remaining <= 0) clear();
  }, [clear, remaining, timer.endsAt]);

  const progress = useMemo(() => (timer.durationSeconds ? remaining / timer.durationSeconds : 0), [remaining, timer.durationSeconds]);
  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <AnimatePresence>
      {(timer.endsAt || timer.pausedRemaining !== null) && (
        <motion.div variants={overlayDrop} initial="hidden" animate="visible" exit="exit" transition={T.base} className="rest-timer-active overlay-frame top-[calc(var(--safe-top)+12px)] z-[80]">
          <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-sheet)]">
            <button onClick={() => setExpanded((value) => !value)} className="flex min-h-[52px] w-full items-center gap-3 px-3 text-left" aria-expanded={expanded}>
              <span className="number-font flex h-9 min-w-[64px] items-center justify-center rounded-md bg-muted px-2 text-lg font-semibold tabular-nums">{minutes}:{seconds}</span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-subtle-foreground"><TimerReset size={12} /> Rest</p>
                <p className="truncate text-sm font-medium">{timer.exerciseName}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">{timer.endsAt ? "Live" : "Paused"}</span>
            </button>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={reduceable(T.base, reduced)} className="overflow-hidden">
                  <div className="flex items-center gap-2 border-t border-border px-3 py-2">
                    <Button size="sm" variant="secondary" className="flex-1" aria-label={timer.endsAt ? "Pause" : "Resume"} onClick={timer.endsAt ? pause : resume}>
                      {timer.endsAt ? <Pause /> : <Play />} {timer.endsAt ? "Pause" : "Resume"}
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" aria-label="Add 30 seconds" onClick={() => addTime(30)}><Plus /> 30s</Button>
                    <Button size="icon-sm" variant="ghost" aria-label="End rest" onClick={clear}><X /></Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-brand" animate={{ scaleX: progress }} transition={reduceable({ ease: "linear", duration: 0.24 }, reduced)} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
