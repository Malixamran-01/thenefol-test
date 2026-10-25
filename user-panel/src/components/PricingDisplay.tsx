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
  
  // Format prices to always show 2 decimal places
  const formatPrice = (price: number): string => {
    return price.toFixed(2)
  }
  
  const formattedMrp = formatPrice(cleanMrp)
  const formattedWebsitePrice = formatPrice(cleanWebsitePrice)
  
  // Show discounted pricing if we have both MRP and website price and they're different
  const hasDiscount = websitePrice && websitePrice !== mrp && cleanWebsitePrice < cleanMrp && cleanWebsitePrice > 0
  
  if (hasDiscount && showDiscount) {
    const discountPercent = Math.round(((cleanMrp - cleanWebsitePrice) / cleanMrp) * 100)
    
    return (
      <div className={`flex flex-col gap-1 ${className}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg sm:text-xl font-bold" style={{color: 'var(--nf-price)'}}>₹{parseFloat(formattedWebsitePrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-sm line-through" style={{ color: 'var(--nf-price-mrp)' }}>MRP. ₹{parseFloat(formattedMrp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          {discountPercent > 0 && (
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded self-start"
              style={{
                color: 'var(--nf-discount-text)',
                backgroundColor: 'var(--nf-discount-bg)'
              }}
            >
              {discountPercent}% OFF
            </span>
          )}
        </div>
      </div>
    )
  }
  
  // Fallback to regular pricing
  return (
    <span className={`text-lg font-medium ${className}`} style={{color: 'var(--nf-price)'}}>
      ₹{parseFloat(formattedMrp).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

export default PricingDisplay
