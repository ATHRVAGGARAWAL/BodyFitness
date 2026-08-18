"use client";

import { Camera, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { localDateKey } from "@/lib/date";
import { savePhoto } from "@/lib/photo-db";
import { useBodyFitnessStore } from "@/lib/store";
import { uid } from "@/lib/utils";

type Pose = "front" | "side" | "back";

export function AddPhysiqueSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const profile = useBodyFitnessStore((state) => state.profile);
  const addPhysiqueWeek = useBodyFitnessStore((state) => state.addPhysiqueWeek);
  const addWeightEntry = useBodyFitnessStore((state) => state.addWeightEntry);
  const [weight, setWeight] = useState(profile.currentWeightKg);
  const [files, setFiles] = useState<Partial<Record<Pose, File>>>({});
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setWeight(profile.currentWeightKg);
      setFiles({});
    }
    onOpenChange(nextOpen);
  };

  async function save() {
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
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Drawer.Content className="glass-sheet fixed bottom-0 left-1/2 z-[95] w-full max-w-[430px] -translate-x-1/2 rounded-t-[32px] px-5 pb-[calc(24px+var(--safe-bottom))] pt-3 outline-none">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/22" />
          <Drawer.Title className="mb-1 mt-5 text-[27px] font-bold tracking-[-0.04em]">Weekly physique</Drawer.Title>
          <p className="mb-5 mt-1 text-xs text-white/38">Use similar lighting, distance and posture each week.</p>
          <div className="grid grid-cols-3 gap-2">
            {(["front", "side", "back"] as Pose[]).map((pose) => (
              <label key={pose} className={`metric-tile relative flex h-36 flex-col items-center justify-center overflow-hidden ${files[pose] ? "ring-1 ring-[#30d158]" : ""}`}>
                {files[pose] ? <FilePreview file={files[pose]!} alt={`${pose} preview`} /> : <><Camera size={20} className="text-white/36" /><span className="mt-2 text-[10px] font-semibold capitalize text-white/40">{pose}</span></>}
                <input className="hidden" type="file" accept="image/*" capture="user" onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((value) => ({ ...value, [pose]: file })); }} />
              </label>
            ))}
          </div>
          <label className="mt-4 block"><span className="mb-2 block text-xs font-semibold text-white/40">Current weight</span><div className="relative"><input className="ios-field number-font pr-12 text-lg font-semibold" type="number" inputMode="decimal" step="0.1" value={weight} onChange={(event) => setWeight(Number(event.target.value))} /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-white/30">kg</span></div></label>
          <button onClick={() => void save()} className="pressable mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#30d158] text-sm font-bold text-black"><Check size={18} /> Save week</button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
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
