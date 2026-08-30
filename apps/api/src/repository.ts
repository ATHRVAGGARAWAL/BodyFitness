import { randomBytes, randomUUID } from "node:crypto";
import {
  AppProfileSchema,
  SharingPolicySchema,
  type Achievement,
  type AppProfile,
  type CircleFeed,
  type CircleMember,
  type Invite,
  type SharingPolicy,
  type StepSnapshot,
  type SyncEnvelope,
  type SyncRecord,
  type SyncResponse,
} from "@bodyfitness/contracts";
import { deriveAchievements } from "@bodyfitness/core";

const defaultSharing: SharingPolicy = SharingPolicySchema.parse({});

export interface DeviceInput {
  id: string;
  platform: "web" | "ios" | "android";
  label: string;
  pushToken?: string | null;
}

export interface Repository {
  ensureUser(userId: string): Promise<AppProfile>;
  getProfile(userId: string): Promise<AppProfile>;
  updateProfile(userId: string, profile: AppProfile): Promise<AppProfile>;
  sync(userId: string, envelope: SyncEnvelope): Promise<SyncResponse>;
  registerDevice(userId: string, input: DeviceInput): Promise<void>;
  upsertSteps(userId: string, snapshot: StepSnapshot): Promise<StepSnapshot>;
  getSteps(userId: string, date?: string): Promise<StepSnapshot[]>;
  getAchievements(userId: string): Promise<Achievement[]>;
  createInvite(userId: string, handle: string | undefined, webAppUrl: string): Promise<Invite>;
  acceptInvite(userId: string, token: string): Promise<{ connectionId: string }>;
  getCircle(userId: string): Promise<CircleFeed>;
  updateSharing(userId: string, connectionId: string, policy: SharingPolicy): Promise<void>;
  removeConnection(userId: string, connectionId: string): Promise<void>;
  blockConnection(userId: string, connectionId: string): Promise<void>;
  reportUser(userId: string, reportedUserId: string, reason: string): Promise<void>;
  deleteAccount(userId: string): Promise<void>;
}

interface StoredConnection {
  id: string;
  userAId: string;
  userBId: string;
  status: "accepted" | "blocked";
  connectedAt: string;
}

interface StoredInvite {
  id: string;
  token: string;
  creatorId: string;
  targetHandle?: string;
  expiresAt: string;
  acceptedAt: string | null;
}

interface StoredSummary {
  date: string;
  steps: number;
  stepTarget: number;
  workoutCompleted: boolean;
  streakDays: number;
  source: StepSnapshot["source"] | null;
  syncedAt: string | null;
}

export class MemoryRepository implements Repository {
  readonly users = new Map<string, AppProfile>();
  readonly records = new Map<string, SyncRecord>();
  readonly recordServerUpdatedAt = new Map<string, number>();
  readonly syncResponses = new Map<string, SyncResponse>();
  readonly connections = new Map<string, StoredConnection>();
  readonly sharing = new Map<string, SharingPolicy>();
  readonly invites = new Map<string, StoredInvite>();
  readonly summaries = new Map<string, StoredSummary>();
  readonly achievements = new Map<string, Achievement[]>();
  readonly steps = new Map<string, StepSnapshot>();
  readonly devices = new Map<string, DeviceInput & { userId: string }>();
  readonly reports: Array<{ reporterId: string; reportedUserId: string; reason: string }> = [];

  async ensureUser(userId: string) {
    const current = this.users.get(userId);
    if (current) return current;
    const profile = AppProfileSchema.parse({
      displayName: "Athlete",
      handle: this.uniqueHandle(`athlete_${userId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "")}`),
      birthDate: null,
      timezone: "UTC",
      primaryStepSource: null,
    });
    this.users.set(userId, profile);
    return profile;
  }

  async getProfile(userId: string) {
    return this.ensureUser(userId);
  }

  async updateProfile(userId: string, input: AppProfile) {
    const profile = AppProfileSchema.parse(input);
    if (profile.birthDate && ageFromBirthDate(profile.birthDate) < 13) {
      throw new RepositoryError("AGE_RESTRICTED", "BodyFitness accounts require age 13+", 422);
    }
    const collision = [...this.users.entries()].find(([id, item]) => id !== userId && item.handle === profile.handle);
    if (collision) throw new RepositoryError("HANDLE_TAKEN", "That handle is already in use", 409);
    this.users.set(userId, profile);
    return profile;
  }

  async sync(userId: string, envelope: SyncEnvelope): Promise<SyncResponse> {
    await this.ensureUser(userId);
    const idempotencyId = `${userId}:${envelope.idempotencyKey}`;
    const existingResponse = this.syncResponses.get(idempotencyId);
    if (existingResponse) return existingResponse;

    const accepted: string[] = [];
    const conflicts: SyncRecord[] = [];
    for (const record of envelope.records) {
      const key = recordKey(userId, record);
      const existing = this.records.get(key);
      if (existing && existing.revision > record.revision) {
        conflicts.push(existing);
        continue;
      }
      this.records.set(key, record);
      this.recordServerUpdatedAt.set(key, Date.now());
      accepted.push(`${record.entity}:${record.entityId}`);
    }
    await this.refreshDerivedData(userId);
    const syncedAt = new Date().toISOString();
    const cursorDate = envelope.cursor ? new Date(envelope.cursor).getTime() : 0;
    const remote = [...this.records.entries()]
      .filter(([key]) => key.startsWith(`${userId}:`) && (this.recordServerUpdatedAt.get(key) ?? 0) > cursorDate)
      .map(([, record]) => record);
    const response: SyncResponse = { cursor: syncedAt, accepted, conflicts, remote, syncedAt };
    this.syncResponses.set(idempotencyId, response);
    return response;
  }

  async registerDevice(userId: string, input: DeviceInput) {
    await this.ensureUser(userId);
    this.devices.set(input.id, { ...input, userId });
  }

  async upsertSteps(userId: string, snapshot: StepSnapshot) {
    await this.ensureUser(userId);
    this.steps.set(`${userId}:${snapshot.date}:${snapshot.source}`, snapshot);
    const profile = this.users.get(userId)!;
    if (!profile.primaryStepSource || snapshot.isManualOverride || profile.primaryStepSource === "manual") {
      this.users.set(userId, { ...profile, primaryStepSource: snapshot.source });
    }
    const primarySource = this.users.get(userId)!.primaryStepSource;
    if (primarySource !== snapshot.source) return snapshot;
    const targets = this.getTargetSteps(userId);
    const current = this.summaries.get(`${userId}:${snapshot.date}`);
    this.summaries.set(`${userId}:${snapshot.date}`, {
      date: snapshot.date,
      steps: snapshot.steps,
      stepTarget: targets,
      workoutCompleted: current?.workoutCompleted ?? false,
      streakDays: current?.streakDays ?? 0,
      source: snapshot.source,
      syncedAt: snapshot.syncedAt,
    });
    await this.refreshDerivedData(userId);
    return snapshot;
  }

  async getSteps(userId: string, date?: string) {
    await this.ensureUser(userId);
    return [...this.steps.entries()]
      .filter(([key, snapshot]) => key.startsWith(`${userId}:`) && (!date || snapshot.date === date))
      .map(([, snapshot]) => snapshot)
      .sort((a, b) => b.syncedAt.localeCompare(a.syncedAt));
  }

  async getAchievements(userId: string) {
    await this.ensureUser(userId);
    return this.achievements.get(userId) ?? [];
  }

  async createInvite(userId: string, handle: string | undefined, webAppUrl: string) {
    await this.ensureUser(userId);
    if (handle) {
      const target = [...this.users.values()].find((profile) => profile.handle === handle);
      if (!target) throw new RepositoryError("HANDLE_NOT_FOUND", "No private profile matches that exact handle", 404);
    }
    const token = randomBytes(24).toString("base64url");
    const stored: StoredInvite = {
      id: randomUUID(),
      token,
      creatorId: userId,
      targetHandle: handle,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      acceptedAt: null,
    };
    this.invites.set(token, stored);
    return {
      id: stored.id,
      token,
      inviteUrl: `${webAppUrl.replace(/\/$/, "")}/profile/circle/invite/${token}`,
      expiresAt: stored.expiresAt,
    };
  }

  async acceptInvite(userId: string, token: string) {
    await this.ensureUser(userId);
    const invite = this.invites.get(token);
    if (!invite || invite.acceptedAt || new Date(invite.expiresAt).getTime() <= Date.now()) {
      throw new RepositoryError("INVITE_INVALID", "This invite is invalid or has expired", 410);
    }
    if (invite.creatorId === userId) throw new RepositoryError("INVITE_SELF", "You cannot accept your own invite", 409);
    const profile = this.users.get(userId)!;
    if (invite.targetHandle && invite.targetHandle !== profile.handle) {
      throw new RepositoryError("INVITE_TARGET", "This invitation was created for another handle", 403);
    }
    const [userAId, userBId] = [invite.creatorId, userId].sort();
    const existing = [...this.connections.values()].find((item) => item.userAId === userAId && item.userBId === userBId);
    if (existing?.status === "blocked") throw new RepositoryError("CONNECTION_BLOCKED", "This connection is blocked", 403);
    const connection = existing ?? { id: randomUUID(), userAId, userBId, status: "accepted" as const, connectedAt: new Date().toISOString() };
    this.connections.set(connection.id, { ...connection, status: "accepted" });
    this.sharing.set(sharingKey(connection.id, invite.creatorId), { ...defaultSharing });
    this.sharing.set(sharingKey(connection.id, userId), { ...defaultSharing });
    invite.acceptedAt = new Date().toISOString();
    return { connectionId: connection.id };
  }

  async getCircle(userId: string): Promise<CircleFeed> {
    await this.ensureUser(userId);
    const members: CircleMember[] = [];
    for (const connection of this.connections.values()) {
      if (connection.status !== "accepted" || (connection.userAId !== userId && connection.userBId !== userId)) continue;
      const otherId = connection.userAId === userId ? connection.userBId : connection.userAId;
      const other = await this.ensureUser(otherId);
      const outgoing = this.sharing.get(sharingKey(connection.id, userId)) ?? defaultSharing;
      const incoming = this.sharing.get(sharingKey(connection.id, otherId)) ?? defaultSharing;
      const latest = [...this.summaries.entries()]
        .filter(([key]) => key.startsWith(`${otherId}:`))
        .map(([, summary]) => summary)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      const summary = latest && incoming.goalProgress ? {
        userId: otherId,
        date: latest.date,
        steps: incoming.exactSteps ? latest.steps : null,
        stepGoalPercent: latest.stepTarget ? Math.min(10, latest.steps / latest.stepTarget) : 0,
        workoutCompleted: incoming.workoutSummaries ? latest.workoutCompleted : false,
        streakDays: latest.streakDays,
        source: incoming.exactSteps ? latest.source : null,
        syncedAt: latest.syncedAt,
      } : null;
      members.push({
        connection: {
          id: connection.id,
          userId: otherId,
          displayName: other.displayName,
          handle: other.handle,
          avatarUrl: null,
          status: "accepted",
          connectedAt: connection.connectedAt,
          sharing: outgoing,
        },
        summary,
        achievements: incoming.achievements ? (this.achievements.get(otherId) ?? []).slice(0, 20) : [],
      });
    }
    return {
      members,
      pendingInvites: [...this.invites.values()].filter((item) => item.creatorId === userId && !item.acceptedAt && new Date(item.expiresAt).getTime() > Date.now()).length,
      generatedAt: new Date().toISOString(),
    };
  }

  async updateSharing(userId: string, connectionId: string, policy: SharingPolicy) {
    const connection = this.connectionForUser(userId, connectionId);
    this.sharing.set(sharingKey(connection.id, userId), SharingPolicySchema.parse(policy));
  }

  async removeConnection(userId: string, connectionId: string) {
    const connection = this.connectionForUser(userId, connectionId);
    this.connections.delete(connection.id);
    this.sharing.delete(sharingKey(connection.id, connection.userAId));
    this.sharing.delete(sharingKey(connection.id, connection.userBId));
  }

  async blockConnection(userId: string, connectionId: string) {
    const connection = this.connectionForUser(userId, connectionId);
    this.connections.set(connection.id, { ...connection, status: "blocked" });
  }

  async reportUser(userId: string, reportedUserId: string, reason: string) {
    await this.ensureUser(userId);
    await this.ensureUser(reportedUserId);
    this.reports.push({ reporterId: userId, reportedUserId, reason });
  }

  async deleteAccount(userId: string) {
    this.users.delete(userId);
    for (const key of [...this.records.keys()]) if (key.startsWith(`${userId}:`)) { this.records.delete(key); this.recordServerUpdatedAt.delete(key); }
    for (const [id, connection] of this.connections) if (connection.userAId === userId || connection.userBId === userId) this.connections.delete(id);
  }

  private async refreshDerivedData(userId: string) {
    const dailyRecords = [...this.records.entries()]
      .filter(([key, record]) => key.startsWith(`${userId}:`) && record.entity === "daily-wellness")
      .map(([, record]) => record);
    const setLogs = [...this.records.entries()]
      .filter(([key, record]) => key.startsWith(`${userId}:`) && record.entity === "set-log")
      .map(([, record]) => record);
    const workoutDates = new Set(setLogs.map((record) => String(record.payload.completedAt ?? "").slice(0, 10)).filter(Boolean));
    const target = this.getTargetSteps(userId);
    const sorted = dailyRecords.sort((a, b) => a.entityId.localeCompare(b.entityId));
    let streak = 0;
    const primarySource = this.users.get(userId)?.primaryStepSource;
    for (const daily of sorted) {
      const steps = Number(daily.payload.steps ?? 0);
      const source = typeof daily.payload.stepSource === "string" ? daily.payload.stepSource as StepSnapshot["source"] : "manual";
      if (primarySource && source !== primarySource) continue;
      streak = steps >= target ? streak + 1 : 0;
      this.summaries.set(`${userId}:${daily.entityId}`, {
        date: daily.entityId,
        steps,
        stepTarget: target,
        workoutCompleted: workoutDates.has(daily.entityId),
        streakDays: streak,
        source,
        syncedAt: String(daily.payload.stepSyncedAt ?? daily.updatedAt),
      });
      const result = deriveAchievements({
        userId,
        date: daily.entityId,
        steps,
        stepTarget: target,
        currentStepStreak: streak,
        workoutCount: workoutDates.size,
        personalRecords: setLogs.filter((record) => Boolean(record.payload.isPr)).map((record) => ({ id: record.entityId, name: String(record.payload.exerciseName ?? "strength"), achievedAt: String(record.payload.completedAt ?? record.updatedAt) })),
      });
      const current = this.achievements.get(userId) ?? [];
      const merged = new Map([...current, ...result].map((item) => [item.id, item]));
      this.achievements.set(userId, [...merged.values()].sort((a, b) => b.achievedAt.localeCompare(a.achievedAt)));
    }
  }

  private getTargetSteps(userId: string) {
    const target = this.records.get(`${userId}:targets:nutrition-targets`);
    return Math.max(1, Number(target?.payload.steps ?? 10000));
  }

  private connectionForUser(userId: string, connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection || (connection.userAId !== userId && connection.userBId !== userId)) {
      throw new RepositoryError("CONNECTION_NOT_FOUND", "Connection not found", 404);
    }
    return connection;
  }

  private uniqueHandle(candidate: string) {
    const normalized = candidate.slice(0, 24).padEnd(3, "0");
    const existing = new Set([...this.users.values()].map((profile) => profile.handle));
    if (!existing.has(normalized)) return normalized;
    return `${normalized.slice(0, 19)}_${randomBytes(2).toString("hex")}`;
  }
}

export class RepositoryError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message);
  }
}

function recordKey(userId: string, record: Pick<SyncRecord, "entity" | "entityId">) {
  return `${userId}:${record.entity}:${record.entityId}`;
}

function sharingKey(connectionId: string, ownerId: string) {
  return `${connectionId}:${ownerId}`;
}

function ageFromBirthDate(value: string) {
  const birth = new Date(`${value}T12:00:00.000Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}
