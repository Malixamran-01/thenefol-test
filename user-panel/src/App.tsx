import React, { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { Menu, X, Instagram, Facebook, Youtube, Linkedin } from 'lucide-react'
import SplashScreen from './components/SplashScreen'
import CartIcon from './components/CartIcon'
import ProfileAvatar from './components/ProfileAvatar'
import { useCart } from './contexts/CartContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { WishlistProvider, useWishlist } from './contexts/WishlistContext'
import { CartProvider } from './contexts/CartContext'
import { userSocketService } from './services/socket'
import LiveChatWidget from './components/LiveChatWidget'
import BlogFAB from './components/BlogFAB'
import SmoothScroll from './components/SmoothScroll'
import SearchButton from './components/SearchButton'
import PWAInstallPrompt from './components/PWAInstallPrompt'
import BottomNavigation from './components/BottomNavigation'
import SwipeNavigation from './components/SwipeNavigation'

// Lazy load all pages for code splitting
const LoginPage = lazy(() => import('./pages/Login'))
const SignupPage = lazy(() => import('./pages/Signup'))
const Profile = lazy(() => import('./pages/Profile'))
const AuthorProfile = lazy(() => import('./pages/AuthorProfile'))
const AuthorOnboarding = lazy(() => import('./pages/AuthorOnboarding'))
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
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'))

function AppContent() {
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
  // Use separate state for desktop & mobile "Collections" dropdown
  const [showDesktopCollections, setShowDesktopCollections] = useState(false)
  const [showMobileCollections, setShowMobileCollections] = useState(false)
  const [cartToast, setCartToast] = useState<{ message: string; id: number } | null>(null)
  const desktopCollectionsRef = useRef<HTMLDivElement>(null)
  const [currentPath, setCurrentPath] = useState(() =>
    (window.location.hash || '#/user/').replace('#', '').toLowerCase().split('?')[0]
  )


  useEffect(() => {
    const onHashChange = () => {
      setCurrentPath((window.location.hash || '#/user/').replace('#', '').toLowerCase().split('?')[0])
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isEditorPage = currentPath === '/user/blog/edit-image'

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

    // Listen for cart add success events for lightweight toast
    const handleCartAdded = (event: Event) => {
      const custom = event as CustomEvent
      const title = custom.detail?.title as string | undefined
      const id = Date.now()
      setCartToast({
        message: title ? `“${title}” added to cart` : 'Item added to cart',
        id,
      })
      // Auto-hide after 4 seconds (only if still showing same toast) - increased for better visibility
      setTimeout(() => {
        setCartToast((prev) => (prev && prev.id === id ? null : prev))
      }, 4000)
    }

    window.addEventListener('cart:item-added', handleCartAdded)

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
      window.removeEventListener('cart:item-added', handleCartAdded)
    }
  }, [user])

  // Close desktop collections dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showDesktopCollections) return
      const target = event.target as Node | null
      if (desktopCollectionsRef.current && target && !desktopCollectionsRef.current.contains(target)) {
        setShowDesktopCollections(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showDesktopCollections])

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
    <div className={`min-h-screen w-full overflow-x-hidden ${showSplash ? 'overflow-hidden h-screen' : ''}`} style={{ backgroundColor: 'var(--color-screen-bg)', color: 'var(--color-text-secondary-on-teal)', fontFamily: 'var(--font-body-family)' }}>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : isEditorPage ? (
        <Suspense fallback={<PageLoader />}>
          <RouterView affiliateId={affiliateId} />
        </Suspense>
      ) : (
        <>
          <header
            className="relative z-50 w-full"
            style={{
              paddingLeft: 'env(safe-area-inset-left)',
              paddingRight: 'env(safe-area-inset-right)',
              backgroundColor: 'var(--color-nav-bg)',
              color: 'var(--color-text-on-nav)',
              borderBottom: '1px solid rgba(232, 245, 247, 0.16)',
            }}
          >
            <div className="flex h-16 sm:h-20 items-center justify-between relative w-full px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1920px] mx-auto">
              {/* Mobile/Tablet Layout: Hamburger, Logo (centered), Account */}
              <div className="flex items-center gap-3 md:hidden">
                {/* Hamburger Menu */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="w-8 h-8 flex items-center justify-center transition-colors duration-300"
                  aria-label="Menu"
                  style={{ color: 'var(--color-text-secondary-on-teal)' }}
                >
                  {showMobileMenu ? (
                    <X className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Menu className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              
              {/* Logo - Centered on mobile, left-aligned on desktop */}
              <div className="absolute left-1/2 transform -translate-x-1/2 md:relative md:left-0 md:transform-none flex-shrink-0 md:flex-none">
                <a
                  href="#/user/"
                  className="flex items-center justify-center md:justify-start"
                  aria-label="Go to homepage"
                >
                  {/* Mobile Logo - NEFOL wide.png */}
                  <img
                    src="/IMAGES/NEFOL wide.png"
                    alt="Nefol logo"
                    className="h-16 sm:h-20 w-auto object-contain md:hidden"
                    loading="eager"
                    style={{ maxWidth: '200px' }}
                  />
                  {/* Desktop Logo - NEFOL icon.png */}
                  <img
                    src="/IMAGES/NEFOL icon.png"
                    alt="Nefol logo"
                    className="h-10 sm:h-12 w-auto object-contain hidden md:block"
                    loading="eager"
                  />
                </a>
              </div>
              
              {/* Main Navigation - Premium Typography */}
              <nav
                className="hidden items-center gap-6 lg:gap-8 xl:gap-10 2xl:gap-12 md:flex relative flex-wrap justify-center md:justify-start"
                style={{ maxWidth: '100%', overflow: 'visible' }}
              >
                <a
                  href="#/user/"
                  className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 relative group whitespace-nowrap flex-shrink-0"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                >
                  Home
                  <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </a>
                
                {/* Collections Dropdown - Desktop */}
                <div 
                  ref={desktopCollectionsRef}
                  className="relative"
                  onMouseEnter={() => {
                    // Only auto-open on desktop (hover)
                    if (window.innerWidth >= 768) {
                      setShowDesktopCollections(true)
                    }
                  }}
                  onMouseLeave={() => {
                    // Only auto-close on desktop (hover)
                    if (window.innerWidth >= 768) {
                      setShowDesktopCollections(false)
                    }
                  }}
                >
                  <button 
                    className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 flex items-center relative whitespace-nowrap group flex-shrink-0"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowDesktopCollections((prev) => !prev)
                    }}
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                  >
                    Collections
                    <svg 
                      className={`ml-2 w-3 h-3 transform transition-transform duration-300 ${showDesktopCollections ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                    <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                  </button>
                  {showDesktopCollections && (
                    <div 
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-64 bg-transparent"
                      style={{ 
                        zIndex: 9999,
                      }}
                      onMouseEnter={() => {
                        if (window.innerWidth >= 768) {
                          setShowDesktopCollections(true)
                        }
                      }}
                      onMouseLeave={() => {
                        if (window.innerWidth >= 768) {
                          setShowDesktopCollections(false)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div 
                        className="w-64 shadow-2xl transition-all duration-300"
                        style={{
                          backgroundColor: 'var(--color-nav-bg)',
                          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.06)',
                          border: '1px solid rgba(220, 229, 231, 0.9)',
                        }}
                      >
                      <div className="py-6">
                        <a 
                          href="#/user/face" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent hover:bg-opacity-10 hover:bg-white"
                          onClick={(e) => {
                            setShowDesktopCollections(false)
                            e.stopPropagation()
                          }}
                          style={{ letterSpacing: '0.1em', color: 'var(--color-text-on-nav)' }}
                        >
                          Face Care
                        </a>
                        <a 
                          href="#/user/hair" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent hover:bg-opacity-10 hover:bg-white"
                          onClick={(e) => {
                            setShowDesktopCollections(false)
                            e.stopPropagation()
                          }}
                          style={{ letterSpacing: '0.1em', color: 'var(--color-text-on-nav)' }}
                        >
                          Hair Care
                        </a>
                        <a 
                          href="#/user/body" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent hover:bg-opacity-10 hover:bg-white"
                          onClick={(e) => {
                            setShowDesktopCollections(false)
                            e.stopPropagation()
                          }}
                          style={{ letterSpacing: '0.1em', color: 'var(--color-text-on-nav)' }}
                        >
                          Body Care
                        </a>
                        <a 
                          href="#/user/combos" 
                          className="block px-8 py-3 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent hover:bg-opacity-10 hover:bg-white"
                          onClick={(e) => {
                            setShowDesktopCollections(false)
                            e.stopPropagation()
                          }}
                          style={{ letterSpacing: '0.1em', color: 'var(--color-text-on-nav)' }}
                        >
                          Combos
                        </a>
                      </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <a
                  href="#/user/shop"
                  className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 relative group whitespace-nowrap flex-shrink-0"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                >
                  Shop
                  <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </a>
                <a
                  href="#/user/ingredients"
                  className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 relative group whitespace-nowrap flex-shrink-0"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                >
                  Ingredients
                  <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </a>
                <a
                  href="#/user/blog"
                  className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 relative group whitespace-nowrap flex-shrink-0"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                >
                  Blogs
                  <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </a>
                <a
                  href="#/user/contact"
                  className="text-xs md:text-sm font-light tracking-[0.15em] uppercase transition-colors duration-300 relative group whitespace-nowrap flex-shrink-0"
                  style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)' }}
                >
                  Contact Us
                  <span className="absolute -bottom-1 left-0 w-0 h-px transition-all duration-500 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </a>
              </nav>
              
              {/* Right Side Icons - Desktop: Search, Wishlist, Socials, Cart, Account | Mobile/Tablet: Account, Cart */}
              <div className="flex items-center gap-3 md:gap-4 lg:gap-6" style={{ color: 'var(--color-text-secondary-on-teal)' }}>
                {/* Desktop: Search Icon */}
                <button 
                  onClick={() => {
                    const event = new CustomEvent('open-search')
                    window.dispatchEvent(event)
                  }}
                  className="hidden md:flex w-8 h-8 items-center justify-center transition-colors duration-300 relative group"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px transition-all duration-300 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </button>
                
                {/* Desktop: Wishlist Icon */}
                <button 
                  onClick={() => window.location.hash = '#/user/wishlist'}
                  className="hidden md:flex w-8 h-8 items-center justify-center transition-colors duration-300 relative group"
                  aria-label="Wishlist"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-light rounded-full w-4 h-4 flex items-center justify-center" style={{ fontFamily: 'sans-serif', backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-body)' }}>
                      {wishlistItems.length}
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px transition-all duration-300 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </button>
                
                {/* Account Icon - Visible on all screens */}
                <button 
                  onClick={() => window.location.hash = isAuthenticated ? '#/user/profile' : '#/user/login'}
                  className="w-[50px] h-[50px] flex items-center justify-center transition-colors duration-300 relative group"
                  aria-label="Account"
                  style={{ touchAction: 'manipulation' }}
                >
                  {isAuthenticated && user ? (
                    <ProfileAvatar 
                      profilePhoto={user.profile_photo}
                      name={user.name}
                      size="50px"
                      className="border border-slate-200"
                    />
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px transition-all duration-300 group-hover:w-full hidden md:block" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </button>
                
                {/* Cart Icon - Hidden on mobile, visible on desktop */}
                <button
                  onClick={() => window.location.hash = '#/user/cart'}
                  className="hidden md:flex w-8 h-8 items-center justify-center transition-colors duration-300 relative group"
                  aria-label="Cart"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartItems.length > 0 && (
                    <span className="absolute -top-1 -right-1 text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center" style={{ fontFamily: 'sans-serif', backgroundColor: '#FF4B4B', color: '#FFFFFF' }}>
                      {cartItems.length}
                    </span>
                  )}
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-px transition-all duration-300 group-hover:w-full" style={{ backgroundColor: 'var(--color-text-secondary-on-teal)' }}></span>
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Menu - Premium Design */}
          {showMobileMenu && (
            <div
              className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowMobileMenu(false)
                setShowMobileCollections(false)
              }}
            >
              <div
                className="fixed top-20 left-0 right-0 bottom-0 shadow-2xl overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--color-card-bg)' }}
              >
                <nav className="flex flex-col px-6 py-12" style={{ backgroundColor: 'var(--color-card-bg)' }}>
                  <a 
                    href="#/user/" 
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Home
                  </a>
                  <div>
                    <button
                      className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 w-full flex items-center justify-between transition-colors duration-300"
                      style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowMobileCollections((prev) => !prev)
                      }}
                    >
                      Collections
                      <svg 
                        className={`w-4 h-4 transform transition-transform duration-300 ${showMobileCollections ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                        style={{ color: '#1a1a1a' }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showMobileCollections && (
                      <div className="bg-slate-50" onClick={(e) => e.stopPropagation()}>
                        <a 
                          href="#/user/face" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent"
                          style={{ letterSpacing: '0.1em', color: '#1a1a1a' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMobileMenu(false)
                            setShowMobileCollections(false)
                          }}
                        >
                          Face Care
                        </a>
                        <a 
                          href="#/user/hair" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent"
                          style={{ letterSpacing: '0.1em', color: '#1a1a1a' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMobileMenu(false)
                            setShowMobileCollections(false)
                          }}
                        >
                          Hair Care
                        </a>
                        <a 
                          href="#/user/body" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent"
                          style={{ letterSpacing: '0.1em', color: '#1a1a1a' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMobileMenu(false)
                            setShowMobileCollections(false)
                          }}
                        >
                          Body Care
                        </a>
                        <a 
                          href="#/user/combos" 
                          className="block py-3 px-8 text-xs font-light tracking-[0.1em] uppercase transition-all duration-300 border-l-2 border-transparent border-b border-slate-100"
                          style={{ letterSpacing: '0.1em', color: '#1a1a1a' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowMobileMenu(false)
                            setShowMobileCollections(false)
                          }}
                        >
                          Combos
                        </a>
                      </div>
                    )}
                  </div>
                  <a 
                    href="#/user/shop"
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Shop
                  </a>
                  <a 
                    href="#/user/ingredients"
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Ingredients
                  </a>
                  <a 
                    href="#/user/blog"
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Blogs
                  </a>
                  <a 
                    href="#/user/contact"
                    className="py-4 text-sm font-light tracking-[0.15em] uppercase border-b border-slate-100 transition-colors duration-300"
                    style={{ letterSpacing: '0.15em', fontFamily: 'var(--font-heading-family)', color: '#1a1a1a' }}
                    onClick={() => setShowMobileMenu(false)}
                  >
                    Contact Us
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

      <footer
        className="py-8 sm:py-12 md:py-16 text-sm w-full overflow-x-hidden"
        style={{ backgroundColor: 'var(--color-nav-bg)', color: 'var(--color-text-secondary-on-teal)', borderTop: '1px solid rgba(232, 245, 247, 0.16)' }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-1">
              <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-light tracking-wide" style={{ color: 'var(--color-text-on-nav)', fontFamily: 'var(--font-heading-family)' }}>NEFOL®</h3>
              <p className="text-xs sm:text-sm font-light leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Natural and safe skincare for every skin type. Made with love and care.</p>
            </div>

            {/* Categories Section */}
            <div>
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-on-nav)' }}>Categories</h4>
              <ul className="space-y-2">
                <li><a href="#/user/" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Home</a></li>
                <li><a href="#/user/offers" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Offers</a></li>
                <li><a href="#/user/new-arrivals" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>New Arrivals</a></li>
                <li><a href="#/user/face" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Face</a></li>
                <li><a href="#/user/body" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Body</a></li>
                <li><a href="#/user/hair" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Hair</a></li>
                <li><a href="#/user/combos" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Combos</a></li>
                <li><a href="#/user/best-sellers" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Best Seller</a></li>
              </ul>
            </div>

            {/* Company Section */}
            <div>
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-on-nav)' }}>Company</h4>
              <ul className="space-y-2">
                <li><a href="#/user/about" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>About us</a></li>
                <li><a href="#/user/faq" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>FAQ</a></li>
                <li><a href="#/user/blog" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Blogs</a></li>
                <li>
  <a
    href="#/user/affiliate-partner"
    onClick={() => {
      sessionStorage.setItem('affiliate_referrer', 'home')
    }}
    className="text-xs sm:text-sm font-light transition-colors hover:opacity-80"
    style={{ color: 'var(--color-text-secondary-on-teal)' }}
  >
    Affiliate Program
  </a>
</li>

                <li><a href="#/user/contact" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Contact Us</a></li>
              </ul>
            </div>

            {/* Legal & Social Section */}
            <div>
              <h4 className="mb-3 text-sm font-medium uppercase tracking-wide mb-4" style={{ color: 'var(--color-text-on-nav)' }}>Legal</h4>
              <ul className="space-y-2 mb-6">
                <li><a href="#/user/privacy-policy" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Privacy Policy</a></li>
                <li><a href="#/user/refund-policy" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Refund Policy</a></li>
                <li><a href="#/user/shipping-policy" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Shipping Policy</a></li>
                <li><a href="#/user/terms-of-service" className="text-xs sm:text-sm font-light transition-colors hover:opacity-80" style={{ color: 'var(--color-text-secondary-on-teal)' }}>Terms of Service</a></li>
              </ul>
              
              {/* Social Media Icons */}
              <div className="mt-6">
                <h4 className="mb-3 text-xs font-medium uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--color-text-on-nav)' }}>SOCIALLY CONNECT WITH US</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href="https://www.instagram.com/nefol_official?igsh=d2NkaXk2NW92emhq&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on Instagram"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <Instagram className="w-4 h-4" style={{ stroke: 'currentColor', fill: 'none' }} />
                  </a>
                  <a
                    href="https://www.facebook.com/share/1H3dWrPgcY/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on Facebook"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <Facebook className="w-4 h-4" style={{ stroke: 'currentColor', fill: 'none' }} />
                  </a>
                  <a
                    href="https://x.com/nefol_official?s=21"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on X"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--color-text-secondary-on-teal)' }}>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                  <a
                    href="https://youtube.com/@nefol.official?si=4kDfx02DoJ8Lpx9F"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on YouTube"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <Youtube className="w-4 h-4" style={{ stroke: 'currentColor', fill: 'none' }} />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/nefol-aesthetics-pvt-ltd/"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on LinkedIn"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <Linkedin className="w-4 h-4" style={{ stroke: 'currentColor', fill: 'none' }} />
                  </a>
                  <a
                    href="https://vk.com/nefolclub"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® club on VK"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors text-[11px] font-semibold"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    VK
                  </a>
                  <a
                    href="https://pin.it/hfoLEqFgB"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="NEFOL® on Pinterest"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 transition-colors"
                    style={{ color: 'var(--color-text-secondary-on-teal)' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'var(--color-text-secondary-on-teal)' }}>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.619 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.487.535 6.624 0 12-5.373 12-12S18.627.001 12 .001z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright Section */}
          <div className="border-t border-white/10 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <small 
                className="text-[10px] xs:text-[11px] sm:text-xs font-light text-center sm:text-left leading-relaxed block w-full" 
                style={{ 
                  color: 'var(--color-text-secondary-on-teal)',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  hyphens: 'auto'
                }}
              >
                <span className="inline-block max-w-full">
                  ©2024-{new Date().getFullYear()} NEFOL® • powered by{' '}
                  <span className="inline-block">Divyan Technologies</span>{' '}
                  <span className="inline-block">Private Limited</span>
                </span>
              </small>
            </div>
          </div>
        </div>
      </footer>

      {/* Global cart toast notification */}
      {cartToast && (
        <div 
          className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm text-white shadow-lg flex items-center gap-2 transition-all duration-300 cart-toast-mobile sm:bg-slate-900/90"
        >
          <span>✅</span>
          <span>{cartToast.message}</span>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20">
          <div
            className="w-full max-w-2xl rounded-xl p-6 shadow-2xl"
            style={{ backgroundColor: 'var(--color-card-bg)', color: 'var(--color-text-body)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-body)', fontFamily: 'var(--font-heading-family)' }}>
                Search Products
              </h2>
              <button
                onClick={() => setShowSearch(false)}
                className="text-2xl"
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
                  className="flex-1 rounded-lg px-4 py-3"
                  autoFocus
                />
                <button
                  type="submit"
                  className="rounded-lg px-6 py-3 font-semibold transition-colors"
                  style={{
                    backgroundColor: 'var(--color-button-primary-bg)',
                    color: 'var(--color-button-primary-text)',
                  }}
                >
                  Search
                </button>
              </div>
            </form>
            <div className="text-center" style={{ color: 'var(--color-text-body)' }}>
              <p>Search functionality will be implemented with backend integration</p>
            </div>
          </div>
        </div>
      )}

          {(() => {
            const isBlogPage = currentPath === '/user/blog' || currentPath.startsWith('/user/blog/')
            const isBlogRequestForm = currentPath === '/user/blog/request'
            return (
              <>
                {isBlogPage && !isBlogRequestForm && <BlogFAB />}
                <LiveChatWidget hideButton={isBlogPage} />
              </>
            )
          })()}
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
const IngredientDetail = lazy(() => import('./pages/IngredientDetail'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))
const BlogRequestForm = lazy(() => import('./pages/BlogRequestForm'))
const ImageEditorPage = lazy(() => import('./pages/ImageEditorPage'))
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
  const { isAuthenticated } = useAuth()
  const RequiredAuth = (component: JSX.Element): JSX.Element | null => {
  if (!isAuthenticated) {
    if (!window.location.hash.startsWith('#/user/login')) {
      sessionStorage.setItem('post_login_redirect', window.location.hash)
      window.location.hash = '#/user/login'
    }
    return null
  }
  return component
}

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
  if (pathWithoutQuery === '/user/blog/edit-image') return RequiredAuth(<ImageEditorPage />)
  if (lower.startsWith('/user/blog/') && lower !== '/user/blog' && pathWithoutQuery !== '/user/blog/request') return <BlogDetail />
  if (lower.startsWith('/user/author/') && lower !== '/user/author/onboarding') return <AuthorProfile />
  if (lower.startsWith('/user/ingredients/') && lower !== '/user/ingredients') return <IngredientDetail />
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
    case '/user/blog/request': return RequiredAuth(<BlogRequestForm />)
    case '/user/author/onboarding': return RequiredAuth(<AuthorOnboarding />)
    case '/user/contact': return <Contact />
    case '/user/checkout': return <Checkout affiliateId={affiliateId} />
    case '/user/affiliate':
  return RequiredAuth(<Affiliate />)

case '/user/affiliate-partner':
  return RequiredAuth(<AffiliatePartner />)

case '/user/referral-history':
  return RequiredAuth(<ReferralHistory />)

    case '/user/reports': return <Reports />
    case '/user/profile': return <Profile />
    case '/user/nefol-coins': return <NefolCoins />
    case '/user/coin-withdrawal': return <CoinWithdrawal />
    case '/user/user-orders': return <UserOrders />
    case '/user/saved-cards': return <SavedCards />
    case '/user/manage-address': return <ManageAddress />
    case '/user/wishlist': return <Wishlist />
    case '/user/login': return <LoginPage />
    case '/user/signup': return <SignupPage />
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
    case '/user/reset-password': return <ResetPasswordPage />
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
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  )
}