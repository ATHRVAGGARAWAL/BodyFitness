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

      <button onClick={() => setCameraOpen(true)} className="hero-surface pressable relative block h-[370px] w-full text-left">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(100,210,255,.16),transparent_26%),radial-gradient(circle_at_22%_38%,rgba(48,209,88,.08),transparent_22%),linear-gradient(155deg,#1b2025,#08090b_68%)]" />
        <div className="surface-grid absolute inset-0 opacity-40" />
        <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/30 px-3 py-2 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[#30d158] shadow-[0_0_9px_#30d158]" />
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/48">Vision ready</span>
        </div>

        <div className="absolute left-1/2 top-[38%] h-[170px] w-[250px] -translate-x-1/2 -translate-y-1/2 rounded-[38px] border border-white/14 bg-white/[0.025] shadow-[inset_0_0_40px_rgba(100,210,255,.035)] backdrop-blur-[2px]">
          <span className="absolute -left-px -top-px h-9 w-9 rounded-tl-[38px] border-l-2 border-t-2 border-[#64d2ff]/80" />
          <span className="absolute -right-px -top-px h-9 w-9 rounded-tr-[38px] border-r-2 border-t-2 border-[#64d2ff]/80" />
          <span className="absolute -bottom-px -left-px h-9 w-9 rounded-bl-[38px] border-b-2 border-l-2 border-[#64d2ff]/80" />
          <span className="absolute -bottom-px -right-px h-9 w-9 rounded-br-[38px] border-b-2 border-r-2 border-[#64d2ff]/80" />
          <div className="absolute left-1/2 top-1/2 h-[122px] w-[122px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[8px] border-white/[0.09] bg-[radial-gradient(circle_at_38%_34%,rgba(255,255,255,.13),rgba(255,255,255,.035)_56%,transparent_57%)] shadow-[0_22px_45px_rgba(0,0,0,.42)]">
            <span className="absolute left-[18px] top-[24px] h-12 w-12 rounded-[45%] bg-[#ff9f0a]/50 blur-[1px]" />
            <span className="absolute bottom-[20px] right-[17px] h-10 w-[50px] rounded-[50%] bg-[#30d158]/30 blur-[1px]" />
            <span className="absolute right-[14px] top-[24px] h-8 w-8 rounded-full bg-[#ff375f]/34" />
          </div>
          <ScanLine className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/10" />
          <motion.div animate={{ y: [15, 145, 15] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#64d2ff] to-transparent shadow-[0_0_16px_#64d2ff]" />
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/88 to-transparent px-5 pb-5 pt-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="m-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-[#64d2ff]"><Sparkles size={13} /> AI food intelligence</p>
              <h2 className="mb-0 mt-2 text-[25px] font-bold tracking-[-0.045em]">Scan your mess plate</h2>
              <p className="mt-1 text-xs text-white/42">Roti vs naan. Hidden oil. Real portions.</p>
            </div>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-black shadow-[0_8px_28px_rgba(255,255,255,.18)]"><Camera size={23} /></span>
          </div>
        </div>
      </button>

      <button onClick={() => setManualOpen(true)} className="metric-tile pressable mt-3 flex min-h-[62px] w-full items-center gap-3 px-4 text-left">
        <span className="flex h-10 w-10 items-center justify-center rounded-[15px] bg-[#30d158]/14 text-[#30d158] ring-1 ring-[#30d158]/10"><Plus size={18} /></span>
        <div className="flex-1"><p className="m-0 text-sm font-semibold">Log without a photo</p><p className="mt-0.5 text-[10px] text-white/32">Quick manual macro entry</p></div>
        <ChevronRight size={16} className="text-white/20" />
      </button>

      <div className="mb-3 mt-8 flex items-end justify-between px-1">
        <div><p className="section-kicker m-0">History</p><p className="mb-0 mt-1 text-[21px] font-bold tracking-[-0.035em]">Recent plates</p></div>
        {!meals.length && <span className="rounded-full bg-white/[0.07] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">Sample</span>}
      </div>
      <div className="space-y-3">
        {visibleMeals.slice(0, 4).map((meal) => (
          <div key={meal.id} className="ios-card flex min-h-[84px] items-center gap-3 overflow-hidden px-4">
            <span aria-hidden className="absolute -left-8 h-20 w-20 rounded-full bg-[#ff375f]/10 blur-[30px]" />
            <span className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-[#ff375f]/12 text-[#ff375f] ring-1 ring-[#ff375f]/10"><Flame size={20} /></span>
            <div className="min-w-0 flex-1"><p className="m-0 truncate text-sm font-semibold">{meal.name}</p><p className="mt-1 text-[10px] text-white/30">{meal.proteinG}g protein · {meal.carbsG}g carbs · {meal.fatG}g fat</p></div>
            <div className="text-right"><p className="number-font m-0 text-base font-bold">{formatNumber(meal.calories)}</p><p className="m-0 text-[9px] text-white/25">kcal</p></div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-[20px] bg-[#0a84ff]/8 p-4 ring-1 ring-[#64d2ff]/10">
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
