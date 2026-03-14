import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Home,
  FileText,
  Bell,
  User,
  Compass,
  LayoutDashboard,
  Menu,
  X,
  PenLine,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { blogActivityAPI } from '../services/api'

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
    icon: <Home strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog',
  },
  {
    id: 'my-blogs',
    label: 'My Blogs',
    icon: <FileText strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog/my-blogs', // resolved dynamically in handler
    matchPrefix: '#/user/author',
  },
  {
    id: 'notifications',
    label: 'Activity',
    icon: <Bell strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog/activity',
    matchPrefix: '#/user/blog/activity',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog/profile',
    placeholder: true,
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <Compass strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog/explore',
    placeholder: true,
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard strokeWidth={1.75} className="h-5 w-5" />,
    href: '#/user/blog/dashboard',
    placeholder: true,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useCurrentHash() {
  const [hash, setHash] = useState(window.location.hash || '#/user/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/user/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

function isItemActive(item: NavItem, hash: string): boolean {
  if (item.placeholder) return false
  if (item.id === 'home') return hash === '#/user/blog'
  if (item.id === 'my-blogs') return hash.startsWith('#/user/author')
  if (item.matchPrefix) return hash.startsWith(item.matchPrefix)
  return hash === item.href
}

// ─── Nav (used in both desktop sidebar and mobile drawer) ────────────────────

interface SidePanelNavProps {
  collapsed: boolean
  unreadCount: number
  onClose?: () => void
  onToggleCollapse?: () => void
  showCollapseButton?: boolean
}

function SidePanelNav({
  collapsed,
  unreadCount,
  onClose,
  onToggleCollapse,
  showCollapseButton = false,
}: SidePanelNavProps) {
  const hash = useCurrentHash()
  const { isAuthenticated, user } = useAuth()

  const handleNav = (item: NavItem, e: React.MouseEvent) => {
    if (item.placeholder) {
      e.preventDefault()
      return
    }
    if (item.id === 'my-blogs') {
      e.preventDefault()
      if (!isAuthenticated) {
        window.location.hash = '#/user/login'
      } else {
        window.location.hash = `#/user/author/${user?.id}`
      }
      if (onClose) onClose()
      return
    }
    if (onClose) onClose()
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Logo row ────────────────────────────────────────── */}
      <div
        className={`flex h-[60px] flex-shrink-0 items-center border-b border-gray-200/70 ${
          collapsed ? 'justify-center px-0' : 'justify-between px-5'
        }`}
      >
        {!collapsed && (
          <a
            href="#/user/"
            className="flex items-center gap-2.5 min-w-0"
            onClick={onClose}
            title="Go to NEFOL Store"
          >
            <img
              src="/IMAGES/NEFOL icon.png"
              alt="NEFOL"
              className="h-7 w-auto flex-shrink-0 object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <span className="truncate text-[15px] tracking-wide text-[#1B4965] leading-none">
              <span className="font-bold">NEFOL</span>{' '}
              <span className="font-normal opacity-70">Store</span>
            </span>
          </a>
        )}

        {collapsed && (
          <a href="#/user/" onClick={onClose} title="NEFOL Store">
            <img
              src="/IMAGES/NEFOL icon.png"
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
            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-300/40 hover:text-gray-700 ${
              collapsed ? 'mt-0' : ''
            }`}
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

      {/* ── Nav items ────────────────────────────────────────── */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => {
          const active = isItemActive(item, hash)
          const showBadge = item.id === 'notifications' && unreadCount > 0

          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleNav(item, e)}
              title={item.placeholder ? `${item.label} — coming soon` : item.label}
              className={`group relative flex items-center transition-colors duration-150 ${
                collapsed ? 'justify-center px-0 py-3' : 'gap-3 py-2.5 pr-4'
              } ${
                item.placeholder
                  ? 'cursor-not-allowed'
                  : 'cursor-pointer hover:bg-gray-900/[0.04]'
              }`}
            >
              {/* Left accent bar */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full transition-all duration-150 ${
                  active ? 'h-6 bg-[#1B4965]' : 'h-0 bg-transparent'
                }`}
              />

              {/* Collapsed: icon centered, no left padding offset needed */}
              {/* Expanded: icon with left padding to match accent bar */}
              <span
                className={`relative flex-shrink-0 ${collapsed ? '' : 'pl-5'}`}
              >
                <span
                  className={`block transition-colors duration-150 ${
                    active
                      ? 'text-[#1B4965]'
                      : item.placeholder
                      ? 'text-gray-300'
                      : 'text-gray-400 group-hover:text-gray-700'
                  }`}
                >
                  {item.icon}
                </span>

                {/* Badge on icon (always shown when badge exists) */}
                {showBadge && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>

              {/* Label + trailing badge (expanded only) */}
              {!collapsed && (
                <>
                  <span
                    className={`flex-1 text-[14px] font-medium transition-colors duration-150 ${
                      active
                        ? 'text-[#1B4965]'
                        : item.placeholder
                        ? 'text-gray-300'
                        : 'text-gray-600 group-hover:text-gray-900'
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Trailing unread count */}
                  {showBadge && (
                    <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}

                  {/* "soon" pill */}
                  {item.placeholder && (
                    <span className="text-[11px] text-gray-300">soon</span>
                  )}
                </>
              )}
            </a>
          )
        })}
      </nav>

      {/* ── Write button ─────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-t border-gray-200/70 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <a
            href={isAuthenticated ? '#/user/blog/request?new=1' : '#/user/login'}
            onClick={onClose}
            title="Write"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B4965] text-white transition-colors hover:bg-[#163d54]"
          >
            <PenLine className="h-4 w-4" />
          </a>
        ) : (
          <a
            href={isAuthenticated ? '#/user/blog/request?new=1' : '#/user/login'}
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1B4965] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#163d54]"
          >
            <PenLine className="h-3.5 w-3.5" />
            Write
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────

interface BlogLayoutProps {
  children: React.ReactNode
}

const SIDEBAR_EXPANDED_W = 220
const SIDEBAR_COLLAPSED_W = 68

export default function BlogLayout({ children }: BlogLayoutProps) {
  const { isAuthenticated } = useAuth()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  // ── Unread polling ──────────────────────────────────────────────────────────

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await blogActivityAPI.getUnreadNotificationCount()
      setUnreadCount(data?.count ?? 0)
    } catch { /* silent */ }
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isAuthenticated, fetchUnread])

  useEffect(() => {
    const handler = () => setUnreadCount(0)
    window.addEventListener('blog-notifications-read-all', handler)
    return () => window.removeEventListener('blog-notifications-read-all', handler)
  }, [])

  // ── Mobile menu ────────────────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => setMobileMenuOpen(false)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F4F9F9' }}>

      {/* ── Desktop fixed sidebar ────────────────────────────── */}
      <aside
        className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 border-r border-gray-200/70 overflow-hidden"
        style={{ width: sidebarW, transition: 'width 200ms ease', backgroundColor: '#F4F9F9' }}
      >
        <SidePanelNav
          collapsed={collapsed}
          unreadCount={unreadCount}
          onToggleCollapse={toggleCollapse}
          showCollapseButton
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
            src="/IMAGES/NEFOL icon.png"
            alt="NEFOL"
            className="h-7 w-auto object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <span className="text-[14px] tracking-wide text-[#1B4965] leading-none">
            <span className="font-bold">NEFOL</span>{' '}
            <span className="font-normal opacity-70">Social</span>
          </span>
        </a>

        <a
          href="#/user/blog/activity"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50"
        >
          <Bell className="h-5 w-5" />
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
            className="absolute inset-y-0 left-0 flex w-[220px] flex-col shadow-xl"
            style={{ backgroundColor: '#F4F9F9' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200/70 px-4">
              <span className="text-[14px] tracking-wide text-[#1B4965] leading-none">
                <span className="font-bold">NEFOL</span>{' '}
                <span className="font-normal opacity-70">Social</span>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidePanelNav
                collapsed={false}
                unreadCount={unreadCount}
                onClose={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ────────────────────────────────────── */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  )
}
