"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressPoint } from "@/lib/types";

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  return (
    <div className="ios-card h-[292px] overflow-hidden px-1 pb-3 pt-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <div><p className="m-0 text-[11px] font-semibold text-white/35">12-week trend</p><p className="mt-1 text-sm font-semibold">Weight vs strength</p></div>
        <div className="flex gap-3 text-[9px] font-semibold text-white/38">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#64d2ff]" /> kg</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-[#bf5af2]" /> e1RM</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="84%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64d2ff" stopOpacity={0.32} /><stop offset="1" stopColor="#64d2ff" stopOpacity={0} /></linearGradient>
            <linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bf5af2" stopOpacity={0.28} /><stop offset="1" stopColor="#bf5af2" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" />
          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.28)", fontSize: 9 }} interval={2} />
          <YAxis yAxisId="weight" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.24)", fontSize: 9 }} />
          <YAxis yAxisId="strength" orientation="right" domain={["dataMin - 3", "dataMax + 3"]} hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,.18)", strokeDasharray: "3 3" }} />
          <Area yAxisId="weight" type="monotone" dataKey="weight" stroke="#64d2ff" strokeWidth={2.4} fill="url(#weightFill)" activeDot={{ r: 4, fill: "#64d2ff", stroke: "#000", strokeWidth: 2 }} />
          <Area yAxisId="strength" type="monotone" dataKey="e1rm" stroke="#bf5af2" strokeWidth={2.4} fill="url(#strengthFill)" activeDot={{ r: 4, fill: "#bf5af2", stroke: "#000", strokeWidth: 2 }} />
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
      <p className="number-font mb-0 mt-1 font-bold text-[#64d2ff]">{weight?.toFixed(1)} kg</p>
      <p className="number-font m-0 font-bold text-[#bf5af2]">{strength?.toFixed(1)} kg e1RM</p>
    </div>
  );
}
