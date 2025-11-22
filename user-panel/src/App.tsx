import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Menu, X } from 'lucide-react'
import SplashScreen from './components/SplashScreen'
import Logo from './components/Logo'
import ThemeToggle from './components/ThemeToggle'
import CartIcon from './components/CartIcon'
import ProfileAvatar from './components/ProfileAvatar'
import { useCart } from './contexts/CartContext'
import { useTheme, ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WishlistProvider, useWishlist } from './contexts/WishlistContext'
import { CartProvider } from './contexts/CartContext'
import { userSocketService } from './services/socket'
import LiveChatWidget from './components/LiveChatWidget'
import SmoothScroll from './components/SmoothScroll'
import SearchButton from './components/SearchButton'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import BottomNavigation from './components/BottomNavigation'
import SwipeNavigation from './components/SwipeNavigation'

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('./pages/Login'))
const Profile = lazy(() => import('./pages/Profile'))
const NefolCoins = lazy(() => import('./pages/NefolCoins'))
const CoinWithdrawal = lazy(() => import('./pages/CoinWithdrawal'))
const UserOrders = lazy(() => import('./pages/UserOrders'))
const SavedCards = lazy(() => import('./pages/SavedCards'))
const ManageAddress = lazy(() => import('./pages/ManageAddress'))
const OrderDetails = lazy(() => import('./pages/OrderDetails'))
const CancelOrder = lazy(() => import('./pages/CancelOrder'))
const Wishlist = lazy(() => import('./pages/Wishlist'))
const AboutUs = lazy(() => import('./pages/AboutUs'))
const FAQ = lazy(() => import('./pages/FAQ'))
const BlueTeaBenefits = lazy(() => import('./pages/BlueTeaBenefits'))
const USP = lazy(() => import('./pages/USP'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const RefundPolicy = lazy(() => import('./pages/RefundPolicy'))
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'))
const TermsOfService = lazy(() => import('./pages/TermsOfService'))
const Face = lazy(() => import('./pages/Face'))
const Body = lazy(() => import('./pages/Body'))
const Hair = lazy(() => import('./pages/Hair'))
const Orders = lazy(() => import('./pages/Orders'))
const Account = lazy(() => import('./pages/Account'))
const Community = lazy(() => import('./pages/Community'))
const Notifications = lazy(() => import('./pages/Notifications'))
const PrivacySecurity = lazy(() => import('./pages/PrivacySecurity'))
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'))
const LoyaltyRewards = lazy(() => import('./pages/LoyaltyRewards'))
const Combos = lazy(() => import('./pages/Combos'))
const Cart = lazy(() => import('./pages/Cart'))
const SearchPage = lazy(() => import('./pages/SearchPage'))

function AppContent() {
  const { theme } = useTheme()
  const { items: cartItems } = useCart()
  const { items: wishlistItems } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const [showSplash, setShowSplash] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [showWishlist, setShowWishlist] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [affiliateId, setAffiliateId] = useState<string | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false)


  // Capture referral parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const refParam = urlParams.get('ref')
    if (refParam) {
      console.log('🎯 Referral link detected:', refParam)
      setAffiliateId(refParam)
      // Store in localStorage for persistence across page navigation
      localStorage.setItem('affiliate_ref', refParam)
    } else {
      // Check if we have a stored affiliate ref
      const storedRef = localStorage.getItem('affiliate_ref')
      if (storedRef) {
        setAffiliateId(storedRef)
        console.log('🎯 Using stored affiliate ref:', storedRef)
      }
    }
  }, [])

  // Initialize socket connection for real-time updates
  useEffect(() => {
    console.log('🔌 Initializing user socket connection...')
    userSocketService.connect(user?.id?.toString())

    // Listen for real-time notifications
    const unsubscribeNotification = userSocketService.subscribe('notification', (data: any) => {
      console.log('📬 Notification received:', data)
      // You can add toast notification here
      if (data.message) {
        alert(`Notification: ${data.message}`)
      }
    })

    // Listen for cart sync
    const unsubscribeCartSync = userSocketService.subscribe('cart-sync', (data: any) => {
      console.log('🛒 Cart sync received:', data)
    })

    // Listen for order updates
    const unsubscribeOrderUpdate = userSocketService.subscribe('order-update', (data: any) => {
      console.log('📦 Order update received:', data)
      if (data.message) {
        alert(`Order Update: ${data.message}`)
      }
    })

    // Listen for product updates (when admin changes products)
    const unsubscribeProductUpdate = userSocketService.subscribe('products-updated', (data: any) => {
      console.log('🛍️ Product updated:', data)
      // Refresh product data if on product page
      window.dispatchEvent(new CustomEvent('product-updated', { detail: data }))
      // Also dispatch to refresh all pages
      window.dispatchEvent(new CustomEvent('refresh-products', { detail: data }))
    })

    // Also listen for the new event name
    const unsubscribeProductUpdateAlt = userSocketService.subscribe('product-updated', (data: any) => {
      console.log('🛍️ Product updated (alt):', data)
      window.dispatchEvent(new CustomEvent('product-updated', { detail: data }))
      window.dispatchEvent(new CustomEvent('refresh-products', { detail: data }))
    })

    // Listen for product creation
    const unsubscribeProductCreated = userSocketService.subscribe('products-created', (data: any) => {
      console.log('✨ New product created:', data)
      // Refresh product list
      window.dispatchEvent(new CustomEvent('product-created', { detail: data }))
    })

    // Listen for product deletion
    const unsubscribeProductDeleted = userSocketService.subscribe('products-deleted', (data: any) => {
      console.log('🗑️ Product deleted:', data)
      // Refresh product list
      window.dispatchEvent(new CustomEvent('product-deleted', { detail: data }))
    })

    // Listen for discount updates
    const unsubscribeDiscountUpdate = userSocketService.subscribe('discounts-updated', (data: any) => {
      console.log('💰 Discount updated:', data)
      window.dispatchEvent(new CustomEvent('discount-updated', { detail: data }))
    })

    // Listen for CMS updates (when admin updates homepage layout)
    const unsubscribeCMSUpdate = userSocketService.subscribe('cms-updated', (data: any) => {
      console.log('📝 CMS updated via socket:', data)
    })

    // Cleanup on unmount
    return () => {
      unsubscribeNotification()
      unsubscribeCartSync()
      unsubscribeOrderUpdate()
      unsubscribeProductUpdate()
      unsubscribeProductUpdateAlt()
      unsubscribeProductCreated()
      unsubscribeProductDeleted()
      unsubscribeDiscountUpdate()
      unsubscribeCMSUpdate()
    }
  }, [user])

  // Update user ID when authentication changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      userSocketService.setUserId(user.id.toString())
    }
  }, [isAuthenticated, user])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Redirect to search page with query
      window.location.hash = `#/user/search?q=${encodeURIComponent(searchQuery)}`
      setSearchQuery('')
      setShowSearch(false)
    }
  }


  return (
    <div className={`min-h-screen bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 w-full overflow-x-hidden ${showSplash ? 'overflow-hidden h-screen' : ''}`}>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <>
          <header className="bg-white/95 backdrop-blur-md border-b border-slate-100 relative z-50 w-full" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
            <div className="flex h-16 sm:h-20 items-center justify-between relative w-full px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1920px] mx-auto">
              {/* Mobile/Tablet Layout: Hamburger, Search, Logo (centered), Account, Cart */}
              <div className="flex items-center gap-3 md:hidden flex-1">
                {/* Hamburger Menu */}
                <button 
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300" 
                  aria-label="Menu"
                >
                  {showMobileMenu ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
                
                {/* Search Icon */}
                <button 
                  onClick={() => {
                    const event = new CustomEvent('open-search')
                    window.dispatchEvent(event)
                  }}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300" 
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
              
              {/* Logo - Centered on Mobile/Tablet, Left on Desktop */}
              <div className="flex-shrink-0 md:flex-shrink-0 flex-1 md:flex-none flex justify-center md:justify-start">
                <Logo className="transition-opacity duration-300 hover:opacity-80" href="#/user/" />
              </div>
              
              {/* Main Navigation - Premium Typography */}
              <nav className="hidden items-center gap-10 lg:gap-12 xl:gap-14 md:flex text-slate-700 relative">
                <a 
                  href="#/user/" 
                    className="text-sm font-light tracking-[0.15em] uppercase text-slate-700 hover:text-slate-900 transition-colors duration-300 relative group whitespace-nowrap"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                  >
                  Home
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-900 transition-all duration-500 group-hover:w-full"></span>
                </a>
                
                {/* Categories Dropdown - Premium Design */}
                <div 
                  className="relative"
                  onMouseEnter={() => setShowCategoriesDropdown(true)}
                  onMouseLeave={() => setShowCategoriesDropdown(false)}
                >
                  <button 
                    className="text-sm font-light tracking-[0.15em] uppercase text-slate-700 hover:text-slate-900 transition-colors duration-300 flex items-center relative whitespace-nowrap group"
                    onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                  >
                    Collections
                    <svg 
                      className={`ml-2 w-3 h-3 transform transition-transform duration-300 ${showCategoriesDropdown ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-900 transition-all duration-500 group-hover:w-full"></span>
                  </button>
                  {showCategoriesDropdown && (
                    <div 
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 bg-transparent"
                      style={{ 
                        zIndex: 9999,
                      }}
                      onMouseEnter={() => setShowCategoriesDropdown(true)}
                      onMouseLeave={() => setShowCategoriesDropdown(false)}
                    >
                      <div 
                        className="w-64 bg-white border border-slate-200 shadow-2xl transition-all duration-300"
                        style={{ 
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)'
                        }}
                      >
                      <div className="py-6">
                        <a 
                          href="#/user/face" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          onClick={() => setShowCategoriesDropdown(false)}
                          style={{ letterSpacing: '0.1em' }}
                        >
                          Face Care
                        </a>
                        <a 
                          href="#/user/hair" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          onClick={() => setShowCategoriesDropdown(false)}
                          style={{ letterSpacing: '0.1em' }}
                        >
                          Hair Care
                        </a>
                        <a 
                          href="#/user/body" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          onClick={() => setShowCategoriesDropdown(false)}
                          style={{ letterSpacing: '0.1em' }}
                        >
                          Body Care
                        </a>
                        <a 
                          href="#/user/combos" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          onClick={() => setShowCategoriesDropdown(false)}
                          style={{ letterSpacing: '0.1em' }}
                        >
                          Collections
                        </a>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <a 
                  href="#/user/shop" 
                  className="text-sm font-light tracking-[0.15em] uppercase text-slate-700 hover:text-slate-900 transition-colors duration-300 relative group whitespace-nowrap"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                >
                  Shop
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-900 transition-all duration-500 group-hover:w-full"></span>
                </a>
                <a 
                  href="#/user/ingredients" 
                  className="text-sm font-light tracking-[0.15em] uppercase text-slate-700 hover:text-slate-900 transition-colors duration-300 relative group whitespace-nowrap"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                >
                  Ingredients
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-900 transition-all duration-500 group-hover:w-full"></span>
                </a>
                <a 
                  href="#/user/blog" 
                  className="text-sm font-light tracking-[0.15em] uppercase text-slate-700 hover:text-slate-900 transition-colors duration-300 relative group whitespace-nowrap"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                >
                  Journal
                  <span className="absolute -bottom-1 left-0 w-0 h-px bg-slate-900 transition-all duration-500 group-hover:w-full"></span>
                </a>
              </nav>
              
              {/* Right Side Icons - Desktop: Search, Wishlist, Cart, Account | Mobile/Tablet: Account, Cart */}
              <div className="flex items-center gap-3 md:gap-4 lg:gap-6">
                {/* Desktop: Search Icon */}
                <button 
                  onClick={() => {
                    const event = new CustomEvent('open-search')
                    window.dispatchEvent(event)
                  }}
                  className="hidden md:flex w-8 h-8 items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300 relative group" 
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-slate-900 transition-all duration-300 group-hover:w-full"></span>
                </button>
                
                {/* Desktop: Wishlist Icon */}
                <button 
                  onClick={() => window.location.hash = '#/user/wishlist'}
                  className="hidden md:flex w-8 h-8 items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300 relative group" 
                  aria-label="Wishlist"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[10px] font-light rounded-full w-4 h-4 flex items-center justify-center" style={{ fontFamily: 'sans-serif' }}>
                      {wishlistItems.length}
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-slate-900 transition-all duration-300 group-hover:w-full"></span>
                </button>
                
                {/* Account Icon - Visible on all screens */}
                <button 
                  onClick={() => window.location.hash = isAuthenticated ? '#/user/profile' : '#/user/login'}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300 relative group" 
                  aria-label="Account"
                >
                  {isAuthenticated && user ? (
                    <ProfileAvatar 
                      profilePhoto={user.profile_photo}
                      name={user.name}
                      size="sm"
                      className="w-6 h-6 rounded-full border border-slate-200"
                    />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-slate-900 transition-all duration-300 group-hover:w-full hidden md:block"></span>
                </button>
                
                {/* Cart Icon - Visible on all screens */}
                <button
                  onClick={() => window.location.hash = '#/user/cart'}
                  className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors duration-300 relative group"
                  aria-label="Cart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center" style={{ fontFamily: 'sans-serif' }}>
                      {cartItems.length}
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px bg-slate-900 transition-all duration-300 group-hover:w-full hidden md:block"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Menu - Premium Design */}
          {showMobileMenu && (
            <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)}>
              <div className="fixed top-20 left-0 right-0 bottom-0 bg-white shadow-2xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>
                <nav className="flex flex-col px-6 py-12">
                  <a 
                    href="#/user/" 
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase text-slate-700 border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Home
                  </a>
                  <div>
                    <button 
                      className="py-4 text-sm font-light tracking-[0.15em] uppercase text-slate-700 border-b border-slate-100 w-full flex items-center justify-between transition-colors duration-300"
                      style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                      onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                    >
                      Collections
                      <svg 
                        className={`w-4 h-4 transform transition-transform duration-300 ${showCategoriesDropdown ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showCategoriesDropdown && (
                      <div className="bg-slate-50">
                        <a 
                          href="#/user/face" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          style={{ letterSpacing: '0.1em' }}
                          onClick={() => {
                            setShowMobileMenu(false)
                            setShowCategoriesDropdown(false)
                          }}
                        >
                          Face Care
                        </a>
                        <a 
                          href="#/user/hair" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          style={{ letterSpacing: '0.1em' }}
                          onClick={() => {
                            setShowMobileMenu(false)
                            setShowCategoriesDropdown(false)
                          }}
                        >
                          Hair Care
                        </a>
                        <a 
                          href="#/user/body" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 border-l-2 border-transparent hover:border-slate-900"
                          style={{ letterSpacing: '0.1em' }}
                          onClick={() => {
                            setShowMobileMenu(false)
                            setShowCategoriesDropdown(false)
                          }}
                        >
                          Body Care
                        </a>
                        <a 
                          href="#/user/combos" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 border-l-2 border-transparent hover:border-slate-900 border-b border-slate-100"
                          style={{ letterSpacing: '0.1em' }}
                          onClick={() => {
                            setShowMobileMenu(false)
                            setShowCategoriesDropdown(false)
                          }}
                        >
                          Collections
                        </a>
                      </div>
                    )}
                  </div>
                  <a 
                    href="#/user/shop" 
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase text-slate-700 border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Shop
                  </a>
                  <a 
                    href="#/user/ingredients" 
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase text-slate-700 border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Ingredients
                  </a>
                  <a 
                    href="#/user/blog" 
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase text-slate-700 border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Journal
                  </a>
                </nav>
              </div>
            </div>
          )}

        <SmoothScroll>
          <div className="main-content-wrapper">
            <Suspense fallback={<PageLoader />}>
              <RouterView affiliateId={affiliateId} />
            </Suspense>
          </div>
        </SmoothScroll>

      <footer className="border-t border-gray-800 bg-gray-900 py-8 sm:py-12 md:py-16 text-sm text-gray-400 w-full overflow-x-hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:gap-8 px-4 sm:px-6 lg:px-8 sm:grid-cols-2 md:grid-cols-6 w-full">
          <div className="md:col-span-2">
            <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-light tracking-wide text-white">Nefol</h3>
            <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">Natural and safe skincare for every skin type. Made with love and care.</p>
          </div>
          <div>
            <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium tracking-wide uppercase text-white">Categories</h4>
            <ul className="space-y-2">
              <li><a href="#/user/" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Home</a></li>
              <li><a href="#/user/offers" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Offers</a></li>
              <li><a href="#/user/new-arrivals" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">New Arrivals</a></li>
              <li><a href="#/user/face" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Face</a></li>
              <li><a href="#/user/body" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Body</a></li>
              <li><a href="#/user/hair" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Hair</a></li>
              <li><a href="#/user/combos" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Combos</a></li>
              <li><a href="#/user/best-sellers" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Best Sellers</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium tracking-wide uppercase text-white">Further Info.</h4>
            <ul className="space-y-2">
              <li><a href="#/user/account" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Account</a></li>
              <li><a href="#/user/shop" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Shop</a></li>
              <li><a href="#/user/orders" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Order</a></li>
              <li><a href="#/user/cart" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Cart</a></li>
              <li><a href="#/user/forms" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Forms</a></li>
              <li><a href="#/user/blog" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Blogs</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium tracking-wide uppercase text-white">Company Info</h4>
            <ul className="space-y-2">
              <li><a href="#/user/about" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">About Us</a></li>
              <li><a href="#/user/faq" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">FAQ</a></li>
              <li><a href="#/user/usp" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Why Choose Nefol</a></li>
              <li><a href="#/user/blue-tea-benefits" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Blue Tea Ingredient</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 sm:mb-4 text-xs sm:text-sm font-medium tracking-wide uppercase text-white">Customer Service</h4>
            <ul className="space-y-2">
              <li><a href="#/user/privacy-policy" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Privacy Policy</a></li>
              <li><a href="#/user/refund-policy" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Refund Policy</a></li>
              <li><a href="#/user/shipping-policy" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Shipping Policy</a></li>
              <li><a href="#/user/terms-of-service" className="text-xs sm:text-sm text-gray-400 hover:text-white transition-colors font-light">Terms of Service</a></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <small className="mt-4 block text-gray-400 font-light">©2024-{new Date().getFullYear()} NEFOL™ • Website powered by URBANMOVE SERVICE PRIVATE LIMITED</small>
          </div>
        </div>
      </footer>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-800 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold dark:text-slate-100">Search Products</h2>
              <button
                onClick={() => setShowSearch(false)}
                className="text-2xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for products, ingredients, or categories..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:bg-slate-700 dark:text-slate-100"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
            <div className="text-center text-slate-500 dark:text-slate-400">
              <p>Search functionality will be implemented with backend integration</p>
            </div>
          </div>
        </div>
      )}

          <LiveChatWidget />
          <SearchButton />
          <PWAInstallPrompt />
          <BottomNavigation />
          <SwipeNavigation />
        </>
      )}
    </div>
  )
}

// Lightweight hash-based router to avoid external deps - lazy load all pages
const Home = lazy(() => import('./pages/Home'))
const Shop = lazy(() => import('./pages/Shop'))
const Skincare = lazy(() => import('./pages/Skincare'))
const Ingredients = lazy(() => import('./pages/Ingredients'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))
const Contact = lazy(() => import('./pages/Contact'))
const ProductPage = lazy(() => import('./pages/Product'))
const CategoryPage = lazy(() => import('./pages/Category'))
const Affiliate = lazy(() => import('./pages/Affiliate'))
const AffiliatePartner = lazy(() => import('./pages/AffiliatePartner'))
const ReferralHistory = lazy(() => import('./pages/ReferralHistory'))
const Reports = lazy(() => import('./pages/Reports'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Confirmation = lazy(() => import('./pages/Confirmation'))
const OffersPage = lazy(() => import('./pages/Offers'))
const NewArrivalsPage = lazy(() => import('./pages/NewArrivals'))
const BestSellersPage = lazy(() => import('./pages/BestSellers'))
const GiftingPage = lazy(() => import('./pages/Gifting'))
const StoreLocatorPage = lazy(() => import('./pages/StoreLocator'))
const ShadeFinderPage = lazy(() => import('./pages/ShadeFinder'))
const SkinQuizPage = lazy(() => import('./pages/SkinQuiz'))
const TrackOrderPage = lazy(() => import('./pages/TrackOrder'))
const SustainabilityPage = lazy(() => import('./pages/Sustainability'))
const PressMediaPage = lazy(() => import('./pages/PressMedia'))
const Forms = lazy(() => import('./pages/Forms'))

// Loading fallback component - minimal to avoid showing during page transitions
const PageLoader = () => null

interface RouterViewProps {
  affiliateId?: string | null
}

function RouterView({ affiliateId }: RouterViewProps) {
  const [hash, setHash] = useState(window.location.hash || '#/user/')
  
  React.useEffect(() => {
    const onHashChange = () => setHash(window.location.hash || '#/user/')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  
  // Scroll to top whenever the route changes
  React.useEffect(() => {
    // Scroll to top immediately when route changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    
    // Also ensure document and body are scrolled to top
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
    }
    if (document.body) {
      document.body.scrollTop = 0
    }
  }, [hash])
  
  // Track page views whenever the route changes
  React.useEffect(() => {
    const path = hash.replace('#', '') || '/user/'
    console.log('📊 Tracking page view:', path)
    userSocketService.trackPageView(path)
  }, [hash])
  
  const path = hash.replace('#', '')
  const lower = path.toLowerCase()
  
  // Extract path without query parameters
  const pathWithoutQuery = lower.split('?')[0]
  
  if (lower.startsWith('/user/product/')) return <ProductPage />
  if (lower.startsWith('/user/category/')) return <CategoryPage />
  if (lower.startsWith('/user/blog/') && lower !== '/user/blog') return <BlogDetail />
  if (lower.startsWith('/user/confirmation')) return <Confirmation />
  if (lower.startsWith('/user/order/')) return <OrderDetails />
  if (lower.startsWith('/user/cancel-order/')) return <CancelOrder />
  
  switch (pathWithoutQuery) {
    case '/user/product':
    case '/user/':
    case '/user':
      return <Home />
    case '/user/shop': return <Shop />
    case '/user/skincare': return <Skincare />
    case '/user/ingredients': return <Ingredients />
    case '/user/blog': return <Blog />
    case '/user/contact': return <Contact />
    case '/user/checkout': return <Checkout affiliateId={affiliateId} />
    case '/user/affiliate': return <Affiliate />
    case '/user/affiliate-partner': return <AffiliatePartner />
    case '/user/referral-history': return <ReferralHistory />
    case '/user/reports': return <Reports />
    case '/user/profile': return <Profile />
    case '/user/nefol-coins': return <NefolCoins />
    case '/user/coin-withdrawal': return <CoinWithdrawal />
    case '/user/user-orders': return <UserOrders />
    case '/user/saved-cards': return <SavedCards />
    case '/user/manage-address': return <ManageAddress />
    case '/user/wishlist': return <Wishlist />
    case '/user/login': return <LoginPage />
    case '/user/about': return <AboutUs />
    case '/user/faq': return <FAQ />
    case '/user/blue-tea-benefits': return <BlueTeaBenefits />
    case '/user/usp': return <USP />
    case '/user/privacy-policy': return <PrivacyPolicy />
    case '/user/refund-policy': return <RefundPolicy />
    case '/user/shipping-policy': return <ShippingPolicy />
    case '/user/terms-of-service': return <TermsOfService />
    case '/user/face': return <Face />
    case '/user/body': return <Body />
    case '/user/hair': return <Hair />
    case '/user/orders': return <Orders />
    case '/user/account': return <Account />
    case '/user/community': return <Community />
    case '/user/notifications': return <Notifications />
    case '/user/privacy-security': return <PrivacySecurity />
    case '/user/payment-methods': return <PaymentMethods />
    case '/user/loyalty-rewards': return <LoyaltyRewards />
    case '/user/combos': return <Combos />
    case '/user/gifting': return <GiftingPage />
    case '/user/cart': return <Cart />
    case '/user/search': return <SearchPage />
    case '/user/offers': return <OffersPage />
    case '/user/new-arrivals': return <NewArrivalsPage />
    case '/user/best-sellers': return <BestSellersPage />
    case '/user/store-locator': return <StoreLocatorPage />
    case '/user/shade-finder': return <ShadeFinderPage />
    case '/user/skin-quiz': return <SkinQuizPage />
    case '/user/track-order': return <TrackOrderPage />
    case '/user/sustainability': return <SustainabilityPage />
    case '/user/press': return <PressMediaPage />
    case '/user/forms': return <Forms />
    default:
      return <Home />
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

