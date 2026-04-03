import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckCircle, Clock, RefreshCw, Search, XCircle, Eye, Instagram, Film,
  Trash2, Star, Wifi, WifiOff, ChevronDown, ChevronUp, Edit2, Save, X, AlertCircle,
  Youtube, Twitter, Facebook, Globe, Link, MapPin, Filter, ExternalLink, Linkedin, Send, Ghost,
  ChevronRight, Download, FileText, FileJson, Ban, ShieldOff
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
interface AddressEntry { country?: string; state?: string; city?: string; postal_address?: string; pincode?: string }

interface CollabProfileDetails {
  id?: number
  collab_application_id?: number
  phone_country_iso?: string | null
  phone_code?: string | null
  phone_local?: string | null
  full_name?: string | null
  email?: string | null
  birth_month?: string | null
  birth_day?: string | null
  birth_year?: string | null
  birthdate?: string | null
  gender?: string | null
  marital_status?: string | null
  anniversary?: string | null
  occupation?: string | null
  education?: string | null
  education_branch?: string | null
  followers_range?: string | null
  bio?: string | null
  niche?: string[] | null
  skills?: string[] | null
  languages?: string[] | null
  address?: AddressEntry | null
  platforms_snapshot?: PlatformEntry[] | null
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
  platforms?: PlatformEntry[]
  address?: AddressEntry
  profile?: {
    phone_code?: string
    phone_country_iso?: string
    birthdate?: string
    birth_month?: string
    birth_day?: string
    birth_year?: string
    gender?: string
    marital_status?: string
    anniversary?: string
    occupation?: string
    education?: string
    education_branch?: string
    followers_range?: string
    bio?: string
    niche?: string[]
    skills?: string[]
    languages?: string[]
  }
  profile_details?: CollabProfileDetails | null
  collab_block_id?: number | null
  collab_blocked?: boolean
}

function isoToFlagEmoji(isoCode: string): string {
  const u = String(isoCode || '').toUpperCase()
  if (u.length !== 2 || !/^[A-Z]{2}$/.test(u)) return '🏳️'
  return String.fromCodePoint(...[...u].map((ch) => 127397 + ch.charCodeAt(0)))
}

/** Merge JSON profile on application row with normalized `collab_profile_details` row (admin display). */
function mergedApplicantProfile(app: CollabApplication): CollabProfileDetails & Record<string, unknown> {
  const p = (app.profile || {}) as Record<string, unknown>
  const d = (app.profile_details || {}) as Record<string, unknown>
  const out = { ...p, ...d } as CollabProfileDetails & Record<string, unknown>
  if (!out.address && app.address) out.address = app.address
  return out
}

function formatDob(m: CollabProfileDetails & Record<string, unknown>): string {
  const mo = String(m.birth_month || '').trim()
  const day = String(m.birth_day || '').trim()
  const yr = String(m.birth_year || '').trim()
  if (mo && day) {
    const mi = Number(mo)
    const monthLabel = mi >= 1 && mi <= 12 ? new Date(2000, mi - 1, 1).toLocaleString('en', { month: 'short' }) : mo
    const parts = [monthLabel, day]
    if (yr && /^\d{4}$/.test(yr)) parts.push(yr)
    return parts.join(' ')
  }
  if (m.birthdate) {
    const d = new Date(String(m.birthdate))
    return Number.isNaN(d.getTime()) ? String(m.birthdate) : d.toLocaleDateString()
  }
  return ''
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
  const [blockPublicMessage, setBlockPublicMessage] = useState('')
  const [blockInternalReason, setBlockInternalReason] = useState('')
  const [blockingUser, setBlockingUser] = useState(false)
  const [appealBlocks, setAppealBlocks] = useState<Array<Record<string, unknown>>>([])

  // Creator database filters
  const [showFilters, setShowFilters] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportMenuRef = useRef<HTMLDivElement>(null)
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

  const refreshAppealQueue = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/admin/collab-blocks?limit=100`, { headers: authHeaders })
      const data = await res.json().catch(() => ({}))
      const blocks = Array.isArray(data?.blocks) ? data.blocks : []
      setAppealBlocks(blocks.filter((b: Record<string, unknown>) => b.appeal_status === 'pending'))
    } catch {
      setAppealBlocks([])
    }
  }, [apiBase, authHeaders])

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
      await refreshAppealQueue()
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

  const blockUserFromCollab = async () => {
    if (!selected) return
    if (!confirm(`Block "${selected.name}" from Creator Collab? They cannot apply, sync content, or use program features until unblocked.`)) return
    setBlockingUser(true)
    try {
      const res = await fetch(`${apiBase}/admin/collab-applications/${selected.id}/block`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          public_message: blockPublicMessage.trim() || undefined,
          internal_reason: blockInternalReason.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data?.message || 'Failed to block user')
        return
      }
      setBlockPublicMessage('')
      setBlockInternalReason('')
      await fetchItems()
      const refresh = await fetch(`${apiBase}/admin/collab-applications/${selected.id}`, { headers: authHeaders })
      const d = await refresh.json().catch(() => selected)
      if (refresh.ok) setSelected(d)
      alert('User blocked from Creator Collab.')
    } finally {
      setBlockingUser(false)
    }
  }

  const unblockCollabUser = async () => {
    const bid = selected?.collab_block_id
    if (!selected || !bid) return
    if (!confirm('Lift this block? The user can use Creator Collab again.')) return
    const res = await fetch(`${apiBase}/admin/collab-blocks/${bid}/unblock`, { method: 'POST', headers: authHeaders })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.message || 'Failed to unblock')
      return
    }
    await fetchItems()
    await refreshAppealQueue()
    const refresh = await fetch(`${apiBase}/admin/collab-applications/${selected.id}`, { headers: authHeaders })
    const d = await refresh.json().catch(() => selected)
    if (refresh.ok) setSelected(d)
    alert('Block lifted.')
  }

  const resolveCollabAppealAdmin = async (blockId: number, action: 'approve' | 'reject') => {
    const note = window.prompt(action === 'approve' ? 'Optional internal note (shown in record):' : 'Optional note (internal):') ?? ''
    const res = await fetch(`${apiBase}/admin/collab-blocks/${blockId}/appeal-resolve`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ action, note: note.trim() || undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data?.message || 'Failed to resolve appeal')
      return
    }
    alert(data?.message || 'Done.')
    await refreshAppealQueue()
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

  // Close export dropdown when clicking outside
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  /** Download CSV from the dedicated backend endpoint (all records, full JOIN). */
  const handleExportCSV = async () => {
    setShowExportMenu(false)
    setExporting(true)
    try {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'x-user-permissions': 'orders:read,orders:update',
        'x-user-role': 'admin',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch(`${apiBase}/admin/collab-applications/export.csv`, { headers })
      if (!res.ok) { alert('Export failed — server returned an error.'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `collab-applications-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed — network error.')
    } finally {
      setExporting(false)
    }
  }

  /** Export the currently visible (filtered) items as JSON. */
  const handleExportJSON = () => {
    setShowExportMenu(false)
    const data = filtered.map((item) => {
      const mp = mergedApplicantProfile(item)
      const addr = (mp.address || item.address || {}) as Record<string, unknown>
      const platforms: Record<string, string> = {}
      ;(item.platforms || []).forEach((p) => {
        const urls: string[] = Array.isArray(p.links) && p.links.length > 0 ? p.links.filter(Boolean) : p.link ? [p.link] : []
        if (urls.length > 0) platforms[p.name] = urls.join('; ')
      })
      return {
        id: item.id,
        unique_user_id: item.unique_user_id,
        status: item.status,
        applied_date: item.created_at,
        approved_date: item.approved_at || null,
        rejected_date: item.rejected_at || null,
        joined_date: item.collab_joined_at || null,
        name: item.name,
        email: item.email,
        phone_code: mp.phone_code || item.profile?.phone_code || null,
        phone_country_iso: mp.phone_country_iso || null,
        phone: item.phone || null,
        instagram_connected: !!item.instagram_connected,
        ig_username: item.ig_username || null,
        total_views: item.total_views || 0,
        total_likes: item.total_likes || 0,
        date_of_birth: {
          month: mp.birth_month || null,
          day: mp.birth_day || null,
          year: mp.birth_year || null,
          full: mp.birthdate || null,
        },
        gender: mp.gender || null,
        marital_status: mp.marital_status || null,
        anniversary: mp.anniversary || null,
        occupation: mp.occupation || null,
        education: mp.education || null,
        education_branch: mp.education_branch || null,
        followers_range: mp.followers_range || null,
        bio: mp.bio || null,
        niche: mp.niche || [],
        skills: mp.skills || [],
        languages: mp.languages || [],
        address: addr,
        platforms,
        admin_notes: item.admin_notes || null,
        rejection_reason: item.rejection_reason || null,
      }
    })
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `collab-applications-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--arctic-blue-background)' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-light tracking-[0.12em]" style={{ fontFamily: 'var(--font-heading-family)' }}>
            Collab Requests
          </h1>
          <p className="text-sm text-gray-600 mt-1">Manage collab applications, reels, and affiliate progression.</p>
        </div>
        <div className="flex items-center gap-3">
        {/* Export dropdown */}
        <div className="relative" ref={exportMenuRef}>
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-[#4B97C9] text-[#4B97C9] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f0f8fd] disabled:opacity-60 transition-colors"
          >
            {exporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? 'Exporting…' : 'Export'}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[220px] rounded-2xl border border-gray-100 bg-white shadow-xl py-1.5 overflow-hidden">
              {/* CSV */}
              <button
                onClick={handleExportCSV}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#f0f8fd] transition-colors"
              >
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Export as CSV</p>
                  <p className="text-xs text-gray-400 mt-0.5">All records · opens in Excel</p>
                </div>
              </button>

              <div className="mx-4 my-0.5 border-t border-gray-50" />

              {/* JSON */}
              <button
                onClick={handleExportJSON}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#f0f8fd] transition-colors"
              >
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileJson className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Export as JSON</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {filtered.length} visible record{filtered.length !== 1 ? 's' : ''} · structured data
                  </p>
                </div>
              </button>

              <div className="px-4 pb-2 pt-2 border-t border-gray-50">
                <p className="text-[10px] text-gray-400">CSV exports all applicants from the database. JSON exports the current filtered view.</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={fetchItems} className="btn-secondary inline-flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        </div>
      </div>

      {appealBlocks.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/95 p-4">
          <p className="text-sm font-semibold text-amber-900 mb-3">Pending Collab appeals ({appealBlocks.length})</p>
          <div className="space-y-3">
            {appealBlocks.map((b) => (
              <div
                key={String(b.id)}
                className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg bg-white/90 border border-amber-100 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-gray-500">UID {String(b.unique_user_id ?? '')}</p>
                  {b.user_email ? <p className="text-xs text-gray-600">{String(b.user_email)}</p> : null}
                  {b.appeal_text ? (
                    <p className="mt-2 text-gray-800 whitespace-pre-wrap break-words">{String(b.appeal_text)}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => resolveCollabAppealAdmin(Number(b.id), 'approve')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    Approve (unblock)
                  </button>
                  <button
                    type="button"
                    onClick={() => resolveCollabAppealAdmin(Number(b.id), 'reject')}
                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 text-xs font-semibold hover:bg-gray-50"
                  >
                    Reject appeal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  {/* Location */}
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {item.address && (item.address.city || item.address.state || item.address.country || item.address.postal_address) ? (
                      <div className="flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400" />
                        <div>
                          {item.address.postal_address && (
                            <div className="text-gray-600 whitespace-pre-wrap break-words line-clamp-3">{item.address.postal_address}</div>
                          )}
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
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs w-fit ${
                        item.status === 'approved' ? 'bg-green-100 text-green-700'
                        : item.status === 'rejected' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'approved' ? <CheckCircle className="h-3 w-3" />
                          : item.status === 'rejected' ? <XCircle className="h-3 w-3" />
                          : <Clock className="h-3 w-3" />}
                        {item.status}
                      </span>
                      {(item.collab_block_id || item.collab_blocked) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100 w-fit">
                          <Ban className="h-3 w-3" /> Collab blocked
                        </span>
                      )}
                    </div>
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
                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>{selected.email}</span>
                  {(() => {
                    const mp = mergedApplicantProfile(selected)
                    const iso = String(mp.phone_country_iso || '').toUpperCase()
                    const code = (mp.phone_code || selected.profile?.phone_code || '').trim()
                    const local = (selected.phone || mp.phone_local || '').trim()
                    const full = [code, local].filter(Boolean).join(' ')
                    if (!full) return null
                    return (
                      <span style={{ fontSize: 13, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {iso.length === 2 && <span style={{ fontSize: 18, lineHeight: 1 }} aria-hidden>{isoToFlagEmoji(iso)}</span>}
                        <span style={{ fontWeight: 500, color: '#334155' }}>{full}</span>
                      </span>
                    )
                  })()}
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

              {/* Profile info (JSON profile + collab_profile_details) */}
              {(() => {
                const mp = mergedApplicantProfile(selected)
                const dobStr = formatDob(mp)
                const hasAny =
                  dobStr ||
                  mp.gender ||
                  mp.marital_status ||
                  mp.anniversary ||
                  mp.occupation ||
                  mp.education ||
                  mp.education_branch ||
                  mp.followers_range ||
                  (Array.isArray(mp.niche) && mp.niche.length > 0) ||
                  (Array.isArray(mp.skills) && mp.skills.length > 0) ||
                  (Array.isArray(mp.languages) && mp.languages.length > 0) ||
                  (mp.bio && String(mp.bio).trim())
                if (!hasAny) return null
                return (
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '16px 18px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applicant profile</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                      {dobStr ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date of birth</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{dobStr}</p>
                        </div>
                      ) : null}
                      {mp.gender ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{String(mp.gender)}</p>
                        </div>
                      ) : null}
                      {mp.marital_status ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marital status</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{String(mp.marital_status).replace(/_/g, ' ')}</p>
                        </div>
                      ) : null}
                      {mp.anniversary ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Anniversary</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                            {(() => {
                              const d = new Date(String(mp.anniversary))
                              return Number.isNaN(d.getTime()) ? String(mp.anniversary) : d.toLocaleDateString()
                            })()}
                          </p>
                        </div>
                      ) : null}
                      {mp.occupation ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Occupation</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{String(mp.occupation).replace(/_/g, ' ')}</p>
                        </div>
                      ) : null}
                      {mp.education ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Education</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500, textTransform: 'capitalize' }}>{String(mp.education)}</p>
                        </div>
                      ) : null}
                      {mp.education_branch ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Field / branch</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{String(mp.education_branch)}</p>
                        </div>
                      ) : null}
                      {mp.followers_range ? (
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Follower range</span>
                          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{String(mp.followers_range).replace(/_/g, ' ')}</p>
                        </div>
                      ) : null}
                    </div>
                    {(mp.niche || []).length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Niche</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {(mp.niche || []).map((n) => (
                            <span key={n} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#fce7f3', color: '#db2777', border: '1px solid #fbcfe8' }}>{n}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(mp.languages || []).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Languages</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {(mp.languages || []).map((l) => (
                            <span key={l} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{l}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {(mp.skills || []).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {(mp.skills || []).map((s) => (
                            <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {mp.bio && String(mp.bio).trim() ? (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bio</span>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{String(mp.bio)}</p>
                      </div>
                    ) : null}
                  </div>
                )
              })()}

              {/* Location + Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Location */}
                {(() => {
                  const addr = (mergedApplicantProfile(selected).address || selected.address) as AddressEntry | undefined
                  if (!addr || (!addr.city && !addr.state && !addr.country && !addr.postal_address)) return null
                  return (
                  <div style={{ backgroundColor: '#f8fafc', borderRadius: 14, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin style={{ width: 11, height: 11 }} /> Location
                    </p>
                    {addr.postal_address && (
                      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{addr.postal_address}</p>
                    )}
                    {addr.city && <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{addr.city}</p>}
                    {addr.state && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#64748b' }}>{addr.state}</p>}
                    {addr.country && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#94a3b8' }}>{addr.country}</p>}
                    {addr.pincode && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>PIN {addr.pincode}</p>}
                  </div>
                  )
                })()}
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

              {/* Creator Collab — block / unblock (does not delete the user) */}
              {modalType === 'view' && selected.unique_user_id && (
                <div style={{ borderRadius: 14, border: '1px solid #fecaca', backgroundColor: '#fff7f7', padding: '16px 18px' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Ban style={{ width: 14, height: 14 }} /> Program access
                  </p>
                  {selected.collab_blocked || selected.collab_block_id ? (
                    <div>
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d' }}>
                        This account is <strong>blocked</strong> from Creator Collab (apply, sync, platforms). The user may appeal from their dashboard.
                      </p>
                      <button
                        type="button"
                        onClick={unblockCollabUser}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: 'none',
                          backgroundColor: '#059669',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <ShieldOff style={{ width: 14, height: 14 }} /> Lift block
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#57534e' }}>
                        Block this creator from the Collab program without deleting their account. They will see your message and can submit an appeal.
                      </p>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#78716c', marginBottom: 4 }}>Message to user (shown in app)</label>
                      <textarea
                        value={blockPublicMessage}
                        onChange={(e) => setBlockPublicMessage(e.target.value)}
                        placeholder="Optional — defaults to a standard restriction message"
                        rows={2}
                        style={{ width: '100%', borderRadius: 10, border: '1px solid #e7e5e4', padding: '8px 10px', fontSize: 12, marginBottom: 10, resize: 'vertical' }}
                      />
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#78716c', marginBottom: 4 }}>Internal note (admin only)</label>
                      <textarea
                        value={blockInternalReason}
                        onChange={(e) => setBlockInternalReason(e.target.value)}
                        placeholder="Why are you blocking? (team only)"
                        rows={2}
                        style={{ width: '100%', borderRadius: 10, border: '1px solid #e7e5e4', padding: '8px 10px', fontSize: 12, marginBottom: 12, resize: 'vertical' }}
                      />
                      <button
                        type="button"
                        onClick={blockUserFromCollab}
                        disabled={blockingUser}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          borderRadius: 10,
                          border: 'none',
                          backgroundColor: blockingUser ? '#9ca3af' : '#b91c1c',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: blockingUser ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <Ban style={{ width: 14, height: 14 }} /> {blockingUser ? 'Blocking…' : 'Block from Collab'}
                      </button>
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
