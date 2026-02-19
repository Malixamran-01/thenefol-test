-- Draft version history (snapshots on each save, last 20 per user)
CREATE TABLE IF NOT EXISTS blog_draft_versions (
  id serial primary key,
  user_id integer references users(id) on delete cascade,
  post_id integer references blog_posts(id) on delete set null,
  version integer not null,
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

CREATE INDEX IF NOT EXISTS idx_draft_versions_user ON blog_draft_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_versions_created ON blog_draft_versions(created_at DESC);
