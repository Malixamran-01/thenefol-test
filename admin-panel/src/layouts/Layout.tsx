import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom'
import { Search, X, ArrowRight } from 'lucide-react'
import NotificationBell from '../components/NotificationBell'
import Can from '../components/Can'

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])

  // Define all admin options grouped by category
  const navigationSections: NavigationSection[] = [
    {
      title: 'Overview',
      icon: '📊',
      defaultOpen: true,
      items: [
        { name: 'Dashboard', href: '/admin/', icon: '🏠', current: location.pathname === '/admin/' },
      ]
    },
    {
      title: 'Sales & Orders',
      icon: '📦',
      defaultOpen: true,
      items: [
        { name: 'Orders', href: '/admin/orders', icon: '📦', badge: '4', current: location.pathname === '/admin/orders' },
        { name: 'Shipments', href: '/admin/shipments', icon: '🚚', current: location.pathname === '/admin/shipments' },
        { name: 'Returns', href: '/admin/returns', icon: '↩️', current: location.pathname === '/admin/returns' },
      ]
    },
    {
      title: 'Catalog Management',
      icon: '🛍️',
      items: [
        { name: 'Products', href: '/admin/products', icon: '🛍️', current: location.pathname === '/admin/products' },
        // Product Variants - Hidden since all products have single size (no variants needed)
        // { name: 'Product Variants', href: '/admin/product-variants', icon: '🎨', badge: 'NEW', current: location.pathname === '/admin/product-variants' },
        { name: 'Categories', href: '/admin/categories', icon: '📂', current: location.pathname === '/admin/categories' },
        { name: 'Inventory', href: '/admin/inventory', icon: '📊', badge: 'NEW', current: location.pathname === '/admin/inventory' },
      ]
    },
    {
      title: 'Customers & CRM',
      icon: '👥',
      items: [
        { name: 'Customers', href: '/admin/customers', icon: '👥', current: location.pathname === '/admin/customers' },
        { name: 'Customer Segmentation', href: '/admin/customer-segmentation', icon: '🎯', current: location.pathname === '/admin/customer-segmentation' },
        { name: 'Journey Tracking', href: '/admin/journey-tracking', icon: '🗺️', current: location.pathname === '/admin/journey-tracking' },
        { name: 'Journey Funnel', href: '/admin/journey-funnel', icon: '🔄', current: location.pathname === '/admin/journey-funnel' },
      ]
    },
    {
      title: 'Customer Engagement',
      icon: '💬',
      items: [
        { name: 'Live Chat', href: '/admin/live-chat', icon: '🎧', current: location.pathname === '/admin/live-chat' },
        { name: 'WhatsApp Chat', href: '/admin/whatsapp-chat', icon: '💬', current: location.pathname === '/admin/whatsapp-chat' },
        { name: 'Contact Messages', href: '/admin/contact-messages', icon: '📧', current: location.pathname === '/admin/contact-messages' },
        { name: 'Loyalty Program', href: '/admin/loyalty-program', icon: '⭐', current: location.pathname === '/admin/loyalty-program' },
        { name: 'Affiliate Program', href: '/admin/affiliate-program', icon: '🤝', current: location.pathname === '/admin/affiliate-program' },
        { name: 'Affiliate Requests', href: '/admin/affiliate-requests', icon: '📋', badge: '3', current: location.pathname === '/admin/affiliate-requests' },
        { name: 'Cashback System', href: '/admin/cashback', icon: '💰', current: location.pathname === '/admin/cashback' },
      ]
    },
    {
      title: 'Marketing',
      icon: '📢',
      items: [
        { name: 'Marketing', href: '/admin/marketing', icon: '📢', current: location.pathname === '/admin/marketing' },
        { name: 'Meta Ads', href: '/admin/meta-ads', icon: '📘', badge: 'NEW', current: location.pathname === '/admin/meta-ads' },
        { name: 'WhatsApp Subscriptions', href: '/admin/whatsapp-subscriptions', icon: '📱', current: location.pathname === '/admin/whatsapp-subscriptions' },
        { name: 'Discounts', href: '/admin/discounts', icon: '🏷️', current: location.pathname === '/admin/discounts' },
        { name: 'Custom Audience', href: '/admin/custom-audience', icon: '👥', current: location.pathname === '/admin/custom-audience' },
        { name: 'Omni Channel', href: '/admin/omni-channel', icon: '🌐', current: location.pathname === '/admin/omni-channel' },
      ]
    },
    {
      title: 'AI Features',
      icon: '🤖',
      items: [
        { name: 'AI Box', href: '/admin/ai-box', icon: '🤖', current: location.pathname === '/admin/ai-box' },
        { name: 'AI Personalization', href: '/admin/ai-personalization', icon: '🎨', current: location.pathname === '/admin/ai-personalization' },
      ]
    },
    {
      title: 'Analytics',
      icon: '📈',
      items: [
        { name: 'Analytics', href: '/admin/analytics', icon: '📊', current: location.pathname === '/admin/analytics' },
        { name: 'Actionable Analytics', href: '/admin/actionable-analytics', icon: '📈', current: location.pathname === '/admin/actionable-analytics' },
      ]
    },
    {
      title: 'Finance',
      icon: '💰',
      items: [
        { name: 'Invoices', href: '/admin/invoices', icon: '🧾', current: location.pathname === '/admin/invoices' },
        { name: 'Tax', href: '/admin/tax', icon: '💰', current: location.pathname === '/admin/tax' },
        { name: 'Payment Options', href: '/admin/payment-options', icon: '💳', current: location.pathname === '/admin/payment-options' },
        { name: 'Coin Withdrawals', href: '/admin/coin-withdrawals', icon: '💸', current: location.pathname === '/admin/coin-withdrawals' },
      ]
    },
    {
      title: 'Content',
      icon: '📄',
      items: [
        { name: 'CMS', href: '/admin/cms', icon: '📄', current: location.pathname === '/admin/cms' },
        { name: 'Homepage Layout', href: '/admin/homepage-layout', icon: '🏠', badge: 'NEW', current: location.pathname === '/admin/homepage-layout' },
        { name: 'Product Collections', href: '/admin/product-collections', icon: '🎁', badge: 'NEW', current: location.pathname === '/admin/product-collections' },
        { name: 'Video Manager', href: '/admin/video-manager', icon: '🎬', current: location.pathname === '/admin/video-manager' },
        { name: 'Blog Requests', href: '/admin/blog-requests', icon: '📝', current: location.pathname === '/admin/blog-requests' },
      ]
    },
    {
      title: 'Notifications',
      icon: '🔔',
      items: [
        { name: 'WhatsApp Management', href: '/admin/whatsapp-management', icon: '💬', current: location.pathname === '/admin/whatsapp-management' },
        { name: 'WhatsApp Notifications', href: '/admin/whatsapp-notifications', icon: '📱', current: location.pathname === '/admin/whatsapp-notifications' },
      ]
    },
    {
      title: 'Automation',
      icon: '⚙️',
      items: [
        { name: 'Workflow Automation', href: '/admin/workflow-automation', icon: '⚙️', current: location.pathname === '/admin/workflow-automation' },
        { name: 'Form Builder', href: '/admin/form-builder', icon: '📋', current: location.pathname === '/admin/form-builder' },
        { name: 'Form Submissions', href: '/admin/form-submissions', icon: '📝', current: location.pathname === '/admin/form-submissions' },
      ]
    },
    {
      title: 'System',
      icon: '🔧',
      items: [
        { name: 'Users', href: '/admin/users', icon: '👤', current: location.pathname === '/admin/users' },
        { name: 'API Manager', href: '/admin/api-manager', icon: '🔧', current: location.pathname === '/admin/api-manager' },
        { name: 'Alert Settings', href: '/admin/system/alerts', icon: '🔔', current: location.pathname === '/admin/system/alerts' },
        { name: 'Staff Accounts', href: '/admin/system/staff', icon: '🧑‍💼', current: location.pathname === '/admin/system/staff' },
        { name: 'Roles & Permissions', href: '/admin/system/roles', icon: '🗂️', current: location.pathname === '/admin/system/roles' },
        { name: 'Audit Logs', href: '/admin/system/audit-logs', icon: '📜', current: location.pathname === '/admin/system/audit-logs' },
      ]
    },
    {
      title: 'Sales Channels',
      icon: '🏪',
      items: [
        { name: 'Facebook & Instagram', href: '/admin/facebook', icon: '📘', current: location.pathname === '/admin/facebook' },
        { name: 'FB Shop Integration', href: '/admin/fb-shop', icon: '🛒', badge: 'NEW', current: location.pathname === '/admin/fb-shop' },
        { name: 'Online Store', href: '/admin/store', icon: '🏪', current: location.pathname === '/admin/store' },
        { name: 'Google & YouTube', href: '/admin/google', icon: '🔍', current: location.pathname === '/admin/google' },
        { name: 'Marketplaces', href: '/admin/marketplaces', icon: '🌐', badge: 'NEW', current: location.pathname === '/admin/marketplaces' },
      ]
    },
    {
      title: 'Operations',
      icon: '🏭',
      items: [
        { name: 'Warehouses', href: '/admin/warehouses', icon: '🏭', badge: 'NEW', current: location.pathname === '/admin/warehouses' },
        { name: 'POS System', href: '/admin/pos', icon: '💻', badge: 'NEW', current: location.pathname === '/admin/pos' },
      ]
    },
  ]

  // Flatten all options for search
  const allOptions = navigationSections.flatMap(section => 
    section.items.map(item => ({
      ...item,
      category: section.title,
      description: `${section.title} - ${item.name}`
    }))
  )

  // Flatten and sort all navigation items alphabetically
  const allNavigationItems = navigationSections.flatMap(section => 
    section.items.map(item => ({
      ...item,
      category: section.title
    }))
  ).sort((a, b) => a.name.localeCompare(b.name))

  // Permission mapping by path
  const permissionByHref: Record<string, { permission?: string; anyOf?: string[]; role?: string }> = {
    '/admin/orders': { permission: 'orders:read' },
    '/admin/shipments': { permission: 'shipping:read' },
    '/admin/returns': { permission: 'returns:read' },
    '/admin/products': { permission: 'products:read' },
    '/admin/categories': { permission: 'products:read' },
    '/admin/inventory': { permission: 'inventory:read' },
    '/admin/analytics': { permission: 'analytics:read' },
    '/admin/marketing': { permission: 'marketing:read' },
    '/admin/discounts': { permission: 'discounts:read' },
    '/admin/users': { permission: 'users:read' },
    '/admin/settings': { role: 'admin' },
    '/admin/warehouses': { permission: 'inventory:read' },
    '/admin/pos': { anyOf: ['pos:read','pos:update'] },
    '/admin/marketplaces': { role: 'admin' },
    '/admin/fb-shop': { role: 'admin' },
    '/admin/payment-options': { permission: 'payments:read' },
    '/admin/cms': { permission: 'cms:read' },
    '/admin/blog-requests': { permission: 'cms:read' },
    '/admin/video-manager': { permission: 'cms:read' },
    '/admin/whatsapp-management': { permission: 'notifications:read' },
    '/admin/whatsapp-notifications': { permission: 'notifications:read' },
  }


  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const filtered = allOptions.filter(option => 
      option.name.toLowerCase().includes(query.toLowerCase()) ||
      option.description.toLowerCase().includes(query.toLowerCase()) ||
      option.category.toLowerCase().includes(query.toLowerCase())
    )

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

  return (
    <div className="flex h-screen bg-[var(--brand-background)] text-[var(--text-primary)]">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`sidebar w-72 h-screen fixed left-0 top-0 z-50 overflow-y-auto border-r border-[var(--brand-border)] ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--brand-border)]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold text-[var(--text-primary)]">Nefol Admin</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {/* All Expanded View (Alphabetically Sorted) */}
            <div className="space-y-1">
              {allNavigationItems.map((item) => {
                const gate = permissionByHref[item.href] || {}
                return (
                  <Can key={item.name} permission={gate.permission} anyOf={gate.anyOf} role={gate.role}>
                    <Link
                      to={item.href}
                      className={`nav-item ${item.current ? 'active' : ''}`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="font-medium">{item.name}</span>
                      {item.badge && (
                        <span className="badge ml-auto">{item.badge}</span>
                      )}
                    </Link>
                  </Can>
                )
              })}
            </div>
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden ml-72 lg:ml-72 md:ml-0">
        {/* Top Header */}
        <header className="bg-[var(--brand-surface)] border-b border-[var(--brand-border)] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              {/* Search Bar */}
              <div className="search-container relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search admin options... (e.g., CMS, Blog, Products)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="search-input w-96 pl-10 pr-20 py-2 border border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--text-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={handleSearchClear}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {!searchQuery && (
                    <div className="absolute right-3 top-2.5 text-xs text-[var(--text-muted)]">
                      <kbd className="px-2 py-1 bg-[var(--brand-highlight)] rounded text-xs">Ctrl+K</kbd>
                    </div>
                  )}
                </div>
                
                {/* Search Results Dropdown */}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
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
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg shadow-xl z-50 p-4">
                    <div className="text-[var(--text-muted)] text-center">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50 text-[var(--text-muted)]" />
                      <p>No options found for "{searchQuery}"</p>
                      <p className="text-sm mt-1">Try searching for:</p>
                      <div className="flex flex-wrap gap-2 mt-2 justify-center">
                        {['products', 'orders', 'analytics', 'marketing', 'customers', 'cms', 'blog'].map((term) => (
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
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-[var(--text-muted)]">2 live visitors</span>
              </div>
              <NotificationBell />
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-brand-secondary rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">N</span>
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)]">Nefol Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[var(--brand-background)]">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout



