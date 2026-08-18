"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProgressPoint } from "@/lib/types";

export function ProgressChart({ data }: { data: ProgressPoint[] }) {
  const latest = data.at(-1);
  return (
    <div className="hero-surface h-[336px] overflow-hidden px-1 pb-3 pt-4">
      <div aria-hidden className="absolute -left-12 top-12 h-44 w-44 rounded-full bg-[#64d2ff]/8 blur-[58px]" />
      <div aria-hidden className="absolute -right-12 top-4 h-44 w-44 rounded-full bg-[#bf5af2]/10 blur-[58px]" />
      <div className="relative mb-2 flex items-start justify-between px-4">
        <div>
          <p className="section-kicker m-0">Current signals</p>
          <div className="mt-3 flex gap-5">
            <div><p className="number-font m-0 text-[24px] font-bold text-[#64d2ff]">{latest?.weight.toFixed(1)}<span className="ml-1 text-[10px] tracking-normal text-white/32">kg</span></p><p className="mt-1 text-[9px] text-white/28">Body weight</p></div>
            <div><p className="number-font m-0 text-[24px] font-bold text-[#bf5af2]">{latest?.e1rm.toFixed(1)}<span className="ml-1 text-[10px] tracking-normal text-white/32">kg</span></p><p className="mt-1 text-[9px] text-white/28">Estimated 1RM</p></div>
          </div>
        </div>
        <div className="flex flex-col gap-2 pt-1 text-[9px] font-semibold text-white/38">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#64d2ff] shadow-[0_0_8px_#64d2ff]" /> Weight</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#bf5af2] shadow-[0_0_8px_#bf5af2]" /> e1RM</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="69%">
        <AreaChart data={data} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64d2ff" stopOpacity={0.38} /><stop offset="0.72" stopColor="#64d2ff" stopOpacity={0.04} /><stop offset="1" stopColor="#64d2ff" stopOpacity={0} /></linearGradient>
            <linearGradient id="strengthFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bf5af2" stopOpacity={0.32} /><stop offset="0.72" stopColor="#bf5af2" stopOpacity={0.03} /><stop offset="1" stopColor="#bf5af2" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" />
          <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.28)", fontSize: 9 }} interval={2} />
          <YAxis yAxisId="weight" domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,.24)", fontSize: 9 }} />
          <YAxis yAxisId="strength" orientation="right" domain={["dataMin - 3", "dataMax + 3"]} hide />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,.18)", strokeDasharray: "3 3" }} />
          <Area yAxisId="weight" type="monotone" dataKey="weight" stroke="#64d2ff" strokeWidth={2.5} fill="url(#weightFill)" activeDot={{ r: 4, fill: "#64d2ff", stroke: "#000", strokeWidth: 2 }} />
          <Area yAxisId="strength" type="monotone" dataKey="e1rm" stroke="#bf5af2" strokeWidth={2.5} fill="url(#strengthFill)" activeDot={{ r: 4, fill: "#bf5af2", stroke: "#000", strokeWidth: 2 }} />
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
