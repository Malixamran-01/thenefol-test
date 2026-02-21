-- Stabilize draft identity: prevent session-based fragmentation
-- One active auto draft per logical draft (user + post_id/null)

WITH ranked_auto AS (
  SELECT id, row_number() OVER (
    PARTITION BY user_id, post_id
    ORDER BY updated_at DESC, id DESC
  ) AS rn
  FROM blog_drafts
  WHERE status = 'auto'
)
DELETE FROM blog_drafts d
USING ranked_auto r
WHERE d.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_blog_drafts_auto_user_post
  ON blog_drafts(user_id, COALESCE(post_id, -1))
  WHERE status = 'auto';

