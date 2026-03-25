import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Clock, RefreshCw, Search, XCircle, Eye, Instagram, Film, Trash2, Star } from 'lucide-react'
import { getApiBaseUrl } from '../utils/apiUrl'

interface CollabApplication {
  id: number
  name: string
  email: string
  phone?: string
  instagram?: string
  instagram_handles?: string[]
  followers?: string
  unique_user_id?: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  approved_at?: string
  rejected_at?: string
  admin_notes?: string
  rejection_reason?: string
  total_views?: number
  total_likes?: number
}

export default function CollabRequests() {
  const [items, setItems] = useState<CollabApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CollabApplication | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'view' | 'approve' | 'reject'>('view')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  const apiBase = getApiBaseUrl()
  const authHeaders = useMemo(() => {
    const token = localStorage.getItem('auth_token')
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'x-user-permissions': 'orders:read,orders:update',
      'x-user-role': 'admin',
    } as Record<string, string>
  }, [])

  const fetchItems = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      params.set('limit', '100')
      const res = await fetch(`${apiBase}/admin/collab-applications?${params.toString()}`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to load collab requests')
      setItems(Array.isArray(data?.applications) ? data.applications : [])
    } catch (err: any) {
      alert(err?.message || 'Failed to load collab requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [statusFilter])

  const openModal = (item: CollabApplication, type: 'view' | 'approve' | 'reject') => {
    setSelected(item)
    setModalType(type)
    setAdminNotes('')
    setRejectionReason('')
    setShowModal(true)
  }

  const approve = async () => {
    if (!selected) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${selected.id}/approve`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ adminNotes }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to approve')
    setShowModal(false)
    await fetchItems()
  }

  const reject = async () => {
    if (!selected) return
    if (!rejectionReason.trim()) return alert('Please provide rejection reason')
    const res = await fetch(`${apiBase}/admin/collab-applications/${selected.id}/reject`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ rejectionReason }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to reject')
    setShowModal(false)
    await fetchItems()
  }

  const promoteToAffiliate = async (item: CollabApplication) => {
    if (!confirm(`Promote "${item.name}" directly to Affiliate? This will bypass the view/like thresholds.`)) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}/promote-affiliate`, {
      method: 'PUT',
      headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to promote')
    alert('User promoted to Affiliate successfully!')
    await fetchItems()
  }

  const deleteItem = async (item: CollabApplication) => {
    if (!confirm(`Delete collab application from "${item.name}"? This cannot be undone.`)) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to delete')
    await fetchItems()
  }

  const filtered = items.filter((i) => {
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      i.name?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.instagram?.toLowerCase().includes(q)
    )
  })

  const counts = {
    pending: items.filter((i) => i.status === 'pending').length,
    approved: items.filter((i) => i.status === 'approved').length,
    rejected: items.filter((i) => i.status === 'rejected').length,
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--arctic-blue-background)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-[0.12em]" style={{ fontFamily: 'var(--font-heading-family)' }}>
            Collab Requests Management
          </h1>
          <p className="text-sm text-gray-600 mt-1">Approve collab applications before reel tracking starts.</p>
        </div>
        <button onClick={fetchItems} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-200"><div className="text-xs text-gray-500">Pending</div><div className="text-2xl font-semibold text-yellow-600">{counts.pending}</div></div>
        <div className="bg-white rounded-lg p-4 border border-gray-200"><div className="text-xs text-gray-500">Approved</div><div className="text-2xl font-semibold text-green-600">{counts.approved}</div></div>
        <div className="bg-white rounded-lg p-4 border border-gray-200"><div className="text-xs text-gray-500">Rejected</div><div className="text-2xl font-semibold text-red-600">{counts.rejected}</div></div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'pending', label: `Pending (${counts.pending})` },
              { key: 'approved', label: `Accepted (${counts.approved})` },
              { key: 'rejected', label: `Rejected (${counts.rejected})` },
              { key: 'all', label: `All (${items.length})` },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  statusFilter === tab.key
                    ? 'bg-cyan-50 border-cyan-300 text-gray-900'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, instagram" className="w-full pl-9 pr-3 py-2 border rounded-lg" />
          </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Applicant</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Instagram Handles</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Totals</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Applied</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No collab requests found</td></tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                    <div className="text-xs text-gray-500">{item.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {(item.instagram_handles || []).map((h) => (
                        <span key={h} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pink-50 text-pink-700 text-xs">
                          <Instagram className="h-3 w-3" /> @{h}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="inline-flex items-center gap-2 text-gray-700"><Film className="h-4 w-4" /> {item.total_views || 0} views · {item.total_likes || 0} likes</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      item.status === 'approved' ? 'bg-green-100 text-green-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'approved' ? <CheckCircle className="h-3 w-3" /> : item.status === 'rejected' ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{new Date(item.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openModal(item, 'view')} title="View details" className="text-blue-600 hover:text-blue-800"><Eye className="h-4 w-4" /></button>
                      {item.status === 'pending' && (
                        <>
                          <button onClick={() => openModal(item, 'approve')} title="Approve" className="text-green-600 hover:text-green-800"><CheckCircle className="h-4 w-4" /></button>
                          <button onClick={() => openModal(item, 'reject')} title="Reject" className="text-red-600 hover:text-red-800"><XCircle className="h-4 w-4" /></button>
                        </>
                      )}
                      <button onClick={() => promoteToAffiliate(item)} title="Promote to Affiliate" className="text-amber-500 hover:text-amber-700"><Star className="h-4 w-4" /></button>
                      <button onClick={() => deleteItem(item)} title="Delete" className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {modalType === 'view' ? 'Collab Request Details' : modalType === 'approve' ? 'Approve Collab Request' : 'Reject Collab Request'}
            </h2>
            <div className="space-y-2 text-sm mb-4">
              <div><strong>Name:</strong> {selected.name}</div>
              <div><strong>Email:</strong> {selected.email}</div>
              <div><strong>Phone:</strong> {selected.phone || '-'}</div>
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Handles:</strong> {(selected.instagram_handles || []).map((h) => `@${h}`).join(', ') || '-'}</div>
              <div><strong>Followers:</strong> {selected.followers || '-'}</div>
              {selected.unique_user_id && (
                <div className="pt-1 border-t border-gray-100">
                  <strong>Unique User ID:</strong>{' '}
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded select-all">{selected.unique_user_id}</span>
                </div>
              )}
            </div>

            {modalType === 'approve' && (
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Admin notes (optional)" className="w-full border rounded-lg p-2 mb-4" rows={3} />
            )}
            {modalType === 'reject' && (
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Rejection reason (required)" className="w-full border rounded-lg p-2 mb-4" rows={3} />
            )}

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg">Close</button>
              {modalType === 'approve' && <button onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded-lg">Approve</button>}
              {modalType === 'reject' && <button onClick={reject} className="px-4 py-2 bg-red-600 text-white rounded-lg">Reject</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

