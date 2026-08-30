import { randomBytes } from "node:crypto";
import postgres, { type Sql } from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import {
  AppProfileSchema,
  SharingPolicySchema,
  StepSnapshotSchema,
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
import { RepositoryError, type DeviceInput, type Repository } from "./repository.js";
import * as schema from "./db/schema.js";

const defaultSharing = SharingPolicySchema.parse({});
type JsonValue = Parameters<Sql["json"]>[0];

export class PostgresRepository implements Repository {
  private readonly client: Sql;
  readonly db;

  constructor(databaseUrl: string) {
    this.client = postgres(databaseUrl, { max: 10, prepare: false });
    this.db = drizzle(this.client, { schema });
  }

  async ensureUser(userId: string): Promise<AppProfile> {
    const current = await this.client<Array<Record<string, unknown>>>`
      SELECT display_name AS "displayName", handle, birth_date AS "birthDate", timezone,
             primary_step_source AS "primaryStepSource"
      FROM app_users WHERE id = ${userId} LIMIT 1
    `;
    if (current[0]) return parseProfileRow(current[0]);
    const base = `athlete_${userId.slice(-6).toLowerCase().replace(/[^a-z0-9]/g, "")}`.slice(0, 24).padEnd(3, "0");
    let handle = base;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const rows = await this.client<Array<Record<string, unknown>>>`
          INSERT INTO app_users (id, display_name, handle, timezone)
          VALUES (${userId}, 'Athlete', ${handle}, 'UTC')
          ON CONFLICT (id) DO UPDATE SET updated_at = now()
          RETURNING display_name AS "displayName", handle, birth_date AS "birthDate", timezone,
                    primary_step_source AS "primaryStepSource"
        `;
        return parseProfileRow(rows[0]!);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        handle = `${base.slice(0, 19)}_${randomBytes(2).toString("hex")}`;
      }
    }
    throw new RepositoryError("HANDLE_CREATE_FAILED", "Could not create a private handle", 500);
  }

  async getProfile(userId: string) {
    return this.ensureUser(userId);
  }

  async updateProfile(userId: string, input: AppProfile) {
    const profile = AppProfileSchema.parse(input);
    if (profile.birthDate && ageFromBirthDate(profile.birthDate) < 13) {
      throw new RepositoryError("AGE_RESTRICTED", "BodyFitness accounts require age 13+", 422);
    }
    await this.ensureUser(userId);
    try {
      const rows = await this.client<Array<Record<string, unknown>>>`
        UPDATE app_users SET
          display_name = ${profile.displayName}, handle = ${profile.handle},
          birth_date = ${profile.birthDate}, timezone = ${profile.timezone},
          primary_step_source = ${profile.primaryStepSource}, updated_at = now()
        WHERE id = ${userId}
        RETURNING display_name AS "displayName", handle, birth_date AS "birthDate", timezone,
                  primary_step_source AS "primaryStepSource"
      `;
      return parseProfileRow(rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) throw new RepositoryError("HANDLE_TAKEN", "That handle is already in use", 409);
      throw error;
    }
  }

  async sync(userId: string, envelope: SyncEnvelope): Promise<SyncResponse> {
    await this.ensureUser(userId);
    return this.client.begin(async (tx) => {
      const cached = await tx<Array<{ response: SyncResponse }>>`
        SELECT response FROM sync_requests WHERE user_id = ${userId} AND idempotency_key = ${envelope.idempotencyKey}
      `;
      if (cached[0]) return cached[0].response;

      const accepted: string[] = [];
      const conflicts: SyncRecord[] = [];
      for (const record of envelope.records) {
        const inserted = await tx<Array<{ entity_id: string }>>`
          INSERT INTO sync_records (user_id, entity, entity_id, revision, payload, updated_at, server_updated_at, deleted_at)
          VALUES (${userId}, ${record.entity}, ${record.entityId}, ${record.revision}, ${tx.json(record.payload as JsonValue)}, ${record.updatedAt}, now(), ${record.deletedAt})
          ON CONFLICT (user_id, entity, entity_id) DO UPDATE SET
            revision = EXCLUDED.revision, payload = EXCLUDED.payload,
            updated_at = EXCLUDED.updated_at, server_updated_at = now(), deleted_at = EXCLUDED.deleted_at
          WHERE sync_records.revision <= EXCLUDED.revision
          RETURNING entity_id
        `;
        if (inserted.length) accepted.push(`${record.entity}:${record.entityId}`);
        else {
          const existing = await tx<Array<Record<string, unknown>>>`
            SELECT entity, entity_id AS "entityId", revision, payload,
                   updated_at AS "updatedAt", deleted_at AS "deletedAt"
            FROM sync_records WHERE user_id = ${userId} AND entity = ${record.entity} AND entity_id = ${record.entityId}
          `;
          if (existing[0]) conflicts.push(parseSyncRecord(existing[0]));
        }
      }
      await this.refreshDerivedData(tx, userId);
      const syncedAt = new Date().toISOString();
      const cursor = envelope.cursor ?? "1970-01-01T00:00:00.000Z";
      const remoteRows = await tx<Array<Record<string, unknown>>>`
        SELECT entity, entity_id AS "entityId", revision, payload,
               updated_at AS "updatedAt", deleted_at AS "deletedAt"
        FROM sync_records WHERE user_id = ${userId} AND server_updated_at > ${cursor}
        ORDER BY server_updated_at ASC
      `;
      const response: SyncResponse = { cursor: syncedAt, accepted, conflicts, remote: remoteRows.map(parseSyncRecord), syncedAt };
      await tx`
        INSERT INTO sync_requests (user_id, idempotency_key, response)
        VALUES (${userId}, ${envelope.idempotencyKey}, ${tx.json(response as unknown as JsonValue)})
      `;
      return response;
    });
  }

  async registerDevice(userId: string, input: DeviceInput) {
    await this.ensureUser(userId);
    await this.client`
      INSERT INTO devices (id, user_id, platform, label, push_token, last_seen_at)
      VALUES (${input.id}, ${userId}, ${input.platform}, ${input.label}, ${input.pushToken ?? null}, now())
      ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
        label = EXCLUDED.label, push_token = EXCLUDED.push_token, last_seen_at = now()
    `;
  }

  async upsertSteps(userId: string, snapshot: StepSnapshot) {
    await this.ensureUser(userId);
    await this.client.begin(async (tx) => {
      await tx`
        INSERT INTO step_snapshots (user_id, day, source, device_id, steps, is_manual_override, synced_at)
        VALUES (${userId}, ${snapshot.date}, ${snapshot.source}, ${snapshot.deviceId}, ${snapshot.steps}, ${snapshot.isManualOverride}, ${snapshot.syncedAt})
        ON CONFLICT (user_id, day, source) DO UPDATE SET device_id = EXCLUDED.device_id,
          steps = EXCLUDED.steps, is_manual_override = EXCLUDED.is_manual_override, synced_at = EXCLUDED.synced_at
      `;
      await tx`
        UPDATE app_users SET primary_step_source = CASE
          WHEN primary_step_source IS NULL OR primary_step_source = 'manual' OR ${snapshot.isManualOverride} THEN ${snapshot.source}
          ELSE primary_step_source END, updated_at = now()
        WHERE id = ${userId}
      `;
      const sourceRows = await tx<Array<{ primaryStepSource: string | null }>>`SELECT primary_step_source AS "primaryStepSource" FROM app_users WHERE id = ${userId}`;
      if (sourceRows[0]?.primaryStepSource !== snapshot.source) return;
      const targetRows = await tx<Array<{ steps: number }>>`
        SELECT COALESCE((payload->>'steps')::int, 10000) AS steps FROM sync_records
        WHERE user_id = ${userId} AND entity = 'targets' AND entity_id = 'nutrition-targets'
      `;
      const target = targetRows[0]?.steps ?? 10000;
      await tx`
        INSERT INTO daily_summaries (user_id, day, steps, step_target, source, synced_at)
        VALUES (${userId}, ${snapshot.date}, ${snapshot.steps}, ${target}, ${snapshot.source}, ${snapshot.syncedAt})
        ON CONFLICT (user_id, day) DO UPDATE SET steps = EXCLUDED.steps, step_target = EXCLUDED.step_target,
          source = EXCLUDED.source, synced_at = EXCLUDED.synced_at
      `;
      await this.refreshDerivedData(tx, userId);
    });
    return snapshot;
  }

  async getSteps(userId: string, date?: string) {
    await this.ensureUser(userId);
    const rows = date
      ? await this.client<Array<Record<string, unknown>>>`SELECT day AS date, steps, source, device_id AS "deviceId", synced_at AS "syncedAt", is_manual_override AS "isManualOverride" FROM step_snapshots WHERE user_id = ${userId} AND day = ${date} ORDER BY synced_at DESC`
      : await this.client<Array<Record<string, unknown>>>`SELECT day AS date, steps, source, device_id AS "deviceId", synced_at AS "syncedAt", is_manual_override AS "isManualOverride" FROM step_snapshots WHERE user_id = ${userId} ORDER BY day DESC, synced_at DESC LIMIT 90`;
    return rows.map((row) => StepSnapshotSchema.parse({ ...row, date: dateKey(row.date), syncedAt: toIso(row.syncedAt) }));
  }

  async getAchievements(userId: string) {
    await this.ensureUser(userId);
    const rows = await this.client<Array<Record<string, unknown>>>`SELECT id, user_id AS "userId", kind, title, description, achieved_at AS "achievedAt", period_key AS "periodKey", metadata FROM achievements WHERE user_id = ${userId} ORDER BY achieved_at DESC LIMIT 250`;
    return rows.map(parseAchievement);
  }

  async createInvite(userId: string, handle: string | undefined, webAppUrl: string): Promise<Invite> {
    await this.ensureUser(userId);
    if (handle) {
      const target = await this.client`SELECT id FROM app_users WHERE handle = ${handle} LIMIT 1`;
      if (!target.length) throw new RepositoryError("HANDLE_NOT_FOUND", "No private profile matches that exact handle", 404);
    }
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await this.client<Array<{ id: string }>>`
      INSERT INTO invites (token, creator_id, target_handle, expires_at)
      VALUES (${token}, ${userId}, ${handle ?? null}, ${expiresAt}) RETURNING id
    `;
    return { id: rows[0]!.id, token, inviteUrl: `${webAppUrl.replace(/\/$/, "")}/profile/circle/invite/${token}`, expiresAt };
  }

  async acceptInvite(userId: string, token: string) {
    await this.ensureUser(userId);
    return this.client.begin(async (tx) => {
      const rows = await tx<Array<{ id: string; creatorId: string; targetHandle: string | null; expiresAt: string; acceptedAt: string | null }>>`
        SELECT id, creator_id AS "creatorId", target_handle AS "targetHandle",
               expires_at AS "expiresAt", accepted_at AS "acceptedAt"
        FROM invites WHERE token = ${token} FOR UPDATE
      `;
      const invite = rows[0];
      if (!invite || invite.acceptedAt || new Date(invite.expiresAt).getTime() <= Date.now()) throw new RepositoryError("INVITE_INVALID", "This invite is invalid or has expired", 410);
      if (invite.creatorId === userId) throw new RepositoryError("INVITE_SELF", "You cannot accept your own invite", 409);
      const profile = await tx<Array<{ handle: string }>>`SELECT handle FROM app_users WHERE id = ${userId}`;
      if (invite.targetHandle && invite.targetHandle !== profile[0]?.handle) throw new RepositoryError("INVITE_TARGET", "This invitation was created for another handle", 403);
      const [userAId, userBId] = [invite.creatorId, userId].sort();
      const connections = await tx<Array<{ id: string; status: string }>>`
        INSERT INTO connections (user_a_id, user_b_id, status)
        VALUES (${userAId}, ${userBId}, 'accepted')
        ON CONFLICT (user_a_id, user_b_id) DO UPDATE SET status = CASE WHEN connections.status = 'blocked' THEN 'blocked' ELSE 'accepted' END
        RETURNING id, status
      `;
      const connection = connections[0]!;
      if (connection.status === "blocked") throw new RepositoryError("CONNECTION_BLOCKED", "This connection is blocked", 403);
      await tx`
        INSERT INTO connection_sharing (connection_id, owner_id, viewer_id, policy)
        VALUES (${connection.id}, ${userAId}, ${userBId}, ${tx.json(defaultSharing)}),
               (${connection.id}, ${userBId}, ${userAId}, ${tx.json(defaultSharing)})
        ON CONFLICT (connection_id, owner_id) DO NOTHING
      `;
      await tx`UPDATE invites SET accepted_at = now() WHERE id = ${invite.id}`;
      return { connectionId: connection.id };
    });
  }

  async getCircle(userId: string): Promise<CircleFeed> {
    await this.ensureUser(userId);
    const rows = await this.client<Array<{ id: string; userAId: string; userBId: string; connectedAt: string }>>`
      SELECT id, user_a_id AS "userAId", user_b_id AS "userBId", connected_at AS "connectedAt"
      FROM connections WHERE status = 'accepted' AND (user_a_id = ${userId} OR user_b_id = ${userId})
      ORDER BY connected_at DESC
    `;
    const members: CircleMember[] = [];
    for (const connection of rows) {
      const otherId = connection.userAId === userId ? connection.userBId : connection.userAId;
      const [profileRows, policies, summaryRows, achievementRows] = await Promise.all([
        this.client<Array<{ displayName: string; handle: string }>>`SELECT display_name AS "displayName", handle FROM app_users WHERE id = ${otherId}`,
        this.client<Array<{ ownerId: string; policy: SharingPolicy }>>`SELECT owner_id AS "ownerId", policy FROM connection_sharing WHERE connection_id = ${connection.id}`,
        this.client<Array<Record<string, unknown>>>`SELECT day AS date, steps, step_target AS "stepTarget", workout_completed AS "workoutCompleted", streak_days AS "streakDays", source, synced_at AS "syncedAt" FROM daily_summaries WHERE user_id = ${otherId} ORDER BY day DESC LIMIT 1`,
        this.client<Array<Record<string, unknown>>>`SELECT id, user_id AS "userId", kind, title, description, achieved_at AS "achievedAt", period_key AS "periodKey", metadata FROM achievements WHERE user_id = ${otherId} ORDER BY achieved_at DESC LIMIT 20`,
      ]);
      const profile = profileRows[0];
      if (!profile) continue;
      const outgoing = SharingPolicySchema.parse(policies.find((item) => item.ownerId === userId)?.policy ?? defaultSharing);
      const incoming = SharingPolicySchema.parse(policies.find((item) => item.ownerId === otherId)?.policy ?? defaultSharing);
      const raw = summaryRows[0] as { date?: unknown; steps?: number; stepTarget?: number; workoutCompleted?: boolean; streakDays?: number; source?: StepSnapshot["source"] | null; syncedAt?: unknown } | undefined;
      const summary = raw && incoming.goalProgress ? {
        userId: otherId,
        date: dateKey(raw.date),
        steps: incoming.exactSteps ? Number(raw.steps ?? 0) : null,
        stepGoalPercent: raw.stepTarget ? Math.min(10, Number(raw.steps ?? 0) / raw.stepTarget) : 0,
        workoutCompleted: incoming.workoutSummaries ? Boolean(raw.workoutCompleted) : false,
        streakDays: Number(raw.streakDays ?? 0),
        source: incoming.exactSteps ? raw.source ?? null : null,
        syncedAt: raw.syncedAt ? toIso(raw.syncedAt) : null,
      } : null;
      members.push({
        connection: { id: connection.id, userId: otherId, displayName: profile.displayName, handle: profile.handle, avatarUrl: null, status: "accepted", connectedAt: toIso(connection.connectedAt), sharing: outgoing },
        summary,
        achievements: incoming.achievements ? achievementRows.map(parseAchievement) : [],
      });
    }
    const pending = await this.client<Array<{ count: number }>>`SELECT count(*)::int AS count FROM invites WHERE creator_id = ${userId} AND accepted_at IS NULL AND expires_at > now()`;
    return { members, pendingInvites: pending[0]?.count ?? 0, generatedAt: new Date().toISOString() };
  }

  async updateSharing(userId: string, connectionId: string, policy: SharingPolicy) {
    await this.assertConnection(userId, connectionId);
    await this.client`UPDATE connection_sharing SET policy = ${this.client.json(SharingPolicySchema.parse(policy))} WHERE connection_id = ${connectionId} AND owner_id = ${userId}`;
  }

  async removeConnection(userId: string, connectionId: string) {
    await this.assertConnection(userId, connectionId);
    await this.client`DELETE FROM connections WHERE id = ${connectionId}`;
  }

  async blockConnection(userId: string, connectionId: string) {
    await this.assertConnection(userId, connectionId);
    await this.client`UPDATE connections SET status = 'blocked' WHERE id = ${connectionId}`;
  }

  async reportUser(userId: string, reportedUserId: string, reason: string) {
    await this.ensureUser(userId);
    await this.client`INSERT INTO reports (reporter_id, reported_user_id, reason) VALUES (${userId}, ${reportedUserId}, ${reason})`;
  }

  async deleteAccount(userId: string) {
    await this.client`DELETE FROM app_users WHERE id = ${userId}`;
  }

  async close() {
    await this.client.end();
  }

  private async assertConnection(userId: string, connectionId: string) {
    const rows = await this.client`SELECT id FROM connections WHERE id = ${connectionId} AND (user_a_id = ${userId} OR user_b_id = ${userId})`;
    if (!rows.length) throw new RepositoryError("CONNECTION_NOT_FOUND", "Connection not found", 404);
  }

  private async refreshDerivedData(tx: postgres.TransactionSql, userId: string) {
    const sourceRows = await tx<Array<{ primaryStepSource: string | null }>>`SELECT primary_step_source AS "primaryStepSource" FROM app_users WHERE id = ${userId}`;
    const primarySource = sourceRows[0]?.primaryStepSource;
    const targets = await tx<Array<{ steps: number }>>`SELECT COALESCE((payload->>'steps')::int, 10000) AS steps FROM sync_records WHERE user_id = ${userId} AND entity = 'targets' AND entity_id = 'nutrition-targets'`;
    const target = targets[0]?.steps ?? 10000;
    const daily = await tx<Array<{ entityId: string; payload: Record<string, unknown>; updatedAt: string | Date }>>`SELECT entity_id AS "entityId", payload, updated_at AS "updatedAt" FROM sync_records WHERE user_id = ${userId} AND entity = 'daily-wellness' ORDER BY entity_id`;
    const setLogs = await tx<Array<{ entityId: string; payload: Record<string, unknown>; updatedAt: string | Date }>>`SELECT entity_id AS "entityId", payload, updated_at AS "updatedAt" FROM sync_records WHERE user_id = ${userId} AND entity = 'set-log'`;
    const workoutDates = new Set(setLogs.map((record) => String(record.payload.completedAt ?? "").slice(0, 10)).filter(Boolean));
    let streak = 0;
    for (const record of daily) {
      const steps = Number(record.payload.steps ?? 0);
      const source = String(record.payload.stepSource ?? "manual");
      if (primarySource && source !== primarySource) continue;
      streak = steps >= target ? streak + 1 : 0;
      const syncedAt = typeof record.payload.stepSyncedAt === "string" ? record.payload.stepSyncedAt : toIso(record.updatedAt);
      await tx`
        INSERT INTO daily_summaries (user_id, day, steps, step_target, workout_completed, streak_days, source, synced_at)
        VALUES (${userId}, ${record.entityId}, ${steps}, ${target}, ${workoutDates.has(record.entityId)}, ${streak}, ${source}, ${syncedAt})
        ON CONFLICT (user_id, day) DO UPDATE SET steps = EXCLUDED.steps, step_target = EXCLUDED.step_target,
          workout_completed = EXCLUDED.workout_completed, streak_days = EXCLUDED.streak_days,
          source = EXCLUDED.source, synced_at = EXCLUDED.synced_at
      `;
      const derived = deriveAchievements({ userId, date: record.entityId, steps, stepTarget: target, currentStepStreak: streak, workoutCount: workoutDates.size, personalRecords: setLogs.filter((item) => Boolean(item.payload.isPr)).map((item) => ({ id: item.entityId, name: String(item.payload.exerciseName ?? "strength"), achievedAt: typeof item.payload.completedAt === "string" ? item.payload.completedAt : toIso(item.updatedAt) })) });
      for (const achievement of derived) {
        await tx`
          INSERT INTO achievements (id, user_id, kind, title, description, period_key, metadata, achieved_at)
          VALUES (${achievement.id}, ${userId}, ${achievement.kind}, ${achievement.title}, ${achievement.description}, ${achievement.periodKey}, ${tx.json(achievement.metadata as JsonValue)}, ${achievement.achievedAt})
          ON CONFLICT (user_id, kind, period_key) DO UPDATE SET title = EXCLUDED.title,
            description = EXCLUDED.description, metadata = EXCLUDED.metadata, achieved_at = EXCLUDED.achieved_at
        `;
      }
    }
  }
}

function isUniqueViolation(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "23505");
}

function ageFromBirthDate(value: string) {
  const birth = new Date(`${value}T12:00:00.000Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function dateKey(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function parseProfileRow(row: Record<string, unknown>) {
  return AppProfileSchema.parse({ ...row, birthDate: row.birthDate ? dateKey(row.birthDate) : null });
}

function parseSyncRecord(row: Record<string, unknown>): SyncRecord {
  return {
    entity: row.entity as SyncRecord["entity"],
    entityId: String(row.entityId),
    revision: Number(row.revision),
    payload: row.payload as Record<string, unknown>,
    updatedAt: toIso(row.updatedAt),
    deletedAt: row.deletedAt ? toIso(row.deletedAt) : null,
  };
}

function parseAchievement(row: Record<string, unknown>): Achievement {
  return {
    id: String(row.id),
    userId: String(row.userId),
    kind: row.kind as Achievement["kind"],
    title: String(row.title),
    description: String(row.description),
    achievedAt: toIso(row.achievedAt),
    periodKey: String(row.periodKey),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {},
  };
}
