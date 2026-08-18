"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressPoint } from "@/lib/types";

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <div className="panel h-[292px] overflow-hidden px-1 pb-3 pt-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <div><p className="eyebrow-label m-0">Signal map</p><p className="mt-1 text-sm font-bold">Weight vs strength</p></div>
        <div className="flex gap-3 text-[9px] font-semibold text-white/38">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[var(--steps)]" /> kg</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-[2px] bg-[var(--accent)]" /> e1RM</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "var(--chart-label)", fontSize: 9 }} interval={2} />
          <YAxis yAxisId="weight" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fill: "var(--chart-label)", fontSize: 9 }} />
          <YAxis yAxisId="strength" orientation="right" domain={["dataMin - 3", "dataMax + 3"]} hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--separator)", strokeDasharray: "3 3" }} />
          <Area yAxisId="weight" type="monotone" dataKey="weight" stroke="var(--steps)" strokeWidth={2.4} fill="var(--steps)" fillOpacity={0.055} activeDot={{ r: 4, fill: "var(--steps)", stroke: "var(--surface)", strokeWidth: 2 }} />
          <Area yAxisId="strength" type="monotone" dataKey="e1rm" stroke="var(--accent)" strokeWidth={2.4} fill="var(--accent)" fillOpacity={0.04} activeDot={{ r: 4, fill: "var(--accent)", stroke: "var(--surface)", strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const weight = payload.find((item) => item.dataKey === "weight")?.value;
  const strength = payload.find((item) => item.dataKey === "e1rm")?.value;
  return (
    <div className="glass rounded-[14px] px-3 py-2 text-[10px] shadow-xl">
      <p className="m-0 font-semibold text-white/45">{label}</p>
      <p className="number-font mb-0 mt-1 font-bold text-[var(--steps)]">{weight?.toFixed(1)} kg</p>
      <p className="number-font m-0 font-bold text-[var(--accent-strong)]">{strength?.toFixed(1)} kg e1RM</p>
    </div>
  );
}
