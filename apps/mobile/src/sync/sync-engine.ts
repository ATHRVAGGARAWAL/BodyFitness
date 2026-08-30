import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import { AppProfileSchema, CircleFeedSchema, SyncResponseSchema, type SyncRecord } from "@bodyfitness/contracts";
import { apiRequest } from "../api/client";
import { effectiveStepsForDate, pendingSyncRecords, useMobileStore } from "../store/mobile-store";

let activeSync: Promise<void> | null = null;

export function syncCloud(getToken: () => Promise<string | null>) {
  if (activeSync) return activeSync;
  activeSync = runSync(getToken).finally(() => { activeSync = null; });
  return activeSync;
}

export async function syncCloudWithToken(token: string) {
  return runSync(async () => token);
}

async function runSync(getToken: () => Promise<string | null>) {
  const store = useMobileStore.getState();
  const token = await getToken();
  if (!token) return;
  store.beginSync();
  try {
    await apiRequest("/v1/devices", { token, method: "POST", body: { id: store.deviceId, platform: Platform.OS === "ios" ? "ios" : "android", label: Platform.OS === "ios" ? "iPhone" : "Android phone", pushToken: store.pushToken } });
    const sent = pendingSyncRecords();
    const response = SyncResponseSchema.parse(await apiRequest("/v1/sync/batch", { token, method: "POST", body: { deviceId: store.deviceId, cursor: store.syncCursor, idempotencyKey: Crypto.randomUUID(), records: sent } }));
    useMobileStore.getState().finishSync({ ...response, sent });
    const profileWasSent = sent.some((record) => record.entity === "profile");
    const effective = effectiveStepsForDate();
    if (effective) await apiRequest("/v1/health/steps", { token, method: "POST", body: effective });
    const [profile, circle] = await Promise.all([
      profileWasSent
        ? apiRequest("/v1/me/profile", { token, method: "PUT", body: store.profile })
        : apiRequest("/v1/me/profile", { token }),
      apiRequest("/v1/circle", { token }),
    ]);
    useMobileStore.setState({ profile: AppProfileSchema.parse(profile), circle: CircleFeedSchema.parse(circle), syncStatus: "synced", syncError: null, lastSyncedAt: new Date().toISOString() });
  } catch (error) {
    useMobileStore.getState().failSync(error instanceof Error ? error.message : "Cloud sync failed");
    throw error;
  }
}

export async function createCircleInvite(token: string, handle?: string) {
  return apiRequest<{ id: string; token: string; inviteUrl: string; expiresAt: string }>("/v1/invites", { token, method: "POST", body: handle ? { handle } : {} });
}

export async function updateSharing(token: string, connectionId: string, body: Record<string, boolean>) {
  await apiRequest(`/v1/connections/${connectionId}/sharing`, { token, method: "PUT", body });
}

export async function removeCircleConnection(token: string, connectionId: string) {
  await apiRequest(`/v1/connections/${connectionId}`, { token, method: "DELETE" });
}

export async function acceptCircleInvite(token: string, inviteToken: string) {
  await apiRequest(`/v1/invites/${encodeURIComponent(inviteToken)}/accept`, { token, method: "POST" });
}

export async function deleteCloudAccount(token: string) {
  await apiRequest("/v1/me", { token, method: "DELETE" });
}

export function recordMap(records: SyncRecord[]) {
  return new Map(records.map((record) => [`${record.entity}:${record.entityId}`, record]));
}
