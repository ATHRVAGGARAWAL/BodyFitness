import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Numbered editorial section header. Used at the top of every content block so the
 * page reads as a sequence: index, rule, title, caption, optional action.
 */
export function SectionHeader({
  index,
  title,
  caption,
  action,
  className,
}: {
  index?: string;
  title: string;
  caption?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {index ? (
          <div className="mb-1.5 flex items-center gap-2">
            <span className="font-mono text-xs font-medium tracking-[0.08em] text-brand">{index}</span>
            <span className="h-px w-5 bg-border" />
          </div>
        ) : null}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {caption ? <p className="mt-1 text-sm text-muted-foreground">{caption}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Big number with unit and label — the workhorse of a metrics UI. */
export function Stat({
  label,
  value,
  unit,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  hint?: React.ReactNode;
  tone?: "default" | "brand" | "muted";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
      <p className={cn("number-font mt-1 text-3xl font-semibold leading-none", tone === "brand" && "text-brand", tone === "muted" && "text-muted-foreground")}>
        {value}
        {unit ? <span className="ml-1 text-sm font-medium tracking-normal text-subtle-foreground">{unit}</span> : null}
      </p>
      {hint ? <div className="mt-1.5 text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({ title, body, action, className }: { title: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border px-5 py-8 text-center", className)}>
      <p className="text-sm font-medium">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
