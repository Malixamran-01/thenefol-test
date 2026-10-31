import { describe, expect, it } from 'vitest'
import { parseCSVRows } from './csv'
import { buildImportPlan, effectiveDiscount, parseMoney, parsePercent, pricingForExisting } from './productImport'

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
    const { rows, mapping } = plan('Product Name,MRP (₹),Bullet Highlights (Short Desc.),Approx. Net Margin (₹)\nDuo,"₹1,299.00",• Glow\n')
    expect(mapping.ignored).toEqual(['Approx. Net Margin (₹)'])
    expect(rows[0].details).toMatchObject({ mrp: '1299.00', bulletHighlights: '• Glow' })
    expect(rows[0].errors).toEqual([])
  })

  it('sells new products at MRP and ignores discount, price and manufacturer columns', () => {
    const { rows, mapping } = plan('Product Name,MRP,Website Price,discount,Manufacturer / Packer / Importer\nHair Oil,789,552.30,30%,M/s Example\n')
    expect(mapping.ignored).toEqual(['Website Price', 'discount', 'Manufacturer / Packer / Importer'])
    expect(rows[0].price).toBe('789.00')
    expect(rows[0].details).toMatchObject({ mrp: '789.00', websitePrice: '789.00', discountPercent: '', discount: '' })
    expect(rows[0].details.manufacturer).toBeUndefined()
  })

  it('flags shifted rows from unquoted thousands separators', () => {
    const { rows } = plan('Product Name,MRP,GST %\nSerum,1,299.00,18\n')
    expect(rows[0].errors[0]).toMatch(/columns are shifted/)
  })

  it('rejects rows with no usable MRP', () => {
    const { rows } = plan('Product Name,MRP\nA,\nB,0\nC,abc\n')
    expect(rows[0].errors).toContain('Missing MRP')
    expect(rows[1].errors).toContain('MRP is 0')
    expect(rows[2].errors[0]).toMatch(/MRP: "abc" is not a valid amount/)
  })

  it('reports duplicate slugs and a missing MRP column', () => {
    const p = plan('Product Name,Slug\nA,same\nB,same\n')
    expect(p.fileErrors[0]).toMatch(/No MRP column/)
    expect(p.rows[1].errors).toContainEqual(expect.stringMatching(/Duplicate slug "same" \(also on row 2\)/))
  })

  it('maps categories and picks the first image link', () => {
    const { rows } = plan('Product Name,Product Category,MRP,Image Links\nKit, combo packs,999,"https://a/1.jpg, https://a/2.jpg"\n')
    expect(rows[0].category).toBe('Combo')
    expect(rows[0].listImage).toBe('https://a/1.jpg')
  })
})

describe('pricingForExisting', () => {
  it('keeps the current discount % on the new MRP', () => {
    expect(pricingForExisting({ mrp: '500', websitePrice: '350' }, 699)).toEqual({
      price: '489.00',
      details: { mrp: '699.00', websitePrice: '489.00', discountPercent: '30', discount: '30' },
    })
  })

  it('sells at the new MRP when the product has no discount', () => {
    expect(pricingForExisting({ mrp: '500', websitePrice: '500' }, 699)).toEqual({
      price: '699.00',
      details: { mrp: '699.00', websitePrice: '699.00', discountPercent: '', discount: '' },
    })
  })
})

describe('effectiveDiscount', () => {
  it('prefers the discount implied by the prices over a stale stored value', () => {
    expect(effectiveDiscount({ mrp: '1299.0', websitePrice: '815.0', discount: '30%' })).toBe('37.3')
    expect(effectiveDiscount({ mrp: '789', discountPercent: '30%' })).toBe('30')
  })
})
