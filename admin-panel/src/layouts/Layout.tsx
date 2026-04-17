import React, { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { Search, X, ArrowRight } from 'lucide-react'
import NotificationBell from '../components/NotificationBell'
import Can from '../components/Can'
import { useAuth } from '../contexts/AuthContext'
import { getApiBaseUrl } from '../utils/apiUrl'

interface NavigationSection {
  title: string
  icon: string
  items: NavigationItem[]
  defaultOpen?: boolean
}

interface NavigationItem {
  name: string
  href: string
  icon: string
  description?: string
  badge?: string
  current?: boolean
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
  const { user, logout, hasPageAccess } = useAuth()

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

  // Define all admin options grouped by category - REORGANIZED AS REQUESTED
  const navigationSections: NavigationSection[] = [
    // ========== DASHBOARD ==========
    {
      title: 'Dashboard',
      icon: '🏠',
      defaultOpen: true,
      items: [
        { name: 'Dashboard', href: '/admin/dashboard', icon: '🏠', current: location.pathname === '/admin/dashboard' },
        { name: 'Online Store', href: '/admin/store', icon: '🏪', current: location.pathname === '/admin/store' },
        { name: 'Homepage Layout', href: '/admin/homepage-layout', icon: '🏠', badge: 'NEW', current: location.pathname === '/admin/homepage-layout' },
        { name: 'Product Collections', href: '/admin/product-collections', icon: '🎁', badge: 'NEW', current: location.pathname === '/admin/product-collections' },
        { name: 'Marketplaces', href: '/admin/marketplaces', icon: '🌐', badge: 'NEW', current: location.pathname === '/admin/marketplaces' },
        { name: 'FB Shop Integration', href: '/admin/fb-shop', icon: '🛒', badge: 'NEW', current: location.pathname === '/admin/fb-shop' },
        { name: 'Meta Ads', href: '/admin/meta-ads', icon: '📘', badge: 'NEW', current: location.pathname === '/admin/meta-ads' },
        { name: 'Meta Business', href: '/admin/meta-business', icon: '🏢', badge: 'NEW', current: location.pathname === '/admin/meta-business' },
        { name: 'Google & YouTube', href: '/admin/google', icon: '🔍', current: location.pathname === '/admin/google' },
        { name: 'Facebook & Instagram', href: '/admin/facebook', icon: '📘', current: location.pathname === '/admin/facebook' },
        { name: 'Loyalty Program', href: '/admin/loyalty-program', icon: '⭐', current: location.pathname === '/admin/loyalty-program' },
        { name: 'Cashback System', href: '/admin/cashback', icon: '💰', current: location.pathname === '/admin/cashback' },
      ]
    },

    // ========== PRODUCTS & CATALOG ==========
    {
      title: 'Products & Catalog',
      icon: '📦',
      defaultOpen: true,
      items: [
        { name: 'Products', href: '/admin/products', icon: '📦', current: location.pathname === '/admin/products' },
        { name: 'Categories', href: '/admin/categories', icon: '📁', current: location.pathname === '/admin/categories' },
        { name: 'Product Variants', href: '/admin/product-variants', icon: '🔄', current: location.pathname === '/admin/product-variants' },
        { name: 'Inventory', href: '/admin/inventory', icon: '📊', current: location.pathname === '/admin/inventory' },
        { name: 'Warehouses', href: '/admin/warehouses', icon: '🏭', current: location.pathname === '/admin/warehouses' },
      ]
    },

    // ========== SALES & ORDERS ==========
    {
      title: 'Sales & Orders',
      icon: '🛒',
      defaultOpen: false,
      items: [
        { name: 'Orders', href: '/admin/orders', icon: '📋', current: location.pathname === '/admin/orders' },
        {
          name: 'Unified sales',
          href: '/admin/unified-sales',
          icon: '📊',
          badge: 'NEW',
          current: location.pathname === '/admin/unified-sales',
        },
        { name: 'Shipments', href: '/admin/shipments', icon: '🚚', current: location.pathname === '/admin/shipments' },
        { name: 'Returns', href: '/admin/returns', icon: '↩️', current: location.pathname === '/admin/returns' },
        { name: 'POS System', href: '/admin/pos', icon: '💳', current: location.pathname === '/admin/pos' },
      ]
    },

    // ========== CONTENT & CMS ==========
    {
      title: 'Content & CMS',
      icon: '📄',
      defaultOpen: true,
      items: [
        { name: 'CMS', href: '/admin/cms', icon: '📄', current: location.pathname === '/admin/cms' },
        { name: 'Blog', href: '/admin/blog-requests', icon: '📝', current: location.pathname === '/admin/blog-requests' },
        {
          name: 'Authors',
          href: '/admin/author-management',
          icon: '✍️',
          current: location.pathname === '/admin/author-management',
        },
        { name: 'Video Manager', href: '/admin/video-manager', icon: '🎬', current: location.pathname === '/admin/video-manager' },
        { name: 'Static Pages', href: '/admin/static-pages', icon: '📃', current: location.pathname === '/admin/static-pages' },
        { name: 'Community Management', href: '/admin/community-management', icon: '👥', current: location.pathname === '/admin/community-management' },
      ]
    },
    
    // ========== CUSTOMER & CRM ==========
    {
      title: 'Customer & CRM',
      icon: '📦',
      defaultOpen: true,
      items: [
        { name: 'Customers', href: '/admin/customers', icon: '👥', current: location.pathname === '/admin/customers' },
        { name: 'Users', href: '/admin/users', icon: '👤', current: location.pathname === '/admin/users' },
        { name: 'User Profiles', href: '/admin/user-profiles', icon: '👤', current: location.pathname === '/admin/user-profiles' },
        { name: 'User Notifications', href: '/admin/user-notifications', icon: '🔔', current: location.pathname === '/admin/user-notifications' },
        { name: 'Customer Segmentation', href: '/admin/customer-segmentation', icon: '🎯', current: location.pathname === '/admin/customer-segmentation' },
        { name: 'Custom Audience', href: '/admin/custom-audience', icon: '👥', current: location.pathname === '/admin/custom-audience' },
        { name: 'WhatsApp Subscriptions', href: '/admin/whatsapp-subscriptions', icon: '📱', current: location.pathname === '/admin/whatsapp-subscriptions' },
        { name: 'WhatsApp Chat', href: '/admin/whatsapp-chat', icon: '💬', current: location.pathname === '/admin/whatsapp-chat' },
        { name: 'WhatsApp Management', href: '/admin/whatsapp-management', icon: '📱', current: location.pathname === '/admin/whatsapp-management' },
        { name: 'WhatsApp Notifications', href: '/admin/whatsapp-notifications', icon: '📲', current: location.pathname === '/admin/whatsapp-notifications' },
        { name: 'Journey Funnel', href: '/admin/journey-funnel', icon: '🔄', current: location.pathname === '/admin/journey-funnel' },
        { name: 'Journey Tracking', href: '/admin/journey-tracking', icon: '🗺️', current: location.pathname === '/admin/journey-tracking' },
        { name: 'Live Chat', href: '/admin/live-chat', icon: '🎧', current: location.pathname === '/admin/live-chat' },
      ]
    },
    
    // ========== FINANCE & PAYMENTS ==========
    {
      title: 'Finance & Payments',
      icon: '💳',
      defaultOpen: false,
      items: [
        { name: 'Invoices', href: '/admin/invoices', icon: '📄', current: location.pathname === '/admin/invoices' },
        { name: 'Invoice Settings', href: '/admin/invoice-settings', icon: '⚙️', current: location.pathname === '/admin/invoice-settings' },
        { name: 'Payment', href: '/admin/payment', icon: '💳', current: location.pathname === '/admin/payment' },
        { name: 'Payment Options', href: '/admin/payment-options', icon: '💳', current: location.pathname === '/admin/payment-options' },
        { name: 'Tax', href: '/admin/tax', icon: '💰', current: location.pathname === '/admin/tax' },
      ]
    },

    // ========== MARKETING ==========
    {
      title: 'Marketing',
      icon: '📢',
      defaultOpen: false,
      items: [
        { name: 'Marketing', href: '/admin/marketing', icon: '📢', current: location.pathname === '/admin/marketing' },
        { name: 'Discounts', href: '/admin/discounts', icon: '🏷️', current: location.pathname === '/admin/discounts' },
      ]
    },

    // ========== AFFILIATE & MONETIZATION ==========
    {
      title: 'Affiliate & Monetization',
      icon: '🤝',
      defaultOpen: false,
      items: [
        { name: 'Affiliate Program', href: '/admin/affiliate-program', icon: '🤝', current: location.pathname === '/admin/affiliate-program' },
        { name: 'Affiliate Requests', href: '/admin/affiliate-requests', icon: '📋', badge: '3', current: location.pathname === '/admin/affiliate-requests' },
        { name: 'Collab Requests', href: '/admin/collab-requests', icon: '🎬', badge: pendingCollabCount > 0 ? String(pendingCollabCount) : undefined, current: location.pathname === '/admin/collab-requests' },
        { name: 'Collab Tasks', href: '/admin/collab-tasks', icon: '📋', current: location.pathname === '/admin/collab-tasks' },
        { name: 'Coin Withdrawals', href: '/admin/coin-withdrawals', icon: '💸', current: location.pathname === '/admin/coin-withdrawals' },
        { name: 'Loyalty Program Management', href: '/admin/loyalty-program-management', icon: '⭐', current: location.pathname === '/admin/loyalty-program-management' },
      ]
    },
    
    // ========== ANALYTICS & INSIGHTS ==========
    {
      title: 'Analytics & Insights',
      icon: '📈',
      defaultOpen: false,
      items: [
        { name: 'Analytics', href: '/admin/analytics', icon: '📊', current: location.pathname === '/admin/analytics' },
        { name: 'Advanced Analytics', href: '/admin/advanced-analytics', icon: '📈', current: location.pathname === '/admin/advanced-analytics' },
        { name: 'Actionable Analytics', href: '/admin/actionable-analytics', icon: '📈', current: location.pathname === '/admin/actionable-analytics' },
        { name: 'Audit Logs', href: '/admin/system/audit-logs', icon: '📜', current: location.pathname === '/admin/system/audit-logs' },
      ]
    },
    
    // ========== E-COMMERCE ==========
    {
      title: 'E-Commerce',
      icon: '🛍️',
      defaultOpen: false,
      items: [
        { name: 'Cart & Checkout', href: '/admin/cart-checkout', icon: '🛒', current: location.pathname === '/admin/cart-checkout' },
      ]
    },

    // ========== FORMS & COMMUNICATION ==========
    {
      title: 'Forms & Communication',
      icon: '📋',
      defaultOpen: false,
      items: [
        { name: 'Forms', href: '/admin/forms', icon: '📋', current: location.pathname === '/admin/forms' },
        { name: 'Form Builder', href: '/admin/form-builder', icon: '📋', current: location.pathname === '/admin/form-builder' },
        { name: 'Form Submissions', href: '/admin/form-submissions', icon: '📝', current: location.pathname === '/admin/form-submissions' },
        { name: 'Contact Messages', href: '/admin/contact-messages', icon: '📧', current: location.pathname === '/admin/contact-messages' },
        { name: 'Alert Settings', href: '/admin/system/alerts', icon: '🔔', current: location.pathname === '/admin/system/alerts' },
      ]
    },
    
    // ========== TEAM & ACCESS ==========
    {
      title: 'Team & Access',
      icon: '👥',
      defaultOpen: false,
      items: [
        { name: 'Staff Accounts', href: '/admin/system/staff', icon: '🧑‍💼', current: location.pathname === '/admin/system/staff' },
        { name: 'Admin Management', href: '/admin/system/admin-management', icon: '👨‍💼', current: location.pathname === '/admin/system/admin-management' },
        { name: 'Roles & Permissions', href: '/admin/system/roles', icon: '🗂️', current: location.pathname === '/admin/system/roles' },
        { name: 'Account Security', href: '/admin/account-security', icon: '🔐', current: location.pathname === '/admin/account-security' },
      ]
    },
  ]

  // Navigation sections used for sidebar and search.
  // Page-level permission checks are handled by the <Can> component when rendering links,
  // so we keep all items here to ensure they appear in the dropdown.
  const filteredNavigationSections = navigationSections

  // Flatten all options for search
  const allOptions = filteredNavigationSections.flatMap(section =>
    section.items.map(item => ({
      ...item,
      category: section.title,
      description: `${section.title} - ${item.name}`
    }))
  )

  // Flat list of navigation items for non-dropdown sidebar
  const flatNavigationItems = filteredNavigationSections.flatMap(section =>
    section.items.map(item => ({
      ...item,
      section: section.title,
    }))
  )

  // Permission mapping by path
  const permissionByHref: Record<string, { permission?: string; anyOf?: string[]; role?: string }> = {
    '/admin/orders': { permission: 'orders:read' },
    '/admin/shipments': { permission: 'shipping:read' },
    '/admin/returns': { permission: 'returns:read' },
    '/admin/products': { permission: 'products:read' },
    '/admin/categories': { permission: 'products:read' },
    '/admin/product-variants': { permission: 'products:read' },
    '/admin/inventory': { permission: 'inventory:read' },
    '/admin/warehouses': { permission: 'inventory:read' },
    '/admin/analytics': { permission: 'analytics:read' },
    '/admin/advanced-analytics': { permission: 'analytics:read' },
    '/admin/marketing': { permission: 'marketing:read' },
    '/admin/discounts': { permission: 'discounts:read' },
    '/admin/users': { permission: 'users:read' },
    '/admin/customers': { permission: 'users:read' },
    '/admin/settings': { role: 'admin' },
    '/admin/pos': { anyOf: ['pos:read','pos:update'] },
    '/admin/marketplaces': { role: 'admin' },
    '/admin/fb-shop': { role: 'admin' },
    '/admin/payment-options': { permission: 'payments:read' },
    '/admin/payment': { permission: 'payments:read' },
    '/admin/invoices': { permission: 'payments:read' },
    '/admin/cms': { permission: 'cms:read' },
    '/admin/blog-requests': { permission: 'cms:read' },
    '/admin/author-management': { permission: 'cms:read' },
    '/admin/video-manager': { permission: 'cms:read' },
    '/admin/static-pages': { permission: 'cms:read' },
    '/admin/whatsapp-management': { permission: 'notifications:read' },
    '/admin/whatsapp-notifications': { permission: 'notifications:read' },
    '/admin/whatsapp-subscriptions': { permission: 'notifications:read' },
    '/admin/whatsapp-chat': { permission: 'notifications:read' },
  }


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

          {/* Flat Navigation (no dropdown sections) */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {flatNavigationItems.map((item) => {
              const gate = permissionByHref[item.href] || {}
              return (
                <Can key={item.href} permission={gate.permission} anyOf={gate.anyOf} role={gate.role}>
                  <Link
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      item.current
                        ? 'bg-[var(--brand-accent-soft)] text-[var(--brand-accent)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--brand-highlight)] hover:text-[var(--text-primary)]'
                    }`}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        setIsSidebarOpen(false)
                      }
                    }}
                  >
                    <span className="text-base flex-shrink-0">{item.icon}</span>
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.badge && (
                      <span className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold bg-[var(--brand-accent)] text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </Can>
              )
            })}
          </nav>

          {/* Settings */}
          <div className="p-4 border-t border-[var(--brand-border)]">
            <Link to="/admin/settings" className="nav-item">
              <span className="text-lg">⚙️</span>
              <span className="font-medium">Settings</span>
            </Link>
          </div>
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
                        <span className="text-lg">{option.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[var(--text-primary)] font-medium">{option.name}</div>
                          <div className="text-sm text-[var(--text-muted)] truncate">{option.description}</div>
                          <div className="text-xs text-[var(--brand-accent)]">{option.category}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
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



