-- Draft versions v2: proper snapshot architecture
-- Draft = mutable working state. Version = immutable snapshot.
-- Versions are tied to draft_id. Sessions only control restore.

-- Ensure blog_draft_versions exists (from blog_draft_versions.sql)
CREATE TABLE IF NOT EXISTS blog_draft_versions (
  id serial primary key,
  user_id integer references users(id) on delete cascade,
  post_id integer references blog_posts(id) on delete set null,
  version integer not null default 1,
  title text default '',
  content text default '',
  excerpt text default '',
  author_name text default '',
  author_email text default '',
  meta_title text,
  meta_description text,
  meta_keywords jsonb,
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  categories jsonb default '[]'::jsonb,
  allow_comments boolean default true,
  created_at timestamptz default now()
);

-- Add new columns for version architecture
ALTER TABLE blog_draft_versions ADD COLUMN IF NOT EXISTS draft_id integer references blog_drafts(id) on delete cascade;
ALTER TABLE blog_draft_versions ADD COLUMN IF NOT EXISTS snapshot_reason text;
ALTER TABLE blog_draft_versions ADD COLUMN IF NOT EXISTS version_number integer;

DO $$
BEGIN
  UPDATE blog_draft_versions SET version_number = version WHERE version_number IS NULL;
  UPDATE blog_draft_versions SET version_number = 1 WHERE version_number IS NULL;
  UPDATE blog_draft_versions SET snapshot_reason = 'AUTO_INTERVAL' WHERE snapshot_reason IS NULL;
END $$;

ALTER TABLE blog_draft_versions ALTER COLUMN snapshot_reason SET DEFAULT 'AUTO_INTERVAL';
ALTER TABLE blog_draft_versions ALTER COLUMN version_number SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_draft_versions_draft_id ON blog_draft_versions(draft_id) WHERE draft_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_draft_versions_user ON blog_draft_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_versions_created ON blog_draft_versions(created_at DESC);
