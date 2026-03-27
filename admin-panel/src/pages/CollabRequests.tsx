import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle, Clock, RefreshCw, Search, XCircle, Eye, Instagram, Film,
  Trash2, Star, Wifi, WifiOff, ChevronDown, ChevronUp, Edit2, Save, X, AlertCircle
} from 'lucide-react'
import { getApiBaseUrl } from '../utils/apiUrl'

interface Reel {
  id: number
  reel_url: string
  instagram_username: string
  views_count: number
  likes_count: number
  verified: boolean
  caption_ok: boolean
  date_ok: boolean
  insights_pending: boolean
  caption?: string
  reel_posted_at?: string
  rejection_reason?: string
}

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
  pending_count?: number
  instagram_connected?: boolean
  ig_username?: string
  ig_user_id?: string
  collab_joined_at?: string
  token_expires_at?: string
  reels?: Reel[]
}

export default function CollabRequests() {
  const [allItems, setAllItems] = useState<CollabApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CollabApplication | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'view' | 'approve' | 'reject'>('view')
  const [adminNotes, setAdminNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [reelEditId, setReelEditId] = useState<number | null>(null)
  const [reelEditValues, setReelEditValues] = useState<{ views_count: string; likes_count: string; caption_ok: boolean; date_ok: boolean }>({ views_count: '', likes_count: '', caption_ok: false, date_ok: false })
  const [reelsExpanded, setReelsExpanded] = useState(false)
  const [savingReel, setSavingReel] = useState(false)

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
      const params = new URLSearchParams({ status: 'all', limit: '500' })
      const res = await fetch(`${apiBase}/admin/collab-applications?${params}`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to load')
      setAllItems(Array.isArray(data?.applications) ? data.applications : [])
    } catch (err: any) {
      alert(err?.message || 'Failed to load collab requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchItems() }, [])

  const counts = {
    pending:  allItems.filter((i) => i.status === 'pending').length,
    approved: allItems.filter((i) => i.status === 'approved').length,
    rejected: allItems.filter((i) => i.status === 'rejected').length,
  }

  const filtered = allItems.filter((i) => {
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    const q = search.toLowerCase().trim()
    if (!q) return true
    return (
      i.name?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.instagram?.toLowerCase().includes(q) ||
      i.ig_username?.toLowerCase().includes(q)
    )
  })

  const openModal = async (item: CollabApplication, type: 'view' | 'approve' | 'reject') => {
    // Fetch full detail with reels
    try {
      const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}`, { headers: authHeaders })
      const data = await res.json().catch(() => item)
      setSelected(res.ok ? data : item)
    } catch {
      setSelected(item)
    }
    setModalType(type)
    setAdminNotes('')
    setRejectionReason('')
    setReelEditId(null)
    setReelsExpanded(true)
    setShowModal(true)
  }

  const approve = async () => {
    if (!selected) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${selected.id}/approve`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ adminNotes }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to approve')
    setShowModal(false); await fetchItems()
  }

  const reject = async () => {
    if (!selected) return
    if (!rejectionReason.trim()) return alert('Please provide a rejection reason')
    const res = await fetch(`${apiBase}/admin/collab-applications/${selected.id}/reject`, {
      method: 'PUT', headers: authHeaders, body: JSON.stringify({ rejectionReason }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to reject')
    setShowModal(false); await fetchItems()
  }

  const promoteToAffiliate = async (item: CollabApplication) => {
    if (!confirm(`Promote "${item.name}" directly to Affiliate?`)) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}/promote-affiliate`, {
      method: 'PUT', headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to promote')
    alert('User promoted to Affiliate!')
    await fetchItems()
  }

  const deleteItem = async (item: CollabApplication) => {
    if (!confirm(`Delete collab application from "${item.name}"? This cannot be undone.`)) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}`, {
      method: 'DELETE', headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to delete')
    await fetchItems()
  }

  const refreshReelStats = async (item: CollabApplication) => {
    if (!confirm(`Refresh reel stats for "${item.name}" via Instagram API?`)) return
    const res = await fetch(`${apiBase}/admin/collab-applications/${item.id}/refresh-stats`, {
      method: 'POST', headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to refresh')
    alert(data?.message || 'Stats refreshed!')
    // Refresh modal if open
    if (selected?.id === item.id) {
      const detail = await fetch(`${apiBase}/admin/collab-applications/${item.id}`, { headers: authHeaders })
      if (detail.ok) setSelected(await detail.json())
    }
    await fetchItems()
  }

  // ── Reel editing ─────────────────────────────────────────────────────────────
  const startEditReel = (reel: Reel) => {
    setReelEditId(reel.id)
    setReelEditValues({
      views_count: String(reel.views_count || 0),
      likes_count: String(reel.likes_count || 0),
      caption_ok:  !!reel.caption_ok,
      date_ok:     !!reel.date_ok,
    })
  }

  const saveReelEdit = async (reelId: number) => {
    setSavingReel(true)
    try {
      const res = await fetch(`${apiBase}/admin/collab-reels/${reelId}`, {
        method: 'PUT', headers: authHeaders,
        body: JSON.stringify({
          views_count: Number(reelEditValues.views_count),
          likes_count: Number(reelEditValues.likes_count),
          caption_ok:  reelEditValues.caption_ok,
          date_ok:     reelEditValues.date_ok,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return alert(data?.message || 'Failed to save')

      // Update local modal state
      setSelected((s) => s ? {
        ...s,
        reels: s.reels?.map((r) => r.id === reelId ? { ...r, ...data.reel } : r),
      } : s)
      setReelEditId(null)
      await fetchItems()
    } finally {
      setSavingReel(false)
    }
  }

  const deleteReel = async (reelId: number) => {
    if (!confirm('Delete this reel? This cannot be undone.')) return
    const res = await fetch(`${apiBase}/admin/collab-reels/${reelId}`, {
      method: 'DELETE', headers: authHeaders,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return alert(data?.message || 'Failed to delete reel')
    setSelected((s) => s ? { ...s, reels: s.reels?.filter((r) => r.id !== reelId) } : s)
    await fetchItems()
  }

  const AFFILIATE_VIEWS = 10_000
  const AFFILIATE_LIKES = 500

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--arctic-blue-background)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-[0.12em]" style={{ fontFamily: 'var(--font-heading-family)' }}>
            Collab Requests
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage collab applications, reels, and affiliate progression.</p>
        </div>
        <button onClick={fetchItems} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending',  value: counts.pending,  color: 'text-yellow-600' },
          { label: 'Approved', value: counts.approved, color: 'text-green-600' },
          { label: 'Rejected', value: counts.rejected, color: 'text-red-600' },
          { label: 'Total',    value: allItems.length, color: 'text-gray-700' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className={`text-2xl font-semibold ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {([
              { key: 'pending',  label: `Pending (${counts.pending})` },
              { key: 'approved', label: `Approved (${counts.approved})` },
              { key: 'rejected', label: `Rejected (${counts.rejected})` },
              { key: 'all',      label: `All (${allItems.length})` },
            ] as const).map((tab) => (
              <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  statusFilter === tab.key ? 'bg-cyan-50 border-cyan-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, instagram..." className="w-full pl-9 pr-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Applicant</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Instagram</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">IG Connected</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Applied</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={7}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={7}>No collab requests found</td></tr>
            ) : filtered.map((item) => {
              const viewsPct = Math.min(100, ((item.total_views || 0) / AFFILIATE_VIEWS) * 100)
              const likesPct = Math.min(100, ((item.total_likes || 0) / AFFILIATE_LIKES) * 100)
              const unlocked = (item.total_views || 0) >= AFFILIATE_VIEWS && (item.total_likes || 0) >= AFFILIATE_LIKES

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.email}</div>
                    <div className="text-xs text-gray-500">{item.phone || '-'}</div>
                    {item.unique_user_id && (
                      <div className="text-[10px] text-gray-400 mt-0.5 font-mono select-all bg-gray-50 px-1 rounded">{item.unique_user_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {(item.instagram_handles || []).map((h) => (
                        <span key={h} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-xs">
                          <Instagram className="h-3 w-3" /> @{h}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {item.instagram_connected && item.ig_username ? (
                      <div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">
                          <Wifi className="h-3 w-3" /> @{item.ig_username}
                        </div>
                        {item.ig_user_id && <div className="text-[10px] text-gray-400 font-mono mt-0.5">{item.ig_user_id}</div>}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <WifiOff className="h-3 w-3" /> Not connected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs min-w-[140px]">
                    <div className="space-y-1">
                      <div>
                        <div className="flex justify-between mb-0.5 text-[10px] text-gray-500">
                          <span>Views</span><span>{(item.total_views || 0).toLocaleString()}/{AFFILIATE_VIEWS.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${viewsPct}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-0.5 text-[10px] text-gray-500">
                          <span>Likes</span><span>{(item.total_likes || 0).toLocaleString()}/{AFFILIATE_LIKES.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-400 rounded-full" style={{ width: `${likesPct}%` }} />
                        </div>
                      </div>
                      {unlocked && <div className="text-[10px] text-green-600 font-semibold">✓ Affiliate threshold met</div>}
                      {(item.pending_count || 0) > 0 && (
                        <div className="text-[10px] text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {item.pending_count} reel{(item.pending_count || 0) > 1 ? 's' : ''} syncing
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      item.status === 'approved' ? 'bg-green-100 text-green-700'
                      : item.status === 'rejected' ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'approved' ? <CheckCircle className="h-3 w-3" />
                        : item.status === 'rejected' ? <XCircle className="h-3 w-3" />
                        : <Clock className="h-3 w-3" />}
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => openModal(item, 'view')} title="View" className="text-blue-600 hover:text-blue-800"><Eye className="h-4 w-4" /></button>
                      {item.status === 'pending' && <>
                        <button onClick={() => openModal(item, 'approve')} title="Approve" className="text-green-600 hover:text-green-800"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => openModal(item, 'reject')} title="Reject" className="text-red-600 hover:text-red-800"><XCircle className="h-4 w-4" /></button>
                      </>}
                      <button onClick={() => promoteToAffiliate(item)} title="Promote to Affiliate" className="text-amber-500 hover:text-amber-700"><Star className="h-4 w-4" /></button>
                      {item.instagram_connected && (
                        <button onClick={() => refreshReelStats(item)} title="Refresh reel stats" className="text-indigo-400 hover:text-indigo-600"><RefreshCw className="h-4 w-4" /></button>
                      )}
                      <button onClick={() => deleteItem(item)} title="Delete" className="text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      {showModal && selected && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full my-8">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold">
                {modalType === 'approve' ? 'Approve' : modalType === 'reject' ? 'Reject' : 'Collab Details'} — {selected.name}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Applicant info ── */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm mb-5 pb-5 border-b border-gray-100">
              <div><strong>Name:</strong> {selected.name}</div>
              <div><strong>Email:</strong> {selected.email}</div>
              <div><strong>Phone:</strong> {selected.phone || '-'}</div>
              <div><strong>Status:</strong> {selected.status}</div>
              <div><strong>Handles:</strong> {(selected.instagram_handles || []).map((h) => `@${h}`).join(', ')}</div>
              <div><strong>Followers:</strong> {selected.followers || '-'}</div>
              <div><strong>Applied:</strong> {new Date(selected.created_at).toLocaleString()}</div>
              {selected.collab_joined_at && <div><strong>Joined:</strong> {new Date(selected.collab_joined_at).toLocaleString()}</div>}
              <div>
                <strong>Instagram:</strong>{' '}
                {selected.instagram_connected && selected.ig_username
                  ? <span className="text-green-700">✓ @{selected.ig_username}</span>
                  : <span className="text-gray-400">Not connected</span>}
              </div>
              {selected.ig_user_id && <div><strong>IG User ID:</strong> <span className="font-mono text-xs">{selected.ig_user_id}</span></div>}
              {selected.token_expires_at && <div><strong>Token Expires:</strong> {new Date(selected.token_expires_at).toLocaleDateString()}</div>}
              <div>
                <strong>Progress:</strong>{' '}
                {(selected.total_views || 0).toLocaleString()} views / {(selected.total_likes || 0).toLocaleString()} likes
                {(selected.total_views || 0) >= AFFILIATE_VIEWS && (selected.total_likes || 0) >= AFFILIATE_LIKES && (
                  <span className="ml-2 text-green-600 font-semibold text-xs">✓ Threshold met</span>
                )}
              </div>
              {selected.unique_user_id && (
                <div className="col-span-2"><strong>Unique User ID:</strong> <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded select-all">{selected.unique_user_id}</span></div>
              )}
            </div>

            {/* ── Reels section ── */}
            {selected.reels && selected.reels.length > 0 && (
              <div className="mb-5">
                <button
                  onClick={() => setReelsExpanded((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3"
                >
                  <Film className="h-4 w-4" />
                  Reels ({selected.reels.length})
                  {(selected.pending_count || 0) > 0 && (
                    <span className="ml-1 text-xs text-amber-600 font-normal">({selected.pending_count} syncing)</span>
                  )}
                  {reelsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {reelsExpanded && (
                  <div className="space-y-2">
                    {selected.reels.map((reel) => (
                      <div key={reel.id} className="border rounded-xl p-3 text-xs" style={{
                        borderColor: reel.insights_pending ? '#fde68a' : reel.caption_ok && reel.date_ok ? '#bbf7d0' : '#fecaca',
                        backgroundColor: reel.insights_pending ? '#fffbeb' : reel.caption_ok && reel.date_ok ? '#f0fdf4' : '#fef2f2',
                      }}>
                        {reelEditId === reel.id ? (
                          // Edit mode
                          <div className="space-y-2">
                            <a href={reel.reel_url} target="_blank" rel="noreferrer" className="text-blue-600 underline block truncate">{reel.reel_url}</a>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex flex-col gap-1">
                                <span className="text-gray-500">Views</span>
                                <input type="number" className="border rounded px-2 py-1 text-xs"
                                  value={reelEditValues.views_count}
                                  onChange={(e) => setReelEditValues((v) => ({ ...v, views_count: e.target.value }))} />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span className="text-gray-500">Likes</span>
                                <input type="number" className="border rounded px-2 py-1 text-xs"
                                  value={reelEditValues.likes_count}
                                  onChange={(e) => setReelEditValues((v) => ({ ...v, likes_count: e.target.value }))} />
                              </label>
                            </div>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={reelEditValues.caption_ok}
                                  onChange={(e) => setReelEditValues((v) => ({ ...v, caption_ok: e.target.checked }))} />
                                <span>Caption OK (#nefol)</span>
                              </label>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="checkbox" checked={reelEditValues.date_ok}
                                  onChange={(e) => setReelEditValues((v) => ({ ...v, date_ok: e.target.checked }))} />
                                <span>Date OK</span>
                              </label>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => saveReelEdit(reel.id)} disabled={savingReel}
                                className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">
                                <Save className="h-3 w-3" /> {savingReel ? 'Saving...' : 'Save'}
                              </button>
                              <button onClick={() => setReelEditId(null)}
                                className="flex items-center gap-1 px-3 py-1 border rounded text-xs hover:bg-gray-50">
                                <X className="h-3 w-3" /> Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <a href={reel.reel_url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate flex-1">{reel.reel_url}</a>
                              <div className="flex gap-1 flex-shrink-0">
                                {reel.insights_pending
                                  ? <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px]">Syncing</span>
                                  : <span className={`px-1.5 py-0.5 rounded text-[10px] ${reel.caption_ok && reel.date_ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      {reel.caption_ok && reel.date_ok ? 'Eligible' : 'Not eligible'}
                                    </span>
                                }
                                <button onClick={() => startEditReel(reel)} title="Edit metrics" className="text-gray-400 hover:text-gray-700 p-0.5"><Edit2 className="h-3 w-3" /></button>
                                <button onClick={() => deleteReel(reel.id)} title="Delete reel" className="text-red-400 hover:text-red-600 p-0.5"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </div>
                            <div className="flex gap-4 text-gray-600">
                              <span>👁 {(reel.views_count || 0).toLocaleString()}</span>
                              <span>❤️ {(reel.likes_count || 0).toLocaleString()}</span>
                              <span>@{reel.instagram_username}</span>
                              {reel.reel_posted_at && <span>{new Date(reel.reel_posted_at).toLocaleDateString()}</span>}
                            </div>
                            {reel.caption && <p className="mt-1 text-gray-500 truncate italic">"{reel.caption}"</p>}
                            {!(reel.caption_ok && reel.date_ok) && !reel.insights_pending && (
                              <p className="mt-1 text-red-600">
                                {!reel.date_ok && '• Posted before joining collab. '}
                                {!reel.caption_ok && '• Missing #nefol in caption.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Action forms ── */}
            {modalType === 'approve' && (
              <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Admin notes (optional)" className="w-full border rounded-lg p-2 mb-4 text-sm" rows={2} />
            )}
            {modalType === 'reject' && (
              <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Rejection reason (required)" className="w-full border rounded-lg p-2 mb-4 text-sm" rows={2} />
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Close</button>
              {modalType === 'approve' && <button onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Approve</button>}
              {modalType === 'reject'  && <button onClick={reject}  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">Reject</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
