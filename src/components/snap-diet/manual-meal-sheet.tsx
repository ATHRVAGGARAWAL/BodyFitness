"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Drawer } from "vaul";

export interface ManualMealValues {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const empty: ManualMealValues = { name: "", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function ManualMealSheet({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (values: ManualMealValues) => void }) {
  const [values, setValues] = useState(empty);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setValues(empty);
    onOpenChange(nextOpen);
  };
  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[95] w-full max-w-[430px] -translate-x-1/2 rounded-t-[30px] px-5 pb-[calc(25px+var(--safe-bottom))] pt-3 outline-none">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/22" />
          <Drawer.Title className="mb-5 mt-5 text-[27px] font-bold tracking-[-0.04em]">Log meal manually</Drawer.Title>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-white/40">Meal name</span>
            <input autoFocus className="ios-field" placeholder="e.g. Paneer rice bowl" value={values.name} onChange={(event) => setValues((value) => ({ ...value, name: event.target.value }))} />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {([[
              "calories", "Calories", "kcal"], ["proteinG", "Protein", "g"], ["carbsG", "Carbs", "g"], ["fatG", "Fat", "g"]] as const).map(([key, label, unit]) => (
              <label key={key}>
                <span className="mb-2 block text-xs font-semibold text-white/40">{label}</span>
                <div className="relative">
                  <input className="ios-field number-font pr-10 text-lg font-semibold" type="number" inputMode="decimal" value={values[key]} onChange={(event) => setValues((value) => ({ ...value, [key]: Number(event.target.value) }))} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">{unit}</span>
                </div>
              </label>
            ))}
          </div>
          <button disabled={!values.name || !values.calories} onClick={() => { onAdd(values); onOpenChange(false); }} className="pressable mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-white text-sm font-bold text-black disabled:opacity-35">
            <Plus size={18} /> Add meal
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
