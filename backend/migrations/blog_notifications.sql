-- Blog Notifications (Activity tab - likes, comments, follows, etc.)
CREATE TABLE IF NOT EXISTS blog_notifications (
  id          SERIAL PRIMARY KEY,
  recipient_user_id INTEGER NOT NULL,
  actor_user_id     INTEGER,
  actor_name        TEXT,
  actor_avatar      TEXT,
  type              TEXT NOT NULL,
  post_id           TEXT,
  post_title        TEXT,
  comment_id        INTEGER,
  comment_excerpt   TEXT,
  is_read           BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_blog_notifs_recipient
ON blog_notifications(recipient_user_id, created_at DESC);

-- Per-user notification mute preferences
CREATE TABLE IF NOT EXISTS blog_notification_preferences (
  user_id     INTEGER PRIMARY KEY,
  muted_until TIMESTAMPTZ
);
