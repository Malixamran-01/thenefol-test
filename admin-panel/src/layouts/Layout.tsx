import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  type LucideIcon,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Users,
  Wallet,
  Megaphone,
  Handshake,
  BarChart3,
  ClipboardList,
  UserCog,
  Settings,
  Store,
  Globe2,
  Radio,
  TextSearch,
  Share2,
  Gift,
} from 'lucide-react'
import NotificationBell from '../components/NotificationBell'
import { useAuth } from '../contexts/AuthContext'
import { getApiBaseUrl } from '../utils/apiUrl'
import { Nav, NAV_CATALOG_FINE_CODES, NavCatalog } from '../config/rbacNav'

interface NavigationSection {
  title: string
  SectionIcon: LucideIcon
  /** RBAC: `nav:*` code from rbac catalog; sidebar row hidden if missing (admins see all). */
  requiredPermission: string
  /** If set, section is visible when the user has any of these permissions (e.g. parent or fine-grained). */
  requiredAnyOf?: string[]
  items: NavigationItem[]
  defaultOpen?: boolean
}

interface NavigationItem {
  name: string
  href: string
  description?: string
  badge?: string
  current?: boolean
  /** Optional `nav:*` code for this line (e.g. `nav:catalog:products`). Parent `nav:catalog` still grants all lines. */
  requiredPermission?: string
}

const Layout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  /** Mobile drawer: closed by default. Desktop (lg+) sidebar is always visible via CSS. */
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [pendingCollabCount, setPendingCollabCount] = useState(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, logout, hasPermission, hasRole } = useAuth()
  const canNav = (code: string) => hasRole('admin') || hasPermission(code)

  const canAccessSection = (s: NavigationSection) => {
    if (hasRole('admin')) return true
    if (s.requiredAnyOf?.length) return s.requiredAnyOf.some((code) => hasPermission(code))
    return canNav(s.requiredPermission)
  }

  const canAccessCatalogItem = (item: NavigationItem) => {
    if (hasRole('admin')) return true
    if (hasPermission(Nav.catalog)) return true
    if (item.requiredPermission) return hasPermission(item.requiredPermission)
    return false
  }

  const getVisibleItems = (section: NavigationSection): NavigationItem[] => {
    if (section.title === 'Products & catalog') {
      return section.items.filter((item) => canAccessCatalogItem(item))
    }
    return section.items
  }

  // Fetch pending collab count for sidebar badge
  useEffect(() => {
    const fetchPendingCollab = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-user-role': 'admin',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
        const res = await fetch(`${getApiBaseUrl()}/admin/collab-applications?status=pending&limit=1`, { headers })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          setPendingCollabCount(data?.pagination?.total ?? 0)
        }
      } catch { /* silent */ }
    }
    fetchPendingCollab()
    const interval = setInterval(fetchPendingCollab, 60_000)
    return () => clearInterval(interval)
  }, [])
  
  const userInitials = user?.name
    ? user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()
    : 'NA'

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  // Grouped by RBAC division (see backend `rbacCatalog.ts`). Admins bypass via `hasPermission` + role `admin`.
  const navigationSections: NavigationSection[] = [
    {
      title: 'Overview',
      SectionIcon: LayoutDashboard,
      requiredPermission: Nav.overview,
      defaultOpen: true,
      items: [{ name: 'Dashboard', href: '/admin/dashboard', current: location.pathname === '/admin/dashboard' }],
    },
    {
      title: 'Store & homepage',
      SectionIcon: Store,
      requiredPermission: Nav.store,
      defaultOpen: false,
      items: [
        { name: 'Online store', href: '/admin/store', current: location.pathname === '/admin/store' },
        { name: 'Homepage layout', href: '/admin/homepage-layout', badge: 'NEW', current: location.pathname === '/admin/homepage-layout' },
      ],
    },
    {
      title: 'Sales channels',
      SectionIcon: Globe2,
      requiredPermission: Nav.channels,
      defaultOpen: false,
      items: [
        { name: 'Marketplaces', href: '/admin/marketplaces', badge: 'NEW', current: location.pathname === '/admin/marketplaces' },
        { name: 'FB Shop integration', href: '/admin/fb-shop', badge: 'NEW', current: location.pathname === '/admin/fb-shop' },
      ],
    },
    {
      title: 'Meta',
      SectionIcon: Radio,
      requiredPermission: Nav.meta,
      defaultOpen: false,
      items: [
        {
          name: 'Meta (Business & Ads)',
          href: '/admin/meta',
          badge: 'NEW',
          current:
            location.pathname === '/admin/meta' ||
            location.pathname === '/admin/meta-ads' ||
            location.pathname === '/admin/meta-business',
        },
      ],
    },
    {
      title: 'Google & YouTube',
      SectionIcon: TextSearch,
      requiredPermission: Nav.google,
      defaultOpen: false,
      items: [{ name: 'Google & YouTube', href: '/admin/google', current: location.pathname === '/admin/google' }],
    },
    {
      title: 'Facebook & Instagram',
      SectionIcon: Share2,
      requiredPermission: Nav.facebook,
      defaultOpen: false,
      items: [{ name: 'Facebook & Instagram', href: '/admin/facebook', current: location.pathname === '/admin/facebook' }],
    },
    {
      title: 'Loyalty & rewards',
      SectionIcon: Gift,
      requiredPermission: Nav.loyalty,
      defaultOpen: false,
      items: [
        { name: 'Loyalty program', href: '/admin/loyalty-program', current: location.pathname === '/admin/loyalty-program' },
        { name: 'Cashback system', href: '/admin/cashback', current: location.pathname === '/admin/cashback' },
      ],
    },

    {
      title: 'Products & catalog',
      SectionIcon: Package,
      requiredPermission: Nav.catalog,
      requiredAnyOf: [Nav.catalog, ...NAV_CATALOG_FINE_CODES],
      defaultOpen: true,
      items: [
        { name: 'Products', href: '/admin/products', requiredPermission: NavCatalog.products, current: location.pathname === '/admin/products' },
        { name: 'Catalog', href: '/admin/categories', requiredPermission: NavCatalog.categories, current: location.pathname === '/admin/categories' },
        {
          name: 'Product collections',
          href: '/admin/product-collections',
          badge: 'NEW',
          requiredPermission: NavCatalog.collections,
          current: location.pathname === '/admin/product-collections',
        },
        {
          name: 'Product variants',
          href: '/admin/product-variants',
          requiredPermission: NavCatalog.variants,
          current: location.pathname === '/admin/product-variants',
        },
        { name: 'Inventory', href: '/admin/inventory', requiredPermission: NavCatalog.inventory, current: location.pathname === '/admin/inventory' },
        { name: 'Warehouses', href: '/admin/warehouses', requiredPermission: NavCatalog.warehouses, current: location.pathname === '/admin/warehouses' },
        { name: 'Discounts', href: '/admin/discounts', requiredPermission: NavCatalog.discounts, current: location.pathname === '/admin/discounts' },
      ],
    },

    {
      title: 'Sales & e-commerce',
      SectionIcon: ShoppingCart,
      requiredPermission: Nav.sales,
      defaultOpen: false,
      items: [
        { name: 'Orders', href: '/admin/orders', current: location.pathname === '/admin/orders' || location.pathname.startsWith('/admin/orders/') },
        {
          name: 'Unified sales',
          href: '/admin/unified-sales',
          badge: 'NEW',
          current: location.pathname === '/admin/unified-sales',
        },
        { name: 'Shipments', href: '/admin/shipments', current: location.pathname === '/admin/shipments' },
        { name: 'Returns', href: '/admin/returns', current: location.pathname === '/admin/returns' },
        { name: 'POS system', href: '/admin/pos', current: location.pathname === '/admin/pos' },
        { name: 'Cart & checkout', href: '/admin/cart-checkout', current: location.pathname === '/admin/cart-checkout' },
      ],
    },

    {
      title: 'Content & CMS',
      SectionIcon: FileText,
      requiredPermission: Nav.content,
      defaultOpen: true,
      items: [
        { name: 'CMS', href: '/admin/cms', current: location.pathname === '/admin/cms' },
        { name: 'Blog', href: '/admin/blog-requests', current: location.pathname === '/admin/blog-requests' },
        { name: 'Authors', href: '/admin/author-management', current: location.pathname === '/admin/author-management' },
        { name: 'Video manager', href: '/admin/video-manager', current: location.pathname === '/admin/video-manager' },
        { name: 'Static pages', href: '/admin/static-pages', current: location.pathname === '/admin/static-pages' },
        { name: 'Community management', href: '/admin/community-management', current: location.pathname === '/admin/community-management' },
      ],
    },

    {
      title: 'Customer & CRM',
      SectionIcon: Users,
      requiredPermission: Nav.crm,
      defaultOpen: true,
      items: [
        { name: 'Customers', href: '/admin/customers', current: location.pathname === '/admin/customers' },
        { name: 'Users', href: '/admin/users', current: location.pathname === '/admin/users' || location.pathname.startsWith('/admin/users/') },
        { name: 'User profiles', href: '/admin/user-profiles', current: location.pathname === '/admin/user-profiles' },
        { name: 'User notifications', href: '/admin/user-notifications', current: location.pathname === '/admin/user-notifications' },
        { name: 'Customer segmentation', href: '/admin/customer-segmentation', current: location.pathname === '/admin/customer-segmentation' },
        { name: 'Custom audience', href: '/admin/custom-audience', current: location.pathname === '/admin/custom-audience' },
        { name: 'WhatsApp subscriptions', href: '/admin/whatsapp-subscriptions', current: location.pathname === '/admin/whatsapp-subscriptions' },
        { name: 'WhatsApp chat', href: '/admin/whatsapp-chat', current: location.pathname === '/admin/whatsapp-chat' },
        { name: 'WhatsApp management', href: '/admin/whatsapp-management', current: location.pathname === '/admin/whatsapp-management' },
        { name: 'WhatsApp notifications', href: '/admin/whatsapp-notifications', current: location.pathname === '/admin/whatsapp-notifications' },
        { name: 'Journey funnel', href: '/admin/journey-funnel', current: location.pathname === '/admin/journey-funnel' },
        { name: 'Journey tracking', href: '/admin/journey-tracking', current: location.pathname === '/admin/journey-tracking' },
        { name: 'Live chat', href: '/admin/live-chat', current: location.pathname === '/admin/live-chat' },
      ],
    },

    {
      title: 'Finance & payments',
      SectionIcon: Wallet,
      requiredPermission: Nav.finance,
      defaultOpen: false,
      items: [
        { name: 'Invoices', href: '/admin/invoices', current: location.pathname === '/admin/invoices' },
        { name: 'Invoice settings', href: '/admin/invoice-settings', current: location.pathname === '/admin/invoice-settings' },
        { name: 'Payment', href: '/admin/payment', current: location.pathname === '/admin/payment' },
        { name: 'Payment options', href: '/admin/payment-options', current: location.pathname === '/admin/payment-options' },
        { name: 'Tax', href: '/admin/tax', current: location.pathname === '/admin/tax' },
      ],
    },

    {
      title: 'Marketing',
      SectionIcon: Megaphone,
      requiredPermission: Nav.marketing,
      defaultOpen: false,
      items: [{ name: 'Marketing', href: '/admin/marketing', current: location.pathname === '/admin/marketing' }],
    },

    {
      title: 'Affiliate & monetization',
      SectionIcon: Handshake,
      requiredPermission: Nav.affiliate,
      defaultOpen: false,
      items: [
        { name: 'Affiliate program', href: '/admin/affiliate-program', current: location.pathname === '/admin/affiliate-program' },
        { name: 'Affiliate requests', href: '/admin/affiliate-requests', badge: '3', current: location.pathname === '/admin/affiliate-requests' },
        { name: 'Collab requests', href: '/admin/collab-requests', badge: pendingCollabCount > 0 ? String(pendingCollabCount) : undefined, current: location.pathname === '/admin/collab-requests' },
        { name: 'Collab tasks', href: '/admin/collab-tasks', current: location.pathname === '/admin/collab-tasks' },
        { name: 'Coin withdrawals', href: '/admin/coin-withdrawals', current: location.pathname === '/admin/coin-withdrawals' },
        { name: 'Loyalty program management', href: '/admin/loyalty-program-management', current: location.pathname === '/admin/loyalty-program-management' },
      ],
    },

    {
      title: 'Analytics & insights',
      SectionIcon: BarChart3,
      requiredPermission: Nav.analytics,
      defaultOpen: false,
      items: [
        { name: 'Analytics', href: '/admin/analytics', current: location.pathname === '/admin/analytics' },
        { name: 'Advanced analytics', href: '/admin/advanced-analytics', current: location.pathname === '/admin/advanced-analytics' },
        { name: 'Actionable analytics', href: '/admin/actionable-analytics', current: location.pathname === '/admin/actionable-analytics' },
        { name: 'Audit logs', href: '/admin/system/audit-logs', current: location.pathname === '/admin/system/audit-logs' },
      ],
    },

    {
      title: 'Forms & communication',
      SectionIcon: ClipboardList,
      requiredPermission: Nav.forms,
      defaultOpen: false,
      items: [
        { name: 'Forms', href: '/admin/forms', current: location.pathname === '/admin/forms' },
        { name: 'Form builder', href: '/admin/form-builder', current: location.pathname === '/admin/form-builder' },
        { name: 'Form submissions', href: '/admin/form-submissions', current: location.pathname === '/admin/form-submissions' },
        { name: 'Contact messages', href: '/admin/contact-messages', current: location.pathname === '/admin/contact-messages' },
        { name: 'Alert settings', href: '/admin/system/alerts', current: location.pathname === '/admin/system/alerts' },
      ],
    },

    {
      title: 'Team & access',
      SectionIcon: UserCog,
      requiredPermission: Nav.team,
      defaultOpen: false,
      items: [
        { name: 'Staff accounts', href: '/admin/system/staff', current: location.pathname === '/admin/system/staff' },
        { name: 'Admin management', href: '/admin/system/admin-management', current: location.pathname === '/admin/system/admin-management' },
        { name: 'Roles & permissions', href: '/admin/system/roles', current: location.pathname === '/admin/system/roles' },
        { name: 'Account security', href: '/admin/account-security', current: location.pathname === '/admin/account-security' },
      ],
    },
  ]

  const filteredNavigationSections = navigationSections
    .filter((s) => canAccessSection(s))
    .map((s) => ({ ...s, items: getVisibleItems(s) }))
    .filter((s) => s.items.length > 0)

  // Collapsible groups: `true` = expanded; when user has not toggled, we derive from defaultOpen + active route
  const [sectionOpenOverride, setSectionOpenOverride] = useState<Record<string, boolean>>({})

  const isSectionOpen = (section: NavigationSection) => {
    if (Object.prototype.hasOwnProperty.call(sectionOpenOverride, section.title)) {
      return sectionOpenOverride[section.title]!
    }
    return section.items.some((i) => i.current) || section.defaultOpen === true
  }

  const toggleSection = (title: string) => {
    const section = filteredNavigationSections.find((s) => s.title === title)
    if (!section) return
    const wasOpen = isSectionOpen(section)
    setSectionOpenOverride((prev) => ({ ...prev, [title]: !wasOpen }))
  }

  // When the route changes, expand the group that contains the current page (visible items only for gated sections)
  useEffect(() => {
    setSectionOpenOverride((prev) => {
      const next = { ...prev }
      for (const sec of navigationSections) {
        if (getVisibleItems(sec).some((i) => i.current)) {
          next[sec.title] = true
        }
      }
      return next
    })
    // navigationSections is rebuilt each render with fresh `current` flags; we only need to react to URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  // Flatten all options for search
  const allOptions = filteredNavigationSections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      category: section.title,
      description: `${section.title} - ${item.name}`,
    }))
  )

  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const queryLower = query.toLowerCase()
    const filtered = allOptions.filter(option => {
      const nameMatch = option.name.toLowerCase().includes(queryLower)
      const descriptionMatch = option.description.toLowerCase().includes(queryLower)
      const categoryMatch = option.category.toLowerCase().includes(queryLower)
      const hrefMatch = option.href.toLowerCase().includes(queryLower)
      // Also search by removing common words and checking individual words
      const nameWords = option.name.toLowerCase().split(/\s+/)
      const categoryWords = option.category.toLowerCase().split(/\s+/)
      const wordMatch = nameWords.some(word => word.includes(queryLower)) || 
                       categoryWords.some(word => word.includes(queryLower))
      
      return nameMatch || descriptionMatch || categoryMatch || hrefMatch || wordMatch
    })

    setSearchResults(filtered)
    setShowSearchResults(true)
  }

  const handleSearchSelect = (option: any) => {
    navigate(option.href)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  const handleSearchClear = () => {
    setSearchQuery('')
    setSearchResults([])
    setShowSearchResults(false)
  }

  // Close search results when clicking outside and handle keyboard shortcuts
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.search-container')) {
        setShowSearchResults(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = document.querySelector('.search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
      
      // Escape to close search results
      if (event.key === 'Escape') {
        setShowSearchResults(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  /** Close mobile drawer on navigation */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }, [location.pathname])

  /** Prevent background scroll when mobile drawer is open */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const apply = () => {
      if (mq.matches && isSidebarOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.style.overflow = ''
    }
  }, [isSidebarOpen])

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden bg-[var(--brand-background)] text-[var(--text-primary)]">
      {/* Mobile overlay — only when drawer open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar: off-canvas on mobile; always visible lg+ */}
      <div
        className={`sidebar flex h-screen w-[min(18rem,88vw)] max-w-[100vw] flex-shrink-0 fixed left-0 top-0 z-50 overflow-y-auto border-r border-[var(--brand-border)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full min-h-0 w-full">
          {/* Logo */}
          <div className="admin-inline-row gap-2 p-4 sm:p-6 border-b border-[var(--brand-border)]">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
              <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-lg sm:text-xl font-bold text-[var(--text-primary)] truncate">NEFOL® Admin</span>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden flex-shrink-0 p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--brand-highlight)]"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Grouped navigation: collapsible sections */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3" aria-label="Main navigation">
            <div className="space-y-1">
              {filteredNavigationSections.map((section) => {
                const open = isSectionOpen(section)
                const SectionIcon = section.SectionIcon
                const hasActiveChild = section.items.some((i) => i.current)
                return (
                  <div key={section.title} className="rounded-lg">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-semibold transition-colors ${
                        hasActiveChild
                          ? 'bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--brand-highlight)]'
                      }`}
                      aria-expanded={open}
                    >
                      {open ? (
                        <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-70" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" aria-hidden />
                      )}
                      <SectionIcon className="h-4 w-4 flex-shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 flex-1 truncate leading-snug">{section.title}</span>
                    </button>
                    {open && (
                      <ul className="ml-1.5 mt-0.5 space-y-px border-l border-[var(--brand-border)] py-1 pl-2.5">
                        {section.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              className={`flex items-center gap-2 rounded-md py-1.5 pl-1 pr-2 text-sm transition-colors ${
                                item.current
                                  ? 'bg-[var(--brand-accent-soft)] font-medium text-[var(--brand-accent)]'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--brand-highlight)] hover:text-[var(--text-primary)]'
                              }`}
                              onClick={() => {
                                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                                  setIsSidebarOpen(false)
                                }
                              }}
                            >
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              {item.badge && (
                                <span className="flex-shrink-0 rounded-full bg-[var(--brand-accent)] px-1.5 py-0.5 text-[10px] font-semibold text-white sm:text-xs">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </nav>

          {/* Settings */}
          {canNav(Nav.settings) && (
            <div className="border-t border-[var(--brand-border)] p-3">
              <Link
                to="/admin/settings"
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--brand-highlight)] hover:text-[var(--text-primary)]"
              >
                <Settings className="h-4 w-4 flex-shrink-0 opacity-80" aria-hidden />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main: full width on mobile; offset only when sidebar is docked on lg+ */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-72">
        {/* Top Header */}
        <header className="flex-shrink-0 border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-2 py-2.5 sm:px-4 sm:py-3 lg:px-6">
          {/* Single navbar row on all breakpoints: menu | search | actions */}
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="flex-shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--brand-highlight)] hover:text-[var(--text-primary)] lg:hidden"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search Bar */}
            <div className="search-container relative min-w-0 flex-1 sm:max-w-xl lg:max-w-2xl">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder="Search… (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="search-input w-full min-w-0 pl-9 sm:pl-10 pr-10 sm:pr-20 py-2 text-sm sm:text-base border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleSearchClear}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] p-1"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                  )}
                  {!searchQuery && (
                    <div className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 sm:block">
                      <kbd className="rounded bg-[var(--brand-highlight)] px-2 py-1 text-[10px] text-[var(--text-muted)] sm:text-xs">Ctrl+K</kbd>
                    </div>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-[60] mt-2 max-h-[min(24rem,70vh)] overflow-y-auto rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl">
                    {searchResults.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleSearchSelect(option)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--brand-highlight)] text-left border-b border-[var(--brand-border)] last:border-b-0"
                      >
                        <Search className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)] opacity-60" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-[var(--text-primary)]">{option.name}</div>
                          <div className="truncate text-sm text-[var(--text-muted)]">{option.description}</div>
                          <div className="text-xs text-[var(--brand-accent)]">{option.category}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" aria-hidden />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* No Results */}
                {showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <div className="absolute top-full left-0 right-0 z-[60] mt-2 rounded-lg border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 shadow-xl">
                    <div className="text-[var(--text-muted)] text-center">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
                      <p>No options found for "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try searching for:</p>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {['products', 'orders', 'analytics', 'marketing', 'customers', 'cms', 'blog', 'inventory', 'finance', 'payments', 'affiliate', 'forms', 'whatsapp', 'users', 'categories'].map((term) => (
                          <button
                            key={term}
                            onClick={() => handleSearch(term)}
                            className="px-2 py-1 bg-[var(--brand-highlight)] hover:bg-[var(--brand-accent-soft)] rounded text-xs text-[var(--text-secondary)]"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-2 md:gap-3">
              <div className="hidden items-center gap-2 lg:flex">
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                <span className="max-w-[9rem] truncate text-sm text-[var(--text-muted)]">2 live visitors</span>
              </div>
              <NotificationBell />
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(prev => !prev)}
                  className="flex max-w-[100%] items-center gap-1.5 rounded-lg p-1 hover:bg-[var(--brand-highlight)] focus:outline-none sm:gap-2 sm:px-2"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-secondary sm:h-9 sm:w-9">
                    <span className="text-xs font-bold text-white sm:text-sm">{userInitials}</span>
                  </div>
                  <div className="hidden min-w-0 text-left md:block">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{user?.role || 'admin'}</p>
                  </div>
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 z-[70] mt-2 w-[min(16rem,calc(100vw-1.5rem))] rounded-lg border border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        to="/admin/account-security"
                        className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        Account Security
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 dark:border-gray-800">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-800"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[var(--brand-background)]">
          <div className="page-container w-full max-w-[100vw] min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout



