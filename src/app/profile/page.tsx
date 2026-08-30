"use client";

import { deriveAchievements, healthSourceLabel } from "@bodyfitness/core";
import { Bell, ChevronRight, Database, HeartHandshake, Moon, RotateCcw, Save, ShieldCheck, Smartphone, Sun, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LargeTitle } from "@/components/large-title";
import { ProfileAuthCard } from "@/components/profile/profile-auth-card";
import { AccountDataControls } from "@/components/profile/account-data-controls";
import { PwaInstallCard } from "@/components/profile/pwa-install-card";
import { useAppChrome } from "@/components/app-shell";
import { clerkEnabled } from "@/lib/cloud-sync";
import { localDateKey } from "@/lib/date";
import { useBodyFitnessStore } from "@/lib/store";
import type { ThemePreference, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const appearanceOptions: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Auto", icon: Smartphone },
];

export default function ProfilePage() {
  const profile = useBodyFitnessStore((state) => state.profile);
  const account = useBodyFitnessStore((state) => state.account);
  const targets = useBodyFitnessStore((state) => state.targets);
  const daily = useBodyFitnessStore((state) => state.dailyByDate[localDateKey()]);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const themePreference = useBodyFitnessStore((state) => state.themePreference);
  const restDefaults = useBodyFitnessStore((state) => state.restDefaults);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
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
    finishOnboarding(draft);
    setAccountProfile({
      ...identityDraft,
      handle: identityDraft.handle.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 24),
    });
    setSharingDefaults(sharingDraft);
    setRestDefaults(restDraft);
    showToast("Profile and privacy updated");
  };

  return (
    <main className="page-shell">
      <LargeTitle eyebrow="Identity, privacy and devices" title="Profile" action={<span className="profile-button"><UserRound size={21} /></span>} />

      <ProfileAuthCard enabled={clerkEnabled} />

      <section className="mt-8">
        <SectionLabel index="01">Your signal</SectionLabel>
        <div className="panel p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent-strong)]"><UserRound size={27} /></span>
            <div className="min-w-0 flex-1"><p className="m-0 truncate text-lg font-black">{identityDraft.displayName}</p><p className="mt-1 text-[11px] text-white/38">@{identityDraft.handle}</p></div>
            <span className="status-chip text-[var(--protein)]">{achievements.length} wins</span>
          </div>
          <div className="mt-4 grid grid-cols-3 border-t border-[var(--border)] pt-3 text-center">
            <ProfileStat value={`${draft.currentWeightKg.toFixed(1)} kg`} label="Current" />
            <ProfileStat value={`${draft.goalWeightKg.toFixed(1)} kg`} label="Goal" bordered />
            <ProfileStat value={`${draft.trainingDays} days`} label="Training" bordered />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel index="02">Friends & family</SectionLabel>
        <Link href="/profile/circle" className="panel pressable flex min-h-[86px] items-center gap-3 px-4 text-inherit no-underline">
          <span className="icon-tile text-[var(--accent-strong)]"><HeartHandshake size={19} /></span>
          <div className="min-w-0 flex-1"><p className="m-0 text-sm font-black">Circle</p><p className="mt-1 text-[10px] text-white/38">{account.connections.length ? `${account.connections.length} connected people` : "Private mutual sharing"}</p></div>
          {account.circle.pendingInvites ? <span className="status-chip text-[var(--warning)]">{account.circle.pendingInvites} pending</span> : null}
          <ChevronRight size={16} className="text-white/25" />
        </Link>
      </section>

      <section className="mt-8">
        <SectionLabel index="03">Health integration</SectionLabel>
        <div className="panel p-4">
          <div className="flex items-start gap-3">
            <span className="icon-tile text-[var(--steps)]"><Database size={18} /></span>
            <div className="min-w-0 flex-1"><p className="m-0 text-sm font-black">{healthSourceLabel(daily?.stepSource ?? null)}</p><p className="mt-1 text-[10px] leading-4 text-white/38">{daily?.stepSyncedAt ? `Updated ${new Date(daily.stepSyncedAt).toLocaleString()}` : "Install the native app to read Apple Health or Health Connect. The web app supports manual and cloud-synced steps."}</p></div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <IntegrationBadge label="iPhone" detail="Apple Health" />
            <IntegrationBadge label="Android" detail="Health Connect" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel index="04">Identity & age</SectionLabel>
        <div className="panel grid grid-cols-2 gap-3 p-4">
          <TextField label="Display name" value={identityDraft.displayName} onChange={(displayName) => setIdentityDraft((value) => ({ ...value, displayName }))} />
          <TextField label="Handle" value={identityDraft.handle} prefix="@" onChange={(handle) => setIdentityDraft((value) => ({ ...value, handle }))} />
          <label className="col-span-2"><span className="mb-1.5 block text-[10px] font-bold text-white/35">Birth date · accounts are 13+</span><input className="ios-field min-h-11 text-sm font-bold" type="date" value={identityDraft.birthDate ?? ""} onChange={(event) => setIdentityDraft((value) => ({ ...value, birthDate: event.target.value || null }))} /></label>
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel index="05">Body profile</SectionLabel>
        <div className="panel grid grid-cols-2 gap-3 p-4">
          <SettingNumber label="Current weight" suffix="kg" value={draft.currentWeightKg} step={0.1} onChange={(currentWeightKg) => setDraft((value) => ({ ...value, currentWeightKg }))} />
          <SettingNumber label="Goal weight" suffix="kg" value={draft.goalWeightKg} step={0.1} onChange={(goalWeightKg) => setDraft((value) => ({ ...value, goalWeightKg }))} />
          <SettingNumber label="Height" suffix="cm" value={draft.heightCm} onChange={(heightCm) => setDraft((value) => ({ ...value, heightCm }))} />
          <SettingNumber label="Training" suffix="days / wk" value={draft.trainingDays} max={7} onChange={(trainingDays) => setDraft((value) => ({ ...value, trainingDays }))} />
        </div>
      </section>

      <section className="mt-8">
        <SectionLabel index="06">Privacy defaults</SectionLabel>
        <div className="panel overflow-hidden">
          <PrivacyToggle label="Achievements" detail="Milestones and consistency wins" checked={sharingDraft.achievements} onChange={(achievements) => setSharingDraft((value) => ({ ...value, achievements }))} />
          <PrivacyToggle label="Goal completion" detail="Percent complete without raw values" checked={sharingDraft.goalProgress} onChange={(goalProgress) => setSharingDraft((value) => ({ ...value, goalProgress }))} bordered />
          <PrivacyToggle label="Exact steps" detail="Share the precise daily count" checked={sharingDraft.exactSteps} onChange={(exactSteps) => setSharingDraft((value) => ({ ...value, exactSteps }))} bordered />
          <PrivacyToggle label="Workout summaries" detail="Completed sessions, never set-level detail" checked={sharingDraft.workoutSummaries} onChange={(workoutSummaries) => setSharingDraft((value) => ({ ...value, workoutSummaries }))} bordered />
        </div>
        <p className="px-2 text-[10px] leading-4 text-white/32">Weight, meals, nutrition details, location and physique photos are never shared by default.</p>
      </section>

      <section className="mt-8">
        <SectionLabel index="07">System</SectionLabel>
        <div className="segmented-control grid grid-cols-3 gap-1 p-1">
          {appearanceOptions.map((option) => { const Icon = option.icon; const selected = option.value === themePreference; return <button key={option.value} type="button" aria-pressed={selected} onClick={() => setThemePreference(option.value)} className={cn("pressable flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] text-[11px] font-bold text-white/45", selected && "segmented-selected")}><Icon size={15} />{option.label}</button>; })}
        </div>
        <div className="panel mt-3 grid grid-cols-2 gap-3 p-4">
          <SettingNumber label="Compound rest" suffix="seconds" value={restDraft.compound} step={15} onChange={(compound) => setRestDraft((value) => ({ ...value, compound }))} />
          <SettingNumber label="Isolation rest" suffix="seconds" value={restDraft.isolation} step={15} onChange={(isolation) => setRestDraft((value) => ({ ...value, isolation }))} />
        </div>
        <PwaInstallCard />
        <button onClick={save} className="primary-action pressable mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-[15px] text-sm font-black"><Save size={17} /> Save profile</button>
        <AccountDataControls enabled={clerkEnabled} />
        <button onClick={() => { if (window.confirm("Reset all local BodyFitness data? This cannot be undone.")) resetAll(); }} className="pressable mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-sm font-bold text-[var(--danger)]"><RotateCcw size={16} /> Reset local data</button>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <InfoTile icon={<ShieldCheck size={17} />} title="Private by default" detail="Mutual connections only" />
        <InfoTile icon={<Bell size={17} />} title="Quiet notifications" detail="Invites and achievements" />
      </div>
    </main>
  );
}

function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) { return <div className="mb-3 flex items-center gap-2 px-1"><span className="section-index">{index}</span><span className="section-rule" /><h2 className="m-0 text-[17px] font-black tracking-[-0.03em]">{children}</h2></div>; }
function ProfileStat({ value, label, bordered = false }: { value: string; label: string; bordered?: boolean }) { return <div className={bordered ? "border-l border-[var(--border)]" : ""}><p className="number-font m-0 text-sm font-black">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[0.07em] text-white/28">{label}</p></div>; }
function IntegrationBadge({ label, detail }: { label: string; detail: string }) { return <div className="data-tile p-3"><p className="m-0 text-[10px] font-black">{label}</p><p className="mt-1 text-[9px] text-white/35">{detail}</p></div>; }
function TextField({ label, value, prefix, onChange }: { label: string; value: string; prefix?: string; onChange: (value: string) => void }) { return <label><span className="mb-1.5 block text-[10px] font-bold text-white/35">{label}</span><div className="relative">{prefix ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/28">{prefix}</span> : null}<input className={cn("ios-field min-h-11 text-sm font-bold", prefix && "pl-7")} value={value} onChange={(event) => onChange(event.target.value)} /></div></label>; }
function SettingNumber({ label, suffix, value, step = 1, max, onChange }: { label: string; suffix: string; value: number; step?: number; max?: number; onChange: (value: number) => void }) { return <label><span className="mb-1.5 block text-[10px] font-bold text-white/35">{label}</span><div className="relative"><input className="ios-field number-font min-h-11 pr-12 text-base font-bold" type="number" inputMode="decimal" value={value} step={step} max={max} onChange={(event) => onChange(Number(event.target.value))} /><span className="pointer-events-none absolute right-3 top-1/2 max-w-10 -translate-y-1/2 text-right text-[8px] font-bold leading-3 text-white/28">{suffix}</span></div></label>; }
function PrivacyToggle({ label, detail, checked, onChange, bordered = false }: { label: string; detail: string; checked: boolean; onChange: (checked: boolean) => void; bordered?: boolean }) { return <div className={cn("flex min-h-[70px] items-center gap-3 px-4", bordered && "border-t border-[var(--border)]")}><div className="min-w-0 flex-1"><p className="m-0 text-xs font-black">{label}</p><p className="mt-1 text-[9px] text-white/35">{detail}</p></div><button role="switch" aria-checked={checked} aria-label={`Share ${label}`} onClick={() => onChange(!checked)} className={cn("relative h-8 w-[52px] rounded-[11px] p-0.5 transition-colors", checked ? "bg-[var(--success)]" : "toggle-off")}><span className={cn("block h-7 w-7 rounded-[9px] bg-white shadow transition-transform", checked && "translate-x-5")} /></button></div>; }
function InfoTile({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="panel p-4"><span className="text-[var(--accent-strong)]">{icon}</span><p className="mb-0 mt-3 text-[11px] font-black">{title}</p><p className="mb-0 mt-1 text-[9px] text-white/32">{detail}</p></div>; }
function ageFromBirthDate(value: string) { const birth = new Date(`${value}T12:00:00`); const today = new Date(); let age = today.getFullYear() - birth.getFullYear(); const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()); if (beforeBirthday) age -= 1; return age; }
