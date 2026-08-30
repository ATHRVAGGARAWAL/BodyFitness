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
    <div className="glass fixed bottom-[calc(88px+var(--safe-bottom))] left-1/2 z-[80] flex w-[calc(min(100%,430px)-32px)] -translate-x-1/2 items-center gap-3 rounded-[18px] p-3">
      <span className="icon-tile text-[var(--accent-strong)]"><RefreshCw size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="m-0 text-xs font-black">Update ready</p>
        <p className="mt-1 text-[10px] text-white/38">Reload for the latest BodyFitness build.</p>
      </div>
      <button
        className="primary-action pressable min-h-11 rounded-[12px] px-3 text-[10px] font-black"
        onClick={() => waiting.postMessage({ type: "SKIP_WAITING" })}
      >
        Reload
      </button>
    </div>
  );
}
