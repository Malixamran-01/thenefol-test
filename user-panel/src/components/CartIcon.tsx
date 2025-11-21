import React from 'react'
import { useCart } from '../contexts/CartContext'

interface CartIconProps {
  onClick?: () => void
  className?: string
}

export default function CartIcon({ onClick, className = "" }: CartIconProps) {
  const { items } = useCart()
  const itemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <button
      onClick={onClick}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50 transition-colors ${className}`}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      {/* Cart Icon */}
      <img 
        src="/IMAGES/cart icon.svg" 
        alt="Cart" 
        className="h-5 w-5"
        onError={(e) => {
          // Fallback to SVG if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = '<svg class="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" /></svg>'
          }
        }}
      />
      
      {/* Item Count Badge */}
      {itemCount > 0 && (
        <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </button>
  )
}
