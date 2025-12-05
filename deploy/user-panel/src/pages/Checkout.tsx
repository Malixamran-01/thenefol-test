import { useEffect, useMemo, useState } from 'react'
import { useCart, parsePrice } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../services/api'
import { CreditCard, Smartphone, Wallet, Coins, MapPin } from 'lucide-react'
import PricingDisplay from '../components/PricingDisplay'
import AuthGuard from '../components/AuthGuard'
import PhoneInput from '../components/PhoneInput'
import { pixelEvents, formatPurchaseData, formatCartData } from '../utils/metaPixel'
import { getApiBase } from '../utils/apiBase'

const paymentMethods = [
  { id: 'razorpay', name: 'Razorpay Secure (UPI, Cards, Int\'l Cards, Wallets)', icon: CreditCard, color: 'bg-blue-500' },
  { id: 'cod', name: 'Cash on Delivery (COD)', icon: CreditCard, color: 'bg-green-600' }
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState('cod')
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

  useEffect(() => {
    const u = new URL(window.location.href)
    const s = u.hash.split('?')[1] || ''
    const params = new URLSearchParams(s)
    const slug = params.get('buy')
    setBuySlug(slug)
    
    // Load user data if authenticated
    if (isAuthenticated && user) {
      const fullName = user.name || ''
      const nameParts = fullName.split(' ')
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
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

  const fetchSavedAddresses = async () => {
    try {
      const addressesData = await api.user.getAddresses()
      if (addressesData && addressesData.length > 0) {
        setSavedAddresses(addressesData)
        // Auto-select default address if available
        const defaultAddress = addressesData.find((addr: any) => addr.is_default)
        if (defaultAddress) {
          setSelectedSavedAddress(String(defaultAddress.id))
          fillAddressFromSaved(defaultAddress)
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
    setPhone(savedAddress.phone || '')
    setAddress(savedAddress.street || '')
    setApartment(savedAddress.area || '')
    setCity(savedAddress.city || '')
    setState(savedAddress.state || 'Uttar Pradesh')
    setZip(savedAddress.zip || '')
    setCountry(savedAddress.country || 'India')
    // Email is already set from user object in useEffect
  }

  const handleSavedAddressChange = (addressId: string) => {
    setSelectedSavedAddress(addressId)
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
      let affiliateCoins = 0
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
        }
      } catch (error) {
        // Ignore affiliate errors - user might not be an affiliate
        console.log('Affiliate check failed (user may not be affiliate)')
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
      const apiHost = (import.meta as any).env?.VITE_BACKEND_HOST || (import.meta as any).env?.VITE_API_HOST || 'localhost'
      const apiPort = (import.meta as any).env?.VITE_BACKEND_PORT || (import.meta as any).env?.VITE_API_PORT || '4000'
      const apiBase = getApiBase()
      const response = await fetch(`${apiBase}/api/discounts/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode, amount: calcSubtotal })
      })
      
      if (response.ok) {
        const responseData = await response.json()
        const discount = responseData.data || responseData // Handle both { data: ... } and direct response
        setAppliedDiscount(discount)
        setError(null)
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Invalid discount code' }))
        setError(errorData.message || 'Invalid discount code')
        setAppliedDiscount(null)
      }
    } catch (error) {
      setError('Failed to apply discount code')
    }
  }

  const calcSubtotal = useMemo(() => {
    if (buySlug) return orderItems.reduce((s, i) => s + parsePrice(i.price) * (i.quantity || 1), 0)
    return subtotal
  }, [buySlug, orderItems, subtotal])

  const calculateDiscountAmount = () => {
    if (!appliedDiscount) return 0
    // Use discountAmount from API response if available (already calculated)
    if (appliedDiscount.discountAmount !== undefined) {
      return appliedDiscount.discountAmount
    }
    // Fallback to calculating locally
    if (appliedDiscount.type === 'percentage') {
      let discount = (calcSubtotal * appliedDiscount.value) / 100
      // Apply max discount if set
      if (appliedDiscount.maxDiscount && discount > appliedDiscount.maxDiscount) {
        discount = appliedDiscount.maxDiscount
      }
      return discount
    }
    return appliedDiscount.value
  }

  const calculateFinalTotal = () => {
    const discountAmount = calculateDiscountAmount()
    // 1 rupee = 10 coins, so coins discount = coinsToUse / 10 (in rupees)
    const coinsDiscount = selectedPayment === 'coins' ? Math.min(coinsToUse / 10, calcSubtotal - discountAmount) : 0
    return Math.max(0, calcSubtotal - discountAmount - coinsDiscount)
  }

  const shipping = 0
  
  // Calculate tax from MRP (tax-inclusive pricing)
  // Extract tax from price instead of adding it
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
      
      return itemTax * (item.quantity || 1)
    }
    return tax
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
      return total + (mrp * (item.quantity || 1))
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
      
      if (!itemMrp) {
        itemMrp = item.price // Fallback only if no MRP found
      }
      
      const mrp = parsePrice(itemMrp || '0')
      const currentPrice = parsePrice(item.price) // This is websitePrice (after product discount)
      const productDiscount = (mrp - currentPrice) * (item.quantity || 1)
      return total + Math.max(0, productDiscount)
    }, 0)
  }

  const calculatedTax = calculateTax()
  const discountAmount = calculateDiscountAmount() // Coupon code discount
  const mrpTotal = calculateMrpTotal()
  const productDiscount = calculateProductDiscount()
  // 1 rupee = 10 coins, so coins discount = coinsToUse / 10 (in rupees)
  const coinsDiscount = useCoins ? Math.min(coinsToUse / 10, calcSubtotal - discountAmount) : 0
  const finalSubtotal = calcSubtotal - discountAmount - coinsDiscount
  // Grand Total = Subtotal (already includes tax) - coupon discount - coins discount + shipping
  const grandTotal = buySlug 
    ? Math.max(0, finalSubtotal + shipping) 
    : Math.max(0, (subtotal - discountAmount - coinsDiscount) + shipping)

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
      const orderNumber = `NEFOL-${Date.now()}`
      const enrichedItems = enrichOrderItems()
      
      const discountAmount = calculateDiscountAmount()
      const orderData = {
        order_number: orderNumber,
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        shipping_address: { 
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          address: address.trim(), 
          apartment: apartment.trim() || undefined,
          city: city.trim(), 
          state: state.trim(), 
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          country: country || 'India',
          email: email.trim()
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
          country: country || 'India',
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim()
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
        subtotal: Number(calcSubtotal.toFixed(2)),
        shipping,
        tax: calculatedTax,
        total: Number(grandTotal.toFixed(2)), // This is remaining amount after coins
        payment_method: useCoins && coinsToUse > 0 ? 'coins+razorpay' : 'razorpay',
        payment_type: paymentType,
        status: 'created',
        affiliate_id: affiliateId,
        discount_code: appliedDiscount?.code || null,
        discount_amount: discountAmount > 0 ? Number(discountAmount.toFixed(2)) : 0,
        coins_used: useCoins ? coinsToUse : 0 // Coins used for partial payment
      }

      // Create order in backend first
      await api.orders.createOrder(orderData)

      // Create Razorpay order for remaining amount (after coins discount)
      const razorpayOrder = await api.payment.createRazorpayOrder({
        amount: grandTotal, // Amount in rupees - backend will convert to paise
        currency: 'INR',
        order_number: orderNumber,
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        customer_phone: `${countryCode}${getTenDigitPhone(phone, countryCode)}`
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
            // Verify payment
            await api.payment.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_number: orderNumber
            })

            // Track Purchase event for Meta Pixel
            pixelEvents.purchase(formatPurchaseData({
              ...orderData,
              order_number: orderNumber,
              items: enrichedItems,
            }))

            if (clear) clear()
            window.location.hash = `#/user/confirmation?order=${encodeURIComponent(orderNumber)}`
          } catch (err: any) {
            setError('Payment verification failed: ' + err.message)
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
      rzp.open()

    } catch (err: any) {
      setError(err?.message || 'Payment initiation failed')
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
    // Required fields for Shiprocket
    if (!firstName?.trim()) return 'First name is required'
    if (!lastName?.trim()) return 'Last name is required'
    if (!address?.trim()) return 'Address is required'
    if (!city?.trim()) return 'City is required'
    if (!state?.trim()) return 'State is required'
    if (!zip?.trim()) return 'PIN code is required'
    if (!phone?.trim()) return 'Phone number is required'
    if (!email?.trim()) return 'Email is required'
    
    // Validate phone number - must be exactly 10 digits for Shiprocket
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return 'Please enter a valid 10-digit phone number'
    }
    
    // Validate billing phone if different billing address
    if (!sameAsShipping) {
      if (!billingPhone?.trim()) return 'Billing phone number is required'
      const cleanBillingPhone = billingPhone.replace(/\D/g, '')
      if (cleanBillingPhone.length !== 10) {
        return 'Please enter a valid 10-digit billing phone number'
      }
    }
    
    // Validate PIN code (6 digits for India)
    const zipRegex = /^\d{6}$/
    const cleanZip = zip.replace(/\D/g, '')
    if (cleanZip.length !== 6 || !zipRegex.test(cleanZip)) {
      return 'Please enter a valid 6-digit PIN code'
    }
    
    // Validate billing PIN if different billing address
    if (!sameAsShipping && billingZip) {
      const cleanBillingZip = billingZip.replace(/\D/g, '')
      if (cleanBillingZip.length !== 6 || !zipRegex.test(cleanBillingZip)) {
        return 'Please enter a valid 6-digit billing PIN code'
      }
    }
    
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
    if (useCoins && (coinsToUse / 10) < finalSubtotal && !selectedPayment) {
      setError('Please select a payment method for the remaining amount')
      return
    }
    
    setLoading(true)

    try {
      // Handle Razorpay payment (for remaining amount if coins used, or full amount)
      if (selectedPayment === 'razorpay') {
        await handleRazorpayPayment()
        return
      }

      // Handle other payment methods (COD, etc.)
      const orderNumber = `NEFOL-${Date.now()}`
      
      if (affiliateId) {
        console.log('🎯 Processing order with affiliate ID:', affiliateId)
      }
      
      const enrichedItems = enrichOrderItems()
      const discountAmount = calculateDiscountAmount()
      
      const orderData = {
        order_number: orderNumber,
        customer_name: `${firstName} ${lastName}`.trim(),
        customer_email: email,
        shipping_address: { 
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim() || undefined,
          address: address.trim(), 
          apartment: apartment.trim() || undefined,
          city: city.trim(), 
          state: state.trim(), 
          zip: zip.trim(),
          pincode: zip.trim(), // Also include pincode for Shiprocket compatibility
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          country: country || 'India',
          email: email.trim()
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
          country: country || 'India',
          phone: getTenDigitPhone(phone, countryCode), // Shiprocket requires exactly 10 digits
          email: email.trim()
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
        subtotal: Number(calcSubtotal.toFixed(2)),
        shipping,
        tax: calculatedTax,
        total: Number(grandTotal.toFixed(2)),
        payment_method: useCoins && (coinsToUse / 10) >= finalSubtotal ? 'coins' : selectedPayment,
        payment_type: isCOD ? 'cod' : (useCoins && (coinsToUse / 10) >= finalSubtotal ? 'prepaid' : paymentType),
        status: 'created',
        affiliate_id: affiliateId,
        discount_code: appliedDiscount?.code || null,
        discount_amount: discountAmount > 0 ? Number(discountAmount.toFixed(2)) : 0,
        coins_used: useCoins ? coinsToUse : 0
      }
      
      const data = await api.orders.createOrder(orderData)
      
      // Track Purchase event for Meta Pixel
      pixelEvents.purchase(formatPurchaseData({
        ...orderData,
        order_number: data.order_number || orderNumber,
        items: enrichedItems,
      }))
      
      if (clear) clear()
      window.location.hash = `#/user/confirmation?order=${encodeURIComponent(data.order_number || orderNumber)}`
    } catch (err: any) {
      setError(err?.message || 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  if (!orderItems.length) {
    return (
      <AuthGuard>
        <main className="py-10 dark:bg-slate-900">
          <div className="mx-auto max-w-3xl px-4">
            <h1 className="text-2xl font-bold dark:text-slate-100">Checkout</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Your cart is empty.</p>
          </div>
        </main>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
    <main className="py-10 dark:bg-slate-900 w-full overflow-x-hidden">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full">
        <form onSubmit={submit} className="md:col-span-2 space-y-6">
          {/* Delivery Section */}
          <div>
            <h2 className="text-2xl font-bold dark:text-slate-100 mb-4">Delivery</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Fields marked with <span className="text-red-500">*</span> are required for shipping. Please ensure all information is accurate.
            </p>
            
            {/* Saved Addresses Selector */}
            {isAuthenticated && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Use Saved Address
                  </label>
                </div>
                {savedAddresses.length > 0 ? (
                  <>
                    <select
                      value={selectedSavedAddress}
                      onChange={(e) => handleSavedAddressChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 mb-2 font-medium"
                    >
                      <option value="">Select a saved address...</option>
                  {savedAddresses.map((addr: any) => (
                    <option key={addr.id} value={String(addr.id)}>
                      {addr.name || 'Unnamed'} - {addr.street}, {addr.city}, {addr.state} {addr.zip}
                      {addr.is_default && ' (Default)'}
                    </option>
                  ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Select a saved address to autofill the form below
                      </p>
                      <a
                        href="#/user/manage-address"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
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
                        }}
                        className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Use new address instead
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      No saved addresses found
                    </p>
                    <a
                      href="#/user/manage-address"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Add an address to save time
                    </a>
                  </div>
                )}
              </div>
            )}
            
            {/* Country */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">IN</span>
                <input 
                  type="text" 
                  className="flex-1 rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                  value={country}
                  readOnly
                  disabled
                />
              </div>
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  First name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                  placeholder="First name" 
                  value={firstName} 
                  onChange={e=>setFirstName(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Last name <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                  placeholder="Last name" 
                  value={lastName} 
                  onChange={e=>setLastName(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {/* Company (optional) */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company (optional)</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                placeholder="Company" 
                value={company} 
                onChange={e=>setCompany(e.target.value)} 
              />
            </div>

            {/* Address */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                placeholder="Street address" 
                value={address} 
                onChange={e=>setAddress(e.target.value)} 
                required 
              />
            </div>

            {/* Apartment, suite, etc. */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apartment, suite, etc.</label>
              <input 
                className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                placeholder="Apartment, suite, etc." 
                value={apartment} 
                onChange={e=>setApartment(e.target.value)} 
              />
            </div>

            {/* City, State, PIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-3 w-full">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                  placeholder="City" 
                  value={city} 
                  onChange={e=>setCity(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">UP</span>
                  <select 
                    className="flex-1 rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    value={state} 
                    onChange={e=>setState(e.target.value)} 
                    required
                  >
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  PIN code <span className="text-red-500">*</span>
                </label>
                <input 
                  className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input 
                type="email" 
                className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
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
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded border-slate-300" 
                  checked={saveInfo} 
                  onChange={e=>setSaveInfo(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Save this information for next time</span>
              </label>
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  className="mr-2 rounded border-slate-300" 
                  checked={newsOffers} 
                  onChange={e=>setNewsOffers(e.target.checked)} 
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">Text me with news and offers</span>
              </label>
            </div>
          </div>

          {/* Shipping Method Section */}
          <div>
            <h2 className="text-xl font-bold dark:text-slate-100 mb-4">Shipping method</h2>
            <p className="text-slate-600 dark:text-slate-400">Enter your shipping address to view available shipping methods.</p>
          </div>

          {/* Coupon Code Section */}
          <div>
            <h2 className="text-xl font-bold dark:text-slate-100 mb-4">Coupon Code</h2>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600"
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
              <div className="mt-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✅ Coupon applied: {appliedDiscount.code} - Save ₹{discountAmount.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Payment Section */}
          <div>
            <h2 className="text-xl font-bold dark:text-slate-100 mb-4">Payment</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">All transactions are secure and encrypted.</p>
            
            {/* Payment Method Selection */}
            <div className="space-y-3 mb-4">
              {/* Use Nefol Coins Checkbox - Show first */}
              {isAuthenticated && totalCoins > 0 && (
                <div className="p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 mb-4">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCoins}
                      onChange={(e) => {
                        setUseCoins(e.target.checked)
                        if (e.target.checked) {
                          // Set max coins to use based on available and order total
                          const maxCoins = Math.min(totalCoins, Math.ceil(finalSubtotal * 10))
                          setCoinsToUse(maxCoins)
                          // Auto-select Razorpay for remaining if coins don't cover full amount
                          if ((maxCoins / 10) < finalSubtotal) {
                            setSelectedPayment('razorpay')
                          }
                        } else {
                          setCoinsToUse(0)
                          setSelectedPayment('cod')
                        }
                      }}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="w-5 h-5 text-yellow-600" />
                        <div className="font-medium text-slate-700 dark:text-slate-300">Use Nefol Coins</div>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                        Available: {totalCoins} coins (1 rupee = 10 coins)
                      </div>
                      
                      {/* Coins Amount Selection (shown when use coins is checked) */}
                      {useCoins && (
                        <div className="mt-3 space-y-2">
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Coins to Use (Max: {Math.min(totalCoins, Math.ceil(finalSubtotal * 10))} coins)
                          </label>
                          <input
                            type="number"
                            min="0"
                              max={Math.min(totalCoins, Math.ceil(finalSubtotal * 10))}
                            value={coinsToUse}
                            onChange={(e) => {
                              const value = parseInt(e.target.value) || 0
                              const maxCoins = Math.min(totalCoins, Math.ceil(finalSubtotal * 10))
                              setCoinsToUse(Math.max(0, Math.min(value, maxCoins)))
                              // Auto-select payment method if coins don't cover full amount
                              if ((value / 10) < finalSubtotal) {
                                if (selectedPayment === 'coins') {
                                  setSelectedPayment('razorpay')
                                }
                              }
                            }}
                            className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                          />
                          <div className="text-sm text-slate-600 dark:text-slate-400">
                            <p>Coins value: ₹{(coinsToUse / 10).toFixed(2)}</p>
                            <p className="font-semibold">
                              Remaining to pay: ₹{Math.max(0, finalSubtotal - (coinsToUse / 10)).toFixed(2)}
                            </p>
                            {(coinsToUse / 10) >= finalSubtotal && (
                              <p className="text-green-600 dark:text-green-400 font-semibold">
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
              
              {/* Show payment methods for remaining amount if coins don't cover full amount */}
              {useCoins && (coinsToUse / 10) < finalSubtotal && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
                    Select Payment Method for Remaining Amount: ₹{Math.max(0, finalSubtotal - (coinsToUse / 10)).toFixed(2)}
                  </p>
                </div>
              )}

              {/* Razorpay Secure - Hide if coins cover full amount */}
              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'razorpay'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="razorpay"
                    checked={selectedPayment === 'razorpay'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      Razorpay Secure (UPI, Cards, Int'l Cards, Wallets)
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{Math.max(0, finalSubtotal - (coinsToUse / 10)).toFixed(2)})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                      {useCoins && (coinsToUse / 10) < finalSubtotal ? (
                        <span>Pay remaining ₹{Math.max(0, finalSubtotal - (coinsToUse / 10)).toFixed(2)} via Razorpay</span>
                      ) : (
                        <>
                          <span>UPI</span>
                          <span>•</span>
                          <span>Visa</span>
                          <span>•</span>
                          <span>Mastercard</span>
                          <span>•</span>
                          <span>Net Banking</span>
                          <span className="ml-1">+18</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              )}


              {/* Cash on Delivery - Hide if coins cover full amount */}
              {(!useCoins || (coinsToUse / 10) < finalSubtotal) && (
                <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedPayment === 'cod'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-slate-300 dark:border-slate-600 hover:border-slate-400'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={selectedPayment === 'cod'}
                    onChange={(e) => setSelectedPayment(e.target.value)}
                    disabled={useCoins && (coinsToUse / 10) >= finalSubtotal}
                    className="mt-1 mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-700 dark:text-slate-300">
                      Cash on Delivery (COD)
                      {useCoins && (coinsToUse / 10) < finalSubtotal && (
                        <span className="text-xs text-slate-500 ml-2">
                          (Pay ₹{Math.max(0, grandTotal).toFixed(2)} on delivery)
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Billing Address Section */}
          <div>
            <h2 className="text-xl font-bold dark:text-slate-100 mb-4">Billing address</h2>
            
            {/* Same as shipping address option */}
            <label className="flex items-center mb-4">
              <input
                type="radio"
                name="billingAddress"
                checked={sameAsShipping}
                onChange={() => setSameAsShipping(true)}
                className="mr-2"
              />
              <span className="text-slate-700 dark:text-slate-300">Same as shipping address</span>
            </label>

            <label className="flex items-center mb-4">
              <input
                type="radio"
                name="billingAddress"
                checked={!sameAsShipping}
                onChange={() => setSameAsShipping(false)}
                className="mr-2"
              />
              <span className="text-slate-700 dark:text-slate-300">Use a different billing address</span>
            </label>

            {/* Different billing address form */}
            {!sameAsShipping && (
              <div className="mt-4 space-y-4 pl-4 sm:pl-6 border-l-2 border-slate-300 dark:border-slate-600 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First name</label>
                    <input 
                      className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                      placeholder="First name" 
                      value={billingFirstName} 
                      onChange={e=>setBillingFirstName(e.target.value)} 
                      required={!sameAsShipping}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last name</label>
                    <input 
                      className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                      placeholder="Last name" 
                      value={billingLastName} 
                      onChange={e=>setBillingLastName(e.target.value)} 
                      required={!sameAsShipping}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company (optional)</label>
                  <input 
                    className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    placeholder="Company" 
                    value={billingCompany} 
                    onChange={e=>setBillingCompany(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <input 
                    className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    placeholder="Address" 
                    value={billingAddress} 
                    onChange={e=>setBillingAddress(e.target.value)} 
                    required={!sameAsShipping}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apartment, suite, etc.</label>
                  <input 
                    className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                    placeholder="Apartment, suite, etc." 
                    value={billingApartment} 
                    onChange={e=>setBillingApartment(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
                    <input 
                      className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                      placeholder="City" 
                      value={billingCity} 
                      onChange={e=>setBillingCity(e.target.value)} 
                      required={!sameAsShipping}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 dark:text-slate-400 text-sm">UP</span>
                      <select 
                        className="flex-1 rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                        value={billingState} 
                        onChange={e=>setBillingState(e.target.value)} 
                        required={!sameAsShipping}
                      >
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      PIN code <span className="text-red-500">*</span>
                    </label>
                    <input 
                      className="w-full rounded border border-slate-300 px-3 py-2 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100" 
                      placeholder="6-digit PIN code" 
                      value={billingZip} 
                      onChange={e=>setBillingZip(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                      required={!sameAsShipping}
                      pattern="\d{6}"
                      minLength={6}
                      maxLength={6}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Required for shipping</p>
                  </div>
                </div>

                {/* Billing Phone */}
                <div className="mb-3">
                  <PhoneInput
                    value={billingPhone}
                    onChange={(value) => {
                      // Ensure only digits and limit to 10 digits for Shiprocket
                      const digitsOnly = value.replace(/\D/g, '').slice(0, 10)
                      setBillingPhone(digitsOnly)
                    }}
                    onCountryCodeChange={setBillingCountryCode}
                    defaultCountry={billingCountryCode}
                    placeholder="Enter 10-digit phone number"
                    required={!sameAsShipping}
                    showLabel
                    label="Billing Phone"
                    className="mb-3"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enter exactly 10 digits (required for shipping)</p>
                </div>
              </div>
            )}
          </div>

          {error && <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}
          
          <button 
            type="submit"
            disabled={loading} 
            className="w-full rounded bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Processing Order...' : 
             useCoins && (coinsToUse / 10) >= finalSubtotal ? `Place Order (Paid with ${coinsToUse} Coins)` :
             useCoins && (coinsToUse / 10) < finalSubtotal ? `Use ${coinsToUse} Coins + Pay ₹${grandTotal.toFixed(2)} ${isCOD ? '(COD)' : selectedPayment === 'razorpay' ? 'Now' : ''}` :
             isCOD ? `Place Order (COD) - ₹${grandTotal.toFixed(2)}` : 
             `Pay now`}
          </button>
        </form>
        <aside className="w-full md:w-auto">
          <h2 className="text-xl font-semibold mb-3 dark:text-slate-100">Order Summary</h2>
          <div className="space-y-3">
            {orderItems.map((i: any) => (
              <div key={i.slug} className="flex justify-between text-sm">
                <div>
                  <span className="dark:text-slate-300">{i.title} × {i.quantity}</span>
                  <div className="text-xs">
                    <PricingDisplay 
                      product={i} 
                      csvProduct={i.csvProduct}
                      className="text-xs"
                    />
                  </div>
                </div>
                <span className="dark:text-slate-100">₹{(parsePrice(i.price) * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 text-sm space-y-2">
              {/* MRP Total */}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">MRP</span>
                <span className="dark:text-slate-100">₹{mrpTotal.toFixed(2)}</span>
              </div>
              
              {/* Product Discount */}
              {productDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Product Discount</span>
                  <span>-₹{productDiscount.toFixed(2)}</span>
                </div>
              )}
              
              {/* Subtotal */}
              <div className="flex justify-between font-medium">
                <span className="text-slate-700 dark:text-slate-300">Subtotal</span>
                <span className="dark:text-slate-100">₹{calcSubtotal.toFixed(2)}</span>
              </div>
              
              {/* Coupon Code Discount */}
              {appliedDiscount && discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Coupon Code ({appliedDiscount.code})</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              
              {/* Coins Discount */}
              {useCoins && coinsToUse > 0 && (
                <div className="flex justify-between text-yellow-600 dark:text-yellow-400">
                  <span>Nefol Coins Used ({coinsToUse} coins = ₹{(coinsToUse / 10).toFixed(2)})</span>
                  <span>-₹{coinsDiscount.toFixed(2)}</span>
                </div>
              )}
              
              {/* Shipping */}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Shipping Charges</span>
                <span className={shipping > 0 ? 'dark:text-slate-100' : 'text-green-600 dark:text-green-400'}>
                  {shipping > 0 ? `₹${shipping.toFixed(2)}` : 'Free'}
                </span>
              </div>
              
              {/* GST */}
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">
                  GST ({buySlug ? (orderItems[0]?.category?.toLowerCase().includes('hair') ? '5%' : '18%') : 'Mixed'}) 
                  <span className="text-xs ml-1">(Inclusive)</span>
                </span>
                <span className="dark:text-slate-100">₹{calculatedTax.toFixed(2)}</span>
              </div>
              
              {/* Grand Total */}
              <div className="border-t border-slate-300 dark:border-slate-600 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span className="dark:text-slate-100">Grand Total</span>
                  <span className="dark:text-slate-100">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">* MRP includes GST</div>
            </div>
          </div>
        </aside>
      </div>
    </main>
    </AuthGuard>
  )
}


