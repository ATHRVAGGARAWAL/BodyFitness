"use client";

import { AlertTriangle, Check, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTile } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { FoodAnalysis, FoodItem } from "@/lib/types";
import { cn, formatNumber, uid } from "@/lib/utils";

/** What the sheet renders: the analysis plus, when it came from the AI, the guard's notes. */
export type FoodResultAnalysis = FoodAnalysis & {
  adjustments?: string[];
  meta?: { model: string; latencyMs: number; source: "image" | "text" };
};

const mealTypeLabel: Record<NonNullable<FoodAnalysis["mealType"]>, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  unknown: "Meal",
};

const percent = (value: number) => `${Math.round(value * 100)}%`;

export function FoodResultSheet({
  open,
  analysis,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  analysis: FoodResultAnalysis | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (analysis: FoodAnalysis) => void;
}) {
  // State is seeded from the prop; the parent remounts this sheet (via `key`) per analysis.
  const [name, setName] = useState(analysis?.name ?? "Detected meal");
  const [items, setItems] = useState<FoodItem[]>(() =>
    analysis?.items.map((item) => ({ ...item, id: item.id ?? uid("food") })) ?? [],
  );

  const totals = useMemo(
    () =>
      items.reduce(
        (sum, item) => ({
          calories: sum.calories + item.calories,
          proteinG: sum.proteinG + item.proteinG,
          carbsG: sum.carbsG + item.carbsG,
          fatG: sum.fatG + item.fatG,
          fiberG: sum.fiberG + (item.fiberG ?? 0),
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 },
      ),
    [items],
  );
  const fibreKnown = useMemo(() => items.some((item) => typeof item.fiberG === "number"), [items]);

  if (!analysis) return null;

  const updateItem = (id: string | undefined, patch: Partial<FoodItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const removeItem = (id: string | undefined) => setItems((current) => current.filter((item) => item.id !== id));

  const warnings = analysis.warnings ?? [];
  const adjustments = analysis.adjustments ?? [];
  const proteinTip = analysis.proteinTip?.trim() ?? "";
  const canAdd = items.length > 0 && name.trim().length > 0;

  return (
    <Sheet.Root open={open} onOpenChange={onOpenChange}>
      <Sheet.Content size="md">
        <Sheet.Header>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="brand"><Sparkles size={11} /> AI estimate</Badge>
            <Badge>{mealTypeLabel[analysis.mealType ?? "unknown"]}</Badge>
            <Badge variant="outline">{percent(analysis.confidence)} confident</Badge>
          </div>
          <Sheet.Title asChild>
            <Input
              aria-label="Meal name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold tracking-tight focus:shadow-none"
            />
          </Sheet.Title>
          <Sheet.Description>Edit anything that looks off before adding it to today.</Sheet.Description>
        </Sheet.Header>

        <div className="grid grid-cols-4 gap-2">
          <Macro value={totals.calories} label="kcal" />
          <Macro value={totals.proteinG} label="protein" unit="g" />
          <Macro value={totals.carbsG} label="carbs" unit="g" />
          <Macro value={totals.fatG} label="fat" unit="g" />
        </div>
        {fibreKnown ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Fibre <span className="number-font font-medium text-foreground">{formatNumber(totals.fiberG)}</span> g
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <ul className="mt-4 space-y-1.5" aria-label="Things to double-check">
            {warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm text-warning">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {proteinTip ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-brand-soft px-3.5 py-3">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-brand" />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-brand">Protein tip</p>
              <p className="mt-1 text-sm text-foreground">{proteinTip}</p>
            </div>
          </div>
        ) : null}

        <ul className="mt-5 space-y-3" aria-label="Detected items">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border bg-card p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <input
                    aria-label="Item name"
                    value={item.name}
                    onChange={(event) => updateItem(item.id, { name: event.target.value })}
                    className="w-full border-0 bg-transparent p-0 text-sm font-medium text-foreground outline-none"
                  />
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <input
                      aria-label="Portion"
                      value={item.portion}
                      onChange={(event) => updateItem(item.id, { portion: event.target.value })}
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-muted-foreground outline-none"
                    />
                    {typeof item.portionGrams === "number" ? (
                      <span className="number-font text-xs text-subtle-foreground">{formatNumber(item.portionGrams)} g</span>
                    ) : null}
                    {typeof item.confidence === "number" ? <Badge variant="outline">{percent(item.confidence)}</Badge> : null}
                  </div>
                  {item.cookingNote ? <p className="mt-1.5 text-xs text-muted-foreground">{item.cookingNote}</p> : null}
                </div>
                <Button variant="ghost" size="icon-sm" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}>
                  <Trash2 />
                </Button>
              </div>
              <div className={cn("mt-3 grid gap-2", typeof item.fiberG === "number" ? "grid-cols-5" : "grid-cols-4")}>
                <MiniInput label="kcal" value={item.calories} onChange={(calories) => updateItem(item.id, { calories })} />
                <MiniInput label="P" value={item.proteinG} onChange={(proteinG) => updateItem(item.id, { proteinG })} />
                <MiniInput label="C" value={item.carbsG} onChange={(carbsG) => updateItem(item.id, { carbsG })} />
                <MiniInput label="F" value={item.fatG} onChange={(fatG) => updateItem(item.id, { fatG })} />
                {typeof item.fiberG === "number" ? <MiniInput label="Fibre" value={item.fiberG} onChange={(fiberG) => updateItem(item.id, { fiberG })} /> : null}
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Every item was removed. Close this sheet or log the meal manually.</p> : null}

        {analysis.assumptions.length > 0 ? (
          <details className="mt-4 rounded-lg border border-border bg-muted px-3.5 py-2.5">
            <summary className="cursor-pointer text-sm font-medium text-foreground">Assumptions ({analysis.assumptions.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {analysis.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
            </ul>
          </details>
        ) : null}

        {adjustments.length > 0 ? (
          <details className="mt-2 px-1 py-1">
            <summary className="cursor-pointer text-xs text-subtle-foreground">Checks applied ({adjustments.length})</summary>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-subtle-foreground">
              {adjustments.map((adjustment) => <li key={adjustment}>{adjustment}</li>)}
            </ul>
          </details>
        ) : null}

        <Sheet.Footer className="items-center sm:items-center">
          <p className="flex-1 text-xs text-subtle-foreground">Estimates vary with portion size and preparation.</p>
          <Button variant="primary" size="lg" disabled={!canAdd} onClick={() => onAdd({ ...analysis, name: name.trim(), items, totals })}>
            <Check /> Add to today
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

function Macro({ value, label, unit }: { value: number; label: string; unit?: string }) {
  return (
    <DataTile className="px-2 py-2.5 text-center">
      <p className="number-font text-xl font-semibold leading-none">
        {formatNumber(value)}
        {unit ? <span className="ml-0.5 text-xs font-medium text-subtle-foreground">{unit}</span> : null}
      </p>
      <p className="mt-1.5 text-xs uppercase tracking-[0.06em] text-subtle-foreground">{label}</p>
    </DataTile>
  );
}

function MiniInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-md border border-border bg-muted px-1.5 py-1.5 text-center">
      <span className="block text-xs text-subtle-foreground">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={Math.round(value)}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value)))}
        className="number-font mt-0.5 w-full border-0 bg-transparent p-0 text-center text-sm font-medium text-foreground outline-none"
      />
    </label>
  );
}
