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
}: {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  steps: number;
  stepTarget: number;
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
    <section className="hero-surface px-4 pb-4 pt-5">
      <div aria-hidden className="absolute -left-14 top-6 h-40 w-40 rounded-full bg-[#ff375f]/10 blur-[60px]" />
      <div aria-hidden className="absolute -right-16 top-24 h-40 w-40 rounded-full bg-[#64d2ff]/10 blur-[60px]" />
      <div className="relative flex items-center justify-between px-1">
        <div>
          <p className="section-kicker m-0">Activity</p>
          <p className="mb-0 mt-1 text-[17px] font-semibold tracking-[-0.025em]">Your daily rings</p>
        </div>
        <span className="capsule-control flex h-8 items-center px-3 text-[10px] font-semibold text-white/45">Tap to update</span>
      </div>

      <div className="relative mx-auto mt-1 aspect-square w-full max-w-[270px]">
          <svg viewBox="0 0 264 264" className="h-full w-full -rotate-90 overflow-visible">
            <defs>
              {rings.map((ring) => (
                <filter key={ring.label} id={`glow-${ring.label}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            {rings.map((ring, index) => {
              const radius = 105 - index * 29;
              const circumference = 2 * Math.PI * radius;
              const progress = Math.min(ring.value / ring.target, 1);
              return (
                <g key={ring.label}>
                  <circle cx="132" cy="132" r={radius} fill="none" stroke="rgba(255,255,255,.075)" strokeWidth="19" />
                  <motion.circle
                    cx="132"
                    cy="132"
                    r={radius}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth="19"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: circumference * (1 - progress) }}
                    transition={{ delay: 0.08 + index * 0.1, type: "spring", stiffness: 64, damping: 17, mass: 1.05 }}
                    style={{ filter: `url(#glow-${ring.label})` }}
                  />
                  {ring.value > ring.target && (
                    <circle
                      cx="132"
                      cy="132"
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
            <motion.p initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }} className="number-font m-0 text-[32px] font-bold leading-none">
              {Math.round((calories / calorieTarget) * 100)}%
            </motion.p>
            <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Move goal</p>
          </div>
      </div>

      <div className="relative grid grid-cols-3 gap-2">
          {rings.map((ring) => (
            <div key={ring.label} className="metric-tile min-w-0 px-3 py-3">
              <div className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold text-white/38">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: `${ring.color}20`, color: ring.color }}>
                  {ring.icon}
                </span>
                <span className="truncate">{ring.label}</span>
              </div>
              <p className="number-font m-0 truncate text-[18px] font-bold leading-none" style={{ color: ring.color }}>
                {formatNumber(ring.value)}
                {ring.unit && <span className="ml-0.5 text-[10px] tracking-normal opacity-65">{ring.unit}</span>}
              </p>
              <p className="number-font mb-0 mt-1 truncate text-[9px] text-white/25">of {formatNumber(ring.target)}{ring.unit}</p>
            </div>
          ))}
      </div>
    </section>
  );
}
