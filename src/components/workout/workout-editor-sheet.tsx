"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Drawer } from "vaul";
import type { Exercise, WorkoutDay } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

export function WorkoutEditorSheet({ open, onOpenChange, plan, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; plan: WorkoutDay[]; onSave: (plan: WorkoutDay[]) => void }) {
  const [draft, setDraft] = useState(plan);
  const [selectedDayId, setSelectedDayId] = useState(plan[0]?.id ?? "");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraft(plan);
      setSelectedDayId(plan[0]?.id ?? "");
    }
    onOpenChange(nextOpen);
  };
  const selectedDay = draft.find((day) => day.id === selectedDayId) ?? draft[0];

  function reorderDays(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    setDraft((current) => arrayMove(current, current.findIndex((day) => day.id === event.active.id), current.findIndex((day) => day.id === event.over?.id)));
  }
  function reorderExercises(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id || !selectedDay) return;
    setDraft((current) => current.map((day) => day.id !== selectedDay.id ? day : {
      ...day,
      exercises: arrayMove(day.exercises, day.exercises.findIndex((exercise) => exercise.id === event.active.id), day.exercises.findIndex((exercise) => exercise.id === event.over?.id)),
    }));
  }
  function updateDay(patch: Partial<WorkoutDay>) {
    if (!selectedDay) return;
    setDraft((current) => current.map((day) => day.id === selectedDay.id ? { ...day, ...patch } : day));
  }
  function updateExercise(id: string, patch: Partial<Exercise>) {
    if (!selectedDay) return;
    updateDay({ exercises: selectedDay.exercises.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise) });
  }

  return (
    <Drawer.Root open={open} onOpenChange={handleOpenChange} shouldScaleBackground={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="sheet-overlay fixed inset-0 z-[90] backdrop-blur-sm" />
        <Drawer.Content className="glass fixed bottom-0 left-1/2 z-[95] flex max-h-[94dvh] w-full max-w-[430px] -translate-x-1/2 flex-col rounded-t-[32px] outline-none">
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-white/22" />
          <div className="flex items-center justify-between px-5 py-4">
            <div><p className="m-0 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">PPLUL</p><Drawer.Title className="m-0 mt-1 text-[27px] font-bold tracking-[-0.04em]">Edit split</Drawer.Title></div>
            <button onClick={() => onOpenChange(false)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10"><X size={18} /></button>
          </div>
          <div className="scrollbar-none overflow-y-auto px-5 pb-[calc(24px+var(--safe-bottom))]">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderDays}>
              <SortableContext items={draft.map((day) => day.id)} strategy={verticalListSortingStrategy}>
                <div className="scrollbar-none flex gap-2 overflow-x-auto pb-2">
                  {draft.map((day) => <SortableDayChip key={day.id} day={day} selected={day.id === selectedDay?.id} onSelect={() => setSelectedDayId(day.id)} />)}
                  <button onClick={() => { const id = uid("day"); setDraft((current) => [...current, { id, name: "New Day", accent: "#64d2ff", exercises: [] }]); setSelectedDayId(id); }} className="flex min-w-11 items-center justify-center rounded-full bg-white/10"><Plus size={17} /></button>
                </div>
              </SortableContext>
            </DndContext>

            {selectedDay && (
              <>
                <div className="mt-3 flex gap-2">
                  <input className="ios-field flex-1 text-sm font-semibold" value={selectedDay.name} onChange={(event) => updateDay({ name: event.target.value })} />
                  {draft.length > 1 && <button aria-label="Delete day" onClick={() => { const remaining = draft.filter((day) => day.id !== selectedDay.id); setDraft(remaining); setSelectedDayId(remaining[0]?.id ?? ""); }} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#ff453a]/12 text-[#ff453a]"><Trash2 size={17} /></button>}
                </div>

                <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.1em] text-white/35">Exercises · drag to reorder</p>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderExercises}>
                  <SortableContext items={selectedDay.exercises.map((exercise) => exercise.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {selectedDay.exercises.map((exercise) => (
                        <SortableExercise key={exercise.id} exercise={exercise} onChange={(patch) => updateExercise(exercise.id, patch)} onDelete={() => updateDay({ exercises: selectedDay.exercises.filter((item) => item.id !== exercise.id) })} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <button onClick={() => updateDay({ exercises: [...selectedDay.exercises, { id: uid("exercise"), name: "New Exercise", type: "isolation", sets: 3, repMin: 8, repMax: 12 }] })} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-white/[0.065] text-sm font-semibold"><Plus size={16} /> Add exercise</button>
              </>
            )}
            <button onClick={() => { onSave(draft); onOpenChange(false); }} className="pressable mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-white text-sm font-bold text-black"><Save size={17} /> Save split</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function SortableDayChip({ day, selected, onSelect }: { day: WorkoutDay; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: day.id });
  return <button ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners} onClick={onSelect} className={cn("flex min-h-11 min-w-[88px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold", selected ? "bg-white text-black" : "bg-white/8 text-white/55")}><GripVertical size={13} />{day.name}</button>;
}

function SortableExercise({ exercise, onChange, onDelete }: { exercise: Exercise; onChange: (patch: Partial<Exercise>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="ios-card p-3">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="flex h-9 w-8 items-center justify-center text-white/30"><GripVertical size={17} /></button>
        <input className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold outline-none" value={exercise.name} onChange={(event) => onChange({ name: event.target.value })} />
        <button onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-full text-[#ff453a]"><Trash2 size={15} /></button>
      </div>
      <div className="mt-2 flex items-stretch gap-2">
        <button onClick={() => onChange({ type: exercise.type === "compound" ? "isolation" : "compound" })} className={cn("min-w-[84px] rounded-[11px] px-2 py-2 text-[9px] font-bold", exercise.type === "compound" ? "bg-[#ff9f0a]/15 text-[#ff9f0a]" : "bg-[#64d2ff]/12 text-[#64d2ff]")}>{exercise.type}</button>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1.5">
          <EditorNumber label="sets" value={exercise.sets} onChange={(sets) => onChange({ sets })} />
          <EditorNumber label="min" value={exercise.repMin} onChange={(repMin) => onChange({ repMin })} />
          <EditorNumber label="max" value={exercise.repMax} onChange={(repMax) => onChange({ repMax })} />
          <EditorNumber label="rest" value={exercise.restSeconds ?? (exercise.type === "compound" ? 120 : 90)} onChange={(restSeconds) => onChange({ restSeconds })} />
        </div>
      </div>
    </div>
  );
}

function EditorNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="rounded-[11px] bg-white/[0.055] px-2 py-1"><span className="block text-center text-[8px] text-white/28">{label}</span><input className="number-font w-full border-0 bg-transparent p-0 text-center text-xs font-semibold outline-none" type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}
