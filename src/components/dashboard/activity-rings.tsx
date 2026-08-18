"use client";

import { motion } from "framer-motion";
import { Flame, Footprints, Utensils } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface RingDatum {
  label: string;
  value: number;
  target: number;
  color: string;
  unit: string;
  icon: React.ReactNode;
}

export function ActivityRings({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  steps,
  stepTarget,
  onEditSteps,
}: {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  steps: number;
  stepTarget: number;
  onEditSteps?: () => void;
}) {
  const rings: RingDatum[] = [
    {
      label: "Calories",
      value: calories,
      target: calorieTarget,
      color: "var(--ring-calories)",
      unit: "kcal",
      icon: <Flame size={13} fill="currentColor" />,
    },
    {
      label: "Protein",
      value: protein,
      target: proteinTarget,
      color: "var(--ring-protein)",
      unit: "g",
      icon: <Utensils size={13} />,
    },
    {
      label: "Steps",
      value: steps,
      target: stepTarget,
      color: "var(--ring-steps)",
      unit: "",
      icon: <Footprints size={13} />,
    },
  ];
  const caloriePercent = Math.round((calories / Math.max(1, calorieTarget)) * 100);

  return (
    <section className="health-card overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 text-[15px] font-semibold">Today</p>
          <p className="mt-0.5 text-[11px] text-white/35">Move, fuel and recover</p>
        </div>
        {onEditSteps && (
          <button
            onClick={onEditSteps}
            className="pressable min-h-11 rounded-full bg-white/[0.07] px-3.5 text-[11px] font-semibold text-white/60"
          >
            Edit steps
          </button>
        )}
      </div>

      <div className="relative mx-auto mt-1 aspect-square w-[228px] max-w-full">
        <svg viewBox="0 0 224 224" className="h-full w-full -rotate-90 overflow-visible">
          {rings.map((ring, index) => {
            const radius = 91 - index * 25;
            const circumference = 2 * Math.PI * radius;
            const progress = Math.min(ring.value / Math.max(1, ring.target), 1);
            return (
              <g key={ring.label}>
                <circle
                  cx="112"
                  cy="112"
                  r={radius}
                  fill="none"
                  stroke="var(--ring-track)"
                  strokeWidth="17"
                />
                <motion.circle
                  cx="112"
                  cy="112"
                  r={radius}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth="17"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: circumference * (1 - progress) }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 75, damping: 18 }}
                />
                {ring.value > ring.target && (
                  <circle
                    cx="112"
                    cy="112"
                    r={radius}
                    fill="none"
                    stroke="var(--label)"
                    opacity="0.66"
                    strokeDasharray="2 12"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                )}
              </g>
            );
          })}
        </svg>

        <div className="absolute left-1/2 top-1/2 w-[116px] -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="number-font m-0 text-[29px] font-bold leading-none">{caloriePercent}%</p>
          <p className="mt-1.5 whitespace-nowrap text-[10px] font-semibold text-white/35">calorie goal</p>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/[0.065] pt-3">
        {rings.map((ring, index) => (
          <div
            key={ring.label}
            className={`min-w-0 px-2 text-center ${index > 0 ? "border-l border-white/[0.065]" : ""}`}
          >
            <span className="mb-1.5 flex items-center justify-center gap-1 text-[10px] font-semibold text-white/40">
              <span style={{ color: ring.color }}>{ring.icon}</span>
              {ring.label}
            </span>
            <span className="number-font block truncate text-[18px] font-bold leading-none" style={{ color: ring.color }}>
              {formatNumber(ring.value)}
              {ring.unit && <span className="ml-0.5 text-[9px] tracking-normal opacity-70">{ring.unit}</span>}
            </span>
            <span className="number-font mt-1 block text-[9px] text-white/28">
              of {formatNumber(ring.target)}{ring.unit}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
