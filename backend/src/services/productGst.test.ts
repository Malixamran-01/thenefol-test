import { describe, expect, it } from 'vitest'
import { getProductGstRates, parseEffectiveAt, priceOrderGst } from './productGst'
import { computeChange, sanitizeOps } from '../routes/productBulk'
import { generateAmazonInvoiceHTML, invoiceItemGst } from '../utils/amazonInvoiceTemplate'

type Product = { id: number; slug: string; details: Record<string, unknown> }
type Schedule = { id: number; product_id: number; rate: number; effective_at: string; status: string }

/** Minimal stand-in for pg: answers the queries productGst.ts makes. */
function fakeDb(products: Product[], schedules: Schedule[] = []) {
  return {
    async query(sql: string, params: any[] = []): Promise<any> {
      if (/FROM products WHERE id = ANY/.test(sql)) {
        const ids: number[] = params[0]
        return { rows: products.filter((p) => ids.includes(p.id)) }
      }
      if (/FROM products WHERE slug = ANY/.test(sql)) {
        const slugs: string[] = params[0]
        return { rows: products.filter((p) => slugs.includes(p.slug)) }
      }
      if (/FROM product_gst_schedules/.test(sql)) {
        const ids: number[] = params[0]
        return { rows: schedules.filter((s) => ids.includes(s.product_id) && s.status === 'pending') }
      }
      throw new Error(`unexpected query: ${sql}`)
    },
  }
}

const products: Product[] = [
  { id: 1, slug: 'vitamin-c-serum', details: { gst: '18' } },
  { id: 2, slug: 'hair-oil', details: { gst: '5', 'GST %': '18' } }, // admin form value wins over stale CSV key
  { id: 3, slug: 'no-rate-yet', details: {} },
]
// Government notification: hair oil moves to 18% from 12:00 AM IST on 19 Nov 2026
const midnightIst = '2026-11-18T18:30:00.000Z'
const schedules: Schedule[] = [{ id: 10, product_id: 2, rate: 18, effective_at: midnightIst, status: 'pending' }]

describe('getProductGstRates', () => {
  it('returns each product’s own rate and the upcoming change', async () => {
    const rates = await getProductGstRates(fakeDb(products, schedules) as any, [1, 2, 3], new Date('2026-11-18T12:00:00Z'))
    expect(rates.get(1)).toEqual({ rate: 18, isDefault: false, upcoming: null })
    expect(rates.get(2)).toEqual({ rate: 5, isDefault: false, upcoming: { rate: 18, effective_at: midnightIst } })
    expect(rates.get(3)).toEqual({ rate: 18, isDefault: true, upcoming: null })
  })

  it('switches to the scheduled rate at the effective moment', async () => {
    const db = fakeDb(products, schedules) as any
    expect((await getProductGstRates(db, [2], new Date('2026-11-18T18:29:59Z'))).get(2)?.rate).toBe(5)
    expect((await getProductGstRates(db, [2], new Date(midnightIst))).get(2)?.rate).toBe(18)
  })

  it('treats a missing schedules table as "nothing scheduled"', async () => {
    const db = {
      async query(sql: string, params: any[]) {
        if (/product_gst_schedules/.test(sql)) throw Object.assign(new Error('relation does not exist'), { code: '42P01' })
        return fakeDb(products).query(sql, params)
      },
    }
    expect((await getProductGstRates(db as any, [2])).get(2)?.rate).toBe(5)
  })
})

describe('priceOrderGst (server-side order GST)', () => {
  const items = [
    { product_id: 1, slug: 'vitamin-c-serum', price: '599', quantity: 2, category: 'Face Care', csvProduct: { 'GST %': '12' } },
    { slug: 'hair-oil', price: '₹349', quantity: 1, category: 'Hair Care' }, // no id: looked up by slug
    { product_id: 3, price: '899', quantity: 1 },
  ]

  it('recomputes GST from each product’s rate and ignores client figures', async () => {
    const { summary, items: out } = await priceOrderGst(fakeDb(products, schedules) as any, items, new Date('2026-11-18T12:00:00Z'))
    expect(out.map((i) => i.gst_rate)).toEqual([18, 5, 18])
    expect(out.map((i) => i.gst_amount)).toEqual([182.75, 16.62, 137.14])
    expect(out.map((i) => i.taxable_value)).toEqual([1015.25, 332.38, 761.86])
    expect(summary.gst).toBe(336.51)
    // the stale CSV rate sent by the client is overwritten with the rate actually charged
    expect(out[0].csvProduct['GST %']).toBe('18')
  })

  it('uses the new rate for orders placed after a scheduled change takes effect', async () => {
    const after = await priceOrderGst(fakeDb(products, schedules) as any, [items[1]], new Date('2026-11-19T00:00:00Z'))
    expect(after.items[0].gst_rate).toBe(18)
    expect(after.summary.gst).toBe(53.24)
  })

  it('accepts items as a JSON string', async () => {
    const { summary } = await priceOrderGst(fakeDb(products) as any, JSON.stringify([{ product_id: 1, price: 118, quantity: 1 }]))
    expect(summary.gst).toBe(18)
  })
})

describe('parseEffectiveAt', () => {
  const now = new Date('2026-11-17T16:30:00Z')
  it('accepts a future time', () => {
    expect(parseEffectiveAt(midnightIst, now)).toEqual(new Date(midnightIst))
  })
  it('rejects past, missing, invalid and far-future times', () => {
    expect(typeof parseEffectiveAt('2026-11-17T16:00:00Z', now)).toBe('string')
    expect(typeof parseEffectiveAt('', now)).toBe('string')
    expect(typeof parseEffectiveAt('soon', now)).toBe('string')
    expect(typeof parseEffectiveAt('2030-01-01T00:00:00Z', now)).toBe('string')
  })
})

describe('bulk edit GST operation', () => {
  const now = new Date('2026-11-17T16:30:00Z')
  const row = { id: 2, title: 'Hair oil', price: '349', category: 'Hair Care', details: { gst: '5', mrp: '349' } }

  it('"change now" writes the rate to every GST key of the product', () => {
    const ops = sanitizeOps({ gst: { rate: '18' } }, now)
    expect(ops).toEqual({ gst: { rate: 18 } })
    const c = computeChange(row, ops as any)
    expect(c.ok && c.details).toMatchObject({ gst: '18', gstPercent: '18', 'GST %': '18' })
    expect(c.ok && [c.before.gst, c.after.gst]).toEqual([5, 18])
    expect(c.ok && c.scheduledGst).toBeUndefined()
  })

  it('"schedule" leaves the product unchanged and returns the pending change', () => {
    const ops = sanitizeOps({ gst: { rate: 18, effectiveAt: midnightIst } }, now)
    const c = computeChange(row, ops as any)
    expect(c.ok && c.details.gst).toBe('5')
    expect(c.ok && c.after.gst).toBe(5)
    expect(c.ok && c.scheduledGst).toEqual({ rate: 18, effectiveAt: midnightIst })
  })

  it('rejects an invalid rate or a time in the past', () => {
    expect(sanitizeOps({ gst: { rate: 120 } }, now)).toMatch(/GST rate/)
    expect(sanitizeOps({ gst: { rate: 5, effectiveAt: '2026-11-01T00:00:00Z' } }, now)).toMatch(/future/)
  })
})

describe('seller tax invoice', () => {
  const order = {
    order_number: 'N-1',
    invoice_number: 'N09-1',
    created_at: '2026-11-18T10:00:00Z',
    shipping: 0,
    shipping_address: { firstName: 'A', state: 'Uttar Pradesh', city: 'Lucknow' },
    items: [
      // placed at 5%; the product has since moved to 18% — the invoice must still say 5%
      { title: 'Hair oil', price: '349', quantity: 1, gst_rate: 5, gst_amount: 16.62, taxable_value: 332.38, csvProduct: { 'GST %': '18' } },
      { title: 'Serum', price: '599', quantity: 2, gst_rate: 18, gst_amount: 182.75, taxable_value: 1015.25 },
      { title: 'Cream', price: '899', quantity: 1, gst_rate: 18, gst_amount: 137.14, taxable_value: 761.86 },
    ],
  }

  it('uses the rate stored on the item at order time', () => {
    expect(invoiceItemGst(order.items[0], { rate: 18 })).toEqual({ rate: 5, taxable: 332.38, gst: 16.62 })
  })

  it('falls back to the CSV rate, then the invoice setting, for older orders', () => {
    expect(invoiceItemGst({ price: '105', quantity: 1, csvProduct: { 'GST %': '5' } }, { rate: 18 })).toEqual({ rate: 5, taxable: 100, gst: 5 })
    expect(invoiceItemGst({ price: '118', quantity: 1 }, { rate: 18 })).toEqual({ rate: 18, taxable: 100, gst: 18 })
  })

  it('breaks GST down by rate with CGST/SGST for intra-state invoices', () => {
    const html = generateAmazonInvoiceHTML(order, {}, { rate: 18, type: 'CGST+SGST' }, '', '', '₹')
    expect(html).toContain('GST Summary by Rate')
    expect(html).toMatch(/5%[^<]*\(2\.50% \+ 2\.50%\)<\/td>\s*<td class="text-right">₹332\.38<\/td>\s*<td class="text-right">₹8\.31<\/td>\s*<td class="text-right">₹8\.31<\/td>\s*<td class="text-right">₹16\.62<\/td>/)
    expect(html).toMatch(/18%[^<]*\(9% \+ 9%\)<\/td>\s*<td class="text-right">₹1777\.11<\/td>\s*<td class="text-right">₹159\.95<\/td>\s*<td class="text-right">₹159\.94<\/td>\s*<td class="text-right">₹319\.89<\/td>/)
    expect(html).toMatch(/TOTAL<\/td>\s*<td class="text-right">₹2109\.49<\/td>[\s\S]*?₹336\.51<\/td>/)
  })

  it('is a 4 × 6 inch label with the NEFöL wordmark', () => {
    const html = generateAmazonInvoiceHTML(order, {}, { rate: 18, type: 'CGST+SGST' }, '', '', '₹')
    expect(html).toContain('@page { size: 4in 6in; margin: 0; }')
    expect(html).toMatch(/class="mark">NEF<span class="o">ö<\/span>L<\/span>/)
    expect(html).toContain('Natural as the morning dew')
    expect(html).toContain('Bill &amp; Ship to')
  })

  it('uses the Midnight Gold theme, printing black-and-white unless the PDF asks for colour', () => {
    const html = generateAmazonInvoiceHTML(order, {}, { rate: 18, type: 'CGST+SGST' }, '', '', '₹')
    expect(html).toContain('--midnight: #111827;')
    expect(html).toContain('--gold: #B08D57;')
    expect(html).toContain('Playfair+Display')
    expect(html).toMatch(/@media print[\s\S]*html:not\(\.color-print\) \{\s*--midnight: #000;/)
  })

  it('escapes product names and addresses', () => {
    const html = generateAmazonInvoiceHTML(
      { ...order, items: [{ title: 'Oil <b>&</b> Serum', price: '118', quantity: 1, gst_rate: 18, gst_amount: 18, taxable_value: 100 }] },
      {}, { rate: 18, type: 'IGST' }, '', '', '₹'
    )
    expect(html).toContain('Oil &lt;b&gt;&amp;&lt;/b&gt; Serum')
  })

  it('uses IGST columns for inter-state invoices', () => {
    const html = generateAmazonInvoiceHTML(order, {}, { rate: 18, type: 'IGST' }, '', '', '₹')
    expect(html).toMatch(/<th class="text-right">IGST<\/th>/)
    expect(html).toMatch(/18%<\/td>\s*<td class="text-right">₹1777\.11<\/td>\s*<td class="text-right">₹319\.89<\/td>/)
  })
})
