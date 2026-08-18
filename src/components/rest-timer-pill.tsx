"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Plus, X } from "lucide-react";
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
    if (timer.endsAt && remaining <= 0) {
      clear();
    }
  }, [clear, remaining, timer.endsAt]);

  const progress = useMemo(
    () => (timer.durationSeconds ? remaining / timer.durationSeconds : 0),
    [remaining, timer.durationSeconds],
  );

  return (
    <AnimatePresence>
      {(timer.endsAt || timer.pausedRemaining !== null) && (
        <motion.div
          initial={{ y: -70, opacity: 0, scale: 0.84 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="rest-timer-active fixed left-1/2 top-[calc(var(--safe-top)+8px)] z-[80] -translate-x-1/2"
        >
          <motion.div
            layout
            onClick={() => setExpanded((value) => !value)}
            className="flex min-h-[52px] cursor-pointer items-center overflow-hidden rounded-[21px] bg-[#09090a]/94 px-1.5 shadow-[0_18px_60px_rgba(0,0,0,.72)] ring-1 ring-white/[0.13] backdrop-blur-2xl"
          >
            <ProgressCircle progress={progress} remaining={remaining} />
            <div className="min-w-0 px-2.5">
              <p className="m-0 text-[8px] font-bold uppercase tracking-[0.15em] text-[#30d158]">Resting now</p>
              <p className="m-0 max-w-[140px] truncate text-[11px] font-semibold">{timer.exerciseName}</p>
            </div>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center gap-1 overflow-hidden"
                >
                  <TimerButton
                    label={timer.endsAt ? "Pause" : "Resume"}
                    onClick={timer.endsAt ? pause : resume}
                  >
                    {timer.endsAt ? <Pause size={14} /> : <Play size={14} />}
                  </TimerButton>
                  <TimerButton label="Add 30 seconds" onClick={() => addTime(30)}>
                    <Plus size={14} />
                    <span className="text-[10px]">30</span>
                  </TimerButton>
                  <TimerButton label="End rest" onClick={clear}>
                    <X size={14} />
                  </TimerButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgressCircle({ progress, remaining }: { progress: number; remaining: number }) {
  const circumference = Math.PI * 32;
  return (
    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" />
        <motion.circle
          cx="20"
          cy="20"
          r="16"
          fill="none"
          stroke="#30d158"
          strokeLinecap="round"
          strokeWidth="3"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
        />
      </svg>
      <span className="number-font text-[12px] font-bold">{remaining}</span>
    </div>
  );
}

function TimerButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="pressable flex h-8 min-w-8 items-center justify-center rounded-full bg-white/[0.09] px-2 text-white/80 ring-1 ring-white/[0.055]"
    >
      {children}
    </button>
  );
}
