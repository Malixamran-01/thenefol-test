-- Migration script to link existing blog posts to author profiles
-- Run this after creating the new tables via migrate.js

-- Step 1: Create author profiles for all users who have published posts
INSERT INTO author_profiles (user_id, unique_user_id, email, username, display_name, status)
SELECT DISTINCT
  u.id,
  u.unique_user_id,
  u.email,
  LOWER(REGEXP_REPLACE(u.name, '[^a-zA-Z0-9]', '', 'g')),
  u.name,
  'active'
FROM users u
JOIN blog_posts bp ON u.id::text = bp.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM author_profiles WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Link existing posts to author profiles
UPDATE blog_posts bp
SET author_id = ap.id
FROM author_profiles ap
WHERE bp.user_id::integer = ap.user_id
  AND bp.author_id IS NULL;

-- Step 3: Initialize author stats for all authors
INSERT INTO author_stats (author_id, followers_count, subscribers_count, posts_count, total_views, total_likes)
SELECT 
  ap.id,
  0 as followers_count,
  0 as subscribers_count,
  COUNT(DISTINCT bp.id) as posts_count,
  0 as total_views,
  COUNT(DISTINCT bpl.id) as total_likes
FROM author_profiles ap
LEFT JOIN blog_posts bp ON ap.id = bp.author_id AND bp.status = 'approved' AND bp.is_active = true AND bp.is_deleted = false
LEFT JOIN blog_post_likes bpl ON bp.id::text = bpl.post_id
GROUP BY ap.id
ON CONFLICT (author_id) DO UPDATE SET
  posts_count = EXCLUDED.posts_count,
  total_likes = EXCLUDED.total_likes,
  updated_at = CURRENT_TIMESTAMP;

-- Verification queries
SELECT 
  COUNT(*) as author_profiles_created,
  (SELECT COUNT(*) FROM author_profiles WHERE status = 'active') as active_authors,
  (SELECT COUNT(*) FROM blog_posts WHERE author_id IS NOT NULL) as posts_linked,
  (SELECT COUNT(*) FROM author_stats) as stats_initialized
FROM author_profiles;
