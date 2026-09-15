"use client";

import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/section-header";
import { Sheet } from "@/components/ui/sheet";
import type { Exercise, ExerciseType, WorkoutDay } from "@/lib/types";
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
  function addDay() {
    const id = uid("day");
    setDraft((current) => [...current, { id, name: "New Day", accent: "#7c5cff", exercises: [] }]);
    setSelectedDayId(id);
  }
  function addExercise() {
    if (!selectedDay) return;
    updateDay({ exercises: [...selectedDay.exercises, { id: uid("exercise"), name: "New Exercise", type: "isolation", sets: 3, repMin: 8, repMax: 12 }] });
  }

  return (
    <Sheet.Root open={open} onOpenChange={handleOpenChange}>
      <Sheet.Content size="lg">
        <Sheet.Header>
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Protocol builder</p>
          <Sheet.Title>Edit training split</Sheet.Title>
          <Sheet.Description>Reorder days and movements by dragging. Changes apply when you save.</Sheet.Description>
        </Sheet.Header>

        <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Days · drag to reorder</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderDays}>
          <SortableContext items={draft.map((day) => day.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-wrap gap-2">
              {draft.map((day) => <SortableDayChip key={day.id} day={day} selected={day.id === selectedDay?.id} onSelect={() => setSelectedDayId(day.id)} />)}
              <Button variant="outline" size="icon" onClick={addDay} aria-label="Add day"><Plus /></Button>
            </div>
          </SortableContext>
        </DndContext>

        {selectedDay ? (
          <>
            <div className="mt-6 flex items-end gap-2">
              <Field label="Day name" className="min-w-0 flex-1">
                <Input value={selectedDay.name} onChange={(event) => updateDay({ name: event.target.value })} />
              </Field>
              {draft.length > 1 ? (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Delete day"
                  className="mb-px shrink-0 text-destructive"
                  onClick={() => { const remaining = draft.filter((day) => day.id !== selectedDay.id); setDraft(remaining); setSelectedDayId(remaining[0]?.id ?? ""); }}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>

            <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-[0.06em] text-subtle-foreground">Exercises · drag to reorder</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={reorderExercises}>
              <SortableContext items={selectedDay.exercises.map((exercise) => exercise.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                  {selectedDay.exercises.map((exercise) => (
                    <SortableExercise key={exercise.id} exercise={exercise} onChange={(patch) => updateExercise(exercise.id, patch)} onDelete={() => updateDay({ exercises: selectedDay.exercises.filter((item) => item.id !== exercise.id) })} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {!selectedDay.exercises.length ? <EmptyState title="No exercises yet" body="Add a movement to this day." className="py-6" /> : null}
            <Button variant="outline" block onClick={addExercise} className="mt-3"><Plus /> Add exercise</Button>
          </>
        ) : (
          <EmptyState className="mt-6" title="No training days" body="Add a day to start building your split." action={<Button variant="outline" size="sm" onClick={addDay}><Plus /> Add day</Button>} />
        )}

        <Sheet.Footer>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={() => { onSave(draft); onOpenChange(false); }}><Save /> Save protocol</Button>
        </Sheet.Footer>
      </Sheet.Content>
    </Sheet.Root>
  );
}

function SortableDayChip({ day, selected, onSelect }: { day: WorkoutDay; selected: boolean; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: day.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "pressable flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors",
        selected ? "border-foreground bg-accent text-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <GripVertical size={13} className="text-subtle-foreground" />
      {day.name}
    </button>
  );
}

function SortableExercise({ exercise, onChange, onDelete }: { exercise: Exercise; onChange: (patch: Partial<Exercise>) => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: exercise.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <button type="button" {...attributes} {...listeners} aria-label="Reorder exercise" className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-subtle-foreground hover:text-foreground active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
        <Input aria-label="Exercise name" className="h-9 min-w-0 flex-1 font-medium" value={exercise.name} onChange={(event) => onChange({ name: event.target.value })} />
        <Button variant="ghost" size="icon" aria-label="Delete exercise" className="shrink-0 text-destructive hover:text-destructive" onClick={onDelete}><Trash2 /></Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Type" className="col-span-2 sm:col-span-1">
          <Select className="h-9" value={exercise.type} onChange={(event) => onChange({ type: event.target.value as ExerciseType })}>
            <option value="compound">Compound</option>
            <option value="isolation">Isolation</option>
          </Select>
        </Field>
        <EditorNumber label="Sets" value={exercise.sets} onChange={(sets) => onChange({ sets })} />
        <EditorNumber label="Rep min" value={exercise.repMin} onChange={(repMin) => onChange({ repMin })} />
        <EditorNumber label="Rep max" value={exercise.repMax} onChange={(repMax) => onChange({ repMax })} />
        <EditorNumber label="Rest s" value={exercise.restSeconds ?? (exercise.type === "compound" ? 120 : 90)} onChange={(restSeconds) => onChange({ restSeconds })} />
      </div>
    </div>
  );
}

function EditorNumber({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <Input type="number" inputMode="numeric" className="h-9 px-2 text-center" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}
