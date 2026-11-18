import { describe, expect, it } from 'vitest'
import * as shared from './gst'
import * as backend from '../../backend/src/services/gstCalc'
import { formatIst, isoToIstLocal, istLocalToIso, istMidnightInDays } from './istTime'

const { computeGst, effectiveGstRate, gstFromInclusive, nextGstChange, parseGstRate, productGstRate, splitSlabs } = shared

describe('parseGstRate', () => {
  it('accepts numbers and percent strings', () => {
    expect(parseGstRate(18)).toBe(18)
    expect(parseGstRate('5')).toBe(5)
    expect(parseGstRate(' 12.5% ')).toBe(12.5)
    expect(parseGstRate('0')).toBe(0)
  })
  it('rejects junk and out-of-range values', () => {
    expect(parseGstRate('')).toBeNull()
    expect(parseGstRate('abc')).toBeNull()
    expect(parseGstRate(-1)).toBeNull()
    expect(parseGstRate('101')).toBeNull()
    expect(parseGstRate(null)).toBeNull()
    expect(parseGstRate(undefined)).toBeNull()
  })
})

describe('productGstRate', () => {
  it('reads the admin-set rate, preferring details.gst', () => {
    expect(productGstRate({ gst: '5', gstPercent: '18', 'GST %': '18' })).toBe(5)
    expect(productGstRate({ gstPercent: '12' })).toBe(12)
    expect(productGstRate({ 'GST %': '18%' })).toBe(18)
  })
  it('is null when the product has no rate (no category-based guess)', () => {
    expect(productGstRate({ category: 'Hair Care' })).toBeNull()
    expect(productGstRate({ gst: '' })).toBeNull()
    expect(productGstRate(null)).toBeNull()
  })
})

describe('gstFromInclusive', () => {
  it('backs GST out of a GST-inclusive price', () => {
    expect(gstFromInclusive(118, 18)).toEqual({ taxable: 100, gst: 18 })
    expect(gstFromInclusive(105, 5)).toEqual({ taxable: 100, gst: 5 })
    expect(gstFromInclusive(499, 0)).toEqual({ taxable: 499, gst: 0 })
  })
  it('rounds to the paisa', () => {
    // 599 / 1.18 = 507.627… → 507.63, GST 91.37
    expect(gstFromInclusive(599, 18)).toEqual({ taxable: 507.63, gst: 91.37 })
  })
})

describe('computeGst', () => {
  const cart = [
    { unitPrice: 599, quantity: 2, rate: 18 }, // serum
    { unitPrice: 349, quantity: 1, rate: 5 }, // hair oil
    { unitPrice: 899, quantity: 1, rate: 18 },
  ]

  it('works out GST line by line at each product’s own rate', () => {
    const r = computeGst(cart)
    expect(r.lines.map((l) => l.gst)).toEqual([182.75, 16.62, 137.14])
    expect(r.gst).toBe(336.51)
    expect(r.gross).toBe(2446)
  })

  it('breaks GST down by rate slab, and the slabs add up to the total', () => {
    const r = computeGst(cart)
    expect(r.slabs.map((s) => s.rate)).toEqual([5, 18])
    expect(r.slabs[0]).toEqual({ rate: 5, taxable: 332.38, gst: 16.62 })
    expect(r.slabs[1]).toEqual({ rate: 18, taxable: 1777.11, gst: 319.89 })
    const sum = r.slabs.reduce((t, s) => t + s.gst, 0)
    expect(Math.round(sum * 100) / 100).toBe(r.gst)
    expect(Math.round((r.taxable + r.gst) * 100) / 100).toBe(r.gross)
  })

  it('uses the rate given, not the category: a hair product at 18% is taxed at 18%', () => {
    expect(computeGst([{ unitPrice: 118, quantity: 1, rate: 18 }]).gst).toBe(18)
  })

  it('handles an empty cart', () => {
    expect(computeGst([])).toEqual({ lines: [], gross: 0, taxable: 0, gst: 0, slabs: [] })
  })
})

describe('splitSlabs', () => {
  it('splits into CGST + SGST for intra-state supplies (odd paisa goes to SGST)', () => {
    expect(splitSlabs([{ rate: 18, taxable: 100, gst: 18.01 }], true)).toEqual([
      { rate: 18, taxable: 100, gst: 18.01, cgst: 9.01, sgst: 9, igst: 0 },
    ])
  })
  it('uses IGST for inter-state supplies', () => {
    expect(splitSlabs([{ rate: 5, taxable: 100, gst: 5 }], false)).toEqual([
      { rate: 5, taxable: 100, gst: 5, cgst: 0, sgst: 0, igst: 5 },
    ])
  })
})

describe('scheduled GST changes: effectiveGstRate', () => {
  // A change notified for 12:00 AM IST on 19 Nov 2026 = 18 Nov 2026 18:30 UTC
  const midnightIst = '2026-11-18T18:30:00.000Z'
  const schedules = [{ id: 1, rate: 5, effective_at: midnightIst, status: 'pending' }]

  it('keeps the current rate before the effective moment', () => {
    expect(effectiveGstRate(18, schedules, new Date('2026-11-18T18:29:59.999Z'))).toBe(18)
  })
  it('switches exactly at the effective moment, before any job has run', () => {
    expect(effectiveGstRate(18, schedules, new Date(midnightIst))).toBe(5)
    expect(effectiveGstRate(18, schedules, new Date('2026-11-20T00:00:00Z'))).toBe(5)
  })
  it('ignores cancelled and already-applied changes', () => {
    const rows = [
      { id: 1, rate: 5, effective_at: midnightIst, status: 'cancelled' },
      { id: 2, rate: 12, effective_at: '2026-01-01T00:00:00Z', status: 'applied' },
    ]
    expect(effectiveGstRate(18, rows, new Date('2026-11-20T00:00:00Z'))).toBe(18)
  })
  it('uses the latest change that has come into effect', () => {
    const rows = [
      { id: 1, rate: 5, effective_at: '2026-11-18T18:30:00Z', status: 'pending' },
      { id: 2, rate: 12, effective_at: '2026-11-25T18:30:00Z', status: 'pending' },
    ]
    expect(effectiveGstRate(18, rows, new Date('2026-11-20T00:00:00Z'))).toBe(5)
    expect(effectiveGstRate(18, rows, new Date('2026-11-26T00:00:00Z'))).toBe(12)
  })
  it('falls back to null when the product has no rate and nothing is due', () => {
    expect(effectiveGstRate(null, schedules, new Date('2026-11-17T00:00:00Z'))).toBeNull()
  })
  it('a due change applies even to a product without its own rate', () => {
    expect(effectiveGstRate(null, schedules, new Date('2026-11-19T00:00:00Z'))).toBe(5)
  })
  it('nextGstChange finds the soonest upcoming change', () => {
    const rows = [
      { id: 2, rate: 12, effective_at: '2026-11-25T18:30:00Z', status: 'pending' },
      { id: 1, rate: 5, effective_at: midnightIst, status: 'pending' },
    ]
    expect(nextGstChange(rows, new Date('2026-11-17T00:00:00Z'))?.id).toBe(1)
    expect(nextGstChange(rows, new Date('2026-11-20T00:00:00Z'))?.id).toBe(2)
    expect(nextGstChange(rows, new Date('2026-12-01T00:00:00Z'))).toBeNull()
  })
})

describe('IST helpers for the admin date picker', () => {
  it('reads a datetime-local value as India Standard Time', () => {
    expect(istLocalToIso('2026-11-19T00:00')).toBe('2026-11-18T18:30:00.000Z')
    expect(istLocalToIso('2026-02-31T00:00')).toBeNull()
    expect(istLocalToIso('tomorrow')).toBeNull()
  })
  it('round-trips to the input value', () => {
    expect(isoToIstLocal('2026-11-18T18:30:00.000Z')).toBe('2026-11-19T00:00')
  })
  it('“12:00 AM two days from now” is midnight IST at the start of the day after tomorrow', () => {
    // 17 Nov 2026, 10:00 PM IST
    const now = new Date('2026-11-17T16:30:00Z')
    expect(istMidnightInDays(2, now)).toBe('2026-11-18T18:30:00.000Z') // 19 Nov 00:00 IST
    expect(istMidnightInDays(1, now)).toBe('2026-11-17T18:30:00.000Z') // tonight, 18 Nov 00:00 IST
  })
  it('uses the IST date even when it is already the next day in India', () => {
    // 17 Nov 2026 20:00 UTC = 18 Nov 01:30 IST → two days on is 20 Nov 00:00 IST
    expect(istMidnightInDays(2, new Date('2026-11-17T20:00:00Z'))).toBe('2026-11-19T18:30:00.000Z')
  })
  it('formats in IST', () => {
    expect(formatIst('2026-11-18T18:30:00.000Z')).toMatch(/19 Nov 2026.*12:00.*IST/i)
  })
})

describe('backend mirror (backend/src/services/gstCalc.ts)', () => {
  it('exports the same functions and constants', () => {
    expect(Object.keys(backend).sort()).toEqual(Object.keys(shared).sort())
    expect(backend.DEFAULT_GST_RATE).toBe(shared.DEFAULT_GST_RATE)
    expect([...backend.GST_RATE_CHOICES]).toEqual([...shared.GST_RATE_CHOICES])
  })

  it('gives the same results as the storefront for carts, rates and schedules', () => {
    const carts = [
      [{ unitPrice: 599, quantity: 2, rate: 18 }, { unitPrice: 349, quantity: 1, rate: 5 }],
      [{ unitPrice: 1299.5, quantity: 3, rate: 12 }, { unitPrice: 10, quantity: 7, rate: 0 }, { unitPrice: 2499, quantity: 1, rate: 40 }],
    ]
    for (const c of carts) expect(backend.computeGst(c)).toEqual(shared.computeGst(c))
    for (const v of ['18', '5%', 12.345, '', 'x', 200, null]) expect(backend.parseGstRate(v)).toEqual(shared.parseGstRate(v))
    for (const d of [{ gst: '5' }, { 'GST %': '18' }, {}, null]) expect(backend.productGstRate(d)).toEqual(shared.productGstRate(d))
    const sched = [{ id: 1, rate: 5, effective_at: '2026-11-18T18:30:00Z', status: 'pending' }]
    for (const at of ['2026-11-18T18:29:00Z', '2026-11-18T18:30:00Z']) {
      expect(backend.effectiveGstRate(18, sched, new Date(at))).toEqual(shared.effectiveGstRate(18, sched, new Date(at)))
    }
    const slabs = shared.computeGst(carts[1]).slabs
    expect(backend.splitSlabs(slabs, true)).toEqual(shared.splitSlabs(slabs, true))
  })
})
