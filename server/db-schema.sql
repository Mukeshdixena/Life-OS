-- Life OS Database Schema
-- Run this once against your Supabase/PostgreSQL instance

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  settings      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily plans
CREATE TABLE IF NOT EXISTS daily_plans (
  id            SERIAL PRIMARY KEY,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  prompt_used   TEXT,
  mood_score    INT CHECK (mood_score BETWEEN 1 AND 10),
  energy_score  INT CHECK (energy_score BETWEEN 1 AND 10),
  mental_state  TEXT,
  confirmed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- Time blocks
CREATE TABLE IF NOT EXISTS time_blocks (
  id                 SERIAL PRIMARY KEY,
  plan_id            INT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  user_id            INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  category           TEXT NOT NULL DEFAULT 'personal',
  start_time         TIMESTAMPTZ NOT NULL,
  end_time           TIMESTAMPTZ NOT NULL,
  planned_start      TIMESTAMPTZ NOT NULL,
  planned_end        TIMESTAMPTZ NOT NULL,
  color              TEXT NOT NULL DEFAULT '#6B7280',
  energy_level       TEXT NOT NULL DEFAULT 'medium' CHECK (energy_level IN ('high', 'medium', 'low')),
  is_non_negotiable  BOOLEAN NOT NULL DEFAULT false,
  position           INT NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'done', 'skipped')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_blocks_plan_id ON time_blocks(plan_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_user_id ON time_blocks(user_id);

-- Checkins
CREATE TABLE IF NOT EXISTS checkins (
  id                 SERIAL PRIMARY KEY,
  block_id           INT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
  user_id            INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outcome            TEXT NOT NULL CHECK (outcome IN ('done', 'extended', 'skipped', 'did_something_else')),
  actual_end         TIMESTAMPTZ,
  extra_minutes      INT NOT NULL DEFAULT 0,
  notes              TEXT,
  alternate_activity TEXT,
  time_roi           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_block_id ON checkins(block_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user_id  ON checkins(user_id);

-- Daily reviews
CREATE TABLE IF NOT EXISTS daily_reviews (
  id                  SERIAL PRIMARY KEY,
  plan_id             INT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  user_id             INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completion_rate     NUMERIC(5, 2),
  energy_drain_notes  TEXT,
  wins                TEXT,
  improvements        TEXT,
  overall_rating      INT CHECK (overall_rating BETWEEN 1 AND 10),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'personal',
  color       TEXT NOT NULL DEFAULT '#6B7280',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);

-- Habit logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id          SERIAL PRIMARY KEY,
  habit_id    INT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  completed   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (habit_id, date)
);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date    ON habit_logs(date);
