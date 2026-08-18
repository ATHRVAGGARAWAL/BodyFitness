"use client";

import { RotateCcw, Save, X } from "lucide-react";
import { useState } from "react";
import { Drawer } from "vaul";
import { useAppChrome } from "@/components/app-shell";
import { useBodyFitnessStore } from "@/lib/store";
import type { UserProfile } from "@/lib/types";

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useBodyFitnessStore((state) => state.profile);
  const targets = useBodyFitnessStore((state) => state.targets);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const setRestDefaults = useBodyFitnessStore((state) => state.setRestDefaults);
  const resetAll = useBodyFitnessStore((state) => state.resetAll);
  const { showToast } = useAppChrome();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [restDraft, setRestDraft] = useState(restDefaults);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraft(profile);
    if (nextOpen) setRestDraft(restDefaults);
    onOpenChange(nextOpen);
  };

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[95] flex max-h-[92dvh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[32px] outline-none">
          <Drawer.Title className="sr-only">Settings</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/22" />
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">BodyFitness</p>
              <h2 className="m-0 mt-1 text-[28px] font-bold tracking-[-0.04em]">Settings</h2>
            </div>
            <button onClick={() => onOpenChange(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="scrollbar-none overflow-y-auto px-5 pb-[calc(28px+var(--safe-bottom))]">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-white/34">Profile</p>
            <div className="ios-card grid grid-cols-2 gap-3 p-4">
              <SettingNumber label="Current kg" value={draft.currentWeightKg} step={0.1} onChange={(currentWeightKg) => setDraft((value) => ({ ...value, currentWeightKg }))} />
              <SettingNumber label="Goal kg" value={draft.goalWeightKg} step={0.1} onChange={(goalWeightKg) => setDraft((value) => ({ ...value, goalWeightKg }))} />
              <SettingNumber label="Height cm" value={draft.heightCm} onChange={(heightCm) => setDraft((value) => ({ ...value, heightCm }))} />
              <SettingNumber label="Age" value={draft.age} onChange={(age) => setDraft((value) => ({ ...value, age }))} />
              <SettingNumber label="Training days" value={draft.trainingDays} max={7} onChange={(trainingDays) => setDraft((value) => ({ ...value, trainingDays }))} />
              <SettingNumber label="Sleep hours" value={draft.sleepHours} step={0.5} onChange={(sleepHours) => setDraft((value) => ({ ...value, sleepHours }))} />
            </div>

            <div className="mt-4 ios-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="m-0 text-sm font-semibold">Recomp deficit</p>
                  <p className="mt-1 text-xs text-white/35">Current target {targets.calories} kcal</p>
                </div>
                <span className="number-font text-2xl font-bold text-[#30d158]">{draft.deficitPercent}%</span>
              </div>
              <input type="range" min={5} max={20} value={draft.deficitPercent} onChange={(event) => setDraft((value) => ({ ...value, deficitPercent: Number(event.target.value) }))} className="w-full accent-[#30d158]" />
            </div>

            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-[0.1em] text-white/34">Rest timer</p>
            <div className="ios-card grid grid-cols-2 gap-3 p-4">
              <SettingNumber label="Compound seconds" value={restDraft.compound} step={15} onChange={(compound) => setRestDraft((value) => ({ ...value, compound }))} />
              <SettingNumber label="Isolation seconds" value={restDraft.isolation} step={15} onChange={(isolation) => setRestDraft((value) => ({ ...value, isolation }))} />
            </div>

            <button
              onClick={() => {
                finishOnboarding(draft);
                setRestDefaults(restDraft);
                showToast("Targets recalculated");
                onOpenChange(false);
              }}
              className="pressable mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-[17px] bg-white text-sm font-bold text-black"
            >
              <Save size={17} /> Save & recalculate
            </button>

            <button
              onClick={() => {
                if (window.confirm("Reset all local BodyFitness data? This cannot be undone.")) {
                  resetAll();
                  onOpenChange(false);
                }
              }}
              className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-[17px] bg-[#ff453a]/12 text-sm font-semibold text-[#ff453a]"
            >
              <RotateCcw size={16} /> Reset local data
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SettingNumber({ label, value, step = 1, max, onChange }: { label: string; value: number; step?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-semibold text-white/35">{label}</span>
      <input className="ios-field number-font min-h-11 text-base font-semibold" type="number" inputMode="decimal" value={value} step={step} max={max} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}
