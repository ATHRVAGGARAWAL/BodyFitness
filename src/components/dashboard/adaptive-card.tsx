"use client";

import { ArrowDownRight, ArrowRight, Sparkles } from "lucide-react";
import type { RecoveryInsight } from "@/lib/calculations";
import { formatNumber } from "@/lib/utils";

export function AdaptiveCard({
  insight,
  target,
  demo = false,
  isFlexDay,
  onToggleFlexDay,
}: {
  insight: RecoveryInsight;
  target: number;
  demo?: boolean;
  isFlexDay: boolean;
  onToggleFlexDay: () => void;
}) {
  const onTrack = insight.averageCalories === 0 || insight.variance <= 0;
  return (
    <section className="panel p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="icon-tile text-[var(--accent-strong)]">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold">7-day calorie trend</p>
            <p className="mt-0.5 text-[10px] text-white/35">{demo ? "Sample insight" : `${insight.loggedDays}/6 prior days logged`}</p>
          </div>
        </div>
        <span className={`status-chip ${onTrack ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
          {onTrack ? "On track" : "Above plan"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="data-tile p-3">
          <p className="m-0 text-[10px] font-semibold text-white/35">Average</p>
          <p className="number-font mb-0 mt-1 text-[23px] font-bold">{formatNumber(insight.averageCalories || target - 74)}</p>
          <p className="m-0 text-[10px] text-white/28">kcal / logged day</p>
        </div>
        <div className="data-tile p-3">
          <p className="m-0 text-[10px] font-semibold text-white/35">vs target</p>
          <p className={`number-font mb-0 mt-1 flex items-center gap-1 text-[23px] font-bold ${onTrack ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
            {onTrack ? <ArrowDownRight size={18} /> : <ArrowRight size={18} />}
            {formatNumber(Math.abs(insight.variance || -74))}
          </p>
          <p className="m-0 text-[10px] text-white/28">kcal daily variance</p>
        </div>
      </div>

      <div className="mt-3 rounded-[14px] border border-[var(--border)] bg-[var(--accent-soft)] px-3 py-2.5 text-[12px] leading-4 text-white/52">
        {insight.suggestedLow && insight.suggestedHigh
          ? `Optional recovery range: ${formatNumber(insight.suggestedLow)}–${formatNumber(insight.suggestedHigh)} kcal. Your official target stays unchanged.`
          : "Stay close to your normal target. One high day never calls for a crash diet."}
      </div>
      <button
        onClick={onToggleFlexDay}
        className={`pressable mt-3 min-h-11 w-full rounded-[13px] border text-xs font-bold ${isFlexDay ? "border-[var(--warning)] bg-[var(--warning)] text-black" : "border-[var(--border)] bg-[var(--fill)] text-white/48"}`}
      >
        {isFlexDay ? "Flex Day marked" : "Mark today as a Flex Day"}
      </button>
    </section>
  );
}
