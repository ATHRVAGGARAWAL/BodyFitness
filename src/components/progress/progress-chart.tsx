"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import type { ProgressPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Body mass and estimated 1RM over the same 12 weeks, as two stacked panels that share
 * an x-axis and a hover cursor (`syncId`). Two measures on separate scales get separate
 * panels rather than a dual axis, so neither line implies a false relationship.
 * `null` weeks stay as gaps between connected points.
 */
export function ProgressChart({ data, liftName }: { data: ProgressPoint[]; liftName?: string }) {
  const hasWeight = data.some((point) => point.weight !== null);
  const hasStrength = data.some((point) => point.e1rm !== null);
  return (
    <Card className="overflow-hidden">
      <Panel
        title="Body mass"
        unit="kg"
        swatchClass="bg-data-2"
        empty={!hasWeight}
        emptyHint="Log your weight to draw this line."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} syncId="progress" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="week" hide />
            <YAxis width={40} domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fill: "var(--chart-label)", fontSize: 11 }} tickCount={4} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-label)", strokeDasharray: "3 3" }} isAnimationActive={false} />
            <Area type="monotone" dataKey="weight" connectNulls stroke="var(--data-2)" strokeWidth={2} fill="var(--data-2)" fillOpacity={0.06} isAnimationActive={false} activeDot={{ r: 4, fill: "var(--data-2)", stroke: "var(--card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <Panel
        title={`${liftName ?? "Lift"} e1RM`}
        unit="kg"
        swatchClass="bg-brand"
        empty={!hasStrength}
        emptyHint="Train this lift to draw its line."
        className="border-t border-border"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} syncId="progress" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-label)", fontSize: 11 }} interval={2} />
            <YAxis width={40} domain={["dataMin - 3", "dataMax + 3"]} axisLine={false} tickLine={false} tick={{ fill: "var(--chart-label)", fontSize: 11 }} tickCount={4} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--chart-label)", strokeDasharray: "3 3" }} isAnimationActive={false} />
            <Area type="monotone" dataKey="e1rm" connectNulls stroke="var(--brand)" strokeWidth={2} fill="var(--brand)" fillOpacity={0.06} isAnimationActive={false} activeDot={{ r: 4, fill: "var(--brand)", stroke: "var(--card)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </Card>
  );
}

function Panel({
  title,
  unit,
  swatchClass,
  empty,
  emptyHint,
  className,
  children,
}: {
  title: string;
  unit: string;
  swatchClass: string;
  empty: boolean;
  emptyHint: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("px-3 pb-2 pt-4", className)}>
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={cn("size-2 rounded-sm", swatchClass)} />
          {title}
          <span className="text-xs font-normal text-subtle-foreground">{unit}</span>
        </p>
        {empty ? <span className="text-xs text-muted-foreground">{emptyHint}</span> : null}
      </div>
      <div className="h-[150px] w-full">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number | null }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const weight = payload.find((item) => item.dataKey === "weight")?.value;
  const strength = payload.find((item) => item.dataKey === "e1rm")?.value;
  if (weight == null && strength == null) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground">
      <p className="text-muted-foreground">{label}</p>
      {weight != null && <p className="number-font mt-1 font-medium">{weight.toFixed(1)} <span className="font-normal text-subtle-foreground">kg</span></p>}
      {strength != null && <p className="number-font mt-1 font-medium">{strength.toFixed(1)} <span className="font-normal text-subtle-foreground">kg e1RM</span></p>}
    </div>
  );
}
