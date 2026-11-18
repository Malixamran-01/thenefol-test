import { describe, expect, it } from 'vitest'
import { mergeWarehouses, pickWarehouse, validateWarehouse } from './pickupWarehouses'

const saved = [
  { id: 1, name: 'Lucknow WH', contact_name: 'A', phone: '9876543210', email: 'a@x.in', address: '703 BCC Tower, Sultanpur Rd', address_2: '', city: 'Lucknow', state: 'Uttar Pradesh', country: 'India', pin_code: '226002', is_default: false, shiprocket_status: 'synced', shiprocket_error: null },
  { id: 2, name: 'Delhi WH', contact_name: 'B', phone: '9876543211', email: 'b@x.in', address: '12 Okhla Phase 2 Road', address_2: '', city: 'New Delhi', state: 'Delhi', country: 'India', pin_code: '110020', is_default: true, shiprocket_status: 'failed', shiprocket_error: 'Address nick name already in use' },
]
// Shiprocket's /settings/company/pickup → data.shipping_address
const remote = [
  { pickup_location: 'lucknow wh', pin_code: 226002, phone_verified: 1 },
  { pickup_location: 'Home', address: 'Old office', city: 'Lucknow', pin_code: 226010, phone_verified: 0 },
]

describe('mergeWarehouses', () => {
  const list = mergeWarehouses(saved, remote)

  it('marks saved warehouses that exist in Shiprocket (name match ignores case)', () => {
    const lko = list.find((w) => w.name === 'Lucknow WH')!
    expect(lko).toMatchObject({ source: 'saved', in_shiprocket: true, phone_verified: true, shiprocket_status: 'synced' })
    const del = list.find((w) => w.name === 'Delhi WH')!
    expect(del).toMatchObject({ in_shiprocket: false, shiprocket_status: 'failed', shiprocket_error: 'Address nick name already in use' })
  })

  it('also lists locations that were only created in Shiprocket', () => {
    expect(list.find((w) => w.name === 'Home')).toMatchObject({ id: null, source: 'shiprocket', in_shiprocket: true, pin_code: '226010', phone_verified: false })
    expect(list).toHaveLength(3)
  })

  it('works when Shiprocket cannot be reached', () => {
    expect(mergeWarehouses(saved, null).every((w) => !w.in_shiprocket)).toBe(true)
  })
})

describe('pickWarehouse', () => {
  it('uses the warehouse picked when confirming', () => {
    const w = pickWarehouse(mergeWarehouses(saved, remote), 'home')
    expect(typeof w !== 'string' && w?.name).toBe('Home')
  })

  it('refuses a warehouse that is not in Shiprocket, or unknown', () => {
    const list = mergeWarehouses(saved, remote)
    expect(pickWarehouse(list, 'Delhi WH')).toMatch(/not set up in Shiprocket yet: Address nick name/)
    expect(pickWarehouse(list, 'Mumbai')).toMatch(/not found/)
  })

  it('falls back to the default, then "Home", then the first Shiprocket location', () => {
    const synced = saved.map((w) => ({ ...w }))
    const both = [...remote, { pickup_location: 'Delhi WH', pin_code: 110020 }]
    expect((pickWarehouse(mergeWarehouses(synced, both)) as any).name).toBe('Delhi WH') // default
    expect((pickWarehouse(mergeWarehouses(saved, remote)) as any).name).toBe('Home') // default not in Shiprocket
    expect((pickWarehouse(mergeWarehouses([], [{ pickup_location: 'Primary' }])) as any).name).toBe('Primary')
    expect(pickWarehouse(mergeWarehouses([], []))).toBeNull()
  })
})

describe('validateWarehouse', () => {
  const ok = { name: 'Lucknow WH', contact_name: 'A', phone: '+91 98765 43210', email: 'a@x.in', address: '703 BCC Tower, Sultanpur Rd', city: 'Lucknow', state: 'Uttar Pradesh', pin_code: '226 002' }

  it('accepts a complete address and normalises phone and pincode', () => {
    expect(validateWarehouse(ok)).toMatchObject({ phone: '9876543210', pin_code: '226002', country: 'India' })
  })

  it('applies Shiprocket’s rules', () => {
    expect(validateWarehouse({ ...ok, name: 'x'.repeat(37) })).toMatch(/36/)
    expect(validateWarehouse({ ...ok, name: 'WH#1' })).toMatch(/letters, numbers/)
    expect(validateWarehouse({ ...ok, phone: '12345' })).toMatch(/10-digit/)
    expect(validateWarehouse({ ...ok, address: 'Lucknow' })).toMatch(/at least 10/)
    expect(validateWarehouse({ ...ok, pin_code: '2260' })).toMatch(/6 digits/)
  })
})
