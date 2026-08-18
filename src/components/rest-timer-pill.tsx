"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Plus, TimerReset, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useBodyFitnessStore } from "@/lib/store";

export function RestTimerPill() {
  const timer = useBodyFitnessStore((state) => state.restTimer);
  const pause = useBodyFitnessStore((state) => state.pauseRestTimer);
  const resume = useBodyFitnessStore((state) => state.resumeRestTimer);
  const addTime = useBodyFitnessStore((state) => state.addRestTime);
  const clear = useBodyFitnessStore((state) => state.clearRestTimer);
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

  const remaining = timer.endsAt
    ? now === 0
      ? timer.durationSeconds
      : Math.max(0, Math.ceil((timer.endsAt - now) / 1_000))
    : (timer.pausedRemaining ?? 0);

  useEffect(() => {
    if (timer.endsAt && remaining <= 0) clear();
  }, [clear, remaining, timer.endsAt]);

  const progress = useMemo(
    () => (timer.durationSeconds ? remaining / timer.durationSeconds : 0),
    [remaining, timer.durationSeconds],
  );

  return (
    <AnimatePresence>
      {(timer.endsAt || timer.pausedRemaining !== null) && (
        <motion.div
          initial={{ y: -90, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -80, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="rest-timer-active fixed left-1/2 top-[calc(var(--safe-top)+10px)] z-[80] w-[calc(min(100%,430px)-28px)] -translate-x-1/2"
        >
          <motion.div layout className="glass relative overflow-hidden rounded-[20px] p-2">
            <button
              onClick={() => setExpanded((value) => !value)}
              className="flex min-h-[50px] w-full items-center gap-3 rounded-[15px] px-1.5 text-left"
            >
              <ProgressBadge progress={progress} remaining={remaining} />
              <div className="min-w-0 flex-1">
                <p className="m-0 flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                  <TimerReset size={11} /> Rest protocol
                </p>
                <p className="mt-1 truncate text-[12px] font-bold">{timer.exerciseName}</p>
              </div>
              <span className="number-font text-[12px] font-bold text-white/45">{timer.endsAt ? "LIVE" : "PAUSED"}</span>
            </button>

            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-1 flex items-center gap-2 border-t border-white/[0.07] px-1.5 pt-2">
                    <TimerButton label={timer.endsAt ? "Pause" : "Resume"} onClick={timer.endsAt ? pause : resume}>
                      {timer.endsAt ? <Pause size={14} /> : <Play size={14} />}
                      {timer.endsAt ? "Pause" : "Resume"}
                    </TimerButton>
                    <TimerButton label="Add 30 seconds" onClick={() => addTime(30)}>
                      <Plus size={14} /> 30s
                    </TimerButton>
                    <TimerButton label="End rest" onClick={clear} compact>
                      <X size={14} />
                    </TimerButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-[var(--accent)]"
              animate={{ scaleX: progress }}
              transition={{ ease: "linear", duration: 0.24 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgressBadge({ progress, remaining }: { progress: number; remaining: number }) {
  const circumference = Math.PI * 32;
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.055]">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="16" fill="none" stroke="var(--separator)" strokeWidth="3" />
        <motion.circle
          cx="22"
          cy="22"
          r="16"
          fill="none"
          stroke="var(--accent-strong)"
          strokeLinecap="round"
          strokeWidth="3"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
        />
      </svg>
      <span className="number-font text-[11px] font-black">{remaining}</span>
    </div>
  );
}

function TimerButton({
  label,
  onClick,
  children,
  compact = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={`ghost-action flex h-10 items-center justify-center gap-1.5 rounded-[12px] px-3 text-[10px] font-bold ${compact ? "ml-auto w-10 px-0" : "flex-1"}`}
    >
      {children}
    </button>
  );
}
