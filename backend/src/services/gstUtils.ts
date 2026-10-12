import { Pool } from 'pg'
import { STATE_CODES } from '../utils/invoiceUtils'

/**
 * Shared GST helpers for unified sales (website / Amazon / Flipkart) so every platform stores
 * amounts with the same meaning:
 *
 * - `taxable_value` = tax-exclusive value of the whole line (goods + shipping + gift wrap − discounts)
 * - `tax`           = total GST on the line (IGST or CGST+SGST/UTGST, plus cess)
 * - `total`         = invoice amount = taxable_value + tax
 * - `price`         = taxable_value / quantity (tax-exclusive unit rate — what BUSY calls "Price")
 * - `shipping`      = tax-exclusive shipping portion (already INCLUDED in taxable_value; informational)
 */

/** Rates in force (incl. GST 2.0 from 22-Sep-2025: 5 / 18 / 40, plus legacy 12 / 28 for older invoices). */
const GST_SLABS = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40]

export function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Snap a derived rate (e.g. 17.98 from rounding) to the nearest legal GST slab when within 0.5 pp. */
export function snapGstRate(pct: number | null | undefined): number | null {
  if (pct == null || !Number.isFinite(pct) || pct < 0) return null
  let best = GST_SLABS[0]
  for (const s of GST_SLABS) if (Math.abs(s - pct) < Math.abs(best - pct)) best = s
  return Math.abs(best - pct) <= 0.5 ? best : Math.round(pct * 100) / 100
}

const STATE_ALIASES: Record<string, string> = {
  'NEW DELHI': 'Delhi',
  'NCT OF DELHI': 'Delhi',
  'DELHI NCR': 'Delhi',
  ORISSA: 'Odisha',
  PONDICHERRY: 'Puducherry',
  'JAMMU & KASHMIR': 'Jammu and Kashmir',
  'ANDAMAN & NICOBAR ISLANDS': 'Andaman and Nicobar Islands',
  'ANDAMAN AND NICOBAR': 'Andaman and Nicobar Islands',
  'DADRA AND NAGAR HAVELI': 'Dadra and Nagar Haveli and Daman and Diu',
  'DAMAN AND DIU': 'Dadra and Nagar Haveli and Daman and Diu',
  'DADRA & NAGAR HAVELI & DAMAN & DIU': 'Dadra and Nagar Haveli and Daman and Diu',
  UTTARANCHAL: 'Uttarakhand',
  'TAMILNADU': 'Tamil Nadu',
}

const CODE_TO_STATE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODES).map(([name, code]) => [code, name])
)

/**
 * Accepts "UTTAR PRADESH", "Uttar Pradesh", "UP"-style ISO codes ("IN-UP" not supported), or a 2-digit GST code ("09").
 * Returns the canonical state name + 2-digit GST state code, or nulls.
 */
export function normalizeIndianState(raw: string | null | undefined): { name: string | null; code: string | null } {
  if (!raw) return { name: null, code: null }
  const t = String(raw).trim()
  if (!t) return { name: null, code: null }
  if (/^\d{1,2}$/.test(t)) {
    const code = t.padStart(2, '0')
    return { name: CODE_TO_STATE[code] || null, code: CODE_TO_STATE[code] ? code : null }
  }
  const upper = t.toUpperCase().replace(/\s+/g, ' ')
  const alias = STATE_ALIASES[upper]
  if (alias) return { name: alias, code: STATE_CODES[alias] || null }
  for (const [name, code] of Object.entries(STATE_CODES)) {
    if (name.toUpperCase() === upper) return { name, code }
  }
  return { name: t, code: null }
}

let sellerStateCache: { code: string | null; at: number } | null = null

/**
 * Seller's registered GST state code. Priority:
 * 1. `GST_SELLER_STATE` env (name or 2-digit code)
 * 2. First two digits of `invoice_company_details.gstNumber` (Admin → Invoice settings)
 * 3. `09` (Uttar Pradesh — matches the hardcoded code in generateOrderNumber)
 */
export async function getSellerStateCode(pool: Pool): Promise<string> {
  const env = process.env.GST_SELLER_STATE?.trim()
  if (env) {
    const s = normalizeIndianState(env)
    if (s.code) return s.code
  }
  if (sellerStateCache && Date.now() - sellerStateCache.at < 10 * 60 * 1000 && sellerStateCache.code) {
    return sellerStateCache.code
  }
  let code: string | null = null
  try {
    const { rows } = await pool.query(
      `select setting_value from store_settings where setting_key = 'invoice_company_details' limit 1`
    )
    const raw = rows[0]?.setting_value
    const details = typeof raw === 'string' ? JSON.parse(raw) : raw
    const gstin = String(details?.gstNumber || '').trim()
    if (/^\d{2}[A-Z0-9]{13}$/i.test(gstin)) code = gstin.slice(0, 2)
  } catch {
    /* settings table missing / bad JSON — fall through */
  }
  sellerStateCache = { code, at: Date.now() }
  return code || '09'
}

export type GstSplit = { igst: number; cgst: number; sgst: number }

/**
 * Split a total GST amount into IGST (inter-state) or CGST+SGST (intra-state).
 * Returns null when the buyer state is unknown, so we never guess the wrong head.
 */
export function splitGst(tax: number, buyerStateCode: string | null, sellerStateCode: string): GstSplit | null {
  if (!buyerStateCode) return null
  const t = round2(tax)
  if (buyerStateCode === sellerStateCode) {
    const half = round2(t / 2)
    return { igst: 0, cgst: half, sgst: round2(t - half) }
  }
  return { igst: t, cgst: 0, sgst: 0 }
}

/** Back out GST from a tax-inclusive amount at `ratePct`. */
export function fromInclusive(gross: number, ratePct: number): { taxable: number; tax: number } {
  const taxable = round2(gross / (1 + ratePct / 100))
  return { taxable, tax: round2(gross - taxable) }
}

const CANCELLED_STATUSES = new Set(['canceled', 'cancelled', 'void', 'refunded'])

export function isCancelledStatus(s: string | null | undefined): boolean {
  return CANCELLED_STATUSES.has(String(s || '').trim().toLowerCase())
}
