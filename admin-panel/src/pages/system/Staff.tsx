import React, { useEffect, useMemo, useState } from 'react'
import Can from '../../components/Can'

type StaffUser = { id: number; name: string; email: string; roles: any[] }

export default function Staff() {
  const apiBase = (import.meta as any).env.VITE_API_URL || `http://192.168.1.36:2000`
  const [users, setUsers] = useState<StaffUser[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [newPassword, setNewPassword] = useState('')
  const authHeaders = useMemo(() => ({ 'Content-Type': 'application/json', 'x-user-role': 'admin', 'x-user-permissions': 'users:update' }), [])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const [uRes, rRes] = await Promise.all([
        fetch(`${apiBase}/api/staff/users`),
        fetch(`${apiBase}/api/staff/roles`),
      ])
      const uData = await uRes.json()
      const rData = await rRes.json()
      setUsers(uData?.data || uData || [])
      setRoles(rData?.data || rData || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createUser = async () => {
    if (!form.name || !form.email || !form.password) return alert('Fill all fields')
    try {
      const res = await fetch(`${apiBase}/api/staff/users`, { method: 'POST', headers: authHeaders, body: JSON.stringify(form) })
      if (!res.ok) throw new Error('Failed to create user')
      setForm({ name: '', email: '', password: '' })
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const assignRole = async (staffId: number, roleId: number) => {
    try {
      const res = await fetch(`${apiBase}/api/staff/user-roles`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ staffId, roleId }) })
      if (!res.ok) throw new Error('Failed to assign role')
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const resetPassword = async (staffId: number) => {
    if (!newPassword) return alert('Enter new password')
    try {
      const res = await fetch(`${apiBase}/api/staff/users/reset-password`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ staffId, newPassword }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password')
      setNewPassword('')
      alert('Password reset')
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  const disableUser = async (staffId: number) => {
    if (!confirm('Disable this account?')) return
    try {
      const res = await fetch(`${apiBase}/api/staff/users/disable`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ staffId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to disable')
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Accounts</h1>
      </div>
      <div className="metric-card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="input" placeholder="Name" value={form.name} onChange={e=>setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="Email" value={form.email} onChange={e=>setForm({ ...form, email: e.target.value })} />
          <input className="input" placeholder="Password" type="password" value={form.password} onChange={e=>setForm({ ...form, password: e.target.value })} />
          <Can role="admin"><button onClick={createUser} className="btn-primary">Create Staff</button></Can>
        </div>
      </div>
      <div className="metric-card">
        <div className="mb-3 flex items-center gap-2">
          <input className="input" placeholder="New password (for reset)" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
          <span className="text-xs text-gray-500">Enter before clicking Reset</span>
        </div>
        {loading ? 'Loading...' : error ? <div className="text-red-600">{error}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Roles</th>
                  <th className="py-2 pr-4">Assign Role</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{(u.roles||[]).map((r: any)=>r.name).join(', ') || '-'}</td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 flex-wrap">
                        {roles.map((r:any)=>(
                          <Can key={r.id} role="admin">
                            <button onClick={()=>assignRole(u.id, r.id)} className="btn-secondary text-xs">{r.name}</button>
                          </Can>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 flex-wrap">
                        <Can role="admin"><button onClick={()=>resetPassword(u.id)} className="btn-secondary text-xs">Reset Password</button></Can>
                        <Can role="admin"><button onClick={()=>disableUser(u.id)} className="bg-red-600 text-white px-2 py-1 text-xs rounded">Disable</button></Can>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


