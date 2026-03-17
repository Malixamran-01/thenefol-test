-- Add author_id to blog_activities if missing (required for follow/unfollow activity logging)
-- Run this if you get: column "author_id" of relation "blog_activities" does not exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'blog_activities' AND column_name = 'author_id'
  ) THEN
    ALTER TABLE blog_activities ADD COLUMN author_id integer references author_profiles(id) on delete set null;
    CREATE INDEX IF NOT EXISTS idx_blog_activities_author ON blog_activities(author_id);
  END IF;
END $$;
