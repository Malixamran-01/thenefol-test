-- Blog drafts table for auto-save and manual drafts
CREATE TABLE IF NOT EXISTS blog_drafts (
  id serial primary key,
  user_id integer references users(id) on delete cascade,
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
  cover_image text,
  detail_image text,
  images jsonb default '[]'::jsonb,
  status text not null default 'auto' check (status in ('auto', 'manual')),
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_blog_drafts_user_id ON blog_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_drafts_status ON blog_drafts(status);
CREATE INDEX IF NOT EXISTS idx_blog_drafts_updated_at ON blog_drafts(updated_at);
