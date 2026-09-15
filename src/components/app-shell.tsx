"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { Onboarding } from "@/components/onboarding";
import { RestTimerPill } from "@/components/rest-timer-pill";
import { ServiceWorkerManager } from "@/components/service-worker-manager";
import { overlayDrop, routeSwap, T } from "@/lib/motion";
import { useBodyFitnessStore } from "@/lib/store";

interface ChromeContextValue {
  cameraActive: boolean;
  setCameraActive: (active: boolean) => void;
  showToast: (message: string) => void;
}

const ChromeContext = createContext<ChromeContextValue | null>(null);

export function useAppChrome() {
  const value = useContext(ChromeContext);
  if (!value) throw new Error("useAppChrome must be used inside AppShell");
  return value;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hydrated = useBodyFitnessStore((state) => state.hydrated);
  const onboardingComplete = useBodyFitnessStore((state) => state.onboardingComplete);
  const themePreference = useBodyFitnessStore((state) => state.themePreference);
  const [cameraActive, setCameraActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      try {
        await useBodyFitnessStore.persist.rehydrate();
      } finally {
        if (!cancelled) useBodyFitnessStore.getState().setHydrated(true);
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const resolved = themePreference === "system" ? (media.matches ? "dark" : "light") : themePreference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", resolved === "dark" ? "#0b0b0c" : "#fbfbfa");
    };
    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [hydrated, themePreference]);

  const context = useMemo(() => ({ cameraActive, setCameraActive, showToast }), [cameraActive, showToast]);

  return (
    <ChromeContext.Provider value={context}>
      <MotionConfig reducedMotion="user" transition={T.base}>
        <div className={`app-frame ${hydrated && !onboardingComplete ? "h-[100dvh] overflow-hidden" : ""}`}>
          {!hydrated ? (
            <LaunchScreen />
          ) : (
            <>
              <RestTimerPill />
              <ServiceWorkerManager />
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={pathname} variants={routeSwap} initial="hidden" animate="visible" exit="exit" transition={T.base}>
                  {children}
                </motion.div>
              </AnimatePresence>
              <AnimatePresence>{!cameraActive && <AppNav />}</AnimatePresence>
              {!onboardingComplete && <Onboarding />}
            </>
          )}

          <AnimatePresence>
            {toast && (
              <motion.div
                role="status"
                variants={overlayDrop}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overlay-frame top-[calc(var(--safe-top)+14px)] z-[95] flex w-max max-w-[calc(100%-32px)] items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm font-medium shadow-[var(--shadow-sheet)]"
              >
                <CheckCircle2 size={16} className="text-success" />
                {toast}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </ChromeContext.Provider>
  );
}

function LaunchScreen() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={T.slow} className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground">BF</span>
        <span className="text-lg font-semibold tracking-tight">BodyFitness</span>
      </motion.div>
    </div>
  );
}
