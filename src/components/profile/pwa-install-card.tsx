"use client";

import { Download, Share } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Install the web app</CardTitle>
          <CardDescription>
            {ios ? "In Safari, tap Share and then Add to Home Screen for the full-screen iPhone experience." : "Install BodyFitness from your browser menu for faster launch and offline access."}
          </CardDescription>
        </div>
        <span className="icon-tile"><Download size={16} aria-hidden="true" /></span>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          <Share size={14} aria-hidden="true" />
          {ios ? "Share → Add to Home Screen" : "Browser menu → Install app"}
        </div>
      </CardContent>
    </Card>
  );
}
