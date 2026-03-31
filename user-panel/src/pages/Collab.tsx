import React, { useState, useEffect, useMemo } from 'react'
import { Country, State, City } from 'country-state-city'
import {
  ArrowLeft, Video, Lock, CheckCircle, X, Instagram, ExternalLink,
  RefreshCw, Play, Heart, AlertCircle, Loader2, Eye, TrendingUp,
  Clapperboard, Zap, ChevronRight, Star, Award, Youtube, Twitter, Facebook,
  Globe, MapPin, Plus, Linkedin, Send, Ghost, ScrollText, Trophy
} from 'lucide-react'
import { YoutubeLogo, RedditLogo } from '@phosphor-icons/react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'

export type SupportedPlatform = 'youtube' | 'reddit' | 'vk'

/** VK wordmark badge (no generic globe) */
function VkBrandIcon({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-xl font-bold tracking-tight text-[11px] text-[#0077FF] bg-[#0077FF]/10 ${className ?? ''}`}
      style={{ minWidth: 36, minHeight: 36 }}
      aria-hidden
    >
      VK
    </span>
  )
}

/** OAuth platforms only — used to filter which connect cards appear (from application `platforms`) */
const OAUTH_PLATFORM_KEYS: SupportedPlatform[] = ['youtube', 'reddit', 'vk']

const PLATFORM_SYNC_META: Record<SupportedPlatform, {
  label: string
  contentLabel: string
  subline: string
  connectHelp: string
  icon: React.ReactNode
  brandTint: string
}> = {
  youtube: {
    label: 'YouTube',
    contentLabel: 'Videos',
    subline: 'Your channel uploads',
    connectHelp: 'Connect the Google account that owns your YouTube channel. We only read your video list and stats.',
    icon: <YoutubeLogo className="h-8 w-8" weight="duotone" style={{ color: '#FF0000' }} aria-hidden />,
    brandTint: 'rgba(255,0,0,0.09)',
  },
  reddit: {
    label: 'Reddit',
    contentLabel: 'Posts',
    subline: 'Submissions on your profile',
    connectHelp: 'Upvotes count toward your likes milestone. View counts are not available from Reddit’s API.',
    icon: <RedditLogo className="h-8 w-8" weight="duotone" style={{ color: '#FF4500' }} aria-hidden />,
    brandTint: 'rgba(255,69,0,0.09)',
  },
  vk: {
    label: 'VK',
    contentLabel: 'Videos',
    subline: 'Optional — for audiences on VK',
    connectHelp: 'Connect to sync videos from your VK profile. You can skip this if you do not use VK.',
    icon: <VkBrandIcon className="!min-w-[2rem] !min-h-[2rem] !text-[12px]" />,
    brandTint: 'rgba(0,119,255,0.1)',
  },
}

const AFFILIATE_VIEWS_THRESHOLD = 10_000
const AFFILIATE_LIKES_THRESHOLD = 500

interface CollabStatus {
  id?: number
  status?: 'pending' | 'approved' | 'rejected'
  hasApplication: boolean
  totalViews: number
  totalLikes: number
  progressPercent: number
  affiliateUnlocked: boolean
  instagramHandles: string[]
  instagramConnected: boolean
  igUsername: string | null
  collabJoinedAt: string | null
}

interface SyncedReel {
  media_id: string
  shortcode: string
  reel_url: string
  thumbnail_url: string | null
  caption: string | null
  timestamp: string
  likes: number
  views: number
  caption_ok: boolean
  date_ok: boolean
  eligible: boolean
  already_submitted: boolean
}

interface SubmittedReel {
  id: number
  reel_url: string
  instagram_username: string
  platform_username?: string
  platform?: string
  views_count: number
  likes_count: number
  caption_ok: boolean
  date_ok: boolean
  reel_posted_at?: string
  insights_pending?: boolean
}

// Circular SVG progress ring
function Ring({ pct, color, size = 80, stroke = 7 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(1, pct) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
    </svg>
  )
}

export default function Collab() {
  const { isAuthenticated, user } = useAuth()
  const [showForm, setShowForm] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [status, setStatus] = useState<CollabStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittedReels, setSubmittedReels] = useState<SubmittedReel[]>([])
  const [igConnecting, setIgConnecting] = useState(false)

  const [syncedReels, setSyncedReels] = useState<SyncedReel[]>([])
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [selectedReels, setSelectedReels] = useState<Set<string>>(new Set())
  const [submittingSelected, setSubmittingSelected] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success?: string; error?: string } | null>(null)

  /** Platform keys from collab application (instagram, youtube, …) — drives which connect UIs appear */
  const [applicationPlatformKeys, setApplicationPlatformKeys] = useState<Set<string>>(new Set())

  const showInstagramSection = useMemo(() => {
    if (applicationPlatformKeys.size === 0) return true
    return applicationPlatformKeys.has('instagram')
  }, [applicationPlatformKeys])

  const visibleOauthPlatforms = useMemo((): SupportedPlatform[] => {
    if (applicationPlatformKeys.size === 0) return []
    return OAUTH_PLATFORM_KEYS.filter((k) => applicationPlatformKeys.has(k))
  }, [applicationPlatformKeys])

  type PlatformSyncState = { content: any[]; syncing: boolean; selected: Set<string>; submitting: boolean; result: { success?: string; error?: string } | null; error: string }
  const initPS = (): PlatformSyncState => ({ content: [], syncing: false, selected: new Set(), submitting: false, result: null, error: '' })
  const [platformStates, setPlatformStates] = useState<Record<SupportedPlatform, PlatformSyncState>>({ youtube: initPS(), reddit: initPS(), vk: initPS() })
  const [platformConnections, setPlatformConnections] = useState<Record<string, { platform_username: string; connected_at: string }>>({})
  const [platformNotification, setPlatformNotification] = useState<string | null>(null)
  const updPS = (platform: SupportedPlatform, u: Partial<PlatformSyncState>) =>
    setPlatformStates(prev => ({ ...prev, [platform]: { ...prev[platform], ...u } }))

  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })
  const [showTCModal, setShowTCModal] = useState(false)

  // Extended profile fields
  const [profile, setProfile] = useState({
    phone_code: '+91',
    birth_month: '', birth_day: '', birth_year: '',
    gender: '', marital_status: '', anniversary: '',
    occupation: '', education: '', education_branch: '',
    followers_range: '', bio: '',
  })
  const [niche, setNiche] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])

  // Profile chip options
  /** Branch / field options keyed by education level value (lowercase, matches select options) */
  const EDUCATION_BRANCH_OPTIONS: Record<string, string[]> = {
    'high school': ['General', 'Science', 'Commerce', 'Arts', 'Vocational', 'Other'],
    diploma: ['Engineering / Tech', 'Design', 'Business', 'Healthcare', 'Hospitality', 'Other'],
    bachelors: ['Engineering / CS / IT', 'Commerce / Business', 'Science', 'Arts / Humanities', 'Law', 'Medicine / Health', 'Design / Media', 'Other'],
    masters: ['Engineering / CS', 'MBA / Business', 'Science', 'Arts', 'Law', 'Medicine', 'Other'],
    phd: ['STEM', 'Social sciences', 'Humanities', 'Business', 'Other'],
    other: ['Specify in bio', 'Other'],
  }
  const educationBranchChoices = useMemo(() => {
    const e = profile.education
    if (!e) return [] as string[]
    return EDUCATION_BRANCH_OPTIONS[e] || []
  }, [profile.education])

  const NICHE_OPTIONS = ['Beauty','Fashion','Lifestyle','Travel','Food','Fitness','Gaming','Tech','Music','Comedy','Education','Business','Art','Sports','Finance','Other']
  const SKILL_OPTIONS = ['Video Editing','Photography','Graphic Design','Copywriting','Voice Over','Acting','Dancing','Singing','Cooking','Review Writing','Live Streaming','Podcasting']
  const LANGUAGE_OPTIONS = ['English','Hindi','Bengali','Tamil','Telugu','Marathi','Gujarati','Kannada','Malayalam','Punjabi','Urdu','Odia','Arabic','French','Spanish','German','Russian','Portuguese','Japanese','Korean','Chinese']
  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val])

  // Platform + address state
  type PlatformKey = 'instagram' | 'youtube' | 'x' | 'facebook' | 'linkedin' | 'telegram' | 'snapchat' | 'reddit' | 'vk' | 'quora' | 'other'
  const PLATFORM_CONFIG: Record<PlatformKey, { label: string; icon: React.ReactNode; placeholder: string; color: string }> = {
    instagram: { label: 'Instagram',  icon: <Instagram className="h-4 w-4" />, placeholder: 'instagram.com/yourhandle',      color: '#E1306C' },
    youtube:   { label: 'YouTube',    icon: <Youtube   className="h-4 w-4" />, placeholder: 'youtube.com/c/yourhandle',       color: '#FF0000' },
    facebook:  { label: 'Facebook',   icon: <Facebook  className="h-4 w-4" />, placeholder: 'facebook.com/yourprofile',       color: '#1877F2' },
    x:         { label: 'X (Twitter)',icon: <Twitter   className="h-4 w-4" />, placeholder: 'x.com/yourhandle',               color: '#1a1a1a' },
    linkedin:  { label: 'LinkedIn',   icon: <Linkedin  className="h-4 w-4" />, placeholder: 'linkedin.com/in/yourprofile',    color: '#0077B5' },
    telegram:  { label: 'Telegram',   icon: <Send      className="h-4 w-4" />, placeholder: 't.me/yourchannel',               color: '#26A5E4' },
    snapchat:  { label: 'Snapchat',   icon: <Ghost     className="h-4 w-4" />, placeholder: 'snapchat.com/add/yourusername',  color: '#FF6B35' },
    reddit:    { label: 'Reddit',     icon: <Globe     className="h-4 w-4" />, placeholder: 'reddit.com/u/yourhandle',        color: '#FF4500' },
    vk:        { label: 'VK',         icon: <Globe     className="h-4 w-4" />, placeholder: 'vk.com/yourprofile',             color: '#0077FF' },
    quora:     { label: 'Quora',      icon: <Globe     className="h-4 w-4" />, placeholder: 'quora.com/profile/you',          color: '#B92B27' },
    other:     { label: 'Other',      icon: <Globe     className="h-4 w-4" />, placeholder: 'Your profile link',              color: '#6b7280' },
  }
  type FormPlatformState = { checked: boolean; links: string[] }
  const [platforms, setPlatforms] = useState<Record<PlatformKey, FormPlatformState>>(
    Object.fromEntries(
      Object.keys(PLATFORM_CONFIG).map((k) => [k, { checked: k === 'instagram', links: [''] }])
    ) as Record<PlatformKey, FormPlatformState>
  )
  const [selectedCountryCode, setSelectedCountryCode] = useState('IN')
  const [selectedStateCode, setSelectedStateCode] = useState('')
  const [address, setAddress] = useState({ country: 'India', state: '', city: '', pincode: '' })

  const allCountries = useMemo(() => Country.getAllCountries(), [])
  const countryStates = useMemo(() => State.getStatesOfCountry(selectedCountryCode), [selectedCountryCode])
  const stateCities = useMemo(
    () => selectedStateCode ? City.getCitiesOfState(selectedCountryCode, selectedStateCode) : [],
    [selectedCountryCode, selectedStateCode]
  )

  const addPlatformLink = (key: PlatformKey) =>
    setPlatforms((p) => ({ ...p, [key]: { ...p[key], links: [...p[key].links, ''] } }))

  const removePlatformLink = (key: PlatformKey, idx: number) =>
    setPlatforms((p) => ({ ...p, [key]: { ...p[key], links: p[key].links.length > 1 ? p[key].links.filter((_, i) => i !== idx) : [''] } }))

  const setPlatformLink = (key: PlatformKey, idx: number, val: string) =>
    setPlatforms((p) => ({ ...p, [key]: { ...p[key], links: p[key].links.map((l, i) => i === idx ? val : l) } }))

  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('ig_connected=1')) window.location.hash = '/user/collab'
    if (hash.includes('ig_error=')) {
      const match = hash.match(/ig_error=([^&]+)/)
      if (match) { setSyncError(`Instagram connection failed: ${decodeURIComponent(match[1])}`); window.location.hash = '/user/collab' }
    }
    if (hash.includes('platform_connected=')) {
      const match = hash.match(/platform_connected=([^&]+)/)
      if (match) {
        const p = decodeURIComponent(match[1])
        const label = p.charAt(0).toUpperCase() + p.slice(1)
        setPlatformNotification(`${label} connected successfully!`)
        setTimeout(() => setPlatformNotification(null), 5000)
        window.location.hash = '/user/collab'
        // fetchStatus will be called in its own effect after hash change triggers re-check
      }
    }
    if (hash.includes('platform_error=')) {
      const match = hash.match(/platform_error=([^&]+)/)
      if (match) {
        const parts = decodeURIComponent(match[1]).split(':')
        const platform = parts[0] as SupportedPlatform
        const msg = parts.slice(1).join(':')
        if (['youtube','reddit','vk'].includes(platform)) updPS(platform, { error: `Connection failed: ${msg}` })
        window.location.hash = '/user/collab'
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const token = () => localStorage.getItem('token') || ''
  const authHeaders = () => ({ 'Content-Type': 'application/json', ...(token() ? { Authorization: `Bearer ${token()}` } : {}) })

  const fetchStatus = async () => {
    if (!isAuthenticated) { setLoading(false); return }
    try {
      const queryEmail = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''
      const res = await fetch(`${getApiBase()}/api/collab/status${queryEmail}`, { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        const handles = Array.isArray(data.instagram_handles)
          ? data.instagram_handles
          : (data.instagram || '').split(',').map((h: string) => h.trim()).filter(Boolean)
        setStatus({
          id: data.id, status: data.status, hasApplication: !!data.id,
          totalViews: data.total_views ?? 0, totalLikes: data.total_likes ?? 0,
          progressPercent: data.progress ?? 0, affiliateUnlocked: !!data.affiliate_unlocked,
          instagramHandles: handles, instagramConnected: !!data.instagram_connected,
          igUsername: data.ig_username || null, collabJoinedAt: data.collab_joined_at || null,
        })
        setSubmittedReels(Array.isArray(data.reels) ? data.reels : [])
        const plat = Array.isArray(data.platforms) ? data.platforms : []
        setApplicationPlatformKeys(
          new Set(plat.map((p: { name?: string }) => String(p.name || '').toLowerCase()).filter(Boolean))
        )
        if (Array.isArray(data.platform_connections)) {
          const conns: Record<string, any> = {}
          data.platform_connections.forEach((c: any) => { conns[c.platform] = c })
          setPlatformConnections(conns)
        }
        if (data.id) { setSubmitted(true); setShowForm(false) }
      }
    } catch (e) { console.error('Collab status fetch failed:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStatus() }, [isAuthenticated, user?.email])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.phone)
      return alert('Please fill in your Name, Email, and Phone.')
    // Open T&C modal for review before final submit
    setShowTCModal(true)
  }

  const doSubmit = async () => {
    setShowTCModal(false)
    // Collect instagram handles from instagram platform links
    const igLinks = platforms['instagram'].checked
      ? platforms['instagram'].links.map((l) => l.trim()).filter(Boolean)
      : []
    const handles = igLinks.map((l) => {
      const m = l.match(/instagram\.com\/([^/?#]+)/)
      return m ? m[1] : l.replace(/^@/, '').trim()
    }).filter(Boolean)

    const selectedPlatforms = (Object.entries(platforms) as [PlatformKey, FormPlatformState][])
      .filter(([, v]) => v.checked)
      .map(([name, v]) => ({ name, links: v.links.map((l) => l.trim()).filter(Boolean) }))

    const res = await fetch(`${getApiBase()}/api/collab/apply`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        ...formData, agreeTerms: true,
        phone_code: profile.phone_code,
        instagram: handles[0] || '', instagram_handles: handles,
        platforms: selectedPlatforms, address,
        profile: {
          ...profile,
          birthdate:
            profile.birth_year && profile.birth_month && profile.birth_day
              ? `${profile.birth_year}-${String(profile.birth_month).padStart(2, '0')}-${String(profile.birth_day).padStart(2, '0')}`
              : '',
          niche,
          skills,
          languages,
        },
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setSubmitted(true); setShowForm(false)
      const ap = data?.application?.platforms
      if (Array.isArray(ap)) {
        setApplicationPlatformKeys(new Set(ap.map((p: { name?: string }) => String(p.name || '').toLowerCase()).filter(Boolean)))
      }
      setStatus((s) => s
        ? { ...s, id: data?.application?.id || s.id, hasApplication: true, status: 'pending', instagramHandles: handles }
        : { id: data?.application?.id, status: 'pending', hasApplication: true, totalViews: 0, totalLikes: 0,
            progressPercent: 0, affiliateUnlocked: false, instagramHandles: handles,
            instagramConnected: false, igUsername: null, collabJoinedAt: new Date().toISOString() })
    } else { alert(data?.message || 'Failed to submit. Please try again.') }
  }

  const handleConnectInstagram = () => {
    if (!status?.id) return alert('Submit your collab application first.')
    setIgConnecting(true)
    window.location.href = `${getApiBase()}/api/instagram/connect?collab_id=${status.id}`
  }

  const handleDisconnectInstagram = async () => {
    if (!status?.id || !confirm('Disconnect Instagram from this collab?')) return
    await fetch(`${getApiBase()}/api/instagram/disconnect`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id }) })
    setStatus((s) => s ? { ...s, instagramConnected: false, igUsername: null } : s)
    setSyncedReels([]); setSelectedReels(new Set())
  }

  const syncPlatform = async (platform: SupportedPlatform) => {
    if (!status?.id) return
    updPS(platform, { syncing: true, error: '', content: [], selected: new Set() })
    try {
      const res = await fetch(`${getApiBase()}/api/platform/${platform}/content?collab_id=${status.id}`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { updPS(platform, { error: data?.message || 'Failed to fetch content.' }); return }
      const content: any[] = data.content || []
      const autoSelect = new Set<string>(content.filter((c) => c.eligible && !c.already_submitted).map((c) => c.content_id))
      updPS(platform, { content, selected: autoSelect })
      if (!content.length) updPS(platform, { error: `No ${platform === 'reddit' ? 'posts' : 'videos'} found on your ${data.platform || platform} account.` })
    } catch { updPS(platform, { error: 'Could not fetch content. Please try again.' }) }
    finally { updPS(platform, { syncing: false }) }
  }

  const togglePlatformSelect = (platform: SupportedPlatform, contentId: string) => {
    setPlatformStates(prev => {
      const s = new Set(prev[platform].selected)
      s.has(contentId) ? s.delete(contentId) : s.add(contentId)
      return { ...prev, [platform]: { ...prev[platform], selected: s } }
    })
  }

  const submitPlatformContent = async (platform: SupportedPlatform) => {
    if (!status?.id || !platformStates[platform].selected.size) return
    updPS(platform, { submitting: true, result: null })
    const { content, selected } = platformStates[platform]
    const toSubmit = content.filter((c) => selected.has(c.content_id)).map((c) => ({
      reel_url: c.content_url,
      instagram_handle: c.platform_username,
      prefetched: { views: c.views, likes: c.likes, postedAt: c.published_at, caption: c.description || c.title, caption_ok: c.caption_ok, date_ok: c.date_ok },
    }))
    try {
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ collab_id: status.id, platform, reel_urls: toSubmit }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const label = platform === 'reddit' ? 'post' : 'video'
        updPS(platform, { result: { success: `${toSubmit.length} ${label}${toSubmit.length > 1 ? 's' : ''} submitted!` }, content: [], selected: new Set() })
        setStatus((s) => s ? { ...s, totalViews: data.total_views ?? s.totalViews, totalLikes: data.total_likes ?? s.totalLikes, progressPercent: data.progress ?? s.progressPercent, affiliateUnlocked: !!data.affiliate_unlocked } : s)
        await fetchStatus()
      } else { updPS(platform, { result: { error: data?.message || 'Submission failed.' } }) }
    } catch { updPS(platform, { result: { error: 'Request failed. Please try again.' } }) }
    finally { updPS(platform, { submitting: false }) }
  }

  const handleDisconnectPlatform = async (platform: SupportedPlatform) => {
    if (!status?.id || !confirm(`Disconnect ${PLATFORM_SYNC_META[platform].label} from this collab?`)) return
    await fetch(`${getApiBase()}/api/platform/disconnect/${platform}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id }) })
    setPlatformConnections((prev) => { const n = { ...prev }; delete n[platform]; return n })
    updPS(platform, { content: [], selected: new Set() })
  }

  const syncReels = async () => {
    if (!status?.id) return
    setSyncing(true); setSyncError(''); setSyncedReels([]); setSelectedReels(new Set()); setSubmitResult(null)
    try {
      const res = await fetch(`${getApiBase()}/api/instagram/reels?collab_id=${status.id}`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSyncError(data?.message || 'Failed to sync reels.'); return }
      const reels: SyncedReel[] = data.reels || []
      setSyncedReels(reels)
      const autoSelect = new Set<string>()
      reels.forEach((r) => { if (r.eligible && !r.already_submitted) autoSelect.add(r.media_id) })
      setSelectedReels(autoSelect)
      if (reels.length === 0) setSyncError('No reels found on your Instagram account.')
    } catch { setSyncError('Could not reach Instagram. Please try again.') }
    finally { setSyncing(false) }
  }

  const toggleSelect = (mediaId: string) => {
    setSelectedReels((prev) => { const n = new Set(prev); n.has(mediaId) ? n.delete(mediaId) : n.add(mediaId); return n })
  }

  const submitSelected = async () => {
    if (!status?.id || selectedReels.size === 0) return
    setSubmittingSelected(true); setSubmitResult(null)
    const toSubmit = syncedReels.filter((r) => selectedReels.has(r.media_id)).map((r) => ({
      reel_url: r.reel_url,
      instagram_handle: status.igUsername || status.instagramHandles[0] || '',
      prefetched: { views: r.views, likes: r.likes, postedAt: r.timestamp, caption: r.caption, caption_ok: r.caption_ok, date_ok: r.date_ok },
    }))
    try {
      const res = await fetch(`${getApiBase()}/api/collab/submit-reel`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ collab_id: status.id, reel_urls: toSubmit }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setSubmitResult({ success: `${selectedReels.size} reel${selectedReels.size > 1 ? 's' : ''} submitted!` })
        setStatus((s) => s ? { ...s, totalViews: data.total_views ?? s.totalViews, totalLikes: data.total_likes ?? s.totalLikes, progressPercent: data.progress ?? s.progressPercent, affiliateUnlocked: !!data.affiliate_unlocked } : s)
        await fetchStatus(); setSyncedReels([]); setSelectedReels(new Set())
      } else { setSubmitResult({ error: data?.message || 'Submission failed.' }) }
    } catch { setSubmitResult({ error: 'Request failed. Please try again.' }) }
    finally { setSubmittingSelected(false) }
  }

  const isApproved = status?.status === 'approved'
  const totalViews = status?.totalViews ?? 0
  const totalLikes = status?.totalLikes ?? 0
  const affiliateUnlocked = status?.affiliateUnlocked ?? false
  const viewsPct = Math.min(1, totalViews / AFFILIATE_VIEWS_THRESHOLD)
  const likesPct = Math.min(1, totalLikes / AFFILIATE_LIKES_THRESHOLD)
  const eligibleCount = syncedReels.filter((r) => r.eligible && !r.already_submitted).length
  const ineligibleCount = syncedReels.filter((r) => !r.eligible).length

  // ── Not authenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--arctic-blue-background, #F4F9F9)' }}>
        <div className="text-center max-w-md">
          <Clapperboard className="h-10 w-10 mx-auto mb-6" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
          <h1 className="text-3xl font-light mb-3 tracking-[0.12em]" style={{ fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}>Creator Collab</h1>
          <p className="text-sm font-light tracking-wide mb-8" style={{ color: '#888', letterSpacing: '0.04em' }}>Sign in to join our creator program and track your affiliate progress.</p>
          <a href="#/user/login" onClick={() => sessionStorage.setItem('post_login_redirect', '#/user/collab')}
            className="inline-flex items-center gap-2 rounded-xl px-7 py-3 text-sm font-light tracking-widest uppercase transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--arctic-blue-primary, #4B97C9)', color: '#fff', letterSpacing: '0.1em' }}>
            Sign in <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--arctic-blue-background, #F4F9F9)', fontFamily: 'var(--font-body-family)' }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b" style={{ borderColor: '#eee' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <a href="#/user/" className="inline-flex items-center gap-1.5 text-xs font-light tracking-widest uppercase mb-10 transition-colors hover:opacity-60"
            style={{ color: '#aaa', letterSpacing: '0.1em' }}>
            <ArrowLeft className="h-3 w-3" /> Back
          </a>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border"
                style={{ borderColor: '#e8f4fb', backgroundColor: '#f0f8fd' }}>
                <Clapperboard className="h-5 w-5" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.25em] uppercase font-medium mb-1" style={{ color: '#bbb' }}>Nefol</p>
                <h1 className="text-2xl sm:text-3xl font-light tracking-[0.12em]"
                  style={{ fontFamily: 'var(--font-heading-family)', color: '#1a1a1a', letterSpacing: '0.12em' }}>
                  Creator Collab Program
                </h1>
                <p className="text-xs font-light tracking-wide mt-1.5" style={{ color: '#999', letterSpacing: '0.04em' }}>
                  Post reels featuring NEFOL · Reach 10K views &amp; 500 likes · Unlock Affiliate
                </p>
              </div>
            </div>

            {/* Status pill */}
            {submitted && status && (
              <div className="flex-shrink-0">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium tracking-wide ${
                  affiliateUnlocked ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : status.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : status.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-gray-50 text-gray-500 border border-gray-200'
                }`}>
                  {affiliateUnlocked ? <><Award className="h-3.5 w-3.5" /> Affiliate Unlocked</>
                    : status.status === 'approved' ? <><CheckCircle className="h-3.5 w-3.5" /> Approved</>
                    : status.status === 'rejected' ? <><X className="h-3.5 w-3.5" /> Not Approved</>
                    : <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Pending Review</>}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:py-10">

          {/* ── Application form (not yet applied) ─────────────────────────── */}
          {showForm && (
            <div className="max-w-xl mx-auto">
              {/* Requirements */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { icon: <Clapperboard className="h-4 w-4" />, label: 'Post after joining', color: '#4B97C9' },
                  { icon: <Zap className="h-4 w-4" />, label: 'Include #nefol', color: '#E1306C' },
                  { icon: <TrendingUp className="h-4 w-4" />, label: '10K views + 500 likes', color: '#10b981' },
                ].map((r) => (
                  <div key={r.label} className="bg-white rounded-2xl p-4 text-center border border-gray-100 shadow-sm">
                    <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: r.color + '15', color: r.color }}>
                      {r.icon}
                    </div>
                    <p className="text-xs text-gray-600 leading-tight font-medium">{r.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-3xl p-7 sm:p-9 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-heading-family)' }}>Apply to join</h2>
                <p className="text-sm text-gray-500 mb-7">Fill in your details and we'll review your application within 2-3 days.</p>

                <form onSubmit={handleSubmit} className="space-y-7">

                  {/* ── Section helper ──────────────────────────────────── */}
                  {/* SECTION: Basic Info */}
                  <div className="space-y-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400">Basic Info <span className="text-red-400 ml-1">required</span></p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Full Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Your full name" required
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="you@email.com" required
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</label>
                        <div className="flex gap-2">
                          <select value={profile.phone_code} onChange={(e) => setProfile((p) => ({ ...p, phone_code: e.target.value }))}
                            className="min-w-[6.75rem] max-w-[40%] sm:max-w-[180px] flex-shrink-0 rounded-xl border border-gray-200 py-3 pl-3 pr-8 text-base text-gray-800 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none leading-none"
                            title={allCountries.find((c) => `+${c.phonecode}` === profile.phone_code)?.name || 'Country code'}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}>
                            {allCountries.map((c) => (
                              <option key={c.isoCode} value={`+${c.phonecode}`} title={c.name}>
                                {c.flag} +{c.phonecode}
                              </option>
                            ))}
                          </select>
                          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="Phone number" required
                            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* Platforms */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Platforms you're active on</label>
                    <div className="space-y-2">
                      {(Object.entries(PLATFORM_CONFIG) as [PlatformKey, typeof PLATFORM_CONFIG[PlatformKey]][]).map(([key, cfg]) => {
                        const isChecked = platforms[key].checked
                        return (
                          <div key={key} className={`rounded-xl border transition-all ${isChecked ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-white'}`}>
                            {/* Platform header row */}
                            <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer">
                              <input type="checkbox" checked={isChecked}
                                onChange={(e) => setPlatforms((p) => ({ ...p, [key]: { ...p[key], checked: e.target.checked } }))}
                                className="h-4 w-4 rounded accent-[#4B97C9] flex-shrink-0" />
                              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: isChecked ? cfg.color : '#c0c0c0' }}>
                                {cfg.icon} {cfg.label}
                              </span>
                              {isChecked && platforms[key].links.length > 0 && (
                                <span className="ml-auto text-[10px] text-gray-400 font-medium">
                                  {platforms[key].links.filter((l) => l.trim()).length} link{platforms[key].links.filter((l) => l.trim()).length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </label>
                            {/* Link inputs — shown when checked */}
                            {isChecked && (
                              <div className="px-3 pb-3 space-y-2">
                                {platforms[key].links.map((link, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      placeholder={idx === 0 ? cfg.placeholder : `Another ${cfg.label} profile link`}
                                      value={link}
                                      onChange={(e) => setPlatformLink(key, idx, e.target.value)}
                                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:outline-none focus:border-[#4B97C9] transition-all"
                                    />
                                    <button type="button" onClick={() => removePlatformLink(key, idx)}
                                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => addPlatformLink(key)}
                                  className="flex items-center gap-1.5 text-[11px] font-medium text-[#4B97C9] hover:opacity-70 transition-opacity pt-0.5">
                                  <Plus className="h-3 w-3" /> Add another {cfg.label} profile
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* ── SECTION: Personal Details ────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400">Personal Details <span className="ml-1 font-normal normal-case text-gray-300">optional</span></p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Date of birth <span className="font-normal text-gray-400">(year optional)</span></label>
                        <div className="grid grid-cols-3 gap-2">
                          <select value={profile.birth_month} onChange={(e) => setProfile((p) => ({ ...p, birth_month: e.target.value }))}
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                            <option value="">Month</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={String(m)}>{new Date(2000, m - 1).toLocaleString('en', { month: 'short' })}</option>
                            ))}
                          </select>
                          <select value={profile.birth_day} onChange={(e) => setProfile((p) => ({ ...p, birth_day: e.target.value }))}
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                            <option value="">Day</option>
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                              <option key={d} value={String(d)}>{d}</option>
                            ))}
                          </select>
                          <select value={profile.birth_year} onChange={(e) => setProfile((p) => ({ ...p, birth_year: e.target.value }))}
                            className="rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                            <option value="">Year (optional)</option>
                            {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 15 - i).map((y) => (
                              <option key={y} value={String(y)}>{y}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Gender</label>
                        <select value={profile.gender} onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                          <option value="">Prefer not to say</option>
                          {['Male','Female','Non-binary','Other'].map((g) => <option key={g} value={g.toLowerCase()}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marital Status</label>
                        <select value={profile.marital_status} onChange={(e) => setProfile((p) => ({ ...p, marital_status: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                          <option value="">Select</option>
                          {['Single','Married','Divorced','Widowed','Other'].map((s) => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                        </select>
                      </div>
                      {profile.marital_status === 'married' && (
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Anniversary <span className="font-normal text-gray-400">(optional)</span></label>
                          <input type="date" value={profile.anniversary} onChange={(e) => setProfile((p) => ({ ...p, anniversary: e.target.value }))}
                            className="w-full max-w-sm rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all" />
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Education</label>
                        <select value={profile.education} onChange={(e) => setProfile((p) => ({ ...p, education: e.target.value, education_branch: '' }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                          <option value="">Select</option>
                          {['High School','Diploma','Bachelor\'s','Master\'s','PhD','Other'].map((e) => <option key={e} value={e.toLowerCase().replace(/'/g, '')}>{e}</option>)}
                        </select>
                      </div>
                      {educationBranchChoices.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Field / branch</label>
                          <select value={profile.education_branch} onChange={(e) => setProfile((p) => ({ ...p, education_branch: e.target.value }))}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                            <option value="">Select (optional)</option>
                            {educationBranchChoices.map((b) => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Occupation</label>
                        <select value={profile.occupation} onChange={(e) => setProfile((p) => ({ ...p, occupation: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                          <option value="">Select</option>
                          {['Student','Full-time Creator','Freelancer','Employee','Business Owner','Other'].map((o) => <option key={o} value={o.toLowerCase().replace(/-/g, '_')}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Follower Range</label>
                        <select value={profile.followers_range} onChange={(e) => setProfile((p) => ({ ...p, followers_range: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                          <option value="">Select total followers</option>
                          {[['under_1k','Under 1K'],['1k_10k','1K – 10K'],['10k_50k','10K – 50K'],['50k_100k','50K – 100K'],['100k_500k','100K – 500K'],['500k_plus','500K+']].map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Languages</label>
                      <div className="flex flex-wrap gap-2">
                        {LANGUAGE_OPTIONS.map((l) => (
                          <button key={l} type="button" onClick={() => toggleChip(languages, setLanguages, l)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${languages.includes(l) ? 'bg-[#4B97C9] text-white border-[#4B97C9]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── SECTION: Creator Profile ─────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400">Creator Profile <span className="ml-1 font-normal normal-case text-gray-300">optional</span></p>
                    {/* Niche */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Niche</label>
                      <div className="flex flex-wrap gap-2">
                        {NICHE_OPTIONS.map((n) => (
                          <button key={n} type="button" onClick={() => toggleChip(niche, setNiche, n)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${niche.includes(n) ? 'bg-[#E1306C] text-white border-[#E1306C]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Skills */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</label>
                      <div className="flex flex-wrap gap-2">
                        {SKILL_OPTIONS.map((s) => (
                          <button key={s} type="button" onClick={() => toggleChip(skills, setSkills, s)}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${skills.includes(s) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Bio */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Short Bio</label>
                      <textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell us about yourself and your content style…" rows={3}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] focus:ring-2 focus:ring-[#4B97C9]/20 transition-all resize-none" />
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  {/* ── SECTION: Location ───────────────────────────── */}
                  <div className="space-y-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase font-semibold text-gray-400 flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</p>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Country */}
                      <div className="col-span-2">
                        <select value={selectedCountryCode} onChange={(e) => {
                          const code = e.target.value
                          const cName = allCountries.find((c) => c.isoCode === code)?.name || ''
                          setSelectedCountryCode(code)
                          setSelectedStateCode('')
                          setAddress((a) => ({ ...a, country: cName, state: '', city: '' }))
                        }} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}>
                          <option value="">Select Country</option>
                          {allCountries.map((c) => <option key={c.isoCode} value={c.isoCode}>{c.flag} {c.name}</option>)}
                        </select>
                      </div>
                      {/* State */}
                      <select value={selectedStateCode} disabled={!selectedCountryCode}
                        onChange={(e) => {
                          const code = e.target.value
                          const sName = countryStates.find((s) => s.isoCode === code)?.name || ''
                          setSelectedStateCode(code)
                          setAddress((a) => ({ ...a, state: sName, city: '' }))
                        }} className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none disabled:text-gray-400 disabled:bg-gray-50"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                        <option value="">{countryStates.length ? 'State / Province' : 'No states available'}</option>
                        {countryStates.map((s) => <option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
                      </select>
                      {/* City */}
                      <select value={address.city} disabled={!selectedStateCode || stateCities.length === 0}
                        onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                        className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#4B97C9] appearance-none disabled:text-gray-400 disabled:bg-gray-50"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                        <option value="">{selectedStateCode ? (stateCities.length ? 'City / District' : 'Enter city below') : 'Select state first'}</option>
                        {stateCities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                      {/* City text fallback if no cities listed */}
                      {selectedStateCode && stateCities.length === 0 && (
                        <input type="text" placeholder="Enter your city" value={address.city}
                          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
                          className="col-span-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] transition-all" />
                      )}
                      {/* Postal code */}
                      <input type="text" placeholder="Postal / ZIP / PIN Code" value={address.pincode}
                        onChange={(e) => setAddress((a) => ({ ...a, pincode: e.target.value }))}
                        className="col-span-2 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#4B97C9] transition-all" />
                    </div>
                  </div>

                  <div className="border-t border-gray-100" />

                  <button type="submit"
                    className="w-full rounded-xl py-3.5 font-semibold text-sm text-white transition-all hover:opacity-90 active:scale-[0.99] flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #4B97C9, #357aad)' }}>
                    <ScrollText className="h-4 w-4" /> Review Terms &amp; Submit
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── Dashboard (after applying) ──────────────────────────────────── */}
          {submitted && status && (
            <div className="space-y-5">

              {/* Rejected banner */}
              {status.status === 'rejected' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-800 text-sm">Application not approved</p>
                    <p className="text-red-600 text-xs mt-0.5">You can re-apply with updated details.</p>
                  </div>
                  <button onClick={() => { setShowForm(true); setSubmitted(false) }}
                    className="text-xs font-semibold text-red-700 underline flex-shrink-0">Re-apply</button>
                </div>
              )}

              {/* Milestone progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white rounded-3xl p-6 border border-[#e8f4fb] shadow-sm flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <Ring pct={viewsPct} color="#4B97C9" size={72} stroke={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Eye className="h-5 w-5 text-[#4B97C9]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Views</p>
                    <p className="text-2xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">of {AFFILIATE_VIEWS_THRESHOLD.toLocaleString()}</p>
                  </div>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-[#e8f4fb] shadow-sm flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <Ring pct={likesPct} color="#E1306C" size={72} stroke={6} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-[#E1306C]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">Likes</p>
                    <p className="text-2xl font-bold text-gray-900">{totalLikes.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">of {AFFILIATE_LIKES_THRESHOLD.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Unified platform connection strip — same pattern for Instagram + OAuth platforms */}
              {(showInstagramSection || visibleOauthPlatforms.length > 0) && (
                <div className="bg-white rounded-3xl border border-[#e8f4fb] p-5 sm:p-6 shadow-sm">
                  <p className="text-[10px] tracking-[0.25em] uppercase font-medium text-gray-400">Platform connections</p>
                  <p className="text-xs text-gray-500 font-light mt-1 mb-4 tracking-wide max-w-2xl">
                    Connect each channel here first. Scroll down to load posts or reels and submit them toward your milestone.
                  </p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                    {showInstagramSection && (
                      <div className="rounded-2xl border border-[#e8f4fb] bg-[#fafdfd] p-4 flex flex-col min-h-[168px]">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
                            <Instagram className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">Instagram</p>
                            <p className="text-[11px] text-gray-400 font-light mt-0.5">Reels &amp; insights</p>
                          </div>
                        </div>
                        {status.instagramConnected && status.igUsername ? (
                          <>
                            <p className="text-sm font-semibold text-gray-800 truncate">@{status.igUsername}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-1">Connected</p>
                            <div className="mt-auto pt-3 flex flex-wrap gap-3">
                              <a href={`https://www.instagram.com/${status.igUsername}`} target="_blank" rel="noreferrer" className="text-xs text-[#4B97C9] flex items-center gap-1 hover:opacity-80">
                                <ExternalLink className="h-3 w-3" /> Profile
                              </a>
                              <button type="button" onClick={handleDisconnectInstagram} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Disconnect</button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500 font-light leading-relaxed flex-1">Creator or Business account required for reel sync.</p>
                            <button type="button" onClick={handleConnectInstagram} disabled={igConnecting || !status.id}
                              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366)' }}>
                              <Instagram className="h-4 w-4" />
                              {igConnecting ? 'Redirecting…' : 'Connect'}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    {visibleOauthPlatforms.map((pkey) => {
                      const meta = PLATFORM_SYNC_META[pkey]
                      const conn = platformConnections[pkey]
                      const accent = 'var(--arctic-blue-primary, #4B97C9)'
                      return (
                        <div key={pkey} className="rounded-2xl border border-[#e8f4fb] bg-[#fafdfd] p-4 flex flex-col min-h-[168px]">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border border-white shadow-sm overflow-hidden" style={{ backgroundColor: meta.brandTint }}>
                              {meta.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                              <p className="text-[11px] text-gray-400 font-light mt-0.5">{meta.contentLabel}</p>
                            </div>
                          </div>
                          {conn ? (
                            <>
                              <p className="text-sm font-semibold text-gray-800 truncate">{conn.platform_username}</p>
                              <p className="text-xs text-emerald-600 font-medium mt-1">Connected</p>
                              <div className="mt-auto pt-3">
                                <button type="button" onClick={() => handleDisconnectPlatform(pkey)} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Disconnect</button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="text-xs text-gray-500 font-light leading-relaxed flex-1">{meta.subline}</p>
                              <a
                                href={`${getApiBase()}/api/platform/${pkey}/connect?collab_id=${status?.id}`}
                                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 text-center shadow-sm"
                                style={{ backgroundColor: accent }}
                              >
                                Connect
                              </a>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Affiliate unlocked banner */}
              {affiliateUnlocked && (
                <div className="rounded-3xl p-6 flex items-center gap-5 relative overflow-hidden border border-amber-200/80"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 0%, transparent 60%)' }} />
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-6 w-6 text-white" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white text-lg">Affiliate Program Unlocked!</p>
                    <p className="text-amber-100 text-sm">You've hit the milestone. Apply for affiliate partnership now.</p>
                  </div>
                  <a href="#/user/affiliate-partner"
                    className="flex-shrink-0 bg-white rounded-xl px-5 py-2.5 text-sm font-bold text-amber-700 hover:opacity-90 transition-opacity">
                    Apply Now
                  </a>
                </div>
              )}

              {/* Pending approval notice */}
              {status.status === 'pending' && (
                <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-sm flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Application under review</p>
                    <p className="text-gray-500 text-xs mt-0.5 leading-relaxed">We'll review your application and reach out on Instagram within 2-3 days. You can connect your Instagram account now while you wait.</p>
                  </div>
                </div>
              )}

              {/* Instagram · detail: load & submit reels (connection lives in strip above) */}
              {isApproved && showInstagramSection && (
                <div className="bg-white rounded-3xl border border-[#e8f4fb] shadow-sm overflow-hidden">
                  <div className="px-6 sm:px-8 py-5 border-b border-[#f0f7fb]">
                    <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-gray-400 mb-1">Instagram</p>
                    <h2 className="text-xl font-light tracking-[0.06em] text-gray-900" style={{ fontFamily: 'var(--font-heading-family, inherit)' }}>Sync reels</h2>
                    <p className="text-xs text-gray-500 font-light mt-1">Fetch eligible reels and add them to your milestone.</p>
                  </div>
                  <div className="p-6 sm:p-8">
                  {!status.instagramConnected ? (
                    <p className="text-sm text-gray-500 font-light leading-relaxed">
                      Connect your Instagram account in the <strong className="font-medium text-gray-700">Platform connections</strong> section above. After it shows as connected, you can sync reels here.
                    </p>
                  ) : (
                    <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <button onClick={syncReels} disabled={syncing}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm sm:ml-auto"
                      style={{ backgroundColor: 'var(--arctic-blue-primary, #4B97C9)' }}>
                      {syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing...</> : <><RefreshCw className="h-4 w-4" /> Sync from Instagram</>}
                    </button>
                  </div>

                  {syncError && !syncError.includes('connection failed') && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" /> {syncError}
                    </div>
                  )}

                  {/* Picker */}
                  {syncedReels.length > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 text-xs">
                          {eligibleCount > 0 && <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium">{eligibleCount} eligible</span>}
                          {ineligibleCount > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">{ineligibleCount} ineligible</span>}
                        </div>
                        <div className="flex gap-3 text-xs font-medium text-[#4B97C9]">
                          <button onClick={() => setSelectedReels(new Set(syncedReels.filter((r) => r.eligible && !r.already_submitted).map((r) => r.media_id)))}>Select all</button>
                          <span className="text-gray-300">|</span>
                          <button onClick={() => setSelectedReels(new Set())} className="text-gray-400">Clear</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                        {syncedReels.map((reel) => {
                          const isSelected = selectedReels.has(reel.media_id)
                          const isDisabled = reel.already_submitted || !reel.eligible
                          return (
                            <div key={reel.media_id} onClick={() => !isDisabled && toggleSelect(reel.media_id)}
                              className={`relative rounded-2xl overflow-hidden border transition-all ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'} ${isSelected ? 'border-[#4B97C9] ring-2 ring-[#4B97C9]/30' : 'border-gray-100'}`}>

                              {/* Thumbnail */}
                              <div className="relative h-32 bg-gray-100">
                                {reel.thumbnail_url
                                  ? <img src={reel.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                  : <div className="w-full h-full flex items-center justify-center bg-gray-100"><Play className="h-8 w-8 text-gray-300" /></div>}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                {/* Top-right badge */}
                                <div className="absolute top-2 right-2">
                                  {reel.already_submitted
                                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">Submitted</span>
                                    : reel.eligible
                                    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500 text-white">Eligible</span>
                                    : <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">Ineligible</span>}
                                </div>

                                {/* Checkbox */}
                                {!isDisabled && (
                                  <div className="absolute top-2 left-2">
                                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#4B97C9] border-[#4B97C9]' : 'bg-white/80 border-white/80'}`}>
                                      {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                    </div>
                                  </div>
                                )}

                                {/* Bottom stats overlay */}
                                <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs font-medium">
                                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{reel.views.toLocaleString()}</span>
                                  <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{reel.likes.toLocaleString()}</span>
                                  <span className="ml-auto">{new Date(reel.timestamp).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Caption + reason */}
                              <div className="px-3 py-2.5">
                                {reel.caption
                                  ? <p className="text-xs text-gray-600 truncate">{reel.caption}</p>
                                  : <p className="text-xs text-gray-400 italic">No caption</p>}
                                {!reel.eligible && !reel.already_submitted && (
                                  <p className="text-[10px] text-red-500 mt-1">
                                    {!reel.date_ok && 'Posted before joining. '}
                                    {!reel.caption_ok && 'Missing #nefol.'}
                                  </p>
                                )}
                                <a href={reel.reel_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="text-[10px] text-[#4B97C9] flex items-center gap-0.5 mt-1 hover:opacity-80">
                                  <ExternalLink className="h-2.5 w-2.5" /> View on Instagram
                                </a>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {selectedReels.size > 0 && (
                        <div className="mt-4 flex items-center gap-4">
                          <button onClick={submitSelected} disabled={submittingSelected}
                            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            {submittingSelected
                              ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                              : <><CheckCircle className="h-4 w-4" /> Submit {selectedReels.size} reel{selectedReels.size > 1 ? 's' : ''}</>}
                          </button>
                          <span className="text-sm text-gray-400">{selectedReels.size} selected</span>
                        </div>
                      )}

                      {submitResult && (
                        <div className={`mt-3 rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${submitResult.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {submitResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                          {submitResult.success || submitResult.error}
                        </div>
                      )}
                    </>
                  )}
                  </>
                  )}
                  </div>
                </div>
              )}

              {/* ── Platform notification toast ─────────────────────────────── */}
              {platformNotification && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3.5 text-sm text-emerald-800 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {platformNotification}
                </div>
              )}

              {/* YouTube / Reddit / VK · detail only (same header pattern as Instagram) */}
              {isApproved && visibleOauthPlatforms.length > 0 && (
                <div className="space-y-5">
                  {visibleOauthPlatforms.map((key) => {
                    const meta = PLATFORM_SYNC_META[key]
                    const conn = platformConnections[key]
                    const ps = platformStates[key]
                    const eligibleCnt = ps.content.filter((c) => c.eligible && !c.already_submitted).length
                    const ineligibleCnt = ps.content.filter((c) => !c.eligible).length
                    const accent = 'var(--arctic-blue-primary, #4B97C9)'
                    return (
                      <div key={key} className="bg-white rounded-3xl border border-[#e8f4fb] shadow-sm overflow-hidden">
                        <div className="px-6 sm:px-8 py-5 border-b border-[#f0f7fb] flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white shadow-sm overflow-hidden" style={{ backgroundColor: meta.brandTint }}>
                            {meta.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] tracking-[0.2em] uppercase font-medium text-gray-400 mb-1">{meta.label}</p>
                            <h3 className="text-xl font-light tracking-[0.06em] text-gray-900" style={{ fontFamily: 'var(--font-heading-family, inherit)' }}>
                              Sync {meta.contentLabel.toLowerCase()}
                            </h3>
                            <p className="text-xs text-gray-500 font-light mt-1">{meta.subline}</p>
                          </div>
                        </div>

                        <div className="p-6 sm:p-8">
                        {!conn ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-500 font-light leading-relaxed">
                              Connect <strong className="font-medium text-gray-700">{meta.label}</strong> in the <strong className="font-medium text-gray-700">Platform connections</strong> section above, then load your {meta.contentLabel.toLowerCase()} here.
                            </p>
                            <p className="text-xs text-gray-400 font-light">{meta.connectHelp}</p>
                            {key === 'reddit' && (
                              <p className="text-xs text-amber-900/90 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2 font-light leading-snug">
                                Reddit: upvotes count toward likes; views are not available from Reddit’s API.
                              </p>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                              <p className="text-xs text-gray-500 font-light">
                                Signed in as <span className="font-medium text-gray-700">{conn.platform_username}</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => syncPlatform(key)}
                                disabled={ps.syncing}
                                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm sm:ml-auto"
                                style={{ backgroundColor: accent }}
                              >
                                {ps.syncing ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : <><RefreshCw className="h-4 w-4" /> Load {meta.contentLabel}</>}
                              </button>
                            </div>
                            {key === 'reddit' && (
                              <p className="text-xs text-amber-900/90 mb-4 rounded-xl border border-amber-100 bg-amber-50/90 px-3 py-2 font-light leading-snug">
                                Reddit: upvotes count toward likes; views are not available from Reddit’s API.
                              </p>
                            )}
                          </>
                        )}

                        {ps.error && (
                          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50/90 border border-red-100 px-4 py-3 rounded-xl">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {ps.error}
                          </div>
                        )}

                        {ps.content.length > 0 && (
                          <div className="px-6 sm:px-8 pb-8 pt-2 border-t border-[#f0f7fb]">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-2 text-xs">
                                {eligibleCnt > 0 && <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-medium border border-emerald-100">{eligibleCnt} eligible</span>}
                                {ineligibleCnt > 0 && <span className="px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 font-medium border border-gray-100">{ineligibleCnt} ineligible</span>}
                              </div>
                              <div className="flex gap-3 text-xs font-medium" style={{ color: accent }}>
                                <button type="button" className="hover:opacity-70" onClick={() => setPlatformStates((prev) => ({ ...prev, [key]: { ...prev[key], selected: new Set(ps.content.filter((c) => c.eligible && !c.already_submitted).map((c) => c.content_id)) } }))}>Select all</button>
                                <span className="text-gray-200">|</span>
                                <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => updPS(key, { selected: new Set() })}>Clear</button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
                              {ps.content.map((item: any) => {
                                const isSelected = ps.selected.has(item.content_id)
                                const isDisabled = item.already_submitted || !item.eligible
                                return (
                                  <div
                                    key={item.content_id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => !isDisabled && togglePlatformSelect(key, item.content_id)}
                                    onKeyDown={(e) => e.key === 'Enter' && !isDisabled && togglePlatformSelect(key, item.content_id)}
                                    className={`relative rounded-2xl overflow-hidden border transition-all ${isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                                    style={{
                                      borderColor: isSelected ? accent : '#eef6fb',
                                      boxShadow: isSelected ? `0 0 0 2px rgba(75, 151, 201, 0.25)` : undefined,
                                    }}
                                  >
                                    <div className="relative h-32 bg-[#f8fcfd]">
                                      {item.thumbnail_url ? (
                                        <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center opacity-50" style={{ backgroundColor: meta.brandTint }}>
                                          {meta.icon}
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                                      <div className="absolute top-2 right-2">
                                        {item.already_submitted ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#4B97C9] text-white">Submitted</span>
                                        ) : item.eligible ? (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">Eligible</span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500 text-white">Ineligible</span>
                                        )}
                                      </div>
                                      {!isDisabled && (
                                        <div className="absolute top-2 left-2">
                                          <div
                                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                                            style={{
                                              backgroundColor: isSelected ? accent : 'rgba(255,255,255,0.9)',
                                              borderColor: isSelected ? accent : 'rgba(255,255,255,0.9)',
                                            }}
                                          >
                                            {isSelected && <CheckCircle className="h-3.5 w-3.5 text-white" />}
                                          </div>
                                        </div>
                                      )}
                                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white text-xs font-medium">
                                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(item.views || 0).toLocaleString()}</span>
                                        <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(item.likes || 0).toLocaleString()}</span>
                                        {item.published_at && <span className="ml-auto opacity-90">{new Date(item.published_at).toLocaleDateString()}</span>}
                                      </div>
                                    </div>
                                    <div className="px-3 py-2.5 bg-white">
                                      {item.title ? (
                                        <p className="text-xs text-gray-700 truncate font-medium">{item.title}</p>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic font-light">No title</p>
                                      )}
                                      {!item.eligible && !item.already_submitted && (
                                        <p className="text-[10px] text-red-600 mt-0.5 font-light">
                                          {!item.date_ok && 'Posted before joining. '}
                                          {!item.caption_ok && 'Missing NEFOL mention.'}
                                        </p>
                                      )}
                                      <a
                                        href={item.content_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] flex items-center gap-0.5 mt-1.5 font-medium hover:opacity-80 transition-opacity"
                                        style={{ color: accent }}
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" /> Open on {meta.label}
                                      </a>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {ps.selected.size > 0 && (
                              <div className="mt-5 flex flex-wrap items-center gap-4">
                                <button
                                  type="button"
                                  onClick={() => submitPlatformContent(key)}
                                  disabled={ps.submitting}
                                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
                                  style={{ backgroundColor: accent }}
                                >
                                  {ps.submitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                                  ) : (
                                    <><CheckCircle className="h-4 w-4" /> Submit {ps.selected.size} {meta.contentLabel.toLowerCase().replace(/s$/, '')}{ps.selected.size > 1 ? 's' : ''}</>
                                  )}
                                </button>
                                <span className="text-sm text-gray-400 font-light">{ps.selected.size} selected</span>
                              </div>
                            )}

                            {ps.result && (
                              <div className={`mt-4 rounded-xl px-4 py-3 text-sm flex items-center gap-2 border ${ps.result.success ? 'bg-emerald-50/90 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                                {ps.result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                {ps.result.success || ps.result.error}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Submitted reels */}
              {submittedReels.length > 0 && (
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900 text-base">Submitted Content</h2>
                        <p className="text-xs text-gray-400">{submittedReels.length} item{submittedReels.length > 1 ? 's' : ''} tracking across all platforms</p>
                      </div>
                    </div>
                    <button onClick={fetchStatus} className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                  </div>

                  {submittedReels.some((r) => r.insights_pending) && (
                    <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 text-xs text-amber-800">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                      <span><strong>{submittedReels.filter((r) => r.insights_pending).length} reel{submittedReels.filter((r) => r.insights_pending).length > 1 ? 's' : ''} still syncing</strong> — metrics update automatically every 8 hours.</span>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {submittedReels.map((reel) => {
                      const eligible = reel.caption_ok && reel.date_ok
                      return (
                        <div key={reel.id} className="flex items-center gap-4 rounded-2xl px-4 py-3.5 border"
                          style={{ borderColor: reel.insights_pending ? '#fde68a' : eligible ? '#d1fae5' : '#fecaca', backgroundColor: reel.insights_pending ? '#fffbeb' : eligible ? '#f0fdf4' : '#fef2f2' }}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reel.insights_pending ? 'bg-amber-400 animate-pulse' : eligible ? 'bg-emerald-500' : 'bg-red-400'}`} />
                          <div className="flex-1 min-w-0">
                            <a href={reel.reel_url} target="_blank" rel="noreferrer"
                              className="text-xs font-medium text-[#4B97C9] underline truncate block">{reel.reel_url}</a>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              {reel.insights_pending
                                ? <span className="italic text-amber-600">Syncing metrics...</span>
                                : <><span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(reel.views_count || 0).toLocaleString()}</span>
                                   <span className="flex items-center gap-1"><Heart className="h-3 w-3" />{(reel.likes_count || 0).toLocaleString()}</span>
                                   <span>@{reel.platform_username || reel.instagram_username}</span></>}
                              {reel.platform && reel.platform !== 'instagram' && (
                                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize"
                                  style={{ backgroundColor: reel.platform === 'youtube' ? '#fff0f0' : reel.platform === 'reddit' ? '#fff4f0' : '#f0f6ff', color: reel.platform === 'youtube' ? '#FF0000' : reel.platform === 'reddit' ? '#FF4500' : '#0077FF' }}>
                                  {reel.platform}
                                </span>
                              )}
                            </div>
                            {!reel.insights_pending && !eligible && (
                              <p className="text-[10px] text-red-500 mt-0.5">
                                {!reel.date_ok && 'Posted before joining. '}
                                {!reel.caption_ok && 'Missing #nefol.'}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {reel.insights_pending
                              ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Syncing</span>
                              : <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${eligible ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{eligible ? 'Eligible' : 'Ineligible'}</span>}
                            <button
                              onClick={async () => {
                                if (!confirm('Remove this reel?')) return
                                await fetch(`${getApiBase()}/api/collab/reels/${reel.id}`, { method: 'DELETE', headers: authHeaders(), body: JSON.stringify({ collab_id: status?.id }) })
                                await fetchStatus()
                              }}
                              className="text-gray-300 hover:text-red-400 transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Requirements reminder */}
              <div className="rounded-3xl p-6 border border-gray-100 bg-white shadow-sm">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Eligibility rules</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { icon: <Clapperboard className="h-4 w-4 text-[#4B97C9]" />, title: 'Timing', desc: 'Reel must be posted after your collab approval date', bg: '#eff8ff' },
                    { icon: <Zap className="h-4 w-4 text-[#E1306C]" />, title: 'Caption', desc: 'Must include #nefol or #neföl in the caption or hashtags', bg: '#fff0f5' },
                    { icon: <TrendingUp className="h-4 w-4 text-emerald-600" />, title: 'Target', desc: '10,000 views + 500 likes unlocks Affiliate status', bg: '#f0fdf4' },
                  ].map((r) => (
                    <div key={r.title} className="flex items-start gap-3 p-4 rounded-2xl" style={{ backgroundColor: r.bg }}>
                      <div className="flex-shrink-0 mt-0.5">{r.icon}</div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 mb-0.5">{r.title}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {syncError && syncError.includes('connection failed') && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-2xl border border-red-100">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {syncError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* ── Terms & Conditions Modal ────────────────────────────────────────── */}
      {showTCModal && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowTCModal(false) }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto',
          }}
        >
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 60px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: 'calc(100vh - 48px)',
            margin: 'auto',
          }}>
            {/* Header */}
            <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ScrollText style={{ width: 20, height: 20, color: '#4B97C9' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>Creator Collab Terms &amp; Conditions</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>Read carefully before submitting your application</p>
                </div>
                <button onClick={() => setShowTCModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#cbd5e1', flexShrink: 0, marginTop: 2 }}>
                  <X style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '24px 28px' }}>

              <p style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600, marginBottom: 20 }}>Effective January 2025</p>

              {/* Section 1 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#4B97C9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>1</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Content Requirements</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    <>All reels submitted must <strong>authentically feature NEFOL products</strong>. Content must be original and created by you.</>,
                    <>Reels must include <strong>#nefol</strong> or a branded hashtag/mention in the caption or video. Reels without this are ineligible.</>,
                    <>Only reels posted <strong>after your application is approved</strong> count. You cannot submit older content.</>,
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle style={{ width: 15, height: 15, color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#4B97C9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>2</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Affiliate Milestone</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    <>The milestone is <strong>10,000 total views</strong> and <strong>500 total likes</strong> across all eligible submitted reels — shared across multiple reels.</>,
                    <>Stats are tracked automatically via the Instagram API and refreshed periodically. Updates may take up to 24 hours.</>,
                    <>Reaching the milestone does not guarantee an affiliate partnership. NEFOL reviews content quality before final approval.</>,
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle style={{ width: 15, height: 15, color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#4B97C9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>3</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Account &amp; Data</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    <>Connect a <strong>Creator or Business Instagram account</strong> to enable reel tracking. Personal accounts are unsupported by the Instagram API.</>,
                    <>You confirm all submitted profiles and links belong to you. Submitting accounts you do not own results in immediate disqualification.</>,
                    <>NEFOL collects only usernames and public engagement metrics (views, likes) to track collab progress. Your data is never sold to third parties.</>,
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle style={{ width: 15, height: 15, color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4 */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: '#4B97C9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>4</span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e293b' }}>Program Rules</h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    'NEFOL may approve or reject any application at its sole discretion without providing a reason.',
                    'Any attempt to manipulate engagement metrics (buying views/likes, coordinated inauthentic behavior) will result in permanent disqualification.',
                    'NEFOL reserves the right to modify or terminate the collab program at any time with reasonable notice to participants.',
                    "Submitted content may be reshared on NEFOL's official social media channels with credit to the original creator.",
                  ].map((text, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <CheckCircle style={{ width: 15, height: 15, color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Acceptance note */}
              <div style={{ backgroundColor: '#F0F8FD', borderRadius: 14, padding: '14px 16px', border: '1px solid #D6EAF8' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#4B97C9', lineHeight: 1.6 }}>
                  By clicking <strong>"I Accept &amp; Submit"</strong> below, you confirm that you have read, understood, and agree to all of the above terms and conditions.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12, flexShrink: 0 }}>
              <button onClick={() => setShowTCModal(false)}
                style={{ flex: 1, padding: '12px 0', borderRadius: 14, border: '1.5px solid #e2e8f0', background: 'none', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}>
                Cancel
              </button>
              <button onClick={doSubmit}
                style={{ flex: 2, padding: '12px 0', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #4B97C9, #357aad)', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', letterSpacing: '0.01em' }}>
                I Accept &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
