import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppAuth } from "../auth/auth-provider";
import { syncCloud } from "../sync/sync-engine";
import { useMobileStore } from "../store/mobile-store";
import { registerHealthBackgroundTask } from "./background-task";
import { refreshNativeSteps } from "./health-sync";

export function HealthSyncProvider() {
  const auth = useAppAuth();
  const hydrated = useMobileStore((state) => state.hydrated);
  const healthPermission = useMobileStore((state) => state.healthPermission);

  useEffect(() => {
    if (!hydrated) return;
    const refresh = async () => {
      if (useMobileStore.getState().healthPermission === "connected") await refreshNativeSteps().catch(() => undefined);
      if (auth.signedIn) await syncCloud(auth.getToken).catch(() => undefined);
    };
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void refresh(); });
    return () => subscription.remove();
  }, [auth.getToken, auth.signedIn, hydrated]);

  useEffect(() => {
    if (healthPermission === "connected") void registerHealthBackgroundTask();
  }, [healthPermission]);

  return null;
}
