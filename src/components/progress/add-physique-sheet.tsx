"use client";

import { Camera, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { localDateKey } from "@/lib/date";
import { savePhoto } from "@/lib/photo-db";
import { useBodyFitnessStore } from "@/lib/store";
import { cn, uid } from "@/lib/utils";

type Pose = "front" | "side" | "back";
const poses: Pose[] = ["front", "side", "back"];

export function AddPhysiqueSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useBodyFitnessStore((state) => state.profile);
  const addPhysiqueWeek = useBodyFitnessStore((state) => state.addPhysiqueWeek);
  const addWeightEntry = useBodyFitnessStore((state) => state.addWeightEntry);
  const [weight, setWeight] = useState(profile.currentWeightKg);
  const [files, setFiles] = useState<Partial<Record<Pose, File>>>({});
  const [saving, setSaving] = useState(false);
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setWeight(profile.currentWeightKg);
      setFiles({});
    }
    onOpenChange(nextOpen);
  };

  async function save() {
    setSaving(true);
    try {
      const ids: Partial<Record<Pose, string>> = {};
      for (const pose of ["front", "side", "back"] as Pose[]) {
        const file = files[pose];
        if (file) {
          const id = uid(`photo-${pose}`);
          await savePhoto(id, file);
          ids[pose] = id;
        }
      }
      const date = localDateKey();
      addPhysiqueWeek({ date, weightKg: weight, frontPhotoId: ids.front, sidePhotoId: ids.side, backPhotoId: ids.back });
      addWeightEntry(weight, date);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const canSave = weight > 0 && !saving;

  return (
    <Sheet.Root open={open} onOpenChange={handleOpenChange}>
      <Sheet.Content size="sm">
        <Sheet.Header>
          <Sheet.Title>Weekly check-in</Sheet.Title>
          <Sheet.Description>Same lighting, distance and posture each week. Photos stay on this device.</Sheet.Description>
        </Sheet.Header>

        <div className="grid grid-cols-3 gap-2">
          {poses.map((pose) => {
            const file = files[pose];
            return (
              <label
                key={pose}
                className={cn(
                  "relative flex h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground hover:bg-accent",
                  file ? "border-success" : "border-border",
                )}
              >
                {file ? <FilePreview file={file} alt={`${pose} preview`} /> : (
                  <>
                    <Camera size={18} />
                    <span className="mt-2 text-xs font-medium capitalize">{pose}</span>
                  </>
                )}
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  capture="user"
                  aria-label={`${pose} photo`}
                  onChange={(event) => { const next = event.target.files?.[0]; if (next) setFiles((value) => ({ ...value, [pose]: next })); }}
                />
              </label>
            );
          })}
        </div>

        <Field label="Current weight" className="mt-4">
          <div className="relative">
            <Input type="number" inputMode="decimal" step="0.1" min={0} className="pr-12" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-subtle-foreground">kg</span>
          </div>
        </Field>

        <Sheet.Footer>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="lg" disabled={!canSave} onClick={() => void save()}>
            <Check /> {saving ? "Saving…" : "Save check-in"}
          </Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

function FilePreview({ file, alt }: { file: File; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    const timeout = window.setTimeout(() => setUrl(nextUrl), 0);
    return () => {
      window.clearTimeout(timeout);
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);
  // Blob URLs are local user media and cannot be optimized by next/image.
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} className="absolute inset-0 h-full w-full object-cover" /> : null;
}
