-- =============================================================================
-- Merge Duplicate Accounts: Google vs Email/Password
-- =============================================================================
-- For each pair of users with the same email (case-insensitive):
--   KEEPER  = account with a real password hash (email/password signup)
--   GOOGLE  = account with password = '' or NULL and a google_id (Google signup)
--
-- Steps per pair:
--   1. Copy google_id + profile_photo from GOOGLE → KEEPER (if not already set)
--   2. Reassign all user data from GOOGLE.id → KEEPER.id
--   3. Delete the GOOGLE account
--
-- SAFE TO RUN: uses a transaction, rolls back on any error.
-- Run as your DB superuser or the app DB user.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  r RECORD;
  keeper_id  INTEGER;
  google_id_val INTEGER;
  pairs_found INTEGER := 0;
  pairs_merged INTEGER := 0;
BEGIN

  -- Find all email groups that have more than one account
  FOR r IN
    SELECT
      LOWER(TRIM(email)) AS norm_email,
      array_agg(id ORDER BY
        -- Prefer the account with a real password as the keeper
        CASE WHEN password IS NOT NULL AND password != '' THEN 0 ELSE 1 END,
        created_at ASC
      ) AS ids,
      array_agg(password ORDER BY
        CASE WHEN password IS NOT NULL AND password != '' THEN 0 ELSE 1 END,
        created_at ASC
      ) AS passwords,
      array_agg(google_id ORDER BY
        CASE WHEN password IS NOT NULL AND password != '' THEN 0 ELSE 1 END,
        created_at ASC
      ) AS google_ids,
      array_agg(profile_photo ORDER BY
        CASE WHEN password IS NOT NULL AND password != '' THEN 0 ELSE 1 END,
        created_at ASC
      ) AS profile_photos
    FROM users
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  LOOP
    pairs_found := pairs_found + 1;
    keeper_id  := r.ids[1];   -- account with real password (sorted first)

    RAISE NOTICE 'Processing email: %, keeper id: %, duplicate ids: %',
      r.norm_email, keeper_id, r.ids[2:];

    -- Loop over every duplicate (index 2 onwards)
    FOR i IN 2..array_length(r.ids, 1) LOOP
      google_id_val := r.ids[i];

      -- Only merge if the duplicate is a Google-only account (no real password)
      IF r.passwords[i] IS NOT NULL AND r.passwords[i] != '' THEN
        RAISE WARNING 'Skipping id=% for email % — it has a password set (not a Google-only account). Manual review needed.',
          google_id_val, r.norm_email;
        CONTINUE;
      END IF;

      RAISE NOTICE '  Merging Google account id=% into keeper id=%', google_id_val, keeper_id;

      -- 1. Carry over google_id + profile_photo to keeper if not already set
      UPDATE users
      SET
        google_id     = COALESCE(google_id, r.google_ids[i]),
        profile_photo = COALESCE(profile_photo, r.profile_photos[i]),
        is_verified   = TRUE,
        updated_at    = NOW()
      WHERE id = keeper_id;

      -- 2. Reassign all related tables ----------------------------------

      -- Orders
      UPDATE orders SET user_id = keeper_id WHERE user_id = google_id_val;

      -- User addresses
      UPDATE user_addresses SET user_id = keeper_id WHERE user_id = google_id_val;

      -- User activities / sessions / stats / preferences / notes / tags
      UPDATE user_activities SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE user_sessions   SET user_id = keeper_id WHERE user_id = google_id_val;

      -- user_stats has user_id as PRIMARY KEY — merge by upserting into keeper then deleting google row
      INSERT INTO user_stats (user_id, total_orders, total_spent, avg_order_value, last_order_date, created_at, updated_at)
      SELECT keeper_id, total_orders, total_spent, avg_order_value, last_order_date, created_at, NOW()
      FROM user_stats WHERE user_id = google_id_val
      ON CONFLICT (user_id) DO UPDATE
        SET
          total_orders    = user_stats.total_orders    + EXCLUDED.total_orders,
          total_spent     = user_stats.total_spent     + EXCLUDED.total_spent,
          last_order_date = GREATEST(user_stats.last_order_date, EXCLUDED.last_order_date),
          updated_at      = NOW();
      DELETE FROM user_stats WHERE user_id = google_id_val;

      -- user_preferences has user_id as PRIMARY KEY
      INSERT INTO user_preferences (user_id, preferences, created_at, updated_at)
      SELECT keeper_id, preferences, created_at, NOW()
      FROM user_preferences WHERE user_id = google_id_val
      ON CONFLICT (user_id) DO NOTHING;   -- keeper's preferences take priority
      DELETE FROM user_preferences WHERE user_id = google_id_val;

      UPDATE user_notes SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE user_tags  SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Pending cart emails
      UPDATE pending_cart_emails SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Blog posts
      UPDATE blog_posts SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Blog drafts & versions
      UPDATE blog_drafts         SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE blog_draft_versions SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Blog comments
      UPDATE blog_comments SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Blog likes (post-level) — avoid duplicate (post_id, user_id) conflicts
      UPDATE blog_post_likes
      SET user_id = keeper_id
      WHERE user_id = google_id_val
        AND NOT EXISTS (
          SELECT 1 FROM blog_post_likes
          WHERE post_id = blog_post_likes.post_id AND user_id = keeper_id
        );
      DELETE FROM blog_post_likes WHERE user_id = google_id_val;

      -- Blog comment likes — avoid duplicates
      UPDATE blog_comment_likes
      SET user_id = keeper_id
      WHERE user_id = google_id_val
        AND NOT EXISTS (
          SELECT 1 FROM blog_comment_likes
          WHERE comment_id = blog_comment_likes.comment_id AND user_id = keeper_id
        );
      DELETE FROM blog_comment_likes WHERE user_id = google_id_val;

      -- Blog reposts (blog_reposts table)
      UPDATE blog_reposts SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Blog post reposts (blog_post_reposts table)
      UPDATE blog_post_reposts
      SET user_id = keeper_id
      WHERE user_id = google_id_val
        AND NOT EXISTS (
          SELECT 1 FROM blog_post_reposts
          WHERE post_id = blog_post_reposts.post_id AND user_id = keeper_id
        );
      DELETE FROM blog_post_reposts WHERE user_id = google_id_val;

      -- Blog bookmarks
      UPDATE blog_post_bookmarks
      SET user_id = keeper_id
      WHERE user_id = google_id_val
        AND NOT EXISTS (
          SELECT 1 FROM blog_post_bookmarks
          WHERE post_id = blog_post_bookmarks.post_id AND user_id = keeper_id
        );
      DELETE FROM blog_post_bookmarks WHERE user_id = google_id_val;

      -- Blog notifications
      UPDATE blog_notifications
      SET recipient_user_id = keeper_id
      WHERE recipient_user_id = google_id_val;

      UPDATE blog_notifications
      SET actor_user_id = keeper_id
      WHERE actor_user_id = google_id_val;

      UPDATE blog_notification_preferences
      SET user_id = keeper_id
      WHERE user_id = google_id_val;

      -- Author profile
      UPDATE author_profiles SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Collab
      UPDATE collab_profiles        SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE collab_assigned_tasks  SET assignee_user_id = keeper_id WHERE assignee_user_id = google_id_val;

      -- creator_program_badge_ack has user_id as PRIMARY KEY
      INSERT INTO creator_program_badge_ack (user_id, last_seen_badge, acked_at)
      SELECT keeper_id, last_seen_badge, acked_at
      FROM creator_program_badge_ack WHERE user_id = google_id_val
      ON CONFLICT (user_id) DO NOTHING;
      DELETE FROM creator_program_badge_ack WHERE user_id = google_id_val;

      -- Affiliate
      UPDATE affiliate_applications SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE affiliate_earnings      SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Loyalty / coins
      UPDATE coin_transactions       SET user_id = keeper_id WHERE user_id = google_id_val;
      UPDATE blog_weekly_creator_reward
      SET user_id = keeper_id
      WHERE user_id = google_id_val
        AND NOT EXISTS (
          SELECT 1 FROM blog_weekly_creator_reward
          WHERE user_id = keeper_id AND week_start = blog_weekly_creator_reward.week_start
        );
      DELETE FROM blog_weekly_creator_reward WHERE user_id = google_id_val;

      -- Subscriptions / WhatsApp
      UPDATE whatsapp_subscribers SET user_id = keeper_id WHERE user_id = google_id_val;

      -- Live chat sessions
      UPDATE live_chat_sessions SET user_id = keeper_id WHERE user_id = google_id_val;

      -- User notifications
      UPDATE user_notifications SET user_id = keeper_id WHERE user_id = google_id_val;

      -- 3. Delete the now-empty Google account
      DELETE FROM users WHERE id = google_id_val;

      pairs_merged := pairs_merged + 1;
      RAISE NOTICE '  ✅ Merged and deleted Google account id=%', google_id_val;
    END LOOP;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Done. Duplicate groups found: %. Accounts merged: %.', pairs_found, pairs_merged;
  RAISE NOTICE '========================================';
END $$;

COMMIT;
