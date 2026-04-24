import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Role = { id: number; name: string }
type Permission = { id: number; code: string; description?: string | null }

type NavDivision = { id: string; label: string; description: string; permissionCode: string }
type NavCatalogFineRow = { code: string; label: string }
type DivisionBundle = { id: string; label: string; description: string; permissionCodes: string[] }
type RoleTemplate = { id: string; name: string; description: string; permissionCodes: string[] }

type Catalog = {
  navDivisions: NavDivision[]
  navCatalogFine?: NavCatalogFineRow[]
  divisionBundles?: DivisionBundle[]
  businessPermissionCodes: readonly string[]
  templates: RoleTemplate[]
}

function unwrapList(body: any): any[] {
  if (Array.isArray(body)) return body
  if (body?.data != null) return Array.isArray(body.data) ? body.data : [body.data]
  return []
}

export default function RolesPermissions() {
  const apiBase = getApiBaseUrl()
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogErr, setCatalogErr] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [applying, setApplying] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [bundleRoleId, setBundleRoleId] = useState<number | ''>('')
  const [bundleId, setBundleId] = useState<string>('')

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>
  }, [])

  const key = (roleId: number, permId: number) => `${roleId}:${permId}`

  const load = useCallback(async () => {
    setLoading(true)
    setCatalogErr(null)
    setLoadErr(null)
    const fetchJson = async (path: string) => {
      const res = await fetch(`${apiBase}${path}`, { headers: authHeaders })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = (body && (body as any).error) || res.statusText || 'Request failed'
        throw new Error(`${path}: ${msg}`)
      }
      return body
    }
    try {
      const r = await fetchJson('/staff/roles')
      const p = await fetchJson('/staff/permissions')
      const rp = await fetchJson('/staff/role-permissions')
      setRoles(unwrapList(r) as Role[])
      setPerms(unwrapList(p) as Permission[])
      const map: Record<string, boolean> = {}
      for (const row of unwrapList(rp)) {
        if (row.role_id && row.permission_id) map[key(row.role_id, row.permission_id)] = true
      }
      setMatrix(map)
      let cat: Catalog | null = null
      try {
        cat = (await fetchJson('/staff/permission-catalog')) as Catalog
        setCatalogErr(null)
      } catch (e: any) {
        setCatalogErr(e?.message || 'Permission catalog could not be loaded. Try Sync RBAC, then refresh.')
        cat = null
      }
      setCatalog(cat)
    } catch (e: any) {
      setLoadErr(e?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [apiBase, authHeaders])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (roleId: number, permId: number) => {
    const k = key(roleId, permId)
    setMatrix((prev) => ({ ...prev, [k]: !prev[k] }))
  }

  const setCodesForRole = (roleId: number, codes: string[], on: boolean) => {
    setMatrix((prev) => {
      const next = { ...prev }
      for (const code of codes) {
        const p = perms.find((x) => x.code === code)
        if (p) next[key(roleId, p.id)] = on
      }
      return next
    })
  }

  const applyDivisionBundleToMatrix = (roleId: number, id: string) => {
    const b = catalog?.divisionBundles?.find((x) => x.id === id)
    if (!b) return
    setCodesForRole(roleId, b.permissionCodes, true)
  }

  const clearDivisionBundleFromMatrix = (roleId: number, id: string) => {
    const b = catalog?.divisionBundles?.find((x) => x.id === id)
    if (!b) return
    if (!confirm('Remove these permission checkboxes for this role in the matrix (unsaved until you save)?')) return
    setCodesForRole(roleId, b.permissionCodes, false)
  }

  const saveRole = async (roleId: number) => {
    setSaving(roleId)
    try {
      const permissionIds = perms.filter((p) => matrix[key(roleId, p.id)]).map((p) => p.id)
      const res = await fetch(`${apiBase}/staff/role-permissions/set`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ roleId, permissionIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to save')
      alert('Saved')
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setSaving(null)
    }
  }

  const applyTemplate = async (roleId: number, templateId: string) => {
    if (!confirm(`Replace all permissions for this role with template "${templateId}"?`)) return
    setApplying(roleId)
    try {
      const res = await fetch(`${apiBase}/staff/roles/apply-template`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ roleId, templateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to apply template')
      if (data.missingCodes?.length) {
        console.warn('Missing permission codes in DB (run Sync RBAC):', data.missingCodes)
      }
      await load()
      alert(`Template applied (${(data as any).permissionCount || 0} permissions).`)
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setApplying(null)
    }
  }

  const runSyncRbac = async () => {
    if (!confirm('Create any missing permission rows in the database from the catalog?')) return
    setSyncing(true)
    try {
      const res = await fetch(`${apiBase}/staff/permissions/sync`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as any)?.error || 'Sync failed')
      alert(
        `Sync complete: ${(data as any).newlyInserted ?? 0} new rows (${(data as any).knownCodes ?? '—'} known codes).`
      )
      await load()
    } catch (e: any) {
      alert(e?.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const runSeedStandard = async () => {
    if (
      !confirm(
        'Re-seed default roles (admin, manager, staff, viewer) and their standard permission sets? This resets those roles’ checkboxes in the database.'
      )
    ) {
      return
    }
    setSeeding(true)
    try {
      const res = await fetch(`${apiBase}/staff/seed-standard`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error((data as any)?.error || 'Seed failed')
      await load()
      alert('Standard roles and permissions have been re-seeded.')
    } catch (e: any) {
      alert(e?.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }

  const permsByCode = useMemo(() => {
    const m: Record<string, Permission> = {}
    for (const p of perms) m[p.code] = p
    return m
  }, [perms])

  const businessCodes = useMemo(() => {
    const c = new Set(catalog?.businessPermissionCodes || [])
    return perms
      .map((p) => p.code)
      .filter((code) => {
        if (c.has(code)) return true
        if (code.startsWith('nav:')) return false
        return code.includes(':')
      })
  }, [perms, catalog])

  const navCodesOrdered = useMemo(
    () => catalog?.navDivisions?.map((d) => d.permissionCode) || [],
    [catalog]
  )

  const navFineOrdered = useMemo(
    () => catalog?.navCatalogFine?.map((r) => r.code) || [],
    [catalog]
  )

  const navBlockSet = useMemo(() => {
    const s = new Set<string>()
    for (const c of navCodesOrdered) s.add(c)
    for (const c of navFineOrdered) s.add(c)
    return s
  }, [navCodesOrdered, navFineOrdered])

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div>
        <h1
          className="mb-2 text-2xl font-light tracking-[0.15em] sm:text-3xl"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
        >
          Roles &amp; permissions
        </h1>
        <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Sidebar areas use <code className="text-xs">nav:*</code> codes; use <strong>Sync RBAC</strong> so the database has
          every code. Preset templates and division bundles can assign many permissions at once; the matrix is for
          fine-tuning—save your changes per role.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={syncing}
            onClick={runSyncRbac}
            className="btn-secondary"
          >
            {syncing ? 'Syncing…' : 'Sync RBAC (permissions)'}
          </button>
          <button
            type="button"
            disabled={seeding}
            onClick={runSeedStandard}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            {seeding ? 'Seeding…' : 'Re-seed standard roles'}
          </button>
        </div>
      </div>

      {loadErr && <p className="text-sm text-red-700 dark:text-red-400">{loadErr}</p>}
      {catalogErr && <p className="text-sm text-amber-700">{catalogErr}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {catalog && (
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Quick assign (per role)</h2>
              <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
                Preset templates replace the whole role in the API. Use division bundles to fill the checkboxes (merge
                on); then use Save in the matrix.
              </p>
              <div className="flex flex-col gap-4">
                {roles.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-[8rem] text-sm font-medium text-slate-700 dark:text-slate-300">{r.name}</span>
                      {catalog.templates.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          disabled={applying === r.id}
                          onClick={() => applyTemplate(r.id, t.id)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                          title={t.description}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <h3 className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Division bundle → matrix</h3>
              <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">
                <strong>Apply</strong> checks every permission in the bundle for the selected role. <strong>Clear</strong> unchecks
                those (optional). You still need to click Save for that role.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs text-slate-600 dark:text-slate-400">
                  Role
                  <select
                    className="ml-1 rounded border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                    value={bundleRoleId === '' ? '' : String(bundleRoleId)}
                    onChange={(e) => setBundleRoleId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select…</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-slate-600 dark:text-slate-400">
                  Division
                  <select
                    className="ml-1 max-w-md rounded border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {(catalog.divisionBundles || []).map((b) => (
                      <option key={b.id} value={b.id} title={b.description}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  disabled={bundleRoleId === '' || !bundleId}
                  onClick={() => bundleRoleId !== '' && applyDivisionBundleToMatrix(bundleRoleId, bundleId)}
                >
                  Apply to matrix
                </button>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600"
                  disabled={bundleRoleId === '' || !bundleId}
                  onClick={() => bundleRoleId !== '' && clearDivisionBundleFromMatrix(bundleRoleId, bundleId)}
                >
                  Clear from matrix
                </button>
              </div>
            </div>
          )}

          <div className="metric-card overflow-x-auto">
            <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Sidebar (navigation divisions)</h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                    Permission
                  </th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {navCodesOrdered.map((code) => {
                  const p = permsByCode[code]
                  if (!p) {
                    return (
                      <tr key={code} className="border-t border-dashed border-amber-200">
                        <td colSpan={1 + roles.length} className="py-1 text-xs text-amber-800">
                          Missing in DB: <code>{code}</code> — use <strong>Sync RBAC</strong> above
                        </td>
                      </tr>
                    )
                  }
                  const div = catalog?.navDivisions.find((d) => d.permissionCode === code)
                  return (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'var(--brand-border, #e2e8f0)' }}>
                      <td className="py-2 pr-4">
                        <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                          {p.code}
                        </div>
                        {div && <div className="text-xs text-slate-500">{div.description}</div>}
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={!!matrix[key(r.id, p.id)]}
                            onChange={() => toggle(r.id, p.id)}
                            aria-label={`${r.name} — ${p.code}`}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {navFineOrdered.length > 0 && (
              <>
                <h2 className="mb-1 mt-8 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Catalog (granular sidebar lines)
                </h2>
                <p className="mb-2 text-xs text-slate-500">
                  If a user has <code>nav:catalog</code> they get every line; otherwise only the checked lines under
                  Products &amp; catalog appear.
                </p>
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr>
                      <th className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                        Line
                      </th>
                      {roles.map((r) => (
                        <th key={r.id} className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                          {r.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {navFineOrdered.map((code) => {
                      const p = permsByCode[code]
                      const label = catalog?.navCatalogFine?.find((x) => x.code === code)?.label
                      if (!p) {
                        return (
                          <tr key={code} className="border-t border-dashed border-amber-200">
                            <td colSpan={1 + roles.length} className="py-1 text-xs text-amber-800">
                              Missing in DB: <code>{code}</code> — use <strong>Sync RBAC</strong>
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={p.id} className="border-t" style={{ borderColor: 'var(--brand-border, #e2e8f0)' }}>
                          <td className="py-2 pr-4">
                            <div className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                              {p.code}
                            </div>
                            {label && <div className="text-xs text-slate-500">{label}</div>}
                          </td>
                          {roles.map((r) => (
                            <td key={r.id} className="py-2 pr-4">
                              <input
                                type="checkbox"
                                checked={!!matrix[key(r.id, p.id)]}
                                onChange={() => toggle(r.id, p.id)}
                                aria-label={`${r.name} — ${p.code}`}
                              />
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </>
            )}

            <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-800 dark:text-slate-200">API &amp; resource permissions</h2>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                    Permission
                  </th>
                  {roles.map((r) => (
                    <th key={r.id} className="py-2 pr-4 text-left" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms
                  .filter((p) => !navBlockSet.has(p.code))
                  .sort((a, b) => a.code.localeCompare(b.code))
                  .map((p) => (
                    <tr key={p.id} className="border-t" style={{ borderColor: 'var(--brand-border, #e2e8f0)' }}>
                      <td className="py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {p.code}
                        {businessCodes.includes(p.code) && (
                          <span className="ml-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500 dark:bg-slate-800">API</span>
                        )}
                      </td>
                      {roles.map((r) => (
                        <td key={r.id} className="py-2 pr-4">
                          <input
                            type="checkbox"
                            checked={!!matrix[key(r.id, p.id)]}
                            onChange={() => toggle(r.id, p.id)}
                            aria-label={`${r.name} — ${p.code}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>

            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  disabled={saving === r.id}
                  onClick={() => saveRole(r.id)}
                  className="btn-secondary"
                >
                  {saving === r.id ? 'Saving…' : `Save ${r.name}`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
