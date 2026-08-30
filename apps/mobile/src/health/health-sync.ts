import { localDateKey } from "../lib/date";
import { useMobileStore } from "../store/mobile-store";
import { getNativeHealthStatus, readNativeSteps, requestNativeStepPermission } from "./native-health";

let activeRead: Promise<void> | null = null;

export function refreshNativeSteps(options: { requestPermission?: boolean } = {}) {
  if (activeRead) return activeRead;
  activeRead = runRefresh(options).finally(() => { activeRead = null; });
  return activeRead;
}

async function runRefresh({ requestPermission = false }: { requestPermission?: boolean }) {
  const store = useMobileStore.getState();
  try {
    const status = await getNativeHealthStatus();
    if (!status.available) {
      store.setHealthPermission("unavailable", status.message ?? null);
      return;
    }
    if (requestPermission) {
      const granted = await requestNativeStepPermission();
      if (!granted) {
        store.setHealthPermission("denied", "Step access was not granted. You can keep using manual steps.");
        return;
      }
    } else if (store.healthPermission !== "connected") {
      store.setHealthPermission("needs-permission", "Connect once to read daily steps. BodyFitness requests read-only step access.");
      return;
    }
    const result = await readNativeSteps();
    useMobileStore.getState().setProviderSteps({ date: localDateKey(), ...result, deviceId: store.deviceId, isManualOverride: false });
    useMobileStore.getState().setHealthPermission("connected", null);
  } catch (error) {
    useMobileStore.getState().setHealthPermission("error", error instanceof Error ? error.message : "Step sync failed.");
    throw error;
  }
}
