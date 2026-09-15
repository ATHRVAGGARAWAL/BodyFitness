"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Moon } from "lucide-react";
import { useMemo, useState } from "react";
import { PlanConfigurator } from "@/components/ai/plan-configurator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTile } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { calculateTargets, recommendedActivityMultiplier } from "@/lib/calculations";
import { fadeRise, reduceable, T, usePrefersReducedMotion } from "@/lib/motion";
import { defaultProfile } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import type { OccupationActivity, UserProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const steps = [
  { label: "Welcome", caption: "What this is" },
  { label: "Body", caption: "Your baseline" },
  { label: "Lifestyle", caption: "A normal week" },
  { label: "Targets", caption: "Formula baseline" },
  { label: "Plan", caption: "Refine with AI" },
];

type SetProfile = React.Dispatch<React.SetStateAction<UserProfile>>;

export function Onboarding() {
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const targetsSource = useBodyFitnessStore((state) => state.targetsSource);
  const storeTargets = useBodyFitnessStore((state) => state.targets);
  const reduced = usePrefersReducedMotion();
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
  const last = step === steps.length - 1;

  return (
    <motion.div
      variants={fadeRise}
      initial="hidden"
      animate="visible"
      transition={T.base}
      className="fixed inset-0 z-[100] overflow-y-auto bg-background text-foreground"
    >
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col px-4 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(12px+env(safe-area-inset-top,0px))] lg:grid lg:max-w-[1100px] lg:grid-cols-[1fr_1.2fr] lg:gap-16 lg:px-10 lg:py-14">
        <aside className="hidden lg:flex lg:flex-col lg:justify-between lg:py-2">
          <div>
            <p className="page-kicker mb-4">BodyFitness · Private performance system</p>
            <h1 className="text-5xl font-semibold leading-none tracking-tight">
              Build the signal.
              <br />
              Cut the noise.
            </h1>
            <p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">
              One focused workspace for nutrition, training and body recomposition. Your history stays on this device unless you choose to sync it.
            </p>
          </div>
          <ol className="mt-12 space-y-1 border-t border-border pt-6">
            {steps.map((item, index) => {
              const state = index === step ? "current" : index < step ? "done" : "upcoming";
              return (
                <li
                  key={item.label}
                  aria-current={state === "current" ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-4 rounded-md px-2 py-2.5",
                    state === "current" && "bg-muted",
                  )}
                >
                  <span className={cn("font-mono text-xs font-medium tracking-[0.08em]", state === "current" ? "text-brand" : "text-subtle-foreground")}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm font-medium", state === "upcoming" && "text-muted-foreground")}>{item.label}</span>
                    <span className="block text-xs text-subtle-foreground">{item.caption}</span>
                  </span>
                  {state === "done" ? <Check size={14} className="text-success" aria-hidden="true" /> : null}
                </li>
              );
            })}
          </ol>
        </aside>

        <section className="flex min-h-0 flex-1 flex-col">
          <div className="flex h-11 items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Back"
              onClick={back}
              className={cn("transition-opacity", step === 0 && "pointer-events-none opacity-0")}
            >
              <ArrowLeft />
            </Button>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((item, index) => (
                <motion.span
                  key={item.label}
                  animate={{ width: index === step ? 22 : 6, opacity: index <= step ? 1 : 0.3 }}
                  transition={reduceable(T.base, reduced)}
                  className="h-1.5 rounded-sm bg-brand"
                />
              ))}
            </div>
            <span className="font-mono text-xs text-subtle-foreground">
              {step === 0 ? "" : `${step} / ${steps.length - 1}`}
            </span>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              variants={fadeRise}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={T.base}
              className="flex min-h-0 flex-1 flex-col"
            >
              {step === 0 && <WelcomeStep />}
              {step === 1 && <BodyStep profile={profile} setProfile={setProfile} />}
              {step === 2 && <LifestyleStep profile={profile} setProfile={setProfile} />}
              {step === 3 && <TargetStep profile={profileWithRecommendation} setProfile={setProfile} targets={targets} />}
              {step === 4 && (
                <PlanStep
                  profile={profileWithRecommendation}
                  setProfile={setProfile}
                  targets={targetsSource === "ai" ? storeTargets : targets}
                  aiActive={targetsSource === "ai"}
                />
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 border-t border-border pt-4">
            {!last ? (
              <Button variant="primary" size="lg" block onClick={next}>
                {step === 0 ? "Set up my plan" : "Continue"}
                <ArrowRight />
              </Button>
            ) : (
              <Button variant="primary" size="lg" block onClick={() => finishOnboarding(profileWithRecommendation)}>
                <Check />
                Enter BodyFitness
              </Button>
            )}
            {last ? (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {targetsSource === "ai" ? "Your AI plan is saved with your profile." : "Skipping AI keeps the formula targets. You can configure a plan later from Profile."}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

function WelcomeStep() {
  return (
    <div className="flex flex-1 flex-col justify-center py-8 lg:py-4">
      <p className="page-kicker mb-3 lg:hidden">Private performance system</p>
      <h1 className="text-4xl font-semibold leading-none tracking-tight lg:hidden">
        Build the signal.
        <br />
        Cut the noise.
      </h1>
      <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground lg:hidden">
        One focused workspace for nutrition, training and body recomposition. Your history stays on this device.
      </p>
      <h2 className="hidden text-3xl font-semibold tracking-tight lg:block">Four short steps</h2>
      <p className="hidden text-base text-muted-foreground lg:mt-2 lg:block">About two minutes. Every number can be changed later.</p>
      <ul className="mt-8 divide-y divide-border border-y border-border">
        {[
          ["01", "Body", "Age, height and weight set your BMR."],
          ["02", "Lifestyle", "Movement and training pick an activity level."],
          ["03", "Targets", "A mild deficit with high protein, from the formula."],
          ["04", "Plan", "Optionally let the AI coach refine the numbers."],
        ].map(([index, title, body]) => (
          <li key={index} className="flex items-start gap-4 py-3">
            <span className="mt-0.5 font-mono text-xs font-medium tracking-[0.08em] text-brand">{index}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-sm text-muted-foreground">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BodyStep({ profile, setProfile }: { profile: UserProfile; setProfile: SetProfile }) {
  return (
    <StepContainer
      eyebrow="Step 1 of 4"
      title="Start with your baseline"
      description="These values power your BMR, calorie and protein targets."
    >
      <Segmented
        label="Sex"
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
      <Field label="Body fat, optional" hint="Skip if unsure; it sharpens the BMR estimate.">
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min={5}
            max={60}
            placeholder="—"
            className="pr-10"
            value={profile.bodyFatPercent ?? ""}
            onChange={(event) =>
              setProfile((value) => ({
                ...value,
                bodyFatPercent: event.target.value ? Number(event.target.value) : null,
              }))
            }
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle-foreground">%</span>
        </div>
      </Field>
    </StepContainer>
  );
}

function LifestyleStep({ profile, setProfile }: { profile: UserProfile; setProfile: SetProfile }) {
  return (
    <StepContainer
      eyebrow="Step 2 of 4"
      title="Describe a normal week"
      description="We use movement and training to recommend an activity level, not to judge your day."
    >
      <Field label="Workday movement">
        <Select
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
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Average steps" value={profile.averageSteps} suffix="/ day" step={500} onChange={(averageSteps) => setProfile((v) => ({ ...v, averageSteps }))} />
        <NumberField label="Training" value={profile.trainingDays} suffix="days / wk" min={0} max={7} onChange={(trainingDays) => setProfile((v) => ({ ...v, trainingDays }))} />
        <NumberField label="Session length" value={profile.sessionMinutes} suffix="min" step={5} onChange={(sessionMinutes) => setProfile((v) => ({ ...v, sessionMinutes }))} />
        <NumberField label="Sleep" value={profile.sleepHours} suffix="hours" step={0.5} onChange={(sleepHours) => setProfile((v) => ({ ...v, sleepHours }))} />
      </div>
      <div className="flex gap-3 rounded-lg border border-border bg-muted p-4">
        <Moon size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm leading-relaxed text-muted-foreground">
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
  setProfile: SetProfile;
  targets: ReturnType<typeof calculateTargets>;
}) {
  return (
    <StepContainer
      eyebrow="Step 3 of 4"
      title="Your recomp targets"
      description="A mild deficit with high protein. You can change this anytime."
    >
      <TargetGrid targets={targets} />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Daily deficit</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on <span className="number-font">{formatNumber(targets.tdee)}</span> kcal TDEE
            </p>
          </div>
          <p className="number-font text-2xl font-semibold leading-none">
            {profile.deficitPercent}
            <span className="ml-0.5 text-sm font-medium text-subtle-foreground">%</span>
          </p>
        </div>
        <input
          aria-label="Daily calorie deficit"
          className="mt-4 w-full accent-brand"
          type="range"
          min={5}
          max={20}
          step={1}
          value={profile.deficitPercent}
          onChange={(event) =>
            setProfile((value) => ({ ...value, deficitPercent: Number(event.target.value) }))
          }
        />
        <div className="mt-1 flex justify-between text-xs text-subtle-foreground">
          <span>Gentle · 5%</span>
          <span>Faster · 20%</span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Protein uses your <span className="number-font">{profile.goalWeightKg}</span> kg goal weight. Calorie estimates are a starting point, not medical advice.
      </p>
    </StepContainer>
  );
}

function PlanStep({
  profile,
  setProfile,
  targets,
  aiActive,
}: {
  profile: UserProfile;
  setProfile: SetProfile;
  targets: ReturnType<typeof calculateTargets>;
  aiActive: boolean;
}) {
  return (
    <StepContainer
      eyebrow="Step 4 of 4"
      title="Refine the plan with AI"
      description="Pick a goal and diet. The coach compares its plan with the formula baseline; accept it or keep the formula."
    >
      <PlanConfigurator
        profile={profile}
        onProfileChange={(patch) => setProfile((value) => ({ ...value, ...patch }))}
      />
      <div className="border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Your current targets</p>
          {aiActive ? <Badge variant="brand">AI plan</Badge> : <Badge>Formula</Badge>}
        </div>
        <TargetGrid targets={targets} />
      </div>
    </StepContainer>
  );
}

function TargetGrid({ targets }: { targets: ReturnType<typeof calculateTargets> }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <TargetCard label="Calories" value={formatNumber(targets.calories)} unit="kcal" />
      <TargetCard label="Protein" value={formatNumber(targets.proteinG)} unit="g" />
      <TargetCard label="Water" value={(targets.waterMl / 1_000).toFixed(1)} unit="L" />
      <TargetCard label="Steps" value={formatNumber(targets.steps)} unit="/ day" />
    </div>
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
    <div className="flex-1 pb-2 pt-5">
      <p className="page-kicker mb-2">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
      <p className="mb-6 mt-2 max-w-md text-base text-muted-foreground">{description}</p>
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
    <Field label={label}>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          className="pr-16"
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 max-w-14 -translate-y-1/2 truncate text-right text-xs text-subtle-foreground">
          {suffix}
        </span>
      </div>
    </Field>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
      <div role="group" aria-label={label} className="relative grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1">
        {options.map(([option, optionLabel]) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option)}
              className={cn("pressable relative h-9 rounded-sm text-sm font-medium", selected ? "text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {selected && (
                <motion.span
                  layoutId="onboarding-segment"
                  transition={T.layout}
                  className="absolute inset-0 rounded-sm border border-border bg-card"
                />
              )}
              <span className="relative">{optionLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TargetCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <DataTile>
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
      <p className="number-font mt-1 text-2xl font-semibold leading-none">
        {value}
        <span className="ml-1 text-xs font-medium tracking-normal text-subtle-foreground">{unit}</span>
      </p>
    </DataTile>
  );
}
