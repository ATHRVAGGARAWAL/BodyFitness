"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, Flame, Plus, ScanLine, ShieldCheck, WandSparkles } from "lucide-react";
import { useState } from "react";
import { useAppChrome } from "@/components/app-shell";
import { LargeTitle } from "@/components/large-title";
import { CameraView } from "@/components/snap-diet/camera-view";
import { FoodResultSheet } from "@/components/snap-diet/food-result-sheet";
import { ManualMealSheet, type ManualMealValues } from "@/components/snap-diet/manual-meal-sheet";
import { demoMeals } from "@/lib/seed";
import { useBodyFitnessStore } from "@/lib/store";
import type { FoodAnalysis } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export default function SnapDietPage() {
  const meals = useBodyFitnessStore((state) => state.meals);
  const addMeal = useBodyFitnessStore((state) => state.addMeal);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [analysis, setAnalysis] = useState<FoodAnalysis | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const { showToast } = useAppChrome();
  const visibleMeals = meals.length ? meals : demoMeals();

  const addAnalysis = (result: FoodAnalysis) => {
    addMeal({ name: result.name, calories: result.totals.calories, proteinG: result.totals.proteinG, carbsG: result.totals.carbsG, fatG: result.totals.fatG, items: result.items, source: "camera" });
    setResultOpen(false);
    setCameraOpen(false);
    showToast("Meal added to today’s output");
  };

  const addManual = (values: ManualMealValues) => {
    addMeal({ ...values, source: "manual" });
    showToast("Meal logged");
  };

  return (
    <main className="page-shell">
      <LargeTitle eyebrow="AI nutrition capture" title="Vision Engine" />

      <button onClick={() => setCameraOpen(true)} className="panel pressable relative block h-[326px] w-full overflow-hidden text-left">
        <div className="absolute inset-5 rounded-[19px] border border-[var(--border)] bg-[var(--surface-soft)]">
          <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-[19px] border-l-2 border-t-2 border-[var(--accent)]" />
          <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-[19px] border-r-2 border-t-2 border-[var(--accent)]" />
          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-[19px] border-b-2 border-l-2 border-[var(--accent)]" />
          <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-[19px] border-b-2 border-r-2 border-[var(--accent)]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="flex h-[70px] w-[70px] items-center justify-center rounded-[21px] border border-[color-mix(in_srgb,var(--accent)_35%,transparent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"><ScanLine size={31} /></span>
            <p className="mb-0 mt-4 text-[17px] font-black tracking-[-0.025em]">Frame your plate</p>
            <p className="mt-1 max-w-[220px] text-center text-[11px] leading-4 text-white/36">Optimized for Indian hostel mess portions</p>
          </div>
          <motion.span animate={{ y: [42, 205, 42] }} transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }} className="absolute left-8 right-8 top-0 h-px bg-[var(--accent)] shadow-[0_0_12px_var(--accent)]" />
        </div>
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 rounded-[15px] border border-[var(--border)] bg-[var(--glass-background)] px-3 py-3 backdrop-blur-xl">
          <div><p className="m-0 flex items-center gap-1.5 font-mono text-[8px] font-black uppercase tracking-[0.1em] text-[var(--accent-strong)]"><WandSparkles size={12} /> Vision model ready</p><p className="mt-1 text-[11px] text-white/34">Oil, portions, roti vs naan</p></div>
          <span className="primary-action flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]"><Camera size={19} /></span>
        </div>
      </button>

      <button onClick={() => setManualOpen(true)} className="panel pressable mt-3 flex min-h-[70px] w-full items-center gap-3 px-4 text-left">
        <span className="icon-tile text-[var(--protein)]"><Plus size={18} /></span>
        <div className="flex-1"><p className="m-0 text-sm font-bold">Manual macro input</p><p className="mt-1 text-[10px] text-white/32">Log quickly without an image</p></div>
        <ChevronRight size={16} className="text-white/20" />
      </button>

      <section className="mt-8">
        <div className="mb-3 flex items-end justify-between px-1">
          <div><div className="mb-1 flex items-center gap-2"><span className="section-index">01</span><span className="section-rule" /></div><h2 className="section-title">Recent captures</h2><p className="section-caption">Your latest nutrition estimates.</p></div>
          {!meals.length && <span className="status-chip">Demo data</span>}
        </div>
        <div className="panel overflow-hidden">
          {visibleMeals.slice(0, 4).map((meal, index) => (
            <div key={meal.id} className={`flex min-h-[78px] items-center gap-3 px-4 ${index < Math.min(visibleMeals.length, 4) - 1 ? "hairline" : ""}`}>
              <span className="icon-tile text-[var(--energy)]"><Flame size={18} /></span>
              <div className="min-w-0 flex-1"><p className="m-0 truncate text-sm font-bold">{meal.name}</p><p className="mt-1 text-[10px] text-white/30">P {meal.proteinG}g · C {meal.carbsG}g · F {meal.fatG}g</p></div>
              <div className="text-right"><p className="number-font m-0 text-base font-black">{formatNumber(meal.calories)}</p><p className="m-0 text-[8px] uppercase tracking-[0.08em] text-white/25">kcal</p></div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--steps)]" />
        <p className="m-0 text-[11px] leading-4 text-white/38">Images are analyzed in transit and never added to your saved history. Only the editable macro estimate remains.</p>
      </div>

      <AnimatePresence>{cameraOpen && <CameraView onClose={() => setCameraOpen(false)} onResult={(result) => { setAnalysis(result); setResultOpen(true); }} />}</AnimatePresence>
      <FoodResultSheet key={analysis ? `${analysis.name}-${analysis.confidence}` : "no-analysis"} open={resultOpen} analysis={analysis} onOpenChange={(open) => { setResultOpen(open); if (!open && cameraOpen) setAnalysis(null); }} onAdd={addAnalysis} />
      <ManualMealSheet key={manualOpen ? "manual-open" : "manual-closed"} open={manualOpen} onOpenChange={setManualOpen} onAdd={addManual} />
    </main>
  );
}
