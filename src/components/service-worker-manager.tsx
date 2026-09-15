"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function ServiceWorkerManager() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "development") {
      void Promise.all([
        navigator.serviceWorker.getRegistrations().then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        ),
        "caches" in window
          ? caches.keys().then((keys) =>
              Promise.all(
                keys
                  .filter((key) => /serwist|workbox|bodyfitness/i.test(key))
                  .map((key) => caches.delete(key)),
              ),
            )
          : Promise.resolve([]),
      ]);
      return;
    }

    let disposed = false;
    void navigator.serviceWorker.ready.then((registration) => {
      if (disposed) return;
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        installing?.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(registration.waiting ?? installing);
          }
        });
      });
      void registration.update();
    });

    const reload = () => window.location.reload();
    navigator.serviceWorker.addEventListener("controllerchange", reload);
    return () => {
      disposed = true;
      navigator.serviceWorker.removeEventListener("controllerchange", reload);
    };
  }, []);

  if (!waiting) return null;
  return (
    <div role="status" className="overlay-frame bottom-[calc(var(--dock-height)+24px+var(--safe-bottom))] z-[80] flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-sheet)]">
      <span className="icon-tile"><RefreshCw size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Update ready</p>
        <p className="text-xs text-muted-foreground">Reload for the latest BodyFitness build.</p>
      </div>
      <button className="primary-action pressable" onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}>
        Reload
      </button>
    </div>
  );
}
