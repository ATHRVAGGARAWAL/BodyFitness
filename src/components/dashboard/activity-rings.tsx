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
      color: "#ff375f",
      unit: "kcal",
      icon: <Flame size={14} fill="currentColor" />,
    },
    {
      label: "Protein",
      value: protein,
      target: proteinTarget,
      color: "#b6ff2e",
      unit: "g",
      icon: <Utensils size={14} />,
    },
    {
      label: "Steps",
      value: steps,
      target: stepTarget,
      color: "#64d2ff",
      unit: "",
      icon: <Footprints size={14} />,
    },
  ];

  return (
    <section className="health-card overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between">
        <div><p className="m-0 text-[15px] font-semibold">Today</p><p className="mt-0.5 text-[11px] text-white/35">Your current progress</p></div>
        {onEditSteps && <button onClick={onEditSteps} className="pressable min-h-11 rounded-full bg-white/[0.07] px-3 text-[11px] font-semibold text-white/60">Edit steps</button>}
      </div>
      <div className="grid grid-cols-[1.1fr_.9fr] items-center gap-1">
        <div className="relative aspect-square w-full max-w-[222px] justify-self-center">
          <svg viewBox="0 0 224 224" className="h-full w-full -rotate-90 overflow-visible">
            {rings.map((ring, index) => {
              const radius = 91 - index * 25;
              const circumference = 2 * Math.PI * radius;
              const progress = Math.min(ring.value / ring.target, 1);
              return (
                <g key={ring.label}>
                  <circle cx="112" cy="112" r={radius} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="17" />
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
                    transition={{ delay: index * 0.1, type: "spring", stiffness: 75, damping: 18 }}
                  />
                  {ring.value > ring.target && (
                    <circle
                      cx="112"
                      cy="112"
                      r={radius}
                      fill="none"
                      stroke="rgba(255,255,255,.72)"
                      strokeDasharray="2 12"
                      strokeLinecap="round"
                      strokeWidth="3"
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="number-font m-0 text-[27px] font-bold leading-none">{Math.round((calories / calorieTarget) * 100)}%</p>
            <p className="mt-1 text-[10px] font-semibold text-white/35">calorie goal</p>
          </div>
        </div>

        <div className="space-y-4 pl-1">
          {rings.map((ring) => (
            <div key={ring.label}>
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-white/45">
                <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: `${ring.color}20`, color: ring.color }}>
                  {ring.icon}
                </span>
                {ring.label}
              </div>
              <p className="number-font m-0 text-[19px] font-bold leading-none" style={{ color: ring.color }}>
                {formatNumber(ring.value)}
                {ring.unit && <span className="ml-0.5 text-[10px] tracking-normal opacity-65">{ring.unit}</span>}
              </p>
              <p className="number-font mt-1 text-[10px] text-white/28">of {formatNumber(ring.target)}{ring.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
