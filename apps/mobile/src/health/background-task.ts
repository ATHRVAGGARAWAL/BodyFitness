import * as BackgroundTask from "expo-background-task";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import { BACKGROUND_TOKEN_KEY } from "../auth/auth-provider";
import { syncCloudWithToken } from "../sync/sync-engine";
import { useMobileStore } from "../store/mobile-store";
import { refreshNativeSteps } from "./health-sync";

export const HEALTH_BACKGROUND_TASK = "bodyfitness-health-refresh";

if (!TaskManager.isTaskDefined(HEALTH_BACKGROUND_TASK)) {
  TaskManager.defineTask(HEALTH_BACKGROUND_TASK, async () => {
    try {
      await useMobileStore.persist.rehydrate();
      if (useMobileStore.getState().healthPermission === "connected") await refreshNativeSteps();
      const token = await SecureStore.getItemAsync(BACKGROUND_TOKEN_KEY);
      if (token) await syncCloudWithToken(token);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

export async function registerHealthBackgroundTask() {
  if (!(await TaskManager.isAvailableAsync())) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(HEALTH_BACKGROUND_TASK))) {
    await BackgroundTask.registerTaskAsync(HEALTH_BACKGROUND_TASK, { minimumInterval: 60 });
  }
  return true;
}
