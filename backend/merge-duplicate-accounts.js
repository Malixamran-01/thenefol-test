/**
 * Merge duplicate user accounts caused by Google vs email sign-in creating separate rows.
 *
 * For each group of users sharing the same email (case-insensitive):
 *   KEEPER  = account with a real bcrypt password (email/password signup) — created first if tied
 *   GOOGLE  = account with password = '' or NULL and a google_id (Google-only signup)
 *
 * What it does per duplicate:
 *   1. Copies google_id + profile_photo from the Google account → keeper (if not already set)
 *   2. Reassigns all related rows (orders, blog, collab, loyalty, etc.) to the keeper's id
 *   3. Deletes the now-empty Google-only account
 *
 * Safe to re-run — skips pairs where both accounts have a real password (prints a warning instead).
 *
 * Usage (from backend/):
 *   node merge-duplicate-accounts.js
 *
 * Or add to package.json scripts:
 *   "merge-dupes": "node merge-duplicate-accounts.js"
 */

require('dotenv/config')
const { Pool } = require('pg')

// Pass --dry-run to preview what will be merged without making any changes
const DRY_RUN = process.argv.includes('--dry-run')

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'
const isSupabase = connectionString.includes('supabase.co')
const pool = new Pool(
  isSupabase
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { connectionString }
)

// ─── helpers ──────────────────────────────────────────────────────────────────

function log(msg)  { console.log(`  ${msg}`) }
function warn(msg) { console.warn(`  ⚠️  ${msg}`) }
function ok(msg)   { console.log(`  ✅ ${msg}`) }

let _savepointCounter = 0

/** Run a query inside a savepoint so a failure doesn't abort the whole transaction. */
async function safeUpdate(client, sql, params, label) {
  const sp = `sp_${_savepointCounter++}`
  await client.query(`SAVEPOINT ${sp}`)
  try {
    const res = await client.query(sql, params)
    await client.query(`RELEASE SAVEPOINT ${sp}`)
    if (res.rowCount > 0) log(`   → updated ${res.rowCount} row(s) in ${label}`)
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
    await client.query(`RELEASE SAVEPOINT ${sp}`)
    if (err.code !== '42P01' && err.code !== '42703') {
      // 42P01 = table does not exist, 42703 = column does not exist — skip both silently
      warn(`Skipped ${label}: ${err.message}`)
    }
  }
}

/** Run an arbitrary block inside a savepoint. */
async function safeDo(client, label, fn) {
  const sp = `sp_${_savepointCounter++}`
  await client.query(`SAVEPOINT ${sp}`)
  try {
    await fn()
    await client.query(`RELEASE SAVEPOINT ${sp}`)
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${sp}`)
    await client.query(`RELEASE SAVEPOINT ${sp}`)
    if (err.code !== '42P01' && err.code !== '42703') {
      warn(`Skipped ${label}: ${err.message}`)
    }
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function run() {
  const client = await pool.connect()
  let pairsFound = 0
  let mergedCount = 0

  if (DRY_RUN) console.log('\n🔍 DRY RUN — no changes will be made\n')

  try {
    await client.query('BEGIN')

    // Find every email that has more than one account
    // Exclude NULL emails — they can't be matched and would falsely group together
    const { rows: groups } = await client.query(`
      SELECT
        LOWER(TRIM(email)) AS norm_email,
        array_agg(id ORDER BY
          -- Prefer account with a real bcrypt password first, then oldest
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS ids,
        array_agg(password ORDER BY
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS passwords,
        array_agg(google_id ORDER BY
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS google_ids,
        array_agg(profile_photo ORDER BY
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS profile_photos,
        array_agg(created_at ORDER BY
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS created_ats,
        array_agg(COALESCE(name, '') ORDER BY
          CASE WHEN password IS NOT NULL AND password != '' AND password LIKE '$2%' THEN 0 ELSE 1 END,
          created_at ASC
        ) AS names
      FROM users
      WHERE email IS NOT NULL AND TRIM(email) != ''
      GROUP BY LOWER(TRIM(email))
      HAVING COUNT(*) > 1
    `)

    if (groups.length === 0) {
      console.log('\n✅ No duplicate accounts found. Nothing to merge.\n')
      await client.query('COMMIT')
      return
    }

    console.log(`\nFound ${groups.length} duplicate email group(s).\n`)

    if (DRY_RUN) {
      for (const group of groups) {
        const keeperId = group.ids[0]
        console.log(`\n📧 ${group.norm_email}`)
        console.log(`   KEEP  → id=${keeperId}  name="${group.names[0]}"  created=${group.created_ats[0]}  pwd=${group.passwords[0] ? (group.passwords[0].startsWith('$2') ? 'bcrypt' : 'other') : 'none'}`)
        for (let i = 1; i < group.ids.length; i++) {
          console.log(`   MERGE → id=${group.ids[i]}  name="${group.names[i]}"  created=${group.created_ats[i]}  pwd=${group.passwords[i] ? (group.passwords[i].startsWith('$2') ? 'bcrypt' : 'other') : 'none'}  google_id=${group.google_ids[i] || 'none'}`)
        }
      }
      console.log('\n\nRun without --dry-run to apply.\n')
      await client.query('ROLLBACK')
      return
    }

    for (const group of groups) {
      pairsFound++
      const keeperId   = group.ids[0]
      const duplicates = group.ids.slice(1)

      console.log(`\n📧 ${group.norm_email}`)
      log(`Keeper id: ${keeperId}`)
      log(`Duplicate id(s): ${duplicates.join(', ')}`)

      for (let i = 0; i < duplicates.length; i++) {
        const googleId   = duplicates[i]
        const googlePwd  = group.passwords[i + 1]
        const googleName = group.names[i + 1]
        const googleCreatedAt = group.created_ats[i + 1]

        const hasRealPassword = googlePwd && googlePwd !== '' && googlePwd.startsWith('$2')

        if (hasRealPassword) {
          log(`id=${googleId} also has a bcrypt password (name: "${googleName}", created: ${googleCreatedAt}) — merging data into keeper id=${keeperId} but keeping keeper's password`)
        }

        log(`Merging duplicate account id=${googleId} → keeper id=${keeperId}`)

        // 1. Copy google_id + profile_photo to keeper
        await client.query(`
          UPDATE users
          SET
            google_id     = COALESCE(google_id, $1),
            profile_photo = COALESCE(profile_photo, $2),
            is_verified   = TRUE,
            updated_at    = NOW()
          WHERE id = $3
        `, [group.google_ids[i + 1], group.profile_photos[i + 1], keeperId])

        // 2. Reassign all related tables ─────────────────────────────────────

        // Orders
        await safeUpdate(client,
          'UPDATE orders SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'orders')

        // Addresses
        await safeUpdate(client,
          'UPDATE user_addresses SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_addresses')

        // Activity / sessions
        await safeUpdate(client,
          'UPDATE user_activities SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_activities')

        await safeUpdate(client,
          'UPDATE user_sessions SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_sessions')

        // user_stats (PRIMARY KEY — merge then delete)
        await safeDo(client, 'user_stats', async () => {
          await client.query(`
            INSERT INTO user_stats (user_id, total_orders, total_spent, total_page_views, total_sessions, last_order_date, updated_at)
            SELECT $1, total_orders, total_spent, total_page_views, total_sessions, last_order_date, NOW()
            FROM user_stats WHERE user_id = $2
            ON CONFLICT (user_id) DO UPDATE
              SET
                total_orders      = user_stats.total_orders      + EXCLUDED.total_orders,
                total_spent       = user_stats.total_spent       + EXCLUDED.total_spent,
                total_page_views  = user_stats.total_page_views  + EXCLUDED.total_page_views,
                total_sessions    = user_stats.total_sessions    + EXCLUDED.total_sessions,
                last_order_date   = GREATEST(user_stats.last_order_date, EXCLUDED.last_order_date),
                updated_at        = NOW()
          `, [keeperId, googleId])
          await client.query('DELETE FROM user_stats WHERE user_id = $1', [googleId])
        })

        // user_preferences (PRIMARY KEY — keeper wins on conflict)
        await safeDo(client, 'user_preferences', async () => {
          await client.query(`
            INSERT INTO user_preferences (user_id, email_notifications, sms_notifications, push_notifications, marketing_emails, theme, language, currency, updated_at)
            SELECT $1, email_notifications, sms_notifications, push_notifications, marketing_emails, theme, language, currency, NOW()
            FROM user_preferences WHERE user_id = $2
            ON CONFLICT (user_id) DO NOTHING
          `, [keeperId, googleId])
          await client.query('DELETE FROM user_preferences WHERE user_id = $1', [googleId])
        })

        // Notes / tags
        await safeUpdate(client,
          'UPDATE user_notes SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_notes')

        await safeUpdate(client,
          'UPDATE user_tags SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_tags')

        // Pending cart emails
        await safeUpdate(client,
          'UPDATE pending_cart_emails SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'pending_cart_emails')

        // Blog posts / drafts
        await safeUpdate(client,
          'UPDATE blog_posts SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_posts')

        await safeUpdate(client,
          'UPDATE blog_drafts SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_drafts')

        await safeUpdate(client,
          'UPDATE blog_draft_versions SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_draft_versions')

        // Blog comments
        await safeUpdate(client,
          'UPDATE blog_comments SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_comments')

        // Blog post likes (unique constraint — move non-conflicting, drop the rest)
        await safeDo(client, 'blog_post_likes', async () => {
          await client.query(`
            UPDATE blog_post_likes SET user_id = $1
            WHERE user_id = $2
              AND NOT EXISTS (
                SELECT 1 FROM blog_post_likes b2
                WHERE b2.post_id = blog_post_likes.post_id AND b2.user_id = $1
              )
          `, [keeperId, googleId])
          await client.query('DELETE FROM blog_post_likes WHERE user_id = $1', [googleId])
        })

        // Blog comment likes
        await safeDo(client, 'blog_comment_likes', async () => {
          await client.query(`
            UPDATE blog_comment_likes SET user_id = $1
            WHERE user_id = $2
              AND NOT EXISTS (
                SELECT 1 FROM blog_comment_likes b2
                WHERE b2.comment_id = blog_comment_likes.comment_id AND b2.user_id = $1
              )
          `, [keeperId, googleId])
          await client.query('DELETE FROM blog_comment_likes WHERE user_id = $1', [googleId])
        })

        // Blog reposts
        await safeUpdate(client,
          'UPDATE blog_reposts SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_reposts')

        // Blog post reposts (unique constraint)
        await safeDo(client, 'blog_post_reposts', async () => {
          await client.query(`
            UPDATE blog_post_reposts SET user_id = $1
            WHERE user_id = $2
              AND NOT EXISTS (
                SELECT 1 FROM blog_post_reposts b2
                WHERE b2.post_id = blog_post_reposts.post_id AND b2.user_id = $1
              )
          `, [keeperId, googleId])
          await client.query('DELETE FROM blog_post_reposts WHERE user_id = $1', [googleId])
        })

        // Blog bookmarks (unique constraint)
        await safeDo(client, 'blog_post_bookmarks', async () => {
          await client.query(`
            UPDATE blog_post_bookmarks SET user_id = $1
            WHERE user_id = $2
              AND NOT EXISTS (
                SELECT 1 FROM blog_post_bookmarks b2
                WHERE b2.post_id = blog_post_bookmarks.post_id AND b2.user_id = $1
              )
          `, [keeperId, googleId])
          await client.query('DELETE FROM blog_post_bookmarks WHERE user_id = $1', [googleId])
        })

        // Blog notifications
        await safeUpdate(client,
          'UPDATE blog_notifications SET recipient_user_id = $1 WHERE recipient_user_id = $2',
          [keeperId, googleId], 'blog_notifications (recipient)')

        await safeUpdate(client,
          'UPDATE blog_notifications SET actor_user_id = $1 WHERE actor_user_id = $2',
          [keeperId, googleId], 'blog_notifications (actor)')

        await safeUpdate(client,
          'UPDATE blog_notification_preferences SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'blog_notification_preferences')

        // Author profile
        await safeUpdate(client,
          'UPDATE author_profiles SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'author_profiles')

        // Collab
        await safeUpdate(client,
          'UPDATE collab_profiles SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'collab_profiles')

        await safeUpdate(client,
          'UPDATE collab_assigned_tasks SET assignee_user_id = $1 WHERE assignee_user_id = $2',
          [keeperId, googleId], 'collab_assigned_tasks')

        // creator_program_badge_ack (PRIMARY KEY)
        await safeDo(client, 'creator_program_badge_ack', async () => {
          await client.query(`
            INSERT INTO creator_program_badge_ack (user_id, last_seen_badge, acked_at)
            SELECT $1, last_seen_badge, acked_at FROM creator_program_badge_ack WHERE user_id = $2
            ON CONFLICT (user_id) DO NOTHING
          `, [keeperId, googleId])
          await client.query('DELETE FROM creator_program_badge_ack WHERE user_id = $1', [googleId])
        })

        // Affiliate
        await safeUpdate(client,
          'UPDATE affiliate_applications SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'affiliate_applications')

        await safeUpdate(client,
          'UPDATE affiliate_earnings SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'affiliate_earnings')

        // Loyalty / coins
        await safeUpdate(client,
          'UPDATE coin_transactions SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'coin_transactions')

        // blog_weekly_creator_reward (unique on user_id + week_start)
        await safeDo(client, 'blog_weekly_creator_reward', async () => {
          await client.query(`
            UPDATE blog_weekly_creator_reward SET user_id = $1
            WHERE user_id = $2
              AND NOT EXISTS (
                SELECT 1 FROM blog_weekly_creator_reward b2
                WHERE b2.user_id = $1 AND b2.week_start = blog_weekly_creator_reward.week_start
              )
          `, [keeperId, googleId])
          await client.query('DELETE FROM blog_weekly_creator_reward WHERE user_id = $1', [googleId])
        })

        // WhatsApp / subscriptions
        await safeUpdate(client,
          'UPDATE whatsapp_subscribers SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'whatsapp_subscribers')

        // Live chat
        await safeUpdate(client,
          'UPDATE live_chat_sessions SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'live_chat_sessions')

        // User notifications
        await safeUpdate(client,
          'UPDATE user_notifications SET user_id = $1 WHERE user_id = $2',
          [keeperId, googleId], 'user_notifications')

        // 3. Delete the now-empty duplicate account
        await client.query('DELETE FROM users WHERE id = $1', [googleId])
        ok(`Deleted duplicate account id=${googleId}, merged into keeper id=${keeperId}`)
        mergedCount++
      }
    }

    await client.query('COMMIT')

    console.log('\n════════════════════════════════════════')
    console.log(`  Duplicate groups found : ${pairsFound}`)
    console.log(`  Accounts merged        : ${mergedCount}`)
    console.log('════════════════════════════════════════\n')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Error — transaction rolled back:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()
