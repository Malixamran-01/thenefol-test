-- Fix duplicate author_profiles and self-follows
-- Run this migration to clean up data that causes:
-- - Followers list empty but count shows
-- - Follow resetting on refresh
-- - Self appearing in following list

-- 1. Remove self-follows (user following their own author profile)
DELETE FROM author_followers af
USING author_profiles ap
WHERE af.author_id = ap.id
  AND af.follower_user_id = ap.user_id;

-- 2. For users with multiple author_profiles, merge to canonical (lowest id)
-- First: identify duplicates and their canonical id
WITH duplicates AS (
  SELECT 
    user_id,
    MIN(id) AS canonical_id,
    array_agg(id ORDER BY id) AS all_ids
  FROM author_profiles
  WHERE status != 'deleted'
  GROUP BY user_id
  HAVING COUNT(*) > 1
),
-- Move author_followers from non-canonical to canonical (avoid conflicts)
to_merge AS (
  SELECT 
    d.canonical_id,
    unnest(d.all_ids[2:]) AS old_id  -- all except first (canonical)
  FROM duplicates d
)
-- Insert canonical follows, then delete from old
INSERT INTO author_followers (author_id, follower_user_id, created_at)
SELECT tm.canonical_id, af.follower_user_id, MIN(af.created_at)
FROM author_followers af
JOIN to_merge tm ON af.author_id = tm.old_id
GROUP BY tm.canonical_id, af.follower_user_id
ON CONFLICT (author_id, follower_user_id) DO NOTHING;

-- Delete follows from non-canonical profiles (profiles with a lower-id sibling for same user)
DELETE FROM author_followers
WHERE author_id IN (
  SELECT ap.id FROM author_profiles ap
  WHERE ap.status != 'deleted'
    AND EXISTS (
      SELECT 1 FROM author_profiles ap2
      WHERE ap2.user_id = ap.user_id AND ap2.id < ap.id AND ap2.status != 'deleted'
    )
);

-- Repeat for author_subscriptions
WITH duplicates AS (
  SELECT user_id, MIN(id) AS canonical_id, array_agg(id ORDER BY id) AS all_ids
  FROM author_profiles WHERE status != 'deleted' GROUP BY user_id HAVING COUNT(*) > 1
),
to_merge AS (
  SELECT d.canonical_id, unnest(d.all_ids[2:]) AS old_id FROM duplicates d
)
INSERT INTO author_subscriptions (author_id, user_id, email, type, status, subscribed_at)
SELECT tm.canonical_id, asub.user_id, asub.email, asub.type, 'active', MIN(asub.subscribed_at)
FROM author_subscriptions asub
JOIN to_merge tm ON asub.author_id = tm.old_id
WHERE asub.status = 'active'
GROUP BY tm.canonical_id, asub.user_id, asub.email, asub.type
ON CONFLICT (author_id, user_id) DO UPDATE SET status = 'active';

-- Delete subscriptions for non-canonical author profiles
DELETE FROM author_subscriptions
WHERE author_id IN (
  SELECT ap.id FROM author_profiles ap
  JOIN author_profiles ap2 ON ap2.user_id = ap.user_id AND ap2.id < ap.id AND ap2.status != 'deleted'
  WHERE ap.status != 'deleted'
);

-- 3. Recalculate author_stats.followers_count from actual author_followers
UPDATE author_stats ast
SET followers_count = (
  SELECT COUNT(*)::integer FROM author_followers WHERE author_id = ast.author_id
),
updated_at = now();

-- 4. Update blog_posts and blog_activities to point to canonical author (only if columns exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blog_posts' AND column_name = 'author_id') THEN
    UPDATE blog_posts bp
    SET author_id = (
      SELECT MIN(ap.id) FROM author_profiles ap WHERE ap.user_id = (SELECT user_id FROM author_profiles WHERE id = bp.author_id LIMIT 1)
    )
    WHERE bp.author_id IN (
      SELECT ap.id FROM author_profiles ap
      WHERE EXISTS (SELECT 1 FROM author_profiles ap2 WHERE ap2.user_id = ap.user_id AND ap2.id < ap.id AND ap2.status != 'deleted')
    );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blog_activities' AND column_name = 'author_id') THEN
    UPDATE blog_activities ba
    SET author_id = (
      SELECT MIN(ap.id) FROM author_profiles ap WHERE ap.user_id = (SELECT user_id FROM author_profiles WHERE id = ba.author_id LIMIT 1)
    )
    WHERE ba.author_id IN (
      SELECT ap.id FROM author_profiles ap
      WHERE EXISTS (SELECT 1 FROM author_profiles ap2 WHERE ap2.user_id = ap.user_id AND ap2.id < ap.id AND ap2.status != 'deleted')
    );
  END IF;
END $$;

-- 5. Mark non-canonical profiles as deleted (safer than hard delete due to FK)
UPDATE author_profiles ap
SET status = 'deleted', updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM author_profiles ap2
  WHERE ap2.user_id = ap.user_id AND ap2.id < ap.id AND ap2.status != 'deleted'
);
