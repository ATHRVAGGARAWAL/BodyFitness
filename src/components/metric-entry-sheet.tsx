"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";

/**
 * Single-number entry sheet. The parent remounts it when it opens so `draft`
 * always seeds from the latest value; `handleOpenChange` covers the same path
 * when the sheet is reused without a remount.
 */
export function MetricEntrySheet({
  open,
  onOpenChange,
  title,
  value,
  unit,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: number;
  unit: string;
  onSave: (value: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) setDraft(value);
    onOpenChange(nextOpen);
  };
  const save = () => {
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Sheet.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Sheet.Content size="sm">
        <Sheet.Header>
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Metric input</p>
          <Sheet.Title className="mt-1">{title}</Sheet.Title>
          <Sheet.Description>Enter today’s total. It replaces the current value.</Sheet.Description>
        </Sheet.Header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <Field label={unit} htmlFor="metric-entry-value">
            <div className="relative">
              <Input
                id="metric-entry-value"
                autoFocus
                type="number"
                inputMode="numeric"
                min={0}
                value={draft}
                onChange={(event) => setDraft(Number(event.target.value))}
                className="h-16 pr-20 text-center text-3xl font-semibold"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-subtle-foreground">{unit}</span>
            </div>
          </Field>

          <Sheet.Footer>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save {unit}
            </Button>
          </Sheet.Footer>
        </form>
      </Sheet.Content>
    </Sheet.Root>
  );
}
