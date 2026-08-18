"use client";

import { motion } from "framer-motion";
import { Flame, Footprints, Gauge, Utensils } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface MetricDatum {
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
  const metrics: MetricDatum[] = [
    {
      label: "Calories",
      value: calories,
      target: calorieTarget,
      color: "var(--energy)",
      unit: "kcal",
      icon: <Flame size={14} />,
    },
    {
      label: "Protein",
      value: protein,
      target: proteinTarget,
      color: "var(--protein)",
      unit: "g",
      icon: <Utensils size={14} />,
    },
    {
      label: "Steps",
      value: steps,
      target: stepTarget,
      color: "var(--steps)",
      unit: "",
      icon: <Footprints size={14} />,
    },
  ];
  const caloriePercent = Math.round((calories / Math.max(1, calorieTarget)) * 100);

  return (
    <section className="panel overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="m-0 font-mono text-[9px] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">Daily output</p>
          <p className="mt-1 text-[12px] font-semibold text-white/42">Fuel, recovery and movement</p>
        </div>
        {onEditSteps && (
          <button onClick={onEditSteps} className="ghost-action pressable rounded-[13px] px-3 text-[10px] font-bold">
            Edit steps
          </button>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <span className="sr-only">{caloriePercent}%</span>
          <div aria-hidden="true" className="flex items-start gap-1">
            <span className="number-font text-[58px] font-black leading-[0.8] tracking-[-0.09em]">{caloriePercent}</span>
            <span className="number-font mt-1 text-[18px] font-black text-[var(--accent-strong)]">%</span>
          </div>
          <p className="mb-0 mt-3 text-[11px] font-semibold text-white/42">of today’s calorie target</p>
        </div>
        <div className="flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-[20px] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          <Gauge size={20} />
          <span className="mt-1 font-mono text-[8px] font-black uppercase tracking-[0.13em]">On pace</span>
        </div>
      </div>

      <div className="mt-6 metric-track h-[7px]">
        <motion.div
          className="metric-fill bg-[var(--energy)]"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(caloriePercent, 100)}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 19 }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between font-mono text-[9px] font-bold text-white/34">
        <span>{formatNumber(calories)} kcal</span>
        <span>{formatNumber(calorieTarget)} target</span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {metrics.map((metric, index) => {
          const progress = Math.min(metric.value / Math.max(1, metric.target), 1);
          return (
            <div key={metric.label} className="rounded-[16px] border border-white/[0.065] bg-white/[0.035] p-3">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-white/38">
                <span style={{ color: metric.color }}>{metric.icon}</span>
                {metric.label}
              </span>
              <p className="number-font mb-0 mt-3 truncate text-[18px] font-black leading-none" style={{ color: metric.color }}>
                {formatNumber(metric.value)}
                {metric.unit && <span className="ml-0.5 text-[8px] tracking-normal opacity-65">{metric.unit}</span>}
              </p>
              <div className="metric-track mt-3 h-[3px]">
                <motion.div
                  className="metric-fill"
                  style={{ background: metric.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ delay: 0.08 * index, type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
              <p className="number-font mb-0 mt-2 text-[8px] text-white/28">/{formatNumber(metric.target)}{metric.unit}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
