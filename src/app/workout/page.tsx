"use client";

import { motion } from "framer-motion";
import { Activity, BarChart3, Check, Pencil, Play, Square, TimerReset, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { LargeTitle } from "@/components/large-title";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { WorkoutEditorSheet } from "@/components/workout/workout-editor-sheet";
import { useAppChrome } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, DataTile } from "@/components/ui/card";
import { EmptyState, SectionHeader } from "@/components/ui/section-header";
import { T } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";
import {
  activeSession,
  averageSessionMinutes,
  restAdherence,
  sessionVolumeKg,
  weeklyCycle,
} from "@/lib/training-metrics";
import { cn, formatNumber } from "@/lib/utils";
import type { WorkoutDay } from "@/lib/types";

export default function WorkoutPage() {
  const plan = useBodyFitnessStore((state) => state.workoutPlan);
  const setWorkoutPlan = useBodyFitnessStore((state) => state.setWorkoutPlan);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const sessions = useBodyFitnessStore((state) => state.sessions);
  const activeSessionId = useBodyFitnessStore((state) => state.activeSessionId);
  const startSession = useBodyFitnessStore((state) => state.startSession);
  const finishSession = useBodyFitnessStore((state) => state.finishSession);
  const closeStaleSessions = useBodyFitnessStore((state) => state.closeStaleSessions);
  const [selectedDayId, setSelectedDayId] = useState(plan[0]?.id ?? "");
  const [editorOpen, setEditorOpen] = useState(false);
  const { showToast } = useAppChrome();
  const selectedDay = plan.find((day) => day.id === selectedDayId) ?? plan[0];

  useEffect(() => {
    closeStaleSessions();
  }, [closeStaleSessions]);

  const cycle = useMemo(() => weeklyCycle(sessions, plan), [plan, sessions]);
  const averageMinutes = useMemo(() => averageSessionMinutes(sessions), [sessions]);
  const rest = useMemo(() => restAdherence(setLogs), [setLogs]);
  const current = useMemo(() => activeSession(sessions, activeSessionId), [activeSessionId, sessions]);
  const prCount = setLogs.filter((log) => log.isPr).length;
  const onPace = cycle.planned > 0 && cycle.completed >= Math.ceil(cycle.planned * 0.6);

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow="Training"
        title="Training Lab"
        description="Pick a day, log sets, and let the week keep score."
        action={
          <Button variant="secondary" onClick={() => setEditorOpen(true)} aria-label="Edit workout split">
            <Pencil />
            <span className="hidden sm:inline">Edit split</span>
          </Button>
        }
      />

      {/*
        < md : one column — day strip, session, exercises, protocol, signals.
        md   : sticky day list left; session above the exercises, protocol + signals paired below.
        lg   : session, protocol and signals collapse into a sticky right rail.
        The rail is `display: contents` below `lg`, so its children are placed as grid items directly.
      */}
      <div className="grid min-w-0 gap-6 md:grid-cols-[240px_minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)_320px] lg:gap-8">
        <DayNav
          plan={plan}
          selectedId={selectedDay?.id}
          trainedIds={cycle.completedDayIds}
          onSelect={setSelectedDayId}
          onAdd={() => setEditorOpen(true)}
        />

        <section className="order-3 min-w-0 md:order-none md:col-span-2 md:col-start-2 md:row-start-2 lg:col-span-1 lg:row-start-1 lg:row-span-2">
          {selectedDay ? (
            <>
              <SectionHeader
                index="01"
                title={selectedDay.name}
                caption={`${selectedDay.exercises.length} ${selectedDay.exercises.length === 1 ? "movement" : "movements"} · open a module to log sets`}
              />
              {selectedDay.exercises.length ? (
                <div className="flex flex-col gap-4">
                  {selectedDay.exercises.map((exercise, index) => (
                    <ExerciseCard key={exercise.id} exercise={exercise} dayId={selectedDay.id} index={index} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No exercises on this day"
                  body="Add movements in the split editor to start logging."
                  action={<Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}><Pencil /> Edit split</Button>}
                />
              )}
            </>
          ) : (
            <>
              <SectionHeader index="01" title="Protocol" caption="Your training split is empty." />
              <EmptyState
                title="No training days yet"
                body="Create your first day and the week will start keeping score."
                action={<Button variant="primary" size="sm" onClick={() => setEditorOpen(true)}><Pencil /> Build split</Button>}
              />
            </>
          )}
        </section>

        <aside className="contents lg:sticky lg:top-8 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:flex lg:flex-col lg:gap-6 lg:self-start">
          <div className="order-2 min-w-0 md:order-none md:col-span-2 md:col-start-2 md:row-start-1">
            {selectedDay ? (
              <SessionStrip
                key={current?.id ?? "idle"}
                session={current}
                setLogs={setLogs}
                dayName={selectedDay.name}
                onStart={() => {
                  if (startSession(selectedDay.id)) showToast(`${selectedDay.name} session started`);
                }}
                onFinish={() => {
                  finishSession();
                  showToast("Session finished");
                }}
              />
            ) : (
              <Card className="h-full">
                <CardHeader><CardTitle>Session</CardTitle></CardHeader>
                <CardContent>
                  <p className="number-font text-4xl font-semibold leading-none text-faint-foreground">—</p>
                  <p className="mt-2 text-xs text-muted-foreground">Add a training day to time a session.</p>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="order-4 min-w-0 md:order-none md:col-start-2 md:row-start-3">
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Weekly protocol</CardTitle>
                <CardDescription>Plan days trained this week</CardDescription>
              </div>
              {cycle.completed > 0 ? (
                <Badge variant={onPace ? "success" : "warning"}><Activity size={11} /> {onPace ? "On pace" : "Behind"}</Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-4">
                <p className="number-font text-4xl font-semibold leading-none">
                  {cycle.planned > 0 ? String(cycle.completed).padStart(2, "0") : "—"}
                  {cycle.planned > 0 ? <span className="ml-1 text-lg font-medium tracking-normal text-subtle-foreground">/{String(cycle.planned).padStart(2, "0")}</span> : null}
                </p>
                <div className="text-right">
                  <p className="number-font text-2xl font-semibold leading-none">
                    {averageMinutes === null ? "—" : averageMinutes}
                    {averageMinutes !== null ? <span className="ml-1 text-xs font-medium tracking-normal text-subtle-foreground">min</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{averageMinutes === null ? "no finished sessions" : "avg session"}</p>
                </div>
              </div>
              {plan.length ? (
                <div className="mt-5 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.max(1, plan.length)}, minmax(0, 1fr))` }}>
                  {plan.map((day) => {
                    const trained = cycle.completedDayIds.includes(day.id);
                    return (
                      <div key={day.id} className="min-w-0 space-y-1.5 text-center">
                        <span className={cn("block h-1 rounded-full", trained ? "bg-data-1" : "bg-data-4")} />
                        <span className="block truncate text-xs uppercase tracking-[0.04em] text-subtle-foreground">{day.name.slice(0, 3)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-xs text-muted-foreground">Add a training day to track the week.</p>
              )}
            </CardContent>
          </Card>

          <Card className="order-5 min-w-0 md:order-none md:col-start-3 md:row-start-3">
            <CardHeader>
              <div>
                <CardTitle>Training signals</CardTitle>
                <CardDescription>Feedback without dashboard noise</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Insight
                  icon={<Trophy size={14} className="text-success" />}
                  label="PR output"
                  value={setLogs.length ? String(prCount) : "—"}
                  note={setLogs.length ? (prCount === 1 ? "set" : "sets") : "no sets logged"}
                />
                <Insight
                  icon={<TimerReset size={14} />}
                  label="Rest control"
                  value={rest.score === null ? "—" : String(rest.score)}
                  note={rest.score === null ? `${rest.observations} of 3 rests` : "% on target"}
                />
              </div>
            </CardContent>
            <CardFooter className="gap-3">
              <BarChart3 size={14} className="shrink-0 text-subtle-foreground" />
              <p className="text-xs text-muted-foreground">
                {rest.medianSeconds === null
                  ? "A PR requires a 1%+ e1RM improvement over the same set."
                  : `Median rest ${formatDuration(rest.medianSeconds)} across ${rest.observations} measured rests.`}
              </p>
            </CardFooter>
          </Card>
        </aside>
      </div>

      <WorkoutEditorSheet key={editorOpen ? "editor-open" : "editor-closed"} open={editorOpen} onOpenChange={setEditorOpen} plan={plan} onSave={(next) => { setWorkoutPlan(next); showToast("Training protocol updated"); }} />
    </main>
  );
}

/** Horizontal chip strip below `md`; a vertical, sticky day list from `md` up. */
function DayNav({
  plan,
  selectedId,
  trainedIds,
  onSelect,
  onAdd,
}: {
  plan: WorkoutDay[];
  selectedId: string | undefined;
  trainedIds: string[];
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <nav
      aria-label="Training days"
      className="order-1 min-w-0 md:order-none md:col-start-1 md:row-start-1 md:row-span-3 md:self-start md:sticky md:top-8"
    >
      <p className="hidden text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground md:mb-3 md:block">Days</p>
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0 md:pb-0">
        {plan.map((day, index) => {
          const active = day.id === selectedId;
          const trained = trainedIds.includes(day.id);
          return (
            <button
              key={day.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(day.id)}
              className={cn(
                "pressable relative flex min-w-[132px] shrink-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors md:w-full md:min-w-0",
                active ? "border-border text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? <motion.span layoutId="workout-day" transition={T.layout} className="absolute inset-0 rounded-lg bg-accent" /> : null}
              <span className="number-font relative font-mono text-xs text-subtle-foreground">{String(index + 1).padStart(2, "0")}</span>
              <span className="relative min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{day.name}</span>
                <span className="number-font mt-0.5 hidden text-xs text-subtle-foreground md:block">
                  {day.exercises.length} {day.exercises.length === 1 ? "exercise" : "exercises"}
                </span>
              </span>
              {trained ? (
                <span className="relative flex items-center text-success" title="Trained this week">
                  <Check size={14} aria-hidden />
                  <span className="sr-only">Trained this week</span>
                </span>
              ) : null}
            </button>
          );
        })}
        {!plan.length ? (
          <Button variant="outline" size="sm" onClick={onAdd} className="shrink-0 md:w-full">Add a day</Button>
        ) : null}
      </div>
    </nav>
  );
}

function SessionStrip({
  session,
  setLogs,
  dayName,
  onStart,
  onFinish,
}: {
  session: ReturnType<typeof activeSession>;
  setLogs: ReturnType<typeof useBodyFitnessStore.getState>["setLogs"];
  dayName: string;
  onStart: () => void;
  onFinish: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [session]);

  if (!session) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Session</CardTitle>
            <CardDescription>Timing a session records its real duration.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="number-font text-4xl font-semibold leading-none text-faint-foreground">0:00</p>
          <Button variant="primary" size="md" onClick={onStart} className="mt-4 w-full sm:w-auto md:w-full">
            <Play /> Start {dayName}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const elapsed = Math.max(0, Math.floor((now - Date.parse(session.startedAt)) / 1_000));
  const completed = setLogs.filter((log) => log.sessionId === session.id).length;
  const volume = sessionVolumeKg(session.id, setLogs);

  return (
    <Card className="h-full">
      <CardHeader>
        <p className="flex items-center gap-1.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-brand">
          <Activity size={12} aria-hidden /> Live · {session.dayName}
        </p>
      </CardHeader>
      <CardContent>
        <p className="number-font text-4xl font-semibold leading-none" aria-live="off">{formatDuration(elapsed)}</p>
        <p className="number-font mt-2 text-xs text-muted-foreground">
          {completed} {completed === 1 ? "set" : "sets"} · {formatNumber(Math.round(volume))} <span className="text-subtle-foreground">kg volume</span>
        </p>
        <Button variant="secondary" size="sm" onClick={onFinish} className="mt-4">
          <Square /> Finish
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Insight({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <DataTile className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className="number-font mt-2 text-2xl font-semibold leading-none">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{note}</p>
    </DataTile>
  );
}
