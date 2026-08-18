"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronRight, Flame, Plus, ScanLine, ShieldCheck, Sparkles } from "lucide-react";
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
    addMeal({
      name: result.name,
      calories: result.totals.calories,
      proteinG: result.totals.proteinG,
      carbsG: result.totals.carbsG,
      fatG: result.totals.fatG,
      items: result.items,
      source: "camera",
    });
    setResultOpen(false);
    setCameraOpen(false);
    showToast("Meal added to your rings");
  };

  const addManual = (values: ManualMealValues) => {
    addMeal({ ...values, source: "manual" });
    showToast("Meal logged");
  };

  return (
    <main className="page-shell">
      <LargeTitle eyebrow="Vision nutrition" title="Snap Diet" />

      <button onClick={() => setCameraOpen(true)} className="always-dark pressable relative block h-[330px] w-full overflow-hidden rounded-[30px] bg-[#151517] text-left">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-8 rounded-[25px] border border-white/22">
          <ScanLine className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/18" />
          <motion.div animate={{ y: [18, 205, 18] }} transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }} className="absolute left-4 right-4 h-px bg-[#64d2ff]/70" />
        </div>
        <div className="absolute inset-x-3 bottom-3 rounded-[23px] bg-black/72 px-4 py-4 backdrop-blur-xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#64d2ff]"><Sparkles size={13} /> OpenAI vision</p>
              <h2 className="mb-0 mt-2 text-[24px] font-bold tracking-[-0.04em]">Scan your mess plate</h2>
              <p className="mt-1 text-xs text-white/42">Roti vs naan. Hidden oil. Real portions.</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-black"><Camera size={23} /></span>
          </div>
        </div>
      </button>

      <button onClick={() => setManualOpen(true)} className="pressable mt-3 flex min-h-14 w-full items-center gap-3 rounded-[20px] bg-white/[0.065] px-4 text-left">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#30d158]/14 text-[#30d158]"><Plus size={18} /></span>
        <div className="flex-1"><p className="m-0 text-sm font-semibold">Log without a photo</p><p className="mt-0.5 text-[10px] text-white/32">Quick manual macro entry</p></div>
        <ChevronRight size={16} className="text-white/20" />
      </button>

      <div className="mt-7 mb-3 flex items-center justify-between px-1">
        <div><p className="m-0 text-[20px] font-bold tracking-[-0.03em]">Recent plates</p><p className="mt-1 text-xs text-white/34">Tap to review your log.</p></div>
        {!meals.length && <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">Sample</span>}
      </div>
      <div className="space-y-3">
        {visibleMeals.slice(0, 4).map((meal) => (
          <div key={meal.id} className="ios-card flex min-h-[82px] items-center gap-3 px-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-[#ff375f]/12 text-[#ff375f]"><Flame size={20} /></span>
            <div className="min-w-0 flex-1"><p className="m-0 truncate text-sm font-semibold">{meal.name}</p><p className="mt-1 text-[10px] text-white/30">{meal.proteinG}g protein · {meal.carbsG}g carbs · {meal.fatG}g fat</p></div>
            <div className="text-right"><p className="number-font m-0 text-base font-bold">{formatNumber(meal.calories)}</p><p className="m-0 text-[9px] text-white/25">kcal</p></div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-[#0a84ff]/9 p-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#64d2ff]" />
        <p className="m-0 text-[11px] leading-4 text-white/38">Photos are sent only for analysis and are not stored by BodyFitness. Saved meal history contains macros, not the image.</p>
      </div>

      <AnimatePresence>
        {cameraOpen && <CameraView onClose={() => setCameraOpen(false)} onResult={(result) => { setAnalysis(result); setResultOpen(true); }} />}
      </AnimatePresence>
      <FoodResultSheet key={analysis ? `${analysis.name}-${analysis.confidence}` : "no-analysis"} open={resultOpen} analysis={analysis} onOpenChange={(open) => { setResultOpen(open); if (!open && cameraOpen) setAnalysis(null); }} onAdd={addAnalysis} />
      <ManualMealSheet key={manualOpen ? "manual-open" : "manual-closed"} open={manualOpen} onOpenChange={setManualOpen} onAdd={addManual} />
    </main>
  );
}
