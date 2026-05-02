import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApiBaseUrl } from '../../utils/apiUrl'

// ── Types ──────────────────────────────────────────────────────────────────
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
type ToastMsg = { id: number; message: string; type: 'success' | 'error' | 'info' }

// ── Helpers ────────────────────────────────────────────────────────────────
function unwrapList(body: any): any[] {
  if (Array.isArray(body)) return body
  if (body?.data != null) return Array.isArray(body.data) ? body.data : [body.data]
  return []
}
const PERM_KEY = (roleId: number, permId: number) => `${roleId}:${permId}`

// ── Toast hook ─────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([])
  const counter = useRef(0)
  const toast = useCallback((message: string, type: ToastMsg['type'] = 'info') => {
    const id = ++counter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])
  return { toasts, toast }
}

// ── Sub-components ─────────────────────────────────────────────────────────
function PermSection({
  title, subtitle, sectionKey, open, onToggle, activeCount, totalCount, children,
}: {
  title: string; subtitle: string; sectionKey: string; open: boolean
  onToggle: (key: string) => void; activeCount: number; totalCount: number; children: React.ReactNode
}) {
  const full = activeCount === totalCount && totalCount > 0
  return (
    <div style={{ marginBottom: 8, border: '1px solid var(--brand-border, #e2e8f0)', borderRadius: 6, overflow: 'hidden' }}>
      <button
        onClick={() => onToggle(sectionKey)}
        style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-secondary, #f8fafc)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <svg viewBox="0 0 16 16" fill="none" width={13} height={13} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, color: 'var(--text-muted)' }}>
          <path d="M5 3l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>
        </div>
        <span style={{
          fontSize: 11, padding: '2px 9px', borderRadius: 10, fontWeight: 600, flexShrink: 0,
          background: full ? 'rgba(14,165,233,0.12)' : activeCount > 0 ? 'rgba(251,191,36,0.14)' : 'var(--brand-highlight, #f1f5f9)',
          color: full ? 'var(--brand-primary, #0ea5e9)' : activeCount > 0 ? '#92400e' : 'var(--text-muted)',
        }}>
          {activeCount} / {totalCount}
        </span>
      </button>
      {open && <div style={{ borderTop: '1px solid var(--brand-border, #e2e8f0)' }}>{children}</div>}
    </div>
  )
}

function PermRow({ code, description, checked, onChange }: {
  code: string; description?: string; checked: boolean; onChange: () => void
}) {
  const [hov, setHov] = useState(false)
  return (
    <label
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 16px', cursor: 'pointer',
        borderBottom: '1px solid var(--brand-border, #f1f5f9)',
        background: checked ? 'rgba(14,165,233,0.04)' : hov ? 'var(--brand-highlight, #fafafa)' : 'transparent',
        transition: 'background 0.1s',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1,
        border: checked ? 'none' : '1.5px solid #cbd5e1',
        background: checked ? 'var(--brand-primary, #0ea5e9)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
      }}>
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" width={10} height={10}>
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} aria-label={code} />
      <div>
        <code style={{ fontSize: 12, fontFamily: 'ui-monospace, "Cascadia Code", monospace', color: 'var(--text-secondary)', letterSpacing: '0.01em' }}>{code}</code>
        {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.5 }}>{description}</div>}
      </div>
    </label>
  )
}

function MissingPerm({ code }: { code: string }) {
  return (
    <div style={{ padding: '7px 16px', background: '#fffbeb', borderBottom: '1px solid #fde68a', fontSize: 11, color: '#92400e' }}>
      Missing in DB: <code style={{ fontFamily: 'ui-monospace, monospace' }}>{code}</code> — use <strong>Sync RBAC</strong>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function RolesPermissions() {
  const apiBase = getApiBaseUrl()
  const { toasts, toast } = useToast()

  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<Record<string, boolean>>({})
  const [dirtyRoles, setDirtyRoles] = useState<Set<number>>(new Set())
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['nav', 'catalog', 'api']))
  const [newRoleName, setNewRoleName] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [showNewRole, setShowNewRole] = useState(false)
  const initialized = useRef(false)

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } as Record<string, string>
  }, [])

  const fetchJson = useCallback(async (path: string, opts?: RequestInit) => {
    const res = await fetch(`${apiBase}${path}`, { headers: authHeaders, ...opts })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error((body as any)?.error || res.statusText || 'Request failed')
    return body
  }, [apiBase, authHeaders])

  const load = useCallback(async (keepSelected = false) => {
    setLoading(true)
    setLoadErr(null)
    try {
      const [r, p, rp] = await Promise.all([
        fetchJson('/staff/roles'),
        fetchJson('/staff/permissions'),
        fetchJson('/staff/role-permissions'),
      ])
      const rolesData = unwrapList(r) as Role[]
      const permsData = unwrapList(p) as Permission[]
      setRoles(rolesData)
      setPerms(permsData)
      const map: Record<string, boolean> = {}
      for (const row of unwrapList(rp)) {
        if (row.role_id && row.permission_id) map[PERM_KEY(row.role_id, row.permission_id)] = true
      }
      setMatrix(map)
      setDirtyRoles(new Set())
      if (!keepSelected && rolesData.length > 0) setSelectedRoleId(prev => prev ?? rolesData[0].id)
      try {
        const cat = await fetchJson('/staff/permission-catalog')
        setCatalog(cat as Catalog)
      } catch {
        setCatalog(null)
      }
    } catch (e: any) {
      setLoadErr(e?.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [fetchJson])

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; load() }
  }, [load])

  // ── Derived ────────────────────────────────────────────────────────────
  const permsByCode = useMemo(() => {
    const m: Record<string, Permission> = {}
    for (const p of perms) m[p.code] = p
    return m
  }, [perms])

  const navCodes = useMemo(() => catalog?.navDivisions?.map(d => d.permissionCode) ?? [], [catalog])
  const catalogFineCodes = useMemo(() => catalog?.navCatalogFine?.map(r => r.code) ?? [], [catalog])
  const navBlockSet = useMemo(() => new Set([...navCodes, ...catalogFineCodes]), [navCodes, catalogFineCodes])
  const apiPerms = useMemo(() => perms.filter(p => !navBlockSet.has(p.code)).sort((a, b) => a.code.localeCompare(b.code)), [perms, navBlockSet])

  const permCountForRole = useCallback((roleId: number) =>
    perms.filter(p => matrix[PERM_KEY(roleId, p.id)]).length, [perms, matrix])

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? null

  // ── Mutations ──────────────────────────────────────────────────────────
  const toggle = (roleId: number, permId: number) => {
    const k = PERM_KEY(roleId, permId)
    setMatrix(prev => ({ ...prev, [k]: !prev[k] }))
    setDirtyRoles(prev => new Set([...prev, roleId]))
  }

  const setCodesForRole = (roleId: number, codes: string[], on: boolean) => {
    setMatrix(prev => {
      const next = { ...prev }
      for (const code of codes) { const p = permsByCode[code]; if (p) next[PERM_KEY(roleId, p.id)] = on }
      return next
    })
    setDirtyRoles(prev => new Set([...prev, roleId]))
  }

  const applyTemplate = (roleId: number, template: RoleTemplate) => {
    setMatrix(prev => {
      const next = { ...prev }
      for (const p of perms) next[PERM_KEY(roleId, p.id)] = false
      for (const code of template.permissionCodes) { const p = permsByCode[code]; if (p) next[PERM_KEY(roleId, p.id)] = true }
      return next
    })
    setDirtyRoles(prev => new Set([...prev, roleId]))
    toast(`"${template.name}" loaded — review below then Save`, 'info')
  }

  const toggleBundle = (roleId: number, bundle: DivisionBundle) => {
    const allOn = bundle.permissionCodes.every(code => { const p = permsByCode[code]; return p && matrix[PERM_KEY(roleId, p.id)] })
    setCodesForRole(roleId, bundle.permissionCodes, !allOn)
    toast(allOn ? `"${bundle.label}" removed` : `"${bundle.label}" added`, 'info')
  }

  const saveRole = async (roleId: number) => {
    setSaving(true)
    try {
      const permissionIds = perms.filter(p => matrix[PERM_KEY(roleId, p.id)]).map(p => p.id)
      await fetchJson('/staff/role-permissions/set', { method: 'POST', body: JSON.stringify({ roleId, permissionIds }) })
      setDirtyRoles(prev => { const next = new Set(prev); next.delete(roleId); return next })
      toast('Permissions saved successfully', 'success')
    } catch (e: any) {
      toast(e?.message || 'Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const discardRole = () => { load(true); toast('Changes discarded', 'info') }

  const runSyncRbac = async () => {
    setSyncing(true)
    try {
      const data = await fetchJson('/staff/permissions/sync', { method: 'POST', body: JSON.stringify({}) })
      toast(`Sync complete — ${(data as any).newlyInserted ?? 0} new permissions added`, 'success')
      await load(true)
    } catch (e: any) {
      toast(e?.message || 'Sync failed', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const createRole = async () => {
    if (!newRoleName.trim()) return
    setCreatingRole(true)
    try {
      await fetchJson('/staff/roles', { method: 'POST', body: JSON.stringify({ name: newRoleName.trim() }) })
      const name = newRoleName.trim()
      setNewRoleName('')
      setShowNewRole(false)
      toast(`Role "${name}" created`, 'success')
      await load(true)
    } catch (e: any) {
      toast(e?.message || 'Failed to create role', 'error')
    } finally {
      setCreatingRole(false)
    }
  }

  const toggleSection = (key: string) => {
    setOpenSections(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  // ── Computed bundle states ─────────────────────────────────────────────
  const getBundleState = (bundle: DivisionBundle, roleId: number) => {
    const codes = bundle.permissionCodes
    const onCount = codes.filter(code => { const p = permsByCode[code]; return p && matrix[PERM_KEY(roleId, p.id)] }).length
    if (onCount === 0) return 'off' as const
    if (onCount === codes.length) return 'on' as const
    return 'partial' as const
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)', position: 'relative' }}>

      {/* ── Toast layer ──────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, maxWidth: 340,
            background: t.type === 'success' ? '#ecfdf5' : t.type === 'error' ? '#fef2f2' : '#f0f9ff',
            color: t.type === 'success' ? '#065f46' : t.type === 'error' ? '#991b1b' : '#0c4a6e',
            border: `1px solid ${t.type === 'success' ? '#a7f3d0' : t.type === 'error' ? '#fca5a5' : '#bae6fd'}`,
            animation: 'rbac-slide-in 0.22s ease',
          }}>{t.message}</div>
        ))}
      </div>

      <style>{`
        @keyframes rbac-slide-in { from { transform: translateX(16px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes rbac-spin { to { transform: rotate(360deg); } }
        .rbac-role-btn:hover { background: var(--brand-highlight, #f0f9ff) !important; }
        .rbac-tpl-btn:hover { border-color: var(--brand-primary, #0ea5e9) !important; color: var(--brand-primary, #0ea5e9) !important; }
        .rbac-sync-btn:hover { background: var(--brand-highlight, #f8fafc) !important; }
      `}</style>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading-family)', fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 300, letterSpacing: '0.12em', color: 'var(--text-primary)', marginBottom: 4 }}>
            Roles &amp; permissions
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '0.02em', maxWidth: 560, lineHeight: 1.6 }}>
            Select a role, apply a preset template or toggle individual permissions. Changes are staged locally — click <strong>Save changes</strong> to commit.
          </p>
        </div>
      </div>

      {loadErr && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 20 20" fill="currentColor" width={16} height={16} style={{ flexShrink: 0 }}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
          <span>{loadErr}</span>
          <button onClick={() => load()} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', fontSize: 12, textDecoration: 'underline' }}>Retry</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', fontSize: 14, padding: '4rem 0' }}>
          <span style={{ width: 18, height: 18, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'rbac-spin 0.7s linear infinite', flexShrink: 0 }} />
          Loading roles and permissions…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', gap: 0, border: '1px solid var(--brand-border, #e2e8f0)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-primary, #fff)', minHeight: 520 }}>

          {/* ══ Left: Role list ══════════════════════════════════════ */}
          <div style={{ borderRight: '1px solid var(--brand-border, #e2e8f0)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary, #fafafa)' }}>

            {/* Header + new role */}
            <div style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--brand-border, #e2e8f0)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
                Roles
              </div>
              <button
                onClick={() => setShowNewRole(v => !v)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: 5, border: '1px dashed var(--brand-border, #cbd5e1)', background: 'transparent', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg viewBox="0 0 16 16" fill="none" width={12} height={12}><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                New role
              </button>
              {showNewRole && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4 }}>
                  <input
                    autoFocus
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') createRole(); if (e.key === 'Escape') setShowNewRole(false) }}
                    placeholder="Role name…"
                    style={{ flex: 1, padding: '5px 8px', border: '1px solid var(--brand-border, #e2e8f0)', borderRadius: 4, fontSize: 12, outline: 'none', background: 'var(--bg-primary, #fff)', color: 'var(--text-primary)' }}
                  />
                  <button
                    onClick={createRole}
                    disabled={creatingRole || !newRoleName.trim()}
                    style={{ padding: '5px 10px', borderRadius: 4, background: 'var(--brand-primary, #0ea5e9)', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', opacity: creatingRole || !newRoleName.trim() ? 0.5 : 1 }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Role list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {roles.map(role => {
                const isActive = role.id === selectedRoleId
                const isDirty = dirtyRoles.has(role.id)
                const count = permCountForRole(role.id)
                return (
                  <button
                    key={role.id}
                    className="rbac-role-btn"
                    onClick={() => setSelectedRoleId(role.id)}
                    style={{
                      width: '100%', padding: '10px 14px', textAlign: 'left', border: 'none',
                      borderBottom: '1px solid var(--brand-border, #e8edf2)',
                      background: isActive ? 'var(--brand-highlight, #eff8ff)' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                        background: isActive ? 'var(--brand-primary, #0ea5e9)' : isDirty ? '#f59e0b' : 'transparent',
                        border: isActive || isDirty ? 'none' : '1.5px solid #d1d5db',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {role.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                      {isDirty && <span style={{ fontSize: 8, color: '#f59e0b', fontWeight: 700, letterSpacing: '0.06em' }}>•</span>}
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: isActive ? 'rgba(14,165,233,0.14)' : 'var(--brand-border, #f1f5f9)', color: isActive ? 'var(--brand-primary, #0ea5e9)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {count}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Sync RBAC button at bottom */}
            <div style={{ padding: '12px 14px', borderTop: '1px solid var(--brand-border, #e2e8f0)' }}>
              <button
                className="rbac-sync-btn"
                onClick={runSyncRbac}
                disabled={syncing}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 5, border: '1px solid var(--brand-border, #e2e8f0)', background: 'transparent', fontSize: 11, color: 'var(--text-muted)', cursor: syncing ? 'wait' : 'pointer', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: syncing ? 0.6 : 1 }}
              >
                {syncing && <span style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'rbac-spin 0.7s linear infinite' }} />}
                {syncing ? 'Syncing…' : 'Sync RBAC'}
              </button>
            </div>
          </div>

          {/* ══ Right: Role editor ═══════════════════════════════════ */}
          {selectedRole ? (
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-primary, #fff)' }}>

              {/* Editor header */}
              <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--brand-border, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em', textTransform: 'capitalize' }}>{selectedRole.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {permCountForRole(selectedRole.id)} of {perms.length} permissions active
                    {dirtyRoles.has(selectedRole.id) && <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 600 }}>· Unsaved changes</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {dirtyRoles.has(selectedRole.id) && (
                    <button
                      onClick={discardRole}
                      style={{ padding: '6px 14px', borderRadius: 5, border: '1px solid var(--brand-border, #e2e8f0)', background: 'transparent', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Discard
                    </button>
                  )}
                  <button
                    onClick={() => saveRole(selectedRole.id)}
                    disabled={saving || !dirtyRoles.has(selectedRole.id)}
                    style={{
                      padding: '6px 20px', borderRadius: 5, border: 'none', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em',
                      background: dirtyRoles.has(selectedRole.id) ? 'var(--brand-primary, #0ea5e9)' : 'var(--brand-border, #e2e8f0)',
                      color: dirtyRoles.has(selectedRole.id) ? '#fff' : 'var(--text-muted)',
                      cursor: saving || !dirtyRoles.has(selectedRole.id) ? 'default' : 'pointer',
                      transition: 'background 0.15s', opacity: saving ? 0.7 : 1,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    {saving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'rbac-spin 0.7s linear infinite' }} />}
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                {/* ── Preset templates ───────────────────────────── */}
                {catalog && catalog.templates.length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Preset templates</div>
                      <div style={{ height: 1, flex: 1, background: 'var(--brand-border, #e2e8f0)' }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.65 }}>
                      One-click role presets. Applying a template pre-fills all checkboxes below — you can still adjust individually before saving.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {catalog.templates.map(t => (
                        <button
                          key={t.id}
                          className="rbac-tpl-btn"
                          title={t.description}
                          onClick={() => applyTemplate(selectedRole.id, t)}
                          style={{ padding: '5px 14px', borderRadius: 20, border: '1px solid var(--brand-border, #e2e8f0)', background: 'var(--bg-secondary, #f8fafc)', fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', letterSpacing: '0.02em', transition: 'border-color 0.15s, color 0.15s' }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* ── Division access bundles ────────────────────── */}
                {catalog && (catalog.divisionBundles ?? []).length > 0 && (
                  <section>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Division access</div>
                      <div style={{ height: 1, flex: 1, background: 'var(--brand-border, #e2e8f0)' }} />
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.65 }}>
                      Each tile toggles a group of related permissions at once. Click to turn on or off.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
                      {(catalog.divisionBundles ?? []).map(bundle => {
                        const state = getBundleState(bundle, selectedRole.id)
                        const isOn = state === 'on'
                        const isPartial = state === 'partial'
                        return (
                          <button
                            key={bundle.id}
                            onClick={() => toggleBundle(selectedRole.id, bundle)}
                            title={bundle.description}
                            style={{
                              padding: '10px 13px', borderRadius: 7, textAlign: 'left', cursor: 'pointer',
                              border: `1.5px solid ${isOn ? 'var(--brand-primary, #0ea5e9)' : isPartial ? '#fbbf24' : 'var(--brand-border, #e2e8f0)'}`,
                              background: isOn ? 'rgba(14,165,233,0.07)' : isPartial ? 'rgba(251,191,36,0.06)' : 'transparent',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isOn ? 'var(--brand-primary, #0ea5e9)' : 'var(--text-primary)', letterSpacing: '0.01em' }}>
                                {bundle.label}
                              </span>
                              <span style={{
                                fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700, letterSpacing: '0.07em',
                                background: isOn ? 'rgba(14,165,233,0.15)' : isPartial ? 'rgba(251,191,36,0.2)' : 'var(--brand-border, #f1f5f9)',
                                color: isOn ? 'var(--brand-primary, #0ea5e9)' : isPartial ? '#92400e' : 'var(--text-muted)',
                              }}>
                                {isOn ? 'ON' : isPartial ? 'PARTIAL' : 'OFF'}
                              </span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.45 }}>{bundle.description}</div>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                )}

                {/* ── Fine-grained permissions ───────────────────── */}
                <section>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Permissions</div>
                    <div style={{ height: 1, flex: 1, background: 'var(--brand-border, #e2e8f0)' }} />
                  </div>

                  {/* Navigation */}
                  <PermSection
                    title="Navigation access"
                    subtitle="Controls which sidebar sections are visible to this role"
                    sectionKey="nav"
                    open={openSections.has('nav')}
                    onToggle={toggleSection}
                    activeCount={navCodes.filter(c => { const p = permsByCode[c]; return p && matrix[PERM_KEY(selectedRole.id, p.id)] }).length}
                    totalCount={navCodes.length}
                  >
                    {navCodes.map(code => {
                      const p = permsByCode[code]
                      const div = catalog?.navDivisions.find(d => d.permissionCode === code)
                      if (!p) return <MissingPerm key={code} code={code} />
                      return <PermRow key={p.id} code={p.code} description={div?.description} checked={!!matrix[PERM_KEY(selectedRole.id, p.id)]} onChange={() => toggle(selectedRole.id, p.id)} />
                    })}
                  </PermSection>

                  {/* Catalog fine */}
                  {catalogFineCodes.length > 0 && (
                    <PermSection
                      title="Catalog lines"
                      subtitle="Granular control over Products & catalog sidebar items — nav:catalog grants all"
                      sectionKey="catalog"
                      open={openSections.has('catalog')}
                      onToggle={toggleSection}
                      activeCount={catalogFineCodes.filter(c => { const p = permsByCode[c]; return p && matrix[PERM_KEY(selectedRole.id, p.id)] }).length}
                      totalCount={catalogFineCodes.length}
                    >
                      {catalogFineCodes.map(code => {
                        const p = permsByCode[code]
                        const label = catalog?.navCatalogFine?.find(x => x.code === code)?.label
                        if (!p) return <MissingPerm key={code} code={code} />
                        return <PermRow key={p.id} code={p.code} description={label} checked={!!matrix[PERM_KEY(selectedRole.id, p.id)]} onChange={() => toggle(selectedRole.id, p.id)} />
                      })}
                    </PermSection>
                  )}

                  {/* API permissions */}
                  <PermSection
                    title="API & resource permissions"
                    subtitle="Backend access for specific operations like orders, products, and analytics"
                    sectionKey="api"
                    open={openSections.has('api')}
                    onToggle={toggleSection}
                    activeCount={apiPerms.filter(p => matrix[PERM_KEY(selectedRole.id, p.id)]).length}
                    totalCount={apiPerms.length}
                  >
                    {apiPerms.map(p => (
                      <PermRow key={p.id} code={p.code} description={p.description ?? undefined} checked={!!matrix[PERM_KEY(selectedRole.id, p.id)]} onChange={() => toggle(selectedRole.id, p.id)} />
                    ))}
                  </PermSection>
                </section>

                {/* Bottom save bar */}
                {dirtyRoles.has(selectedRole.id) && (
                  <div style={{ position: 'sticky', bottom: 0, background: 'var(--bg-primary, #fff)', borderTop: '1px solid var(--brand-border, #e2e8f0)', padding: '12px 0', marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      onClick={() => saveRole(selectedRole.id)}
                      disabled={saving}
                      style={{ padding: '8px 24px', borderRadius: 6, border: 'none', background: 'var(--brand-primary, #0ea5e9)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      {saving && <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'rbac-spin 0.7s linear infinite' }} />}
                      {saving ? 'Saving…' : `Save ${selectedRole.name}`}
                    </button>
                    <button
                      onClick={discardRole}
                      style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--brand-border, #e2e8f0)', background: 'transparent', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                      Discard changes
                    </button>
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 500 }}>You have unsaved changes</span>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', gap: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" width={36} height={36} style={{ opacity: 0.25 }}>
                <path d="M12 2a5 5 0 100 10A5 5 0 0012 2zM4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 14 }}>Select a role to edit its permissions</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
