import { aggregateRecord, getSdkStatus, initialize, requestPermission, SdkAvailabilityStatus } from "react-native-health-connect";
import { localDayRange } from "../lib/date";
import type { NativeHealthStatus, NativeStepResult } from "./native-health";
import { normalizeAggregatedSteps } from "./step-values";

export async function getNativeHealthStatus(): Promise<NativeHealthStatus> {
  const status = await getSdkStatus();
  if (status === SdkAvailabilityStatus.SDK_AVAILABLE) return { available: true };
  if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return { available: false, needsUpdate: true, message: "Install or update Health Connect, then return to BodyFitness." };
  return { available: false, message: "Health Connect is not available on this Android device." };
}

export async function requestNativeStepPermission() {
  if (!(await initialize())) return false;
  const granted = await requestPermission([{ accessType: "read", recordType: "Steps" }]);
  return granted.some((item) => item.accessType === "read" && item.recordType === "Steps");
}

export async function readNativeSteps(): Promise<NativeStepResult> {
  if (!(await initialize())) throw new Error("Health Connect could not be initialized.");
  const { start, end } = localDayRange();
  const result = await aggregateRecord({ recordType: "Steps", timeRangeFilter: { operator: "between", startTime: start.toISOString(), endTime: end.toISOString() } });
  return { steps: normalizeAggregatedSteps(result.COUNT_TOTAL), source: "health-connect", syncedAt: new Date().toISOString() };
}
