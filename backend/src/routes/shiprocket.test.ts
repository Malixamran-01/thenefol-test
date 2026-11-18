import { afterEach, describe, expect, it, vi } from 'vitest'
import { choosePickupLocation, findShiprocketShipment, pickupLocationNames, shiprocketMessage } from './shiprocket'

afterEach(() => vi.unstubAllGlobals())

describe('pickup location retry', () => {
  // Shiprocket: { message: 'Wrong Pickup location entered...', data: { data: [ {...} ] } }
  const valid = pickupLocationNames([{ id: 7, pickup_location: 'Nefol Warehouse', pin_code: 226010 }, { pickup_location: 'Office ' }, {}])

  it('reads the valid names Shiprocket lists', () => {
    expect(valid).toEqual(['Nefol Warehouse', 'Office '])
    expect(pickupLocationNames(undefined)).toEqual([])
  })
  it('retries with a listed location, preferring "Home"', () => {
    expect(choosePickupLocation(valid, 'Home')).toBe('Nefol Warehouse')
    expect(choosePickupLocation(['Office', ' home '], 'Home')).toBe(' home ')
    expect(choosePickupLocation(['Home'], 'Home')).toBeNull()
  })
})

describe('shiprocketMessage', () => {
  it('joins the message and field errors Shiprocket sends back', () => {
    expect(shiprocketMessage({ message: 'Oops! Invalid Data.', errors: { billing_phone: ['The billing phone must be 10 digits.'] } }))
      .toBe('Oops! Invalid Data. — billing_phone: The billing phone must be 10 digits.')
    expect(shiprocketMessage({ awb_assign_status: 0, response: { data: { awb_assign_error: 'Insufficient wallet balance' } } }))
      .toBe('Insufficient wallet balance')
    expect(shiprocketMessage({})).toBe('')
  })
})

describe('findShiprocketShipment', () => {
  const stub = (body: any, ok = true) => vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body })))

  it('finds the existing shipment for our order number', async () => {
    stub({ data: [
      { id: 1, channel_order_id: 'NEFOL-1360', shipments: [{ id: 999 }] },
      { id: 2, channel_order_id: 'NEFOL-136', status: 'NEW', shipments: [{ id: 555, awb: '' }] },
    ] })
    expect(await findShiprocketShipment('https://x', 't', 'NEFOL-136')).toEqual({ shipmentId: '555', awbCode: null, status: 'NEW' })
  })

  it('returns null when Shiprocket has no such order or the lookup fails', async () => {
    stub({ data: [] })
    expect(await findShiprocketShipment('https://x', 't', 'NEFOL-136')).toBeNull()
    stub({}, false)
    expect(await findShiprocketShipment('https://x', 't', 'NEFOL-136')).toBeNull()
  })
})
