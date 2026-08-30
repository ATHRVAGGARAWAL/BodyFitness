CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id text PRIMARY KEY,
  display_name text NOT NULL DEFAULT 'Athlete',
  handle text NOT NULL UNIQUE,
  birth_date date,
  timezone text NOT NULL DEFAULT 'UTC',
  primary_step_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_records (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id text NOT NULL,
  revision integer NOT NULL,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL,
  server_updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  PRIMARY KEY (user_id, entity, entity_id)
);

CREATE TABLE IF NOT EXISTS sync_requests (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS devices (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  label text NOT NULL,
  push_token text,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS step_snapshots (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  day date NOT NULL,
  source text NOT NULL,
  device_id text,
  steps integer NOT NULL CHECK (steps >= 0),
  is_manual_override boolean NOT NULL DEFAULT false,
  synced_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, day, source)
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  day date NOT NULL,
  steps integer NOT NULL DEFAULT 0,
  step_target integer NOT NULL DEFAULT 10000,
  workout_completed boolean NOT NULL DEFAULT false,
  streak_days integer NOT NULL DEFAULT 0,
  source text,
  synced_at timestamptz,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS achievements (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  period_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  achieved_at timestamptz NOT NULL,
  UNIQUE (user_id, kind, period_key)
);

CREATE TABLE IF NOT EXISTS connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  user_b_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now(),
  connected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

CREATE TABLE IF NOT EXISTS connection_sharing (
  connection_id uuid NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  viewer_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  policy jsonb NOT NULL,
  PRIMARY KEY (connection_id, owner_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  creator_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  target_handle text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  reported_user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text AS $$
  SELECT nullif(current_setting('app.user_id', true), '');
$$ LANGUAGE sql STABLE;

CREATE POLICY users_self ON app_users USING (id = app_user_id()) WITH CHECK (id = app_user_id());
CREATE POLICY sync_self ON sync_records USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
CREATE POLICY devices_self ON devices USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
CREATE POLICY steps_self ON step_snapshots USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
CREATE POLICY summaries_self ON daily_summaries USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
CREATE POLICY achievements_self ON achievements USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
CREATE POLICY connections_member ON connections USING (user_a_id = app_user_id() OR user_b_id = app_user_id()) WITH CHECK (user_a_id = app_user_id() OR user_b_id = app_user_id());
CREATE POLICY sharing_member ON connection_sharing USING (owner_id = app_user_id() OR viewer_id = app_user_id()) WITH CHECK (owner_id = app_user_id());
CREATE POLICY invites_owner ON invites USING (creator_id = app_user_id()) WITH CHECK (creator_id = app_user_id());
CREATE POLICY reports_owner ON reports USING (reporter_id = app_user_id()) WITH CHECK (reporter_id = app_user_id());

-- The API uses a privileged database role and still performs explicit connection checks.
-- These policies protect future direct or pooled sessions that set app.user_id per transaction.
