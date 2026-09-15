"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe media query. The server snapshot is `false`, which on `md`-style queries
 * means "mobile first" during hydration and avoids markup mismatches.
 */
const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

export function useMediaQuery(query: string, serverValue = false) {
  return useSyncExternalStore(
    (callback) => {
      if (!canMatch()) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => (canMatch() ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

export const BREAKPOINT_MD = "(min-width: 768px)";
export const BREAKPOINT_LG = "(min-width: 1024px)";

export function useIsDesktop() {
  return useMediaQuery(BREAKPOINT_MD);
}
