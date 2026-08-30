import {
  AppProfileSchema,
  CircleFeedSchema,
  InviteSchema,
  StepSnapshotSchema,
  SyncEnvelopeSchema,
  SyncResponseSchema,
  type CircleFeed,
  type Invite,
  type AppProfile,
  type StepSnapshot,
  type SharingPolicy,
  type SyncEnvelope,
  type SyncRecord,
} from "@bodyfitness/contracts";
import type { BodyFitnessStore } from "@/lib/store";
import { uid } from "@/lib/utils";

export const cloudApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? null;
export const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function buildSyncEnvelope(state: BodyFitnessStore): SyncEnvelope {
  const updatedAt = new Date().toISOString();
  const candidates: Array<Omit<SyncRecord, "revision">> = [
    ...(state.onboardingComplete ? [
      { entity: "profile" as const, entityId: "fitness-profile", payload: { ...state.profile, account: state.account.profile }, updatedAt, deletedAt: null },
      { entity: "targets" as const, entityId: "nutrition-targets", payload: { ...state.targets }, updatedAt, deletedAt: null },
      { entity: "workout-plan" as const, entityId: "default-plan", payload: { days: state.workoutPlan }, updatedAt, deletedAt: null },
      { entity: "settings" as const, entityId: "preferences", payload: {
      themePreference: state.themePreference,
      habits: state.habits,
      flexDays: state.flexDays,
      restDefaults: state.restDefaults,
      sharingDefaults: state.account.sharingDefaults,
      selectedLiftId: state.selectedLiftId,
      }, updatedAt, deletedAt: null },
    ] : []),
    ...state.meals.map((meal) => ({ entity: "meal" as const, entityId: meal.id, payload: { ...meal }, updatedAt: meal.loggedAt, deletedAt: null })),
    ...Object.entries(state.dailyByDate).map(([date, daily]) =>
      ({ entity: "daily-wellness" as const, entityId: date, payload: { date, ...daily }, updatedAt: daily.stepSyncedAt ?? updatedAt, deletedAt: null }),
    ),
    ...state.sessions.map((session) => ({ entity: "workout-session" as const, entityId: session.id, payload: { ...session }, updatedAt: session.endedAt ?? session.startedAt, deletedAt: null })),
    ...state.setLogs.map((log) => ({ entity: "set-log" as const, entityId: log.id, payload: { ...log }, updatedAt: log.completedAt, deletedAt: null })),
    ...state.weightEntries.map((entry) => ({ entity: "weight-entry" as const, entityId: entry.id, payload: { ...entry }, updatedAt: `${entry.date}T12:00:00.000Z`, deletedAt: null })),
  ];
  const known = new Map(state.account.syncRecords.map((item) => [`${item.entity}:${item.entityId}`, item]));
  const records = candidates.flatMap((candidate) => {
    const previous = known.get(`${candidate.entity}:${candidate.entityId}`);
    if (previous && samePayload(previous.payload, candidate.payload) && previous.deletedAt === candidate.deletedAt) return [];
    return [{ ...candidate, revision: (previous?.revision ?? 0) + 1 }];
  });

  return SyncEnvelopeSchema.parse({
    deviceId: state.account.deviceId,
    cursor: state.account.syncCursor,
    idempotencyKey: uid("sync"),
    records,
  });
}

function samePayload(left: Record<string, unknown>, right: Record<string, unknown>) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function apiRequest<T>(
  path: string,
  token: string,
  init: RequestInit,
  parse: (value: unknown) => T,
): Promise<T> {
  if (!cloudApiBaseUrl) throw new Error("Cloud API is not configured");
  const response = await fetch(`${cloudApiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body
      ? String(body.message)
      : `Cloud request failed (${response.status})`;
    throw new Error(message);
  }
  return parse(body);
}

export function syncCloud(token: string, envelope: SyncEnvelope) {
  return apiRequest("/v1/sync/batch", token, {
    method: "POST",
    body: JSON.stringify(envelope),
  }, (value) => SyncResponseSchema.parse(value));
}

export function fetchCloudProfile(token: string): Promise<AppProfile> {
  return apiRequest("/v1/me/profile", token, { method: "GET" }, (value) => AppProfileSchema.parse(value));
}

export function updateCloudProfile(token: string, profile: AppProfile): Promise<AppProfile> {
  return apiRequest("/v1/me/profile", token, { method: "PUT", body: JSON.stringify(profile) }, (value) => AppProfileSchema.parse(value));
}

export function uploadStepSnapshot(token: string, snapshot: StepSnapshot): Promise<StepSnapshot> {
  const body = StepSnapshotSchema.parse(snapshot);
  return apiRequest("/v1/health/steps", token, { method: "POST", body: JSON.stringify(body) }, (value) => StepSnapshotSchema.parse(value));
}

export function fetchCircle(token: string): Promise<CircleFeed> {
  return apiRequest("/v1/circle", token, { method: "GET" }, (value) => CircleFeedSchema.parse(value));
}

export function createInvite(token: string, handle?: string): Promise<Invite> {
  return apiRequest("/v1/invites", token, {
    method: "POST",
    body: JSON.stringify(handle ? { handle } : {}),
  }, (value) => InviteSchema.parse(value));
}

export async function acceptInvite(token: string, inviteToken: string) {
  return apiRequest(`/v1/invites/${encodeURIComponent(inviteToken)}/accept`, token, {
    method: "POST",
  }, (value) => value as { connectionId: string });
}

export async function updateConnectionSharing(
  token: string,
  connectionId: string,
  sharing: SharingPolicy,
) {
  return apiRequest(`/v1/connections/${encodeURIComponent(connectionId)}/sharing`, token, {
    method: "PUT",
    body: JSON.stringify(sharing),
  }, (value) => value as { ok: true });
}

export async function removeConnection(token: string, connectionId: string) {
  return apiRequest(`/v1/connections/${encodeURIComponent(connectionId)}`, token, {
    method: "DELETE",
  }, (value) => value as { ok: true });
}

export async function deleteCloudAccount(token: string) {
  return apiRequest("/v1/me", token, { method: "DELETE" }, (value) => value as { ok: true });
}
