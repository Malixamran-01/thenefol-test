import React from 'react'

interface PricingDisplayProps {
  product: {
    price?: string
    details?: {
      mrp?: string
      websitePrice?: string
    }
  }
  csvProduct?: {
    'MRP (₹)'?: string
    'MRP '?: string
    'MRP'?: string
    'website price'?: string
    'Website Price'?: string
  }
  className?: string
  showDiscount?: boolean
  inline?: boolean // New prop to control whether to use inline elements
}

export function PricingDisplay({ 
  product, 
  csvProduct, 
  className = '', 
  showDiscount = true,
  inline = false
}: PricingDisplayProps) {
  // Priority: Admin panel data > CSV data > fallback
  const adminMrp = product?.details?.mrp
  const adminWebsitePrice = product?.details?.websitePrice
  const csvMrp = csvProduct?.['MRP (₹)'] || csvProduct?.['MRP '] || csvProduct?.['MRP']
  const csvWebsitePrice = csvProduct?.['website price'] || csvProduct?.['Website Price']
  
  const mrp = adminMrp || csvMrp || product.price || '₹599'
  const websitePrice = adminWebsitePrice || csvWebsitePrice || ''
  
  // Clean price values for calculations
  const cleanMrp = parseFloat(mrp.toString().replace(/[₹,]/g, '')) || 0
  const cleanWebsitePrice = parseFloat(websitePrice.toString().replace(/[₹,]/g, '')) || 0
  
  // Round prices: 415.40 -> 415, 415.70 -> 416
  const roundPrice = (price: number): number => {
    return Math.round(price)
  }
  
  const roundedMrp = roundPrice(cleanMrp)
  const roundedWebsitePrice = roundPrice(cleanWebsitePrice)
  
  // Show discounted pricing if we have both MRP and website price and they're different
  const hasDiscount = websitePrice && websitePrice !== mrp && roundedWebsitePrice < roundedMrp && roundedWebsitePrice > 0
  
  if (hasDiscount && showDiscount) {
    const discountPercent = Math.round(((roundedMrp - roundedWebsitePrice) / roundedMrp) * 100)
    
    return (
      <div className={`flex items-center gap-2 flex-wrap ${className}`}>
        <span className="text-lg sm:text-xl font-bold" style={{color: '#1a1a1a'}}>₹{roundedWebsitePrice.toLocaleString()}</span>
        <span className="text-sm text-gray-500 line-through">₹{roundedMrp.toLocaleString()}</span>
        {discountPercent > 0 && (
          <span className="text-xs sm:text-sm font-medium" style={{color: '#4B97C9'}}>
            {discountPercent}% OFF
          </span>
        )}
      </div>
    )
  }
  
  // Fallback to regular pricing
  return (
    <span className={`text-lg font-medium ${className}`} style={{color: '#1B4965'}}>
      ₹{roundedMrp.toLocaleString()}
    </span>
  )
}

export default PricingDisplay
