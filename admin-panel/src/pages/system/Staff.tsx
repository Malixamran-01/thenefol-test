import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Can from '../../components/Can'
import { useToast } from '../../components/ToastProvider'
import { getApiBaseUrl } from '../../utils/apiUrl'

type StaffRow = {
  id: number
  name: string
  email: string
  phone?: string | null
  date_of_birth?: string | null
  job_title?: string | null
  password?: string | null
  invitation_accepted_at?: string | null
  is_super_admin?: boolean
  roles?: { name?: string }[]
}

type InvitationRow = {
  id: number
  email: string
  expires_at: string
  accepted_at: string | null
  invited_by_name?: string | null
}

export default function Staff() {
  const apiBase = getApiBaseUrl()
  const { notify } = useToast()
  const [users, setUsers] = useState<StaffRow[]>([])
  const [invitations, setInvitations] = useState<InvitationRow[]>([])
  const [roles, setRoles] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const authHeaders = useMemo(() => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const [uRes, rRes, iRes] = await Promise.all([
        fetch(`${apiBase}/staff/users`, { headers: authHeaders }),
        fetch(`${apiBase}/staff/roles`, { headers: authHeaders }),
        fetch(`${apiBase}/staff/invitations`, { headers: authHeaders }),
      ])
      const uData = await uRes.json()
      const rData = await rRes.json()
      const iData = await iRes.json()
      if (!uRes.ok) throw new Error(uData?.error || 'Failed to load staff')
      if (!rRes.ok) throw new Error(rData?.error || 'Failed to load roles')
      if (!iRes.ok) throw new Error(iData?.error || 'Failed to load invitations')
      setUsers(Array.isArray(uData) ? uData : uData?.data || [])
      setRoles(Array.isArray(rData) ? rData : rData?.data || [])
      const inv = Array.isArray(iData) ? iData : iData?.data || []
      setInvitations(inv)
    } catch (e: any) {
      setError(e?.message || 'Failed to load staff')
    } finally {
      setLoading(false)
    }
  }, [apiBase, authHeaders])

  useEffect(() => {
    load()
  }, [load])

  const pendingInvites = useMemo(
    () => invitations.filter((i) => !i.accepted_at && new Date(i.expires_at).getTime() > Date.now()),
    [invitations]
  )

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const body = { email: inviteEmail.trim() }
      const res = await fetch(`${apiBase}/staff/invite`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to send invitation')
      notify('success', data?.message || `Invitation sent to ${inviteEmail.trim()}`)
      setInviteEmail('')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const revokeInvite = async (id: number) => {
    if (!confirm('Revoke this invitation?')) return
    try {
      const res = await fetch(`${apiBase}/staff/invitations/${id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to revoke')
      notify('success', 'Invitation revoked')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed')
    }
  }

  const assignRole = async (staffId: number, roleId: number) => {
    try {
      const res = await fetch(`${apiBase}/staff/user-roles`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ staffId, roleId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to assign role')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed')
    }
  }

  const resetPassword = async (staffId: number) => {
    if (!newPassword) return notify('error', 'Enter new password first')
    try {
      const res = await fetch(`${apiBase}/staff/users/reset-password`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ staffId, newPassword }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to reset password')
      setNewPassword('')
      notify('success', 'Password reset')
    } catch (e: any) {
      notify('error', e?.message || 'Failed')
    }
  }

  const disableUser = async (staffId: number) => {
    if (!confirm('Disable this account?')) return
    try {
      const res = await fetch(`${apiBase}/staff/users/disable`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ staffId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to disable')
      await load()
    } catch (e: any) {
      notify('error', e?.message || 'Failed')
    }
  }

  const statusBadge = (u: StaffRow) => {
    const hasRoles = (u.roles || []).length > 0
    if (u.is_super_admin) {
      return <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-white">Super admin</span>
    }
    if (!u.password) {
      return <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900">Pending setup</span>
    }
    if (!hasRoles) {
      return <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-900">Awaiting roles</span>
    }
    if (!u.invitation_accepted_at) {
      return <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-900">Legacy</span>
    }
    return <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">Active</span>
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      <div className="admin-page-header">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-light mb-2 tracking-[0.15em]"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em',
            }}
          >
            Staff Accounts
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Send a secure onboarding link by email. New staff complete their profile and agreement, then you assign roles here.
          </p>
        </div>
      </div>

      <div className="metric-card">
        <h2 className="text-sm font-medium mb-3 uppercase tracking-wide text-gray-500">Invite staff</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <Can permission="staff:invite">
            <button type="button" onClick={handleInvite} disabled={inviting} className="btn-primary">
              {inviting ? 'Sending…' : 'Send onboarding link'}
            </button>
          </Can>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="metric-card">
          <h2 className="text-sm font-medium mb-3 uppercase tracking-wide text-gray-500">Pending invitations</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4 text-left">Email</th>
                  <th className="py-2 pr-4 text-left">Expires</th>
                  <th className="py-2 pr-4 text-left">Invited by</th>
                  <th className="py-2 pr-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((i) => (
                  <tr key={i.id} className="border-b">
                    <td className="py-2 pr-4">{i.email}</td>
                    <td className="py-2 pr-4">{new Date(i.expires_at).toLocaleString()}</td>
                    <td className="py-2 pr-4">{i.invited_by_name || '—'}</td>
                    <td className="py-2 pr-4">
                      <Can permission="staff:delete">
                        <button type="button" onClick={() => revokeInvite(i.id)} className="btn-secondary text-xs">
                          Revoke
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="metric-card">
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          <input
            className="input"
            placeholder="New password (for reset)"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <span className="text-xs text-gray-500">Enter before clicking Reset on a user</span>
        </div>
        {loading ? (
          'Loading…'
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Roles</th>
                  <th className="py-2 pr-4">Assign role</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b">
                    <td className="py-2 pr-4 font-medium">{u.name}</td>
                    <td className="py-2 pr-4">{u.email}</td>
                    <td className="py-2 pr-4">{u.phone || '—'}</td>
                    <td className="py-2 pr-4">{statusBadge(u)}</td>
                    <td className="py-2 pr-4">
                      {(u.roles || []).map((r: { name?: string }) => r.name).join(', ') || '—'}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 flex-wrap">
                        {!u.is_super_admin &&
                          roles.map((r) => (
                            <Can key={r.id} permission="staff:manage">
                              <button type="button" onClick={() => assignRole(u.id, r.id)} className="btn-secondary text-xs">
                                {r.name}
                              </button>
                            </Can>
                          ))}
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex gap-2 flex-wrap">
                        {!u.is_super_admin && (
                          <>
                            <Can permission="staff:manage">
                              <button type="button" onClick={() => resetPassword(u.id)} className="btn-secondary text-xs">
                                Reset password
                              </button>
                            </Can>
                            <Can permission="staff:delete">
                              <button
                                type="button"
                                onClick={() => disableUser(u.id)}
                                className="bg-red-600 text-white px-2 py-1 text-xs rounded"
                              >
                                Disable
                              </button>
                            </Can>
                          </>
                        )}
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
