"use client";

import { Camera, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { loadPhoto } from "@/lib/photo-db";
import type { PhysiqueWeek } from "@/lib/types";
import { formatShortDate } from "@/lib/date";

export function PhysiqueGallery({ entries, onAdd }: { entries: PhysiqueWeek[]; onAdd: () => void }) {
  const visible = entries.length ? entries : demoWeeks();
  return (
    <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-[24px] pb-4">
      {visible.map((entry, index) => <PhysiqueCard key={entry.id} entry={entry} demo={!entries.length} index={index} />)}
      <button onClick={onAdd} className="hero-surface pressable flex min-h-[338px] w-[326px] shrink-0 snap-center flex-col items-center justify-center text-white/44">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.07] ring-1 ring-white/[0.08]"><Plus size={25} /></span>
        <p className="m-0 text-sm font-semibold text-white/70">Add this week</p>
        <p className="mt-1 text-[10px]">Front · side · back</p>
      </button>
    </div>
  );
}

function PhysiqueCard({ entry, demo, index }: { entry: PhysiqueWeek; demo: boolean; index: number }) {
  return (
    <article className="hero-surface w-[326px] shrink-0 snap-center overflow-hidden p-2">
      <div className="grid h-[258px] grid-cols-3 gap-1.5 overflow-hidden rounded-[23px] bg-white/[0.035]">
        <PhotoPanel photoId={entry.frontPhotoId} label="Front" demo={demo} shade={index} />
        <PhotoPanel photoId={entry.sidePhotoId} label="Side" demo={demo} shade={index + 1} />
        <PhotoPanel photoId={entry.backPhotoId} label="Back" demo={demo} shade={index + 2} />
      </div>
      <div className="flex items-center justify-between px-3 pb-2 pt-3.5">
        <div><p className="m-0 text-sm font-semibold">Week of {formatShortDate(entry.date)}</p><p className="mt-1 text-[10px] text-white/30">{demo ? "Sample gallery" : "Stored on this device"}</p></div>
        <div className="text-right"><p className="number-font m-0 text-xl font-bold">{entry.weightKg.toFixed(1)}</p><p className="m-0 text-[9px] text-white/28">kg</p></div>
      </div>
    </article>
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
    <div className="relative overflow-hidden bg-[#101012] first:rounded-l-[22px] last:rounded-r-[22px]">
      {/* Blob URLs are local user media and cannot be optimized by next/image. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt={`${label} physique photo`} className="h-full w-full object-cover" /> : (
        <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 34%, rgba(${70 + shade * 9},${82 + shade * 5},${105 + shade * 7},.65), #111116 68%)` }}>
          <div className="absolute left-1/2 top-[25%] h-12 w-10 -translate-x-1/2 rounded-full bg-white/8" />
          <div className="absolute left-1/2 top-[40%] h-28 w-16 -translate-x-1/2 rounded-[45%_45%_28%_28%] bg-white/[0.075] blur-[1px]" />
        </div>
      )}
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/[0.08] bg-black/45 px-2 py-1 text-[8px] font-semibold backdrop-blur-lg">{label}</span>
      {demo && <Camera className="absolute right-2 top-2 h-3.5 w-3.5 text-white/24" />}
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
