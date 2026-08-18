"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import type { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

export function HabitList({
  habits,
  completedIds,
  onToggle,
}: {
  habits: Habit[];
  completedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="px-4 pb-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="m-0 text-[15px] font-bold tracking-[-0.025em]">Mess protocol</p><p className="mt-1 text-[11px] text-white/35">Swipe or tap to resolve</p></div>
          <span className="status-chip">{completedIds.length}/{habits.length}</span>
        </div>
      </div>
      <div>
        {habits.map((habit, index) => {
          const complete = completedIds.includes(habit.id);
          return (
            <div key={habit.id} className="relative overflow-hidden">
              <div className="absolute inset-0 flex items-center bg-[var(--success)] pl-5 text-black">
                <Check size={20} strokeWidth={3} />
              </div>
              <motion.button
                drag="x"
                dragConstraints={{ left: 0, right: 82 }}
                dragElastic={0.1}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 58) onToggle(habit.id);
                }}
                onClick={() => onToggle(habit.id)}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "surface-row relative flex min-h-[56px] w-full items-center gap-3 px-4 text-left",
                  index < habits.length - 1 && "hairline",
                )}
              >
                <motion.span
                  animate={{ backgroundColor: complete ? "var(--success)" : "var(--fill)" }}
                  className="flex h-[25px] w-[25px] shrink-0 items-center justify-center rounded-[8px] ring-1 ring-white/15"
                >
                  <AnimateCheck visible={complete} />
                </motion.span>
                <span className={cn("flex-1 text-[13px] font-medium", complete && "text-white/35 line-through")}>{habit.label}</span>
                <ChevronRight size={15} className="text-white/18" />
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnimateCheck({ visible }: { visible: boolean }) {
  return (
    <motion.span initial={false} animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}>
      <Check size={15} strokeWidth={3.2} className="text-black" />
    </motion.span>
  );
}
