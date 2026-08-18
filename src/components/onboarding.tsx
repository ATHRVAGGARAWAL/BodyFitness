"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, ArrowLeft, ArrowRight, Check, Dumbbell, Moon, ScanLine } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateTargets, recommendedActivityMultiplier } from "@/lib/calculations";
import { defaultProfile } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import type { OccupationActivity, UserProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const steps = ["Welcome", "Body", "Lifestyle", "Targets"];

export function Onboarding() {
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<UserProfile>({ ...defaultProfile });

  const profileWithRecommendation = useMemo(
    () => ({
      ...profile,
      activityMultiplier: recommendedActivityMultiplier(profile),
    }),
    [profile],
  );
  const targets = useMemo(
    () => calculateTargets(profileWithRecommendation),
    [profileWithRecommendation],
  );

  const next = () => setStep((value) => Math.min(steps.length - 1, value + 1));
  const back = () => setStep((value) => Math.max(0, value - 1));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] mx-auto w-full max-w-[430px] overflow-hidden bg-[var(--background)]"
    >
      <div className="relative flex min-h-[100dvh] flex-col px-5 pb-[calc(22px+var(--safe-bottom))] pt-[calc(18px+var(--safe-top))]">
        <div className="flex h-11 items-center justify-between">
          <button
            aria-label="Back"
            onClick={back}
            className={cn(
              "icon-button pressable transition-opacity",
              step === 0 && "pointer-events-none opacity-0",
            )}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex gap-1.5">
            {steps.map((label, index) => (
              <motion.span
                key={label}
                animate={{ width: index === step ? 22 : 6, opacity: index <= step ? 1 : 0.25 }}
                className="h-1.5 rounded-[3px] bg-[var(--accent)]"
              />
            ))}
          </div>
          <div className="h-10 w-10" />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 340, damping: 31 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            {step === 0 && <WelcomeStep />}
            {step === 1 && <BodyStep profile={profile} setProfile={setProfile} />}
            {step === 2 && <LifestyleStep profile={profile} setProfile={setProfile} />}
            {step === 3 && (
              <TargetStep
                profile={profileWithRecommendation}
                setProfile={setProfile}
                targets={targets}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {step < 3 ? (
          <button
            onClick={next}
            className="primary-action pressable mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[15px] text-[16px] font-black"
          >
            {step === 0 ? "Set up my plan" : "Continue"}
            <ArrowRight size={19} strokeWidth={2.6} />
          </button>
        ) : (
          <button
            onClick={() => finishOnboarding(profileWithRecommendation)}
            className="primary-action pressable mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-[15px] text-[16px] font-black"
          >
            <Check size={20} strokeWidth={3} />
            Enter BodyFitness
          </button>
        )}
      </div>
    </motion.div>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center pb-8 text-center">
      <motion.div initial={{ opacity: 0, y: 14, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 250, damping: 22 }} className="panel relative mb-9 grid h-36 w-36 grid-cols-2 gap-2.5 rounded-[30px] p-4">
        <span className="flex items-center justify-center rounded-[14px] bg-[var(--accent)] text-white"><Activity size={25} /></span>
        <span className="flex items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--protein)_16%,var(--surface-soft))] text-[var(--protein)]"><Dumbbell size={24} /></span>
        <span className="flex items-center justify-center rounded-[14px] bg-[color-mix(in_srgb,var(--steps)_15%,var(--surface-soft))] text-[var(--steps)]"><ScanLine size={24} /></span>
        <span className="flex items-center justify-center rounded-[14px] border border-[var(--border)] bg-[var(--surface-soft)] font-mono text-[13px] font-black">BF</span>
      </motion.div>
      <p className="page-kicker mb-3">Private performance system</p>
      <h1 className="m-0 text-[40px] font-black leading-[0.94] tracking-[-0.065em]">
        Build the signal.
        <br />Cut the noise.
      </h1>
      <p className="mt-5 max-w-[316px] text-[15px] leading-6 text-white/50">
        One focused workspace for nutrition, training and body recomposition. Your history stays on this device.
      </p>
    </div>
  );
}

function BodyStep({
  profile,
  setProfile,
}: {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}) {
  return (
    <StepContainer
      eyebrow="Step 1 of 3"
      title="Start with your baseline"
      description="These values power your BMR, calorie and protein targets."
    >
      <Segmented
        value={profile.sex}
        options={[
          ["male", "Male"],
          ["female", "Female"],
        ]}
        onChange={(sex) => setProfile((value) => ({ ...value, sex: sex as UserProfile["sex"] }))}
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Age" value={profile.age} suffix="years" onChange={(age) => setProfile((v) => ({ ...v, age }))} />
        <NumberField label="Height" value={profile.heightCm} suffix="cm" onChange={(heightCm) => setProfile((v) => ({ ...v, heightCm }))} />
        <NumberField label="Current weight" value={profile.currentWeightKg} suffix="kg" step={0.1} onChange={(currentWeightKg) => setProfile((v) => ({ ...v, currentWeightKg }))} />
        <NumberField label="Goal weight" value={profile.goalWeightKg} suffix="kg" step={0.1} onChange={(goalWeightKg) => setProfile((v) => ({ ...v, goalWeightKg }))} />
      </div>
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-white/48">Body fat, optional</span>
        <div className="relative">
          <input
            className="ios-field number-font pr-12 text-[17px] font-semibold"
            type="number"
            inputMode="decimal"
            min={5}
            max={60}
            placeholder="Skip if unsure"
            value={profile.bodyFatPercent ?? ""}
            onChange={(event) =>
              setProfile((value) => ({
                ...value,
                bodyFatPercent: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/35">%</span>
        </div>
      </label>
    </StepContainer>
  );
}

function LifestyleStep({
  profile,
  setProfile,
}: {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
}) {
  return (
    <StepContainer
      eyebrow="Step 2 of 3"
      title="Describe a normal week"
      description="We use movement and training to recommend an activity level—not to judge your day."
    >
      <label className="block">
        <span className="mb-2 block text-[13px] font-semibold text-white/48">Workday movement</span>
        <select
          className="ios-field appearance-none text-[15px] font-semibold"
          value={profile.occupationActivity}
          onChange={(event) =>
            setProfile((value) => ({
              ...value,
              occupationActivity: event.target.value as OccupationActivity,
            }))
          }
        >
          <option value="seated">Mostly seated</option>
          <option value="mixed">A mix of sitting and walking</option>
          <option value="active">On my feet most of the day</option>
          <option value="manual">Physical or manual work</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Average steps" value={profile.averageSteps} suffix="/ day" step={500} onChange={(averageSteps) => setProfile((v) => ({ ...v, averageSteps }))} />
        <NumberField label="Training" value={profile.trainingDays} suffix="days / wk" min={0} max={7} onChange={(trainingDays) => setProfile((v) => ({ ...v, trainingDays }))} />
        <NumberField label="Session length" value={profile.sessionMinutes} suffix="minutes" step={5} onChange={(sessionMinutes) => setProfile((v) => ({ ...v, sessionMinutes }))} />
        <NumberField label="Sleep" value={profile.sleepHours} suffix="hours" step={0.5} onChange={(sleepHours) => setProfile((v) => ({ ...v, sleepHours }))} />
      </div>
      <div className="flex gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4 text-[var(--steps)]">
        <Moon className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="m-0 text-[13px] leading-5 text-white/58">
          Sleep shapes recovery coaching, but we do not invent a calorie penalty for a short night.
        </p>
      </div>
    </StepContainer>
  );
}

function TargetStep({
  profile,
  setProfile,
  targets,
}: {
  profile: UserProfile;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  targets: ReturnType<typeof calculateTargets>;
}) {
  return (
    <StepContainer
      eyebrow="Step 3 of 3"
      title="Your recomp targets"
      description="A mild deficit with high protein. You can change this anytime."
    >
      <div className="grid grid-cols-2 gap-3">
        <TargetCard label="Calories" value={formatNumber(targets.calories)} unit="kcal" color="var(--energy)" />
        <TargetCard label="Protein" value={formatNumber(targets.proteinG)} unit="grams" color="var(--protein)" />
        <TargetCard label="Water" value={(targets.waterMl / 1_000).toFixed(1)} unit="litres" color="var(--steps)" />
        <TargetCard label="Steps" value={`${Math.round(targets.steps / 1_000)}k`} unit="daily" color="var(--accent-strong)" />
      </div>
      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 text-sm font-semibold">Daily deficit</p>
            <p className="mt-1 text-xs text-white/40">Based on {formatNumber(targets.tdee)} kcal TDEE</p>
          </div>
          <span className="number-font text-2xl font-black text-[var(--protein)]">{profile.deficitPercent}%</span>
        </div>
        <input
          aria-label="Daily calorie deficit"
          className="mt-4 w-full accent-[var(--accent)]"
          type="range"
          min={5}
          max={20}
          step={1}
          value={profile.deficitPercent}
          onChange={(event) =>
            setProfile((value) => ({ ...value, deficitPercent: Number(event.target.value) }))
          }
        />
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-white/28">
          <span>Gentle</span>
          <span>Faster</span>
        </div>
      </div>
      <p className="m-0 px-2 text-center text-xs leading-5 text-white/35">
        Protein uses your {profile.goalWeightKg} kg goal weight. Calorie estimates are a starting point, not medical advice.
      </p>
    </StepContainer>
  );
}

function StepContainer({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="scrollbar-none flex-1 overflow-y-auto pb-3 pt-5">
      <p className="page-kicker mb-2">{eyebrow}</p>
      <h2 className="m-0 text-[31px] font-black leading-[1.02] tracking-[-0.055em]">{title}</h2>
      <p className="mb-6 mt-3 text-[15px] leading-5 text-white/48">{description}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function NumberField({
  label,
  value,
  suffix,
  step = 1,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold text-white/48">{label}</span>
      <div className="relative">
        <input
          className="ios-field number-font pr-16 text-[17px] font-semibold"
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 max-w-[58px] -translate-y-1/2 text-right text-[10px] font-semibold leading-3 text-white/30">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function Segmented({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="segmented-control relative grid grid-cols-2 p-1">
      {options.map(([option, label]) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className="relative h-9 rounded-[10px] text-sm font-semibold"
        >
          {value === option && (
            <motion.span
              layoutId="onboarding-segment"
              className="segmented-selected absolute inset-0 rounded-[11px]"
            />
          )}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}

function TargetCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div className="panel min-h-[108px] p-4">
      <div className="mb-4 h-2 w-5 rounded-[3px]" style={{ background: color }} />
      <p className="m-0 text-xs font-semibold text-white/42">{label}</p>
      <p className="number-font mb-0 mt-1 text-[27px] font-bold leading-none">
        {value} <span className="text-[11px] font-semibold tracking-normal text-white/35">{unit}</span>
      </p>
    </div>
  );
}
