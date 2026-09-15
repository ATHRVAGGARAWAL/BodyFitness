"use client";

import { motion } from "framer-motion";
import { Flame, Footprints, Utensils } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, DataTile } from "@/components/ui/card";
import { reduceable, T } from "@/lib/motion";
import { cn, formatNumber } from "@/lib/utils";

interface MetricDatum {
  label: string;
  value: number;
  target: number;
  /** Ink-ramp class for the bar fill; calories is the focused series. */
  bar: string;
  unit: string;
  icon: ReactNode;
}

/**
 * Daily output hero: calorie completion as the headline number, with the three
 * tracked metrics beneath it on the monochrome data ramp.
 *
 * `reducedMotion` is passed in rather than read from `usePrefersReducedMotion`
 * so the component stays renderable in environments without `matchMedia`.
 */
export function ActivityRings({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  steps,
  stepTarget,
  onEditSteps,
  meta,
  reducedMotion = false,
  className,
}: {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  steps: number;
  stepTarget: number;
  onEditSteps?: () => void;
  /** Source and sample-data badges rendered beside the title. */
  meta?: ReactNode;
  reducedMotion?: boolean;
  className?: string;
}) {
  const metrics: MetricDatum[] = [
    {
      label: "Calories",
      value: calories,
      target: calorieTarget,
      bar: "bg-data-1",
      unit: "kcal",
      icon: <Flame size={14} />,
    },
    {
      label: "Protein",
      value: protein,
      target: proteinTarget,
      bar: "bg-data-2",
      unit: "g",
      icon: <Utensils size={14} />,
    },
    {
      label: "Steps",
      value: steps,
      target: stepTarget,
      bar: "bg-data-3",
      unit: "",
      icon: <Footprints size={14} />,
    },
  ];
  const caloriePercent = Math.round((calories / Math.max(1, calorieTarget)) * 100);
  const calorieRemaining = Math.max(0, calorieTarget - calories);
  const barTransition = reduceable(T.slow, reducedMotion);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Daily output</p>
            <h2 className="mt-0.5 text-base font-semibold tracking-tight">Fuel, recovery and movement</h2>
          </div>
          {meta ? <div className="flex flex-wrap items-center gap-1.5">{meta}</div> : null}
        </div>
        {onEditSteps ? (
          <Button variant="ghost" size="sm" onClick={onEditSteps} className="shrink-0">
            Edit steps
          </Button>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <span className="sr-only">{caloriePercent}%</span>
            <p aria-hidden="true" className="number-font text-6xl font-semibold leading-none">
              {caloriePercent}
              <span className="ml-1 text-xl font-medium tracking-normal text-subtle-foreground">%</span>
            </p>
            <p className="mt-3 text-sm text-muted-foreground">of today’s calorie target</p>
          </div>
          <div className="text-right">
            <p className="number-font text-2xl font-semibold leading-none">
              {formatNumber(calorieRemaining)}
              <span className="ml-1 text-sm font-medium tracking-normal text-subtle-foreground">kcal</span>
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">remaining</p>
          </div>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-data-1"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(caloriePercent, 100)}%` }}
            transition={barTransition}
          />
        </div>
        <div className="number-font mt-2 flex items-center justify-between text-xs text-subtle-foreground">
          <span>{formatNumber(calories)} kcal</span>
          <span>{formatNumber(calorieTarget)} target</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {metrics.map((metric, index) => {
            const progress = Math.min(metric.value / Math.max(1, metric.target), 1);
            return (
              <DataTile key={metric.label} className="min-w-0 px-3 py-3 sm:px-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <span className="text-subtle-foreground">{metric.icon}</span>
                  {metric.label}
                </span>
                <p className="number-font mt-3 truncate text-xl font-semibold leading-none sm:text-2xl">
                  {formatNumber(metric.value)}
                  {metric.unit && <span className="ml-1 text-xs font-medium tracking-normal text-subtle-foreground">{metric.unit}</span>}
                </p>
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className={cn("h-full rounded-full", metric.bar)}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ ...barTransition, delay: reducedMotion ? 0 : 0.08 * index }}
                  />
                </div>
                <p className="number-font mt-2 text-xs text-subtle-foreground">
                  / {formatNumber(metric.target)}
                  {metric.unit ? ` ${metric.unit}` : ""}
                </p>
              </DataTile>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
