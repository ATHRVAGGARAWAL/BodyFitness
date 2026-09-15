"use client";

import { ImagePlus, Sparkles, X } from "lucide-react";
import { useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { AiClientError, analyzeMeal, type FoodResult } from "@/lib/ai/client";
import type { FoodContext } from "@/lib/ai/schemas";

const examples = ["2 rotis, dal tadka, cucumber salad", "Chicken breast 150 g, rice 1 cup, sabzi", "Oats 60 g with milk, banana, 1 scoop whey", "Paneer bhurji, 3 slices brown bread"];

/**
 * Text-first meal logging for the web: describe what you ate, optionally attach a
 * photo, and the model returns itemised macros which flow into the result sheet.
 */
export function DescribeMealSheet({
  open,
  onOpenChange,
  context,
  onResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: FoodContext;
  onResult: (result: FoodResult) => void;
}) {
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Derive the object URL from the file and revoke it when the file changes or on unmount.
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const canSubmit = description.trim().length >= 3 || Boolean(file);

  async function submit() {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      const result = await analyzeMeal({ description: description.trim() || undefined, image: file ?? undefined, context });
      setStatus("idle");
      onResult(result);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof AiClientError ? caught.message : "Analysis failed.");
      setStatus("error");
    }
  }

  return (
    <Sheet.Root open={open} onOpenChange={onOpenChange}>
      <Sheet.Content>
        <Sheet.Header>
          <Sheet.Title>Log a meal</Sheet.Title>
          <Sheet.Description>Describe it in plain words, add a photo, or both. The AI itemises portions and macros for you to check.</Sheet.Description>
        </Sheet.Header>

        <Textarea
          autoFocus
          value={description}
          rows={3}
          maxLength={1_200}
          placeholder="e.g. 2 medium rotis, a bowl of rajma, half a cup of rice and curd"
          onChange={(event) => setDescription(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void submit(); }}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setDescription(example)} className="rounded-sm border border-border bg-muted px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{example}</button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          {preview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL preview */}
              <img src={preview} alt="Selected meal" className="size-16 rounded-md border border-border object-cover" />
              <button type="button" aria-label="Remove photo" onClick={() => setFile(null)} className="absolute -right-2 -top-2 inline-flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"><X size={12} /></button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus /> Add photo</Button>
          )}
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or HEIC · under 8 MB</span>
        </div>

        {status === "error" && error ? <p role="alert" className="mt-4 text-sm text-warning">{error}</p> : null}

        <Sheet.Footer>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" size="lg" onClick={submit} disabled={!canSubmit || status === "loading"}>
            <Sparkles /> {status === "loading" ? "Analysing…" : "Analyse meal"}
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}
