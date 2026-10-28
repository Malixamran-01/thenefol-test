// Bulk edit for the product catalogue: MRP, discount / selling price, card badges, category, concerns.
// Prices are kept consistent with the single-product form: details.mrp, details.websitePrice,
// details.discountPercent (+ legacy details.discount) and the products.price column, which checkout
// uses together with details.websitePrice (see services/orderPricing.ts).
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'

/** Badge ids shown on storefront product cards (labels live in common/src/productBadges.ts). */
export const CARD_BADGES = ['bestseller', 'lowest_price', 'sale', 'new', 'limited', 'trending'] as const

export type MrpMode = 'set' | 'increase' | 'decrease' | 'increase_percent' | 'decrease_percent'

export type BulkOps = {
  mrp?: { mode: MrpMode; value: number }
  discount?: { mode: 'percent' | 'price'; value: number } | { mode: 'remove' }
  badges?: { add: string[]; remove: string[] }
  category?: string
  concerns?: { add: string[]; remove: string[] }
}

type ProductRow = { id: number; title: string; price: string | null; category: string | null; details: any }

type PriceSnapshot = { mrp: number | null; websitePrice: number | null; discount: number; badges: string[]; category: string }

export type BulkChange =
  | { id: number; title: string; ok: true; before: PriceSnapshot; after: PriceSnapshot; details: Record<string, any>; price: string | null; category: string }
  | { id: number; title: string; ok: false; reason: string }

const MAX_PRODUCTS = 1000

const money = (v: unknown): number | null => {
  const n = parseFloat(String(v ?? '').replace(/[₹,\s]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
const round1 = (n: number) => Math.round(n * 10) / 10
const round2 = (n: number) => Math.round(n * 100) / 100
const fmtMoney = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2))
const fmtPercent = (n: number) => (Number.isInteger(n) ? String(n) : String(round1(n)))

const badgeList = (v: unknown): string[] =>
  Array.isArray(v) ? CARD_BADGES.filter((b) => v.includes(b)) : []

/** Validate the request's operations; returns null when there is nothing (valid) to do. */
export function sanitizeOps(raw: any): BulkOps | string | null {
  const ops: BulkOps = {}
  if (raw?.mrp) {
    const mode = raw.mrp.mode as MrpMode
    const value = Number(raw.mrp.value)
    if (!['set', 'increase', 'decrease', 'increase_percent', 'decrease_percent'].includes(mode)) return 'Unknown MRP change'
    if (!Number.isFinite(value) || value <= 0) return 'Enter a positive MRP value'
    if (mode === 'decrease_percent' && value >= 100) return 'A decrease must be below 100%'
    ops.mrp = { mode, value }
  }
  if (raw?.discount) {
    const mode = raw.discount.mode
    if (mode === 'remove') ops.discount = { mode }
    else if (mode === 'percent' || mode === 'price') {
      const value = Number(raw.discount.value)
      if (!Number.isFinite(value) || value <= 0) return 'Enter a positive discount value'
      if (mode === 'percent' && value >= 100) return 'Discount must be below 100%'
      ops.discount = { mode, value }
    } else return 'Unknown discount change'
  }
  if (raw?.badges) {
    const add = badgeList(raw.badges.add)
    const remove = badgeList(raw.badges.remove).filter((b) => !add.includes(b))
    if (add.length || remove.length) ops.badges = { add, remove }
  }
  if (typeof raw?.category === 'string' && raw.category.trim()) ops.category = raw.category.trim().slice(0, 100)
  if (raw?.concerns) {
    const clean = (v: unknown) => (Array.isArray(v) ? v.map((s) => String(s).trim()).filter(Boolean).slice(0, 50) : [])
    const add = clean(raw.concerns.add)
    const remove = clean(raw.concerns.remove)
    if (add.length || remove.length) ops.concerns = { add, remove }
  }
  return Object.keys(ops).length ? ops : null
}

function snapshot(mrp: number | null, websitePrice: number | null, details: any, category: string): PriceSnapshot {
  const discount = mrp && websitePrice != null && websitePrice <= mrp ? round1(((mrp - websitePrice) / mrp) * 100) : 0
  return { mrp, websitePrice, discount, badges: badgeList(details?.cardBadges), category }
}

/** Work out one product's new values (pure; used for the preview and for the update). */
export function computeChange(product: ProductRow, ops: BulkOps): BulkChange {
  const base = { id: product.id, title: product.title }
  const details = product.details && typeof product.details === 'object' ? { ...product.details } : {}
  const category = product.category || ''

  let mrp = money(details.mrp) ?? money(product.price)
  let websitePrice = money(details.websitePrice) ?? mrp
  if (mrp != null && websitePrice != null && websitePrice > mrp) websitePrice = mrp
  const before = snapshot(mrp, websitePrice, details, category)
  let discount = before.discount
  const pricesChange = !!(ops.mrp || ops.discount)

  if (ops.mrp) {
    const { mode, value } = ops.mrp
    if (mrp == null && mode !== 'set') return { ...base, ok: false, reason: 'No MRP to change; use "Set MRP to"' }
    const current = mrp ?? 0
    const next =
      mode === 'set' ? value
      : mode === 'increase' ? current + value
      : mode === 'decrease' ? current - value
      : mode === 'increase_percent' ? Math.round(current * (1 + value / 100))
      : Math.round(current * (1 - value / 100))
    if (!(next > 0)) return { ...base, ok: false, reason: `MRP would drop to ₹${fmtMoney(round2(next))}` }
    mrp = round2(next)
    // The product keeps its current discount % on the new MRP
    websitePrice = discount > 0 ? Math.round(mrp * (1 - discount / 100)) : mrp
  }

  if (ops.discount) {
    if (mrp == null) return { ...base, ok: false, reason: 'No MRP set; add an MRP before a discount' }
    if (ops.discount.mode === 'remove') {
      websitePrice = mrp
      discount = 0
    } else if (ops.discount.mode === 'percent') {
      discount = round1(ops.discount.value)
      websitePrice = Math.round(mrp * (1 - discount / 100))
    } else {
      if (ops.discount.value > mrp) return { ...base, ok: false, reason: `Selling price ₹${fmtMoney(ops.discount.value)} is above the MRP ₹${fmtMoney(mrp)}` }
      websitePrice = round2(ops.discount.value)
      discount = round1(((mrp - websitePrice) / mrp) * 100)
    }
    if (!(websitePrice! > 0)) return { ...base, ok: false, reason: 'Selling price would be ₹0' }
  }

  if (pricesChange && mrp != null && websitePrice != null) {
    discount = round1(((mrp - websitePrice) / mrp) * 100)
    details.mrp = fmtMoney(mrp)
    details.websitePrice = fmtMoney(websitePrice)
    details.discountPercent = discount > 0 ? fmtPercent(discount) : ''
    details.discount = details.discountPercent
  }

  if (ops.badges) {
    const set = new Set(badgeList(details.cardBadges))
    ops.badges.add.forEach((b) => set.add(b))
    ops.badges.remove.forEach((b) => set.delete(b))
    details.cardBadges = CARD_BADGES.filter((b) => set.has(b))
  }

  const nextCategory = ops.category ?? category
  const price = pricesChange && websitePrice != null ? fmtMoney(websitePrice) : product.price
  return {
    ...base,
    ok: true,
    before,
    after: snapshot(pricesChange ? mrp : before.mrp, pricesChange ? websitePrice : before.websitePrice, details, nextCategory),
    details,
    price,
    category: nextCategory,
  }
}

/**
 * POST /api/admin/products/bulk-update { productIds, ops, dryRun }
 * dryRun (default true) returns a before/after preview without saving.
 */
export async function adminBulkUpdateProducts(pool: Pool, req: Request, res: Response, io?: any) {
  try {
    const ids: number[] = Array.isArray(req.body?.productIds)
      ? [...new Set<number>(req.body.productIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))]
      : []
    if (!ids.length) return sendError(res, 400, 'Select at least one product')
    if (ids.length > MAX_PRODUCTS) return sendError(res, 400, `Select at most ${MAX_PRODUCTS} products at a time`)
    const ops = sanitizeOps(req.body?.ops)
    if (typeof ops === 'string') return sendError(res, 400, ops)
    if (!ops) return sendError(res, 400, 'Choose at least one change')
    const dryRun = req.body?.dryRun !== false

    const { rows } = await pool.query<ProductRow>(
      'SELECT id, title, price, category, details FROM products WHERE id = ANY($1::int[]) ORDER BY title',
      [ids]
    )
    const changes = rows.map((p) => computeChange(p, ops))
    const summary = changes.map((c) => (c.ok ? { id: c.id, title: c.title, ok: true, before: c.before, after: c.after } : c))
    if (dryRun) return sendSuccess(res, { dryRun: true, results: summary })

    const ok = changes.filter((c): c is Extract<BulkChange, { ok: true }> => c.ok)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const c of ok) {
        await client.query(
          'UPDATE products SET details = $2::jsonb, price = $3, category = $4, updated_at = NOW() WHERE id = $1',
          [c.id, JSON.stringify(c.details), c.price, c.category]
        )
      }
      if (ops.concerns && ok.length) {
        const okIds = ok.map((c) => c.id)
        const lower = (v: string[]) => v.map((s) => s.toLowerCase())
        if (ops.concerns.add.length) {
          await client.query(
            `INSERT INTO product_concerns (product_id, concern_id)
             SELECT p, c.id FROM unnest($1::int[]) AS p
             CROSS JOIN concerns c WHERE lower(c.name) = ANY($2::text[]) OR c.slug = ANY($2::text[])
             ON CONFLICT DO NOTHING`,
            [okIds, lower(ops.concerns.add)]
          )
        }
        if (ops.concerns.remove.length) {
          await client.query(
            `DELETE FROM product_concerns
             WHERE product_id = ANY($1::int[])
               AND concern_id IN (SELECT id FROM concerns WHERE lower(name) = ANY($2::text[]) OR slug = ANY($2::text[]))`,
            [okIds, lower(ops.concerns.remove)]
          )
        }
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      throw err
    } finally {
      client.release()
    }

    if (io && ok.length) {
      // One event: the storefront refetches its product list and the cart re-reads prices
      io.to('admin-panel').emit('update', { type: 'products_bulk_updated', data: { ids: ok.map((c) => c.id) } })
      io.to('all-users').emit('products-updated', { bulk: true, ids: ok.map((c) => c.id) })
    }
    sendSuccess(res, { dryRun: false, updated: ok.length, results: summary })
  } catch (err) {
    sendError(res, 500, 'Bulk update failed', err)
  }
}
