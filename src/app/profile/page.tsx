"use client";

import { deriveAchievements, healthSourceLabel } from "@bodyfitness/core";
import { ChevronRight, Moon, RotateCcw, Save, Smartphone, Sun } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlanConfigurator } from "@/components/ai/plan-configurator";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { AccountDataControls } from "@/components/profile/account-data-controls";
import { ProfileAuthCard } from "@/components/profile/profile-auth-card";
import { PwaInstallCard } from "@/components/profile/pwa-install-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { SectionHeader, Stat } from "@/components/ui/section-header";
import { Switch } from "@/components/ui/switch";
import { recommendedActivityMultiplier } from "@/lib/calculations";
import { clerkEnabled } from "@/lib/cloud-sync";
import { localDateKey } from "@/lib/date";
import { useBodyFitnessStore } from "@/lib/store";
import type { OccupationActivity, ThemePreference, UserProfile } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

const appearanceOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Smartphone },
];

type AiEngine = { state: "loading" } | { state: "ready"; model: string; provider: string } | { state: "unconfigured" };

export default function ProfilePage() {
  const profile = useBodyFitnessStore((state) => state.profile);
  const account = useBodyFitnessStore((state) => state.account);
  const targets = useBodyFitnessStore((state) => state.targets);
  const targetsSource = useBodyFitnessStore((state) => state.targetsSource);
  const aiPlan = useBodyFitnessStore((state) => state.aiPlan);
  const daily = useBodyFitnessStore((state) => state.dailyByDate[localDateKey()]);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const themePreference = useBodyFitnessStore((state) => state.themePreference);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const recalculateTargets = useBodyFitnessStore((state) => state.recalculateTargets);
  const setAccountProfile = useBodyFitnessStore((state) => state.setAccountProfile);
  const setRestDefaults = useBodyFitnessStore((state) => state.setRestDefaults);
  const setSharingDefaults = useBodyFitnessStore((state) => state.setSharingDefaults);
  const setThemePreference = useBodyFitnessStore((state) => state.setThemePreference);
  const resetAll = useBodyFitnessStore((state) => state.resetAll);
  const { showToast } = useAppChrome();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [identityDraft, setIdentityDraft] = useState(account.profile);
  const [sharingDraft, setSharingDraft] = useState(account.sharingDefaults);
  const [restDraft, setRestDraft] = useState(restDefaults);
  const [aiEngine, setAiEngine] = useState<AiEngine>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { ai?: { configured?: boolean; model?: string; provider?: string } } | null) => {
        if (cancelled) return;
        if (payload?.ai?.configured && payload.ai.model && payload.ai.provider) {
          setAiEngine({ state: "ready", model: payload.ai.model, provider: payload.ai.provider });
        } else {
          setAiEngine({ state: "unconfigured" });
        }
      })
      .catch(() => {
        if (!cancelled) setAiEngine({ state: "unconfigured" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const achievements = useMemo(() => deriveAchievements({
    userId: "local",
    date: localDateKey(),
    steps: daily?.steps ?? 0,
    stepTarget: targets.steps,
    currentStepStreak: 0,
    workoutCount: new Set(setLogs.map((log) => log.completedAt.slice(0, 10))).size,
    personalRecords: setLogs.filter((log) => log.isPr).slice(0, 4).map((log) => ({ id: log.id, name: log.exerciseName, achievedAt: log.completedAt })),
  }), [daily?.steps, setLogs, targets.steps]);

  const save = () => {
    const birthDate = identityDraft.birthDate;
    if (birthDate && ageFromBirthDate(birthDate) < 13) {
      showToast("BodyFitness accounts require age 13+");
      return;
    }
    finishOnboarding({ ...draft, activityMultiplier: recommendedActivityMultiplier(draft) });
    setAccountProfile({
      ...identityDraft,
      handle: identityDraft.handle.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24),
    });
    setSharingDefaults(sharingDraft);
    setRestDefaults(restDraft);
    showToast("Profile and privacy updated");
  };

  const reset = () => {
    if (window.confirm("Reset all local BodyFitness data? This cannot be undone.")) resetAll();
  };

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow="Identity, targets and devices"
        title="Profile"
        description={`${identityDraft.displayName} · @${identityDraft.handle} · ${achievements.length} ${achievements.length === 1 ? "win" : "wins"} so far`}
        action={<Button variant="primary" onClick={save}><Save /> Save changes</Button>}
      />

      <div className="grid gap-10 lg:grid-cols-3 lg:gap-x-8">
        <div className="min-w-0 space-y-10 lg:col-span-2">
          <section>
            <SectionHeader index="01" title="Account" caption="Your account, sync status and this device. Everything also works offline." />
            <div className="grid gap-4 md:grid-cols-2 md:gap-6">
              <ProfileAuthCard enabled={clerkEnabled} />
              <PwaInstallCard />
            </div>
          </section>

          <section>
            <SectionHeader
              index="02"
              title="Targets"
              caption={targetsSource === "ai" ? "Set by the AI coach from your profile and goal." : "Derived from your body profile with the Mifflin-St Jeor formula."}
              action={targetsSource === "ai" ? <Badge variant="brand">AI plan</Badge> : <Badge>Formula</Badge>}
            />
            <Card>
              <CardContent className="pt-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                  <Stat label="Calories" value={formatNumber(targets.calories)} unit="kcal" />
                  <Stat label="Protein" value={formatNumber(targets.proteinG)} unit="g" />
                  <Stat label="Carbs" value={formatNumber(targets.carbsG)} unit="g" />
                  <Stat label="Fat" value={formatNumber(targets.fatG)} unit="g" />
                  <Stat label="Water" value={(targets.waterMl / 1_000).toFixed(1)} unit="L" />
                  <Stat label="Steps" value={formatNumber(targets.steps)} unit="/ day" />
                </div>
                {aiPlan ? (
                  <div className="mt-6 border-t border-border pt-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">
                        Expected {aiPlan.expectedWeeklyChangeKg > 0 ? "+" : ""}{aiPlan.expectedWeeklyChangeKg.toFixed(2)} kg / week
                      </Badge>
                      <Badge variant="outline">{aiPlan.model}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Generated {new Date(aiPlan.generatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    {aiPlan.rationale.length ? (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Why these numbers</p>
                        <ul className="space-y-1.5 text-sm leading-relaxed">
                          {aiPlan.rationale.map((line, index) => (
                            <li key={index} className="flex gap-2">
                              <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                              {line}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" size="sm" onClick={() => { recalculateTargets(); showToast("Targets reset to formula"); }}>
                        <RotateCcw /> Reset to formula
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card className="mt-4 md:mt-6">
              <CardHeader>
                <div>
                  <CardTitle>Configure with AI</CardTitle>
                  <CardDescription>Pick a goal and diet; the coach compares its plan with the formula baseline before anything changes.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <PlanConfigurator profile={profile} />
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader index="03" title="Body profile" caption="Saved values drive the formula targets. The AI plan stays until you reset it." />
            <Card>
              <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
                <Field label="Sex">
                  <Select value={draft.sex} onChange={(event) => setDraft((value) => ({ ...value, sex: event.target.value as UserProfile["sex"] }))}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </Select>
                </Field>
                <SettingNumber label="Age" suffix="years" value={draft.age} onChange={(age) => setDraft((value) => ({ ...value, age }))} />
                <SettingNumber label="Height" suffix="cm" value={draft.heightCm} onChange={(heightCm) => setDraft((value) => ({ ...value, heightCm }))} />
                <Field label="Body fat, optional">
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={5}
                      max={60}
                      placeholder="—"
                      className="pr-10"
                      value={draft.bodyFatPercent ?? ""}
                      onChange={(event) => setDraft((value) => ({ ...value, bodyFatPercent: event.target.value ? Number(event.target.value) : null }))}
                    />
                    <Suffix>%</Suffix>
                  </div>
                </Field>
                <SettingNumber label="Current weight" suffix="kg" value={draft.currentWeightKg} step={0.1} onChange={(currentWeightKg) => setDraft((value) => ({ ...value, currentWeightKg }))} />
                <SettingNumber label="Goal weight" suffix="kg" value={draft.goalWeightKg} step={0.1} onChange={(goalWeightKg) => setDraft((value) => ({ ...value, goalWeightKg }))} />
                <Field label="Workday movement" className="sm:col-span-2">
                  <Select value={draft.occupationActivity} onChange={(event) => setDraft((value) => ({ ...value, occupationActivity: event.target.value as OccupationActivity }))}>
                    <option value="seated">Mostly seated</option>
                    <option value="mixed">A mix of sitting and walking</option>
                    <option value="active">On my feet most of the day</option>
                    <option value="manual">Physical or manual work</option>
                  </Select>
                </Field>
                <SettingNumber label="Average steps" suffix="/ day" value={draft.averageSteps} step={500} onChange={(averageSteps) => setDraft((value) => ({ ...value, averageSteps }))} />
                <SettingNumber label="Training" suffix="days / wk" value={draft.trainingDays} max={7} onChange={(trainingDays) => setDraft((value) => ({ ...value, trainingDays }))} />
                <SettingNumber label="Session length" suffix="min" value={draft.sessionMinutes} step={5} onChange={(sessionMinutes) => setDraft((value) => ({ ...value, sessionMinutes }))} />
                <SettingNumber label="Sleep" suffix="hours" value={draft.sleepHours} step={0.5} onChange={(sleepHours) => setDraft((value) => ({ ...value, sleepHours }))} />
                <div className="sm:col-span-2">
                  <div className="flex items-end justify-between gap-4">
                    <span className="block text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Daily calorie deficit</span>
                    <span className="number-font text-lg font-semibold leading-none">
                      {draft.deficitPercent}
                      <span className="ml-0.5 text-xs font-medium text-subtle-foreground">%</span>
                    </span>
                  </div>
                  <input
                    aria-label="Daily calorie deficit"
                    className="mt-3 w-full accent-brand"
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={draft.deficitPercent}
                    onChange={(event) => setDraft((value) => ({ ...value, deficitPercent: Number(event.target.value) }))}
                  />
                  <div className="mt-1 flex justify-between text-xs text-subtle-foreground">
                    <span>Gentle · 5%</span>
                    <span>Faster · 20%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader index="04" title="Identity" caption="How you appear to people in your Circle. Accounts are 13+." />
            <Card>
              <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
                <Field label="Display name">
                  <Input value={identityDraft.displayName} maxLength={40} onChange={(event) => setIdentityDraft((value) => ({ ...value, displayName: event.target.value }))} />
                </Field>
                <Field label="Handle" hint="Lowercase letters, numbers and underscores.">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-subtle-foreground">@</span>
                    <Input className="pl-7" value={identityDraft.handle} maxLength={24} onChange={(event) => setIdentityDraft((value) => ({ ...value, handle: event.target.value }))} />
                  </div>
                </Field>
                <Field label="Birth date" hint="Used only to confirm you are 13 or older." className="sm:col-span-2">
                  <Input type="date" value={identityDraft.birthDate ?? ""} onChange={(event) => setIdentityDraft((value) => ({ ...value, birthDate: event.target.value || null }))} />
                </Field>
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader index="05" title="Privacy" caption="Defaults for new connections. Weight, meals, location and physique photos are never shared." />
            <Card className="overflow-hidden">
              <PrivacyToggle label="Achievements" detail="Milestones and consistency wins" checked={sharingDraft.achievements} onChange={(achievements) => setSharingDraft((value) => ({ ...value, achievements }))} />
              <PrivacyToggle label="Goal completion" detail="Percent complete without raw values" checked={sharingDraft.goalProgress} onChange={(goalProgress) => setSharingDraft((value) => ({ ...value, goalProgress }))} bordered />
              <PrivacyToggle label="Exact steps" detail="Share the precise daily count" checked={sharingDraft.exactSteps} onChange={(exactSteps) => setSharingDraft((value) => ({ ...value, exactSteps }))} bordered />
              <PrivacyToggle label="Workout summaries" detail="Completed sessions, never set-level detail" checked={sharingDraft.workoutSummaries} onChange={(workoutSummaries) => setSharingDraft((value) => ({ ...value, workoutSummaries }))} bordered />
            </Card>
          </section>

          <section>
            <SectionHeader index="06" title="Circle" caption="Private, mutual sharing with people you trust." />
            <Link href="/profile/circle" className="pressable flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-inherit no-underline transition-colors hover:bg-accent">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold tracking-tight">Manage your Circle</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {account.connections.length ? `${account.connections.length} connected ${account.connections.length === 1 ? "person" : "people"}` : "No connections yet"}
                </p>
              </div>
              {account.circle.pendingInvites ? <Badge variant="warning">{account.circle.pendingInvites} pending</Badge> : null}
              <ChevronRight size={16} className="shrink-0 text-subtle-foreground" aria-hidden="true" />
            </Link>
          </section>
        </div>

        <aside className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <section>
            <SectionHeader index="07" title="System" />
            <Card>
              <CardContent className="space-y-6 pt-5">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Appearance</p>
                  <div role="group" aria-label="Appearance" className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted p-1">
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
                            "pressable flex h-9 items-center justify-center gap-1.5 rounded-sm text-sm font-medium transition-colors",
                            selected ? "border border-border bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon size={14} aria-hidden="true" />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <SettingNumber label="Compound rest" suffix="s" value={restDraft.compound} step={15} onChange={(compound) => setRestDraft((value) => ({ ...value, compound }))} />
                  <SettingNumber label="Isolation rest" suffix="s" value={restDraft.isolation} step={15} onChange={(isolation) => setRestDraft((value) => ({ ...value, isolation }))} />
                </div>

                <dl className="divide-y divide-border border-y border-border text-sm">
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">AI engine</dt>
                    <dd className="min-w-0 truncate text-right font-mono text-xs">
                      {aiEngine.state === "loading" ? "—" : aiEngine.state === "ready" ? `${aiEngine.model} · ${aiEngine.provider}` : "Not configured"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">Step source</dt>
                    <dd className="min-w-0 truncate text-right">{healthSourceLabel(daily?.stepSource ?? null)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">Last health sync</dt>
                    <dd className="min-w-0 truncate text-right">
                      {daily?.stepSyncedAt ? new Date(daily.stepSyncedAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">Apple Health and Health Connect read through the native app. The web app supports manual and cloud-synced steps.</p>

                <Button variant="primary" block onClick={save}><Save /> Save changes</Button>
                <AccountDataControls enabled={clerkEnabled} />
                <Button variant="outline" block onClick={reset} className="text-destructive hover:text-destructive">
                  <RotateCcw /> Reset local data
                </Button>
              </CardContent>
            </Card>
          </section>
        </aside>
      </div>
    </main>
  );
}

function Suffix({ children }: { children: React.ReactNode }) {
  return <span className="pointer-events-none absolute right-3 top-1/2 max-w-14 -translate-y-1/2 truncate text-right text-xs text-subtle-foreground">{children}</span>;
}

function SettingNumber({ label, suffix, value, step = 1, max, onChange }: { label: string; suffix: string; value: number; step?: number; max?: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <div className="relative">
        <Input type="number" inputMode="decimal" className="pr-16" value={value} step={step} min={0} max={max} onChange={(event) => onChange(Number(event.target.value))} />
        <Suffix>{suffix}</Suffix>
      </div>
    </Field>
  );
}

function PrivacyToggle({ label, detail, checked, onChange, bordered = false }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void; bordered?: boolean }) {
  return (
    <div className={cn("flex min-h-16 items-center gap-4 px-5 py-3", bordered && "border-t border-border")}>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={`Share ${label}`} />
    </div>
  );
}

function ageFromBirthDate(value: string) {
  const birth = new Date(`${value}T12:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}
