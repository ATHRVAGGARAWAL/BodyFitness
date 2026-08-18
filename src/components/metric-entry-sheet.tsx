"use client";

import { useState } from "react";
import { Drawer } from "vaul";

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
  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[95] w-full max-w-[430px] -translate-x-1/2 rounded-t-[30px] px-5 pb-[calc(24px+var(--safe-bottom))] pt-3 outline-none">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-white/22" />
          <Drawer.Title className="mt-5 text-center text-xl font-bold">{title}</Drawer.Title>
          <div className="relative mx-auto mt-5 max-w-[240px]">
            <input autoFocus className="ios-field number-font h-20 pr-16 text-center text-[38px] font-bold" type="number" inputMode="numeric" value={draft} onChange={(event) => setDraft(Number(event.target.value))} />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm text-white/35">{unit}</span>
          </div>
          <button onClick={() => { onSave(draft); onOpenChange(false); }} className="pressable mt-5 min-h-13 w-full rounded-[17px] bg-white text-sm font-bold text-black">Save</button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
