-- Kensley Aesthetics — Database Schema

-- Enable pgcrypto for gen_random_uuid() on PostgreSQL < 13
-- On PostgreSQL 13+ this is a no-op but safe to include
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  service     VARCHAR(100),
  message     TEXT NOT NULL,
  status      VARCHAR(30) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(150) NOT NULL,
  email        VARCHAR(255) NOT NULL,
  phone        VARCHAR(30),
  service      VARCHAR(100) NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time VARCHAR(20) NOT NULL,
  notes        TEXT,
  status       VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date   ON appointments(preferred_date ASC);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

COMMIT;
