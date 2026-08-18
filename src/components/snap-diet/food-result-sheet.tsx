"use client";

import { Check, Flame, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Drawer } from "vaul";
import type { FoodAnalysis, FoodItem } from "@/lib/types";
import { formatNumber, uid } from "@/lib/utils";

export function FoodResultSheet({
  open,
  analysis,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  analysis: FoodAnalysis | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (analysis: FoodAnalysis) => void;
}) {
  const [name, setName] = useState(analysis?.name ?? "Detected meal");
  const [items, setItems] = useState<FoodItem[]>(() =>
    analysis?.items.map((item) => ({ ...item, id: item.id ?? uid("food") })) ?? [],
  );

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => ({
          calories: sum.calories + item.calories,
          proteinG: sum.proteinG + item.proteinG,
          carbsG: sum.carbsG + item.carbsG,
          fatG: sum.fatG + item.fatG,
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      ),
    [items],
  );

  if (!analysis) return null;

  const updateItem = (id: string | undefined, patch: Partial<FoodItem>) =>
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} dismissible>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay fixed inset-0 z-[91]" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[96] flex max-h-[88dvh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[32px] outline-none">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/25" />
          <div className="px-5 pb-3 pt-4">
            <div className="mb-2 flex items-center gap-2 text-[#ffd60a]">
              <Sparkles size={15} />
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">AI plate estimate</span>
            </div>
            <Drawer.Title asChild>
              <input value={name} onChange={(event) => setName(event.target.value)} className="w-full border-0 bg-transparent p-0 text-[27px] font-bold tracking-[-0.04em] outline-none" />
            </Drawer.Title>
            <p className="mt-1 text-xs text-white/38">Edit anything that looks off before adding it.</p>
          </div>

          <div className="scrollbar-none overflow-y-auto px-5 pb-[calc(24px+var(--safe-bottom))]">
            <div className="grid grid-cols-4 gap-2">
              <Macro value={totals.calories} label="kcal" color="#ff375f" />
              <Macro value={totals.proteinG} label="protein" color="#b6ff2e" />
              <Macro value={totals.carbsG} label="carbs" color="#64d2ff" />
              <Macro value={totals.fatG} label="fat" color="#ffd60a" />
            </div>

            <div className="mt-5 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="ios-card p-3.5">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff375f]/12 text-[#ff375f]"><Flame size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <input value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value })} className="w-full border-0 bg-transparent p-0 text-sm font-semibold outline-none" />
                      <input value={item.portion} onChange={(event) => updateItem(item.id, { portion: event.target.value })} className="mt-1 w-full border-0 bg-transparent p-0 text-[11px] text-white/35 outline-none" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <MiniInput label="kcal" value={item.calories} onChange={(calories) => updateItem(item.id, { calories })} />
                    <MiniInput label="P" value={item.proteinG} onChange={(proteinG) => updateItem(item.id, { proteinG })} />
                    <MiniInput label="C" value={item.carbsG} onChange={(carbsG) => updateItem(item.id, { carbsG })} />
                    <MiniInput label="F" value={item.fatG} onChange={(fatG) => updateItem(item.id, { fatG })} />
                  </div>
                </div>
              ))}
            </div>

            {analysis.assumptions.length > 0 && (
              <div className="mt-4 rounded-[18px] bg-white/[0.045] p-3.5">
                <p className="m-0 text-[11px] font-semibold text-white/48">AI assumptions</p>
                <ul className="mb-0 mt-2 space-y-1 pl-4 text-[11px] leading-4 text-white/35">
                  {analysis.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={() => onAdd({ ...analysis, name, items, totals })}
              className="pressable mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#30d158] text-[16px] font-bold text-black"
            >
              <Check size={19} strokeWidth={3} /> Add to Rings
            </button>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/28">Nutrition estimates can vary with portion size and preparation.</p>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Macro({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-[17px] bg-white/[0.055] px-2 py-3 text-center">
      <p className="number-font m-0 text-[19px] font-bold" style={{ color }}>{formatNumber(value)}</p>
      <p className="m-0 mt-1 text-[9px] font-semibold text-white/30">{label}</p>
    </div>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="rounded-[12px] bg-white/[0.055] px-2 py-1.5 text-center">
      <span className="block text-[8px] font-bold text-white/28">{label}</span>
      <input type="number" inputMode="decimal" value={Math.round(value)} onChange={(event) => onChange(Number(event.target.value))} className="number-font mt-0.5 w-full border-0 bg-transparent p-0 text-center text-[13px] font-semibold outline-none" />
    </label>
  );
}
