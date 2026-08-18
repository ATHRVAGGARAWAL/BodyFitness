"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BottomTabBar } from "@/components/bottom-tab-bar";
import { Onboarding } from "@/components/onboarding";
import { RestTimerPill } from "@/components/rest-timer-pill";
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
  const [cameraActive, setCameraActive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  useEffect(() => {
    if (useBodyFitnessStore.persist.hasHydrated()) {
      useBodyFitnessStore.getState().setHydrated(true);
    }
  }, []);

  const context = useMemo(
    () => ({ cameraActive, setCameraActive, showToast }),
    [cameraActive, showToast],
  );

  return (
    <ChromeContext.Provider value={context}>
      <div className={`app-frame ${hydrated && !onboardingComplete ? "h-[100dvh] overflow-hidden" : ""}`}>
        <div aria-hidden className="ambient-layer">
          <div className="ambient-orb ambient-orb--blue" />
          <div className="ambient-orb ambient-orb--violet" />
          <div className="ambient-orb ambient-orb--rose" />
          <div className="ambient-grid" />
        </div>
        {!hydrated ? (
          <LaunchScreen />
        ) : (
          <>
            <RestTimerPill />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 9, scale: 0.992, filter: "blur(5px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -5, scale: 0.996, filter: "blur(3px)" }}
                transition={{ type: "spring", stiffness: 390, damping: 36, mass: 0.8 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
            <AnimatePresence>
              {!cameraActive && <BottomTabBar />}
            </AnimatePresence>
            {!onboardingComplete && <Onboarding />}
          </>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ y: 18, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 12, opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 480, damping: 31 }}
              className="glass fixed left-1/2 z-[90] flex w-max max-w-[calc(100%-40px)] -translate-x-1/2 items-center gap-2.5 rounded-full px-4 py-2.5 text-[13px] font-semibold shadow-[0_18px_60px_rgba(0,0,0,.6)]"
              style={{ bottom: cameraActive ? 26 : "calc(94px + var(--safe-bottom))" }}
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-[#30d158] shadow-[0_0_12px_#30d158]" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ChromeContext.Provider>
  );
}

function LaunchScreen() {
  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center bg-black">
      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative h-28 w-28"
      >
        {["#ff375f", "#b6ff2e", "#64d2ff"].map((color, index) => (
          <div
            key={color}
            className="absolute rounded-full border-[8px] shadow-[0_0_24px_currentColor]"
            style={{ inset: index * 14, borderColor: color, color }}
          />
        ))}
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="mt-7 text-center">
        <p className="m-0 text-[21px] font-bold tracking-[-0.04em]">BodyFitness</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/28">Recompose intelligently</p>
      </motion.div>
    </div>
  );
}
