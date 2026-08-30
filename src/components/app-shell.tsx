"use client";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
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
import { ServiceWorkerManager } from "@/components/service-worker-manager";
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
      const resolved = themePreference === "system"
        ? (media.matches ? "dark" : "light")
        : themePreference;
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        "content",
        resolved === "dark" ? "#09090d" : "#f2f1f7",
      );
    };

    applyTheme();
    media.addEventListener("change", applyTheme);
    return () => media.removeEventListener("change", applyTheme);
  }, [hydrated, themePreference]);

  const context = useMemo(
    () => ({ cameraActive, setCameraActive, showToast }),
    [cameraActive, showToast],
  );

  return (
    <ChromeContext.Provider value={context}>
      <MotionConfig reducedMotion="user">
      <div className={`app-frame ${hydrated && !onboardingComplete ? "h-[100dvh] overflow-hidden" : ""}`}>
        {!hydrated ? (
          <LaunchScreen />
        ) : (
          <>
            <RestTimerPill />
            <ServiceWorkerManager />
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ type: "spring", stiffness: 420, damping: 38 }}
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
              initial={{ y: -18, opacity: 0, scale: 0.94 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -12, opacity: 0, scale: 0.96 }}
              className="glass fixed left-1/2 top-[calc(var(--safe-top)+14px)] z-[90] flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 items-center gap-2.5 rounded-[17px] px-3.5 py-3 text-[12px] font-semibold"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                <CheckCircle2 size={16} strokeWidth={2.4} />
              </span>
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-black">
      <motion.div
        initial={{ scale: 0.86, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        className="relative grid h-24 w-24 grid-cols-2 gap-2 rounded-[26px] border border-white/10 bg-white/[0.045] p-3"
      >
        <span className="rounded-[10px] bg-[var(--accent)]" />
        <span className="rounded-[10px] bg-[var(--protein)]" />
        <span className="rounded-[10px] bg-[var(--steps)]" />
        <span className="flex items-center justify-center rounded-[10px] bg-white text-[11px] font-black text-black">BF</span>
      </motion.div>
    </div>
  );
}
