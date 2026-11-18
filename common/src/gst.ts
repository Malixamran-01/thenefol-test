/**
 * GST maths shared by the storefront (cart / checkout) and the backend (order creation, invoices).
 *
 * Prices on the site are GST-INCLUSIVE (MRP / selling price already contains GST), so GST is
 * backed out of each line: taxable = gross / (1 + rate/100), gst = gross − taxable.
 * Each product carries its own rate (set in the admin panel, stored in products.details.gst);
 * there is no category-based default any more.
 *
 * KEEP IN SYNC with backend/src/services/gstCalc.ts (the backend compiles only its own src/).
 * common/src/gst.test.ts checks that both files give the same results.
 */

/** Rate used only when a product has no GST rate set in the admin panel. */
export const DEFAULT_GST_RATE = 18

/** Rates offered as quick picks in the admin panel (GST 2.0 slabs plus legacy 12 / 28). */
export const GST_RATE_CHOICES = [0, 5, 12, 18, 28, 40] as const

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** "18", "18%", " 5 ", 12.5 → number; anything outside 0–100 or unparseable → null. */
export function parseGstRate(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 100 ? round2(value) : null
  const s = String(value).replace(/%/g, '').trim()
  if (!s || !/^\d+(\.\d+)?$/.test(s)) return null
  const n = Number(s)
  return n >= 0 && n <= 100 ? round2(n) : null
}

/**
 * A product's own GST rate from products.details. The admin product form writes `gst`; the
 * GST endpoints and the CSV import also write `gstPercent` / `'GST %'`, so `gst` is the freshest.
 */
export function productGstRate(details: unknown): number | null {
  if (!details || typeof details !== 'object') return null
  const d = details as Record<string, unknown>
  for (const key of ['gst', 'gstPercent', 'GST %']) {
    const rate = parseGstRate(d[key])
    if (rate != null) return rate
  }
  return null
}

export type GstScheduleLike = {
  id?: number
  rate: number | string
  effective_at: string | Date
  /** Only 'pending' rows count; 'applied' rows are already in the product, 'cancelled' never apply. */
  status?: string
}

const toTime = (v: string | Date) => (v instanceof Date ? v.getTime() : new Date(v).getTime())

/**
 * The rate in force at `at`: the latest pending scheduled change whose effective time has
 * arrived wins (even before the backend job has copied it into the product), otherwise the
 * product's own rate. Because the lookup itself honours the effective time, a change is live
 * at exactly its effective moment, not whenever the job next runs.
 */
export function effectiveGstRate(
  baseRate: number | null,
  schedules: GstScheduleLike[] = [],
  at: Date = new Date()
): number | null {
  const now = at.getTime()
  let best: GstScheduleLike | null = null
  for (const s of schedules) {
    if (s.status && s.status !== 'pending') continue
    const t = toTime(s.effective_at)
    if (!Number.isFinite(t) || t > now) continue
    if (parseGstRate(s.rate) == null) continue
    if (!best) { best = s; continue }
    const bt = toTime(best.effective_at)
    if (t > bt || (t === bt && (s.id ?? 0) > (best.id ?? 0))) best = s
  }
  return best ? parseGstRate(best.rate) : baseRate
}

/** Next pending change after `at` (for "GST changes to 5% on …" hints), or null. */
export function nextGstChange(schedules: GstScheduleLike[] = [], at: Date = new Date()): GstScheduleLike | null {
  const now = at.getTime()
  let next: GstScheduleLike | null = null
  for (const s of schedules) {
    if (s.status && s.status !== 'pending') continue
    const t = toTime(s.effective_at)
    if (!Number.isFinite(t) || t <= now || parseGstRate(s.rate) == null) continue
    if (!next || t < toTime(next.effective_at)) next = s
  }
  return next
}

/** Back GST out of a GST-inclusive amount, to the paisa. */
export function gstFromInclusive(gross: number, ratePct: number): { taxable: number; gst: number } {
  const g = round2(Number(gross) || 0)
  const rate = parseGstRate(ratePct) ?? 0
  const taxable = round2(g / (1 + rate / 100))
  return { taxable, gst: round2(g - taxable) }
}

export type GstLineInput = { unitPrice: number; quantity: number; rate: number }
export type GstLine = GstLineInput & { gross: number; taxable: number; gst: number }
export type GstSlab = { rate: number; taxable: number; gst: number }
export type GstSummary = { lines: GstLine[]; gross: number; taxable: number; gst: number; slabs: GstSlab[] }

/**
 * GST for a set of GST-inclusive lines, each at its own rate. GST is worked out (and rounded)
 * per line and the order total is the sum of the lines, so the shopper's total, the stored
 * order and the invoice's per-rate breakdown always add up to the same paisa.
 */
export function computeGst(lines: GstLineInput[]): GstSummary {
  const out: GstLine[] = []
  const slabMap = new Map<number, GstSlab>()
  let gross = 0
  let taxable = 0
  let gst = 0
  for (const l of lines) {
    const qty = Math.max(0, Number(l.quantity) || 0)
    const rate = parseGstRate(l.rate) ?? 0
    const lineGross = round2((Number(l.unitPrice) || 0) * qty)
    const t = gstFromInclusive(lineGross, rate)
    out.push({ unitPrice: Number(l.unitPrice) || 0, quantity: qty, rate, gross: lineGross, taxable: t.taxable, gst: t.gst })
    gross += lineGross
    taxable += t.taxable
    gst += t.gst
    const slab = slabMap.get(rate) || { rate, taxable: 0, gst: 0 }
    slab.taxable = round2(slab.taxable + t.taxable)
    slab.gst = round2(slab.gst + t.gst)
    slabMap.set(rate, slab)
  }
  return {
    lines: out,
    gross: round2(gross),
    taxable: round2(taxable),
    gst: round2(gst),
    slabs: [...slabMap.values()].sort((a, b) => a.rate - b.rate),
  }
}

export type GstSlabSplit = GstSlab & { cgst: number; sgst: number; igst: number }

/** Split each slab's GST into CGST + SGST (intra-state) or IGST (inter-state). */
export function splitSlabs(slabs: GstSlab[], intraState: boolean): GstSlabSplit[] {
  return slabs.map((s) => {
    if (!intraState) return { ...s, cgst: 0, sgst: 0, igst: s.gst }
    const cgst = round2(s.gst / 2)
    return { ...s, cgst, sgst: round2(s.gst - cgst), igst: 0 }
  })
}
