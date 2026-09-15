"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reduceable, T, usePrefersReducedMotion } from "@/lib/motion";
import type { Habit } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Daily habits. Swipe a row right (or tap it) to toggle completion. */
export function HabitList({
  habits,
  completedIds,
  onToggle,
}: {
  habits: Habit[];
  completedIds: string[];
  onToggle: (id: string) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const fillTransition = reduceable(T.base, reduced);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center pb-4">
        <div>
          <CardTitle>Mess protocol</CardTitle>
          <CardDescription>Swipe or tap to resolve</CardDescription>
        </div>
        <Badge className="number-font shrink-0">
          {completedIds.length}/{habits.length}
        </Badge>
      </CardHeader>
      <div className="border-t border-border">
        {habits.map((habit, index) => {
          const complete = completedIds.includes(habit.id);
          return (
            <div key={habit.id} className="relative overflow-hidden">
              <div aria-hidden="true" className="absolute inset-0 flex items-center bg-muted pl-6 text-success">
                <Check size={18} strokeWidth={2.5} />
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
                aria-pressed={complete}
                className={cn(
                  "relative flex min-h-14 w-full items-center gap-3 bg-card px-5 text-left hover:bg-accent",
                  index < habits.length - 1 && "border-b border-border",
                )}
              >
                <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  <motion.span
                    aria-hidden="true"
                    initial={false}
                    animate={{ opacity: complete ? 1 : 0 }}
                    transition={fillTransition}
                    className="absolute inset-0 bg-primary"
                  />
                  <AnimateCheck visible={complete} />
                </span>
                <span className={cn("flex-1 text-base font-medium", complete && "text-subtle-foreground line-through")}>{habit.label}</span>
              </motion.button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function AnimateCheck({ visible }: { visible: boolean }) {
  return (
    <motion.span initial={false} animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }} className="relative">
      <Check size={14} strokeWidth={2.5} className="text-primary-foreground" />
    </motion.span>
  );
}
