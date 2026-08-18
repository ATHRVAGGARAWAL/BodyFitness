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
    <div className="ios-card overflow-hidden">
      <div className="flex items-end justify-between px-4 pb-3 pt-4">
        <div>
          <p className="section-kicker m-0">Mess survival</p>
          <p className="mb-0 mt-1 text-sm font-semibold">Daily habits</p>
        </div>
        <p className="m-0 text-[9px] font-semibold text-white/25">Swipe to complete</p>
      </div>
      <div>
        {habits.map((habit, index) => {
          const complete = completedIds.includes(habit.id);
          return (
            <div key={habit.id} className="relative overflow-hidden">
              <div className="absolute inset-0 flex items-center bg-gradient-to-r from-[#30d158] to-[#62e779] pl-5 text-black">
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
                  "relative flex min-h-[58px] w-full items-center gap-3 bg-[#121214]/78 px-4 text-left backdrop-blur-xl",
                  index < habits.length - 1 && "hairline",
                )}
              >
                <motion.span
                  animate={{ backgroundColor: complete ? "#30d158" : "rgba(255,255,255,.06)" }}
                  className="flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full ring-1 ring-white/15"
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
