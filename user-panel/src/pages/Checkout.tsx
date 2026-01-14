import { useEffect, useMemo, useState } from 'react'
import { useCart, parsePrice, roundPrice, formatPrice } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { CreditCard, Smartphone, Wallet, Coins, MapPin, CheckCircle } from 'lucide-react'
import PricingDisplay from '../components/PricingDisplay'
import AuthGuard from '../components/AuthGuard'
import PhoneInput from '../components/PhoneInput'
import { pixelEvents, formatPurchaseData, formatCartData } from '../utils/metaPixel'
import { getApiBase } from '../utils/apiBase'

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay Secure (UPI, Cards, Int\'l Cards, Wallets)', icon: CreditCard, color: 'rgb(75,151,201)' },
  { id: 'cod', name: 'Cash on Delivery', icon: CreditCard, color: 'bg-green-600' }
]

interface CheckoutProps {
  affiliateId?: string | null
}

export default function Checkout({ affiliateId }: CheckoutProps) {
  const cartContext = useCart()
  
  // Safely access cart properties with fallbacks
  const items = cartContext?.items || []
  const subtotal = cartContext?.subtotal || 0
  const tax = cartContext?.tax || 0
  const total = cartContext?.total || 0
  const clear = cartContext?.clear
  const { user, isAuthenticated } = useAuth()
  const [buySlug, setBuySlug] = useState<string | null>(null)
  const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState('razorpay')
  const [paymentType, setPaymentType] = useState<'prepaid' | 'postpaid'>('prepaid')
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([])
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [totalCoins, setTotalCoins] = useState(0) // Total coins available (loyalty + affiliate)
  const [coinsToUse, setCoinsToUse] = useState(0) // Coins user wants to use
  const [useCoins, setUseCoins] = useState(false) // Whether user wants to use coins
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null)
  const [csvProducts, setCsvProducts] = useState<any>({}) // Store CSV product data by slug

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [countryCode, setCountryCode] = useState('+91')
  const [address, setAddress] = useState('')
  const [apartment, setApartment] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('Uttar Pradesh')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('India')
  const [saveInfo, setSaveInfo] = useState(false)
  const [newsOffers, setNewsOffers] = useState(false)
  const [gstNumber, setGstNumber] = useState('')
  const [sameAsShipping, setSameAsShipping] = useState(true)
  const [billingFirstName, setBillingFirstName] = useState('')
  const [billingLastName, setBillingLastName] = useState('')
  const [billingCompany, setBillingCompany] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [billingApartment, setBillingApartment] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('Uttar Pradesh')
  const [billingZip, setBillingZip] = useState('')
  const [billingCountry, setBillingCountry] = useState('India')
  const [billingPhone, setBillingPhone] = useState('')
  const [billingCountryCode, setBillingCountryCode] = useState('+91')
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('')
  const [showNewAddressForm, setShowNewAddressForm] = useState(false) // Track if user wants to enter new address

  // Normalize any stored phone (with or without country code) to 10 digits for UI
  const normalizeTenDigitPhone = (raw: string): string => {
    if (!raw) return ''
    const clean = raw.replace(/\D/g, '')
    if (clean.length <= 10) return clean
    return clean.slice(-10)
  }

  useEffect(() => {
    const u = new URL(window.location.href)
    const s = u.hash.split('?')[1] || ''
    const params = new URLSearchParams(s)
    const slug = params.get('buy')
    const orderNumber = params.get('order')
    setBuySlug(slug)
    setPendingOrderNumber(orderNumber)
    
    // If there's a pending order, load it into cart
    if (orderNumber && isAuthenticated) {
      loadPendingOrderIntoCart(orderNumber)
    }
    
    // Load user data if authenticated
    if (isAuthenticated && user) {
      const fullName = user.name || ''
      const nameParts = fullName.split(' ')
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setEmail(user.email || '')
      setPhone(normalizeTenDigitPhone(user.phone || ''))
      setAddress(user.address?.street || '')
      setCity(user.address?.city || '')
      setState(user.address?.state || 'Uttar Pradesh')
      setZip(user.address?.zip || '')
      setCountry('India')
      setLoyaltyPoints(user.loyalty_points || 0)
    }
    
    // Fetch available payment methods
    fetchPaymentMethods()
    
    // Fetch CSV product data
    fetchCsvProducts()
    
    // Fetch coins balance if authenticated
    if (isAuthenticated) {
      fetchCoinsBalance()
      fetchSavedAddresses()
    }
  }, [isAuthenticated, user])
  
  const loadPendingOrderIntoCart = async (orderNumber: string) => {
    try {
      setLoading(true)
      // Fetch order details
      const orderData = await api.orders.getById(orderNumber)
      
      // Check if order is pending payment
      if (orderData.status !== 'pending_payment' && orderData.status !== 'pending-payment') {
        setError('This order is not pending payment')
        setLoading(false)
        return
      }
      
      // Pre-fill address from order
      if (orderData.shipping_address) {
        const shippingAddr = typeof orderData.shipping_address === 'string' 
          ? JSON.parse(orderData.shipping_address) 
          : orderData.shipping_address
        
        if (shippingAddr.firstName) setFirstName(shippingAddr.firstName)
        if (shippingAddr.lastName) setLastName(shippingAddr.lastName)
        if (shippingAddr.email) setEmail(shippingAddr.email)
        if (shippingAddr.phone) setPhone(normalizeTenDigitPhone(shippingAddr.phone))
        if (shippingAddr.address) setAddress(shippingAddr.address)
        if (shippingAddr.apartment) setApartment(shippingAddr.apartment)
        if (shippingAddr.city) setCity(shippingAddr.city)
        if (shippingAddr.state) setState(shippingAddr.state)
        if (shippingAddr.zip || shippingAddr.pincode) setZip(shippingAddr.zip || shippingAddr.pincode)
        if (shippingAddr.country) setCountry(shippingAddr.country)
      }
      
      // Add order items to cart
      const orderItems = Array.isArray(orderData.items) ? orderData.items : []
      const addItem = cartContext?.addItem
      
      if (addItem && orderItems.length > 0) {
        // Clear current cart first (optional - you might want to merge instead)
        // if (clear) await clear()
        
        // Add each item from the order to cart
        for (const item of orderItems) {
          // Get product details by slug or product_id
          let product: any = null
          
          if (item.slug) {
            try {
              product = await api.products.getBySlug(item.slug)
            } catch (err) {
              console.error(`Failed to fetch product by slug ${item.slug}:`, err)
            }
          } else if (item.product_id) {
            try {
              product = await api.products.getById(item.product_id)
            } catch (err) {
              console.error(`Failed to fetch product by ID ${item.product_id}:`, err)
            }
          }
          
          if (product && product.id) {
            // Use the price from order item or product
            const itemPrice = item.price || item.unit_price || product.price
            const quantity = item.quantity || item.qty || 1
            
            await addItem({
              id: product.id,
              slug: product.slug || item.slug,
              title: item.name || item.title || product.title,
              price: typeof itemPrice === 'number' ? String(itemPrice) : itemPrice,
              listImage: product.list_image || product.listImage || item.image || '',
              pdpImages: product.pdp_images || product.pdpImages || [],
              description: product.description || '',
              category: product.category || item.category || '',
              ...(item.mrp || (product as any).details?.mrp || (product as any).mrp ? { mrp: item.mrp || (product as any).details?.mrp || (product as any).mrp } : {}),
              details: product.details || {}
            } as any, quantity)
          } else {
            // Fallback: try to add with available data
            if (item.product_id && addItem) {
              await addItem({
                id: item.product_id,
                slug: item.slug || '',
                title: item.name || item.title || 'Product',
                price: typeof item.price === 'number' ? String(item.price) : (item.price || '0'),
                listImage: item.image || '',
                pdpImages: [],
                description: '',
                category: item.category || '',
                ...((item as any).mrp ? { mrp: (item as any).mrp } : {}),
                details: {}
              } as any, item.quantity || item.qty || 1)
            }
          }
        }
      }
      
      setLoading(false)
    } catch (err: any) {
      console.error('Failed to load pending order into cart:', err)
      setError(err?.message || 'Failed to load order. Please try again.')
      setLoading(false)
    }
  }

  const fetchSavedAddresses = async () => {
    try {
      const addressesData = await api.user.getAddresses()
      if (addressesData && addressesData.length > 0) {
        setSavedAddresses(addressesData)
        // Auto-select default address if available
        const defaultAddress = addressesData.find((addr: any) => addr.is_default)
        if (defaultAddress) {
          setSelectedSavedAddress(String(defaultAddress.id))
          setShowNewAddressForm(false) // Hide form when default address is selected
          fillAddressFromSaved(defaultAddress)
        } else {
          // If no default address, show form if no addresses exist
          setShowNewAddressForm(addressesData.length === 0)
        }
      }
    } catch (error) {
      console.error('Failed to fetch saved addresses:', error)
    }
  }

  const fillAddressFromSaved = (savedAddress: any) => {
    const fullName = savedAddress.name || ''
    const nameParts = fullName.split(' ')
    setFirstName(nameParts[0] || '')
    setLastName(nameParts.slice(1).join(' ') || '')
    setPhone(normalizeTenDigitPhone(savedAddress.phone || ''))
    // Map saved address fields to checkout fields (support both old and new formats)
    setAddress(savedAddress.address || savedAddress.street || '')
    setApartment(savedAddress.apartment || savedAddress.area || savedAddress.landmark || '')
    setCity(savedAddress.city || '')
    setState(savedAddress.state || 'Uttar Pradesh')
    setZip(savedAddress.zip || savedAddress.pincode || '')
    setCountry(savedAddress.country || 'India')
    // Email is already set from user object in useEffect
  }

  const handleSavedAddressChange = (addressId: string) => {
    setSelectedSavedAddress(addressId)
    if (addressId) {
      setShowNewAddressForm(false) // Hide form when saved address is selected
    }
    const selectedAddress = savedAddresses.find((addr: any) => String(addr.id) === addressId)
    if (selectedAddress) {
      fillAddressFromSaved(selectedAddress)
    }
  }
  
  const fetchCoinsBalance = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return
      
      const apiBase = getApiBase()
      
      // Fetch loyalty points (Nefol coins)
      const coinsResponse = await fetch(`${apiBase}/api/nefol-coins`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      let loyaltyCoins = 0
      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json()
        loyaltyCoins = coinsData.nefol_coins || 0
      }
      
      // Fetch affiliate earnings to calculate coins (1 rupee = 10 coins)
      // Only fetch if user is authenticated
      let affiliateCoins = 0
      if (isAuthenticated && token) {
        try {
          const affiliateResponse = await fetch(`${apiBase}/api/affiliate/dashboard`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (affiliateResponse.ok) {
            const affiliateData = await affiliateResponse.json()
            if (affiliateData.total_earnings) {
              // Calculate coins from affiliate earnings: 1 rupee = 10 coins
              affiliateCoins = Math.floor(affiliateData.total_earnings * 10)
            }
          } else if (affiliateResponse.status !== 404) {
            // Only log non-404 errors (404 means user is not an affiliate, which is expected)
            console.warn('Affiliate dashboard error:', affiliateResponse.status)
          }
        } catch (error) {
          // Ignore affiliate errors - user might not be an affiliate
          // Only log if it's not a network error
          if (error instanceof TypeError && error.message.includes('fetch')) {
            // Network error, silently ignore
          } else {
            console.warn('Affiliate check failed:', error)
          }
        }
      }
      
      setTotalCoins(loyaltyCoins + affiliateCoins)
    } catch (error) {
      console.error('Failed to fetch coins balance:', error)
    }
  }
  
  const fetchCsvProducts = async () => {
    try {
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/products-csv`)
      if (response.ok) {
        const data = await response.json()
        // Create a map of slug to CSV data
        const csvMap: any = {}
        data.forEach((csvProduct: any) => {
          // Handle potential variations in column names (trim spaces)
          const normalizedProduct: any = {}
          Object.keys(csvProduct).forEach(key => {
            const normalizedKey = key.trim()
            normalizedProduct[normalizedKey] = csvProduct[key]
          })
          
          const csvSlug = normalizedProduct['Slug'] || normalizedProduct['Product Name']?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || ''
          
          if (csvSlug) {
            csvMap[csvSlug] = normalizedProduct
            // Debug: log HSN codes
            if (csvSlug === 'nefol-hair-mask') {
              console.log('🔍 Hair Mask CSV Data:', normalizedProduct)
              console.log('🔍 HSN Code:', normalizedProduct['HSN Code'])
            }
          }
        })
        console.log('📊 CSV Products Map:', csvMap)
        setCsvProducts(csvMap)
      }
    } catch (error) {
      console.error('Failed to fetch CSV products:', error)
    }
  }

  const orderItems = useMemo(() => {
    const baseItems: any[] = buySlug 
      ? items.filter(i => i.slug === buySlug)
      : items
    
    // Enrich with CSV data if available
    const enrichedItems = baseItems.map((item: any) => {
      const csvProduct = csvProducts[item.slug]
      
      // Debug: Log item details for MRP checking
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 Item: ${item.title}`, {
          mrp: item.mrp,
          details: item.details,
          price: item.price,
          csvProduct: csvProduct ? {
            'MRP (₹)': csvProduct['MRP (₹)'],
            'MRP ': csvProduct['MRP '],
            'MRP': csvProduct['MRP'],
            'mrp': csvProduct['mrp']
          } : null
        })
      }
      
      return {
        ...item,
        csvProduct: csvProduct || null
      }
    })
    
    return enrichedItems
  }, [buySlug, items, csvProducts])

  const fetchPaymentMethods = async () => {
    try {
      const apiHost = (import.meta as any).env?.VITE_BACKEND_HOST || (import.meta as any).env?.VITE_API_HOST || window.location.hostname
      const apiPort = (import.meta as any).env?.VITE_BACKEND_PORT || (import.meta as any).env?.VITE_API_PORT || '4000'
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/payment-gateways`)
      if (response.ok) {
        const data = await response.json()
        setAvailablePaymentMethods(data.filter((gateway: any) => gateway.is_active))
      }
    } catch (error) {
      console.error('Failed to fetch payment methods:', error)
    }
  }

  const applyDiscountCode = async () => {
    try {
      if (!discountCode || discountCode.trim() === '') {
        setError('Please enter a discount code')
        return
      }

      if (!calcSubtotal || calcSubtotal <= 0) {
        setError('Order amount must be greater than zero')
        return
      }

      // Get product IDs from cart items
      const productIds = orderItems
        .map((item: any) => {
          // Try product_id first, then id, then check if item itself is a number
          const pid = item.product_id || item.id || (typeof item === 'number' ? item : null)
          return pid != null ? parseInt(String(pid)) : null
        })
        .filter((id: number | null): id is number => id != null && !isNaN(id))
      
      console.log('Cart product IDs for discount validation:', { 
        orderItemsCount: orderItems.length,
        productIds,
        items: orderItems.map((item: any) => ({ 
          title: item.title || item.name, 
          product_id: item.product_id, 
          id: item.id 
        }))
      })

      const apiBase = getApiBase()
      console.log('Applying discount code:', { 
        code: discountCode, 
        amount: calcSubtotal,
        productIds,
        customer_email: email || user?.email
      })
      
      const response = await fetch(`${apiBase}/api/discounts/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: discountCode.trim(), 
          amount: calcSubtotal,
          product_ids: productIds, // Send array of product IDs from cart
          customer_email: email || user?.email || null
        })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        const discount = responseData.data || responseData // Handle both { data: ... } and direct response
        console.log('Discount applied successfully:', discount)
        setAppliedDiscount(discount)
        setError(null)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Failed to apply discount code' }))
        const errorMessage = errorData.message || errorData.error || 'Invalid discount code'
        console.error('Discount code error:', { 
          code: discountCode, 
          status: response.status, 
          error: errorMessage 
        })
        setError(errorMessage)
        setAppliedDiscount(null)
      }
    } catch (error: any) {
      console.error('Error applying discount code:', error)
      setError(error?.message || 'Failed to apply discount code. Please try again.')
      setAppliedDiscount(null)
    }
  }

  const calcSubtotal = useMemo(() => {
    if (buySlug) {
      const total = orderItems.reduce((s, i) => s + parsePrice(i.price) * (i.quantity || 1), 0)
      return roundPrice(total)
    }
    return roundPrice(subtotal)
  }, [buySlug, orderItems, subtotal])

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0
    // Use discountAmount from API response if available (already calculated)
    if (appliedDiscount.discountAmount !== undefined) {
      return roundPrice(appliedDiscount.discountAmount)
    }
    // Fallback to calculating locally
    if (appliedDiscount.type === 'percentage') {
      let discount = (calcSubtotal * appliedDiscount.value) / 100
      // Apply max discount if set
      if (appliedDiscount.maxDiscount && discount > appliedDiscount.maxDiscount) {
        discount = appliedDiscount.maxDiscount
      }
      return roundPrice(discount)
    }
    return roundPrice(appliedDiscount.value)
  }

  const calculateFinalTotal = () => {
    const discountAmount = calculateDiscountAmount()
    // 1 rupee = 10 coins, so coins discount = coinsToUse / 10 (in rupees)
    const coinsDiscount = selectedPayment === 'coins' ? Math.min(coinsToUse / 10, calcSubtotal - discountAmount) : 0
    return Math.max(0, calcSubtotal - discountAmount - coinsDiscount)
  }

  const shipping = 0
  
  // Calculate tax from MRP (tax-inclusive pricing)
  // Extract tax from price for each product based on category
  // GST is already included in MRP, so we extract it for display purposes only
  const calculateTax = () => {
    if (buySlug) {
      // For single item checkout
      const item = orderItems[0]
      if (!item) return 0
      const itemPrice = parsePrice(item.price) // MRP which includes tax
      const category = (item.category || '').toLowerCase()
      const taxRate = category.includes('hair') ? 0.05 : 0.18
      
      // Extract tax from tax-inclusive MRP
      // basePrice = taxInclusivePrice / (1 + taxRate)
      // tax = taxInclusivePrice - basePrice
      const basePrice = itemPrice / (1 + taxRate)
      const itemTax = itemPrice - basePrice
      
      return roundPrice(itemTax * (item.quantity || 1))
    }
    
    // For cart checkout - calculate GST for each product separately
    return orderItems.reduce((total, item: any) => {
      const itemPrice = parsePrice(item.price) // MRP which includes tax
      const category = (item.category || '').toLowerCase()
      const taxRate = category.includes('hair') ? 0.05 : 0.18
      
      // Extract tax from tax-inclusive MRP
      const basePrice = itemPrice / (1 + taxRate)
      const itemTax = itemPrice - basePrice
      
      return total + roundPrice(itemTax * (item.quantity || 1))
    }, 0)
  }
  
  // Calculate GST breakdown by rate (for display)
  const calculateGstBreakdown = () => {
    const breakdown: { rate: number; amount: number; items: string[] }[] = []
    
    orderItems.forEach((item: any) => {
      const itemPrice = parsePrice(item.price)
      const category = (item.category || '').toLowerCase()
      const taxRate = category.includes('hair') ? 0.05 : 0.18
      
      const basePrice = itemPrice / (1 + taxRate)
      const itemTax = itemPrice - basePrice
      const totalItemTax = roundPrice(itemTax * (item.quantity || 1))
      
      const existing = breakdown.find(b => b.rate === taxRate)
      if (existing) {
        existing.amount += totalItemTax
        existing.items.push(item.title || item.slug)
      } else {
        breakdown.push({
          rate: taxRate,
          amount: totalItemTax,
          items: [item.title || item.slug]
        })
      }
    })
    
    return breakdown.map(b => ({
      ...b,
      amount: roundPrice(b.amount)
    }))
  }
  
  // Calculate MRP total and product discount
  const calculateMrpTotal = () => {
    return orderItems.reduce((total, item: any) => {
      // Priority order for MRP:
      // 1. Cart item mrp field (from backend product details)
      // 2. CSV product MRP (check all possible column name variations)
      // 3. Don't fallback to item.price as that's the discounted price
      let itemMrp = null
      
      if (item.mrp) {
        itemMrp = item.mrp
      } else if (item.details?.mrp) {
        itemMrp = item.details.mrp
      } else if (item.product?.details?.mrp) {
        itemMrp = item.product.details.mrp
      } else if (item.csvProduct) {
        // Check CSV product for MRP in various column name formats
        const csvProduct = item.csvProduct
        itemMrp = csvProduct['MRP (₹)'] || csvProduct['MRP '] || csvProduct['MRP'] || 
                  csvProduct['mrp'] || csvProduct['MRP(₹)'] || csvProduct['MRP(₹) ']
      }
      
      // Only use item.price as absolute last resort if no MRP found anywhere
      if (!itemMrp) {
        console.warn(`⚠️ MRP not found for item: ${item.title || item.slug}, using price as fallback`)
        itemMrp = item.price
      }
      
      const mrp = parsePrice(itemMrp || '0')
      if (mrp === 0) {
        console.warn(`⚠️ MRP is 0 for item: ${item.title || item.slug}`)
      }
      return total + roundPrice(mrp * (item.quantity || 1))
    }, 0)
  }

  const calculateProductDiscount = () => {
    return orderItems.reduce((total, item: any) => {
      // Use same priority order for MRP
      let itemMrp = null
      
      if (item.mrp) {
        itemMrp = item.mrp
      } else if (item.details?.mrp) {
        itemMrp = item.details.mrp
      } else if (item.product?.details?.mrp) {
        itemMrp = item.product.details.mrp
      } else if (item.csvProduct) {
        const csvProduct = item.csvProduct
        itemMrp = csvProduct['MRP (₹)'] || csvProduct['MRP '] || csvProduct['MRP'] || 
                  csvProduct['mrp'] || csvProduct['MRP(₹)'] || csvProduct['MRP(₹) ']
      }
      
      // If no MRP found, skip discount calculation for this item (don't use price as fallback)
      if (!itemMrp) {
        console.warn(`⚠️ MRP not found for item: ${item.title || item.slug}, skipping discount calculation`)
        return total
      }
      
      const mrp = parsePrice(itemMrp || '0')
      const currentPrice = parsePrice(item.price) // This is websitePrice (after product discount)
      
      // Only calculate discount if MRP is greater than current price
      if (mrp > currentPrice && mrp > 0) {
        const productDiscount = (mrp - currentPrice) * (item.quantity || 1)
        return total + roundPrice(productDiscount)
      }
      
      return total
    }, 0)
  }

  const calculatedTax = roundPrice(calculateTax())
  const gstBreakdown = calculateGstBreakdown()
  const discountAmount = calculateDiscountAmount() // Coupon code discount
  const mrpTotal = calculateMrpTotal()
  const productDiscount = calculateProductDiscount()
  // 1 rupee = 10 coins, so coins discount = coinsToUse / 10 (in rupees)
  const coinsDiscount = useCoins ? roundPrice(Math.min(coinsToUse / 10, calcSubtotal - discountAmount)) : 0
  
  // Final subtotal after coupon discount (for coins calculation)
  const finalSubtotal = roundPrice(calcSubtotal - discountAmount)
  
  // IMPORTANT: GST is already included in calcSubtotal (MRP includes GST)
  // Grand Total = Subtotal + Shipping (GST already included, don't add it again)
  // Coupon and Coins are deducted from Grand Total
  const grandTotalBeforeDiscounts = roundPrice(calcSubtotal + shipping)
  
  // Net Payable = Grand Total - Coupon - Coins
  const grandTotal = roundPrice(Math.max(0, grandTotalBeforeDiscounts - discountAmount - coinsDiscount))

  // Payment rules: <1000 prepaid/postpaid, >1000 prepaid only
  const canUsePostpaid = grandTotal < 1000
  const isCOD = selectedPayment === 'cod'

  useEffect(() => {
    if (!canUsePostpaid) {
      setPaymentType('prepaid')
    }
  }, [canUsePostpaid])

  // Helper function to enrich order items with CSV data
  const enrichOrderItems = () => {
    return orderItems.map((item: any) => {
      const csvProduct = csvProducts[item.slug] || {}
      return {
        ...item,
        csvProduct: {
          'Brand Name': csvProduct['Brand Name'],
          'SKU': csvProduct['SKU'],
          'HSN Code': csvProduct['HSN Code'],
          'Net Quantity (Content)': csvProduct['Net Quantity (Content)'],
          'Unit Count (Pack of)': csvProduct['Unit Count (Pack of)'],
          'Net Weight (Product Only)': csvProduct['Net Weight (Product Only)'],
          'Dead Weight (Packaging Only)': csvProduct['Dead Weight (Packaging Only)'],
          'GST %': csvProduct['GST %'],
          'Country of Origin': csvProduct['Country of Origin'],
          'Manufacturer / Packer / Importer': csvProduct['Manufacturer / Packer / Importer'],
          'Key Ingredients': csvProduct['Key Ingredients'],
          'Ingredient Benefits': csvProduct['Ingredient Benefits'],
          'How to Use (Steps)': csvProduct['How to Use (Steps)'],
          'Package Content Details': csvProduct['Package Content Details'],
          'Inner Packaging Type': csvProduct['Inner Packaging Type'],
          'Outer Packaging Type': csvProduct['Outer Packaging Type'],
          'Hazardous / Fragile (Y/N)': csvProduct['Hazardous / Fragile (Y/N)'],
          'Special Attributes (Badges)': csvProduct['Special Attributes (Badges)'],
          'Product Category': csvProduct['Product Category'],
          'Product Sub-Category': csvProduct['Product Sub-Category'],
          'Product Type': csvProduct['Product Type'],
          'Skin/Hair Type': csvProduct['Skin/Hair Type'],
          'MRP': csvProduct['MRP'],
          'website price': csvProduct['website price'],
          'discount': csvProduct['discount'],
          'Image Links': csvProduct['Image Links'],
          'Video Links': csvProduct['Video Links']
        }
      }
    })
  }

  // Handle Razorpay payment
  const handleRazorpayPayment = async () => {
    try {
      // If grandTotal is 0 (fully paid with coins), don't proceed with Razorpay
      if (grandTotal <= 0 && useCoins && (coinsToUse / 10) >= finalSubtotal) {
        setError('Order is fully paid with coins. Please use the regular order placement.')
        setLoading(false)
        return
      }
      
      // Order number will be auto-generated by backend in new format (NS-093011251001 or NC-093011251001)
      // Don't generate it here - backend will create it
      const enrichedItems = enrichOrderItems()
      
      const discountAmount = calculateDiscountAmount()
      const orderData = {
        // order_number: removed - backend will auto-generate in new format
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        shipping_address: { 
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          gst_number: company.trim() ? gstNumber.trim() : undefined,
          address: address.trim(), 
          apartment: apartment.trim() || undefined,
          city: city.trim(), 
          state: state.trim(), 
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          country: country || 'India',
          email: email.trim(),
          // Additional fields for Shiprocket compatibility
          name: `${firstName.trim()} ${lastName.trim()}`.trim() // Full name for backward compatibility
        },
        billing_address: sameAsShipping ? {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          address: address.trim(),
          apartment: apartment.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          country: country || 'India',
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim(),
          // Additional fields for Shiprocket compatibility
          name: `${firstName.trim()} ${lastName.trim()}`.trim() // Full name for backward compatibility
        } : {
          firstName: billingFirstName.trim(),
          lastName: billingLastName.trim(),
          company: billingCompany.trim() || undefined,
          address: billingAddress.trim(),
          apartment: billingApartment.trim() || undefined,
          city: billingCity.trim(),
          state: billingState.trim(),
          zip: billingZip.trim(),
          pincode: billingZip.trim(), // Also include pincode for Shiprocket compatibility
          country: billingCountry || 'India',
          phone: getTenDigitPhone(billingPhone || phone, billingCountryCode || countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim()
        },
        items: enrichedItems,
        subtotal: roundPrice(calcSubtotal),
        shipping: roundPrice(shipping),
        tax: roundPrice(calculatedTax),
        total: roundPrice(grandTotal), // This is remaining amount after coins
        payment_method: useCoins && coinsToUse > 0 ? 'coins+razorpay' : 'razorpay',
        payment_type: paymentType,
        status: 'created',
        affiliate_id: affiliateId,
        discount_code: appliedDiscount?.code || null,
        discount_amount: discountAmount > 0 ? roundPrice(discountAmount) : 0,
        coins_used: useCoins ? coinsToUse : 0 // Coins used for partial payment
      }

      // Create order in backend first - backend will auto-generate order_number in new format (NS-093011251001 or NC-093011251001)
      const createdOrder = await api.orders.createOrder(orderData)
      
      // Get the generated order_number from backend response
      const orderNumber = createdOrder.order_number
      
      if (!orderNumber) {
        throw new Error('Failed to get order number from backend')
      }

      // Create Razorpay order for remaining amount (after coins discount)
      // Only create if grandTotal > 0
      if (grandTotal <= 0) {
        throw new Error('Cannot create Razorpay order for zero amount. Order should be fully paid with coins.')
      }
      
      const razorpayOrder = await api.payment.createRazorpayOrder({
        amount: grandTotal, // Amount in rupees - backend will convert to paise
        currency: 'INR',
        order_number: orderNumber,
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        customer_phone: `${countryCode}${getTenDigitPhone(phone, countryCode)}`
      })

      // Validate Razorpay order response
      if (!razorpayOrder || !razorpayOrder.id || !razorpayOrder.key_id) {
        console.error('Invalid Razorpay order response:', razorpayOrder)
        setError('Failed to initialize payment gateway. Please try again.')
        setLoading(false)
        return
      }

      // Validate order ID format (should start with 'order_')
      if (!razorpayOrder.id.startsWith('order_')) {
        console.error('Invalid Razorpay order ID format:', razorpayOrder.id)
        setError('Invalid payment order. Please try again.')
        setLoading(false)
        return
      }

      console.log('Razorpay order created:', {
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key_id: razorpayOrder.key_id
      })

      // Initialize Razorpay checkout
      const options = {
        key: razorpayOrder.key_id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        name: 'Nefol',
        description: `Order ${orderNumber}`,
        order_id: razorpayOrder.id,
        prefill: {
          name: `${firstName} ${lastName}`.trim(),
          email: email,
          contact: `${countryCode}${getTenDigitPhone(phone, countryCode)}`
        },
        handler: async function(response: any) {
          try {
            // Validate payment response
            if (!response.razorpay_order_id || !response.razorpay_payment_id || !response.razorpay_signature) {
              console.error('Invalid Razorpay response:', response)
              setError('Payment verification failed: Invalid payment response')
              setLoading(false)
              return
            }

            if (!orderNumber) {
              console.error('Order number missing during payment verification')
              setError('Payment verification failed: Order number is missing')
              setLoading(false)
              return
            }

            console.log('Verifying payment for order:', orderNumber)

            // Verify payment
            const verificationResult = await api.payment.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_number: orderNumber
            })

            console.log('Payment verified successfully:', verificationResult)

            // Track Purchase event for Meta Pixel
            pixelEvents.purchase(formatPurchaseData({
              ...orderData,
              order_number: orderNumber,
              items: enrichedItems,
            }))

            // Save address if checkbox is checked
            if (saveInfo && isAuthenticated) {
              try {
                await api.user.createAddress({
                  name: `${firstName} ${lastName}`.trim(),
                  phone: getTenDigitPhone(phone, countryCode),
                  street: address.trim(),
                  area: apartment.trim() || undefined,
                  city: city.trim(),
                  state: state.trim(),
                  zip: zip.trim(),
                  country: country || 'India',
                  is_default: true
                })
              } catch (err) {
                console.error('Failed to save address:', err)
                // Don't block order completion if address save fails
              }
            }

            // Subscribe to WhatsApp if checkbox is checked
            if (newsOffers && phone) {
              try {
                await api.whatsapp.subscribe(
                  `${countryCode}${getTenDigitPhone(phone, countryCode)}`,
                  `${firstName} ${lastName}`.trim(),
                  'checkout'
                )
              } catch (err) {
                console.error('Failed to subscribe to WhatsApp:', err)
                // Don't block order completion if subscription fails
              }
            }

            if (clear) clear()
            window.location.hash = `#/user/confirmation?order=${encodeURIComponent(orderNumber)}`
          } catch (err: any) {
            console.error('Payment verification error:', {
              error: err,
              message: err?.message,
              orderNumber,
              response: response
            })
            
            const errorMessage = err?.message || err?.error?.message || 'Payment verification failed. Please contact support if payment was deducted.'
            setError(errorMessage)
            setLoading(false)
            
            // Optionally update order status to pending_payment on verification failure
            try {
              await api.orders.updatePaymentCancelled(orderNumber)
            } catch (updateErr) {
              console.error('Failed to update order status after verification error:', updateErr)
            }
          }
        },
        modal: {
          ondismiss: async function() {
            setLoading(false)
            // Update order status to pending_payment when payment is cancelled
            try {
              await api.orders.updatePaymentCancelled(orderNumber)
              console.log('Order status updated to pending_payment')
            } catch (err: any) {
              console.error('Failed to update order status:', err)
              // Don't show error to user as they already cancelled
            }
          }
        }
      }

      const rzp = (window as any).Razorpay(options)
      
      // Add error handler for Razorpay checkout
      rzp.on('payment.failed', function(response: any) {
        console.error('Razorpay payment failed:', response)
        setError(`Payment failed: ${response.error?.description || response.error?.reason || 'Unknown error'}`)
        setLoading(false)
      })

      rzp.on('payment.error', function(response: any) {
        console.error('Razorpay payment error:', response)
        setError(`Payment error: ${response.error?.description || response.error?.reason || 'Unknown error'}`)
        setLoading(false)
      })

      try {
        rzp.open()
      } catch (openErr: any) {
        console.error('Error opening Razorpay checkout:', openErr)
        setError(`Failed to open payment gateway: ${openErr?.message || 'Unknown error'}`)
        setLoading(false)
        
        // Update order status to pending_payment on checkout failure
        try {
          await api.orders.updatePaymentCancelled(orderNumber)
        } catch (updateErr) {
          console.error('Failed to update order status after checkout error:', updateErr)
        }
      }

    } catch (err: any) {
      console.error('Payment initiation error:', {
        error: err,
        message: err?.message,
        response: err?.response
      })
      setError(err?.message || err?.error?.message || 'Payment initiation failed')
      setLoading(false)
    }
  }

  // Helper function to extract 10-digit phone number for Shiprocket
  const getTenDigitPhone = (phoneValue: string, countryCodeValue: string): string => {
    // Remove all non-digits
    const cleanPhone = phoneValue.replace(/\D/g, '')
    
    // If phone includes country code (e.g., +919876543210), extract last 10 digits
    if (cleanPhone.length > 10) {
      return cleanPhone.slice(-10)
    }
    
    // If phone is exactly 10 digits, return as is
    if (cleanPhone.length === 10) {
      return cleanPhone
    }
    
    // If phone is less than 10 digits, pad with zeros (shouldn't happen with validation)
    return cleanPhone.padStart(10, '0').slice(-10)
  }

  // Validate shipping address for Shiprocket requirements
  const validateShippingAddress = (): string | null => {
    // Required fields for Shiprocket (all mandatory)
    if (!firstName?.trim()) return 'First name is required for shipping'
    if (!lastName?.trim()) return 'Last name is required for shipping (Shiprocket requirement)'
    if (!address?.trim()) return 'Address is required for shipping'
    if (!city?.trim()) return 'City is required for shipping'
    if (!state?.trim() || state === '') return 'State is required for shipping'
    if (!zip?.trim() || zip.length !== 6) return 'Valid 6-digit PIN code is required for shipping'
    if (!phone?.trim()) return 'Phone number is required for shipping'
    if (!email?.trim()) return 'Email is required for shipping'
    
    // Validate phone number - must be exactly 10 digits for Shiprocket
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return 'Please enter a valid 10-digit phone number'
    }
    
    // Validate PIN code (6 digits for India - Shiprocket requirement)
    const zipRegex = /^\d{6}$/
    const cleanZip = zip.replace(/\D/g, '')
    if (cleanZip.length !== 6 || !zipRegex.test(cleanZip)) {
      return 'Please enter a valid 6-digit PIN code (required for shipping)'
    }
    
    // Billing address always same as shipping (removed different billing option)
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address'
    }
    
    return null
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate shipping address for Shiprocket
    const addressError = validateShippingAddress()
    if (addressError) {
      setError(addressError)
      return
    }
    
    // Validate: If coins don't cover full amount, user must select a payment method
    // But if grandTotal is 0 (fully paid with coins), no payment method needed
    if (useCoins && (coinsToUse / 10) < finalSubtotal && grandTotal > 0 && !selectedPayment) {
      setError('Please select a payment method for the remaining amount')
      return
    }
    
    // If grandTotal is 0 (fully paid with coins), skip payment gateway
    if (grandTotal <= 0 && useCoins && (coinsToUse / 10) >= finalSubtotal) {
      // Order is fully paid with coins, proceed directly to order creation
      setLoading(true)
      try {
        const enrichedItems = enrichOrderItems()
        const discountAmount = calculateDiscountAmount()
        
        const orderData = {
          customer_name: `${firstName} ${lastName}`.trim(),
          customer_email: email,
          shipping_address: { 
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company.trim() || undefined,
            gst_number: company.trim() ? gstNumber.trim() : undefined,
            address: address.trim(), 
            apartment: apartment.trim() || undefined,
            city: city.trim(), 
            state: state.trim(), 
            zip: zip.trim(),
            pincode: zip.trim(),
            phone: getTenDigitPhone(phone, countryCode),
            country: country || 'India',
            email: email.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`.trim()
          },
          billing_address: sameAsShipping ? {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            company: company.trim() || undefined,
            address: address.trim(),
            apartment: apartment.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            pincode: zip.trim(),
            country: country || 'India',
            phone: getTenDigitPhone(phone, countryCode),
            email: email.trim(),
            name: `${firstName.trim()} ${lastName.trim()}`.trim()
          } : {
            firstName: billingFirstName.trim(),
            lastName: billingLastName.trim(),
            company: billingCompany.trim() || undefined,
            address: billingAddress.trim(),
            apartment: billingApartment.trim() || undefined,
            city: billingCity.trim(),
            state: billingState.trim(),
            zip: billingZip.trim(),
            pincode: billingZip.trim(),
            country: billingCountry || 'India',
            phone: getTenDigitPhone(billingPhone || phone, billingCountryCode || countryCode),
            email: email.trim(),
            name: `${billingFirstName.trim()} ${billingLastName.trim()}`.trim()
          },
          items: enrichedItems,
          subtotal: roundPrice(calcSubtotal),
          shipping: roundPrice(shipping),
          tax: roundPrice(calculatedTax),
          total: roundPrice(grandTotal), // Will be 0 when fully paid with coins
          payment_method: 'coins', // Fully paid with coins
          payment_type: 'prepaid', // Coins are prepaid
          status: 'created',
          affiliate_id: affiliateId,
          discount_code: appliedDiscount?.code || null,
          discount_amount: discountAmount > 0 ? roundPrice(discountAmount) : 0,
          coins_used: useCoins ? coinsToUse : 0
        }
        
        const data = await api.orders.createOrder(orderData)
        const orderNumber = data.order_number
        
        if (!orderNumber) {
          throw new Error('Failed to get order number from backend')
        }
        
        // Clear cart and redirect to confirmation
        if (clear) clear()
        window.location.hash = `#/user/confirmation?order=${orderNumber}`
        setLoading(false)
        return
      } catch (err: any) {
        console.error('Order creation error:', err)
        setError(err?.message || 'Failed to place order. Please try again.')
        setLoading(false)
        return
      }
    }
    
    setLoading(true)

    try {
      // Handle Razorpay payment (for remaining amount if coins used, or full amount)
      if (selectedPayment === 'razorpay') {
        await handleRazorpayPayment()
        return
      }

      // Handle other payment methods (Cash on Delivery, etc.)
      // Order number will be auto-generated by backend in new format (NS-093011251001 or NC-093011251001)
      // Don't send order_number - let backend generate it
      
      if (affiliateId) {
        console.log('🎯 Processing order with affiliate ID:', affiliateId)
      }
      
      const enrichedItems = enrichOrderItems()
      const discountAmount = calculateDiscountAmount()
      
      const orderData = {
        // order_number: removed - backend will auto-generate in new format
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        shipping_address: { 
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          gst_number: company.trim() ? gstNumber.trim() : undefined,
          address: address.trim(), 
          apartment: apartment.trim() || undefined,
          city: city.trim(), 
          state: state.trim(), 
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          country: country || 'India',
          email: email.trim(),
          // Additional fields for Shiprocket compatibility
          name: `${firstName.trim()} ${lastName.trim()}`.trim() // Full name for backward compatibility
        },
        billing_address: sameAsShipping ? {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          address: address.trim(),
          apartment: apartment.trim() || undefined,
          city: city.trim(),
          state: state.trim(),
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          country: country || 'India',
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim(),
          // Additional fields for Shiprocket compatibility
          name: `${firstName.trim()} ${lastName.trim()}`.trim() // Full name for backward compatibility
        } : {
          firstName: billingFirstName.trim(),
          lastName: billingLastName.trim(),
          company: billingCompany.trim() || undefined,
          address: billingAddress.trim(),
          apartment: billingApartment.trim() || undefined,
          city: billingCity.trim(),
          state: billingState.trim(),
          zip: billingZip.trim(),
          pincode: billingZip.trim(), // Also include pincode for Shiprocket compatibility
          country: billingCountry || 'India',
          phone: getTenDigitPhone(billingPhone || phone, billingCountryCode || countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim(),
          // Additional fields for Shiprocket compatibility
          name: `${billingFirstName.trim()} ${billingLastName.trim()}`.trim() // Full name for backward compatibility
        },
        items: enrichedItems,
        subtotal: roundPrice(calcSubtotal),
        shipping: roundPrice(shipping),
        tax: roundPrice(calculatedTax),
        total: roundPrice(grandTotal),
        payment_method: useCoins && (coinsToUse / 10) >= finalSubtotal ? 'coins' : selectedPayment,
        payment_type: isCOD ? 'cod' : (useCoins && (coinsToUse / 10) >= finalSubtotal ? 'prepaid' : paymentType),
        status: 'created',
        affiliate_id: affiliateId,
        discount_code: appliedDiscount?.code || null,
        discount_amount: discountAmount > 0 ? roundPrice(discountAmount) : 0,
        coins_used: useCoins ? coinsToUse : 0
      }
      
      // Create order - backend will auto-generate order_number in new format (NS-093011251001 or NC-093011251001)
      const data = await api.orders.createOrder(orderData)
      
      // Get the generated order_number from backend response
      const orderNumber = data.order_number
      
      if (!orderNumber) {
        throw new Error('Failed to get order number from backend')
      }
      
      // Track Purchase event for Meta Pixel
      pixelEvents.purchase(formatPurchaseData({
        ...orderData,
        order_number: orderNumber,
        items: enrichedItems,
      }))

      // Save address if checkbox is checked
      if (saveInfo && isAuthenticated) {
        try {
          await api.user.createAddress({
            name: `${firstName} ${lastName}`.trim(),
            phone: getTenDigitPhone(phone, countryCode),
            street: address.trim(),
            area: apartment.trim() || undefined,
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            country: country || 'India',
            is_default: true
          })
        } catch (err) {
          console.error('Failed to save address:', err)
          // Don't block order completion if address save fails
        }
      }

      // Subscribe to WhatsApp if checkbox is checked
      if (newsOffers && phone) {
        try {
          await api.whatsapp.subscribe(
            `${countryCode}${getTenDigitPhone(phone, countryCode)}`,
            `${firstName} ${lastName}`.trim(),
            'checkout'
          )
        } catch (err) {
          console.error('Failed to subscribe to WhatsApp:', err)
          // Don't block order completion if subscription fails
        }
      }
      
      if (clear) clear()
      window.location.hash = `#/user/confirmation?order=${encodeURIComponent(orderNumber)}`
    } catch (err: any) {
      setError(err?.message || 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  if (!orderItems.length) {
    return (
      <AuthGuard>
        <main className="py-10 bg-white overflow-x-hidden" style={{ backgroundColor: '#ffffff' }}>
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl sm:text-2xl font-bold text-black">Checkout</h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">Your cart is empty.</p>
          </div>
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <main className="py-10 bg-white w-full overflow-x-hidden" style={{ backgroundColor: '#ffffff' }}>
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 w-full">
        {/* Mobile/Tablet Layout: Order Summary → Coupon → Coins → Payment → Delivery → Billing → Submit */}
        <form onSubmit={submit} className="block md:hidden space-y-4 sm:space-y-6">
          {/* 1. Order Summary */}
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-3 text-black">Order Summary</h2>
            <div className="space-y-3">
              <div className="border-b border-gray-300 pb-3 text-sm space-y-2">
                {/* 1. Product */}
                <div className="space-y-2">
                  {orderItems.map((i: any) => (
                    <div key={i.slug} className="flex justify-between text-sm">
                      <div>
                        <span className="text-gray-900">{i.title} × {i.quantity}</span>
                        <div className="text-xs">
                          <PricingDisplay 
                            product={i} 
                            csvProduct={i.csvProduct}
                            className="text-xs"
                          />
                        </div>
                      </div>
                      <span className="text-black">₹{formatPrice(roundPrice(parsePrice(i.price) * i.quantity))}</span>
                    </div>
                  ))}
                </div>
                
                {/* 2. Total MRP */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Total MRP</span>
                  <span className="text-black">₹{formatPrice(roundPrice(mrpTotal))}</span>
                </div>
                
                {/* 3. Total Discount */}
                {productDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Total Discount</span>
                    <span>-₹{formatPrice(roundPrice(productDiscount))}</span>
                  </div>
                )}
                
                {/* 4. Subtotal */}
                <div className="flex justify-between font-medium">
                  <span className="text-gray-900">Subtotal</span>
                  <span className="text-black">₹{formatPrice(roundPrice(calcSubtotal))}</span>
                </div>
                
                {/* 5. Shipping Charges */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className={shipping > 0 ? 'text-black' : 'text-green-600'}>
                    {shipping > 0 ? `₹${formatPrice(roundPrice(shipping))}` : 'Free'}
                  </span>
                </div>
                
                {/* 6. GST (Included in MRP - shown for transparency) - Amount shown inline */}
                {gstBreakdown.length > 0 && (
                  <div className="space-y-1">
                    {gstBreakdown.map((gst, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-gray-600">
                          GST ({Math.round(gst.rate * 100)}%) - ₹{formatPrice(roundPrice(gst.amount))}
                          <span className="text-xs ml-1">(Inclusive)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 7. Grand Total (before coupon and coins) - GST already included in subtotal */}
                <div className="border-t border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-black">Grand Total</span>
                    <span className="text-black">₹{formatPrice(roundPrice(calcSubtotal + shipping))}</span>
                  </div>
                </div>
                
                {/* 8. Coupon Code (-) */}
                {appliedDiscount && discountAmount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Coupon Code (-)</span>
                    <span>-₹{formatPrice(roundPrice(discountAmount))}</span>
                  </div>
                )}
                
                {/* 9. Nefol Coin (-) */}
                {useCoins && coinsToUse > 0 && (
                  <div className="flex justify-between text-yellow-600">
                    <span>Nefol Coin (-)</span>
                    <span>-₹{formatPrice(roundPrice(coinsDiscount))}</span>
                  </div>
                )}
                
                {/* 10. Net Payable Amount */}
                <div className="border-t-2 border-gray-400 pt-2 mt-2">
                  <div className="flex justify-between text-xl font-bold">
                    <span className="text-black">Net Payable Amount</span>
                    <span className="text-black">₹{formatPrice(roundPrice(grandTotal))}</span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 mt-1">* MRP includes GST</div>
              </div>
            </div>
          </div>

          {/* 2. Coupon Code Section */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Coupon Code</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-slate-300 px-3 py-2 bg-white border-gray-300"
                placeholder="Enter coupon code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                disabled={!!appliedDiscount}
              />
              {!appliedDiscount ? (
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  disabled={!discountCode.trim()}
                >
                  Apply
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedDiscount(null)
                    setDiscountCode('')
                    setError(null)
                  }}
                  className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            {appliedDiscount && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  ✅ Coupon applied: {appliedDiscount.code} - Save ₹{formatPrice(roundPrice(discountAmount))}
                </p>
              </div>
            )}
          </div>

          {/* 3. Nefol Coins Section */}
          {isAuthenticated && totalCoins > 0 && (
            <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCoins}
                  onChange={(e) => {
                    setUseCoins(e.target.checked)
                    if (e.target.checked) {
                      // Calculate max coins based on calcSubtotal (before discount), not finalSubtotal
                      const maxCoins = Math.min(totalCoins, Math.ceil(calcSubtotal * 10))
                      setCoinsToUse(maxCoins)
                      if ((maxCoins / 10) < finalSubtotal) {
                        setSelectedPayment('razorpay')
                      }
                    } else {
                      setCoinsToUse(0)
                      setSelectedPayment('razorpay')
                    }
                  }}
                  className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ 
                    accentColor: '#4b97c9',
                    WebkitAppearance: 'checkbox',
                    appearance: 'checkbox'
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-yellow-600" />
                    <div className="font-medium text-gray-900">Use Nefol Coins</div>
                  </div>
                  <div className="text-sm text-slate-600 mb-2">
                    Available: {totalCoins} coins (1 rupee = 10 coins)
                  </div>
                  {useCoins && (
                    <div className="mt-3 space-y-2">
                      <label className="block text-sm font-medium text-gray-900">
                        Coins to Use (Max: {Math.min(totalCoins, Math.ceil(calcSubtotal * 10))} coins)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={Math.min(totalCoins, Math.ceil(calcSubtotal * 10))}
                        value={coinsToUse}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0
                          // Calculate max coins based on calcSubtotal (before discount)
                          const maxCoins = Math.min(totalCoins, Math.ceil(calcSubtotal * 10))
                          setCoinsToUse(Math.max(0, Math.min(value, maxCoins)))
                          if ((value / 10) < finalSubtotal) {
                            setSelectedPayment('razorpay')
                          }
                        }}
                        className="w-full px-3 py-2 rounded border border-gray-300 bg-white text-black min-h-[44px] text-base"
                      />
                      <div className="text-sm text-slate-600">
                        <p>Coins value: ₹{formatPrice(roundPrice(coinsToUse / 10))}</p>
                        <p className="font-semibold">
                          Remaining to pay: ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))}
                        </p>
                        {(coinsToUse / 10) >= finalSubtotal && (
                          <p className="text-green-700 font-semibold">
                            ✓ Order fully paid with coins! No additional payment needed.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* 4. Payment Section */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Payment</h2>
            <p className="text-sm text-slate-600 mb-4">All transactions are secure and encrypted.</p>
            
            {/* Prepaid Offers Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Get Extra Off with Prepaid!</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    Prepaid is offering <strong>minimum 5% off</strong> on all products when you pay through Prepaid. 
                    Additional discounts may apply based on your payment method.
                  </p>
                  <p className="text-xs text-blue-700">
                    * Discounts are applied automatically at checkout. Terms and conditions apply.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Payment Method Selection */}
            <div className="space-y-3 mb-4">
              {/* Show payment methods for remaining amount if coins don't cover full amount */}
              {useCoins && (coinsToUse / 10) < finalSubtotal && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-3">
                    Select Payment Method for Remaining Amount: ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))}
                  </p>
                </div>
              )}

              {/* Razorpay Secure - Default payment method */}
              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'razorpay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 border-gray-300 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={selectedPayment === 'razorpay'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: '#4b97c9' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 text-gray-900">
                      Razorpay Secure (UPI, Cards, Int'l Cards, Wallets)
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      {useCoins && (coinsToUse / 10) < finalSubtotal ? (
                        <span>Pay remaining ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))} via Razorpay</span>
                      ) : (
                        <>
                          <span>UPI</span>
                          <span>•</span>
                          <span>Visa</span>
                          <span>•</span>
                          <span>Mastercard</span>
                          <span>•</span>
                          <span>RuPay</span>
                          <span>•</span>
                          <span>Net Banking</span>
                          <span className="ml-1">+18</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              )}

              {/* Cash on Delivery - Secondary option */}
              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'cod'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 border-gray-300 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedPayment === 'cod'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: '#4b97c9' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 text-gray-900">
                      Cash on Delivery
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{formatPrice(roundPrice(Math.max(0, grandTotal)))} on delivery)
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* 5. Delivery Section - Show only when user clicks "new address" or no saved address selected */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">Delivery</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Fields marked with <span className="text-red-500">*</span> are required for shipping. Please ensure all information is accurate.
            </p>
            
            {/* Saved Addresses Selector */}
            {isAuthenticated && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <label className="block text-sm font-semibold text-gray-900">
                    Use Saved Address
                  </label>
                </div>
                {savedAddresses.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-4">
                      {savedAddresses.map((addr: any) => (
                        <label
                          key={addr.id}
                          className={`block bg-white rounded-xl shadow-lg p-4 border-2 cursor-pointer transition-all ${
                            selectedSavedAddress === String(addr.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-100 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="savedAddress"
                              value={String(addr.id)}
                              checked={selectedSavedAddress === String(addr.id)}
                              onChange={() => {
                                handleSavedAddressChange(String(addr.id))
                                setShowNewAddressForm(false)
                              }}
                              className="mt-1 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              style={{ accentColor: 'rgb(75,151,201)' }}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  {addr.is_default && (
                                    <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-2 text-xs font-medium">
                                      <CheckCircle className="w-3 h-3" fill="currentColor" />
                                      Default
                                    </div>
                                  )}
                                  {addr.name && (
                                    <h3 className="text-base font-bold text-slate-900 mb-1">
                                      {addr.name}
                                    </h3>
                                  )}
                                  {addr.address_type && (
                                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 capitalize mb-2">
                                      {addr.address_type === 'other' && addr.address_label ? addr.address_label : addr.address_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-slate-600 space-y-1">
                                <p className="font-medium text-slate-900">
                                  {addr.street || addr.address || 'N/A'}
                                </p>
                                {addr.area && (
                                  <p className="text-slate-600">{addr.area}</p>
                                )}
                                {addr.landmark && (
                                  <p className="text-sm italic text-slate-600">Near {addr.landmark}</p>
                                )}
                                <p className="text-slate-600">{addr.city || 'N/A'}, {addr.state || 'N/A'} - {addr.zip || addr.pincode || 'N/A'}</p>
                                {addr.country && (
                                  <p className="text-sm font-light text-slate-600">{addr.country}</p>
                                )}
                              </div>
                              {addr.phone && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <p className="text-sm text-slate-600">
                                    <span className="font-medium">Phone:</span> {addr.phone}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <a
                        href="#/user/manage-address"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        Manage Addresses
                      </a>
                    </div>
                    {!selectedSavedAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewAddressForm(true)
                          setSelectedSavedAddress('')
                        }}
                        className="w-full text-sm text-blue-600 hover:underline font-medium py-2"
                      >
                        Enter New Address
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-gray-600 mb-3">
                      No saved addresses found
                    </p>
                    <a
                      href="#/user/manage-address"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Add Address
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Delivery Form - Show only when showNewAddressForm is true or no saved addresses exist */}
            {(showNewAddressForm || (savedAddresses.length === 0 && !selectedSavedAddress)) && (
              <>
            {/* Country */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Country</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">IN</span>
                <input 
                  type="text" 
                  className="flex-1 rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                  value={country}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="First name" 
                  value={firstName} 
                  onChange={e=>setFirstName(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="Last name" 
                  value={lastName} 
                  onChange={e=>setLastName(e.target.value)} 
                  required
                  minLength={1}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required for shipping (Shiprocket requirement)</p>
              </div>
            </div>

            {/* Company (optional) */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Company (optional)</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Company" 
                value={company} 
                onChange={e=>setCompany(e.target.value)} 
              />
            </div>

            {/* GST Number - Show only when company is filled */}
            {company.trim() && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="15-character GSTIN (e.g. 27ABCDE1234F1Z5)" 
                  value={gstNumber} 
                  onChange={e=>setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))} 
                  required={company.trim() !== ''}
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  minLength={15}
                  maxLength={15}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter standard 15-character GSTIN: 2-digit state code, PAN, entity code, default &quot;Z&quot;, checksum.
                </p>
              </div>
            )}

            {/* Address */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Street address" 
                value={address} 
                onChange={e=>setAddress(e.target.value)} 
                required 
              />
            </div>

            {/* Apartment, suite, etc. */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Apartment, suite, etc.</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Apartment, suite, etc." 
                value={apartment} 
                onChange={e=>setApartment(e.target.value)} 
              />
            </div>

            {/* City, State, PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="City" 
                  value={city} 
                  onChange={e=>setCity(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  value={state} 
                  onChange={e=>setState(e.target.value)} 
                  required
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Ladakh">Ladakh</option>
                  <option value="Lakshadweep">Lakshadweep</option>
                  <option value="Puducherry">Puducherry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  PIN code <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="6-digit PIN code" 
                  value={zip} 
                  onChange={e=>setZip(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  required 
                  pattern="\d{6}"
                  minLength={6}
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required for shipping</p>
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="your@email.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                required 
              />
            </div>

            {/* Phone */}
            <div className="mb-3">
              <PhoneInput
                value={phone}
                onChange={(value) => {
                  // Ensure only digits and limit to 10 digits for Shiprocket
                  const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
                  setPhone(digitsOnly)
                }}
                onCountryCodeChange={setCountryCode}
                defaultCountry={countryCode}
                placeholder="Enter 10-digit phone number"
                required
                showLabel
                label="Phone"
                className="mb-3"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter exactly 10 digits (required for shipping)</p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 mb-3">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ 
                    accentColor: 'rgb(75,151,201)',
                    WebkitAppearance: 'checkbox',
                    appearance: 'checkbox'
                  }}
                  checked={saveInfo} 
                  onChange={e=>setSaveInfo(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 text-gray-900">Save this information for next time</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ 
                    accentColor: 'rgb(75,151,201)',
                    WebkitAppearance: 'checkbox',
                    appearance: 'checkbox'
                  }}
                  checked={newsOffers} 
                  onChange={e=>setNewsOffers(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 text-gray-900">Text me with news and offers</span>
              </label>
            </div>
              </>
            )}
          </div>

          {/* Billing Address Section - Removed: Always uses shipping address */}

          {/* 7. Order Confirm Button */}
          {error && <div className="text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}
          
          <button 
            type="submit"
            disabled={loading} 
            className="w-full rounded px-5 py-3 font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'rgb(75,151,201)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
          >
            {loading ? 'Processing Order...' : 
             useCoins && (coinsToUse / 10) >= finalSubtotal ? `Place Order (Paid with ${coinsToUse} Coins)` :
             useCoins && (coinsToUse / 10) < finalSubtotal ? `Use ${coinsToUse} Coins + Pay ₹${formatPrice(roundPrice(grandTotal))} ${isCOD ? '(Cash on Delivery)' : selectedPayment === 'razorpay' ? 'Now' : ''}` :
             isCOD ? `Place Order (Cash on Delivery) - ₹${formatPrice(roundPrice(grandTotal))}` : 
             `Pay now`}
          </button>
        </form>

        <div className="w-full">
          <form onSubmit={submit} className="hidden md:block space-y-4 sm:space-y-6">
          {/* Delivery Section */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">Delivery</h2>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Fields marked with <span className="text-red-500">*</span> are required for shipping. Please ensure all information is accurate.
            </p>
            
            {/* Saved Addresses Selector */}
            {isAuthenticated && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <label className="block text-sm font-semibold text-gray-900">
                    Use Saved Address
                  </label>
                </div>
                {savedAddresses.length > 0 ? (
                  <>
                    <div className="space-y-3 mb-4">
                      {savedAddresses.map((addr: any) => (
                        <label
                          key={addr.id}
                          className={`block bg-white rounded-xl shadow-lg p-4 border-2 cursor-pointer transition-all ${
                            selectedSavedAddress === String(addr.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-100 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="savedAddressDesktop"
                              value={String(addr.id)}
                              checked={selectedSavedAddress === String(addr.id)}
                              onChange={() => {
                                handleSavedAddressChange(String(addr.id))
                                setShowNewAddressForm(false)
                              }}
                              className="mt-1 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              style={{ accentColor: 'rgb(75,151,201)' }}
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  {addr.is_default && (
                                    <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-2 text-xs font-medium">
                                      <CheckCircle className="w-3 h-3" fill="currentColor" />
                                      Default
                                    </div>
                                  )}
                                  {addr.name && (
                                    <h3 className="text-base font-bold text-slate-900 mb-1">
                                      {addr.name}
                                    </h3>
                                  )}
                                  {addr.address_type && (
                                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 capitalize mb-2">
                                      {addr.address_type === 'other' && addr.address_label ? addr.address_label : addr.address_type}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-slate-600 space-y-1">
                                <p className="font-medium text-slate-900">
                                  {addr.street || addr.address || 'N/A'}
                                </p>
                                {addr.area && (
                                  <p className="text-slate-600">{addr.area}</p>
                                )}
                                {addr.landmark && (
                                  <p className="text-sm italic text-slate-600">Near {addr.landmark}</p>
                                )}
                                <p className="text-slate-600">{addr.city || 'N/A'}, {addr.state || 'N/A'} - {addr.zip || addr.pincode || 'N/A'}</p>
                                {addr.country && (
                                  <p className="text-sm font-light text-slate-600">{addr.country}</p>
                                )}
                              </div>
                              {addr.phone && (
                                <div className="mt-2 pt-2 border-t border-slate-200">
                                  <p className="text-sm text-slate-600">
                                    <span className="font-medium">Phone:</span> {addr.phone}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <a
                        href="#/user/manage-address"
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        Manage Addresses
                      </a>
                    </div>
                    {selectedSavedAddress && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSavedAddress('')
                          // Clear form fields
                          setFirstName('')
                          setLastName('')
                          setPhone('')
                          setAddress('')
                          setApartment('')
                          setCity('')
                          setState('Uttar Pradesh')
                          setZip('')
                          setShowNewAddressForm(true)
                        }}
                        className="w-full text-sm text-blue-600 hover:underline font-medium py-2"
                      >
                        Use new address instead
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 bg-white rounded-lg border border-slate-200">
                    <p className="text-sm text-gray-600 mb-3">
                      No saved addresses found
                    </p>
                    <a
                      href="#/user/manage-address"
                      className="text-sm text-blue-600 hover:underline font-medium"
                    >
                      Add Address
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Country */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Country</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">IN</span>
                <input 
                  type="text" 
                  className="flex-1 rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                  value={country}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="First name" 
                  value={firstName} 
                  onChange={e=>setFirstName(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="Last name" 
                  value={lastName} 
                  onChange={e=>setLastName(e.target.value)} 
                  required
                  minLength={1}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required for shipping (Shiprocket requirement)</p>
              </div>
            </div>

            {/* Company (optional) */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Company (optional)</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Company" 
                value={company} 
                onChange={e=>setCompany(e.target.value)} 
              />
            </div>

            {/* GST Number - Show only when company is filled */}
            {company.trim() && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="15-character GSTIN (e.g. 27ABCDE1234F1Z5)" 
                  value={gstNumber} 
                  onChange={e=>setGstNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))} 
                  required={company.trim() !== ''}
                  pattern="[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}"
                  minLength={15}
                  maxLength={15}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter standard 15-character GSTIN: 2-digit state code, PAN, entity code, default &quot;Z&quot;, checksum.
                </p>
              </div>
            )}

            {/* Address */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Street address" 
                value={address} 
                onChange={e=>setAddress(e.target.value)} 
                required 
              />
            </div>

            {/* Apartment, suite, etc. */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">Apartment, suite, etc.</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="Apartment, suite, etc." 
                value={apartment} 
                onChange={e=>setApartment(e.target.value)} 
              />
            </div>

            {/* City, State, PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="City" 
                  value={city} 
                  onChange={e=>setCity(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <select 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  value={state} 
                  onChange={e=>setState(e.target.value)} 
                  required
                >
                  <option value="">Select State</option>
                  <option value="Andhra Pradesh">Andhra Pradesh</option>
                  <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                  <option value="Assam">Assam</option>
                  <option value="Bihar">Bihar</option>
                  <option value="Chhattisgarh">Chhattisgarh</option>
                  <option value="Goa">Goa</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Himachal Pradesh">Himachal Pradesh</option>
                  <option value="Jharkhand">Jharkhand</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Kerala">Kerala</option>
                  <option value="Madhya Pradesh">Madhya Pradesh</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Manipur">Manipur</option>
                  <option value="Meghalaya">Meghalaya</option>
                  <option value="Mizoram">Mizoram</option>
                  <option value="Nagaland">Nagaland</option>
                  <option value="Odisha">Odisha</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Sikkim">Sikkim</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="Tripura">Tripura</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Uttarakhand">Uttarakhand</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                  <option value="Chandigarh">Chandigarh</option>
                  <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                  <option value="Ladakh">Ladakh</option>
                  <option value="Lakshadweep">Lakshadweep</option>
                  <option value="Puducherry">Puducherry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                  PIN code <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black min-h-[44px] text-base" 
                  placeholder="6-digit PIN code" 
                  value={zip} 
                  onChange={e=>setZip(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  required 
                  pattern="\d{6}"
                  minLength={6}
                  maxLength={6}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required for shipping</p>
              </div>
            </div>

            {/* Email */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 text-gray-900 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                className="w-full rounded border border-slate-300 px-3 py-2 bg-white border-gray-300 text-black" 
                placeholder="your@email.com" 
                value={email} 
                onChange={e=>setEmail(e.target.value)} 
                required 
              />
            </div>

            {/* Phone */}
            <div className="mb-3">
              <PhoneInput
                value={phone}
                onChange={(value) => {
                  // Ensure only digits and limit to 10 digits for Shiprocket
                  const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
                  setPhone(digitsOnly)
                }}
                onCountryCodeChange={setCountryCode}
                defaultCountry={countryCode}
                placeholder="Enter 10-digit phone number"
                required
                showLabel
                label="Phone"
                className="mb-3"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter exactly 10 digits (required for shipping)</p>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 mb-3">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ accentColor: 'rgb(75,151,201)' }}
                  checked={saveInfo} 
                  onChange={e=>setSaveInfo(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 text-gray-900">Save this information for next time</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ accentColor: 'rgb(75,151,201)' }}
                  checked={newsOffers} 
                  onChange={e=>setNewsOffers(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 text-gray-900">Text me with news and offers</span>
              </label>
            </div>
          </div>

          {/* Shipping Method Section */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Shipping method</h2>
            <p className="text-slate-600 dark:text-slate-400">Enter your shipping address to view available shipping methods.</p>
          </div>

          {/* Coupon Code Section - Desktop */}
          <div className="hidden md:block">
            <h2 className="text-xl font-bold text-black mb-4">Coupon Code</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-slate-300 px-3 py-2 bg-white border-gray-300"
                placeholder="Enter coupon code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                disabled={!!appliedDiscount}
              />
              {!appliedDiscount ? (
                <button
                  type="button"
                  onClick={applyDiscountCode}
                  className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                  disabled={!discountCode.trim()}
                >
                  Apply
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAppliedDiscount(null)
                    setDiscountCode('')
                    setError(null)
                  }}
                  className="rounded bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            {appliedDiscount && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">
                  ✅ Coupon applied: {appliedDiscount.code} - Save ₹{formatPrice(roundPrice(discountAmount))}
                </p>
              </div>
            )}
          </div>

          {/* Payment Section - Desktop */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">Payment</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">All transactions are secure and encrypted.</p>
            
            {/* Prepaid Offers Section */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">Get Extra Off with Prepaid!</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    Prepaid is offering <strong>minimum 5% off</strong> on all products when you pay through Prepaid. 
                    Additional discounts may apply based on your payment method.
                  </p>
                  <p className="text-xs text-blue-700">
                    * Discounts are applied automatically at checkout. Terms and conditions apply.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Payment Method Selection */}
            <div className="space-y-3 mb-4">
              {/* Use Nefol Coins Checkbox - Desktop */}
              {isAuthenticated && totalCoins > 0 && (
                <div className="p-4 rounded-lg border-2 border-yellow-200 bg-yellow-50 mb-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => {
                        setUseCoins(e.target.checked)
                        if (e.target.checked) {
                          // Calculate max coins based on calcSubtotal (before discount), not finalSubtotal
                          const maxCoins = Math.min(totalCoins, Math.ceil(calcSubtotal * 10))
                          setCoinsToUse(maxCoins)
                          if ((maxCoins / 10) < finalSubtotal) {
                            setSelectedPayment('razorpay')
                          }
                        } else {
                          setCoinsToUse(0)
                          setSelectedPayment('razorpay')
                        }
                      }}
                      className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      style={{ 
                        accentColor: '#4b97c9',
                        WebkitAppearance: 'checkbox',
                        appearance: 'checkbox'
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-5 h-5 text-yellow-600" />
                        <div className="font-medium text-slate-700 text-gray-900">Use Nefol Coins</div>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Available: {totalCoins} coins (1 rupee = 10 coins)
                      </div>
                      
                      {useCoins && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-sm font-medium text-slate-700 text-gray-900">
                            Coins to Use (Max: {Math.min(totalCoins, Math.ceil(calcSubtotal * 10))} coins)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(totalCoins, Math.ceil(calcSubtotal * 10))}
                            value={coinsToUse}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0
                              // Calculate max coins based on calcSubtotal (before discount)
                              const maxCoins = Math.min(totalCoins, Math.ceil(calcSubtotal * 10))
                              setCoinsToUse(Math.max(0, Math.min(value, maxCoins)))
                              if ((value / 10) < finalSubtotal) {
                                if (selectedPayment === 'coins') {
                                  setSelectedPayment('razorpay')
                                }
                              }
                            }}
                            className="w-full px-3 py-2 rounded border border-slate-300 border-gray-300 bg-white dark:bg-slate-700 text-slate-900 text-black"
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p>Coins value: ₹{roundPrice(coinsToUse / 10).toLocaleString()}</p>
                            <p className="font-semibold">
                              Remaining to pay: ₹{roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))).toLocaleString()}
                            </p>
                            {(coinsToUse / 10) >= finalSubtotal && (
                              <p className="text-green-700 font-semibold">
                                ✓ Order fully paid with coins! No additional payment needed.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}
              
              {useCoins && (coinsToUse / 10) < finalSubtotal && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-3">
                    Select Payment Method for Remaining Amount: ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))}
                  </p>
                </div>
              )}

              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'razorpay'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 border-gray-300 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={selectedPayment === 'razorpay'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: '#4b97c9' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 text-gray-900">
                      Razorpay Secure (UPI, Cards, Int'l Cards, Wallets)
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      {useCoins && (coinsToUse / 10) < finalSubtotal ? (
                        <span>Pay remaining ₹{formatPrice(roundPrice(Math.max(0, finalSubtotal - (coinsToUse / 10))))} via Razorpay</span>
                      ) : (
                        <>
                          <span>UPI</span>
                          <span>•</span>
                          <span>Visa</span>
                          <span>•</span>
                          <span>Mastercard</span>
                          <span>•</span>
                          <span>RuPay</span>
                          <span>•</span>
                          <span>Net Banking</span>
                          <span className="ml-1">+18</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              )}

              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'cod'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-300 border-gray-300 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedPayment === 'cod'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3 w-5 h-5 bg-white border-2 border-black focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    style={{ accentColor: '#4b97c9' }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 text-gray-900">
                      Cash on Delivery
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{formatPrice(roundPrice(Math.max(0, grandTotal)))} on delivery)
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Billing Address Section - Removed: Always uses shipping address */}

          {error && <div className="text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
          
          <button 
            type="submit"
            disabled={loading} 
            className="w-full rounded px-5 py-3 font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: 'rgb(75,151,201)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'}
          >
            {loading ? 'Processing Order...' : 
             useCoins && (coinsToUse / 10) >= finalSubtotal ? `Place Order (Paid with ${coinsToUse} Coins)` :
             useCoins && (coinsToUse / 10) < finalSubtotal ? `Use ${coinsToUse} Coins + Pay ₹${formatPrice(roundPrice(grandTotal))} ${isCOD ? '(Cash on Delivery)' : selectedPayment === 'razorpay' ? 'Now' : ''}` :
             isCOD ? `Place Order (Cash on Delivery) - ₹${formatPrice(roundPrice(grandTotal))}` : 
             `Pay now`}
          </button>
          </form>
        </div>
      </div>
    </main>
    </AuthGuard>
  )
}


