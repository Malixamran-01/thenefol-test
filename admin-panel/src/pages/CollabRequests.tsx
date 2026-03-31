import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle, Clock, RefreshCw, Search, XCircle, Eye, Instagram, Film,
  Trash2, Star, Wifi, WifiOff, ChevronDown, ChevronUp, Edit2, Save, X, AlertCircle,
  Youtube, Twitter, Facebook, Globe, Link, MapPin, Filter, ExternalLink, Linkedin, Send, Ghost,
  ChevronRight
} from 'lucide-react'
import { Country, State } from 'country-state-city'
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

interface PlatformEntry { name: string; links?: string[]; link?: string }
interface AddressEntry { country?: string; state?: string; city?: string; pincode?: string }

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
  platforms?: PlatformEntry[]
  address?: AddressEntry
  profile?: {
    phone_code?: string; birthdate?: string; gender?: string; marital_status?: string
    occupation?: string; education?: string; followers_range?: string; bio?: string
    niche?: string[]; skills?: string[]; languages?: string[]
  }
}

const PLATFORM_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  instagram: { icon: <Instagram className="h-3 w-3" />, color: '#E1306C', bg: '#fff0f5' },
  youtube:   { icon: <Youtube   className="h-3 w-3" />, color: '#FF0000', bg: '#fff5f5' },
  facebook:  { icon: <Facebook  className="h-3 w-3" />, color: '#1877F2', bg: '#f0f5ff' },
  x:         { icon: <Twitter   className="h-3 w-3" />, color: '#1a1a1a', bg: '#f5f5f5' },
  linkedin:  { icon: <Linkedin  className="h-3 w-3" />, color: '#0077B5', bg: '#f0f7ff' },
  telegram:  { icon: <Send      className="h-3 w-3" />, color: '#26A5E4', bg: '#f0f9ff' },
  snapchat:  { icon: <Ghost     className="h-3 w-3" />, color: '#FF6B35', bg: '#fff8f5' },
  reddit:    { icon: <Globe     className="h-3 w-3" />, color: '#FF4500', bg: '#fff5f0' },
  vk:        { icon: <Globe     className="h-3 w-3" />, color: '#0077FF', bg: '#f0f5ff' },
  quora:     { icon: <Link      className="h-3 w-3" />, color: '#B92B27', bg: '#fff5f5' },
  other:     { icon: <Globe     className="h-3 w-3" />, color: '#6b7280', bg: '#f5f5f5' },
}

const ALL_PLATFORMS = ['instagram', 'youtube', 'facebook', 'x', 'linkedin', 'telegram', 'snapchat', 'reddit', 'vk', 'quora', 'other']

function PlatformBadge({ p }: { p: PlatformEntry }) {
  const meta = PLATFORM_META[p.name] || PLATFORM_META.other
  // Normalise to links array (support legacy {link} and new {links[]})
  const urls = Array.isArray(p.links) && p.links.length > 0 ? p.links : p.link ? [p.link] : []
  const badge = (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
      style={{ color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + '30' }}>
      {meta.icon} {p.name}
      {urls.length > 1 && <span className="ml-0.5 opacity-70">×{urls.length}</span>}
    </span>
  )
  if (urls.length === 1) {
    return <a href={urls[0]} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity inline-flex items-center gap-1">{badge} <ExternalLink className="h-2.5 w-2.5" style={{ color: meta.color }} /></a>
  }
  if (urls.length > 1) {
    // Tooltip-style: show all links stacked on hover via title
    return (
      <div className="group relative inline-block">
        <span className="cursor-pointer">{badge}</span>
        <div className="absolute z-10 hidden group-hover:block left-0 top-full mt-1 bg-white shadow-lg rounded-xl border border-gray-100 p-2 min-w-[180px]">
          {urls.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 py-1 px-2 rounded-lg text-[11px] text-gray-600 hover:bg-gray-50 truncate">
              <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" /> {url.replace(/^https?:\/\//, '')}
            </a>
          ))}
        </div>
      </div>
    )
  }
  return badge
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

  // Creator database filters
  const [showFilters, setShowFilters] = useState(false)
  const [platformFilters, setPlatformFilters] = useState<Set<string>>(new Set())
  const [filterCountryCode, setFilterCountryCode] = useState('')
  const [filterStateCode, setFilterStateCode] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [countryFilter, setCountryFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')
  const [genderFilter, setGenderFilter] = useState('')
  const [nicheFilter, setNicheFilter] = useState('')
  const [educationFilter, setEducationFilter] = useState('')
  const [occupationFilter, setOccupationFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [followersRangeFilter, setFollowersRangeFilter] = useState('')

  const allCountries = useMemo(() => Country.getAllCountries(), [])
  const filterStates = useMemo(() => filterCountryCode ? State.getStatesOfCountry(filterCountryCode) : [], [filterCountryCode])

  const NICHE_OPTIONS = ['Beauty','Fashion','Lifestyle','Travel','Food','Fitness','Gaming','Tech','Music','Comedy','Education','Business','Art','Sports','Finance']
  const LANGUAGE_OPTIONS = ['English','Hindi','Bengali','Tamil','Telugu','Marathi','Gujarati','Kannada','Malayalam','Punjabi','Urdu','Arabic','French','Spanish','German','Russian']
  const FOLLOWERS_RANGES = [['under_1k','Under 1K'],['1k_10k','1K–10K'],['10k_50k','10K–50K'],['50k_100k','50K–100K'],['100k_500k','100K–500K'],['500k_plus','500K+']]

  const hasActiveFilters = platformFilters.size > 0 || cityFilter || stateFilter || countryFilter || genderFilter || nicheFilter || educationFilter || occupationFilter || languageFilter || followersRangeFilter

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
      if (platformFilters.size > 0) params.set('platform', Array.from(platformFilters).join(','))
      if (cityFilter.trim())       params.set('city',            cityFilter.trim())
      if (stateFilter.trim())      params.set('state',           stateFilter.trim())
      if (countryFilter.trim())    params.set('country',         countryFilter.trim())
      if (genderFilter)            params.set('gender',          genderFilter)
      if (nicheFilter)             params.set('niche',           nicheFilter)
      if (educationFilter)         params.set('education',       educationFilter)
      if (occupationFilter)        params.set('occupation',      occupationFilter)
      if (languageFilter)          params.set('language',        languageFilter)
      if (followersRangeFilter)    params.set('followers_range', followersRangeFilter)
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

  useEffect(() => { fetchItems() }, [platformFilters, cityFilter, stateFilter, countryFilter, genderFilter, nicheFilter, educationFilter, occupationFilter, languageFilter, followersRangeFilter])

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
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 space-y-3">
        {/* Status tabs + search */}
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
            <button onClick={() => setShowFilters((v) => !v)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-indigo-500 inline-block" />}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, instagram..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>

        {/* Comprehensive filter panel */}
        {showFilters && (
          <div className="border-t pt-4 space-y-5">

            {/* Platforms */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_PLATFORMS.map((p) => {
                  const meta = PLATFORM_META[p] || PLATFORM_META.other
                  const active = platformFilters.has(p)
                  return (
                    <button key={p} onClick={() => setPlatformFilters((prev) => { const next = new Set(prev); active ? next.delete(p) : next.add(p); return next })}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                      style={{ borderColor: active ? meta.color : '#e5e7eb', backgroundColor: active ? meta.bg : 'white', color: active ? meta.color : '#6b7280' }}>
                      {meta.icon} {p}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Location</p>
              <div className="grid grid-cols-3 gap-2">
                <select value={filterCountryCode} onChange={(e) => {
                  const code = e.target.value
                  const name = allCountries.find((c) => c.isoCode === code)?.name || ''
                  setFilterCountryCode(code); setFilterStateCode(''); setCountryFilter(name); setStateFilter(''); setCityFilter('')
                }} className="rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">All Countries</option>
                  {allCountries.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>)}
                </select>
                <select value={filterStateCode} disabled={!filterCountryCode} onChange={(e) => {
                  const code = e.target.value
                  const name = filterStates.find((s) => s.isoCode === code)?.name || ''
                  setFilterStateCode(code); setStateFilter(name); setCityFilter('')
                }} className="rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white disabled:text-gray-400">
                  <option value="">All States</option>
                  {filterStates.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                </select>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
                  <input value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="City"
                    className="w-full pl-6 pr-2 py-1.5 border rounded-lg text-xs text-gray-700 focus:outline-none focus:border-indigo-300" />
                </div>
              </div>
            </div>

            {/* Profile filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Gender</p>
                <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any</option>
                  {['male','female','non-binary','other'].map((g) => <option key={g} value={g}>{g.charAt(0).toUpperCase()+g.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Followers</p>
                <select value={followersRangeFilter} onChange={(e) => setFollowersRangeFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any range</option>
                  {FOLLOWERS_RANGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Niche</p>
                <select value={nicheFilter} onChange={(e) => setNicheFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any</option>
                  {NICHE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Language</p>
                <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any</option>
                  {LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Education</p>
                <select value={educationFilter} onChange={(e) => setEducationFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any</option>
                  {["high school","diploma","bachelors","masters","phd","other"].map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase()+e.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Occupation</p>
                <select value={occupationFilter} onChange={(e) => setOccupationFilter(e.target.value)}
                  className="w-full rounded-lg border text-xs px-2 py-1.5 text-gray-700 focus:outline-none focus:border-indigo-300 bg-white">
                  <option value="">Any</option>
                  {["student","full_time_creator","freelancer","employee","business_owner","other"].map((o) => <option key={o} value={o}>{o.replace(/_/g,' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
                </select>
              </div>
            </div>

            {hasActiveFilters && (
              <button onClick={() => {
                setPlatformFilters(new Set()); setFilterCountryCode(''); setFilterStateCode('')
                setCityFilter(''); setStateFilter(''); setCountryFilter('')
                setGenderFilter(''); setNicheFilter(''); setEducationFilter('')
                setOccupationFilter(''); setLanguageFilter(''); setFollowersRangeFilter('')
              }} className="text-xs text-red-500 hover:text-red-700 font-semibold">
                ✕ Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Applicant</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">IG Connected</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-8 text-center text-gray-500" colSpan={6}>No collab requests found</td></tr>
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
                  {/* Location */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {item.address && (item.address.city || item.address.state || item.address.country) ? (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
                        <div>
                          {item.address.city && <div className="font-medium text-gray-700">{item.address.city}</div>}
                          {item.address.state && <div>{item.address.state}</div>}
                          {item.address.country && <div>{item.address.country}</div>}
                          {item.address.pincode && <div className="text-gray-400">{item.address.pincode}</div>}
                        </div>
                      </div>
                    ) : <span className="text-gray-300">—</span>}
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
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}
        >
          <div style={{ backgroundColor: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, boxShadow: '0 24px 60px rgba(0,0,0,0.16)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 48px)', margin: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {/* Avatar initials */}
              <div style={{ width: 48, height: 48, borderRadius: 16, background: 'linear-gradient(135deg, #4B97C9, #357aad)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{selected.name.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{selected.name}</h2>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    backgroundColor: selected.status === 'approved' ? '#dcfce7' : selected.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: selected.status === 'approved' ? '#16a34a' : selected.status === 'rejected' ? '#dc2626' : '#d97706' }}>
                    {selected.status.toUpperCase()}
                  </span>
                  {selected.unique_user_id && (
                    <span style={{ fontSize: 10, fontFamily: 'monospace', backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 6 }} title="Unique User ID">{selected.unique_user_id}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{selected.email}</span>
                  {selected.phone && <span style={{ fontSize: 13, color: '#64748b' }}>{selected.phone}</span>}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', flexShrink: 0, padding: 4 }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Row: Progress + Instagram + Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {/* Views */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Views</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{(selected.total_views || 0).toLocaleString()}</p>
                  <div style={{ marginTop: 6, height: 4, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: '#4B97C9', borderRadius: 4, width: `${Math.min(100, ((selected.total_views || 0) / AFFILIATE_VIEWS) * 100)}%` }} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>of {AFFILIATE_VIEWS.toLocaleString()}</p>
                </div>
                {/* Likes */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Likes</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{(selected.total_likes || 0).toLocaleString()}</p>
                  <div style={{ marginTop: 6, height: 4, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', backgroundColor: '#E1306C', borderRadius: 4, width: `${Math.min(100, ((selected.total_likes || 0) / AFFILIATE_LIKES) * 100)}%` }} />
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8' }}>of {AFFILIATE_LIKES.toLocaleString()}</p>
                </div>
                {/* Instagram status */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Instagram</p>
                  {selected.instagram_connected && selected.ig_username ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>@{selected.ig_username}</span>
                      </div>
                      <span style={{ fontSize: 11, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}><Wifi style={{ width: 11, height: 11 }} /> Connected</span>
                      {selected.ig_user_id && <p style={{ margin: '4px 0 0', fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>ID: {selected.ig_user_id}</p>}
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <WifiOff style={{ width: 14, height: 14, color: '#94a3b8' }} />
                      <span style={{ fontSize: 13, color: '#94a3b8' }}>Not connected</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Platforms */}
              {(selected.platforms || []).length > 0 && (
                <div>
                  <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Platforms &amp; Profile Links</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {(selected.platforms || []).map((p, i) => {
                      const meta = PLATFORM_META[p.name] || PLATFORM_META.other
                      const urls = Array.isArray(p.links) && p.links.length > 0
                        ? p.links.filter((l: string) => l.trim())
                        : p.link ? [p.link] : []
                      return (
                        <div key={i} style={{ backgroundColor: meta.bg, border: `1px solid ${meta.color}22`, borderRadius: 12, padding: '10px 12px' }}>
                          {/* Platform name row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: urls.length ? 8 : 0 }}>
                            <span style={{ color: meta.color }}>{meta.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: meta.color, textTransform: 'capitalize' }}>{p.name}</span>
                          </div>
                          {/* Links */}
                          {urls.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {urls.map((url: string, j: number) => (
                                <a key={j} href={url.startsWith('http') ? url : `https://${url}`}
                                  target="_blank" rel="noreferrer"
                                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: meta.color, wordBreak: 'break-all', textDecoration: 'none', padding: '3px 6px', backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 7 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)')}>
                                  <ExternalLink style={{ width: 10, height: 10, flexShrink: 0 }} />
                                  {url.replace(/^https?:\/\//, '')}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No link provided</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Profile info */}
              {selected.profile && Object.values(selected.profile).some((v) => v && (Array.isArray(v) ? v.length > 0 : true)) && (
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Creator Profile</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {selected.profile.birthdate && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DOB</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{new Date(selected.profile.birthdate).toLocaleDateString()}</p></div>}
                    {selected.profile.gender && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{selected.profile.gender}</p></div>}
                    {selected.profile.marital_status && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marital</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{selected.profile.marital_status}</p></div>}
                    {selected.profile.occupation && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupation</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{selected.profile.occupation.replace(/_/g,' ')}</p></div>}
                    {selected.profile.education && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Education</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{selected.profile.education}</p></div>}
                    {selected.profile.followers_range && <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Followers</span><p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{selected.profile.followers_range.replace(/_/g,' ').toUpperCase()}</p></div>}
                  </div>
                  {(selected.profile.niche || []).length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Niche</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(selected.profile.niche || []).map((n) => <span key={n} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#fce7f3', color: '#db2777', border: '1px solid #fbcfe8' }}>{n}</span>)}
                      </div>
                    </div>
                  )}
                  {(selected.profile.languages || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Languages</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(selected.profile.languages || []).map((l) => <span key={l} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{l}</span>)}
                      </div>
                    </div>
                  )}
                  {(selected.profile.skills || []).length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {(selected.profile.skills || []).map((s) => <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>{s}</span>)}
                      </div>
                    </div>
                  )}
                  {selected.profile.bio && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</span>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{selected.profile.bio}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Location + Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Location */}
                {selected.address && (selected.address.city || selected.address.state) && (
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin style={{ width: 11, height: 11 }} /> Location
                    </p>
                    {selected.address.city && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{selected.address.city}</p>}
                    {selected.address.state && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{selected.address.state}</p>}
                    {selected.address.country && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#94a3b8' }}>{selected.address.country}</p>}
                    {selected.address.pincode && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>PIN {selected.address.pincode}</p>}
                  </div>
                )}
                {/* Meta details */}
                <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Details</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {selected.followers && <div style={{ fontSize: 13, color: '#475569' }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Followers: </span>{selected.followers}</div>}
                    <div style={{ fontSize: 13, color: '#475569' }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Applied: </span>{new Date(selected.created_at).toLocaleDateString()}</div>
                    {selected.collab_joined_at && <div style={{ fontSize: 13, color: '#475569' }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Joined: </span>{new Date(selected.collab_joined_at).toLocaleDateString()}</div>}
                    {selected.token_expires_at && <div style={{ fontSize: 13, color: '#475569' }}><span style={{ color: '#94a3b8', fontSize: 11 }}>Token expires: </span>{new Date(selected.token_expires_at).toLocaleDateString()}</div>}
                    {(selected.total_views || 0) >= AFFILIATE_VIEWS && (selected.total_likes || 0) >= AFFILIATE_LIKES && (
                      <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, marginTop: 2 }}>✓ Affiliate threshold met</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reels section */}
              {selected.reels && selected.reels.length > 0 && (
                <div>
                  <button onClick={() => setReelsExpanded((v) => !v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px', width: '100%', textAlign: 'left' }}>
                    <Film style={{ width: 15, height: 15, color: '#4B97C9' }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>Reels ({selected.reels.length})</span>
                    {(selected.pending_count || 0) > 0 && (
                      <span style={{ fontSize: 11, color: '#d97706', backgroundColor: '#fef3c7', padding: '1px 8px', borderRadius: 10 }}>{selected.pending_count} syncing</span>
                    )}
                    <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>{reelsExpanded ? <ChevronUp style={{ width: 15, height: 15 }} /> : <ChevronDown style={{ width: 15, height: 15 }} />}</span>
                  </button>
                  {reelsExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {selected.reels.map((reel) => (
                        <div key={reel.id} style={{
                          border: `1px solid ${reel.insights_pending ? '#fde68a' : reel.caption_ok && reel.date_ok ? '#bbf7d0' : '#fecaca'}`,
                          backgroundColor: reel.insights_pending ? '#fffbeb' : reel.caption_ok && reel.date_ok ? '#f0fdf4' : '#fef2f2',
                          borderRadius: 12, padding: '12px 14px', fontSize: 12,
                        }}>
                          {reelEditId === reel.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <a href={reel.reel_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{reel.reel_url}</a>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#64748b' }}>Views</span>
                                  <input type="number" className="border rounded px-2 py-1 text-xs" value={reelEditValues.views_count} onChange={(e) => setReelEditValues((v) => ({ ...v, views_count: e.target.value }))} />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#64748b' }}>Likes</span>
                                  <input type="number" className="border rounded px-2 py-1 text-xs" value={reelEditValues.likes_count} onChange={(e) => setReelEditValues((v) => ({ ...v, likes_count: e.target.value }))} />
                                </label>
                              </div>
                              <div style={{ display: 'flex', gap: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                                  <input type="checkbox" checked={reelEditValues.caption_ok} onChange={(e) => setReelEditValues((v) => ({ ...v, caption_ok: e.target.checked }))} /> Caption OK (#nefol)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12 }}>
                                  <input type="checkbox" checked={reelEditValues.date_ok} onChange={(e) => setReelEditValues((v) => ({ ...v, date_ok: e.target.checked }))} /> Date OK
                                </label>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => saveReelEdit(reel.id)} disabled={savingReel} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50">
                                  <Save className="h-3 w-3" /> {savingReel ? 'Saving…' : 'Save'}
                                </button>
                                <button onClick={() => setReelEditId(null)} className="flex items-center gap-1 px-3 py-1 border rounded text-xs hover:bg-gray-50">
                                  <X className="h-3 w-3" /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                                <a href={reel.reel_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reel.reel_url}</a>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                                  {reel.insights_pending
                                    ? <span style={{ fontSize: 10, backgroundColor: '#fef3c7', color: '#d97706', padding: '2px 6px', borderRadius: 6 }}>Syncing</span>
                                    : <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, backgroundColor: reel.caption_ok && reel.date_ok ? '#dcfce7' : '#fee2e2', color: reel.caption_ok && reel.date_ok ? '#16a34a' : '#dc2626' }}>{reel.caption_ok && reel.date_ok ? 'Eligible' : 'Ineligible'}</span>
                                  }
                                  <button onClick={() => startEditReel(reel)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}><Edit2 style={{ width: 12, height: 12 }} /></button>
                                  <button onClick={() => deleteReel(reel.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', padding: 2 }}><Trash2 style={{ width: 12, height: 12 }} /></button>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 16, color: '#64748b', fontSize: 12 }}>
                                <span>👁 {(reel.views_count || 0).toLocaleString()}</span>
                                <span>❤️ {(reel.likes_count || 0).toLocaleString()}</span>
                                <span style={{ color: '#94a3b8' }}>@{reel.instagram_username}</span>
                                {reel.reel_posted_at && <span style={{ color: '#94a3b8' }}>{new Date(reel.reel_posted_at).toLocaleDateString()}</span>}
                              </div>
                              {reel.caption && <p style={{ margin: '5px 0 0', color: '#94a3b8', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: 'italic' }}>"{reel.caption}"</p>}
                              {!(reel.caption_ok && reel.date_ok) && !reel.insights_pending && (
                                <p style={{ margin: '5px 0 0', color: '#dc2626', fontSize: 11 }}>
                                  {!reel.date_ok && '• Posted before joining. '}
                                  {!reel.caption_ok && '• Missing #nefol.'}
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

              {/* Action forms */}
              {modalType === 'approve' && (
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Admin notes (optional)" className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-blue-300" rows={2} />
              )}
              {modalType === 'reject' && (
                <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Rejection reason (required)" className="w-full border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-red-300" rows={2} />
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: 'none', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>
                Close
              </button>
              {modalType === 'approve' && (
                <button onClick={approve}
                  style={{ padding: '9px 20px', borderRadius: 12, border: 'none', backgroundColor: '#16a34a', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  ✓ Approve
                </button>
              )}
              {modalType === 'reject' && (
                <button onClick={reject}
                  style={{ padding: '9px 20px', borderRadius: 12, border: 'none', backgroundColor: '#dc2626', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                  ✕ Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
