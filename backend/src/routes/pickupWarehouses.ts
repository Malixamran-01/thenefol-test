import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { getPickupLocations, getToken, shiprocketMessage } from './shiprocket'

/**
 * Pickup warehouses. Shiprocket only accepts a pickup_location name that exists in the
 * Shiprocket account, so every warehouse saved here is also registered there
 * (POST /settings/company/addpickup). Locations created directly in the Shiprocket panel are
 * listed too, so both can be chosen when confirming an order.
 */

export const WAREHOUSE_DDL = `
  CREATE TABLE IF NOT EXISTS pickup_warehouses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    address_2 TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'India',
    pin_code TEXT NOT NULL DEFAULT '',
    is_default BOOLEAN NOT NULL DEFAULT false,
    shiprocket_status TEXT NOT NULL DEFAULT 'pending' CHECK (shiprocket_status IN ('pending', 'synced', 'failed')),
    shiprocket_error TEXT,
    shiprocket_pickup_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_warehouses_name ON pickup_warehouses (LOWER(name));
  CREATE UNIQUE INDEX IF NOT EXISTS idx_pickup_warehouses_one_default ON pickup_warehouses (is_default) WHERE is_default;
  ALTER TABLE IF EXISTS shiprocket_shipments ADD COLUMN IF NOT EXISTS pickup_location TEXT;
`

export async function ensureWarehouseTable(pool: Pool) {
  await pool.query(WAREHOUSE_DDL)
}

export type WarehouseInput = {
  name: string
  contact_name: string
  phone: string
  email: string
  address: string
  address_2: string
  city: string
  state: string
  country: string
  pin_code: string
}

export type Warehouse = WarehouseInput & {
  id: number | null
  is_default: boolean
  /** saved = added in this admin; shiprocket = only exists in the Shiprocket account */
  source: 'saved' | 'shiprocket'
  in_shiprocket: boolean
  phone_verified: boolean | null
  shiprocket_status: 'pending' | 'synced' | 'failed' | null
  shiprocket_error: string | null
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

/** Checks a new warehouse against Shiprocket's rules for pickup addresses. */
export function validateWarehouse(body: any): WarehouseInput | string {
  const s = (k: string) => String(body?.[k] ?? '').trim()
  const v: WarehouseInput = {
    name: s('name'),
    contact_name: s('contact_name'),
    phone: s('phone').replace(/\D/g, '').slice(-10),
    email: s('email'),
    address: s('address'),
    address_2: s('address_2'),
    city: s('city'),
    state: s('state'),
    country: s('country') || 'India',
    pin_code: s('pin_code').replace(/\s/g, ''),
  }
  if (!v.name) return 'Warehouse name is required'
  if (v.name.length > 36) return 'Warehouse name can be at most 36 characters (Shiprocket limit)'
  if (!/^[A-Za-z0-9 _-]+$/.test(v.name)) return 'Warehouse name can only use letters, numbers, spaces, - and _'
  if (!v.contact_name) return 'Contact person is required'
  if (!/^[6-9]\d{9}$/.test(v.phone)) return 'Phone must be a 10-digit Indian mobile number'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) return 'A valid email is required'
  if (v.address.length < 10) return 'Address line 1 must be at least 10 characters and include a house/shop number'
  if (!v.city) return 'City is required'
  if (!v.state) return 'State is required'
  if (!/^\d{6}$/.test(v.pin_code)) return 'Pincode must be 6 digits'
  return v
}

/** Saved warehouses merged with the pickup locations that exist in Shiprocket (matched by name). */
export function mergeWarehouses(saved: any[], shiprocket: any[] | null): Warehouse[] {
  const remote = Array.isArray(shiprocket) ? shiprocket : []
  const remoteByName = new Map(remote.filter((r) => r?.pickup_location).map((r) => [norm(r.pickup_location), r]))
  const out: Warehouse[] = saved.map((w) => {
    const r = remoteByName.get(norm(w.name))
    return {
      id: w.id,
      name: w.name,
      contact_name: w.contact_name,
      phone: w.phone,
      email: w.email,
      address: w.address,
      address_2: w.address_2,
      city: w.city,
      state: w.state,
      country: w.country,
      pin_code: String(w.pin_code),
      is_default: !!w.is_default,
      source: 'saved',
      in_shiprocket: !!r,
      phone_verified: r ? r.phone_verified == null ? null : Number(r.phone_verified) === 1 : null,
      shiprocket_status: r ? 'synced' : w.shiprocket_status,
      shiprocket_error: r ? null : w.shiprocket_error,
    }
  })
  const savedNames = new Set(saved.map((w) => norm(w.name)))
  for (const r of remote) {
    if (!r?.pickup_location || savedNames.has(norm(r.pickup_location))) continue
    out.push({
      id: null,
      name: String(r.pickup_location),
      contact_name: String(r.name ?? ''),
      phone: String(r.phone ?? ''),
      email: String(r.email ?? ''),
      address: String(r.address ?? ''),
      address_2: String(r.address_2 ?? ''),
      city: String(r.city ?? ''),
      state: String(r.state ?? ''),
      country: String(r.country ?? 'India'),
      pin_code: String(r.pin_code ?? r.pincode ?? ''),
      is_default: false,
      source: 'shiprocket',
      in_shiprocket: true,
      phone_verified: r.phone_verified == null ? null : Number(r.phone_verified) === 1,
      shiprocket_status: 'synced',
      shiprocket_error: null,
    })
  }
  return out.sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name))
}

export async function listWarehouses(pool: Pool): Promise<Warehouse[]> {
  const [{ rows }, remote] = await Promise.all([
    pool.query('SELECT * FROM pickup_warehouses ORDER BY name').catch((e: any) => {
      if (e?.code === '42P01') return { rows: [] as any[] }
      throw e
    }),
    getPickupLocations(pool),
  ])
  return mergeWarehouses(rows, remote)
}

/**
 * The pickup location to send to Shiprocket: the one asked for (must exist in Shiprocket),
 * otherwise the default warehouse, otherwise "Home", otherwise the first Shiprocket location.
 */
export function pickWarehouse(list: Warehouse[], requested?: string | null): Warehouse | string | null {
  const usable = list.filter((w) => w.in_shiprocket)
  if (requested && String(requested).trim()) {
    const w = list.find((x) => norm(x.name) === norm(requested))
    if (!w) return `Warehouse "${requested}" not found`
    if (!w.in_shiprocket) return `Warehouse "${w.name}" is not set up in Shiprocket yet${w.shiprocket_error ? `: ${w.shiprocket_error}` : ''}`
    return w
  }
  return usable.find((w) => w.is_default) || usable.find((w) => norm(w.name) === 'home') || usable[0] || null
}

export async function resolveWarehouse(pool: Pool, requested?: string | null) {
  return pickWarehouse(await listWarehouses(pool), requested)
}

async function registerInShiprocket(pool: Pool, w: WarehouseInput): Promise<{ ok: true; pickupId: string | null } | { ok: false; error: string }> {
  const token = await getToken(pool)
  if (!token) return { ok: false, error: 'Shiprocket credentials not configured' }
  const base = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'
  const resp = await fetch(`${base}/settings/company/addpickup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      pickup_location: w.name,
      name: w.contact_name,
      email: w.email,
      phone: w.phone,
      address: w.address,
      address_2: w.address_2,
      city: w.city,
      state: w.state,
      country: w.country,
      pin_code: w.pin_code,
    }),
  })
  const data: any = await resp.json().catch(() => ({}))
  if (resp.ok && data?.success !== false) {
    return { ok: true, pickupId: data?.pickup_id != null ? String(data.pickup_id) : data?.address?.id != null ? String(data.address.id) : null }
  }
  console.error('Shiprocket addpickup error:', data)
  return { ok: false, error: shiprocketMessage(data) || `HTTP ${resp.status}` }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function getWarehouses(pool: Pool, _req: Request, res: Response) {
  try {
    const list = await listWarehouses(pool)
    const chosen = pickWarehouse(list)
    sendSuccess(res, { warehouses: list, default_name: chosen && typeof chosen !== 'string' ? chosen.name : null })
  } catch (err) {
    sendError(res, 500, 'Failed to load warehouses', err)
  }
}

export async function createWarehouse(pool: Pool, req: Request, res: Response) {
  try {
    const v = validateWarehouse(req.body)
    if (typeof v === 'string') return sendError(res, 400, v)
    const dupe = await pool.query('SELECT 1 FROM pickup_warehouses WHERE LOWER(name) = LOWER($1)', [v.name])
    if (dupe.rows.length) return sendError(res, 409, `A warehouse called "${v.name}" already exists`)

    const remote = await getPickupLocations(pool)
    const alreadyInShiprocket = (remote || []).some((r: any) => norm(r?.pickup_location) === norm(v.name))
    const reg = alreadyInShiprocket ? { ok: true as const, pickupId: null } : await registerInShiprocket(pool, v)

    const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS n FROM pickup_warehouses')
    const makeDefault = !!req.body?.is_default || countRows[0].n === 0
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      if (makeDefault) await client.query('UPDATE pickup_warehouses SET is_default = false WHERE is_default')
      await client.query(
        `INSERT INTO pickup_warehouses (name, contact_name, phone, email, address, address_2, city, state, country, pin_code,
                                        is_default, shiprocket_status, shiprocket_error, shiprocket_pickup_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [v.name, v.contact_name, v.phone, v.email, v.address, v.address_2, v.city, v.state, v.country, v.pin_code,
          makeDefault, reg.ok ? 'synced' : 'failed', reg.ok ? null : reg.error, reg.ok ? reg.pickupId : null]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally {
      client.release()
    }
    sendSuccess(res, { warehouses: await listWarehouses(pool), shiprocket_error: reg.ok ? null : reg.error }, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to save warehouse', err)
  }
}

/** Retry registering a saved warehouse in Shiprocket. */
export async function syncWarehouse(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('SELECT * FROM pickup_warehouses WHERE id = $1', [req.params.id])
    if (!rows.length) return sendError(res, 404, 'Warehouse not found')
    const v = validateWarehouse(rows[0])
    if (typeof v === 'string') return sendError(res, 400, v)
    const reg = await registerInShiprocket(pool, v)
    await pool.query(
      `UPDATE pickup_warehouses SET shiprocket_status = $1, shiprocket_error = $2,
              shiprocket_pickup_id = COALESCE($3, shiprocket_pickup_id), updated_at = NOW() WHERE id = $4`,
      [reg.ok ? 'synced' : 'failed', reg.ok ? null : reg.error, reg.ok ? reg.pickupId : null, rows[0].id]
    )
    sendSuccess(res, { warehouses: await listWarehouses(pool), shiprocket_error: reg.ok ? null : reg.error })
  } catch (err) {
    sendError(res, 500, 'Failed to sync warehouse', err)
  }
}

/** Make a warehouse the default. A location that only exists in Shiprocket is saved here first. */
export async function setDefaultWarehouse(pool: Pool, req: Request, res: Response) {
  const name = String(req.body?.name ?? '').trim()
  if (!name) return sendError(res, 400, 'name is required')
  const client = await pool.connect()
  try {
    const list = await listWarehouses(pool)
    const w = list.find((x) => norm(x.name) === norm(name))
    if (!w) return sendError(res, 404, `Warehouse "${name}" not found`)
    await client.query('BEGIN')
    await client.query('UPDATE pickup_warehouses SET is_default = false WHERE is_default')
    if (w.id != null) {
      await client.query('UPDATE pickup_warehouses SET is_default = true, updated_at = NOW() WHERE id = $1', [w.id])
    } else {
      await client.query(
        `INSERT INTO pickup_warehouses (name, contact_name, phone, email, address, address_2, city, state, country, pin_code,
                                        is_default, shiprocket_status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,'synced')`,
        [w.name, w.contact_name, w.phone, w.email, w.address, w.address_2, w.city, w.state, w.country, w.pin_code]
      )
    }
    await client.query('COMMIT')
    sendSuccess(res, { warehouses: await listWarehouses(pool) })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    sendError(res, 500, 'Failed to set default warehouse', err)
  } finally {
    client.release()
  }
}

/** Remove a saved warehouse from this admin. Shiprocket has no API to delete pickup addresses. */
export async function deleteWarehouse(pool: Pool, req: Request, res: Response) {
  try {
    const { rowCount } = await pool.query('DELETE FROM pickup_warehouses WHERE id = $1', [req.params.id])
    if (!rowCount) return sendError(res, 404, 'Warehouse not found')
    sendSuccess(res, { warehouses: await listWarehouses(pool) })
  } catch (err) {
    sendError(res, 500, 'Failed to delete warehouse', err)
  }
}
