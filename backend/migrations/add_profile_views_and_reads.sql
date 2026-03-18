-- Add profile view counter to author_stats
ALTER TABLE author_stats ADD COLUMN IF NOT EXISTS profile_views INTEGER NOT NULL DEFAULT 0;

-- Add reads counter to blog_posts (a "read" = visitor stayed 2+ minutes)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS reads_count INTEGER NOT NULL DEFAULT 0;
