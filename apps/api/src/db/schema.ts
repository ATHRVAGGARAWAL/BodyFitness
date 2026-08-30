import { boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull().default("Athlete"),
  handle: text("handle").notNull(),
  birthDate: date("birth_date"),
  timezone: text("timezone").notNull().default("UTC"),
  primaryStepSource: text("primary_step_source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("app_users_handle_idx").on(table.handle)]);

export const syncRecords = pgTable("sync_records", {
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  revision: integer("revision").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  serverUpdatedAt: timestamp("server_updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [primaryKey({ columns: [table.userId, table.entity, table.entityId] })]);

export const syncRequests = pgTable("sync_requests", {
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull(),
  response: jsonb("response").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.userId, table.idempotencyKey] })]);

export const devices = pgTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  label: text("label").notNull(),
  pushToken: text("push_token"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stepSnapshots = pgTable("step_snapshots", {
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  source: text("source").notNull(),
  deviceId: text("device_id"),
  steps: integer("steps").notNull(),
  isManualOverride: boolean("is_manual_override").notNull().default(false),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
}, (table) => [primaryKey({ columns: [table.userId, table.day, table.source] })]);

export const dailySummaries = pgTable("daily_summaries", {
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  day: date("day").notNull(),
  steps: integer("steps").notNull().default(0),
  stepTarget: integer("step_target").notNull().default(10000),
  workoutCompleted: boolean("workout_completed").notNull().default(false),
  streakDays: integer("streak_days").notNull().default(0),
  source: text("source"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
}, (table) => [primaryKey({ columns: [table.userId, table.day] })]);

export const achievements = pgTable("achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  periodKey: text("period_key").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
}, (table) => [uniqueIndex("achievements_rule_idx").on(table.userId, table.kind, table.periodKey)]);

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userAId: text("user_a_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  userBId: text("user_b_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("accepted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("connections_pair_idx").on(table.userAId, table.userBId)]);

export const connectionSharing = pgTable("connection_sharing", {
  connectionId: uuid("connection_id").notNull().references(() => connections.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  viewerId: text("viewer_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  policy: jsonb("policy").$type<Record<string, boolean>>().notNull(),
}, (table) => [primaryKey({ columns: [table.connectionId, table.ownerId] })]);

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull(),
  creatorId: text("creator_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  targetHandle: text("target_handle"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("invites_token_idx").on(table.token)]);

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  reporterId: text("reporter_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  reportedUserId: text("reported_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
