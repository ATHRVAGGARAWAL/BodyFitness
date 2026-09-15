"use client";

import { Camera, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { MetricEntrySheet } from "@/components/metric-entry-sheet";
import { AddPhysiqueSheet } from "@/components/progress/add-physique-sheet";
import { PhysiqueGallery } from "@/components/progress/physique-gallery";
import { ProgressChart } from "@/components/progress/progress-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/input";
import { SectionHeader, Stat } from "@/components/ui/section-header";
import { demoProgress } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import {
  bodySignal,
  bodySignalCopy,
  buildProgressSeries,
  formatDelta,
  strengthDeltaPercent,
  weightDelta,
  type Delta,
} from "@/lib/training-metrics";

export default function ProgressPage() {
  const profile = useBodyFitnessStore((state) => state.profile);
  const weightEntries = useBodyFitnessStore((state) => state.weightEntries);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const workoutPlan = useBodyFitnessStore((state) => state.workoutPlan);
  const selectedLiftId = useBodyFitnessStore((state) => state.selectedLiftId);
  const setSelectedLiftId = useBodyFitnessStore((state) => state.setSelectedLiftId);
  const addWeightEntry = useBodyFitnessStore((state) => state.addWeightEntry);
  const finishOnboarding = useBodyFitnessStore((state) => state.finishOnboarding);
  const physiqueWeeks = useBodyFitnessStore((state) => state.physiqueWeeks);
  const [weightOpen, setWeightOpen] = useState(false);
  const [physiqueOpen, setPhysiqueOpen] = useState(false);
  const { showToast } = useAppChrome();

  const compoundLifts = useMemo(() => {
    const unique = new Map<string, string>();
    workoutPlan.flatMap((day) => day.exercises).filter((exercise) => exercise.type === "compound").forEach((exercise) => unique.set(exercise.id, exercise.name));
    return [...unique.entries()].map(([id, name]) => ({ id, name }));
  }, [workoutPlan]);
  const selectedLift = compoundLifts.find((lift) => lift.id === selectedLiftId) ?? compoundLifts[0];
  const usingDemo = !weightEntries.length && !setLogs.length;
  const chartData = useMemo(
    () => (usingDemo ? demoProgress() : buildProgressSeries(weightEntries, setLogs, selectedLift?.id)),
    [selectedLift?.id, setLogs, usingDemo, weightEntries],
  );
  const massDelta = useMemo(() => weightDelta(weightEntries), [weightEntries]);
  const strengthDelta = useMemo(() => strengthDeltaPercent(setLogs, selectedLift?.id), [selectedLift?.id, setLogs]);
  const signal = bodySignal(massDelta, strengthDelta);
  const latestWeight = weightEntries[0]?.weightKg ?? profile.currentWeightKg;
  const latestStrength = setLogs
    .filter((log) => log.exerciseId === selectedLift?.id)
    .reduce((best, log) => Math.max(best, log.e1rm), 0);
  const shouldRecalculate = Boolean(weightEntries[0] && Math.abs(latestWeight - profile.currentWeightKg) / profile.currentWeightKg >= 0.02);

  return (
    <main className="page-shell">
      <LargeTitle
        eyebrow="Longitudinal body data"
        title="Progress"
        description="Body mass against strength, week by week. Gaps stay gaps."
        action={<Button variant="secondary" onClick={() => setWeightOpen(true)}><Plus /> Log weight</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <section>
            <SectionHeader index="01" title="Body × strength" caption="Twelve weeks. Weekly average body mass and best estimated 1RM." action={usingDemo ? <Badge>Sample data</Badge> : null} />
            <ProgressChart data={chartData} liftName={selectedLift?.name} />

            <Card className="mt-4">
              <CardContent className="grid grid-cols-2 gap-x-4 gap-y-6 pt-5 sm:grid-cols-4">
                <Stat
                  label="Body mass"
                  value={latestWeight.toFixed(1)}
                  unit="kg"
                  hint={weightEntries[0] ? "Latest entry" : "From your profile"}
                />
                <Stat
                  label={`${selectedLift?.name ?? "Lift"} e1RM`}
                  value={latestStrength ? latestStrength.toFixed(1) : "—"}
                  unit={latestStrength ? "kg" : undefined}
                  tone={latestStrength ? "brand" : "default"}
                  hint={latestStrength ? "Best logged set" : "Log a set of this lift"}
                />
                <DeltaStat label="Mass change" delta={massDelta} unit="kg" formatted={formatDelta(massDelta, " kg")} emptyHint="Log twice to see a trend" />
                <DeltaStat label="Strength change" delta={strengthDelta} unit="%" formatted={formatDelta(strengthDelta, "%")} emptyHint="Train it twice to see a trend" />
              </CardContent>
            </Card>
          </section>

          <section className="mt-10">
            <SectionHeader
              index="02"
              title="Physique timeline"
              caption="Repeatable angles. Honest comparison."
              action={<Button variant="secondary" size="sm" onClick={() => setPhysiqueOpen(true)} aria-label="Add physique check-in"><Camera /> Add check-in</Button>}
            />
            <PhysiqueGallery entries={physiqueWeeks} onAdd={() => setPhysiqueOpen(true)} />
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Strength series</CardTitle>
                <CardDescription>The compound lift drawn in the chart and used for the strength signal.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Field label="Lift">
                <Select aria-label="Select strength lift" value={selectedLift?.id ?? ""} onChange={(event) => setSelectedLiftId(event.target.value)} disabled={!compoundLifts.length}>
                  {compoundLifts.length ? compoundLifts.map((lift) => <option key={lift.id} value={lift.id}>{lift.name}</option>) : <option value="">No compound lifts in your plan</option>}
                </Select>
              </Field>
            </CardContent>
          </Card>

          {shouldRecalculate && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2"><Sparkles size={16} className="text-brand" /> Target review</CardTitle>
                  <CardDescription>
                    Your weight moved at least 2% from the value your targets were built on. Recalculate using <span className="number-font text-foreground">{latestWeight.toFixed(1)}</span> kg?
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="primary" block onClick={() => { finishOnboarding({ ...profile, currentWeightKg: latestWeight }); showToast("Targets recalculated"); }}>Recalculate targets</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Body signal</CardTitle>
                <CardDescription>Direction of body mass read against direction of strength.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {signal ? (
                <>
                  <p className="text-base font-medium">{bodySignalCopy[signal].title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{bodySignalCopy[signal].detail}</p>
                </>
              ) : (
                <>
                  <p className="number-font text-3xl font-semibold leading-none text-muted-foreground">—</p>
                  <p className="mt-2 text-xs text-muted-foreground">Needs two weigh-ins and two sessions of the selected lift.</p>
                </>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

      <MetricEntrySheet open={weightOpen} onOpenChange={setWeightOpen} title="Log body weight" value={latestWeight} unit="kg" onSave={(weight) => { addWeightEntry(weight); showToast("Weight logged"); }} />
      <AddPhysiqueSheet key={physiqueOpen ? "physique-open" : "physique-closed"} open={physiqueOpen} onOpenChange={setPhysiqueOpen} />
    </main>
  );
}

/** Signed change with its span; an honest dash and hint until two measurements exist. */
function DeltaStat({ label, delta, unit, formatted, emptyHint }: { label: string; delta: Delta; unit: string; formatted: string | null; emptyHint: string }) {
  if (delta.value === null || !formatted) {
    return <Stat label={label} value="—" tone="muted" hint={emptyHint} />;
  }
  const sign = delta.value > 0 ? "+" : delta.value < 0 ? "−" : "";
  return <Stat label={label} value={`${sign}${Math.abs(delta.value)}`} unit={unit} hint={`Over ${formatted.split(" / ")[1] ?? formatted}`} />;
}
