import { Request, Response, Router } from 'express'
import { Pool } from 'pg'
import { generateUniqueUserId } from '../utils/generateUserId'
import { fetchReelData, captionMentionsNefol, getPageTokenForCollab, extractShortcode, NEFOL_KEYWORDS } from './instagram'

// ─── Thresholds ────────────────────────────────────────────────────────────────
const AFFILIATE_THRESHOLD_VIEWS = 10_000
const AFFILIATE_THRESHOLD_LIKES = 500

// ─── Helpers ───────────────────────────────────────────────────────────────────
function normalizeHandle(handle: string): string {
  return String(handle || '').trim().replace(/^@/, '').toLowerCase()
}

function parseInstagramHandles(instagram: string | null | undefined, instagramHandles?: string[]): string[] {
  const fromList = Array.isArray(instagramHandles) ? instagramHandles : []
  const fromSingle = String(instagram || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
  const merged = [...fromList, ...fromSingle].map(normalizeHandle).filter(Boolean)
  return Array.from(new Set(merged))
}

function computeProgress(totalViews: number, totalLikes: number) {
  const viewsPct = Math.min(1, totalViews / AFFILIATE_THRESHOLD_VIEWS)
  const likesPct = Math.min(1, totalLikes / AFFILIATE_THRESHOLD_LIKES)
  const progress = Math.round((viewsPct * 50 + likesPct * 50))
  const affiliateUnlocked = totalViews >= AFFILIATE_THRESHOLD_VIEWS && totalLikes >= AFFILIATE_THRESHOLD_LIKES
  return { progress, affiliateUnlocked }
}

/** Ensure DB schema has Instagram OAuth columns on collab_applications + collab_reels validation fields */
async function ensureCollabSchema(pool: Pool) {
  await pool.query(`
    ALTER TABLE collab_applications
      ADD COLUMN IF NOT EXISTS instagram_connected   BOOLEAN     DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS fb_user_access_token  TEXT,
      ADD COLUMN IF NOT EXISTS fb_page_id            TEXT,
      ADD COLUMN IF NOT EXISTS fb_page_access_token  TEXT,
      ADD COLUMN IF NOT EXISTS ig_user_id            TEXT,
      ADD COLUMN IF NOT EXISTS ig_username           TEXT,
      ADD COLUMN IF NOT EXISTS token_expires_at      TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS token_updated_at      TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS collab_joined_at      TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS platforms             JSONB       DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS address               JSONB       DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS profile               JSONB       DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS phone_code            TEXT;

    ALTER TABLE collab_reels
      ADD COLUMN IF NOT EXISTS reel_posted_at        TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS caption               TEXT,
      ADD COLUMN IF NOT EXISTS caption_ok            BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS date_ok               BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS rejection_reason      TEXT,
      ADD COLUMN IF NOT EXISTS insights_pending      BOOLEAN DEFAULT FALSE;
  `)
}

async function resolveUniqueUserId(pool: Pool, req: Request): Promise<{ uniqueUserId: string | null; email: string | null }> {
  const token = req.headers.authorization?.replace('Bearer ', '').trim() || ''
  const parts = token.split('_')

  let uniqueUserId: string | null = null
  let email: string | null = null

  if (parts.length >= 3 && parts[0] === 'user' && parts[1] === 'token') {
    const numericId = parts[2]
    const userRes = await pool.query('SELECT id, email, unique_user_id FROM users WHERE id = $1 LIMIT 1', [numericId])
    const row = userRes.rows[0]
    email = row?.email || null
    uniqueUserId = row?.unique_user_id || null

    // Auto-generate unique_user_id for older accounts
    if (row?.id && !uniqueUserId) {
      const generated = await generateUniqueUserId(pool)
      const updated = await pool.query(
        'UPDATE users SET unique_user_id = $1 WHERE id = $2 AND unique_user_id IS NULL RETURNING unique_user_id',
        [generated, row.id]
      )
      uniqueUserId = updated.rows[0]?.unique_user_id || generated
    }
  }

  // Fallback to query param email
  if (!email) {
    const queryEmail = req.query?.email
    if (typeof queryEmail === 'string' && queryEmail.trim()) {
      email = queryEmail.trim()
    }
  }

  return { uniqueUserId, email }
}

// ─── Submit Collab Application ─────────────────────────────────────────────────
interface PlatformEntry { name: string; links?: string[]; link?: string }
interface AddressEntry { country?: string; state?: string; city?: string; pincode?: string }

export async function submitCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    const {
      name, email, phone, phone_code, instagram, instagram_handles, youtube, facebook,
      followers, message, agreeTerms, platforms, address, profile,
    } = req.body

    if (!name || !email || !phone || !agreeTerms) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email address' })

    const handles = parseInstagramHandles(instagram, instagram_handles)

    // Normalise platforms: support both {link} (legacy) and {links[]} (new)
    const normPlatforms: PlatformEntry[] = Array.isArray(platforms)
      ? platforms
          .filter((p: any) => p?.name?.trim())
          .map((p: any) => {
            const links: string[] = Array.isArray(p.links)
              ? p.links.map((l: string) => l.trim()).filter(Boolean)
              : p.link ? [p.link.trim()] : []
            return { name: p.name.trim().toLowerCase(), links }
          })
          .filter((p) => p.links!.length > 0 || true) // keep even empty ones so checkbox state persists
      : []

    // Auto-include instagram if handles provided but no instagram platform
    const igPlatform = normPlatforms.find((p) => p.name === 'instagram')
    if (!igPlatform && handles.length > 0) {
      normPlatforms.unshift({ name: 'instagram', links: handles.map((h) => `https://www.instagram.com/${h}`) })
    }

    const normAddress: AddressEntry = address && typeof address === 'object' ? {
      country: (address.country || '').trim() || undefined,
      state:   (address.state   || '').trim() || undefined,
      city:    (address.city    || '').trim() || undefined,
      pincode: (address.pincode || '').trim() || undefined,
    } : {}

    const { uniqueUserId } = await resolveUniqueUserId(pool, req)
    const storedInstagram = handles.join(',')

    // Normalise profile
    const bm = String(profile?.birth_month || '').trim()
    const bd = String(profile?.birth_day || '').trim()
    const by = String(profile?.birth_year || '').trim()
    let birthdate = String(profile?.birthdate || '').trim()
    if (!birthdate && bm && bd) {
      if (by && /^\d{4}$/.test(by)) birthdate = `${by}-${bm.padStart(2, '0')}-${bd.padStart(2, '0')}`
    }

    const normProfile = {
      phone_code: (phone_code || '').trim(),
      birthdate,
      birth_month: bm,
      birth_day: bd,
      birth_year: by,
      gender:          (profile?.gender          || '').trim(),
      marital_status:  (profile?.marital_status  || '').trim(),
      anniversary:     (profile?.anniversary     || '').trim(),
      occupation:      (profile?.occupation      || '').trim(),
      education:       (profile?.education       || '').trim(),
      education_branch:(profile?.education_branch|| '').trim(),
      followers_range: (profile?.followers_range || followers || '').trim(),
      bio:             (profile?.bio             || message   || '').trim(),
      niche:     Array.isArray(profile?.niche)     ? profile.niche     : [],
      skills:    Array.isArray(profile?.skills)    ? profile.skills    : [],
      languages: Array.isArray(profile?.languages) ? profile.languages : [],
    }

    const { rows } = await pool.query(
      `INSERT INTO collab_applications
         (name, email, phone, phone_code, instagram, youtube, facebook, followers, message, agree_terms,
          status, unique_user_id, collab_joined_at, platforms, address, profile)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,NOW(),$12,$13,$14)
       RETURNING id, email, status, created_at, instagram`,
      [
        name, email, phone, normProfile.phone_code, storedInstagram,
        (youtube || '').trim() || null, (facebook || '').trim() || null,
        normProfile.followers_range || null, normProfile.bio || null, !!agreeTerms,
        uniqueUserId,
        JSON.stringify(normPlatforms), JSON.stringify(normAddress), JSON.stringify(normProfile),
      ]
    )

    return res.status(201).json({
      application: { ...rows[0], instagram_handles: handles, platforms: normPlatforms, address: normAddress, profile: normProfile },
      message: 'Application submitted successfully.',
    })
  } catch (err) {
    console.error('Collab application error:', err)
    return res.status(500).json({ message: 'Failed to submit application' })
  }
}

// ─── Get Collab Status (user-facing) ──────────────────────────────────────────
export async function getCollabStatus(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)

    if (!uniqueUserId && !email) {
      return res.status(400).json({ message: 'Authentication required' })
    }

    let rows: any[] = []
    const BASE_SELECT = `
      SELECT ca.id, ca.email, ca.instagram, COALESCE(ca.status, 'pending') AS status, ca.created_at,
             ca.instagram_connected, ca.ig_username, ca.ig_user_id, ca.collab_joined_at,
             ca.platforms,
             (SELECT COALESCE(SUM(views_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id AND caption_ok = true AND date_ok = true AND COALESCE(content_status,'auto') NOT IN ('rejected','flagged')) AS total_views,
             (SELECT COALESCE(SUM(likes_count), 0)::int FROM collab_reels WHERE collab_application_id = ca.id AND caption_ok = true AND date_ok = true AND COALESCE(content_status,'auto') NOT IN ('rejected','flagged')) AS total_likes
      FROM collab_applications ca
    `

    if (uniqueUserId) {
      const result = await pool.query(
        `${BASE_SELECT} WHERE ca.unique_user_id = $1 ORDER BY ca.created_at DESC LIMIT 1`,
        [uniqueUserId]
      )
      rows = result.rows
    }

    if (rows.length === 0 && email) {
      const result = await pool.query(
        `${BASE_SELECT} WHERE LOWER(ca.email) = LOWER($1) ORDER BY ca.created_at DESC LIMIT 1`,
        [email]
      )
      rows = result.rows

      // Backfill unique_user_id on old records
      if (rows.length > 0 && uniqueUserId) {
        await pool.query(
          `UPDATE collab_applications SET unique_user_id = $1 WHERE id = $2 AND unique_user_id IS NULL`,
          [uniqueUserId, rows[0].id]
        )
      }
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No collab application found' })
    }

    const app = rows[0]
    const totalViews = Number(app.total_views) || 0
    const totalLikes = Number(app.total_likes) || 0
    const { progress, affiliateUnlocked } = computeProgress(totalViews, totalLikes)

    const reelsRes = await pool.query(
      `SELECT id, reel_url, instagram_username, platform_username, platform,
              views_count, likes_count, snapshot_views, snapshot_likes,
              verified, created_at, reel_posted_at, caption, caption_ok, date_ok,
              rejection_reason, content_status, insights_pending
       FROM collab_reels
       WHERE collab_application_id = $1
       ORDER BY created_at DESC`,
      [app.id]
    )

    // Fetch connected third-party platform connections
    let platformConnections: any[] = []
    try {
      const pcRes = await pool.query(
        `SELECT platform, platform_username, platform_user_id, connected_at, token_expires_at
         FROM collab_platform_connections WHERE collab_application_id = $1`,
        [app.id]
      )
      platformConnections = pcRes.rows
    } catch (_) { /* table may not exist yet on older DBs */ }

    const rawPlatforms = app.platforms
    const platformsList = Array.isArray(rawPlatforms)
      ? rawPlatforms
      : typeof rawPlatforms === 'string'
        ? (() => { try { return JSON.parse(rawPlatforms) } catch { return [] } })()
        : []

    return res.json({
      id: app.id,
      email: app.email,
      instagram: app.instagram,
      instagram_handles: parseInstagramHandles(app.instagram),
      instagram_connected: !!app.instagram_connected,
      ig_username: app.ig_username || null,
      ig_user_id: app.ig_user_id || null,
      collab_joined_at: app.collab_joined_at || app.created_at,
      platforms: platformsList,
      reels: reelsRes.rows,
      platform_connections: platformConnections,
      status: app.status,
      created_at: app.created_at,
      total_views: totalViews,
      total_likes: totalLikes,
      progress,
      affiliate_unlocked: affiliateUnlocked,
      threshold_views: AFFILIATE_THRESHOLD_VIEWS,
      threshold_likes: AFFILIATE_THRESHOLD_LIKES,
    })
  } catch (err) {
    console.error('Collab status error:', err)
    return res.status(500).json({ message: 'Failed to fetch status' })
  }
}

// ─── Submit Reel Link ─────────────────────────────────────────────────────────
// Accepts pre-fetched data from the sync picker (avoids double API call)
// or falls back to fetching fresh from the IG API.
interface IncomingReel {
  reel_url: string
  instagram_handle?: string
  prefetched?: {
    views: number
    likes: number
    postedAt: string | null
    caption: string | null
    caption_ok: boolean
    date_ok: boolean
  }
}

export async function submitReelLink(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    const { collab_id, reel_url, reel_urls, instagram_handle, platform: reqPlatform } = req.body
    const platform: string = (reqPlatform || 'instagram').toLowerCase()

    if (!collab_id) return res.status(400).json({ message: 'Collab ID required' })

    const { rows } = await pool.query(
      `SELECT id, instagram, status, instagram_connected, fb_page_access_token, ig_user_id, collab_joined_at, created_at
       FROM collab_applications WHERE id = $1`,
      [collab_id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Collab application not found' })

    const app = rows[0]
    if (String(app.status || 'pending').toLowerCase() !== 'approved') {
      return res.status(403).json({ message: 'Your collab request is pending admin approval.' })
    }

    // Instagram-only: require Instagram connection
    if (platform === 'instagram') {
      if (!app.instagram_connected || !app.fb_page_access_token || !app.ig_user_id) {
        return res.status(403).json({ message: 'Please connect your Instagram account before submitting reels.' })
      }
    }

    const allowedHandles = parseInstagramHandles(app.instagram)

    const incoming: IncomingReel[] = Array.isArray(reel_urls)
      ? reel_urls
      : reel_url
      ? [{ reel_url, instagram_handle }]
      : []

    if (!incoming.length) return res.status(400).json({ message: 'Please submit at least one URL' })

    // Instagram-specific URL validation
    if (platform === 'instagram') {
      for (const item of incoming) {
        const url = String(item.reel_url || '').trim()
        const handle = normalizeHandle(item.instagram_handle || '')
        if (!url) return res.status(400).json({ message: 'Reel URL cannot be empty' })
        if (!url.includes('instagram.com') && !url.includes('instagr.am'))
          return res.status(400).json({ message: 'All links must be valid Instagram reel URLs' })
        if (!extractShortcode(url)) return res.status(400).json({ message: `Not a valid reel URL: ${url}` })
        if (!handle) return res.status(400).json({ message: 'Select an Instagram handle for each reel' })
        if (allowedHandles.length > 0 && !allowedHandles.includes(handle))
          return res.status(400).json({ message: `Handle @${handle} is not on your approved list` })
      }
    }

    const collabJoinedAt = new Date(app.collab_joined_at || app.created_at)
    const pageToken: string = app.fb_page_access_token
    const igUserId: string  = app.ig_user_id
    const client = await pool.connect()
    const results: any[] = []

    try {
      await client.query('BEGIN')

      for (const item of incoming) {
        const url    = String(item.reel_url).trim()
        const handle = platform === 'instagram' ? normalizeHandle(item.instagram_handle || '') : (item.instagram_handle || '')

        // Duplicate check
        const dup = await client.query(
          'SELECT id FROM collab_reels WHERE collab_application_id = $1 AND reel_url = $2',
          [collab_id, url]
        )
        if (dup.rows.length > 0) {
          await client.query('ROLLBACK')
          return res.status(409).json({ message: `Content already submitted: ${url}` })
        }

        let views: number
        let likes: number
        let postedAt: string | null
        let caption: string | null
        let captionOk: boolean
        let dateOk: boolean
        let insightsPending: boolean

        if (item.prefetched) {
          // Pre-fetched from platform picker (Instagram sync or YouTube/Reddit/VK)
          views           = item.prefetched.views
          likes           = item.prefetched.likes
          postedAt        = item.prefetched.postedAt
          caption         = item.prefetched.caption
          captionOk       = item.prefetched.caption_ok
          dateOk          = item.prefetched.date_ok
          insightsPending = false
        } else if (platform === 'instagram') {
          // Fresh fetch from Instagram Graph API
          const reelData = await fetchReelData(url, pageToken, igUserId)
          if (reelData === null) {
            console.warn(`fetchReelData returned null for ${url} — storing as insights_pending`)
          }
          views           = reelData?.views   ?? 0
          likes           = reelData?.likes   ?? 0
          postedAt        = reelData?.postedAt ?? null
          caption         = reelData?.caption  ?? null
          insightsPending = reelData === null

          const reelDate = postedAt ? new Date(postedAt) : null
          dateOk    = insightsPending ? true : (reelDate !== null && reelDate >= collabJoinedAt)
          captionOk = insightsPending ? false : captionMentionsNefol(caption)

          if (!insightsPending && !dateOk) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              message: `Reel posted before you joined (joined: ${collabJoinedAt.toLocaleDateString()}). Only reels posted after joining are eligible.`,
            })
          }
          if (!insightsPending && !captionOk) {
            await client.query('ROLLBACK')
            return res.status(400).json({
              message: `Caption must include #nefol or #neföl. Update your reel caption and try again.`,
            })
          }
        } else {
          // Non-Instagram without prefetch: store with pending metrics
          views = likes = 0; postedAt = null; caption = null
          captionOk = false; dateOk = false; insightsPending = true
        }

        await client.query(
          `INSERT INTO collab_reels
             (collab_application_id, reel_url, instagram_username, platform_username, platform,
              views_count, likes_count, snapshot_views, snapshot_likes,
              verified, reel_posted_at, caption, caption_ok, date_ok, insights_pending,
              content_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [collab_id, url,
           platform === 'instagram' ? handle : null,
           handle,
           platform,
           views, likes,
           views, likes,   // snapshot = initial value, never overwritten by cron
           !insightsPending,
           postedAt, caption, captionOk, dateOk, insightsPending,
           'auto']         // content_status starts as 'auto' (ruled by caption_ok + date_ok)
        )

        results.push({ url, views, likes, insights_pending: insightsPending })
      }

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    const sumRes = await pool.query(
      `SELECT COALESCE(SUM(views_count),0)::int AS v, COALESCE(SUM(likes_count),0)::int AS l
       FROM collab_reels WHERE collab_application_id=$1 AND caption_ok=true AND date_ok=true
         AND COALESCE(content_status,'auto') NOT IN ('rejected','flagged')`,
      [collab_id]
    )
    const totalViews = sumRes.rows[0]?.v || 0
    const totalLikes = sumRes.rows[0]?.l || 0
    const { progress, affiliateUnlocked } = computeProgress(totalViews, totalLikes)
    const pendingCount = results.filter((r) => r.insights_pending).length
    const label = platform === 'instagram' ? 'reel' : 'post'

    return res.status(201).json({
      message: pendingCount > 0
        ? `${results.length} ${label}${results.length > 1 ? 's' : ''} submitted. ${pendingCount} are syncing — metrics will update automatically.`
        : `${results.length} ${label}${results.length > 1 ? 's' : ''} submitted successfully`,
      submitted_count: results.length,
      pending_count: pendingCount,
      reels: results,
      total_views: totalViews,
      total_likes: totalLikes,
      progress,
      affiliate_unlocked: affiliateUnlocked,
    })
  } catch (err) {
    console.error('Content submission error:', err)
    return res.status(500).json({ message: 'Failed to submit content' })
  }
}

// ─── User: Delete own reel ─────────────────────────────────────────────────────
export async function deleteReel(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { collab_id } = req.body as { collab_id?: number }
    if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

    const result = await pool.query(
      'DELETE FROM collab_reels WHERE id=$1 AND collab_application_id=$2 RETURNING id',
      [id, collab_id]
    )
    if (!result.rows.length) return res.status(404).json({ message: 'Reel not found' })
    return res.json({ message: 'Reel removed' })
  } catch (err) {
    console.error('deleteReel error:', err)
    return res.status(500).json({ message: 'Failed to remove reel' })
  }
}

// ─── Admin: List Collab Applications ──────────────────────────────────────────
export async function getCollabApplications(pool: Pool, req: Request, res: Response) {
  try {
    const {
      status = 'all', page = 1, limit = 20, search = '',
      platform = '', city = '', state = '', country = '',
      gender = '', niche = '', education = '', occupation = '', language = '',
      followers_range = '',
    } = req.query as Record<string, string>
    const offset = (Number(page) - 1) * Number(limit)
    const clauses: string[] = []
    const params: any[] = []

    if (status && status !== 'all') {
      params.push(status)
      clauses.push(`ca.status = $${params.length}`)
    }

    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`)
      clauses.push(`(
        LOWER(ca.name) LIKE $${params.length}
        OR LOWER(ca.email) LIKE $${params.length}
        OR LOWER(COALESCE(ca.instagram, '')) LIKE $${params.length}
        OR LOWER(COALESCE(ca.ig_username, '')) LIKE $${params.length}
        OR LOWER(COALESCE(ca.unique_user_id, '')) LIKE $${params.length}
      )`)
    }

    // Platform filter — supports comma-separated: "instagram,reddit"
    const platformList = platform.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)
    for (const p of platformList) {
      params.push(JSON.stringify([{ name: p }]))
      clauses.push(`ca.platforms @> $${params.length}::jsonb`)
    }

    // Address filters
    if (city.trim()) {
      params.push(`%${city.trim()}%`)
      clauses.push(`ca.address->>'city' ILIKE $${params.length}`)
    }
    if (state.trim()) {
      params.push(`%${state.trim()}%`)
      clauses.push(`ca.address->>'state' ILIKE $${params.length}`)
    }
    if (country.trim()) {
      params.push(`%${country.trim()}%`)
      clauses.push(`ca.address->>'country' ILIKE $${params.length}`)
    }

    // Profile filters
    if (gender.trim()) {
      params.push(gender.trim())
      clauses.push(`ca.profile->>'gender' = $${params.length}`)
    }
    if (education.trim()) {
      params.push(education.trim())
      clauses.push(`ca.profile->>'education' = $${params.length}`)
    }
    if (occupation.trim()) {
      params.push(occupation.trim())
      clauses.push(`ca.profile->>'occupation' = $${params.length}`)
    }
    if (followers_range.trim()) {
      params.push(followers_range.trim())
      clauses.push(`ca.profile->>'followers_range' = $${params.length}`)
    }
    if (niche.trim()) {
      params.push(JSON.stringify([niche.trim()]))
      clauses.push(`ca.profile->'niche' @> $${params.length}::jsonb`)
    }
    if (language.trim()) {
      params.push(JSON.stringify([language.trim()]))
      clauses.push(`ca.profile->'languages' @> $${params.length}::jsonb`)
    }

    const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''

    params.push(Number(limit))
    const limitParam = `$${params.length}`
    params.push(offset)
    const offsetParam = `$${params.length}`

    const query = `
      SELECT ca.*,
             COALESCE(SUM(CASE WHEN cr.caption_ok AND cr.date_ok THEN cr.views_count ELSE 0 END), 0)::int AS total_views,
             COALESCE(SUM(CASE WHEN cr.caption_ok AND cr.date_ok THEN cr.likes_count ELSE 0 END), 0)::int AS total_likes
      FROM collab_applications ca
      LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
      ${whereSql}
      GROUP BY ca.id
      ORDER BY ca.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `

    const rows = (await pool.query(query, params)).rows
    const mapped = rows.map((r: any) => ({
      ...r,
      instagram_handles: parseInstagramHandles(r.instagram),
      platforms: Array.isArray(r.platforms) ? r.platforms : [],
      address: r.address && typeof r.address === 'object' ? r.address : {},
      profile: r.profile && typeof r.profile === 'object' ? r.profile : {},
    }))

    const countParams = params.slice(0, params.length - 2)
    const countWhere = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM collab_applications ca ${countWhere}`,
      countParams
    )

    return res.json({
      applications: mapped,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: countRes.rows[0]?.total || 0,
        pages: Math.ceil((countRes.rows[0]?.total || 0) / Number(limit)),
      },
    })
  } catch (err) {
    console.error('getCollabApplications error:', err)
    return res.status(500).json({ message: 'Failed to fetch collab applications' })
  }
}

export async function getCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const appRes = await pool.query('SELECT * FROM collab_applications WHERE id = $1', [id])
    if (!appRes.rows.length) return res.status(404).json({ message: 'Collab application not found' })

    const reelsRes = await pool.query(
      `SELECT id, reel_url, instagram_username, views_count, likes_count, verified,
              created_at, reel_posted_at, caption, caption_ok, date_ok, rejection_reason, insights_pending
       FROM collab_reels WHERE collab_application_id = $1 ORDER BY created_at DESC`,
      [id]
    )

    const app = appRes.rows[0]
    const reels = reelsRes.rows
    const totalViews = reels.filter((r: any) => r.caption_ok && r.date_ok).reduce((s: number, r: any) => s + (r.views_count || 0), 0)
    const totalLikes = reels.filter((r: any) => r.caption_ok && r.date_ok).reduce((s: number, r: any) => s + (r.likes_count || 0), 0)
    const pendingCount = reels.filter((r: any) => r.insights_pending).length
    const { progress, affiliateUnlocked } = computeProgress(totalViews, totalLikes)

    return res.json({
      ...app,
      instagram_handles: parseInstagramHandles(app.instagram),
      reels,
      total_views: totalViews,
      total_likes: totalLikes,
      pending_count: pendingCount,
      progress,
      affiliate_unlocked: affiliateUnlocked,
    })
  } catch (err) {
    console.error('getCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to fetch collab application' })
  }
}

// ─── Admin: Update reel metrics manually ──────────────────────────────────────
export async function adminUpdateReelMetrics(pool: Pool, req: Request, res: Response) {
  try {
    const { reelId } = req.params
    const { views_count, likes_count, caption_ok, date_ok, admin_note } = req.body

    const fields: string[] = ['updated_at = NOW()']
    const params: any[]    = []

    if (views_count !== undefined) { params.push(Number(views_count)); fields.push(`views_count = $${params.length}`) }
    if (likes_count !== undefined) { params.push(Number(likes_count)); fields.push(`likes_count = $${params.length}`) }
    if (caption_ok  !== undefined) { params.push(!!caption_ok);        fields.push(`caption_ok = $${params.length}`) }
    if (date_ok     !== undefined) { params.push(!!date_ok);           fields.push(`date_ok = $${params.length}`) }
    if (admin_note  !== undefined) { params.push(String(admin_note));  fields.push(`rejection_reason = $${params.length}`) }

    // When admin manually sets metrics, clear insights_pending and mark verified
    params.push(false); fields.push(`insights_pending = $${params.length}`)
    params.push(true);  fields.push(`verified = $${params.length}`)

    params.push(Number(reelId))
    const result = await pool.query(
      `UPDATE collab_reels SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    )
    if (!result.rows.length) return res.status(404).json({ message: 'Reel not found' })
    return res.json({ message: 'Reel metrics updated', reel: result.rows[0] })
  } catch (err) {
    console.error('adminUpdateReelMetrics error:', err)
    return res.status(500).json({ message: 'Failed to update reel metrics' })
  }
}

// ─── Admin: Delete a reel ──────────────────────────────────────────────────────
export async function adminDeleteReel(pool: Pool, req: Request, res: Response) {
  try {
    const { reelId } = req.params
    const result = await pool.query('DELETE FROM collab_reels WHERE id=$1 RETURNING id', [reelId])
    if (!result.rows.length) return res.status(404).json({ message: 'Reel not found' })
    return res.json({ message: 'Reel deleted' })
  } catch (err) {
    console.error('adminDeleteReel error:', err)
    return res.status(500).json({ message: 'Failed to delete reel' })
  }
}

export async function approveCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { adminNotes } = req.body || {}
    const result = await pool.query(
      `UPDATE collab_applications
       SET status = 'approved', admin_notes = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [adminNotes || null, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })
    return res.json({ message: 'Collab application approved', application: result.rows[0] })
  } catch (err) {
    console.error('approveCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to approve collab application' })
  }
}

export async function rejectCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { rejectionReason } = req.body || {}
    if (!rejectionReason || !String(rejectionReason).trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' })
    }
    const result = await pool.query(
      `UPDATE collab_applications
       SET status = 'rejected', rejection_reason = $1, rejected_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [String(rejectionReason).trim(), id]
    )
    if (result.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })
    return res.json({ message: 'Collab application rejected', application: result.rows[0] })
  } catch (err) {
    console.error('rejectCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to reject collab application' })
  }
}

export async function promoteToAffiliate(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const appRes = await pool.query('SELECT * FROM collab_applications WHERE id = $1', [id])
    if (appRes.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })

    const app = appRes.rows[0]

    if (app.status !== 'approved') {
      await pool.query(
        `UPDATE collab_applications SET status = 'approved', approved_at = COALESCE(approved_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [id]
      )
    }

    // Insert synthetic reel exceeding both thresholds (admin bypass)
    await pool.query(
      `INSERT INTO collab_reels
         (collab_application_id, reel_url, instagram_username, views_count, likes_count, verified,
          caption_ok, date_ok, caption)
       VALUES ($1, $2, $3, $4, $5, true, true, true, 'admin-promoted')
       ON CONFLICT (collab_application_id, reel_url) DO UPDATE
         SET views_count = EXCLUDED.views_count, likes_count = EXCLUDED.likes_count,
             caption_ok = true, date_ok = true`,
      [id, `admin-promoted-${id}`, app.instagram?.split(',')[0]?.trim() || 'admin', AFFILIATE_THRESHOLD_VIEWS, AFFILIATE_THRESHOLD_LIKES]
    )

    return res.json({ message: 'User promoted to affiliate successfully' })
  } catch (err) {
    console.error('promoteToAffiliate error:', err)
    return res.status(500).json({ message: 'Failed to promote to affiliate' })
  }
}

export async function deleteCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const result = await pool.query('DELETE FROM collab_applications WHERE id = $1 RETURNING id', [id])
    if (result.rows.length === 0) return res.status(404).json({ message: 'Collab application not found' })
    return res.json({ message: 'Collab application deleted' })
  } catch (err) {
    console.error('deleteCollabApplication error:', err)
    return res.status(500).json({ message: 'Failed to delete collab application' })
  }
}

// ─── Check affiliate unlocked (used by JoinUs modal) ──────────────────────────
export async function checkAffiliateUnlocked(pool: Pool, req: Request, res: Response) {
  try {
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)
    const queryEmail = req.query?.email as string | undefined
    const resolvedEmail = email || queryEmail

    if (!uniqueUserId && !resolvedEmail) {
      return res.json({ unlocked: false })
    }

    const BASE = `
      SELECT COALESCE(SUM(CASE WHEN cr.caption_ok AND cr.date_ok THEN cr.views_count ELSE 0 END), 0)::int AS v,
             COALESCE(SUM(CASE WHEN cr.caption_ok AND cr.date_ok THEN cr.likes_count ELSE 0 END), 0)::int AS l
      FROM collab_applications ca
      LEFT JOIN collab_reels cr ON cr.collab_application_id = ca.id
    `

    let rows: any[] = []

    if (uniqueUserId) {
      const result = await pool.query(`${BASE} WHERE ca.unique_user_id = $1`, [uniqueUserId])
      rows = result.rows
    }

    if ((!rows.length || (!rows[0]?.v && !rows[0]?.l)) && resolvedEmail) {
      const result = await pool.query(`${BASE} WHERE LOWER(ca.email) = LOWER($1)`, [resolvedEmail])
      rows = result.rows
    }

    const v = rows[0]?.v || 0
    const l = rows[0]?.l || 0
    return res.json({ unlocked: v >= AFFILIATE_THRESHOLD_VIEWS && l >= AFFILIATE_THRESHOLD_LIKES })
  } catch (err) {
    console.error('Check affiliate unlocked:', err)
    return res.json({ unlocked: false })
  }
}

// ─── Admin: manually refresh reel stats via Instagram API ─────────────────────
export async function adminRefreshReelStats(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params // collab application id
    const conn = await getPageTokenForCollab(pool, Number(id))
    if (!conn) {
      return res.status(400).json({ message: 'No Instagram connection for this collab. User must connect their account first.' })
    }

    const reels = await pool.query(
      `SELECT id, reel_url FROM collab_reels WHERE collab_application_id = $1`,
      [id]
    )

    let updated = 0
    for (const reel of reels.rows) {
      const data = await fetchReelData(reel.reel_url, conn.pageToken, conn.igUserId)
      if (!data) continue
      await pool.query(
        `UPDATE collab_reels
         SET views_count = $1, likes_count = $2, reel_posted_at = $3, caption = $4,
             caption_ok = $5, date_ok = (reel_posted_at >= (SELECT collab_joined_at FROM collab_applications WHERE id = $6)),
             updated_at = NOW()
         WHERE id = $7`,
        [data.views, data.likes, data.postedAt, data.caption, captionMentionsNefol(data.caption), id, reel.id]
      )
      updated++
    }

    return res.json({ message: `Refreshed ${updated} reels for collab #${id}` })
  } catch (err) {
    console.error('adminRefreshReelStats error:', err)
    return res.status(500).json({ message: 'Failed to refresh reel stats' })
  }
}

// ─── Cron: refresh all approved connected collabs ─────────────────────────────
export async function refreshAllCollabStats(pool: Pool) {
  try {
    const { rows } = await pool.query(`
      SELECT ca.id, ca.fb_page_access_token, ca.ig_user_id, ca.collab_joined_at, ca.created_at,
             cr.id AS reel_id, cr.reel_url, cr.insights_pending
      FROM collab_applications ca
      JOIN collab_reels cr ON cr.collab_application_id = ca.id
      WHERE ca.instagram_connected = true
        AND ca.status = 'approved'
        AND ca.fb_page_access_token IS NOT NULL
        AND ca.ig_user_id IS NOT NULL
    `)

    let updated = 0
    let resolved = 0 // previously pending reels that now have data

    for (const row of rows) {
      try {
        const data = await fetchReelData(row.reel_url, row.fb_page_access_token, row.ig_user_id)
        if (!data) continue

        const collabJoinedAt = new Date(row.collab_joined_at || row.created_at)
        const reelDate = data.postedAt ? new Date(data.postedAt) : null
        const dateOk = reelDate !== null && reelDate >= collabJoinedAt
        const captionOk = captionMentionsNefol(data.caption)
        const wasPending = !!row.insights_pending

        await pool.query(
          `UPDATE collab_reels
           SET views_count      = $1,
               likes_count      = $2,
               reel_posted_at   = $3,
               caption          = $4,
               caption_ok       = $5,
               date_ok          = $6,
               insights_pending = false,
               verified         = true,
               updated_at       = NOW()
           WHERE id = $7`,
          [data.views, data.likes, data.postedAt, data.caption, captionOk, dateOk, row.reel_id]
        )

        updated++
        if (wasPending) resolved++
      } catch (e) {
        console.warn(`Refresh failed for reel ${row.reel_id}:`, e)
      }
    }

    if (updated > 0) {
      console.log(`✅ Collab stats refresh: updated ${updated} reels${resolved > 0 ? `, resolved ${resolved} pending` : ''}`)
    }
  } catch (err) {
    console.error('refreshAllCollabStats error:', err)
  }
}

// ─── Router ────────────────────────────────────────────────────────────────────
export default function collabRouter(pool: Pool) {
  const router = Router()
  router.post('/apply',             (req, res) => submitCollabApplication(pool, req, res))
  router.get('/status',             (req, res) => getCollabStatus(pool, req, res))
  router.post('/submit-reel',       (req, res) => submitReelLink(pool, req, res))
  router.delete('/reels/:id',       (req, res) => deleteReel(pool, req, res))
  router.get('/affiliate-unlocked', (req, res) => checkAffiliateUnlocked(pool, req, res))
  return router
}
