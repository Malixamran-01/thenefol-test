/**
 * Extract India GST components and buyer GSTIN from Amazon Orders API v0 payloads.
 * Field shapes vary by marketplace/version — we walk nested objects and map known tax types.
 */

export type IndiaGstComponents = {
  igst: number
  cgst: number
  sgst: number
  utgst: number
  cess: number
}

export function moneyAmount(m: unknown): number {
  if (!m || typeof m !== 'object') return 0
  const n = Number((m as { Amount?: string }).Amount)
  return Number.isFinite(n) ? n : 0
}

const emptyGst = (): IndiaGstComponents => ({ igst: 0, cgst: 0, sgst: 0, utgst: 0, cess: 0 })

function addAmountToGst(acc: IndiaGstComponents, taxTypeRaw: string, amount: number): void {
  if (!Number.isFinite(amount) || amount === 0) return
  const t = taxTypeRaw.toUpperCase()
  if (t.includes('IGST')) acc.igst += amount
  else if (t.includes('CGST')) acc.cgst += amount
  else if (t.includes('SGST')) acc.sgst += amount
  else if (t.includes('UTGST')) acc.utgst += amount
  else if (t.includes('CESS') || t.includes('COMPENSATORY')) acc.cess += amount
}

/**
 * Deep-scan order item / buyer payloads for TaxDetail-like nodes (taxType + Money).
 */
export function parseIndiaGstFromOrderItem(item: Record<string, unknown>): IndiaGstComponents {
  const acc = emptyGst()
  const seen = new Set<unknown>()

  const visit = (node: unknown, depth: number): void => {
    if (depth > 14) return
    if (node == null || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (Array.isArray(node)) {
      for (const el of node) visit(el, depth + 1)
      return
    }

    const o = node as Record<string, unknown>

    const taxType =
      (o.taxType as string) ||
      (o.TaxType as string) ||
      (o.type as string) ||
      (o.Type as string) ||
      (o.ChargeType as string) ||
      ''

    const taxAmt =
      moneyAmount(o.taxAmount) ||
      moneyAmount(o.TaxAmount) ||
      moneyAmount(o.ChargeAmount) ||
      moneyAmount(o.amount) ||
      moneyAmount(o.Amount)

    if (taxType && taxAmt !== 0) {
      addAmountToGst(acc, taxType, taxAmt)
    }

    for (const k of Object.keys(o)) {
      if (k === 'Title' || k === 'ASIN' || k === 'SellerSKU') continue
      visit(o[k], depth + 1)
    }
  }

  visit(item, 0)
  return acc
}

/** Sum of component taxes (may overlap with ItemTax when Amazon sends both aggregate and detail). */
export function sumGstComponents(c: IndiaGstComponents): number {
  return c.igst + c.cgst + c.sgst + c.utgst + c.cess
}

/**
 * Buyer GSTIN from getOrderBuyerInfo payload (TaxClassifications Name=GSTIN etc.).
 */
export function extractBuyerGstinFromBuyerInfoResponse(res: unknown): string | null {
  const r = res as Record<string, unknown> | undefined
  const payload = (r?.payload as Record<string, unknown> | undefined) ?? r
  if (!payload || typeof payload !== 'object') return null
  const info =
    (payload.BuyerTaxInfo as Record<string, unknown> | undefined) ||
    (payload.buyerTaxInfo as Record<string, unknown> | undefined)
  if (!info) return null
  const list =
    (info.TaxClassifications as unknown) ||
    (info.taxClassifications as unknown) ||
    (info.TaxClassificationList as unknown)
  if (!Array.isArray(list)) return null
  for (const c of list) {
    if (!c || typeof c !== 'object') continue
    const o = c as Record<string, unknown>
    const name = String(o.Name || o.name || '').toUpperCase()
    const val = String(o.Value || o.value || '').trim()
    if (!val) continue
    if (name === 'GSTIN' || name.includes('GST')) return val
  }
  return null
}

/** GSTIN pattern (India) — optional validation; still return if regex fails but length 15. */
export function normalizeGstin(s: string | null | undefined): string | null {
  if (!s) return null
  const t = String(s).trim().toUpperCase()
  if (t.length < 10) return null
  return t.slice(0, 20)
}
