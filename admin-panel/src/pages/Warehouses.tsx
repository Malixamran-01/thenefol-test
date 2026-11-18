import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/ToastProvider'
import { getApiBaseUrl } from '../utils/apiUrl'

/**
 * Pickup warehouses. Each one is registered in Shiprocket as a pickup location (its name is
 * what gets sent to Shiprocket), and is offered when confirming an order's shipment.
 * Locations created directly in the Shiprocket panel are listed here too.
 */

export type PickupWarehouse = {
  id: number | null
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
  is_default: boolean
  source: 'saved' | 'shiprocket'
  in_shiprocket: boolean
  phone_verified: boolean | null
  shiprocket_status: 'pending' | 'synced' | 'failed' | null
  shiprocket_error: string | null
}

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const EMPTY = { name: '', contact_name: '', phone: '', email: '', address: '', address_2: '', city: '', state: '', pin_code: '', is_default: false }

export function usePickupWarehouses() {
  const apiBase = getApiBaseUrl()
  const headers = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update,shipping:read,shipping:update',
      'x-user-role': 'admin',
    } as Record<string, string>
  }, [])
  const call = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`${apiBase}/admin/warehouses${path}`, { ...init, headers })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || data?.message || `HTTP ${res.status}`)
    return data
  }, [apiBase, headers])
  return call
}

export default function Warehouses() {
  const { notify } = useToast()
  const call = usePickupWarehouses()
  const [list, setList] = useState<PickupWarehouse[] | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await call('')
      setList(data.warehouses || [])
      return true
    } catch (e: any) {
      notify('error', e.message)
      setList([])
      return false
    }
  }, [call, notify])

  useEffect(() => { void load() }, [load])

  const run = async (fn: () => Promise<any>, ok?: string) => {
    setBusy(true)
    try {
      const data = await fn()
      if (data?.warehouses) setList(data.warehouses)
      if (data?.shiprocket_error) notify('error', `Saved, but Shiprocket rejected it: ${data.shiprocket_error}`)
      else if (ok) notify('success', ok)
      return data
    } catch (e: any) {
      notify('error', e.message)
      return null
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    const data = await run(() => call('', { method: 'POST', body: JSON.stringify(form) }), `Warehouse "${form.name}" added and registered in Shiprocket`)
    if (data) { setForm({ ...EMPTY }); setShowForm(false) }
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const input = 'w-full px-3 py-2 rounded-lg border text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]'
  const inputStyle = { borderColor: 'var(--brand-border)', color: 'var(--text-primary)' }
  const label = 'block text-xs mb-1'

  return (
    <div className="p-6 space-y-6" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light mb-2 tracking-[0.15em]" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>
            Warehouses
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Pickup addresses for Shiprocket. Choose one when confirming an order; the default is preselected.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-lg border px-4 py-2 text-sm"
            style={{ borderColor: 'var(--brand-border)', color: 'var(--text-primary)' }}
            disabled={busy || list == null}
            onClick={async () => {
              setList(null)
              if (await load()) notify('success', 'Pickup locations refreshed from Shiprocket')
            }}
          >
            {list == null ? 'Fetching…' : '↻ Refresh from Shiprocket'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)} disabled={busy}>
            {showForm ? 'Close' : '+ Add warehouse'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="metric-card space-y-4">
          <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>New warehouse</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Name (sent to Shiprocket, max 36)</label>
              <input className={input} style={inputStyle} maxLength={36} value={form.name} onChange={set('name')} placeholder="e.g. Lucknow Warehouse" />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Contact person</label>
              <input className={input} style={inputStyle} value={form.contact_name} onChange={set('contact_name')} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Phone (10 digits)</label>
              <input className={input} style={inputStyle} inputMode="numeric" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Email</label>
              <input className={input} style={inputStyle} type="email" value={form.email} onChange={set('email')} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} style={{ color: 'var(--text-muted)' }}>Address line 1 (house/shop no., building, street)</label>
              <input className={input} style={inputStyle} value={form.address} onChange={set('address')} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} style={{ color: 'var(--text-muted)' }}>Address line 2 (optional)</label>
              <input className={input} style={inputStyle} value={form.address_2} onChange={set('address_2')} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>City</label>
              <input className={input} style={inputStyle} value={form.city} onChange={set('city')} />
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>State</label>
              <select className={input} style={inputStyle} value={form.state} onChange={set('state')}>
                <option value="">Select state</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={label} style={{ color: 'var(--text-muted)' }}>Pincode</label>
              <input className={input} style={inputStyle} inputMode="numeric" maxLength={6} value={form.pin_code} onChange={set('pin_code')} />
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2" style={{ color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={form.is_default} onChange={set('is_default')} />
              Make this the default pickup warehouse
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Saving also adds this address to your Shiprocket account. Shiprocket may ask you to verify the phone number
            (Shiprocket → Settings → Pickup Addresses) before couriers will collect from it.
          </p>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save warehouse'}</button>
        </div>
      )}

      <div className="metric-card">
        {list == null ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No warehouses yet. Add one, or check the Shiprocket credentials in settings.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--brand-border)' } as any}>
            {list.map((w) => (
              <div key={`${w.source}-${w.id ?? w.name}`} className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{w.name}</span>
                    {w.is_default && <span className="rounded px-2 py-0.5 text-xs bg-[var(--brand-accent-soft)]" style={{ color: 'var(--brand-accent)' }}>Default</span>}
                    {w.in_shiprocket ? (
                      <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">In Shiprocket</span>
                    ) : (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-700" title={w.shiprocket_error || undefined}>Not in Shiprocket</span>
                    )}
                    {w.in_shiprocket && w.phone_verified === false && (
                      <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Phone not verified in Shiprocket</span>
                    )}
                    {w.source === 'shiprocket' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(added in Shiprocket)</span>}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {[w.address, w.address_2, w.city, w.state, w.pin_code].filter(Boolean).join(', ')}
                  </p>
                  {(w.contact_name || w.phone) && (
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{[w.contact_name, w.phone, w.email].filter(Boolean).join(' · ')}</p>
                  )}
                  {!w.in_shiprocket && w.shiprocket_error && (
                    <p className="text-xs text-red-600">Shiprocket: {w.shiprocket_error}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {!w.is_default && w.in_shiprocket && (
                    <button className="rounded border px-3 py-1.5" style={inputStyle} disabled={busy}
                      onClick={() => run(() => call('/default', { method: 'POST', body: JSON.stringify({ name: w.name }) }), `"${w.name}" is now the default`)}>
                      Make default
                    </button>
                  )}
                  {!w.in_shiprocket && w.id != null && (
                    <button className="rounded border px-3 py-1.5" style={inputStyle} disabled={busy}
                      onClick={() => run(() => call(`/${w.id}/sync`, { method: 'POST' }), `"${w.name}" registered in Shiprocket`)}>
                      Retry Shiprocket
                    </button>
                  )}
                  {w.id != null && (
                    <button className="rounded border border-red-200 px-3 py-1.5 text-red-600" disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Remove "${w.name}" from this list?${w.in_shiprocket ? ' It stays in your Shiprocket account (Shiprocket has no API to delete it).' : ''}`)) return
                        void run(() => call(`/${w.id}`, { method: 'DELETE' }), `"${w.name}" removed`)
                      }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
