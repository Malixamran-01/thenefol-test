import React, { useState, useEffect } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

interface StickyAddToCartProps {
  product: {
    id?: number
    title: string
    price: string | number
    slug: string
    listImage?: string
  }
  quantity?: number
  className?: string
}

export default function StickyAddToCart({ 
  product, 
  quantity = 1,
  className = '' 
}: StickyAddToCartProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const cartContext = useCart()
  const { isAuthenticated } = useAuth()
  const addItem = cartContext?.addItem

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY || window.pageYOffset
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Show sticky cart when scrolled past 300px and not near bottom
      if (scrollPosition > 300 && scrollPosition < documentHeight - windowHeight - 100) {
        setIsVisible(true)
        setScrolled(true)
      } else {
        setIsVisible(false)
        if (scrollPosition < 300) {
          setScrolled(false)
        }
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      window.location.hash = '#/user/login'
      return
    }

    if (addItem && product.id) {
      try {
        addItem({
          id: product.id,
          slug: product.slug,
          title: product.title,
          price: typeof product.price === 'number' ? String(product.price) : product.price,
          listImage: product.listImage || '',
          pdpImages: [],
          description: ''
        }, quantity)
        
        // Show success feedback
        const button = document.querySelector('.sticky-add-to-cart-btn') as HTMLElement
        if (button) {
          button.classList.add('animate-pulse')
          setTimeout(() => button.classList.remove('animate-pulse'), 1000)
        }
      } catch (error) {
        console.error('Failed to add to cart:', error)
      }
    }
  }

  if (!isVisible) return null

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 transform transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {product.listImage && (
            <img 
              src={product.listImage} 
              alt={product.title}
              className="w-16 h-16 object-cover rounded-lg"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" style={{color: '#1B4965'}}>
              {product.title}
            </h3>
            <p className="text-sm font-semibold mt-1" style={{color: '#4B97C9'}}>
              ₹{typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleAddToCart}
          className="sticky-add-to-cart-btn flex items-center gap-2 px-6 py-3 text-white font-medium transition-all duration-300 rounded-lg shadow-md hover:shadow-lg hover:scale-105"
          style={{backgroundColor: '#4B97C9', minWidth: '160px'}}
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Add to Cart</span>
        </button>
      </div>
    </div>
  )
}

