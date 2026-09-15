"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCloudAccount } from "@/lib/cloud-sync";
import { useBodyFitnessStore } from "@/lib/store";

export function AccountDataControls({ enabled }: { enabled: boolean }) {
  return (
    <div className="grid gap-2">
      <ExportButton />
      {enabled ? <CloudDeleteButton /> : null}
    </div>
  );
}

function ExportButton() {
  const exportData = () => {
    const state = useBodyFitnessStore.getState();
    const { hydrated, ...data } = state;
    void hydrated;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `bodyfitness-export-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="secondary" block onClick={exportData}>
      <Download /> Export my data
    </Button>
  );
}

function CloudDeleteButton() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const resetAll = useBodyFitnessStore((state) => state.resetAll);
  if (!isLoaded || !isSignedIn) return null;
  const remove = async () => {
    if (!window.confirm("Permanently delete your BodyFitness cloud account and synced data? This cannot be undone.")) return;
    const token = await getToken();
    if (!token) throw new Error("No active session");
    await deleteCloudAccount(token);
    await user?.delete();
    resetAll();
  };
  return (
    <Button
      variant="outline"
      block
      className="text-destructive hover:text-destructive"
      onClick={() => void remove().catch((error) => window.alert(error instanceof Error ? error.message : "Account deletion failed."))}
    >
      <Trash2 /> Delete cloud account
    </Button>
  );
}
