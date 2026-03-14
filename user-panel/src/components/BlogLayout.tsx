import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Home,
  BookOpen,
  Bell,
  User,
  Compass,
  LayoutDashboard,
  Menu,
  X,
  PenLine,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { blogActivityAPI } from '../services/api'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  href: string
  matchPrefix?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home className="h-[22px] w-[22px]" />,
    href: '#/user/',
  },
  {
    id: 'blog',
    label: 'Blog',
    icon: <BookOpen className="h-[22px] w-[22px]" />,
    href: '#/user/blog',
    matchPrefix: '#/user/blog',
  },
  {
    id: 'notifications',
    label: 'Activity',
    icon: <Bell className="h-[22px] w-[22px]" />,
    href: '#/user/blog/activity',
    matchPrefix: '#/user/blog/activity',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: <User className="h-[22px] w-[22px]" />,
    href: '#/user/blog/author-profile',
    matchPrefix: '#/user/author',
  },
  {
    id: 'explore',
    label: 'Explore',
    icon: <Compass className="h-[22px] w-[22px]" />,
    href: '#/user/blog/explore',
    matchPrefix: '#/user/blog/explore',
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-[22px] w-[22px]" />,
    href: '#/user/blog/dashboard',
    matchPrefix: '#/user/blog/dashboard',
  },
]

function useCurrentHash() {
  const [hash, setHash] = useState(window.location.hash || '#/user/')
  useEffect(() => {
    const handler = () => setHash(window.location.hash || '#/user/')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return hash
}

function SidePanelNav({ onClose, unreadCount }: { onClose?: () => void; unreadCount: number }) {
  const hash = useCurrentHash()
  const { isAuthenticated } = useAuth()

  const isActive = (item: NavItem) => {
    if (item.id === 'home') {
      return hash === '#/user/' || hash === '#/user'
    }
    // Blog: active only on exact blog home, not on sub-paths like /activity
    if (item.id === 'blog') {
      return (
        hash === '#/user/blog' ||
        (hash.startsWith('#/user/blog/') &&
          !hash.startsWith('#/user/blog/activity') &&
          !hash.startsWith('#/user/blog/explore') &&
          !hash.startsWith('#/user/blog/dashboard'))
      )
    }
    if (item.matchPrefix) {
      return hash.startsWith(item.matchPrefix)
    }
    return hash === item.href
  }

  const handleNav = (item: NavItem, e: React.MouseEvent) => {
    // Placeholder items — not yet implemented
    if (['explore', 'dashboard', 'profile'].includes(item.id)) {
      e.preventDefault()
      return
    }
    if (onClose) onClose()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 flex-shrink-0 items-center px-5">
        <a href="#/user/blog" className="flex items-center gap-2" onClick={onClose}>
          <img
            src="/IMAGES/NEFOL icon.png"
            alt="NEFOL"
            className="h-8 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="text-[15px] font-semibold tracking-wide text-[#1B4965]">NEFOL</span>
        </a>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item)
          const isPlaceholder = ['explore', 'dashboard', 'profile'].includes(item.id)
          const showBadge = item.id === 'notifications' && unreadCount > 0
          return (
            <a
              key={item.id}
              href={item.href}
              onClick={(e) => handleNav(item, e)}
              title={isPlaceholder ? `${item.label} — coming soon` : item.label}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#edf4f9] text-[#1B4965]'
                  : isPlaceholder
                  ? 'cursor-not-allowed text-gray-300'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {/* Icon — wrap in relative for badge */}
              <span className="relative flex-shrink-0">
                <span
                  className={`transition-colors ${
                    active ? 'text-[#1B4965]' : isPlaceholder ? 'text-gray-300' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                >
                  {item.icon}
                </span>
                {showBadge && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </span>

              <span className="flex-1">{item.label}</span>

              {/* Unread count next to label (only when sidebar is not collapsed) */}
              {showBadge && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}

              {isPlaceholder && (
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
                  soon
                </span>
              )}
            </a>
          )
        })}
      </nav>

      {/* Bottom — Create button */}
      <div className="flex-shrink-0 border-t border-gray-100 p-3">
        <a
          href={isAuthenticated ? '#/user/blog/request?new=1' : '#/user/login'}
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B4965] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#163d54]"
        >
          <PenLine className="h-4 w-4" />
          Write
        </a>
      </div>
    </div>
  )
}

interface BlogLayoutProps {
  children: React.ReactNode
}

export default function BlogLayout({ children }: BlogLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const { isAuthenticated } = useAuth()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const data = await blogActivityAPI.getUnreadNotificationCount()
      setUnreadCount(data?.count ?? 0)
    } catch { /* silent */ }
  }, [isAuthenticated])

  // Poll unread count every 30s
  useEffect(() => {
    if (!isAuthenticated) return
    fetchUnread()
    pollRef.current = setInterval(fetchUnread, 30_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isAuthenticated, fetchUnread])

  // Reset badge when user opens activity page (page dispatches 'blog-notifications-read-all')
  useEffect(() => {
    const handler = () => setUnreadCount(0)
    window.addEventListener('blog-notifications-read-all', handler)
    return () => window.removeEventListener('blog-notifications-read-all', handler)
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    const handler = () => setMobileMenuOpen(false)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  return (
    <div className="flex min-h-screen bg-[#F4F9F9]">

      {/* ── Desktop side panel ───────────────────────────── */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-shrink-0 lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 border-r border-gray-200 bg-white">
        <SidePanelNav unreadCount={unreadCount} />
      </aside>

      {/* ── Mobile: top bar with hamburger ───────────────── */}
      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
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
          <span className="text-[14px] font-semibold tracking-wide text-[#1B4965]">NEFOL</span>
        </a>
        {/* Spacer to keep logo centered */}
        <div className="h-9 w-9" />
      </div>

      {/* ── Mobile slide-in drawer ────────────────────────── */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex h-14 flex-shrink-0 items-center justify-between px-4 border-b border-gray-100">
              <span className="text-[14px] font-semibold text-[#1B4965]">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidePanelNav onClose={() => setMobileMenuOpen(false)} unreadCount={unreadCount} />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────── */}
      <main className="flex-1 lg:ml-60">
        {/* Push content below mobile top bar */}
        <div className="pt-14 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
