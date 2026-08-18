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
    <section className="hero-surface p-4">
      <div aria-hidden className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#bf5af2]/12 blur-[55px]" />
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#bf5af2]/15 text-[#bf5af2]">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="m-0 text-sm font-semibold">7-day calorie trend</p>
            <p className="mt-0.5 text-[10px] text-white/35">{demo ? "Sample insight" : `${insight.loggedDays}/6 prior days logged`}</p>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${onTrack ? "bg-[#30d158]/14 text-[#30d158]" : "bg-[#ff9f0a]/14 text-[#ff9f0a]"}`}>
          {onTrack ? "On track" : "Above plan"}
        </span>
      </div>

      <div className="relative mt-5 flex h-14 items-end gap-2 rounded-[18px] bg-black/20 px-3 pb-2 pt-3">
        {[0.62, 0.74, 0.57, 0.83, 0.69, 0.77, onTrack ? 0.68 : 0.94].map((height, index) => (
          <span key={index} className="relative flex-1 overflow-hidden rounded-full bg-white/[0.055]" style={{ height: "100%" }}>
            <span className="absolute inset-x-0 bottom-0 rounded-full" style={{ height: `${height * 100}%`, background: index === 6 ? (onTrack ? "#30d158" : "#ff9f0a") : "rgba(255,255,255,.2)" }} />
          </span>
        ))}
        <span className="absolute left-3 right-3 top-[45%] border-t border-dashed border-white/20" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="metric-tile p-3">
          <p className="m-0 text-[10px] font-semibold text-white/35">Average</p>
          <p className="number-font mb-0 mt-1 text-[23px] font-bold">{formatNumber(insight.averageCalories || target - 74)}</p>
          <p className="m-0 text-[10px] text-white/28">kcal / logged day</p>
        </div>
        <div className="metric-tile p-3">
          <p className="m-0 text-[10px] font-semibold text-white/35">vs target</p>
          <p className={`number-font mb-0 mt-1 flex items-center gap-1 text-[23px] font-bold ${onTrack ? "text-[#30d158]" : "text-[#ff9f0a]"}`}>
            {onTrack ? <ArrowDownRight size={18} /> : <ArrowRight size={18} />}
            {formatNumber(Math.abs(insight.variance || -74))}
          </p>
          <p className="m-0 text-[10px] text-white/28">kcal daily variance</p>
        </div>
      </div>

      <div className="relative mt-3 rounded-[16px] bg-[#0a84ff]/10 px-3 py-2.5 text-[11px] leading-4 text-white/52 ring-1 ring-[#64d2ff]/10">
        {insight.suggestedLow && insight.suggestedHigh
          ? `Optional recovery range: ${formatNumber(insight.suggestedLow)}–${formatNumber(insight.suggestedHigh)} kcal. Your official target stays unchanged.`
          : "Stay close to your normal target. One high day never calls for a crash diet."}
      </div>
      <button
        onClick={onToggleFlexDay}
        className={`pressable relative mt-3 min-h-11 w-full rounded-[14px] text-xs font-semibold ${isFlexDay ? "bg-[#ffd60a] text-black shadow-[0_8px_30px_rgba(255,214,10,.18)]" : "bg-white/[0.055] text-white/48 ring-1 ring-white/[0.06]"}`}
      >
        {isFlexDay ? "Flex Day marked" : "Mark today as a Flex Day"}
      </button>
    </section>
  );
}
