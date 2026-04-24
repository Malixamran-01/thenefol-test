import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'

type Role = { id: number; name: string }
type Permission = { id: number; code: string; description?: string | null }

type NavDivision = { id: string; label: string; description: string; permissionCode: string }
type RoleTemplate = { id: string; name: string; description: string; permissionCodes: string[] }

type Catalog = {
  navDivisions: NavDivision[]
  businessPermissionCodes: readonly string[]
  templates: RoleTemplate[]
}

export default function RolesPermissions() {
  const apiBase = getApiBaseUrl()
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [catalogErr, setCatalogErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<number | null>(null)
  const [applying, setApplying] = useState<number | null>(null)

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
    try {
      const [rRes, pRes, rpRes, cRes] = await Promise.all([
        fetch(`${apiBase}/api/staff/roles`, { headers: authHeaders }),
        fetch(`${apiBase}/api/staff/permissions`, { headers: authHeaders }),
        fetch(`${apiBase}/api/staff/role-permissions`, { headers: authHeaders }),
        fetch(`${apiBase}/api/staff/permission-catalog`, { headers: authHeaders }),
      ])
      const r = await rRes.json()
      const p = await pRes.json()
      const rp = await rpRes.json()
      if (cRes.ok) {
        const c = await cRes.json()
        setCatalog(c)
      } else {
        setCatalogErr('Could not load permission catalog (sync RBAC on server first).')
      }
      const rolesList = r?.data || r || []
      const permsList = p?.data || p || []
      setRoles(rolesList)
      setPerms(permsList)
      const map: Record<string, boolean> = {}
      const rows = rp?.data || rp || []
      for (const row of rows) {
        if (row.role_id && row.permission_id) map[key(row.role_id, row.permission_id)] = true
      }
      setMatrix(map)
    } catch (e) {
      setCatalogErr('Failed to load data')
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

  const saveRole = async (roleId: number) => {
    setSaving(roleId)
    try {
      const permissionIds = perms.filter((p) => matrix[key(roleId, p.id)]).map((p) => p.id)
      const res = await fetch(`${apiBase}/api/staff/role-permissions/set`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ roleId, permissionIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
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
      const res = await fetch(`${apiBase}/api/staff/roles/apply-template`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ roleId, templateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to apply template')
      if (data.missingCodes?.length) {
        console.warn('Missing permission codes in DB (run POST /api/staff/permissions/sync):', data.missingCodes)
      }
      await load()
      alert(`Template applied (${data.permissionCount || 0} permissions).`)
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setApplying(null)
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
      .filter((code) => c.has(code) || code.includes(':'))
      .filter((code) => !catalog?.navDivisions?.some((d) => d.permissionCode === code))
  }, [perms, catalog])

  const navCodesOrdered = useMemo(
    () => catalog?.navDivisions?.map((d) => d.permissionCode) || [],
    [catalog]
  )

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
          Sidebar areas use <code className="text-xs">nav:*</code> codes; quick templates assign both navigation and API
          permissions. Run <strong>Sync RBAC</strong> on the server if checkboxes are missing.
        </p>
      </div>

      {catalogErr && <p className="text-sm text-amber-700">{catalogErr}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          {catalog && (
            <div className="rounded-lg border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/50">
              <h2 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">Quick assign (per role)</h2>
              <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
                Applies a preset bundle. Use &quot;Save&quot; in the matrix below only if you edit manually; templates call the API
                directly.
              </p>
              <div className="flex flex-col gap-4">
                {roles.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 first:border-t-0 first:pt-0 dark:border-slate-800">
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
                ))}
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
                          Missing in DB: <code>{code}</code> — run POST <code>/api/staff/permissions/sync</code>
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
                  .filter((p) => !navCodesOrdered.includes(p.code))
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
