"use client";

import {
  Dumbbell,
  Moon,
  RotateCcw,
  Save,
  Smartphone,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Drawer } from "vaul";
import { useAppChrome } from "@/components/app-shell";
import { useBodyFitnessStore } from "@/lib/store";
import type { ThemePreference, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const appearanceOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Smartphone },
];

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useBodyFitnessStore((state) => state.profile);
  const targets = useBodyFitnessStore((state) => state.targets);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const themePreference = useBodyFitnessStore((state) => state.themePreference);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const setRestDefaults = useBodyFitnessStore((state) => state.setRestDefaults);
  const setThemePreference = useBodyFitnessStore((state) => state.setThemePreference);
  const resetAll = useBodyFitnessStore((state) => state.resetAll);
  const { showToast } = useAppChrome();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [restDraft, setRestDraft] = useState(restDefaults);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(profile);
      setRestDraft(restDefaults);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay fixed inset-0 z-[90] backdrop-blur-sm" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[95] flex max-h-[94dvh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[32px] outline-none">
          <Drawer.Title className="sr-only">Profile and preferences</Drawer.Title>
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/22" />
          <div className="flex items-center justify-between px-5 pb-3 pt-4">
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.12em] text-white/35">BodyFitness</p>
              <h2 className="m-0 mt-1 text-[28px] font-bold tracking-[-0.04em]">Profile</h2>
            </div>
            <button
              aria-label="Close profile"
              onClick={() => onOpenChange(false)}
              className="pressable flex h-9 w-9 items-center justify-center rounded-full bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <div className="scrollbar-none overflow-y-auto px-5 pb-[calc(28px+var(--safe-bottom))]">
            <div className="health-card p-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#007aff] text-white always-dark">
                  <UserRound size={27} strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[17px] font-bold">My Profile</p>
                  <p className="mt-1 text-[11px] text-white/38">
                    {draft.currentWeightKg.toFixed(1)} kg now · {draft.goalWeightKg.toFixed(1)} kg goal
                  </p>
                </div>
                <span className="number-font rounded-full bg-[#30d158]/12 px-2.5 py-1.5 text-[11px] font-bold text-[#30d158]">
                  {draft.deficitPercent}%
                </span>
              </div>
              <div className="mt-4 grid grid-cols-3 border-t border-white/[0.065] pt-3 text-center">
                <ProfileStat label="Height" value={`${draft.heightCm} cm`} />
                <ProfileStat label="Training" value={`${draft.trainingDays} days`} bordered />
                <ProfileStat label="Sleep" value={`${draft.sleepHours} h`} bordered />
              </div>
            </div>

            <SectionLabel>Appearance</SectionLabel>
            <div className="segmented-control grid grid-cols-3 gap-1 p-1">
              {appearanceOptions.map((option) => {
                const Icon = option.icon;
                const selected = option.value === themePreference;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setThemePreference(option.value)}
                    className={cn(
                      "pressable flex min-h-11 items-center justify-center gap-1.5 rounded-[10px] text-[11px] font-semibold text-white/45",
                      selected && "segmented-selected text-white",
                    )}
                  >
                    <Icon size={15} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <SectionLabel>Health details</SectionLabel>
            <div className="ios-card grid grid-cols-2 gap-3 p-4">
              <SettingNumber label="Current weight" suffix="kg" value={draft.currentWeightKg} step={0.1} onChange={(currentWeightKg) => setDraft((value) => ({ ...value, currentWeightKg }))} />
              <SettingNumber label="Goal weight" suffix="kg" value={draft.goalWeightKg} step={0.1} onChange={(goalWeightKg) => setDraft((value) => ({ ...value, goalWeightKg }))} />
              <SettingNumber label="Height" suffix="cm" value={draft.heightCm} onChange={(heightCm) => setDraft((value) => ({ ...value, heightCm }))} />
              <SettingNumber label="Age" suffix="years" value={draft.age} onChange={(age) => setDraft((value) => ({ ...value, age }))} />
              <SettingNumber label="Training" suffix="days / wk" value={draft.trainingDays} max={7} onChange={(trainingDays) => setDraft((value) => ({ ...value, trainingDays }))} />
              <SettingNumber label="Sleep" suffix="hours" value={draft.sleepHours} step={0.5} onChange={(sleepHours) => setDraft((value) => ({ ...value, sleepHours }))} />
            </div>

            <div className="mt-4 ios-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="m-0 text-sm font-semibold">Recomp deficit</p>
                  <p className="mt-1 text-xs text-white/35">Current target {targets.calories} kcal</p>
                </div>
                <span className="number-font text-2xl font-bold text-[#30d158]">{draft.deficitPercent}%</span>
              </div>
              <input
                aria-label="Recomposition calorie deficit"
                type="range"
                min={5}
                max={20}
                value={draft.deficitPercent}
                onChange={(event) => setDraft((value) => ({ ...value, deficitPercent: Number(event.target.value) }))}
                className="w-full accent-[#30d158]"
              />
            </div>

            <SectionLabel icon={<Dumbbell size={13} />}>Rest timer</SectionLabel>
            <div className="ios-card grid grid-cols-2 gap-3 p-4">
              <SettingNumber label="Compound" suffix="seconds" value={restDraft.compound} step={15} onChange={(compound) => setRestDraft((value) => ({ ...value, compound }))} />
              <SettingNumber label="Isolation" suffix="seconds" value={restDraft.isolation} step={15} onChange={(isolation) => setRestDraft((value) => ({ ...value, isolation }))} />
            </div>

            <button
              onClick={() => {
                finishOnboarding(draft);
                setRestDefaults(restDraft);
                showToast("Profile and targets updated");
                onOpenChange(false);
              }}
              className="always-dark pressable mt-4 flex min-h-13 w-full items-center justify-center gap-2 rounded-[17px] bg-[#007aff] text-sm font-bold text-white"
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

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <p className="mb-2 mt-5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white/34">
      {icon}
      {children}
    </p>
  );
}

function ProfileStat({ label, value, bordered = false }: { label: string; value: string; bordered?: boolean }) {
  return (
    <div className={bordered ? "border-l border-white/[0.065]" : ""}>
      <p className="number-font m-0 text-[13px] font-bold">{value}</p>
      <p className="m-0 mt-1 text-[9px] font-semibold text-white/30">{label}</p>
    </div>
  );
}

function SettingNumber({
  label,
  suffix,
  value,
  step = 1,
  max,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  step?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-semibold text-white/35">{label}</span>
      <div className="relative">
        <input
          className="ios-field number-font min-h-11 pr-12 text-base font-semibold"
          type="number"
          inputMode="decimal"
          value={value}
          step={step}
          max={max}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 max-w-10 -translate-y-1/2 text-right text-[8px] font-semibold leading-3 text-white/28">
          {suffix}
        </span>
      </div>
    </label>
  );
}
