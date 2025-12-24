import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

function getBaseUrl() {
  return process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'
}

export async function getToken(pool: Pool) {
  try {
    // First check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shiprocket_config'
      )
    `)
    
    if (!tableCheck.rows[0]?.exists) {
      console.error('❌ Shiprocket config table does not exist. Please run database migrations.')
      return null
    }
    
    const { rows } = await pool.query(
      'SELECT api_key, api_secret FROM shiprocket_config WHERE is_active = true ORDER BY updated_at DESC, id DESC LIMIT 1'
    )
    
    const apiKey = rows[0]?.api_key // This stores email
    const apiSecret = rows[0]?.api_secret // This stores password
    
    if (!apiKey || !apiSecret) {
      console.error('❌ Shiprocket credentials not found in database')
      console.error('   Please configure Shiprocket credentials via /api/shiprocket/config endpoint')
      console.error('   Or use the save-shiprocket-credentials.js script')
      return null
    }
    
    const resp = await fetch(`${getBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: apiKey, password: apiSecret })
    })
    
    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}))
      console.error('❌ Shiprocket authentication failed:', errorData)
      console.error('   Status:', resp.status)
      console.error('   Please verify your credentials are correct')
      return null
    }
    
    const data: any = await resp.json()
    if (!data?.token) {
      console.error('❌ Shiprocket authentication succeeded but no token received')
      return null
    }
    
    return data.token
  } catch (err: any) {
    console.error('❌ Error getting Shiprocket token:', err.message)
    if (err.code === '42P01') {
      console.error('   Database table "shiprocket_config" does not exist. Please run migrations.')
    }
    return null
  }
}

export async function saveShiprocketConfig(pool: Pool, req: Request, res: Response) {
  try {
    // Accept both api_key/api_secret (for backward compatibility) and email/password
    const { api_key, api_secret, email, password } = req.body || {}
    const emailValue = email || api_key
    const passwordValue = password || api_secret
    
    const validationError = validateRequired({ email: emailValue, password: passwordValue }, ['email', 'password'])
    if (validationError) return sendError(res, 400, validationError)
    
    // Deactivate old configs
    await pool.query('update shiprocket_config set is_active = false where is_active = true')
    
    // Insert new config (api_key stores email, api_secret stores password)
    await pool.query(
      `insert into shiprocket_config (api_key, api_secret, is_active, created_at, updated_at)
       values ($1, $2, true, now(), now())`,
      [emailValue, passwordValue]
    )
    
    // Test authentication
    const testToken = await getToken(pool)
    if (!testToken) {
      return sendError(res, 400, 'Failed to authenticate with Shiprocket. Please check your credentials.')
    }
    
    sendSuccess(res, { message: 'Shiprocket config saved and verified successfully', token_received: !!testToken }, 201)
  } catch (err: any) {
    console.error('Error saving Shiprocket config:', err)
    sendError(res, 500, 'Failed to save Shiprocket config', err)
  }
}

export async function getShiprocketConfig(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select id, is_active, updated_at from shiprocket_config where is_active = true order by updated_at desc, id desc limit 1`
    )
    const has_config = rows.length > 0
    sendSuccess(res, { has_config, config: rows[0] || null })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch Shiprocket config', err)
  }
}

// Get available pickup locations from Shiprocket
export async function getPickupLocations(pool: Pool) {
  try {
    const token = await getToken(pool)
    if (!token) {
      console.log('⚠️ No Shiprocket token available for fetching pickup locations')
      return null
    }
    
    const base = getBaseUrl()
    const resp = await fetch(`${base}/settings/company/pickup`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    
    if (!resp.ok) {
      const errorText = await resp.text()
      console.error(`❌ Failed to fetch pickup locations: ${resp.status} ${resp.statusText}`, errorText)
      return null
    }
    
    const data: any = await resp.json()
    // Shiprocket returns locations in different possible structures
    // Try data.data first (most common), then data, then empty array
    const locations = data?.data || data || []
    
    if (Array.isArray(locations) && locations.length > 0) {
      console.log(`✅ Found ${locations.length} pickup location(s) via API`)
      // Log first location for debugging
      if (locations[0]) {
        console.log(`   First location: ${JSON.stringify(locations[0])}`)
      }
    } else {
      console.log('⚠️ Pickup locations API returned empty or invalid data:', JSON.stringify(data))
    }
    
    return locations
  } catch (err: any) {
    console.error('❌ Error fetching pickup locations:', err?.message || err)
    return null
  }
}

// Create shipment in Shiprocket
export async function createShipment(pool: Pool, req: Request, res: Response) {
  try {
    const { orderId } = req.params as any
    
    // Fetch order details
    const { rows: orders } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId])
    if (orders.length === 0) return sendError(res, 404, 'Order not found')
    
    const order = orders[0]
    const shippingAddress = order.shipping_address || {}
    const items = order.items || []
    
    if (!shippingAddress.address || !shippingAddress.city || !shippingAddress.pincode) {
      return sendError(res, 400, 'Order shipping address is incomplete')
    }
    
    const token = await getToken(pool)
    if (!token) return sendError(res, 400, 'Invalid Shiprocket credentials')
    
    // Get available pickup locations and use the verified one
    const pickupLocations = await getPickupLocations(pool)
    // Default to verified pickup location: "Home" (Nefol Aesthetics Pvt. Ltd., Lucknow)
    let pickupLocation = 'Home' // Verified pickup location name from Shiprocket
    if (pickupLocations && pickupLocations.length > 0) {
      // Try to find "Home" first, then fallback to first available
      const verifiedLocation = pickupLocations.find((loc: any) => 
        loc.pickup_location === 'Home' || 
        loc.pickup_location === 'tyome' ||
        loc.id === 'Home' ||
        loc.id === 'tyome' ||
        loc.pickup_location?.toLowerCase() === 'home'
      )
      if (verifiedLocation) {
        pickupLocation = verifiedLocation.pickup_location || verifiedLocation.id?.toString() || 'Home'
        console.log(`✅ Using verified pickup location: ${pickupLocation} (Nefol Aesthetics Pvt. Ltd., Lucknow)`)
      } else {
        // Use the first available pickup location's name
        pickupLocation = pickupLocations[0].pickup_location || pickupLocations[0].id?.toString() || 'Home'
        console.log(`✅ Using pickup location: ${pickupLocation} (from ${pickupLocations.length} available locations)`)
      }
    } else {
      // Use verified location as default
      pickupLocation = 'Home'
      console.log('⚠️ No pickup locations found via API, using verified default: Home (Nefol Aesthetics Pvt. Ltd., Lucknow)')
    }
    
    // Helper function to extract 10-digit phone number for Shiprocket
    const getTenDigitPhone = (phoneValue: string | undefined): string => {
      if (!phoneValue) return ''
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
      // If phone is less than 10 digits, return empty (will fail validation)
      return cleanPhone
    }

    // Prepare shipment payload for Shiprocket
    const shipmentPayload = {
      order_id: order.order_number || `ORDER-${order.id}`,
      order_date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
      pickup_location: pickupLocation,
      billing_customer_name: order.customer_name,
      billing_last_name: shippingAddress.lastName || shippingAddress.name?.split(' ').slice(1).join(' ') || '',
      billing_address: shippingAddress.address || shippingAddress.street || '',
      billing_address_2: shippingAddress.apartment || shippingAddress.area || '',
      billing_city: shippingAddress.city || '',
      billing_pincode: shippingAddress.zip || shippingAddress.pincode || '',
      billing_state: shippingAddress.state || '',
      billing_country: shippingAddress.country || 'India',
      billing_email: order.customer_email,
      billing_phone: getTenDigitPhone(shippingAddress.phone || (order.billing_address?.phone)),
      shipping_is_billing: !order.billing_address,
      shipping_customer_name: order.customer_name,
      shipping_last_name: shippingAddress.lastName || shippingAddress.name?.split(' ').slice(1).join(' ') || '',
      shipping_address: shippingAddress.address || shippingAddress.street || '',
      shipping_address_2: shippingAddress.apartment || shippingAddress.area || '',
      shipping_city: shippingAddress.city || '',
      shipping_pincode: shippingAddress.zip || shippingAddress.pincode || '',
      shipping_state: shippingAddress.state || '',
      shipping_country: shippingAddress.country || 'India',
      shipping_email: order.customer_email,
      shipping_phone: getTenDigitPhone(shippingAddress.phone),
      order_items: items.map((item: any, index: number) => ({
        name: item.name || item.title || `Product ${index + 1}`,
        sku: item.sku || item.variant_id || `SKU-${item.product_id || index}`,
        units: item.quantity || 1,
        selling_price: item.price || item.unit_price || 0
      })),
      payment_method: order.payment_method === 'cod' || order.payment_type === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.subtotal || 0,
      length: 10, // Default dimensions, should be configurable
      breadth: 10,
      height: 10,
      weight: 0.5, // Default weight, should be calculated from items
      total_discount: order.discount_amount || 0,
      shipping_charges: order.shipping || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discounts: order.discount_amount || 0,
      // Don't add cod_charges separately - order.total already includes all charges
      // Setting cod_charges to 0 prevents Shiprocket from adding extra charges
      cod_charges: 0,
      add_charges: 0,
      // Send exact order amount to Shiprocket to ensure correct COD collection
      // This is the final amount customer should pay (matches order.total exactly)
      order_amount: order.total || 0,
      comment: `Order from NEFOL - ${order.order_number || order.id}`
    }
    
    const base = getBaseUrl()
    const shipmentResp = await fetch(`${base}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(shipmentPayload)
    })
    
    const shipmentData: any = await shipmentResp.json()
    
    if (!shipmentResp.ok) {
      // If error is about pickup location, try to get the correct one from error response
      if (shipmentData?.message?.includes('Pickup location') || shipmentData?.message?.includes('pickup')) {
        // Try to extract location from error response - check multiple possible structures
        let correctLocation = 'Home' // Default fallback to verified location
        if (shipmentData?.data?.data?.length > 0) {
          correctLocation = shipmentData.data.data[0].pickup_location || shipmentData.data.data[0].id?.toString() || 'Home'
        } else if (shipmentData?.data?.length > 0) {
          correctLocation = shipmentData.data[0].pickup_location || shipmentData.data[0].id?.toString() || 'Home'
        }
        console.log(`⚠️ Pickup location error detected, retrying with: ${correctLocation}`)
        console.log(`   Error message: ${shipmentData?.message}`)
        
        // Retry with correct pickup location
        shipmentPayload.pickup_location = correctLocation
        const retryResp = await fetch(`${base}/orders/create/adhoc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(shipmentPayload)
        })
        
        const retryData: any = await retryResp.json()
        
        if (retryResp.ok && retryData) {
          // Use retry data - extract from multiple possible structures
          const shipmentId = retryData?.shipment_id 
            || retryData?.data?.shipment_id 
            || retryData?.response?.shipment_id
            || retryData?.order_id
            || retryData?.data?.order_id
            || retryData?.response?.order_id
            || null
          
          const awbCode = retryData?.awb_code 
            || retryData?.data?.awb_code 
            || retryData?.response?.awb_code
            || null
          
          // Check if shipment already exists
          const existingShipment = await pool.query(
            'SELECT id FROM shiprocket_shipments WHERE order_id = $1',
            [order.id]
          )
          
          if (existingShipment.rows.length === 0) {
            const { rows } = await pool.query(
              `INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
               RETURNING *`,
              [
                order.id,
                shipmentId ? String(shipmentId) : null,
                retryData?.tracking_url || null,
                retryData?.status || 'pending',
                awbCode,
                retryData?.label_url || null
              ]
            )
            
            return sendSuccess(res, {
              ...rows[0],
              shiprocket_response: retryData
            }, 201)
          } else {
            // Update existing
            const { rows } = await pool.query(
              `UPDATE shiprocket_shipments 
               SET shipment_id = $1, tracking_url = $2, status = $3, awb_code = $4, label_url = $5, updated_at = NOW()
               WHERE order_id = $6
               RETURNING *`,
              [
                shipmentId ? String(shipmentId) : null,
                retryData?.tracking_url || null,
                retryData?.status || 'pending',
                awbCode,
                retryData?.label_url || null,
                order.id
              ]
            )
            
            return sendSuccess(res, {
              ...rows[0],
              shiprocket_response: retryData
            }, 200)
          }
        } else {
          console.error('Shiprocket shipment creation error (after retry):', retryData)
          return sendError(res, 400, 'Failed to create shipment in Shiprocket', retryData)
        }
      } else {
        console.error('Shiprocket shipment creation error:', shipmentData)
        return sendError(res, 400, 'Failed to create shipment in Shiprocket', shipmentData)
      }
    }
    
    const shipmentId = shipmentData?.shipment_id || shipmentData?.order_id || null
    const awbCode = shipmentData?.awb_code || null
    const courierId = shipmentData?.courier_id || null
    
    // Save to database
    const { rows } = await pool.query(
      `INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        order.id,
        shipmentId ? String(shipmentId) : null,
        shipmentData?.tracking_url || null,
        shipmentData?.status || 'pending',
        awbCode,
        shipmentData?.label_url || null
      ]
    )
    
    sendSuccess(res, {
      ...rows[0],
      shiprocket_response: shipmentData
    }, 201)
  } catch (err: any) {
    console.error('Error creating shipment:', err)
    sendError(res, 500, 'Failed to create shipment', err)
  }
}

export async function createAwbAndLabel(pool: Pool, req: Request, res: Response) {
  try {
    const { orderId } = req.params as any
    // fetch order
    const { rows: orders } = await pool.query('select * from orders where id = $1', [orderId])
    if (orders.length === 0) return sendError(res, 404, 'Order not found')
    const token = await getToken(pool)
    if (!token) return sendError(res, 400, 'Invalid Shiprocket credentials')

    // Check if shipment already exists
    const { rows: existingShipments } = await pool.query(
      'SELECT * FROM shiprocket_shipments WHERE order_id = $1 ORDER BY id DESC LIMIT 1',
      [orderId]
    )
    
    let shipmentId = existingShipments[0]?.shipment_id
    
    // If no shipment exists, create one first
    if (!shipmentId) {
      // Use the create shipment function logic here or call it
      return sendError(res, 400, 'Please create shipment first using /api/shiprocket/orders/:orderId/shipment')
    }

    const base = getBaseUrl()
    const awbResp = await fetch(`${base}/courier/assign/awb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        shipment_id: shipmentId,
        courier_id: req.body?.courier_id || null
      })
    })
    const awbData: any = await awbResp.json()
    if (!awbResp.ok) return sendError(res, 400, 'Failed to generate AWB', awbData)

    const awb_code = awbData?.response?.awb_code || awbData?.awb_code || null

    let label_url: string | null = null
    if (awb_code) {
      try {
        const labelResp = await fetch(`${base}/courier/generate/label`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ shipment_id: shipmentId })
        })
        const labelData: any = await labelResp.json()
        if (labelResp.ok) {
          label_url = labelData?.label_url || labelData?.label_url_pdf || null
        }
      } catch (err) {
        console.error('Error generating label:', err)
      }
    }

    // Update existing shipment record
    const { rows } = await pool.query(
      `UPDATE shiprocket_shipments 
       SET awb_code = $1, label_url = $2, status = 'ready_to_ship', updated_at = NOW()
       WHERE order_id = $3
       RETURNING *`,
      [awb_code, label_url, orderId]
    )
    
    sendSuccess(res, rows[0] || existingShipments[0], 200)
  } catch (err) {
    sendError(res, 500, 'Failed to create AWB/label', err)
  }
}

// Helper function to auto-create Shiprocket shipment for an order
export async function autoCreateShiprocketShipment(pool: Pool, order: any): Promise<{ success: boolean; shipmentId?: string; awbCode?: string; error?: any }> {
  try {
    // Check if shipping address is complete
    const shippingAddress = typeof order.shipping_address === 'string' 
      ? JSON.parse(order.shipping_address) 
      : order.shipping_address || {}
    
    // Check if shipping address is complete (support both old and new field names)
    const hasAddress = shippingAddress.address || shippingAddress.street
    const hasCity = shippingAddress.city
    const hasPincode = shippingAddress.zip || shippingAddress.pincode
    
    if (!hasAddress || !hasCity || !hasPincode) {
      console.log(`ℹ️ Skipping Shiprocket auto-creation for order ${order.order_number} - incomplete shipping address`)
      return { success: false, error: { message: 'Incomplete shipping address' } }
    }

    // Check if shipment already exists
    const existingCheck = await pool.query(
      'SELECT id, shipment_id FROM shiprocket_shipments WHERE order_id = $1',
      [order.id]
    )
    
    if (existingCheck.rows.length > 0 && existingCheck.rows[0].shipment_id) {
      console.log(`ℹ️ Shiprocket shipment already exists for order ${order.order_number}`)
      return { 
        success: true, 
        shipmentId: existingCheck.rows[0].shipment_id,
        awbCode: undefined 
      }
    }

    console.log(`🚀 Attempting to auto-create Shiprocket shipment for order ${order.order_number}`)
    const shiprocketToken = await getToken(pool)
    
    if (!shiprocketToken) {
      console.log('⚠️ Shiprocket credentials not configured, skipping auto-shipment creation')
      return { success: false, error: { message: 'Shiprocket credentials not configured' } }
    }

    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'
    
    // Get available pickup locations
    const pickupLocations = await getPickupLocations(pool)
    // Default to verified pickup location: "Home" (Nefol Aesthetics Pvt. Ltd., Lucknow)
    let pickupLocation = 'Home'
    if (pickupLocations && pickupLocations.length > 0) {
      // Try to find "Home" first, then fallback to first available
      const verifiedLocation = pickupLocations.find((loc: any) => 
        loc.pickup_location === 'Home' || 
        loc.pickup_location === 'tyome' ||
        loc.id === 'Home' ||
        loc.id === 'tyome' ||
        loc.pickup_location?.toLowerCase() === 'home'
      )
      if (verifiedLocation) {
        pickupLocation = verifiedLocation.pickup_location || verifiedLocation.id?.toString() || 'Home'
        console.log(`✅ Using verified pickup location: ${pickupLocation} (Nefol Aesthetics Pvt. Ltd., Lucknow)`)
      } else {
        pickupLocation = pickupLocations[0].pickup_location || pickupLocations[0].id?.toString() || 'Home'
        console.log(`✅ Using pickup location: ${pickupLocation} (from ${pickupLocations.length} available locations)`)
      }
    } else {
      console.log('⚠️ No pickup locations found via API, using verified default: Home (Nefol Aesthetics Pvt. Ltd., Lucknow)')
    }
    
    // Helper function to extract 10-digit phone number
    const getTenDigitPhone = (phoneValue: string | undefined): string => {
      if (!phoneValue) return ''
      const cleanPhone = phoneValue.replace(/\D/g, '')
      if (cleanPhone.length > 10) return cleanPhone.slice(-10)
      if (cleanPhone.length === 10) return cleanPhone
      return cleanPhone
    }

    const billingAddress = typeof order.billing_address === 'string'
      ? JSON.parse(order.billing_address)
      : order.billing_address || {}
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]')
    const cod = order.cod === true || order.payment_method === 'cod' || order.payment_type === 'cod'

    // Prepare shipment payload
    const shipmentPayload = {
      order_id: order.order_number || `ORDER-${order.id}`,
      order_date: new Date(order.created_at || Date.now()).toISOString().split('T')[0],
      pickup_location: pickupLocation,
      billing_customer_name: order.customer_name,
      billing_last_name: shippingAddress.lastName || shippingAddress.name?.split(' ').slice(1).join(' ') || '',
      billing_address: shippingAddress.address || shippingAddress.street || '',
      billing_address_2: shippingAddress.apartment || shippingAddress.area || '',
      billing_city: shippingAddress.city || '',
      billing_pincode: shippingAddress.zip || shippingAddress.pincode || '',
      billing_state: shippingAddress.state || '',
      billing_country: shippingAddress.country || 'India',
      billing_email: order.customer_email,
      billing_phone: getTenDigitPhone(shippingAddress.phone || billingAddress.phone),
      shipping_is_billing: !billingAddress || Object.keys(billingAddress).length === 0,
      shipping_customer_name: order.customer_name,
      shipping_last_name: shippingAddress.lastName || shippingAddress.name?.split(' ').slice(1).join(' ') || '',
      shipping_address: shippingAddress.address || shippingAddress.street || '',
      shipping_address_2: shippingAddress.apartment || shippingAddress.area || '',
      shipping_city: shippingAddress.city || '',
      shipping_pincode: shippingAddress.zip || shippingAddress.pincode || '',
      shipping_state: shippingAddress.state || '',
      shipping_country: shippingAddress.country || 'India',
      shipping_email: order.customer_email,
      shipping_phone: getTenDigitPhone(shippingAddress.phone),
      order_items: items.map((item: any, index: number) => ({
        name: item.name || item.title || `Product ${index + 1}`,
        sku: item.sku || item.variant_id || `SKU-${item.product_id || index}`,
        units: item.quantity || 1,
        selling_price: item.price || item.unit_price || 0
      })),
      payment_method: cod ? 'COD' : 'Prepaid',
      sub_total: order.subtotal || 0,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
      total_discount: order.discount_amount || 0,
      shipping_charges: order.shipping || 0,
      giftwrap_charges: 0,
      transaction_charges: 0,
      total_discounts: order.discount_amount || 0,
      // Don't add cod_charges separately - order.total already includes all charges
      // Setting cod_charges to 0 prevents Shiprocket from adding extra charges
      cod_charges: 0,
      add_charges: 0,
      // Send exact order amount to Shiprocket to ensure correct COD collection
      // This is the final amount customer should pay (₹443)
      order_amount: order.total || 0,
      comment: `Order from NEFOL - ${order.order_number || order.id}`
    }
    
    const shipmentResp = await fetch(`${baseUrl}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${shiprocketToken}`
      },
      body: JSON.stringify(shipmentPayload)
    })
    
    const shipmentData: any = await shipmentResp.json()
    
    // Log full response for debugging
    if (!shipmentResp.ok) {
      console.error(`❌ Shiprocket API error (${shipmentResp.status}):`, JSON.stringify(shipmentData, null, 2))
    } else {
      console.log(`📦 Shiprocket API response:`, JSON.stringify(shipmentData, null, 2))
    }
    
    // Check for pickup location errors even if response is not OK
    if (!shipmentResp.ok && shipmentData?.message?.includes('Pickup location')) {
      let correctLocation = 'tyome' // Default fallback to verified location
      // Extract pickup location from error response
      if (shipmentData?.data?.data?.length > 0) {
        correctLocation = shipmentData.data.data[0].pickup_location || shipmentData.data.data[0].id?.toString() || 'tyome'
        console.log(`⚠️ Pickup location error detected in error response, extracted location: ${correctLocation}`)
      } else if (shipmentData?.data?.length > 0) {
        correctLocation = shipmentData.data[0].pickup_location || shipmentData.data[0].id?.toString() || 'tyome'
        console.log(`⚠️ Pickup location error detected in error response, extracted location: ${correctLocation}`)
      }
      
      console.log(`⚠️ Pickup location error detected, retrying with: ${correctLocation}`)
      console.log(`   Error message: ${shipmentData?.message}`)
      
      shipmentPayload.pickup_location = correctLocation
      const retryResp = await fetch(`${baseUrl}/orders/create/adhoc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${shiprocketToken}`
        },
        body: JSON.stringify(shipmentPayload)
      })
      
      const retryData: any = await retryResp.json()
      
      if (retryResp.ok && retryData) {
        // Extract shipment_id from multiple possible response structures
        let shipmentId = retryData?.shipment_id 
          || retryData?.data?.shipment_id 
          || retryData?.response?.shipment_id
          || retryData?.order_id
          || retryData?.data?.order_id
          || retryData?.response?.order_id
          || null
        
        // If shipment_id is still null after retry, try to fetch it
        if (!shipmentId) {
          console.log(`⚠️ shipment_id still null after retry, attempting to fetch from Shiprocket...`)
          try {
            const fetchResp = await fetch(`${baseUrl}/orders?order_id=${encodeURIComponent(shipmentPayload.order_id)}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${shiprocketToken}`
              }
            })
            
            if (fetchResp.ok) {
              const fetchData: any = await fetchResp.json()
              const fetchedShipmentId = fetchData?.data?.shipment_id 
                || fetchData?.shipment_id
                || (fetchData?.data && Array.isArray(fetchData.data) && fetchData.data.length > 0 ? fetchData.data[0]?.shipment_id : null)
                || null
              
              if (fetchedShipmentId) {
                shipmentId = fetchedShipmentId
                console.log(`✅ Found shipment_id via order fetch after pickup location retry: ${shipmentId}`)
                
                // Update database with fetched shipment_id
                await pool.query(
                  `UPDATE shiprocket_shipments SET shipment_id = $1, updated_at = NOW() WHERE order_id = $2`,
                  [String(shipmentId), order.id]
                )
              }
            }
          } catch (fetchErr: any) {
            console.error(`⚠️ Error fetching order after pickup location retry:`, fetchErr.message)
          }
        }
        
        const awbCode = retryData?.awb_code 
          || retryData?.data?.awb_code 
          || retryData?.response?.awb_code
          || null
        
        if (existingCheck.rows.length === 0) {
          await pool.query(
            `INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
            [
              order.id,
              shipmentId ? String(shipmentId) : null,
              retryData?.tracking_url || null,
              retryData?.status || 'pending',
              awbCode,
              retryData?.label_url || null
            ]
          )
        } else {
          await pool.query(
            `UPDATE shiprocket_shipments 
             SET shipment_id = $1, tracking_url = $2, status = $3, awb_code = $4, label_url = $5, updated_at = NOW()
             WHERE order_id = $6`,
            [
              shipmentId ? String(shipmentId) : null,
              retryData?.tracking_url || null,
              retryData?.status || 'pending',
              awbCode,
              retryData?.label_url || null,
              order.id
            ]
          )
        }
        
        console.log(`✅ Shiprocket shipment created automatically (after pickup location retry) for order ${order.order_number}, shipment_id: ${shipmentId || 'null (needs manual check)'}`)
        
        // ALWAYS try to generate AWB if we have a shipment_id
        let finalAwbCode = awbCode
        if (shipmentId && !finalAwbCode) {
          try {
            console.log(`🔄 Attempting to auto-generate AWB for shipment ${shipmentId}`)
            const awbResp = await fetch(`${baseUrl}/courier/assign/awb`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${shiprocketToken}`
              },
              body: JSON.stringify({
                shipment_id: shipmentId,
                courier_id: null // Let Shiprocket auto-assign courier
              })
            })
            
            const awbData: any = await awbResp.json()
            if (awbResp.ok && awbData) {
              finalAwbCode = awbData?.response?.awb_code || awbData?.awb_code || null
              if (finalAwbCode) {
                console.log(`✅ AWB generated automatically: ${finalAwbCode}`)
                
                // Update database with AWB code
                await pool.query(
                  `UPDATE shiprocket_shipments 
                   SET awb_code = $1, status = 'ready_to_ship', updated_at = NOW()
                   WHERE order_id = $2`,
                  [finalAwbCode, order.id]
                )
                
                // Try to generate label if AWB is available
                try {
                  const labelResp = await fetch(`${baseUrl}/courier/generate/label`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${shiprocketToken}`
                    },
                    body: JSON.stringify({ shipment_id: shipmentId })
                  })
                  const labelData: any = await labelResp.json()
                  if (labelResp.ok && labelData) {
                    const labelUrl = labelData?.label_url || labelData?.label_url_pdf || null
                    if (labelUrl) {
                      await pool.query(
                        `UPDATE shiprocket_shipments SET label_url = $1 WHERE order_id = $2`,
                        [labelUrl, order.id]
                      )
                    }
                  }
                } catch (labelErr) {
                  console.error('⚠️ Error generating label (non-critical):', labelErr)
                }
              } else {
                console.log(`⚠️ AWB generation response received but no AWB code found`)
              }
            } else {
              console.log(`⚠️ AWB generation failed (non-critical):`, awbData?.message || 'Unknown error')
            }
          } catch (awbErr: any) {
            console.error('⚠️ Error auto-generating AWB (non-critical):', awbErr.message)
            // Don't fail the whole process if AWB generation fails
          }
        }
        
        return { success: true, shipmentId: shipmentId ? String(shipmentId) : undefined, awbCode: finalAwbCode || undefined }
      } else {
        console.error('⚠️ Failed to auto-create Shiprocket shipment (after pickup location retry):', retryData)
        return { success: false, error: retryData }
      }
    }
    
    if (shipmentResp.ok && shipmentData) {
      // Shiprocket API can return shipment_id in multiple possible structures:
      // 1. shipmentData.shipment_id (direct)
      // 2. shipmentData.data.shipment_id (nested in data)
      // 3. shipmentData.response.shipment_id (nested in response)
      // 4. shipmentData.order_id (alternative field name)
      const shipmentId = shipmentData?.shipment_id 
        || shipmentData?.data?.shipment_id 
        || shipmentData?.response?.shipment_id
        || shipmentData?.order_id
        || shipmentData?.data?.order_id
        || shipmentData?.response?.order_id
        || null
      
      // Same for AWB code
      const awbCode = shipmentData?.awb_code 
        || shipmentData?.data?.awb_code 
        || shipmentData?.response?.awb_code
        || null
      
      // If shipment_id is not found, try to fetch it from Shiprocket using order_id
      let finalShipmentId = shipmentId
      if (!finalShipmentId) {
        console.log(`⚠️ shipment_id not found in initial response, attempting to fetch from Shiprocket using order_id...`)
        try {
          // Try to fetch the order from Shiprocket to get shipment_id
          const fetchResp = await fetch(`${baseUrl}/orders?order_id=${encodeURIComponent(shipmentPayload.order_id)}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${shiprocketToken}`
            }
          })
          
          if (fetchResp.ok) {
            const fetchData: any = await fetchResp.json()
            // Try to extract shipment_id from fetched order data
            const fetchedShipmentId = fetchData?.data?.shipment_id 
              || fetchData?.shipment_id
              || (fetchData?.data && Array.isArray(fetchData.data) && fetchData.data.length > 0 ? fetchData.data[0]?.shipment_id : null)
              || null
            
            if (fetchedShipmentId) {
              finalShipmentId = fetchedShipmentId
              console.log(`✅ Found shipment_id via order fetch: ${finalShipmentId}`)
            } else {
              console.error(`⚠️ Could not find shipment_id even after fetching order. Response:`, JSON.stringify(fetchData, null, 2))
            }
          } else {
            console.error(`⚠️ Failed to fetch order from Shiprocket: ${fetchResp.status}`)
          }
        } catch (fetchErr: any) {
          console.error(`⚠️ Error fetching order from Shiprocket:`, fetchErr.message)
        }
      }
      
      if (!finalShipmentId) {
        console.error(`❌ CRITICAL: shipment_id could not be obtained for order ${order.order_number}. Response structure:`, JSON.stringify(shipmentData, null, 2))
        // Still save the record but with null shipment_id - will need manual intervention
      }
      
      // Save or update in database
      if (existingCheck.rows.length === 0) {
        await pool.query(
          `INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
          [
            order.id,
            finalShipmentId ? String(finalShipmentId) : null,
            shipmentData?.tracking_url || null,
            shipmentData?.status || 'pending',
            awbCode,
            shipmentData?.label_url || null
          ]
        )
      } else {
        await pool.query(
          `UPDATE shiprocket_shipments 
           SET shipment_id = $1, tracking_url = $2, status = $3, awb_code = $4, label_url = $5, updated_at = NOW()
           WHERE order_id = $6`,
          [
            finalShipmentId ? String(finalShipmentId) : null,
            shipmentData?.tracking_url || null,
            shipmentData?.status || 'pending',
            awbCode,
            shipmentData?.label_url || null,
            order.id
          ]
        )
      }
      
      console.log(`✅ Shiprocket shipment created automatically for order ${order.order_number}, shipment_id: ${finalShipmentId || 'null (needs manual check)'}`)
      
      // ALWAYS try to generate AWB if we have a shipment_id
      let finalAwbCode = awbCode
      if (finalShipmentId) {
        // If AWB code is not present, generate it automatically
        if (!finalAwbCode) {
          try {
            console.log(`🔄 Attempting to auto-generate AWB for shipment ${finalShipmentId}`)
            const awbResp = await fetch(`${baseUrl}/courier/assign/awb`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${shiprocketToken}`
              },
              body: JSON.stringify({
                shipment_id: finalShipmentId,
                courier_id: null // Let Shiprocket auto-assign courier
              })
            })
          
          const awbData: any = await awbResp.json()
          if (awbResp.ok && awbData) {
            finalAwbCode = awbData?.response?.awb_code || awbData?.awb_code || null
            if (finalAwbCode) {
              console.log(`✅ AWB generated automatically: ${finalAwbCode}`)
              
              // Update database with AWB code
              await pool.query(
                `UPDATE shiprocket_shipments 
                 SET awb_code = $1, status = 'ready_to_ship', updated_at = NOW()
                 WHERE order_id = $2`,
                [finalAwbCode, order.id]
              )
              
              // Try to generate label if AWB is available
              try {
                const labelResp = await fetch(`${baseUrl}/courier/generate/label`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${shiprocketToken}`
                  },
                  body: JSON.stringify({ shipment_id: finalShipmentId })
                })
                const labelData: any = await labelResp.json()
                if (labelResp.ok && labelData) {
                  const labelUrl = labelData?.label_url || labelData?.label_url_pdf || null
                  if (labelUrl) {
                    await pool.query(
                      `UPDATE shiprocket_shipments SET label_url = $1 WHERE order_id = $2`,
                      [labelUrl, order.id]
                    )
                  }
                }
              } catch (labelErr) {
                console.error('⚠️ Error generating label (non-critical):', labelErr)
              }
            } else {
              console.log(`⚠️ AWB generation response received but no AWB code found`)
            }
          } else {
            console.log(`⚠️ AWB generation failed (non-critical):`, awbData?.message || 'Unknown error')
          }
        } catch (awbErr: any) {
          console.error('⚠️ Error auto-generating AWB (non-critical):', awbErr.message)
          // Don't fail the whole process if AWB generation fails
        }
        }
      }
      
      return { success: true, shipmentId: finalShipmentId ? String(finalShipmentId) : undefined, awbCode: finalAwbCode || undefined }
    } else {
      // Handle pickup location errors with retry
      if (shipmentData?.message?.includes('Pickup location') || shipmentData?.message?.includes('pickup')) {
        let correctLocation = 'Home' // Default fallback to verified location
        if (shipmentData?.data?.data?.length > 0) {
          correctLocation = shipmentData.data.data[0].pickup_location || shipmentData.data.data[0].id?.toString() || 'Home'
        } else if (shipmentData?.data?.length > 0) {
          correctLocation = shipmentData.data[0].pickup_location || shipmentData.data[0].id?.toString() || 'Home'
        }
        console.log(`⚠️ Pickup location error detected, retrying with: ${correctLocation}`)
        
        shipmentPayload.pickup_location = correctLocation
        const retryResp = await fetch(`${baseUrl}/orders/create/adhoc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${shiprocketToken}`
          },
          body: JSON.stringify(shipmentPayload)
        })
        
        const retryData: any = await retryResp.json()
        
        if (retryResp.ok && retryData) {
          // Extract shipment_id from multiple possible response structures
          let shipmentId = retryData?.shipment_id 
            || retryData?.data?.shipment_id 
            || retryData?.response?.shipment_id
            || retryData?.order_id
            || retryData?.data?.order_id
            || retryData?.response?.order_id
            || null
          
          // If shipment_id is still null after retry, try to fetch it
          if (!shipmentId) {
            console.log(`⚠️ shipment_id still null after retry, attempting to fetch from Shiprocket...`)
            try {
              const fetchResp = await fetch(`${baseUrl}/orders?order_id=${encodeURIComponent(shipmentPayload.order_id)}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${shiprocketToken}`
                }
              })
              
              if (fetchResp.ok) {
                const fetchData: any = await fetchResp.json()
                const fetchedShipmentId = fetchData?.data?.shipment_id 
                  || fetchData?.shipment_id
                  || (fetchData?.data && Array.isArray(fetchData.data) && fetchData.data.length > 0 ? fetchData.data[0]?.shipment_id : null)
                  || null
                
                if (fetchedShipmentId) {
                  shipmentId = fetchedShipmentId
                  console.log(`✅ Found shipment_id via order fetch after retry: ${shipmentId}`)
                  
                  // Update database with fetched shipment_id
                  await pool.query(
                    `UPDATE shiprocket_shipments SET shipment_id = $1, updated_at = NOW() WHERE order_id = $2`,
                    [String(shipmentId), order.id]
                  )
                }
              }
            } catch (fetchErr: any) {
              console.error(`⚠️ Error fetching order after retry:`, fetchErr.message)
            }
          }
          
          const awbCode = retryData?.awb_code 
            || retryData?.data?.awb_code 
            || retryData?.response?.awb_code
            || null
          
          if (existingCheck.rows.length === 0) {
            await pool.query(
              `INSERT INTO shiprocket_shipments (order_id, shipment_id, tracking_url, status, awb_code, label_url, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
              [
                order.id,
                shipmentId ? String(shipmentId) : null,
                retryData?.tracking_url || null,
                retryData?.status || 'pending',
                awbCode,
                retryData?.label_url || null
              ]
            )
          } else {
            await pool.query(
              `UPDATE shiprocket_shipments 
               SET shipment_id = $1, tracking_url = $2, status = $3, awb_code = $4, label_url = $5, updated_at = NOW()
               WHERE order_id = $6`,
              [
                shipmentId ? String(shipmentId) : null,
                retryData?.tracking_url || null,
                retryData?.status || 'pending',
                awbCode,
                retryData?.label_url || null,
                order.id
              ]
            )
          }
          
          console.log(`✅ Shiprocket shipment created automatically (after retry) for order ${order.order_number}, shipment_id: ${shipmentId || 'null (needs manual check)'}`)
          
          // ALWAYS try to generate AWB if we have a shipment_id
          let finalAwbCode = awbCode
          if (shipmentId && !finalAwbCode) {
            try {
              console.log(`🔄 Attempting to auto-generate AWB for shipment ${shipmentId}`)
              const awbResp = await fetch(`${baseUrl}/courier/assign/awb`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${shiprocketToken}`
                },
                body: JSON.stringify({
                  shipment_id: shipmentId,
                  courier_id: null // Let Shiprocket auto-assign courier
                })
              })
              
              const awbData: any = await awbResp.json()
              if (awbResp.ok && awbData) {
                finalAwbCode = awbData?.response?.awb_code || awbData?.awb_code || null
                if (finalAwbCode) {
                  console.log(`✅ AWB generated automatically: ${finalAwbCode}`)
                  
                  // Update database with AWB code
                  await pool.query(
                    `UPDATE shiprocket_shipments 
                     SET awb_code = $1, status = 'ready_to_ship', updated_at = NOW()
                     WHERE order_id = $2`,
                    [finalAwbCode, order.id]
                  )
                  
                  // Try to generate label if AWB is available
                  try {
                    const labelResp = await fetch(`${baseUrl}/courier/generate/label`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${shiprocketToken}`
                      },
                      body: JSON.stringify({ shipment_id: shipmentId })
                    })
                    const labelData: any = await labelResp.json()
                    if (labelResp.ok && labelData) {
                      const labelUrl = labelData?.label_url || labelData?.label_url_pdf || null
                      if (labelUrl) {
                        await pool.query(
                          `UPDATE shiprocket_shipments SET label_url = $1 WHERE order_id = $2`,
                          [labelUrl, order.id]
                        )
                      }
                    }
                  } catch (labelErr) {
                    console.error('⚠️ Error generating label (non-critical):', labelErr)
                  }
                } else {
                  console.log(`⚠️ AWB generation response received but no AWB code found`)
                }
              } else {
                console.log(`⚠️ AWB generation failed (non-critical):`, awbData?.message || 'Unknown error')
              }
            } catch (awbErr: any) {
              console.error('⚠️ Error auto-generating AWB (non-critical):', awbErr.message)
              // Don't fail the whole process if AWB generation fails
            }
          }
          
          return { success: true, shipmentId: shipmentId ? String(shipmentId) : undefined, awbCode: finalAwbCode || undefined }
        } else {
          console.error('⚠️ Failed to auto-create Shiprocket shipment (after retry):', retryData)
          return { success: false, error: retryData }
        }
      } else {
        console.error('⚠️ Failed to auto-create Shiprocket shipment:', shipmentData)
        return { success: false, error: shipmentData }
      }
    }
  } catch (err: any) {
    console.error('❌ Error auto-creating Shiprocket shipment:', err)
    return { success: false, error: err }
  }
}

export async function trackShipment(pool: Pool, req: Request, res: Response) {
  try {
    const { orderId } = req.params as any
    const token = await getToken(pool)
    if (!token) return sendError(res, 400, 'Invalid Shiprocket credentials')
    const { rows: shipments } = await pool.query('select * from shiprocket_shipments where order_id = $1 order by id desc limit 1', [orderId])
    if (shipments.length === 0) return sendError(res, 404, 'Shipment not found')
    const awb = shipments[0].awb_code
    const base = getBaseUrl()
    const resp = await fetch(`${base}/courier/track/awb/${encodeURIComponent(awb)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await resp.json()
    if (!resp.ok) return sendError(res, 400, 'Failed to track shipment', data)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, 500, 'Failed to track shipment', err)
  }
}

export async function checkPincodeServiceability(pool: Pool, req: Request, res: Response) {
  try {
    const { pickup_postcode, delivery_postcode, cod = '0', weight = '0.5' } = (req.query || {}) as any
    if (!pickup_postcode || !delivery_postcode) return sendError(res, 400, 'pickup_postcode and delivery_postcode are required')
    const token = await getToken(pool)
    if (!token) return sendError(res, 400, 'Invalid Shiprocket credentials')
    const base = getBaseUrl()
    const url = `${base}/courier/serviceability?pickup_postcode=${encodeURIComponent(pickup_postcode)}&delivery_postcode=${encodeURIComponent(delivery_postcode)}&cod=${encodeURIComponent(cod)}&weight=${encodeURIComponent(weight)}`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const data = await resp.json()
    if (!resp.ok) return sendError(res, 400, 'Failed to check serviceability', data)
    sendSuccess(res, data)
  } catch (err) {
    sendError(res, 500, 'Failed to check pincode serviceability', err)
  }
}

// =============== Extended Logistics (stubs with graceful fallbacks) ===============

export async function createManifest(pool: Pool, req: Request, res: Response) {
  try {
    const { orderIds } = req.body || {}
    if (!Array.isArray(orderIds) || orderIds.length === 0) return sendError(res, 400, 'orderIds required')
    // Placeholder: In a full integration, call Shiprocket manifest endpoint and return PDF URL
    const manifest_url = `/manifests/manifest-${Date.now()}.pdf`
    sendSuccess(res, { manifest_url, count: orderIds.length })
  } catch (err) {
    sendError(res, 500, 'Failed to generate manifest', err)
  }
}

export async function schedulePickup(pool: Pool, req: Request, res: Response) {
  try {
    const { pickup_date, orderIds } = req.body || {}
    if (!pickup_date) return sendError(res, 400, 'pickup_date required')
    if (!Array.isArray(orderIds) || orderIds.length === 0) return sendError(res, 400, 'orderIds required')
    // Placeholder: hit Shiprocket pickup scheduling in full implementation
    sendSuccess(res, { scheduled: true, pickup_date, count: orderIds.length })
  } catch (err) {
    sendError(res, 500, 'Failed to schedule pickup', err)
  }
}

export async function listNdr(pool: Pool, req: Request, res: Response) {
  try {
    const { from, to } = (req.query || {}) as any
    // Placeholder: fetch NDRs from Shiprocket; returning empty list to keep UI functional
    sendSuccess(res, { items: [], from: from || null, to: to || null })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch NDR list', err)
  }
}

export async function actOnNdr(pool: Pool, req: Request, res: Response) {
  try {
    const { awb } = req.params as any
    const { action, note } = req.body || {}
    if (!awb) return sendError(res, 400, 'awb required')
    if (!action) return sendError(res, 400, 'action required')
    // Placeholder: submit NDR action to Shiprocket; audit locally if needed
    sendSuccess(res, { awb, action, note: note || null, status: 'submitted' })
  } catch (err) {
    sendError(res, 500, 'Failed to process NDR action', err)
  }
}

export async function markRto(pool: Pool, req: Request, res: Response) {
  try {
    const { orderId } = req.params as any
    if (!orderId) return sendError(res, 400, 'orderId required')
    // Minimal local update to reflect RTO (you may keep a dedicated table/field)
    await pool.query(`update orders set status = 'rto', updated_at = now() where id = $1`, [orderId])
    sendSuccess(res, { orderId, status: 'rto' })
  } catch (err) {
    sendError(res, 500, 'Failed to mark RTO', err)
  }
}


