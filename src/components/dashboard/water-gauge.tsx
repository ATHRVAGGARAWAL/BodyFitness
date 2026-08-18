"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";

export function WaterGauge({
  valueMl,
  targetMl,
  onChange,
}: {
  valueMl: number;
  targetMl: number;
  onChange: (delta: number) => void;
}) {
  const id = useId().replace(/:/g, "");
  const fill = Math.min(valueMl / 4_000, 1);
  const targetFill = Math.min(targetMl / 4_000, 1);

  return (
    <div className="ios-card relative min-h-[238px] overflow-hidden p-4">
      <div className="relative z-10">
        <p className="m-0 text-[13px] font-semibold text-white/42">Water</p>
        <p className="number-font mb-0 mt-1 text-[28px] font-bold leading-none">
          {(valueMl / 1_000).toFixed(2)}<span className="ml-1 text-xs tracking-normal text-white/38">L</span>
        </p>
      </div>

      <svg className="absolute inset-x-0 bottom-0 h-[74%] w-full" viewBox="0 0 180 180" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`water-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#64d2ff" stopOpacity="0.72" />
            <stop offset="1" stopColor="#0a84ff" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id={`fill-${id}`}>
            <motion.rect
              x="0"
              width="180"
              initial={{ y: 180, height: 0 }}
              animate={{ y: 180 * (1 - fill), height: 180 * fill }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#fill-${id})`}>
          <rect width="180" height="180" fill={`url(#water-${id})`} />
          <path
            d="M-24 6 C 2 -5, 25 17, 52 6 S 100 -5, 128 6 S 174 17, 204 5 V 22 H -24 Z"
            fill="#9be7ff"
            opacity="0.8"
            style={{ animation: "liquid-drift 1.9s linear infinite alternate" }}
          />
        </g>
        <line
          x1="124"
          x2="172"
          y1={180 * (1 - targetFill)}
          y2={180 * (1 - targetFill)}
          stroke="rgba(255,255,255,.75)"
          strokeDasharray="3 4"
        />
      </svg>

      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between">
        <button aria-label="Remove 250 millilitres" onClick={() => onChange(-250)} className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <Minus size={17} />
        </button>
        <span className="rounded-full bg-black/30 px-2 py-1 text-[10px] font-semibold backdrop-blur-lg">Goal {(targetMl / 1_000).toFixed(1)}L</span>
        <button aria-label="Add 250 millilitres" onClick={() => onChange(250)} className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <Plus size={17} />
        </button>
      </div>
    </div>
  );
}
