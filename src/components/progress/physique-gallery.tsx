"use client";

import { Camera, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/date";
import { loadPhoto } from "@/lib/photo-db";
import type { PhysiqueWeek } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Weekly check-in photos. A snap-scroll carousel on small screens, a grid at `lg`.
 * Photos live in IndexedDB on this device; nothing here leaves the browser.
 */
export function PhysiqueGallery({ entries, onAdd }: { entries: PhysiqueWeek[]; onAdd: () => void }) {
  const demo = entries.length === 0;
  const visible = demo ? demoWeeks() : entries;
  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3">
      {visible.map((entry, index) => <PhysiqueCard key={entry.id} entry={entry} demo={demo} index={index} />)}
      <button
        type="button"
        onClick={onAdd}
        className="pressable flex min-h-[300px] w-[280px] shrink-0 snap-center flex-col items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground hover:bg-accent hover:text-foreground lg:w-auto"
      >
        <span className="mb-3 flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-foreground"><Plus size={20} /></span>
        <p className="text-sm font-medium text-foreground">Add this week</p>
        <p className="mt-1 text-xs">Front · side · back</p>
      </button>
    </div>
  );
}

function PhysiqueCard({ entry, demo, index }: { entry: PhysiqueWeek; demo: boolean; index: number }) {
  return (
    <Card className="w-[280px] shrink-0 snap-center overflow-hidden lg:w-auto">
      <div className="grid h-[220px] grid-cols-3 gap-px bg-border">
        <PhotoPanel photoId={entry.frontPhotoId} label="Front" demo={demo} shade={index} />
        <PhotoPanel photoId={entry.sidePhotoId} label="Side" demo={demo} shade={index + 1} />
        <PhotoPanel photoId={entry.backPhotoId} label="Back" demo={demo} shade={index + 2} />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Week of {formatShortDate(entry.date)}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {demo ? <Badge>Sample data</Badge> : <span>Stored on this device</span>}
          </div>
        </div>
        <p className="number-font shrink-0 text-xl font-semibold leading-none">
          {entry.weightKg.toFixed(1)}
          <span className="ml-1 text-xs font-medium text-subtle-foreground">kg</span>
        </p>
      </div>
    </Card>
  );
}

function PhotoPanel({ photoId, label, demo, shade }: { photoId?: string; label: string; demo: boolean; shade: number }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null;
    if (photoId) {
      void loadPhoto(photoId).then((blob) => {
        if (blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
      });
    }
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [photoId]);
  return (
    <div data-theme="dark" className="relative overflow-hidden bg-background text-foreground">
      {/* Blob URLs are local user media and cannot be optimized by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={`${label} physique photo`} className="h-full w-full object-cover" /> : (
        <Silhouette shade={shade} />
      )}
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-sm border border-border bg-card px-1.5 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-foreground">{label}</span>
      {demo && <Camera aria-hidden className="absolute right-2 top-2 size-3.5 text-subtle-foreground" />}
    </div>
  );
}

/** Procedural stand-in when a pose has no photo: a soft head-and-torso in the ink ramp. */
function Silhouette({ shade }: { shade: number }) {
  const tones = ["bg-data-4", "bg-data-3", "bg-data-4"];
  return (
    <div aria-hidden className="absolute inset-0 bg-muted">
      <div className={cn("absolute left-1/2 top-[22%] h-10 w-8 -translate-x-1/2 rounded-full opacity-60", tones[shade % tones.length])} />
      <div className={cn("absolute left-1/2 top-[40%] h-24 w-14 -translate-x-1/2 rounded-xl opacity-50", tones[(shade + 1) % tones.length])} />
    </div>
  );
}

function demoWeeks(): PhysiqueWeek[] {
  const today = new Date();
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index * 7);
    return { id: `demo-${index}`, date: date.toISOString().slice(0, 10), weightKg: 83.4 + index * 0.4 };
  });
}
