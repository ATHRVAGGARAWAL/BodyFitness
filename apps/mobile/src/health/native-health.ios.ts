import { isHealthDataAvailable, queryStatisticsForQuantity, requestAuthorization } from "@kingstinct/react-native-healthkit";
import { localDayRange } from "../lib/date";
import type { NativeHealthStatus, NativeStepResult } from "./native-health";
import { normalizeAggregatedSteps } from "./step-values";

const stepType = "HKQuantityTypeIdentifierStepCount" as const;

export async function getNativeHealthStatus(): Promise<NativeHealthStatus> {
  const available = isHealthDataAvailable();
  return { available, message: available ? undefined : "Apple Health is unavailable on this iPhone." };
}

export async function requestNativeStepPermission() {
  return requestAuthorization({ toRead: [stepType] });
}

export async function readNativeSteps(): Promise<NativeStepResult> {
  const { start, end } = localDayRange();
  const result = await queryStatisticsForQuantity(stepType, ["cumulativeSum"], {
    unit: "count",
    filter: { date: { startDate: start, endDate: end, strictStartDate: true, strictEndDate: true } },
  });
  return { steps: normalizeAggregatedSteps(result.sumQuantity?.quantity), source: "apple-health", syncedAt: new Date().toISOString() };
}
