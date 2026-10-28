import { describe, expect, it } from 'vitest'
import { parseCSVRows } from './csv'
import { buildImportPlan, effectiveDiscount, parseMoney, parsePercent } from './productImport'

const plan = (csv: string) => buildImportPlan(parseCSVRows(csv))

describe('parseCSVRows', () => {
  it('keeps quoted line breaks, commas and doubled quotes inside one cell', () => {
    const rows = parseCSVRows('﻿Name,How to Use\r\n"Hair Oil","Step 1: apply, massage\nStep 2: rinse ""well"""\r\nSerum,Daily\n\n')
    expect(rows).toEqual([
      ['Name', 'How to Use'],
      ['Hair Oil', 'Step 1: apply, massage\nStep 2: rinse "well"'],
      ['Serum', 'Daily'],
    ])
  })
})

describe('parseMoney / parsePercent', () => {
  it('normalizes rupee amounts', () => {
    expect(parseMoney('₹1,299.00').value).toBe(1299)
    expect(parseMoney('Rs. 1,29,900').value).toBe(129900)
    expect(parseMoney('799/-').value).toBe(799)
    expect(parseMoney('abc').error).toBeTruthy()
    expect(parseMoney('').value).toBeUndefined()
  })
  it('reads percentages and Excel fractions', () => {
    expect(parsePercent('30%').value).toBe(30)
    expect(parsePercent('18').value).toBe(18)
    expect(parsePercent('0.3')).toEqual({ value: 30, fromFraction: true })
  })
})

describe('buildImportPlan', () => {
  it('maps headers with ₹, punctuation and alternate names', () => {
    const { rows, mapping } = plan('Product Name,MRP (₹),Base  Selling Price (₹),discount,Bullet Highlights (Short Desc.),Approx. Net Margin (₹)\nDuo,"₹1,299.00",₹815.00,30%,• Glow\n')
    expect(mapping.ignored).toEqual(['Approx. Net Margin (₹)'])
    expect(rows[0].details).toMatchObject({ mrp: '1299.00', websitePrice: '815.00', discountPercent: '37.3', bulletHighlights: '• Glow' })
    expect(rows[0].price).toBe('815.00')
    expect(rows[0].warnings[0]).toMatch(/says 30% but MRP\/website price give 37.3%/)
    expect(rows[0].errors).toEqual([])
  })

  it('derives website price from MRP and discount', () => {
    const { rows } = plan('Product Name,MRP,discount\nHair Oil,789,30%\n')
    expect(rows[0].details.websitePrice).toBe('552.30')
    expect(rows[0].price).toBe('552.30')
  })

  it('flags shifted rows from unquoted thousands separators', () => {
    const { rows } = plan('Product Name,MRP,WEBSITE price,discount\nSerum,1,299.00,909.30,30%\n')
    expect(rows[0].errors[0]).toMatch(/columns are shifted/)
  })

  it('rejects rows with no usable price or website price above MRP', () => {
    const { rows } = plan('Product Name,MRP,WEBSITE price\nA,,\nB,500,600\nC,abc,\n')
    expect(rows[0].errors).toContain('No price: MRP and website price are both empty')
    expect(rows[1].errors[0]).toMatch(/higher than MRP/)
    expect(rows[2].errors[0]).toMatch(/MRP: "abc" is not a valid amount/)
  })

  it('reports duplicate slugs and missing price columns', () => {
    const p = plan('Product Name,Slug\nA,same\nB,same\n')
    expect(p.fileErrors[0]).toMatch(/No price column/)
    expect(p.rows[1].errors).toContainEqual(expect.stringMatching(/Duplicate slug "same" \(also on row 2\)/))
  })

  it('maps categories and picks the first image link', () => {
    const { rows } = plan('Product Name,Product Category,MRP,Image Links\nKit, combo packs,999,"https://a/1.jpg, https://a/2.jpg"\n')
    expect(rows[0].category).toBe('Combo')
    expect(rows[0].listImage).toBe('https://a/1.jpg')
  })
})

describe('effectiveDiscount', () => {
  it('prefers the discount implied by the prices over a stale stored value', () => {
    expect(effectiveDiscount({ mrp: '1299.0', websitePrice: '815.0', discount: '30%' })).toBe('37.3')
    expect(effectiveDiscount({ mrp: '789', discountPercent: '30%' })).toBe('30')
  })
})
