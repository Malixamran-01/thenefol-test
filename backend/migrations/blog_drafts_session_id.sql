-- Blog drafts v3: session_id for session-bound auto drafts
-- Fixes: "old auto draft restored when opening new blog"
-- Run after blog_drafts table exists

ALTER TABLE blog_drafts ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_blog_drafts_session_id ON blog_drafts(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_drafts_user_session ON blog_drafts(user_id, session_id) WHERE status = 'auto' AND session_id IS NOT NULL;
