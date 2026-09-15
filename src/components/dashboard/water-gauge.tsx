"use client";

import { motion } from "framer-motion";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { reduceable, T, usePrefersReducedMotion } from "@/lib/motion";

/**
 * Hydration tile. The fill is an SVG rect clipped by a `useId`-derived clipPath so
 * several gauges on one page never share an id (duplicates break the fill).
 */
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
  const reduced = usePrefersReducedMotion();
  const fill = Math.min(valueMl / 4_000, 1);
  const targetFill = Math.min(targetMl / 4_000, 1);

  return (
    <Card className="relative min-h-44 overflow-hidden">
      <div className="absolute inset-x-0 top-5 z-10 px-4 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Hydration</p>
        <p className="number-font mt-1 text-3xl font-semibold leading-none">
          {(valueMl / 1_000).toFixed(2)}
          <span className="ml-1 text-sm font-medium tracking-normal text-subtle-foreground">L</span>
        </p>
      </div>

      <svg aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[67%] w-full" viewBox="0 0 180 180" preserveAspectRatio="none">
        <defs>
          <clipPath id={`fill-${id}`}>
            <motion.rect
              x="0"
              width="180"
              initial={{ y: 180, height: 0 }}
              animate={{ y: 180 * (1 - fill), height: 180 * fill }}
              transition={reduceable(T.base, reduced)}
            />
          </clipPath>
        </defs>
        <g clipPath={`url(#fill-${id})`}>
          <rect width="180" height="180" className="fill-data-4" />
          <path
            d="M-24 6 C 2 -5, 25 17, 52 6 S 100 -5, 128 6 S 174 17, 204 5 V 22 H -24 Z"
            className="fill-card"
            opacity="0.5"
            style={{ animation: reduced ? "none" : "liquid-drift 1.9s linear infinite alternate" }}
          />
        </g>
        <line
          x1="124"
          x2="172"
          y1={180 * (1 - targetFill)}
          y2={180 * (1 - targetFill)}
          className="stroke-data-1"
          strokeDasharray="3 4"
        />
      </svg>

      <div className="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Remove 250 millilitres" onClick={() => onChange(-250)}>
          <Minus />
        </Button>
        <span className="number-font font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">Goal {(targetMl / 1_000).toFixed(1)} L</span>
        <Button variant="outline" size="icon-sm" aria-label="Add 250 millilitres" onClick={() => onChange(250)}>
          <Plus />
        </Button>
      </div>
    </Card>
  );
}
