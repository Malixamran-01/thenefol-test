-- Normalized snapshot of collab application form (one row per collab application).
CREATE TABLE IF NOT EXISTS collab_profile_details (
  id SERIAL PRIMARY KEY,
  collab_application_id INTEGER NOT NULL UNIQUE REFERENCES collab_applications(id) ON DELETE CASCADE,
  unique_user_id TEXT,
  full_name TEXT,
  email TEXT,
  phone_local TEXT,
  phone_code TEXT,
  phone_country_iso VARCHAR(2),
  birth_month TEXT,
  birth_day TEXT,
  birth_year TEXT,
  birthdate DATE,
  gender TEXT,
  marital_status TEXT,
  anniversary TEXT,
  occupation TEXT,
  education TEXT,
  education_branch TEXT,
  followers_range TEXT,
  bio TEXT,
  niche JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  address JSONB DEFAULT '{}'::jsonb,
  platforms_snapshot JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_profile_details_unique_user ON collab_profile_details(unique_user_id);
CREATE INDEX IF NOT EXISTS idx_collab_profile_details_email ON collab_profile_details(email);
