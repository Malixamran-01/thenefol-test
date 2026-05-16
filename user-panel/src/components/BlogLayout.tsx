import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Home,
  FileText,
  BarChart3,
  Bell,
  User,
  Compass,
  Menu,
  X,
  PenLine,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Clapperboard,
  Settings,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { blogActivityAPI } from '../services/api'
import { authorAPI } from '../services/authorAPI'
import { getApiBase } from '../utils/apiBase'
import AuthorPromptModal from './AuthorPromptModal'
import {
  getCreatorProgramSidebarEnabled,
  NEFOL_SOCIAL_SETTINGS_CHANGE,
} from '../utils/nefolSocialSettings'
import { NEFOL_HASH_ROUTE_CHANGE } from '../utils/hashRouteEvents'
import { deferStateWork } from '../utils/deferStateWork'
import { CreatorProgramBadgeProvider, useCreatorProgramBadges } from '../contexts/CreatorProgramBadgeContext'

type CreatorBadge = 'locked' | 'progress' | 'unlocked'

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  matchPrefix?: string
  placeholder?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog',
  },
  {
    id: 'content',
    label: 'My Content',
    icon: <FileText strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog/my-blogs',
    matchPrefix: '#/user/blog/my-blogs',
  },
  {
    id: 'notifications',
    label: 'Activity',
    icon: <Bell strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog/activity',
    matchPrefix: '#/user/blog/activity',
  },
  {
    id: 'profile',
    label: 'My Profile',
    icon: <User strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/login',
    matchPrefix: '#/user/author',
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <Compass strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog/explore',
    matchPrefix: '#/user/blog/explore',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <BarChart3 strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog/dashboard',
    matchPrefix: '#/user/blog/dashboard',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/blog/settings',
    matchPrefix: '#/user/blog/settings',
  },
  {
    id: 'creator-program',
    label: 'Creator Program',
    icon: <Clapperboard strokeWidth={2.2} className="h-5 w-5" />,
    href: '#/user/collab',
    matchPrefix: '#/user/collab',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isItemActive(item: NavItem, hash: string, currentUserId?: number): boolean {
  if (item.placeholder) return false
  if (item.id === 'home') return hash === '#/user/blog'
  if (item.id === 'content') return hash.startsWith('#/user/blog/my-blogs')
  if (item.id === 'notifications') return hash.startsWith('#/user/blog/activity')
  if (item.id === 'profile') {
    const idFromHash = hash.replace(/^#\/user\/author\//, '').split('/')[0].split('?')[0]
    if (idFromHash === 'me') return true
    if (currentUserId == null) return false
    return idFromHash === String(currentUserId)
  }
  if (item.id === 'explore') return hash.startsWith('#/user/blog/explore')
  if (item.id === 'analytics') return hash.startsWith('#/user/blog/dashboard')
  if (item.id === 'settings') return hash.startsWith('#/user/blog/settings')
  if (item.id === 'creator-program') {
    return hash.startsWith('#/user/collab')
      || hash.startsWith('#/user/affiliate-partner')
      || hash.startsWith('#/user/referral-history')
  }
  if (item.matchPrefix) return hash.startsWith(item.matchPrefix)
  return hash === item.href
}

// ─── Nav (used in both desktop sidebar and mobile drawer) ────────────────────

interface SidePanelNavProps {
  hash: string
  collapsed: boolean
  unreadCount: number
  /** When false (default), Creator Program is hidden from the nav until enabled in Settings. */
  showCreatorProgramInSidebar?: boolean
  creatorBadge?: CreatorBadge
  onClose?: () => void
  onToggleCollapse?: () => void
  showCollapseButton?: boolean
  showLogoRow?: boolean
  showStoreLink?: boolean
  onWriteClick?: (e: React.MouseEvent) => void | Promise<void>
}

function SidePanelNav({
  hash,
  collapsed,
  unreadCount,
  showCreatorProgramInSidebar = false,
  creatorBadge = 'locked',
  onClose,
  onToggleCollapse,
  showCollapseButton = false,
  showLogoRow = true,
  showStoreLink = false,
  onWriteClick,
}: SidePanelNavProps) {
  const { isAuthenticated, user, logout } = useAuth()
  const creatorBadges = useCreatorProgramBadges()

  const handleSignOut = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClose) onClose()
    logout()
  }

  const handleNav = (item: NavItem, e: React.MouseEvent) => {
    if (item.placeholder) { e.preventDefault(); return }
    if (item.id === 'content') {
      e.preventDefault()
      if (!isAuthenticated) {
        sessionStorage.setItem('post_login_redirect', window.location.hash)
        window.location.hash = '#/user/login'
      } else {
        window.location.hash = '#/user/blog/my-blogs'
      }
      if (onClose) onClose()
      return
    }
    if (item.id === 'profile') {
      e.preventDefault()
      if (!isAuthenticated) {
        sessionStorage.setItem('post_login_redirect', window.location.hash)
        window.location.hash = '#/user/login'
      } else {
        sessionStorage.removeItem('blog_author_profile')
        window.location.hash = '#/user/author/me'
      }
      if (onClose) onClose()
      return
    }
    if (onClose) onClose()
  }

  const getItemHref = (item: NavItem) => {
    if (item.id === 'profile') {
      return isAuthenticated ? '#/user/author/me' : '#/user/login'
    }
    return item.href
  }

  const badgeDot = (badge: CreatorBadge) => {
    if (badge === 'unlocked') return <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />
    if (badge === 'progress') return <span className="h-2 w-2 rounded-full bg-amber-400 flex-shrink-0" />
    return <span className="h-2 w-2 rounded-full bg-gray-200 flex-shrink-0" />
  }

  const handleWriteClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClose) onClose()
    if (onWriteClick) {
      onWriteClick(e)
    } else if (isAuthenticated) {
      window.location.hash = '#/user/blog/request?new=1'
    } else {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
    }
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Logo row (desktop sidebar only) ─────────────────── */}
      {showLogoRow && (
        <div
          className={`flex h-[60px] flex-shrink-0 items-center border-b border-gray-200/70 ${
            collapsed ? 'justify-center px-0' : 'justify-between px-5'
          }`}
        >
          {!collapsed && (
            <a
              href="#/user/blog"
              className="flex items-center gap-2.5 min-w-0"
              onClick={onClose}
              title="NEFOL Social"
            >
              <img
                src="/IMAGES/essential/nefol-icon.svg"
                alt="NEFOL"
                className="h-7 w-auto flex-shrink-0 object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className="truncate text-[15px] tracking-wide text-[#1B4965] leading-none">
                <span className="font-bold">NEFOL</span>{' '}
                <span className="font-semibold opacity-80">Social</span>
              </span>
            </a>
          )}

          {collapsed && (
            <a href="#/user/blog" onClick={onClose} title="NEFOL Social">
              <img
                src="/IMAGES/essential/nefol-icon.svg"
                alt="NEFOL"
                className="h-7 w-auto object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            </a>
          )}

          {/* Collapse toggle */}
          {showCollapseButton && (
            <button
              onClick={onToggleCollapse}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-300/40 hover:text-gray-700"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Nav items ────────────────────────────────────────── */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.filter(
          (item) => item.id !== 'creator-program' || showCreatorProgramInSidebar
        ).map((item) => {
          const active = isItemActive(item, hash, user?.id)
          const effectiveHref = getItemHref(item)
          const showUnreadBadge = item.id === 'notifications' && unreadCount > 0
          const showCreatorProgramBadge = item.id === 'creator-program' && creatorBadges.total > 0

          return (
            <a
              key={item.id}
              href={effectiveHref}
              onClick={(e) => handleNav(item, e)}
              title={item.placeholder ? `${item.label} — coming soon` : item.label}
              className={`group relative flex items-center transition-colors duration-150 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 py-2.5 pr-4'
              } ${
                item.placeholder ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-900/[0.04]'
              }`}
            >
              {/* Left accent bar */}
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-150 ${active ? 'h-6 bg-[#1B4965]' : 'h-0 bg-transparent'}`} />

              <span className={`relative flex-shrink-0 ${collapsed ? '' : 'pl-5'}`}>
                <span className={`block transition-colors duration-150 ${active ? 'text-[#1B4965]' : item.placeholder ? 'text-gray-300' : 'text-gray-500 group-hover:text-gray-800'}`}>
                  {item.icon}
                </span>
                {item.id === 'notifications' && showUnreadBadge && collapsed && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {item.id === 'creator-program' && showCreatorProgramBadge && collapsed && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {creatorBadges.total > 99 ? '99+' : creatorBadges.total}
                  </span>
                )}
              </span>

              {/* Label + badge (expanded only) */}
              {!collapsed && (
                <>
                  <span className={`flex-1 text-[14.5px] font-semibold transition-colors duration-150 ${active ? 'text-[#1B4965]' : item.placeholder ? 'text-gray-300' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {item.label}
                  </span>
                  {item.id === 'creator-program' && badgeDot(creatorBadge)}
                  {showUnreadBadge && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                  {showCreatorProgramBadge && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {creatorBadges.total > 99 ? '99+' : creatorBadges.total}
                    </span>
                  )}
                  {item.placeholder && <span className="text-[11px] text-gray-300">soon</span>}
                </>
              )}
            </a>
          )
        })}
      </nav>

      {/* ── Back to NEFOL Store (below nav) ───────────────────── */}
      {showStoreLink && (
        <div className={`flex-shrink-0 border-t border-gray-200/70 ${collapsed ? 'flex justify-center p-3' : 'px-5 py-3'}`}>
          {collapsed ? (
            <a
              href="#/user/"
              onClick={onClose}
              title="Back to NEFOL Store"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1B4965] text-white shadow-md transition-colors hover:bg-[#163d54] hover:shadow-lg"
            >
              <img src="/IMAGES/essential/nefol-icon.svg" alt="" className="h-5 w-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            </a>
          ) : (
            <a
              href="#/user/"
              onClick={onClose}
              className="flex items-center gap-2.5 rounded-lg bg-[#1B4965] px-4 py-3 text-[15px] font-bold text-white shadow-md transition-colors hover:bg-[#163d54] hover:shadow-lg -mx-1"
            >
              <img src="/IMAGES/essential/nefol-icon.svg" alt="" className="h-5 w-5 flex-shrink-0 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              Back to NEFOL Store
            </a>
          )}
        </div>
      )}

      {/* ── Write button ─────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-t border-gray-200/70 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <a
            href={isAuthenticated ? '#/user/blog/request?new=1' : '#/user/login'}
            onClick={handleWriteClick}
            title="Write"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B4965] text-white transition-colors hover:bg-[#163d54]"
          >
            <PenLine className="h-4 w-4" />
          </a>
        ) : (
          <a
            href={isAuthenticated ? '#/user/blog/request?new=1' : '#/user/login'}
            onClick={handleWriteClick}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1B4965] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#163d54]"
          >
            <PenLine className="h-3.5 w-3.5" />
            Write
          </a>
        )}
      </div>

      {/* ── Sign In / Sign Out (bottom) ──────────────────────── */}
      <div className={`flex-shrink-0 border-t border-gray-200/70 ${collapsed ? 'flex justify-center py-2' : 'px-5 py-2'}`}>
        {isAuthenticated ? (
          <button
            onClick={handleSignOut}
            className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-[14px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 ${collapsed ? 'justify-center px-0' : ''}`}
            title="Sign out"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400" />
            {!collapsed && <span>Sign out</span>}
          </button>
        ) : (
          <a
            href="#/user/login"
            onClick={() => {
              sessionStorage.setItem('post_login_redirect', window.location.hash)
              onClose?.()
            }}
            className={`flex w-full items-center gap-3 rounded-lg py-2.5 text-[14px] font-medium text-[#1B4965] transition-colors hover:bg-gray-100 ${collapsed ? 'justify-center px-0' : ''}`}
            title="Sign in"
          >
            <LogIn className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>Sign in</span>}
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface BlogLayoutProps {
  children: React.ReactNode
  /** Full hash from the single app router (`#/user/...`), kept in sync via `NEFOL_HASH_ROUTE_CHANGE`. */
  currentHash: string
}

const SIDEBAR_EXPANDED_W = 220
const SIDEBAR_COLLAPSED_W = 68

export default function BlogLayout({ children, currentHash }: BlogLayoutProps) {
  const { isAuthenticated, user } = useAuth()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuthorPrompt, setShowAuthorPrompt] = useState(false)
  const [creatorBadge, setCreatorBadge] = useState<CreatorBadge>('locked')
  const [unreadCount, setUnreadCount] = useState(0)
  const [showCreatorProgramInSidebar, setShowCreatorProgramInSidebar] = useState(() =>
    getCreatorProgramSidebarEnabled()
  )

  useEffect(() => {
    const sync = () => {
      const next = getCreatorProgramSidebarEnabled()
      deferStateWork(() => {
        setShowCreatorProgramInSidebar((prev) => (prev === next ? prev : next))
      })
    }
    window.addEventListener('storage', sync)
    window.addEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener(NEFOL_SOCIAL_SETTINGS_CHANGE, sync as EventListener)
    }
  }, [])

  // Persist collapse state
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('blog-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleCollapse = () => {
    setCollapsed((c) => {
      const next = !c
      try { localStorage.setItem('blog-sidebar-collapsed', String(next)) } catch { /**/ }
      return next
    })
  }

  const creatorBadgeRequestIdRef = useRef(0)

  // ── Creator badge fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      creatorBadgeRequestIdRef.current += 1
      setCreatorBadge('locked')
      return
    }
    const myId = ++creatorBadgeRequestIdRef.current
    const email = user.email
    fetch(`${getApiBase()}/api/collab/status?email=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (myId !== creatorBadgeRequestIdRef.current) return
        if (!d || !d.status) setCreatorBadge('locked')
        else if (d.affiliate_unlocked || d.affiliateUnlocked) setCreatorBadge('unlocked')
        else setCreatorBadge('progress')
      })
      .catch(() => {
        if (myId === creatorBadgeRequestIdRef.current) setCreatorBadge('locked')
      })
  }, [isAuthenticated, user?.email])

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await blogActivityAPI.getUnreadNotificationCount()
      setUnreadCount(data?.count ?? 0)
    } catch { /* silent */ }
  }, [isAuthenticated])

  useEffect(() => {
    const handler = () => {
      deferStateWork(() => setUnreadCount(0))
    }
    window.addEventListener('blog-notifications-read-all', handler)
    return () => window.removeEventListener('blog-notifications-read-all', handler)
  }, [])

  const fetchUnreadRef = useRef(fetchUnread)
  fetchUnreadRef.current = fetchUnread

  useEffect(() => {
    const onRefresh = () => {
      deferStateWork(() => {
        void fetchUnreadRef.current()
      })
    }
    window.addEventListener('blog-notifications-refresh', onRefresh)
    return () => window.removeEventListener('blog-notifications-refresh', onRefresh)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isAuthenticated, fetchUnread])

  // ── Mobile menu ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      deferStateWork(() => setMobileMenuOpen((open) => (open ? false : open)))
    }
    window.addEventListener(NEFOL_HASH_ROUTE_CHANGE, handler)
    return () => window.removeEventListener(NEFOL_HASH_ROUTE_CHANGE, handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  const handleWriteClick = useCallback(async (_e: React.MouseEvent) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
      return
    }
    try {
      const eligibility = await authorAPI.checkEligibility()
      const canSubmitDirectly =
        Boolean(eligibility.hasAuthorRole) &&
        Boolean(eligibility.hasAuthorProfile) &&
        Boolean(eligibility.onboardingCompleted)
      if (canSubmitDirectly) {
        window.location.hash = '#/user/blog/request?new=1'
      } else {
        setShowAuthorPrompt(true)
      }
    } catch {
      setShowAuthorPrompt(true)
    }
  }, [isAuthenticated])

  return (
    <CreatorProgramBadgeProvider>
    <div className="flex min-h-screen" style={{ backgroundColor: '#F4F9F9' }}>

      {/* ── Desktop fixed sidebar ────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 border-r border-gray-200/70 overflow-hidden"
        style={{ width: sidebarW, transition: 'width 200ms ease', backgroundColor: '#F4F9F9' }}
      >
        <SidePanelNav
          hash={currentHash}
          collapsed={collapsed}
          unreadCount={unreadCount}
          showCreatorProgramInSidebar={showCreatorProgramInSidebar}
          creatorBadge={creatorBadge}
          onToggleCollapse={toggleCollapse}
          showCollapseButton
          showStoreLink
          onWriteClick={handleWriteClick}
        />
      </aside>

      {/*
        Invisible spacer — participates in normal flex flow so main gets pushed right.
        Must mirror the sidebar's width + transition exactly.
      */}
      <div
        aria-hidden
        className="hidden lg:block flex-shrink-0"
        style={{ width: sidebarW, transition: 'width 200ms ease' }}
      />

      {/* ── Mobile top bar ──────────────────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200/70 px-4 lg:hidden" style={{ backgroundColor: '#F4F9F9' }}>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-50"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <a href="#/user/blog" className="flex items-center gap-2">
          <img
            src="/IMAGES/essential/nefol-icon.svg"
            alt="NEFOL"
            className="h-7 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span className="text-[14px] tracking-wide text-[#1B4965] leading-none">
            <span className="font-bold">NEFOL</span>{' '}
            <span className="font-semibold opacity-80">Social</span>
          </span>
        </a>

        <a
          href="#/user/blog/activity"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-50"
          title="Activity"
        >
          <Bell strokeWidth={2.2} className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </a>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" />
          <div
            className="absolute inset-y-0 left-0 flex w-[240px] flex-col shadow-xl"
            style={{ backgroundColor: '#F4F9F9' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── User identity header ─────────────────────── */}
            <div className="relative flex-shrink-0 px-5 pt-6 pb-4 border-b border-gray-200/70">
              {/* Close */}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200/60 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {isAuthenticated && user ? (
                <>
                  {/* Avatar */}
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo.startsWith('/uploads/') ? `${getApiBase()}${user.profile_photo}` : user.profile_photo}
                      alt={user.name}
                      className="h-12 w-12 rounded-full object-cover mb-3 border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4B97C9] to-[#1B4965] text-lg font-bold text-white shadow-sm">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <p className="text-[15px] font-semibold text-gray-900 leading-tight">{user.name}</p>
                  <p className="text-[12px] text-gray-400 mt-0.5">NEFOL Social</p>
                </>
              ) : (
                <>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-200">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <a
                    href="#/user/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-[14px] font-semibold text-[#1B4965]"
                  >
                    Sign in
                  </a>
                  <p className="text-[12px] text-gray-400 mt-0.5">to access your account</p>
                </>
              )}
            </div>

            {/* ── Nav items + store link ────────────────────── */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              <SidePanelNav
                hash={currentHash}
                collapsed={false}
                unreadCount={unreadCount}
                showCreatorProgramInSidebar={showCreatorProgramInSidebar}
                creatorBadge={creatorBadge}
                onClose={() => setMobileMenuOpen(false)}
                showLogoRow={false}
                showStoreLink
                onWriteClick={handleWriteClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>

      <AuthorPromptModal
        isOpen={showAuthorPrompt}
        onClose={() => setShowAuthorPrompt(false)}
      />
    </div>
    </CreatorProgramBadgeProvider>
  )
}
