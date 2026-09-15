"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, DataTile } from "@/components/ui/card";
import type { RecoveryInsight } from "@/lib/calculations";
import { cn, formatNumber } from "@/lib/utils";

/** Days of prior logging required before an average is worth showing. */
const MIN_LOGGED_DAYS = 4;

export function AdaptiveCard({
  insight,
  target,
  demo = false,
  isFlexDay,
  onToggleFlexDay,
}: {
  insight: RecoveryInsight;
  target: number;
  demo?: boolean;
  isFlexDay: boolean;
  onToggleFlexDay: () => void;
}) {
  const onTrack = insight.averageCalories === 0 || insight.variance <= 0;
  const enough = insight.loggedDays >= MIN_LOGGED_DAYS;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>7-day calorie trend</CardTitle>
          <CardDescription>
            {demo ? "How your week compares with a " : `${insight.loggedDays}/6 prior days logged against a `}
            <span className="number-font">{formatNumber(target)}</span> kcal target
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {demo ? <Badge>Sample data</Badge> : null}
          {enough ? <Badge variant={onTrack ? "success" : "warning"}>{onTrack ? "On track" : "Above plan"}</Badge> : <Badge variant="outline">Collecting</Badge>}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <DataTile>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Average</p>
            <p className="number-font mt-1 text-2xl font-semibold leading-none">
              {enough ? formatNumber(insight.averageCalories) : "—"}
              {enough ? <span className="ml-1 text-xs font-medium tracking-normal text-subtle-foreground">kcal</span> : null}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{enough ? "per logged day" : `Log ${MIN_LOGGED_DAYS}+ days to see a trend`}</p>
          </DataTile>
          <DataTile>
            <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">vs target</p>
            <p className={cn("number-font mt-1 flex items-center gap-1 text-2xl font-semibold leading-none", enough && (onTrack ? "text-success" : "text-warning"))}>
              {enough ? (
                <>
                  {onTrack ? <ArrowDownRight size={18} aria-label="Below target" /> : <ArrowUpRight size={18} aria-label="Above target" />}
                  {formatNumber(Math.abs(insight.variance))}
                  <span className="text-xs font-medium tracking-normal text-subtle-foreground">kcal</span>
                </>
              ) : (
                "—"
              )}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{enough ? "daily variance" : "Not enough days yet"}</p>
          </DataTile>
        </div>

        <p className="mt-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          {insight.suggestedLow && insight.suggestedHigh ? (
            <>
              Optional recovery range: <span className="number-font font-medium text-foreground">{formatNumber(insight.suggestedLow)}–{formatNumber(insight.suggestedHigh)} kcal</span>. Your official target stays unchanged.
            </>
          ) : (
            "Stay close to your normal target. One high day never calls for a crash diet."
          )}
        </p>

        <Button variant={isFlexDay ? "primary" : "outline"} block className="mt-4" aria-pressed={isFlexDay} onClick={onToggleFlexDay}>
          {isFlexDay ? "Flex day marked" : "Mark today as a flex day"}
        </Button>
      </CardContent>
    </Card>
  );
}
