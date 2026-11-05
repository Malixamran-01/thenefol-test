import type { Pool } from 'pg'

/**
 * SEO slugs from titles, shared by blog posts (`/blog/<slug>`) and community questions
 * (`/questions/<slug>`).
 *
 * - Generated from the title on create, and re-synced when the title changes.
 * - A replaced slug is kept in a history table so old links 301 to the new one.
 * - Numeric IDs keep working everywhere (old shares, notifications) and resolve to the slug.
 */

const MAX_SLUG_LEN = 80

type SlugEntity = {
  /** Table holding `id`, `title`, `slug` (constant, never user input). */
  table: string
  /** `<old_slug> → <id>` redirects for renamed titles. */
  historyTable: string
  historyFkCol: string
  /** Used when a title has no letters/digits at all: `<prefix>-<id>`. */
  fallbackPrefix: string
  /** Sub-routes a slug must never shadow. */
  reserved: Set<string>
  label: string
}

const BLOG: SlugEntity = {
  table: 'blog_posts',
  historyTable: 'blog_post_slug_history',
  historyFkCol: 'post_id',
  fallbackPrefix: 'post',
  reserved: new Set([
    'request', 'edit-image', 'activity', 'explore', 'dashboard', 'my-blogs', 'settings',
    'ask-community', 'new', 'edit', 'feed', 'tags', 'authors', 'posts', 'admin', 'drafts',
    'comment', 'comments', 'bookmarks', 'reposts',
  ]),
  label: 'Blog',
}

const QUESTION: SlugEntity = {
  table: 'community_questions',
  historyTable: 'community_question_slug_history',
  historyFkCol: 'question_id',
  fallbackPrefix: 'question',
  reserved: new Set(['new', 'edit', 'admin', 'answers', 'questions', 'ask']),
  label: 'Community question',
}

/** "Glow-Up 101: Vitamin C & You!" → "glow-up-101-vitamin-c-and-you". Keeps non-Latin letters (e.g. Hindi). */
export function slugifyBlogTitle(title: string): string {
  let s = String(title || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Latin diacritics only (é → e); Devanagari matras survive
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '')

  if (s.length > MAX_SLUG_LEN) {
    s = s.slice(0, MAX_SLUG_LEN)
    const cut = s.lastIndexOf('-')
    if (cut > MAX_SLUG_LEN / 2) s = s.slice(0, cut)
    s = s.replace(/-+$/g, '')
  }
  return s
}

/** A slug that is all digits would be mistaken for an ID. */
function baseSlugFor(e: SlugEntity, title: string, id: number): string {
  const s = slugifyBlogTitle(title)
  if (!s) return `${e.fallbackPrefix}-${id}`
  if (/^\d+$/.test(s)) return `${e.fallbackPrefix}-${s}`
  return s
}

/** True when `slug` is `base` or a de-duplicated form of it (`base-<n>`). */
function slugMatchesBase(slug: string, base: string): boolean {
  if (slug === base) return true
  if (!slug.startsWith(`${base}-`)) return false
  return /^\d+$/.test(slug.slice(base.length + 1))
}

async function slugTaken(pool: Pool, e: SlugEntity, slug: string, id: number): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM ${e.table} WHERE slug = $1 AND id <> $2
     UNION ALL
     SELECT 1 FROM ${e.historyTable} WHERE old_slug = $1 AND ${e.historyFkCol} <> $2
     LIMIT 1`,
    [slug, id]
  )
  return rows.length > 0
}

async function pickUniqueSlug(pool: Pool, e: SlugEntity, base: string, id: number): Promise<string> {
  if (!e.reserved.has(base) && !(await slugTaken(pool, e, base, id))) return base
  const withId = `${base}-${id}`
  if (!(await slugTaken(pool, e, withId, id))) return withId
  for (let n = 2; n < 50; n++) {
    const candidate = `${base}-${id}-${n}`
    if (!(await slugTaken(pool, e, candidate, id))) return candidate
  }
  return `${base}-${id}-${Date.now()}`
}

/** Schema + one-time backfill. Oldest rows claim the clean slug first. Never throws (startup-safe). */
async function ensureSlugs(pool: Pool, e: SlugEntity): Promise<void> {
  try {
    await pool.query(`ALTER TABLE ${e.table} ADD COLUMN IF NOT EXISTS slug TEXT`)
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ${e.table}_slug_unique_idx ON ${e.table} (slug) WHERE slug IS NOT NULL`)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${e.historyTable} (
        old_slug TEXT PRIMARY KEY,
        ${e.historyFkCol} INTEGER NOT NULL REFERENCES ${e.table}(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `)
  } catch (err) {
    console.error(`[slug] ${e.label} slug schema failed:`, err)
    return
  }

  const { rows } = await pool.query(`SELECT id FROM ${e.table} WHERE slug IS NULL OR slug = '' ORDER BY id ASC`)
  if (rows.length === 0) return
  let done = 0
  for (const r of rows) {
    try {
      await syncSlug(pool, e, Number(r.id))
      done++
    } catch (err) {
      console.error(`[slug] ${e.label} backfill failed for id ${r.id}:`, err)
    }
  }
  console.log(`✅ ${e.label} slugs backfilled: ${done}/${rows.length}`)
}

/** Make `slug` match the row's current title. Returns the slug (unchanged if the title still maps to it). */
async function syncSlug(pool: Pool, e: SlugEntity, rowId: number): Promise<string | null> {
  const { rows } = await pool.query(`SELECT id, title, slug FROM ${e.table} WHERE id = $1`, [rowId])
  if (rows.length === 0) return null
  const id = Number(rows[0].id)
  const current: string | null = rows[0].slug ? String(rows[0].slug) : null
  const base = baseSlugFor(e, String(rows[0].title || ''), id)

  if (current && slugMatchesBase(current, base)) return current

  for (let attempt = 0; attempt < 3; attempt++) {
    const next = await pickUniqueSlug(pool, e, base, id)
    try {
      await pool.query(`UPDATE ${e.table} SET slug = $1 WHERE id = $2`, [next, id])
    } catch (err: any) {
      if (err?.code === '23505') continue // raced another writer for the same slug — pick again
      throw err
    }
    // The new slug is live again if it had been retired; the old one now redirects here.
    await pool.query(`DELETE FROM ${e.historyTable} WHERE old_slug = $1`, [next])
    if (current) {
      await pool.query(
        `INSERT INTO ${e.historyTable} (old_slug, ${e.historyFkCol}) VALUES ($1, $2)
         ON CONFLICT (old_slug) DO UPDATE SET ${e.historyFkCol} = EXCLUDED.${e.historyFkCol}, created_at = now()`,
        [current, id]
      )
    }
    return next
  }
  return current
}

export type ResolvedSlugRef = { id: number; slug: string | null }
/** @deprecated alias */
export type ResolvedBlogRef = ResolvedSlugRef

/** Resolve a URL segment (numeric ID, current slug, or a retired slug) to the row. */
async function resolveRef(pool: Pool, e: SlugEntity, ref: string): Promise<ResolvedSlugRef | null> {
  let raw = String(ref || '').trim()
  try {
    raw = decodeURIComponent(raw)
  } catch {
    /* already decoded */
  }
  raw = raw.replace(/\/+$/, '')
  if (!raw) return null

  if (/^\d+$/.test(raw)) {
    const { rows } = await pool.query(`SELECT id, slug FROM ${e.table} WHERE id = $1`, [Number(raw)])
    return rows.length ? { id: Number(rows[0].id), slug: rows[0].slug || null } : null
  }

  const slug = raw.toLowerCase()
  const { rows } = await pool.query(`SELECT id, slug FROM ${e.table} WHERE slug = $1`, [slug])
  if (rows.length) return { id: Number(rows[0].id), slug: rows[0].slug }

  const { rows: hist } = await pool.query(
    `SELECT t.id, t.slug FROM ${e.historyTable} h JOIN ${e.table} t ON t.id = h.${e.historyFkCol} WHERE h.old_slug = $1`,
    [slug]
  )
  return hist.length ? { id: Number(hist[0].id), slug: hist[0].slug || null } : null
}

/** Public URL segment: slug when present, else ID. */
export function slugUrlSegment(row: { id: number | string; slug?: string | null }): string {
  return row.slug ? encodeURIComponent(String(row.slug)) : String(row.id)
}

// ── Blog posts ────────────────────────────────────────────────────────────────
export const ensureBlogSlugs = (pool: Pool) => ensureSlugs(pool, BLOG)
export const syncBlogPostSlug = (pool: Pool, postId: number) => syncSlug(pool, BLOG, postId)
export const resolveBlogPostRef = (pool: Pool, ref: string) => resolveRef(pool, BLOG, ref)
export const blogPostUrlSegment = slugUrlSegment

// ── Community questions ───────────────────────────────────────────────────────
export const ensureQuestionSlugs = (pool: Pool) => ensureSlugs(pool, QUESTION)
export const syncQuestionSlug = (pool: Pool, questionId: number) => syncSlug(pool, QUESTION, questionId)
export const resolveQuestionRef = (pool: Pool, ref: string) => resolveRef(pool, QUESTION, ref)
export const questionUrlSegment = slugUrlSegment
