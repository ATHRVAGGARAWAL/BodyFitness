"use client";

import { useSyncExternalStore } from "react";
import type { Transition, Variants } from "framer-motion";

/**
 * Editorial motion: short, eased, functional. One curve, four durations.
 * `MotionConfig transition={T.base}` in the app shell makes this the default for
 * every `motion.*` element that does not set its own transition.
 */
export const EASE_OUT = [0.22, 0.61, 0.36, 1] as const;

export const T = {
  fast: { duration: 0.12, ease: EASE_OUT } satisfies Transition,
  base: { duration: 0.18, ease: EASE_OUT } satisfies Transition,
  slow: { duration: 0.26, ease: EASE_OUT } satisfies Transition,
  layout: { duration: 0.22, ease: EASE_OUT } satisfies Transition,
} as const;

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const overlayDrop: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const routeSwap: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
};

const query = "(prefers-reduced-motion: reduce)";
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";
const subscribe = (callback: () => void) => {
  if (!canMatch()) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

/** SSR- and jsdom-safe: reports `false` on the server, during hydration, and where matchMedia is absent. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => (canMatch() ? window.matchMedia(query).matches : false), () => false);
}

/** Collapses a transition to instant when the user prefers reduced motion. */
export function reduceable<TTransition extends Transition>(transition: TTransition, reduced: boolean): Transition {
  return reduced ? { duration: 0 } : transition;
}
