"use client";

import { Download, Share } from "lucide-react";
import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => undefined;

function subscribeToStandalone(callback: () => void) {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export function PwaInstallCard() {
  const ios = useSyncExternalStore(noopSubscribe, () => /iPad|iPhone|iPod/.test(navigator.userAgent), () => false);
  const standalone = useSyncExternalStore(subscribeToStandalone, () => window.matchMedia("(display-mode: standalone)").matches, () => false);

  if (standalone) return null;
  return (
    <div className="panel p-4">
      <div className="flex items-start gap-3">
        <span className="icon-tile text-[var(--steps)]"><Download size={18} /></span>
        <div>
          <p className="m-0 text-sm font-black">Install the web app</p>
          <p className="mt-1 text-[11px] leading-4 text-white/40">
            {ios ? "In Safari, tap Share and then Add to Home Screen for the full-screen iPhone experience." : "Install BodyFitness from your browser menu for faster launch and offline access."}
          </p>
        </div>
      </div>
      {ios ? <div className="mt-3 flex items-center gap-2 rounded-[13px] bg-[var(--surface-soft)] p-3 text-[10px] font-bold text-white/50"><Share size={15} /> Share → Add to Home Screen</div> : null}
    </div>
  );
}
