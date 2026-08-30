import { z } from "zod";

export const HealthSourceSchema = z.enum([
  "manual",
  "apple-health",
  "health-connect",
  "cloud",
]);
export type HealthSource = z.infer<typeof HealthSourceSchema>;

export const StepSnapshotSchema = z.object({
  date: z.string().date(),
  steps: z.number().int().nonnegative(),
  source: HealthSourceSchema,
  deviceId: z.string().min(1).nullable().default(null),
  syncedAt: z.string().datetime(),
  isManualOverride: z.boolean().default(false),
});
export type StepSnapshot = z.infer<typeof StepSnapshotSchema>;

export const AchievementKindSchema = z.enum([
  "step-goal",
  "step-streak",
  "workout-count",
  "personal-record",
  "consistency",
]);
export type AchievementKind = z.infer<typeof AchievementKindSchema>;

export const AchievementSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  kind: AchievementKindSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  achievedAt: z.string().datetime(),
  periodKey: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type Achievement = z.infer<typeof AchievementSchema>;

export const SharingPolicySchema = z.object({
  achievements: z.boolean().default(true),
  goalProgress: z.boolean().default(true),
  exactSteps: z.boolean().default(false),
  workoutSummaries: z.boolean().default(false),
  personalRecords: z.boolean().default(false),
  nutrition: z.boolean().default(false),
  weight: z.boolean().default(false),
});
export type SharingPolicy = z.infer<typeof SharingPolicySchema>;

export const ConnectionStatusSchema = z.enum([
  "pending",
  "accepted",
  "blocked",
]);
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;

export const ConnectionSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  displayName: z.string().min(1),
  handle: z.string().min(2),
  avatarUrl: z.string().url().nullable().default(null),
  status: ConnectionStatusSchema,
  connectedAt: z.string().datetime().nullable().default(null),
  sharing: SharingPolicySchema,
});
export type Connection = z.infer<typeof ConnectionSchema>;

export const DailySummarySchema = z.object({
  userId: z.string().min(1),
  date: z.string().date(),
  steps: z.number().int().nonnegative().nullable(),
  stepGoalPercent: z.number().nonnegative().max(10),
  workoutCompleted: z.boolean(),
  streakDays: z.number().int().nonnegative(),
  source: HealthSourceSchema.nullable(),
  syncedAt: z.string().datetime().nullable(),
});
export type DailySummary = z.infer<typeof DailySummarySchema>;

export const CircleMemberSchema = z.object({
  connection: ConnectionSchema,
  summary: DailySummarySchema.nullable(),
  achievements: z.array(AchievementSchema),
});
export type CircleMember = z.infer<typeof CircleMemberSchema>;

export const CircleFeedSchema = z.object({
  members: z.array(CircleMemberSchema),
  pendingInvites: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});
export type CircleFeed = z.infer<typeof CircleFeedSchema>;

export const SyncEntitySchema = z.enum([
  "profile",
  "targets",
  "meal",
  "daily-wellness",
  "workout-plan",
  "workout-session",
  "set-log",
  "weight-entry",
  "settings",
]);
export type SyncEntity = z.infer<typeof SyncEntitySchema>;

export const SyncRecordSchema = z.object({
  entity: SyncEntitySchema,
  entityId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().default(null),
  payload: z.record(z.string(), z.unknown()),
});
export type SyncRecord = z.infer<typeof SyncRecordSchema>;

export const SyncEnvelopeSchema = z.object({
  deviceId: z.string().min(1),
  cursor: z.string().nullable().default(null),
  idempotencyKey: z.string().min(8),
  records: z.array(SyncRecordSchema).max(2_000),
});
export type SyncEnvelope = z.infer<typeof SyncEnvelopeSchema>;

export const SyncResponseSchema = z.object({
  cursor: z.string(),
  accepted: z.array(z.string()),
  conflicts: z.array(SyncRecordSchema),
  remote: z.array(SyncRecordSchema),
  syncedAt: z.string().datetime(),
});
export type SyncResponse = z.infer<typeof SyncResponseSchema>;

export const AppProfileSchema = z.object({
  displayName: z.string().min(2).max(60),
  handle: z.string().regex(/^[a-z0-9_]{3,24}$/),
  birthDate: z.string().date().nullable(),
  timezone: z.string().min(1),
  primaryStepSource: HealthSourceSchema.nullable(),
});
export type AppProfile = z.infer<typeof AppProfileSchema>;

export const CreateInviteSchema = z.object({
  handle: z.string().regex(/^[a-z0-9_]{3,24}$/).optional(),
});
export type CreateInvite = z.infer<typeof CreateInviteSchema>;

export const InviteSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(16),
  inviteUrl: z.string().url(),
  expiresAt: z.string().datetime(),
});
export type Invite = z.infer<typeof InviteSchema>;

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
