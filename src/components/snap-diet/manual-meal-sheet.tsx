"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

export interface ManualMealValues {
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

const empty: ManualMealValues = { name: "", calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

const macroFields = [
  ["calories", "Calories", "kcal"],
  ["proteinG", "Protein", "g"],
  ["carbsG", "Carbs", "g"],
  ["fatG", "Fat", "g"],
] as const;

/** Quick numeric entry for meals you already know the macros of. */
export function ManualMealSheet({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (open: boolean) => void; onAdd: (values: ManualMealValues) => void }) {
  const [values, setValues] = useState(empty);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setValues(empty);
    onOpenChange(nextOpen);
  };
  const canSave = Boolean(values.name.trim()) && values.calories > 0;

  return (
    <Sheet.Root open={open} onOpenChange={handleOpenChange}>
      <Sheet.Content size="sm">
        <Sheet.Header>
          <Sheet.Title>Manual meal</Sheet.Title>
          <Sheet.Description>Log a meal you already know the numbers for. No photo, no AI.</Sheet.Description>
        </Sheet.Header>

        <Field label="Meal name">
          <Input autoFocus placeholder="e.g. Paneer rice bowl" value={values.name} onChange={(event) => setValues((value) => ({ ...value, name: event.target.value }))} />
        </Field>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {macroFields.map(([key, label, unit]) => (
            <Field key={key} label={label}>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  className="pr-12"
                  value={values[key]}
                  onChange={(event) => setValues((value) => ({ ...value, [key]: Math.max(0, Number(event.target.value)) }))}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle-foreground">{unit}</span>
              </div>
            </Field>
          ))}
        </div>

        <Sheet.Footer>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="lg" disabled={!canSave} onClick={() => { onAdd({ ...values, name: values.name.trim() }); onOpenChange(false); }}>
            <Plus /> Add meal
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}
