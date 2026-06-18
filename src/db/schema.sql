-- Creative Touch Renova — Database Schema

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  phone       VARCHAR(30),
  service     VARCHAR(100),
  message     TEXT NOT NULL,
  status      VARCHAR(30) NOT NULL DEFAULT 'new',  -- new | read | replied
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat sessions (one per client conversation)
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key VARCHAR(100) UNIQUE NOT NULL,         -- client-generated or UUID
  client_name VARCHAR(150),
  client_email VARCHAR(255),
  status      VARCHAR(30) NOT NULL DEFAULT 'active', -- active | closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- fal.ai image generation jobs
CREATE TABLE IF NOT EXISTS image_generations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  treatment     VARCHAR(100),                       -- e.g. 'face-sculpt', 'smooth-lines'
  prompt        TEXT NOT NULL,
  input_image   TEXT,                               -- uploaded image URL/path
  result_url    TEXT,                               -- generated image URL from fal.ai
  fal_request_id VARCHAR(255),
  status        VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | done | failed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_image_gen_session_id ON image_generations(session_id);
