"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { Download, Trash2 } from "lucide-react";
import { deleteCloudAccount } from "@/lib/cloud-sync";
import { useBodyFitnessStore } from "@/lib/store";

export function AccountDataControls({ enabled }: { enabled: boolean }) {
  return <div className="mt-3 grid gap-3"><ExportButton />{enabled ? <CloudDeleteButton /> : null}</div>;
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
  return <button onClick={exportData} className="secondary-action pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] text-sm font-bold"><Download size={16} /> Export my data</button>;
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
  return <button onClick={() => void remove().catch((error) => window.alert(error instanceof Error ? error.message : "Account deletion failed."))} className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[color-mix(in_srgb,var(--danger)_25%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] text-sm font-bold text-[var(--danger)]"><Trash2 size={16} /> Delete cloud account</button>;
}
