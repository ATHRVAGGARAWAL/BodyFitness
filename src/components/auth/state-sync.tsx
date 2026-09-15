"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/components/auth/session-provider";
import { fetchState, pushState, StateConflict } from "@/lib/auth/client";
import { mergeStates, normalizeOrder, serializableState } from "@/lib/auth/merge-state";
import { useBodyFitnessStore } from "@/lib/store";

const PUSH_DEBOUNCE_MS = 1_500;

/**
 * Keeps the signed-in user's state in Postgres. On sign-in: pull, merge with the
 * device copy, write back. Afterwards: debounce every store change into a PUT.
 * Renders nothing.
 */
export function StateSync() {
  const { status, user, setSync } = useSession();
  const hydrated = useBodyFitnessStore((state) => state.hydrated);
  const revision = useRef<number | null>(null);
  const applyingRemote = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "signed-in" || !user || !hydrated) return;
    let cancelled = false;

    const applyRemote = (remote: Record<string, unknown>) => {
      applyingRemote.current = true;
      const local = serializableState(useBodyFitnessStore.getState() as unknown as Record<string, unknown>);
      const merged = normalizeOrder(mergeStates(remote, { ...local, hydrated: true }));
      useBodyFitnessStore.setState(merged as never);
      applyingRemote.current = false;
    };

    const push = async () => {
      if (cancelled) return;
      setSync("syncing");
      const snapshot = serializableState(useBodyFitnessStore.getState() as unknown as Record<string, unknown>);
      try {
        const saved = await pushState(snapshot, revision.current);
        revision.current = saved.revision;
        if (!cancelled) setSync("synced", null, saved.updatedAt);
      } catch (error) {
        if (error instanceof StateConflict) {
          if (error.remote.state) applyRemote(error.remote.state);
          revision.current = error.remote.revision;
          // Re-push the merged result so both sides converge.
          const merged = serializableState(useBodyFitnessStore.getState() as unknown as Record<string, unknown>);
          try {
            const saved = await pushState(merged, revision.current);
            revision.current = saved.revision;
            if (!cancelled) setSync("synced", null, saved.updatedAt);
          } catch (again) {
            if (!cancelled) setSync("error", again instanceof Error ? again.message : "Sync failed.");
          }
          return;
        }
        if (!cancelled) setSync(navigator.onLine ? "error" : "offline", error instanceof Error ? error.message : "Sync failed.");
      }
    };

    const schedule = () => {
      if (applyingRemote.current) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void push(); }, PUSH_DEBOUNCE_MS);
    };

    const initial = async () => {
      setSync("syncing");
      try {
        const remote = await fetchState();
        if (cancelled) return;
        revision.current = remote.revision;
        if (remote.state) applyRemote(remote.state);
        await push();
      } catch (error) {
        if (!cancelled) setSync(navigator.onLine ? "error" : "offline", error instanceof Error ? error.message : "Could not load your data.");
      }
    };

    void initial();
    const unsubscribe = useBodyFitnessStore.subscribe(schedule);
    const onOnline = () => { void push(); };
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("online", onOnline);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [hydrated, setSync, status, user]);

  return null;
}
