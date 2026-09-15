"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Check, RefreshCw, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AiClientError, requestCoachReview } from "@/lib/ai/client";
import { buildCoachRequest, hasEnoughForReview } from "@/lib/ai/coach-request";
import { localDateKey } from "@/lib/date";
import { fadeRise, T } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Weekly AI review. Builds the request from the last 7 days in the store, calls
 * `/api/ai/coach`, and persists the insight so it is shown once per day.
 */
export function CoachCard({ className }: { className?: string }) {
  const profile = useBodyFitnessStore((state) => state.profile);
  const targets = useBodyFitnessStore((state) => state.targets);
  const meals = useBodyFitnessStore((state) => state.meals);
  const dailyByDate = useBodyFitnessStore((state) => state.dailyByDate);
  const sessions = useBodyFitnessStore((state) => state.sessions);
  const setLogs = useBodyFitnessStore((state) => state.setLogs);
  const weightEntries = useBodyFitnessStore((state) => state.weightEntries);
  const coach = useBodyFitnessStore((state) => state.coach);
  const setCoach = useBodyFitnessStore((state) => state.setCoach);
  const adjustTargets = useBodyFitnessStore((state) => state.adjustTargets);
  const { showToast } = useAppChrome();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const today = localDateKey();
  const request = useMemo(
    () => buildCoachRequest({ profile, targets, meals, dailyByDate, sessions, setLogs, weightEntries }, 7, today),
    [dailyByDate, meals, profile, sessions, setLogs, targets, today, weightEntries],
  );
  const ready = hasEnoughForReview(request);
  const insight = coach?.insight ?? null;
  const fresh = coach?.forDate === today;

  async function run() {
    setStatus("loading");
    setError(null);
    try {
      const result = await requestCoachReview(request);
      const { meta, ...rest } = result;
      setCoach({ generatedAt: meta.generatedAt, forDate: today, model: meta.model, insight: rest });
      setStatus("idle");
    } catch (caught) {
      setError(caught instanceof AiClientError ? caught.message : "The review could not be generated.");
      setStatus("error");
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><Sparkles size={16} className="text-brand" /> Coach review</CardTitle>
          <CardDescription>{insight ? `Last reviewed ${fresh ? "today" : coach?.forDate}` : "A weekly read on adherence, with the smallest change that will move the needle."}</CardDescription>
        </div>
        <Button size="sm" variant={insight ? "ghost" : "brand"} onClick={run} disabled={status === "loading" || !ready} aria-label={insight ? "Refresh review" : "Run review"}>
          {status === "loading" ? <RefreshCw className="animate-spin" /> : insight ? <RefreshCw /> : <Sparkles />}
          {status === "loading" ? "Reviewing…" : insight ? "Refresh" : "Run review"}
        </Button>
      </CardHeader>
      <CardContent>
        {!ready && !insight ? (
          <p className="text-sm text-muted-foreground">Log meals on at least two days and the coach can review your week.</p>
        ) : null}
        {status === "error" && error ? (
          <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-warning"><TriangleAlert size={14} /> {error}</p>
        ) : null}
        <AnimatePresence initial={false}>
          {insight && (
            <motion.div variants={fadeRise} initial="hidden" animate="visible" transition={T.base} className="space-y-5">
              <div className="flex items-start gap-5">
                <div className="shrink-0">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Adherence</p>
                  <p className="number-font mt-1 text-5xl font-semibold leading-none">{insight.adherenceScore}<span className="ml-0.5 text-base text-subtle-foreground">%</span></p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tracking-tight">{insight.headline}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{insight.assessment}</p>
                </div>
              </div>

              {(insight.wins.length > 0 || insight.risks.length > 0) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {insight.wins.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-success">Working</p>
                      <ul className="space-y-1 text-sm">{insight.wins.map((line, index) => <li key={index} className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-success" />{line}</li>)}</ul>
                    </div>
                  )}
                  {insight.risks.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.06em] text-warning">Watch</p>
                      <ul className="space-y-1 text-sm">{insight.risks.map((line, index) => <li key={index} className="flex gap-2"><TriangleAlert size={14} className="mt-0.5 shrink-0 text-warning" />{line}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}

              {insight.adjustments.length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {insight.adjustments.map((item, index) => (
                    <div key={index} className="flex gap-3 px-4 py-3">
                      <Badge variant="outline" className="h-fit shrink-0">{item.area}</Badge>
                      <div className="min-w-0 text-sm"><p className="font-medium">{item.change}</p><p className="text-muted-foreground">{item.why}</p></div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Next 3 days</p>
                <ol className="space-y-1.5 text-sm">{insight.nextActions.map((line, index) => <li key={index} className="flex gap-3"><span className="number-font w-4 shrink-0 text-muted-foreground">{index + 1}</span>{line}</li>)}</ol>
              </div>

              {insight.suggestedTargets && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted px-4 py-3">
                  <p className="text-sm">Suggested targets: <span className="number-font font-semibold">{formatNumber(insight.suggestedTargets.calories)} kcal</span> · <span className="number-font font-semibold">{insight.suggestedTargets.proteinG} g protein</span></p>
                  <Button size="sm" variant="primary" onClick={() => { adjustTargets(insight.suggestedTargets!); showToast("Targets updated"); }}>Apply <ArrowUpRight /></Button>
                </div>
              )}
              <p className="text-xs text-faint-foreground">Reviewed by {coach?.model} · confidence {Math.round(insight.confidence * 100)}%</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
