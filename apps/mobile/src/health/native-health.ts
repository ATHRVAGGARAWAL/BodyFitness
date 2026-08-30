import type { HealthSource } from "@bodyfitness/contracts";

export interface NativeHealthStatus {
  available: boolean;
  needsUpdate?: boolean;
  message?: string;
}

export interface NativeStepResult {
  steps: number;
  source: Exclude<HealthSource, "manual" | "cloud">;
  syncedAt: string;
}

export async function getNativeHealthStatus(): Promise<NativeHealthStatus> {
  return { available: false, message: "Native health data is unavailable on this platform." };
}

export async function requestNativeStepPermission() {
  return false;
}

export async function readNativeSteps(): Promise<NativeStepResult> {
  throw new Error("Native health data is unavailable on this platform.");
}
