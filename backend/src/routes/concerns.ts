// Shop by Concern — concerns (Acne, Dullness, Hair fall, …) and their product mapping.
// A product can belong to several concerns (product_concerns join table).
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { SQL_INVENTORY_AVAILABLE, SQL_PRODUCT_IMAGES, attachStockFlags } from './products'

/** Starter concerns (inserted only into an empty table). Aliases let CSV values like "pimples" match. */
type ConcernGroup = 'skin' | 'hair' | 'body'
export const CONCERN_GROUPS: ConcernGroup[] = ['skin', 'hair', 'body']

export const DEFAULT_CONCERNS: Array<{ name: string; slug: string; group: ConcernGroup; aliases: string[]; description: string }> = [
  { name: 'Acne & Breakouts', slug: 'acne-breakouts', group: 'skin', aliases: ['acne', 'pimples', 'breakouts', 'acne prone', 'blemishes'], description: 'Clear pores and calm breakouts.' },
  { name: 'Dullness & Pigmentation', slug: 'dullness-pigmentation', group: 'skin', aliases: ['dullness', 'dull skin', 'pigmentation', 'dark spots', 'brightening', 'skin brightening', 'uneven skin tone', 'glow'], description: 'Brighten and even out your skin tone.' },
  { name: 'Dryness & Hydration', slug: 'dryness-hydration', group: 'skin', aliases: ['dryness', 'dry skin', 'hydration', 'moisturising', 'moisturizing'], description: 'Deep hydration for soft, supple skin.' },
  { name: 'Anti-Ageing', slug: 'anti-ageing', group: 'skin', aliases: ['anti aging', 'anti-aging', 'ageing', 'aging', 'fine lines', 'wrinkles'], description: 'Smooth fine lines and firm the skin.' },
  { name: 'Tan Removal', slug: 'tan-removal', group: 'skin', aliases: ['tan', 'detan', 'de-tan', 'sun tan', 'sun damage'], description: 'Undo sun tan and restore your natural tone.' },
  { name: 'UV Protection', slug: 'uv-protection', group: 'skin', aliases: ['sun protection', 'sunscreen', 'spf', 'suncare', 'sun care', 'uv'], description: 'Everyday defence against UV rays, sunburn and tanning.' },
  { name: 'Oily Skin & Open Pores', slug: 'oily-skin-pores', group: 'skin', aliases: ['oily skin', 'oil control', 'open pores', 'pores', 'excess oil'], description: 'Balance oil and refine pores.' },
  { name: 'Sensitive Skin', slug: 'sensitive-skin', group: 'skin', aliases: ['sensitive', 'redness', 'irritation', 'soothing'], description: 'Gentle care that soothes and protects.' },
  { name: 'Hair Fall', slug: 'hair-fall', group: 'hair', aliases: ['hairfall', 'hair loss', 'thinning hair', 'hair growth'], description: 'Strengthen roots and reduce hair fall.' },
  { name: 'Dandruff & Scalp Care', slug: 'dandruff-scalp', group: 'hair', aliases: ['dandruff', 'itchy scalp', 'scalp care', 'flaky scalp'], description: 'A clean, balanced, flake-free scalp.' },
  { name: 'Dry & Frizzy Hair', slug: 'dry-frizzy-hair', group: 'hair', aliases: ['frizz', 'frizzy hair', 'dry hair', 'damaged hair', 'split ends'], description: 'Smooth, nourished, manageable hair.' },
]

export function slugifyConcern(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Loose key for matching CSV text to a concern: "Acne & Breakouts" ≈ "acne-breakouts" ≈ "ACNE AND BREAKOUTS". */
const matchKey = (s: string) => slugifyConcern(s).replace(/-and-/g, '-').replace(/-/g, '')

/** Split a CSV cell / text input into concern names: "Acne, Dullness | Hair fall; Tan" */
export function parseConcernList(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.map(String) : typeof input === 'string' ? input.split(/[,;|\n]+/) : []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw) {
    const name = part.trim().replace(/\s+/g, ' ')
    const key = matchKey(name)
    if (!name || !key || seen.has(key)) continue
    seen.add(key)
    out.push(name)
  }
  return out
}

export async function ensureConcernTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS concerns (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      aliases TEXT[] DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      show_in_nav BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS product_concerns (
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      concern_id INTEGER NOT NULL REFERENCES concerns(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (product_id, concern_id)
    );
    CREATE INDEX IF NOT EXISTS idx_product_concerns_concern ON product_concerns(concern_id);
    CREATE INDEX IF NOT EXISTS idx_concerns_active_order ON concerns(is_active, sort_order);
    -- Collection page content (hero banner, headline, "about this concern")
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS concern_group TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS headline TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS subheadline TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS banner_url TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS banner_mobile_url TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS about_title TEXT;
    ALTER TABLE concerns ADD COLUMN IF NOT EXISTS about_body TEXT;
  `)
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM concerns')
  if (rows[0].n === 0) {
    for (const [i, c] of DEFAULT_CONCERNS.entries()) {
      await pool.query(
        `INSERT INTO concerns (slug, name, concern_group, description, aliases, sort_order) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (slug) DO NOTHING`,
        [c.slug, c.name, c.group, c.description, c.aliases, (i + 1) * 10]
      )
    }
    console.log(`✅ Seeded ${DEFAULT_CONCERNS.length} default concerns (Shop by Concern)`)
  }
}

/**
 * Replace a product's concerns with `names`. Each name matches an existing concern by name, slug or
 * alias; unknown names create a new concern when `createMissing` (CSV import / product form).
 * Returns the concerns now linked to the product.
 */
export async function setProductConcerns(
  pool: Pool,
  productId: number,
  names: string[],
  { createMissing = true } = {}
): Promise<Array<{ id: number; slug: string; name: string }>> {
  const { rows: all } = await pool.query('SELECT id, slug, name, aliases FROM concerns')
  const byKey = new Map<string, { id: number; slug: string; name: string }>()
  for (const c of all) {
    for (const k of [c.name, c.slug, ...((c.aliases as string[] | null) || [])]) {
      const key = matchKey(k)
      if (key && !byKey.has(key)) byKey.set(key, { id: c.id, slug: c.slug, name: c.name })
    }
  }

  const ids: number[] = []
  for (const name of parseConcernList(names)) {
    let hit = byKey.get(matchKey(name))
    if (!hit && createMissing) {
      const slug = slugifyConcern(name)
      if (!slug) continue
      const { rows } = await pool.query(
        `INSERT INTO concerns (slug, name, sort_order)
         VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) FROM concerns), 0) + 10)
         ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
         RETURNING id, slug, name`,
        [slug, name]
      )
      hit = rows[0]
      byKey.set(matchKey(name), hit!)
    }
    if (hit && !ids.includes(hit.id)) ids.push(hit.id)
  }

  await pool.query('DELETE FROM product_concerns WHERE product_id = $1 AND NOT (concern_id = ANY($2::int[]))', [productId, ids])
  if (ids.length) {
    await pool.query(
      `INSERT INTO product_concerns (product_id, concern_id)
       SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`,
      [productId, ids]
    )
  }
  const { rows } = await pool.query(
    `SELECT c.id, c.slug, c.name FROM product_concerns pc JOIN concerns c ON c.id = pc.concern_id
     WHERE pc.product_id = $1 ORDER BY c.sort_order, c.name`,
    [productId]
  )
  return rows
}

const SQL_PRODUCT_COUNT = `(SELECT COUNT(*)::int FROM product_concerns pc WHERE pc.concern_id = c.id) AS product_count`

/** GET /api/concerns — active concerns for the storefront menu (with product counts). */
export async function listConcerns(pool: Pool, req: Request, res: Response) {
  try {
    const navOnly = req.query.nav === '1'
    const { rows } = await pool.query(
      `SELECT c.id, c.slug, c.name, c.description, c.image_url, c.concern_group, c.sort_order, c.show_in_nav, ${SQL_PRODUCT_COUNT}
       FROM concerns c
       WHERE c.is_active = true ${navOnly ? 'AND c.show_in_nav = true' : ''}
       ORDER BY c.sort_order, c.name`
    )
    res.setHeader('Cache-Control', 'public, max-age=60')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch concerns', err)
  }
}

/** GET /api/concerns/:slug — one concern with its products (same product shape as /api/products). */
export async function getConcernWithProducts(pool: Pool, req: Request, res: Response) {
  try {
    const { rows: found } = await pool.query(
      `SELECT c.id, c.slug, c.name, c.description, c.image_url, c.concern_group, c.headline, c.subheadline,
              c.banner_url, c.banner_mobile_url, c.about_title, c.about_body
       FROM concerns c WHERE c.slug = $1 AND c.is_active = true`,
      [req.params.slug]
    )
    if (!found.length) return sendError(res, 404, 'Concern not found')
    const concern = found[0]
    const { rows: products } = await pool.query(
      `SELECT p.*, ${SQL_INVENTORY_AVAILABLE}, ${SQL_PRODUCT_IMAGES}
       FROM products p
       JOIN product_concerns pc ON pc.product_id = p.id AND pc.concern_id = $1
       ORDER BY p.created_at DESC`,
      [concern.id]
    )
    sendSuccess(res, { ...concern, products: products.map(attachStockFlags) })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch concern', err)
  }
}

// ---- Admin (mounted under /api/admin/*, which adminGuard restricts to staff) ----------------------

export async function adminListConcerns(pool: Pool, _req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, ${SQL_PRODUCT_COUNT} FROM concerns c ORDER BY c.sort_order, c.name`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch concerns', err)
  }
}

/** undefined = field not sent (leave as is); '' / null = clear it */
const text = (v: unknown) => (v === undefined ? undefined : String(v ?? '').trim() || null)

function concernPayload(body: any) {
  const name = typeof body?.name === 'string' ? body.name.trim() : undefined
  const slug = typeof body?.slug === 'string' && body.slug.trim() ? slugifyConcern(body.slug) : name ? slugifyConcern(name) : undefined
  return {
    name,
    slug,
    description: text(body?.description),
    image_url: text(body?.image_url),
    concern_group: body?.concern_group !== undefined ? (CONCERN_GROUPS.includes(body.concern_group) ? body.concern_group : null) : undefined,
    headline: text(body?.headline),
    subheadline: text(body?.subheadline),
    banner_url: text(body?.banner_url),
    banner_mobile_url: text(body?.banner_mobile_url),
    about_title: text(body?.about_title),
    about_body: text(body?.about_body),
    aliases: body?.aliases !== undefined ? parseConcernList(body.aliases) : undefined,
    sort_order: body?.sort_order !== undefined && Number.isFinite(Number(body.sort_order)) ? Math.round(Number(body.sort_order)) : undefined,
    is_active: body?.is_active !== undefined ? !!body.is_active : undefined,
    show_in_nav: body?.show_in_nav !== undefined ? !!body.show_in_nav : undefined,
  }
}

export async function adminCreateConcern(pool: Pool, req: Request, res: Response) {
  try {
    const p = concernPayload(req.body)
    if (!p.name || !p.slug) return sendError(res, 400, 'Name is required')
    const { rows } = await pool.query(
      `INSERT INTO concerns (name, slug, description, image_url, aliases, sort_order, is_active, show_in_nav,
                             concern_group, headline, subheadline, banner_url, banner_mobile_url, about_title, about_body)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, (SELECT COALESCE(MAX(sort_order), 0) + 10 FROM concerns)), COALESCE($7, true), COALESCE($8, true),
               $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        p.name, p.slug, p.description ?? null, p.image_url ?? null, p.aliases ?? [], p.sort_order ?? null, p.is_active ?? null, p.show_in_nav ?? null,
        p.concern_group ?? null, p.headline ?? null, p.subheadline ?? null, p.banner_url ?? null, p.banner_mobile_url ?? null, p.about_title ?? null, p.about_body ?? null,
      ]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 409, 'A concern with this slug already exists')
    sendError(res, 500, 'Failed to create concern', err)
  }
}

export async function adminUpdateConcern(pool: Pool, req: Request, res: Response) {
  try {
    const p = concernPayload(req.body)
    const sets: string[] = []
    const values: any[] = [req.params.id]
    for (const [col, val] of Object.entries(p)) {
      if (val === undefined) continue
      values.push(val)
      sets.push(`${col} = $${values.length}`)
    }
    if (!sets.length) return sendError(res, 400, 'Nothing to update')
    const { rows } = await pool.query(
      `UPDATE concerns SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      values
    )
    if (!rows.length) return sendError(res, 404, 'Concern not found')
    sendSuccess(res, rows[0])
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 409, 'A concern with this slug already exists')
    sendError(res, 500, 'Failed to update concern', err)
  }
}

export async function adminDeleteConcern(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('DELETE FROM concerns WHERE id = $1 RETURNING id, name', [req.params.id])
    if (!rows.length) return sendError(res, 404, 'Concern not found')
    sendSuccess(res, { deleted: rows[0] })
  } catch (err) {
    sendError(res, 500, 'Failed to delete concern', err)
  }
}

/** PUT /api/admin/concerns/:id/products — replace the products linked to a concern. */
export async function adminSetConcernProducts(pool: Pool, req: Request, res: Response) {
  try {
    const ids = Array.isArray(req.body?.productIds) ? req.body.productIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0) : null
    if (!ids) return sendError(res, 400, 'productIds must be an array')
    const concernId = Number(req.params.id)
    await pool.query('DELETE FROM product_concerns WHERE concern_id = $1 AND NOT (product_id = ANY($2::int[]))', [concernId, ids])
    if (ids.length) {
      await pool.query(
        `INSERT INTO product_concerns (product_id, concern_id)
         SELECT p.id, $1 FROM products p WHERE p.id = ANY($2::int[]) ON CONFLICT DO NOTHING`,
        [concernId, ids]
      )
    }
    sendSuccess(res, { concernId, productIds: ids })
  } catch (err) {
    sendError(res, 500, 'Failed to update concern products', err)
  }
}
