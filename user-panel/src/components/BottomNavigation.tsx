import React, { useState, useEffect } from 'react'
import { Home, Search, ShoppingCart, Grid3x3, Heart, User } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { useAuth } from '../contexts/AuthContext'

export default function BottomNavigation() {
  const { items: cartItems } = useCart()
  const { items: wishlistItems } = useWishlist()
  const { isAuthenticated } = useAuth()
  const [currentPath, setCurrentPath] = useState(window.location.hash || '#/user/')

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || '#/user/')
    }
    
    window.addEventListener('hashchange', handleHashChange)
    // Set initial value
    setCurrentPath(window.location.hash || '#/user/')
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '#/user/',
      isActive: currentPath === '#/user/' || currentPath === '#/user'
    },
    {
      label: 'Search',
      icon: Search,
      href: '#/user/search',
      isActive: currentPath.startsWith('#/user/search'),
      onClick: (e: React.MouseEvent) => {
        e.preventDefault()
        const event = new CustomEvent('open-search')
        window.dispatchEvent(event)
      }
    },
    {
      label: 'Cart',
      icon: ShoppingCart,
      href: '#/user/cart',
      isActive: currentPath.startsWith('#/user/cart'),
      badge: cartItems.length > 0 ? cartItems.length : undefined
    },
    {
      label: 'Collection',
      icon: Grid3x3,
      href: '#/user/shop',
      isActive: currentPath.startsWith('#/user/shop') || 
                currentPath.startsWith('#/user/face') ||
                currentPath.startsWith('#/user/body') ||
                currentPath.startsWith('#/user/hair') ||
                currentPath.startsWith('#/user/combos')
    },
    {
      label: 'Wishlist',
      icon: Heart,
      href: '#/user/wishlist',
      isActive: currentPath.startsWith('#/user/wishlist'),
      badge: wishlistItems.length > 0 ? wishlistItems.length : undefined
    },
    {
      label: 'Account',
      icon: User,
      href: isAuthenticated ? '#/user/profile' : '#/user/login',
      isActive: currentPath.startsWith('#/user/profile') || 
                currentPath.startsWith('#/user/account') ||
                currentPath.startsWith('#/user/login')
    }
  ]

  return (
    <>
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
          z-index: 40;
          padding-bottom: env(safe-area-inset-bottom);
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.05);
        }
        
        .bottom-nav-content {
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 0;
          max-width: 100%;
        }
        
        .bottom-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: 1;
          padding: 4px 8px;
          text-decoration: none;
          color: #6b7280;
          transition: all 0.2s ease;
          min-width: 0;
          position: relative;
        }
        
        .bottom-nav-item:active {
          transform: scale(0.95);
        }
        
        .bottom-nav-item.active {
          color: #1f2937;
        }
        
        .bottom-nav-icon {
          width: 22px;
          height: 22px;
          stroke-width: 1.5;
        }
        
        .bottom-nav-item.active .bottom-nav-icon {
          stroke-width: 2;
        }
        
        .bottom-nav-label {
          font-size: 10px;
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }
        
        .bottom-nav-badge {
          position: absolute;
          top: 0;
          right: 8px;
          background: #ef4444;
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        /* Hide on desktop */
        @media (min-width: 1025px) {
          .bottom-nav {
            display: none;
          }
        }
        
        /* Tablet adjustments */
        @media (min-width: 641px) and (max-width: 1024px) {
          .bottom-nav-icon {
            width: 24px;
            height: 24px;
          }
          
          .bottom-nav-label {
            font-size: 11px;
          }
          
          .bottom-nav-content {
            padding: 10px 0;
          }
        }
      `}</style>
      <nav className="bottom-nav">
        <div className="bottom-nav-content">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <a
                key={item.label}
                href={item.href}
                className={`bottom-nav-item ${item.isActive ? 'active' : ''}`}
                onClick={item.onClick}
                aria-label={item.label}
              >
                <Icon className="bottom-nav-icon" />
                {item.badge && (
                  <span className="bottom-nav-badge">{item.badge}</span>
                )}
                <span className="bottom-nav-label">{item.label}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}

