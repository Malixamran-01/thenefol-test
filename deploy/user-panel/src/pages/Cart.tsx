import React, { useEffect } from 'react'
import { ShoppingCart, Package, Trash2, Lock } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { parsePrice } from '../contexts/CartContext'
import PricingDisplay from '../components/PricingDisplay'
import AuthGuard from '../components/AuthGuard'
import { pixelEvents, formatCartData } from '../utils/metaPixel'

export default function Cart() {
  const cartContext = useCart()
  
  // Safely access cart properties with fallbacks
  const items = cartContext?.items || []
  const removeItem = cartContext?.removeItem
  const updateQuantity = cartContext?.updateQuantity
  const clear = cartContext?.clear
  const subtotal = cartContext?.subtotal || 0
  const tax = cartContext?.tax || 0
  const total = cartContext?.total || 0
  const loading = cartContext?.loading || false
  const error = cartContext?.error || null

  // Debug: Log cart items to see image data
  console.log('Cart items:', items)

  const handleQuantityChange = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) {
      if (removeItem) await removeItem(cartItemId)
    } else {
      if (updateQuantity) await updateQuantity(cartItemId, newQuantity)
    }
  }

  const handleRemoveItem = async (cartItemId: number) => {
    if (window.confirm('Are you sure you want to remove this item from your cart?')) {
      if (removeItem) await removeItem(cartItemId)
    }
  }

  const handleClearCart = async () => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      if (clear) await clear()
    }
  }

  // Track InitiateCheckout when cart is viewed
  useEffect(() => {
    if (items.length > 0) {
      pixelEvents.initiateCheckout(formatCartData(items))
    }
  }, [items.length])

  const formatPrice = (price: string) => {
    const numericPrice = parsePrice(price)
    return `₹${numericPrice.toLocaleString()}`
  }

  const calculateItemTax = (price: string, quantity: number, category?: string) => {
    const itemPrice = parsePrice(price) // MRP which includes tax
    const categoryLower = (category || '').toLowerCase()
    const taxRate = categoryLower.includes('hair') ? 0.05 : 0.18
    
    // Extract tax from tax-inclusive MRP
    // basePrice = taxInclusivePrice / (1 + taxRate)
    // tax = taxInclusivePrice - basePrice
    const basePrice = itemPrice / (1 + taxRate)
    const itemTax = itemPrice - basePrice
    
    return `₹${(itemTax * quantity).toLocaleString()}`
  }

  const getTaxRateText = (category?: string) => {
    const categoryLower = (category || '').toLowerCase()
    return categoryLower.includes('hair') ? '5%' : '18%'
  }

  const calculateItemTotal = (price: string, quantity: number) => {
    const numericPrice = parsePrice(price)
    return `₹${(numericPrice * quantity).toLocaleString()}`
  }

  return (
    <AuthGuard>
    <div className="min-h-screen py-12 sm:py-16 md:py-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 sm:mb-16">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl font-light mb-6 tracking-[0.15em]" 
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Shopping Cart
          </h1>
          <p className="text-sm sm:text-base font-light tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>Review your items and proceed to checkout</p>
        </div>

        {items.length === 0 ? (
          /* Empty Cart */
          <div className="text-center py-16">
            <div className="mb-6">
              <img 
                src="/IMAGES/BANNER (2).webp" 
                alt="Empty Cart" 
                className="w-32 h-32 mx-auto rounded-lg object-cover shadow-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  target.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden w-32 h-32 mx-auto bg-slate-100 rounded-lg shadow-lg flex items-center justify-center">
                <ShoppingCart className="h-16 w-16 text-slate-400" />
              </div>
            </div>
            <h2 
              className="text-2xl sm:text-3xl font-light mb-6 tracking-[0.1em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.1em'
              }}
            >
              Your cart is empty
            </h2>
            <p className="mb-10 text-sm sm:text-base font-light tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>Looks like you haven't added any items to your cart yet.</p>
            <a 
              href="#/user/shop" 
              className="inline-block text-white px-8 py-4 text-xs font-light tracking-[0.15em] uppercase transition-all duration-300 border border-transparent hover:border-slate-900"
              style={{
                backgroundColor: 'var(--arctic-blue-primary)',
                letterSpacing: '0.15em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
              }}
            >
              Start Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold" style={{color: '#1B4965'}}>
                    Cart Items ({items.length})
                  </h2>
                  <button
                    onClick={handleClearCart}
                    className="font-medium text-sm hover:underline"
                    style={{color: '#ef4444'}}
                  >
                    Clear Cart
                  </button>
                </div>

                <div className="space-y-4">
                  {loading && (
                    <div className="text-center py-8">
                      <p className="mt-2 text-slate-600">Loading cart...</p>
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                      <p className="text-red-600">Error: {error}</p>
                    </div>
                  )}
                  
                  {items.map((item) => (
                    <div key={item.id || `${item.slug}-${item.product_id}`} className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 p-3 sm:p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <img
                            src={item.image || '/IMAGES/BANNER (1).webp'}
                            alt={item.title}
                            className="w-24 h-24 object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow"
                            style={{borderColor: '#D0E8F2'}}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              console.log('Image failed to load:', target.src)
                              
                              // Prevent infinite loop by checking if we've already tried fallbacks
                              if (!target.dataset.fallbackAttempted) {
                                target.dataset.fallbackAttempted = 'true'
                                // Try fallback images in order (convert to webp)
                                if (target.src.includes('/IMAGES/BANNER (1).')) {
                                  target.src = '/IMAGES/face.webp'
                                } else if (target.src.includes('/IMAGES/face.')) {
                                  target.src = '/IMAGES/body.webp'
                                } else {
                                  // If all fallbacks fail, show placeholder
                                  target.style.display = 'none'
                                  const placeholder = target.nextElementSibling as HTMLElement
                                  if (placeholder) placeholder.classList.remove('hidden')
                                }
                              } else {
                                // If fallback also failed, show placeholder
                                target.style.display = 'none'
                                const placeholder = target.nextElementSibling as HTMLElement
                                if (placeholder) placeholder.classList.remove('hidden')
                              }
                            }}
                          />
                          {/* Placeholder for when image fails to load */}
                          <div className="hidden w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg border border-slate-200 flex items-center justify-center shadow-sm">
                            <Package className="h-8 w-8 text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold truncate" style={{color: '#1B4965'}}>
                          {item.title}
                        </h3>
                        <div className="text-slate-600 text-sm">
                          <PricingDisplay 
                            product={item} 
                            csvProduct={undefined}
                            className="text-sm"
                            inline={true}
                          />
                        </div>
                        <p className="text-slate-600 text-sm">
                          Total: {calculateItemTotal(item.price, item.quantity)}
                        </p>
                        <p className="text-slate-600 text-sm">
                          GST ({getTaxRateText(item.category)}): {calculateItemTax(item.price, item.quantity, item.category)}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleQuantityChange(item.id || item.product_id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-semibold text-slate-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id || item.product_id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors"
                        >
                          +
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id || item.product_id)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 sticky top-8">
                <h2 className="text-xl font-semibold text-slate-800 mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  {/* Calculate MRP Total and Product Discount */}
                  {(() => {
                    const mrpTotal = items.reduce((sum, item) => {
                      // Priority order for MRP:
                      // 1. Cart item mrp field (from backend)
                      // 2. CSV product MRP (if available)
                      // 3. Fallback to price only if no MRP found
                      let itemMrp = null
                      
                      const itemAny = item as any
                      if (itemAny.mrp) {
                        itemMrp = itemAny.mrp
                      } else if (itemAny.details?.mrp) {
                        itemMrp = itemAny.details.mrp
                      } else if (itemAny.product?.details?.mrp) {
                        itemMrp = itemAny.product.details.mrp
                      } else if (itemAny.csvProduct) {
                        const csvProduct = itemAny.csvProduct
                        itemMrp = csvProduct['MRP (₹)'] || csvProduct['MRP '] || csvProduct['MRP'] || 
                                  csvProduct['mrp'] || csvProduct['MRP(₹)'] || csvProduct['MRP(₹) ']
                      }
                      
                      if (!itemMrp) {
                        itemMrp = item.price // Last resort fallback
                      }
                      
                      return sum + (parsePrice(itemMrp || '0') * item.quantity)
                    }, 0)
                    
                    const productDiscount = items.reduce((sum, item) => {
                      const itemAny = item as any
                      let itemMrp = null
                      
                      if (itemAny.mrp) {
                        itemMrp = itemAny.mrp
                      } else if (itemAny.details?.mrp) {
                        itemMrp = itemAny.details.mrp
                      } else if (itemAny.product?.details?.mrp) {
                        itemMrp = itemAny.product.details.mrp
                      } else if (itemAny.csvProduct) {
                        const csvProduct = itemAny.csvProduct
                        itemMrp = csvProduct['MRP (₹)'] || csvProduct['MRP '] || csvProduct['MRP'] || 
                                  csvProduct['mrp'] || csvProduct['MRP(₹)'] || csvProduct['MRP(₹) ']
                      }
                      
                      if (!itemMrp) {
                        itemMrp = item.price
                      }
                      
                      const mrp = parsePrice(itemMrp || '0')
                      const currentPrice = parsePrice(item.price)
                      const discount = (mrp - currentPrice) * item.quantity
                      return sum + Math.max(0, discount)
                    }, 0)
                    
                    const shipping = 0
                    const calculatedTax = items.reduce((totalTax, item) => {
                      const itemPrice = parsePrice(item.price)
                      const category = (item.category || '').toLowerCase()
                      const taxRate = category.includes('hair') ? 0.05 : 0.18
                      const basePrice = itemPrice / (1 + taxRate)
                      const itemTax = itemPrice - basePrice
                      return totalTax + (itemTax * item.quantity)
                    }, 0)
                    
                    return (
                      <>
                        {/* MRP Total */}
                        <div className="flex justify-between text-slate-600">
                          <span>MRP</span>
                          <span>₹{mrpTotal.toLocaleString()}</span>
                        </div>
                        
                        {/* Product Discount */}
                        {productDiscount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Product Discount</span>
                            <span>-₹{productDiscount.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {/* Subtotal */}
                        <div className="flex justify-between font-medium text-slate-700">
                          <span>Subtotal ({items.length} items)</span>
                          <span>₹{subtotal.toLocaleString()}</span>
                        </div>
                        
                        {/* Shipping */}
                        <div className="flex justify-between text-slate-600">
                          <span>Shipping Charges</span>
                          <span className={shipping > 0 ? '' : 'text-green-600'}>
                            {shipping > 0 ? `₹${shipping.toFixed(2)}` : 'Free'}
                          </span>
                        </div>
                        
                        {/* GST breakdown by category */}
                        {items.some(item => (item.category || '').toLowerCase().includes('hair')) && (
                          <div className="flex justify-between text-slate-600">
                            <span>GST (5% - Hair Products, Inclusive)</span>
                            <span>₹{items.reduce((sum, item) => {
                              const category = (item.category || '').toLowerCase()
                              if (category.includes('hair')) {
                                const itemPrice = parsePrice(item.price)
                                const basePrice = itemPrice / 1.05
                                const itemTax = itemPrice - basePrice
                                return sum + (itemTax * item.quantity)
                              }
                              return sum
                            }, 0).toLocaleString()}</span>
                          </div>
                        )}
                        {items.some(item => !(item.category || '').toLowerCase().includes('hair')) && (
                          <div className="flex justify-between text-slate-600">
                            <span>GST (18% - Other Products, Inclusive)</span>
                            <span>₹{items.reduce((sum, item) => {
                              const category = (item.category || '').toLowerCase()
                              if (!category.includes('hair')) {
                                const itemPrice = parsePrice(item.price)
                                const basePrice = itemPrice / 1.18
                                const itemTax = itemPrice - basePrice
                                return sum + (itemTax * item.quantity)
                              }
                              return sum
                            }, 0).toLocaleString()}</span>
                          </div>
                        )}
                        
                        {/* Grand Total */}
                        <hr className="border-slate-200" />
                        <div className="flex justify-between text-lg font-bold" style={{color: '#1B4965'}}>
                          <span>Grand Total</span>
                          <span>₹{total.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">* MRP includes GST</div>
                      </>
                    )
                  })()}
                </div>

                <div className="space-y-3">
                  <a
                    href="#/user/checkout"
                    className="block w-full text-white py-3 px-4 rounded-lg font-semibold text-center hover:shadow-lg transition-all duration-300 hover:scale-105"
                    style={{backgroundColor: '#1B4965'}}
                  >
                    Proceed to Checkout
                  </a>
                  <a
                    href="#/user/shop"
                    className="block w-full py-3 px-4 rounded-lg font-semibold text-center transition-colors"
                    style={{borderColor: '#9DB4C0', borderWidth: '1px', color: '#1B4965'}}
                  >
                    Continue Shopping
                  </a>
                </div>

                {/* Security Badge */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-center space-x-2 text-slate-500 text-sm">
                    <Lock className="h-4 w-4" />
                    <span>Secure Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  )
}
