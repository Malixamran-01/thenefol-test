import { Request, Response, Router } from 'express'
import { Pool, PoolClient } from 'pg'
import { generateUniqueUserId } from '../utils/generateUserId'
import { verifyTurnstileToken } from '../utils/turnstile'
import {
  assertCollabNotBlockedByAppId,
  ensureCollabBlockSchema,
  getActiveCollabBlock,
  getCreatorProgramBlockForUserId,
} from '../utils/collabBlocks'
import { fetchReelData, captionMentionsNefol, getPageTokenForCollab, extractShortcode, NEFOL_KEYWORDS } from './instagram'
import { normalizeHandle, parseInstagramHandles } from '../utils/instagramHandles'

// ─── Thresholds ────────────────────────────────────────────────────────────────
const AFFILIATE_THRESHOLD_VIEWS = 10_000
const AFFILIATE_THRESHOLD_LIKES = 500

// ─── Helpers ───────────────────────────────────────────────────────────────────

function digitsOnly(s: string): string {
  return String(s || '').replace(/\D/g, '')
}

/** Canonical digit key for duplicate phone detection (country code + local). */
function normalizeCollabPhoneKey(
  phoneLocal: string,
  phoneCode?: string | null,
  phoneCountryIso?: string | null
): string {
  let local = digitsOnly(phoneLocal)
  if (local.startsWith('0') && local.length > 1) local = local.replace(/^0+/, '')
  const code = digitsOnly(phoneCode || '')
  const iso = String(phoneCountryIso || '').toUpperCase()
  if (code === '91' && local.length === 10) return `91${local}`
  if (!code && iso === 'IN' && local.length === 10) return `91${local}`
  if (code && local) return `${code}${local}`
  if (local.length === 10 && !code && !iso) return `91${local}`
  return `${code}${local}` || local
}

function normalizeEmailKey(e: string): string {
  return String(e || '').trim().toLowerCase()
}

function sameApplicantIdentity(
  a: { uniqueUserId: string | null; email: string },
  b: { unique_user_id: string | null; email: string | null }
): boolean {
  if (a.uniqueUserId && b.unique_user_id && String(a.uniqueUserId) === String(b.unique_user_id)) return true
  const ae = normalizeEmailKey(a.email)
  const be = normalizeEmailKey(b.email || '')
  return !!ae && !!be && ae === be
}

function profileJsonPhoneMeta(profile: unknown): { phone_code?: string; phone_country_iso?: string } {
  if (!profile || typeof profile !== 'object') return {}
  const p = profile as Record<string, unknown>
  return {
    phone_code: typeof p.phone_code === 'string' ? p.phone_code : undefined,
    phone_country_iso: typeof p.phone_country_iso === 'string' ? p.phone_country_iso : undefined,
  }
}

function collabPhoneKeyFromRow(row: {
  phone: string | null
  phone_code: string | null
  profile: unknown
  phone_norm?: string | null
}): string {
  if (row.phone_norm && String(row.phone_norm).trim()) return String(row.phone_norm).trim()
  const { phone_code: pcProf, phone_country_iso: iso } = profileJsonPhoneMeta(row.profile)
  const pc = row.phone_code || pcProf
  return normalizeCollabPhoneKey(String(row.phone || ''), pc, iso)
}

function instagramHandlesConflict(
  row: {
    instagram: string | null
    instagram_connected: boolean
    ig_username: string | null
  },
  newHandles: string[]
): boolean {
  if (!newHandles.length) return false
  const newSet = new Set(newHandles.map(normalizeHandle))
  const existing = parseInstagramHandles(row.instagram, undefined)
  for (const h of existing) {
    if (newSet.has(h)) return true
  }
  if (row.instagram_connected && row.ig_username) {
    const u = normalizeHandle(row.ig_username)
    if (u && newSet.has(u)) return true
  }
  return false
}

/** Block duplicate identities across active (pending/approved) applications. */
async function assertActiveCollabNotDuplicate(
  client: PoolClient,
  opts: {
    uniqueUserId: string | null
    email: string
    phoneKey: string
    handles: string[]
  }
): Promise<{ message: string } | null> {
  const { rows } = await client.query(
    `SELECT id, unique_user_id, email, phone, phone_code, profile, address, instagram,
            instagram_connected, ig_username, ig_user_id, status, phone_norm
     FROM collab_applications
     WHERE status IN ('pending', 'approved')`
  )

  const me = { uniqueUserId: opts.uniqueUserId, email: opts.email }

  for (const r of rows) {
    const same = sameApplicantIdentity(me, r)

    if (same) {
      if (r.status === 'pending') {
        return { message: 'You already have a pending Creator Collab application. Please wait for a decision or contact support.' }
      }
      if (r.status === 'approved') {
        return { message: 'You already have an approved Creator Collab application on this account.' }
      }
    }

    if (!same && opts.phoneKey && collabPhoneKeyFromRow(r) === opts.phoneKey) {
      return {
        message:
          'This phone number is already used for another Creator Collab application. Each applicant must use a unique mobile number.',
      }
    }

    if (!same && instagramHandlesConflict(r, opts.handles)) {
      return {
        message:
          'This Instagram account (handle) is already linked to another Creator Collab application. Each creator must use their own Instagram.',
      }
    }
  }

  return null
}

function computeProgress(totalViews: number, totalLikes: number) {
  const viewsPct = Math.min(1, totalViews / AFFILIATE_THRESHOLD_VIEWS)
  const likesPct = Math.min(1, totalLikes / AFFILIATE_THRESHOLD_LIKES)
  const progress = Math.round((viewsPct * 50 + likesPct * 50))
  const affiliateUnlocked = totalViews >= AFFILIATE_THRESHOLD_VIEWS && totalLikes >= AFFILIATE_THRESHOLD_LIKES
  return { progress, affiliateUnlocked }
}

/** Ensure DB schema has Instagram OAuth columns on collab_applications + collab_reels validation fields */
export async function ensureCollabSchema(pool: Pool) {
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

  // One Instagram Business/Creator user id per collab row — prevents two Nefol accounts from sharing one IG OAuth identity (race-safe with app-level checks).
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS collab_applications_ig_user_id_unique
    ON collab_applications (ig_user_id)
    WHERE ig_user_id IS NOT NULL AND btrim(ig_user_id) <> ''
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS collab_profile_details (
      id SERIAL PRIMARY KEY,
      collab_application_id INTEGER NOT NULL UNIQUE REFERENCES collab_applications(id) ON DELETE CASCADE,
      unique_user_id TEXT,
      full_name TEXT,
      email TEXT,
      phone_local TEXT,
      phone_code TEXT,
      phone_country_iso VARCHAR(2),
      birth_month TEXT,
      birth_day TEXT,
      birth_year TEXT,
      birthdate DATE,
      gender TEXT,
      marital_status TEXT,
      anniversary TEXT,
      occupation TEXT,
      education TEXT,
      education_branch TEXT,
      followers_range TEXT,
      bio TEXT,
      niche JSONB DEFAULT '[]'::jsonb,
      skills JSONB DEFAULT '[]'::jsonb,
      languages JSONB DEFAULT '[]'::jsonb,
      address JSONB DEFAULT '{}'::jsonb,
      platforms_snapshot JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_collab_profile_details_unique_user ON collab_profile_details(unique_user_id);
    CREATE INDEX IF NOT EXISTS idx_collab_profile_details_email ON collab_profile_details(email);
  `)

  await pool.query(`
    ALTER TABLE collab_applications
      ADD COLUMN IF NOT EXISTS phone_norm TEXT,
      ADD COLUMN IF NOT EXISTS address_fingerprint TEXT;
  `)

  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_collab_phone_norm_active
      ON collab_applications (phone_norm)
      WHERE status IN ('pending', 'approved')
        AND phone_norm IS NOT NULL
        AND btrim(phone_norm) <> '';
    `)
  } catch (e) {
    console.warn(
      '[collab] idx_collab_phone_norm_active skipped (duplicates in DB or migration issue):',
      (e as Error).message
    )
  }
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_collab_ig_user_active
      ON collab_applications (ig_user_id)
      WHERE ig_user_id IS NOT NULL
        AND status IN ('pending', 'approved');
    `)
  } catch (e) {
    console.warn('[collab] idx_collab_ig_user_active skipped:', (e as Error).message)
  }
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

/** Authenticated ecommerce user only — email is always taken from `users`, never from the request body. */
async function loadCollabApplicantFromSession(pool: Pool, req: Request): Promise<{ uniqueUserId: string | null; email: string } | null> {
  const token = req.headers.authorization?.replace('Bearer ', '').trim() || ''
  const parts = token.split('_')
  if (parts.length < 3 || parts[0] !== 'user' || parts[1] !== 'token') return null
  const numericId = parts[2]
  const userRes = await pool.query('SELECT id, email, unique_user_id FROM users WHERE id = $1 LIMIT 1', [numericId])
  const row = userRes.rows[0]
  let email = row?.email
  if (!email || !String(email).trim()) return null
  email = String(email).trim()
  let uniqueUserId = row?.unique_user_id || null
  if (row?.id && !uniqueUserId) {
    const generated = await generateUniqueUserId(pool)
    const updated = await pool.query(
      'UPDATE users SET unique_user_id = $1 WHERE id = $2 AND unique_user_id IS NULL RETURNING unique_user_id',
      [generated, row.id]
    )
    uniqueUserId = updated.rows[0]?.unique_user_id || generated
  }
  return { uniqueUserId, email }
}

// ─── Submit Collab Application ─────────────────────────────────────────────────
interface PlatformEntry { name: string; links?: string[]; link?: string }
interface AddressEntry { country?: string; state?: string; city?: string; postal_address?: string; pincode?: string }

export async function submitCollabApplication(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    const {
      name, phone, phone_code, instagram, instagram_handles, youtube, facebook,
      followers, message, agreeTerms, platforms, address, profile,
      turnstileToken,
    } = req.body

    const remoteIp =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined) || req.socket?.remoteAddress
    const captcha = await verifyTurnstileToken(
      typeof turnstileToken === 'string' ? turnstileToken : undefined,
      remoteIp
    )
    if (!captcha.ok) {
      return res.status(400).json({ message: captcha.message })
    }

    const applicant = await loadCollabApplicantFromSession(pool, req)
    if (!applicant) {
      return res.status(401).json({ message: 'Please sign in with your Nefol account to apply. Your email must match your store account.' })
    }
    const { uniqueUserId, email } = applicant

    if (!name || !phone || !agreeTerms) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Invalid email on your account' })

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

    const rawPostal = (address && typeof address === 'object' && String(address.postal_address ?? '').trim()) || ''
    const normAddress: AddressEntry = address && typeof address === 'object' ? {
      country: (address.country || '').trim() || undefined,
      state:   (address.state   || '').trim() || undefined,
      city:    (address.city    || '').trim() || undefined,
      postal_address: rawPostal ? rawPostal.slice(0, 500) : undefined,
      pincode: (address.pincode || '').trim() || undefined,
    } : {}

    await ensureCollabBlockSchema(pool)
    const existingBlock = await getActiveCollabBlock(pool, uniqueUserId, email)
    if (existingBlock) {
      return res.status(403).json({
        message: existingBlock.public_message || 'You cannot apply to Creator Collab at this time.',
        collab_blocked: true,
      })
    }

    const storedInstagram = handles.join(',')

    // Normalise profile
    const bm = String(profile?.birth_month || '').trim()
    const bd = String(profile?.birth_day || '').trim()
    const by = String(profile?.birth_year || '').trim()
    let birthdate = String(profile?.birthdate || '').trim()
    if (!birthdate && bm && bd) {
      if (by && /^\d{4}$/.test(by)) birthdate = `${by}-${bm.padStart(2, '0')}-${bd.padStart(2, '0')}`
    }

    const phoneCountryIso = String(profile?.phone_country_iso || '')
      .trim()
      .toUpperCase()
      .slice(0, 2)

    const normProfile = {
      phone_code: (phone_code || '').trim(),
      phone_country_iso: phoneCountryIso,
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

    const birthdateSql =
      birthdate && /^\d{4}-\d{2}-\d{2}$/.test(birthdate) ? birthdate : null
    const annSql =
      normProfile.anniversary && /^\d{4}-\d{2}-\d{2}$/.test(normProfile.anniversary)
        ? normProfile.anniversary
        : null

    const phoneKey = normalizeCollabPhoneKey(String(phone).trim(), normProfile.phone_code, phoneCountryIso)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const dup = await assertActiveCollabNotDuplicate(client, {
        uniqueUserId,
        email,
        phoneKey,
        handles,
      })
      if (dup) {
        await client.query('ROLLBACK')
        return res.status(409).json({ message: dup.message, duplicate_application: true })
      }

      const { rows } = await client.query(
        `INSERT INTO collab_applications
           (name, email, phone, phone_code, instagram, youtube, facebook, followers, message, agree_terms,
            status, unique_user_id, collab_joined_at, platforms, address, profile, phone_norm)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,NOW(),$12,$13,$14,$15)
         RETURNING id, email, status, created_at, instagram`,
        [
          name, email, phone, normProfile.phone_code, storedInstagram,
          (youtube || '').trim() || null, (facebook || '').trim() || null,
          normProfile.followers_range || null, normProfile.bio || null, !!agreeTerms,
          uniqueUserId,
          JSON.stringify(normPlatforms), JSON.stringify(normAddress), JSON.stringify(normProfile),
          phoneKey || null,
        ]
      )
      const appId = rows[0].id

      await client.query(
        `INSERT INTO collab_profile_details (
           collab_application_id, unique_user_id, full_name, email, phone_local, phone_code, phone_country_iso,
           birth_month, birth_day, birth_year, birthdate, gender, marital_status, anniversary,
           occupation, education, education_branch, followers_range, bio,
           niche, skills, languages, address, platforms_snapshot
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date,$12,$13,$14,$15,$16,$17,$18,$19,
           $20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb
         )`,
        [
          appId,
          uniqueUserId,
          String(name).trim(),
          String(email).trim(),
          String(phone).trim(),
          normProfile.phone_code || null,
          phoneCountryIso || null,
          bm || null,
          bd || null,
          by || null,
          birthdateSql,
          normProfile.gender || null,
          normProfile.marital_status || null,
          annSql,
          normProfile.occupation || null,
          normProfile.education || null,
          normProfile.education_branch || null,
          normProfile.followers_range || null,
          normProfile.bio || null,
          JSON.stringify(normProfile.niche),
          JSON.stringify(normProfile.skills),
          JSON.stringify(normProfile.languages),
          JSON.stringify(normAddress),
          JSON.stringify(normPlatforms),
        ]
      )

      await client.query('COMMIT')

      return res.status(201).json({
        application: { ...rows[0], instagram_handles: handles, platforms: normPlatforms, address: normAddress, profile: normProfile },
        message: 'Application submitted successfully.',
      })
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      const pg = e as { code?: string }
      if (pg.code === '23505') {
        return res.status(409).json({
          message:
            'This phone number or Instagram account is already linked to another active Creator Collab application.',
          duplicate_application: true,
        })
      }
      console.error('Collab application error:', e)
      return res.status(500).json({ message: 'Failed to submit application' })
    } finally {
      client.release()
    }
  } catch (err) {
    console.error('Collab application error:', err)
    return res.status(500).json({ message: 'Failed to submit application' })
  }
}

// ─── Get Collab Status (user-facing) ──────────────────────────────────────────
export async function getCollabStatus(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)

    if (!uniqueUserId && !email) {
      return res.status(400).json({ message: 'Authentication required' })
    }

    const block = await getActiveCollabBlock(pool, uniqueUserId, email)
    const blockPayload = block
      ? {
          collab_blocked: true,
          program_suspended: true,
          block: {
            public_message: block.public_message,
            appeal_status: block.appeal_status,
            appeal_submitted_at: block.appeal_submitted_at,
            blocked_at: block.blocked_at,
            can_submit_appeal: block.appeal_status !== 'pending',
          },
        }
      : { collab_blocked: false, program_suspended: false }

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
      if (block) {
        return res.json({
          ...blockPayload,
          has_application: false,
        })
      }
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
      ...blockPayload,
      has_application: true,
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
    await ensureCollabBlockSchema(pool)
    const { collab_id, reel_url, reel_urls, instagram_handle, platform: reqPlatform } = req.body
    const platform: string = (reqPlatform || 'instagram').toLowerCase()

    if (!collab_id) return res.status(400).json({ message: 'Collab ID required' })

    const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    const { uniqueUserId } = await resolveUniqueUserId(pool, req)
    if (!uniqueUserId) return res.status(401).json({ message: 'Authentication required' })

    const { rows } = await pool.query(
      `SELECT id, unique_user_id, instagram, status, instagram_connected, fb_page_access_token, ig_user_id, collab_joined_at, created_at
       FROM collab_applications WHERE id = $1`,
      [collab_id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Collab application not found' })

    const app = rows[0]
    if (String(app.unique_user_id || '') !== String(uniqueUserId)) {
      return res.status(403).json({ message: 'Access denied' })
    }
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
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const { collab_id } = req.body as { collab_id?: number }
    if (!collab_id) return res.status(400).json({ message: 'collab_id required' })

    const blocked = await assertCollabNotBlockedByAppId(pool, collab_id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    const { uniqueUserId } = await resolveUniqueUserId(pool, req)
    if (!uniqueUserId) return res.status(401).json({ message: 'Authentication required' })
    const own = await pool.query(`SELECT unique_user_id FROM collab_applications WHERE id = $1`, [collab_id])
    if (!own.rows.length || String(own.rows[0].unique_user_id || '') !== String(uniqueUserId)) {
      return res.status(403).json({ message: 'Access denied' })
    }

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
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
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
             COALESCE(SUM(CASE WHEN cr.caption_ok AND cr.date_ok THEN cr.likes_count ELSE 0 END), 0)::int AS total_likes,
             (SELECT row_to_json(cpd) FROM collab_profile_details cpd WHERE cpd.collab_application_id = ca.id) AS profile_details,
             (SELECT b.id FROM collab_program_blocks b
              WHERE b.is_active AND ca.unique_user_id IS NOT NULL AND b.unique_user_id = ca.unique_user_id
              LIMIT 1) AS collab_block_id
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
      profile_details: r.profile_details && typeof r.profile_details === 'object' ? r.profile_details : null,
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
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const appRes = await pool.query(
      `SELECT ca.*,
        (SELECT row_to_json(cpd) FROM collab_profile_details cpd WHERE cpd.collab_application_id = ca.id) AS profile_details
       FROM collab_applications ca WHERE ca.id = $1`,
      [id]
    )
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

    let collab_block_id: number | null = null
    if (app.unique_user_id) {
      const br = await pool.query(
        `SELECT id FROM collab_program_blocks WHERE is_active AND unique_user_id = $1 LIMIT 1`,
        [app.unique_user_id]
      )
      collab_block_id = br.rows[0]?.id ?? null
    }

    return res.json({
      ...app,
      instagram_handles: parseInstagramHandles(app.instagram),
      reels,
      total_views: totalViews,
      total_likes: totalLikes,
      pending_count: pendingCount,
      progress,
      affiliate_unlocked: affiliateUnlocked,
      profile_details: app.profile_details && typeof app.profile_details === 'object' ? app.profile_details : null,
      collab_block_id,
      collab_blocked: !!collab_block_id,
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
       SET status = 'rejected',
           rejection_reason = $1,
           rejected_at = NOW(),
           updated_at = NOW(),
           instagram_connected = false,
           fb_user_access_token = NULL,
           fb_page_id = NULL,
           fb_page_access_token = NULL,
           ig_user_id = NULL,
           ig_username = NULL,
           token_expires_at = NULL
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
    await ensureCollabBlockSchema(pool)
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)
    const queryEmail = req.query?.email as string | undefined
    const resolvedEmail = email || queryEmail

    if (!uniqueUserId && !resolvedEmail) {
      return res.json({ unlocked: false })
    }

    const block = await getActiveCollabBlock(pool, uniqueUserId, resolvedEmail || null)
    if (block) {
      return res.json({ unlocked: false, collab_blocked: true })
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

// ─── Admin: Export all collab data as CSV ──────────────────────────────────────
export async function exportCollabApplications(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)

    const rows = (await pool.query(`
      SELECT
        ca.id,
        ca.unique_user_id,
        ca.name,
        ca.email,
        ca.phone,
        ca.phone_code,
        ca.status,
        ca.created_at,
        ca.approved_at,
        ca.rejected_at,
        ca.collab_joined_at,
        ca.instagram_connected,
        ca.ig_username,
        ca.ig_user_id,
        ca.token_expires_at,
        ca.admin_notes,
        ca.rejection_reason,
        ca.platforms,
        ca.address,
        ca.profile,
        cpd.phone_country_iso,
        cpd.birth_month,
        cpd.birth_day,
        cpd.birth_year,
        cpd.birthdate,
        cpd.gender,
        cpd.marital_status,
        cpd.anniversary,
        cpd.occupation,
        cpd.education,
        cpd.education_branch,
        cpd.followers_range,
        cpd.bio,
        cpd.niche,
        cpd.skills,
        cpd.languages,
        COALESCE(reel_stats.total_reels, 0)::int           AS total_reels_submitted,
        COALESCE(reel_stats.eligible_reels, 0)::int        AS eligible_reels,
        COALESCE(reel_stats.total_views, 0)::int           AS total_views,
        COALESCE(reel_stats.total_likes, 0)::int           AS total_likes,
        COALESCE(reel_stats.pending_reels, 0)::int         AS pending_reels
      FROM collab_applications ca
      LEFT JOIN collab_profile_details cpd ON cpd.collab_application_id = ca.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int                                                          AS total_reels,
          SUM(CASE WHEN caption_ok AND date_ok THEN 1 ELSE 0 END)::int          AS eligible_reels,
          COALESCE(SUM(CASE WHEN caption_ok AND date_ok THEN views_count END), 0)::int AS total_views,
          COALESCE(SUM(CASE WHEN caption_ok AND date_ok THEN likes_count END), 0)::int AS total_likes,
          SUM(CASE WHEN insights_pending THEN 1 ELSE 0 END)::int               AS pending_reels
        FROM collab_reels WHERE collab_application_id = ca.id
      ) reel_stats ON TRUE
      ORDER BY ca.created_at DESC
    `)).rows

    // CSV cell helper – wraps in quotes, escapes inner quotes
    const cell = (v: unknown): string => {
      if (v === null || v === undefined) return ''
      const s = String(v)
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`
      }
      return s
    }

    const arrCell = (v: unknown): string => {
      if (!v) return ''
      const a = Array.isArray(v) ? v : (typeof v === 'object' ? Object.values(v as object) : [String(v)])
      return cell(a.filter(Boolean).join('; '))
    }

    // Extract platform links by name
    const platformLinks = (platforms: unknown, name: string): string => {
      if (!Array.isArray(platforms)) return ''
      const p = platforms.find((x: any) => String(x?.name || '').toLowerCase() === name.toLowerCase())
      if (!p) return ''
      const urls: string[] = Array.isArray(p.links) ? p.links : (p.link ? [p.link] : [])
      return cell(urls.filter(Boolean).join('; '))
    }

    const fmt = (d: unknown) => d ? new Date(String(d)).toISOString().split('T')[0] : ''

    // Merge profile JSONB + profile_details row (profile_details takes priority)
    const merge = (row: any, key: string) => {
      const fromDetails = row[key]
      if (fromDetails !== null && fromDetails !== undefined) return fromDetails
      const p = row.profile && typeof row.profile === 'object' ? row.profile : {}
      return p[key]
    }

    const PLATFORM_KEYS = ['instagram', 'youtube', 'facebook', 'x', 'linkedin', 'telegram', 'snapchat', 'reddit', 'vk', 'quora', 'other']

    const headers = [
      'ID', 'Unique User ID', 'Status',
      'Full Name', 'Email', 'Phone Code', 'Phone Country ISO', 'Phone',
      'Applied Date', 'Approved Date', 'Rejected Date', 'Joined Date',
      'Instagram Connected', 'IG Username', 'IG User ID',
      'Total Views', 'Total Likes', 'Total Reels Submitted', 'Eligible Reels', 'Pending Reels',
      'DOB Month', 'DOB Day', 'DOB Year', 'DOB Full',
      'Gender', 'Marital Status', 'Anniversary',
      'Occupation', 'Education', 'Education Branch',
      'Followers Range', 'Bio',
      'Niche', 'Skills', 'Languages',
      'Country', 'State', 'City', 'Postal Address', 'Pincode',
      ...PLATFORM_KEYS.map((p) => `${p.charAt(0).toUpperCase() + p.slice(1)} Links`),
      'Admin Notes', 'Rejection Reason',
    ]

    const csvRows: string[] = [headers.map(cell).join(',')]

    for (const r of rows) {
      const addr = (r.address && typeof r.address === 'object' ? r.address : {}) as Record<string, unknown>
      const platforms = Array.isArray(r.platforms) ? r.platforms : []

      const dobFull = (() => {
        const mo = String(merge(r, 'birth_month') || '').trim()
        const d  = String(merge(r, 'birth_day')   || '').trim()
        const yr = String(merge(r, 'birth_year')  || '').trim()
        if (mo && d) return `${mo.padStart(2,'0')}/${d.padStart(2,'0')}${yr ? `/${yr}` : ''}`
        if (r.birthdate) return fmt(r.birthdate)
        return ''
      })()

      const row = [
        cell(r.id),
        cell(r.unique_user_id),
        cell(r.status),
        cell(r.name),
        cell(r.email),
        cell(r.phone_code || merge(r, 'phone_code')),
        cell(r.phone_country_iso),
        cell(r.phone),
        cell(fmt(r.created_at)),
        cell(fmt(r.approved_at)),
        cell(fmt(r.rejected_at)),
        cell(fmt(r.collab_joined_at)),
        cell(r.instagram_connected ? 'Yes' : 'No'),
        cell(r.ig_username),
        cell(r.ig_user_id),
        cell(r.total_views),
        cell(r.total_likes),
        cell(r.total_reels_submitted),
        cell(r.eligible_reels),
        cell(r.pending_reels),
        cell(merge(r, 'birth_month')),
        cell(merge(r, 'birth_day')),
        cell(merge(r, 'birth_year')),
        cell(dobFull),
        cell(merge(r, 'gender')),
        cell(merge(r, 'marital_status')),
        cell(merge(r, 'anniversary') ? fmt(merge(r, 'anniversary')) : ''),
        cell(merge(r, 'occupation')),
        cell(merge(r, 'education')),
        cell(merge(r, 'education_branch')),
        cell(merge(r, 'followers_range')),
        cell(merge(r, 'bio')),
        arrCell(merge(r, 'niche')),
        arrCell(merge(r, 'skills')),
        arrCell(merge(r, 'languages')),
        cell(addr.country),
        cell(addr.state),
        cell(addr.city),
        cell(addr.postal_address),
        cell(addr.pincode),
        ...PLATFORM_KEYS.map((pname) => platformLinks(platforms, pname)),
        cell(r.admin_notes),
        cell(r.rejection_reason),
      ]
      csvRows.push(row.join(','))
    }

    const csv = csvRows.join('\r\n')
    const dateStr = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="collab-applications-${dateStr}.csv"`)
    // BOM for Excel UTF-8 detection
    res.send('\uFEFF' + csv)
  } catch (err) {
    console.error('exportCollabApplications error:', err)
    return res.status(500).json({ message: 'Failed to export data' })
  }
}

// ─── User: appeal a collab program block ─────────────────────────────────────
export async function submitCollabBlockAppeal(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    const { uniqueUserId, email } = await resolveUniqueUserId(pool, req)
    if (!uniqueUserId && !email) return res.status(401).json({ message: 'Authentication required' })

    const { message } = req.body as { message?: string }
    const text = typeof message === 'string' ? message.trim() : ''
    if (text.length < 20) {
      return res.status(400).json({ message: 'Please explain your situation in at least 20 characters.' })
    }
    if (text.length > 8000) return res.status(400).json({ message: 'Message is too long.' })

    const block = await getActiveCollabBlock(pool, uniqueUserId, email)
    if (!block) return res.status(400).json({ message: 'You are not blocked from Creator Collab.' })
    if (block.appeal_status === 'pending') {
      return res.status(400).json({ message: 'You already have a pending appeal. We will review it soon.' })
    }

    const upd = await pool.query(
      `UPDATE collab_program_blocks SET
        appeal_status = 'pending',
        appeal_text = $1,
        appeal_submitted_at = NOW(),
        updated_at = NOW()
       WHERE id = $2 AND is_active = TRUE AND appeal_status IN ('none', 'rejected')
       RETURNING id`,
      [text, block.id]
    )
    if (!upd.rows.length) {
      return res.status(400).json({ message: 'Could not submit appeal. Try again or contact support.' })
    }
    return res.json({ message: 'Appeal submitted. Our team will review it and email you if needed.' })
  } catch (err) {
    console.error('submitCollabBlockAppeal error:', err)
    return res.status(500).json({ message: 'Failed to submit appeal' })
  }
}

// ─── Admin: block creator from Collab program (by application id) ────────────
export async function adminBlockCollabUser(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const { public_message, internal_reason } = (req.body || {}) as {
      public_message?: string
      internal_reason?: string
    }

    const appRes = await pool.query(
      `SELECT id, email, unique_user_id FROM collab_applications WHERE id = $1`,
      [id]
    )
    if (!appRes.rows.length) return res.status(404).json({ message: 'Collab application not found' })
    let { email, unique_user_id: uid } = appRes.rows[0] as { email: string; unique_user_id: string | null }

    if (!uid && email) {
      const uRes = await pool.query(
        `SELECT unique_user_id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1`,
        [email]
      )
      uid = uRes.rows[0]?.unique_user_id || null
      if (uid) {
        await pool.query(`UPDATE collab_applications SET unique_user_id = $1 WHERE id = $2 AND unique_user_id IS NULL`, [
          uid,
          id,
        ])
      }
    }
    if (!uid) {
      return res.status(400).json({
        message:
          'This application has no linked account ID. Ask the user to sign in once, then try blocking again.',
      })
    }

    const pub =
      typeof public_message === 'string' && public_message.trim()
        ? public_message.trim()
        : 'Your access to the Creator Collab program has been restricted. If you believe this is a mistake, you can submit an appeal below.'
    const internal = typeof internal_reason === 'string' && internal_reason.trim() ? internal_reason.trim() : null
    const emailNorm = email ? String(email).trim().toLowerCase() : null

    const ins = await pool.query(
      `INSERT INTO collab_program_blocks
        (unique_user_id, user_email, internal_reason, public_message, is_active, appeal_status, blocked_at, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, 'none', NOW(), NOW())
       ON CONFLICT (unique_user_id) DO UPDATE SET
         user_email = COALESCE(EXCLUDED.user_email, collab_program_blocks.user_email),
         internal_reason = EXCLUDED.internal_reason,
         public_message = EXCLUDED.public_message,
         is_active = TRUE,
         appeal_status = 'none',
         appeal_text = NULL,
         appeal_submitted_at = NULL,
         appeal_resolved_at = NULL,
         appeal_resolution_note = NULL,
         blocked_at = NOW(),
         updated_at = NOW()
       RETURNING *`,
      [uid, emailNorm, internal, pub]
    )

    return res.json({ message: 'User blocked from Creator Collab', block: ins.rows[0] })
  } catch (err) {
    console.error('adminBlockCollabUser error:', err)
    return res.status(500).json({ message: 'Failed to block user' })
  }
}

export async function adminUnblockCollabUser(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const r = await pool.query(
      `UPDATE collab_program_blocks SET is_active = FALSE, updated_at = NOW() WHERE id = $1 AND is_active = TRUE RETURNING id`,
      [id]
    )
    if (!r.rows.length) return res.status(404).json({ message: 'Active block not found' })
    return res.json({ message: 'Block lifted. User can use Creator Collab again.' })
  } catch (err) {
    console.error('adminUnblockCollabUser error:', err)
    return res.status(500).json({ message: 'Failed to unblock' })
  }
}

export async function listCollabBlocks(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabBlockSchema(pool)
    const { page = '1', limit = '50' } = req.query as Record<string, string>
    const lim = Math.min(100, Math.max(1, Number(limit) || 50))
    const offset = (Math.max(1, Number(page) || 1) - 1) * lim
    const r = await pool.query(
      `SELECT * FROM collab_program_blocks WHERE is_active = TRUE ORDER BY blocked_at DESC LIMIT $1 OFFSET $2`,
      [lim, offset]
    )
    const c = await pool.query(`SELECT COUNT(*)::int AS n FROM collab_program_blocks WHERE is_active = TRUE`)
    return res.json({ blocks: r.rows, total: c.rows[0]?.n || 0, page: Number(page) || 1, limit: lim })
  } catch (err) {
    console.error('listCollabBlocks error:', err)
    return res.status(500).json({ message: 'Failed to list blocks' })
  }
}

export async function adminResolveCollabAppeal(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const { action, note } = req.body as { action?: string; note?: string }
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' })
    }

    const block = await pool.query(`SELECT * FROM collab_program_blocks WHERE id = $1 AND is_active = TRUE`, [id])
    if (!block.rows.length) return res.status(404).json({ message: 'Active block not found' })
    if (block.rows[0].appeal_status !== 'pending') {
      return res.status(400).json({ message: 'No pending appeal for this block.' })
    }

    const noteTrim = typeof note === 'string' && note.trim() ? note.trim() : null

    if (action === 'approve') {
      await pool.query(
        `UPDATE collab_program_blocks SET
          is_active = FALSE,
          appeal_status = 'approved',
          appeal_resolved_at = NOW(),
          appeal_resolution_note = $1,
          updated_at = NOW()
         WHERE id = $2`,
        [noteTrim, id]
      )
      return res.json({ message: 'Appeal approved — user unblocked from Creator Collab.' })
    }

    await pool.query(
      `UPDATE collab_program_blocks SET
        appeal_status = 'rejected',
        appeal_resolved_at = NOW(),
        appeal_resolution_note = $1,
        updated_at = NOW()
       WHERE id = $2`,
      [noteTrim, id]
    )
    return res.json({ message: 'Appeal rejected. User may submit a new appeal later.' })
  } catch (err) {
    console.error('adminResolveCollabAppeal error:', err)
    return res.status(500).json({ message: 'Failed to resolve appeal' })
  }
}

export async function getCollabBlockDetail(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabBlockSchema(pool)
    const { id } = req.params
    const r = await pool.query(`SELECT * FROM collab_program_blocks WHERE id = $1`, [id])
    if (!r.rows.length) return res.status(404).json({ message: 'Block not found' })
    return res.json({ block: r.rows[0] })
  } catch (err) {
    console.error('getCollabBlockDetail error:', err)
    return res.status(500).json({ message: 'Failed to load block' })
  }
}

const BLOG_WEEKLY_CREATOR_COINS = 100

/** Normalize pg `date` / ISO strings to `YYYY-MM-DD` for JSON (avoids Invalid Date on the client). */
function toIsoDateOnly(value: unknown): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const s = String(value)
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

/** Authenticated: weekly blog creator rewards + Nefol coin balance (for Creator Program Revenue tab). */
export async function getCreatorRevenue(pool: Pool, req: Request, res: Response) {
  try {
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const programBlock = await getCreatorProgramBlockForUserId(pool, userId)
    if (programBlock) {
      return res.status(403).json({
        message:
          programBlock.public_message ||
          'Your access to the Creator Program is restricted.',
        creator_program_blocked: true,
        collab_blocked: true,
      })
    }

    const { rows: weekRow } = await pool.query<{ week_start: Date }>(
      `SELECT (date_trunc('week', timezone('utc', now())))::date AS week_start`
    )
    const currentWeekStr = toIsoDateOnly(weekRow[0]?.week_start)

    const { rows: hist } = await pool.query(
      `SELECT week_start, coins_awarded, blog_post_id, created_at
       FROM blog_weekly_creator_reward
       WHERE user_id = $1::integer
       ORDER BY week_start DESC
       LIMIT 52`,
      [userId]
    )

    const { rows: sumRow } = await pool.query<{ total: number }>(
      `SELECT COALESCE(SUM(coins_awarded), 0)::int AS total FROM blog_weekly_creator_reward WHERE user_id = $1::integer`,
      [userId]
    )

    const { rows: bal } = await pool.query<{ loyalty_points: number }>(
      `SELECT COALESCE(loyalty_points, 0)::int AS loyalty_points FROM users WHERE id = $1::integer`,
      [userId]
    )

    const earned_blog_reward_this_week = !!(
      currentWeekStr &&
      hist.some((r) => toIsoDateOnly(r.week_start) === currentWeekStr)
    )

    let collab_task_payouts: Array<Record<string, unknown>> = []
    try {
      const payoutRes = await pool.query(
        `SELECT id, title, paid_at, paid_amount, paid_currency, paid_method, coins_credited, task_template_key, platforms
         FROM collab_assigned_tasks
         WHERE assignee_user_id = $1::integer AND status = 'paid'
         ORDER BY paid_at DESC NULLS LAST, id DESC
         LIMIT 100`,
        [userId]
      )
      collab_task_payouts = payoutRes.rows
    } catch {
      collab_task_payouts = []
    }

    return res.json({
      nefol_coins_balance: bal[0]?.loyalty_points ?? 0,
      blog_weekly_reward_amount: BLOG_WEEKLY_CREATOR_COINS,
      current_week_start: currentWeekStr,
      earned_blog_reward_this_week,
      total_coins_from_blog_weekly: sumRow[0]?.total ?? 0,
      blog_reward_history: hist.map((r) => ({
        week_start: toIsoDateOnly(r.week_start) ?? String(r.week_start),
        coins_awarded: r.coins_awarded,
        blog_post_id: r.blog_post_id,
        created_at: r.created_at,
      })),
      collab_task_payouts,
    })
  } catch (err) {
    console.error('getCreatorRevenue error:', err)
    return res.status(500).json({ message: 'Failed to load creator revenue' })
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
  router.post('/block-appeal',       (req, res) => submitCollabBlockAppeal(pool, req, res))
  return router
}
