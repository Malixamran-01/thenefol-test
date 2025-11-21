import React, { useEffect, useMemo, useState } from 'react'

type Role = { id: number; name: string }
type Permission = { id: number; code: string; description?: string }

export default function RolesPermissions() {
  const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`
  const [roles, setRoles] = useState<Role[]>([])
  const [perms, setPerms] = useState<Permission[]>([])
  const [matrix, setMatrix] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'users:update' }), [])

  const key = (roleId: number, permId: number) => `${roleId}:${permId}`

  const load = async () => {
    try {
      setLoading(true)
      const [rRes, pRes, rpRes] = await Promise.all([
        fetch(`${apiBase}/api/staff/roles`),
        fetch(`${apiBase}/api/staff/permissions`),
        fetch(`${apiBase}/api/staff/role-permissions`),
      ])
      const r = await rRes.json(); const p = await pRes.json(); const rp = await rpRes.json()
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
    } catch (_) { }
    finally { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const toggle = (roleId: number, permId: number) => {
    const k = key(roleId, permId)
    setMatrix(prev => ({ ...prev, [k]: !prev[k] }))
  }

  const saveRole = async (roleId: number) => {
    try {
      const permissionIds = perms.filter(p => matrix[key(roleId, p.id)]).map(p=>p.id)
      const res = await fetch(`${apiBase}/api/staff/role-permissions/set`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ roleId, permissionIds }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to save')
      alert('Saved')
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles & Permission Matrix</h1>
      {loading ? 'Loading...' : (
        <div className="overflow-x-auto metric-card">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 pr-4">Permission</th>
                {roles.map(r => (
                  <th key={r.id} className="text-left py-2 pr-4">{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perms.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="py-2 pr-4 font-medium">{p.code}</td>
                  {roles.map(r => (
                    <td key={r.id} className="py-2 pr-4">
                      <input type="checkbox" checked={!!matrix[key(r.id, p.id)]} onChange={()=>toggle(r.id, p.id)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex gap-2 flex-wrap">
            {roles.map(r => (
              <button key={r.id} onClick={()=>saveRole(r.id)} className="btn-secondary">Save {r.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


