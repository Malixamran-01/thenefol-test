-- Blog drafts v2: production optimizations (hash, version, post_id, last_opened_at)
-- Run this after blog_drafts table exists

ALTER TABLE blog_drafts ADD COLUMN IF NOT EXISTS post_id integer references blog_posts(id) on delete set null;
ALTER TABLE blog_drafts ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE blog_drafts ADD COLUMN IF NOT EXISTS version integer default 0;
ALTER TABLE blog_drafts ADD COLUMN IF NOT EXISTS last_opened_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_blog_drafts_post_id ON blog_drafts(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_drafts_user_post ON blog_drafts(user_id, post_id) WHERE status = 'auto';
