// Test script to create a COD order and verify Shiprocket integration
const { Pool } = require('pg')
require('dotenv').config()

const API_BASE_URL = process.env.BACKEND_HOST && process.env.BACKEND_PORT 
  ? `http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`
  : 'http://localhost:2000'

const USER_EMAIL = 'Jhx82ndc9g@gmail.com'
const USER_PASSWORD = 'Jhx82ndc9g@'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function testShiprocketOrder() {
  try {
    console.log('🚀 Starting Shiprocket Order Test\n')
    console.log('='.repeat(60))
    
    // Step 1: Login as user
    console.log('\n📝 Step 1: Logging in as user...')
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: USER_EMAIL,
        password: USER_PASSWORD
      })
    })
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json().catch(() => ({}))
      console.error('❌ Login failed:', errorData)
      throw new Error('Login failed')
    }
    
    const loginData = await loginResponse.json()
    const token = loginData.token || loginData.data?.token
    const userId = loginData.user?.id || loginData.data?.user?.id
    
    if (!token) {
      console.error('❌ No token received from login')
      throw new Error('No token received')
    }
    
    console.log('✅ Login successful!')
    console.log(`   User ID: ${userId}`)
    console.log(`   Token: ${token.substring(0, 30)}...`)
    
    // Step 2: Create a COD order
    console.log('\n📦 Step 2: Creating COD order...')
    const orderNumber = `TEST-COD-${Date.now()}`
    const orderData = {
      order_number: orderNumber,
      customer_name: 'Test User',
      customer_email: USER_EMAIL,
      shipping_address: {
        address: '123 Test Street',
        apartment: 'Apt 4B',
        city: 'Mumbai',
        state: 'Maharashtra',
        zip: '400001',
        pincode: '400001',
        country: 'India',
        phone: '9876543210',
        lastName: 'User'
      },
      items: [
        {
          product_id: 1,
          name: 'Test Product',
          title: 'Test Product',
          quantity: 1,
          price: 500,
          unit_price: 500,
          sku: 'TEST-SKU-001'
        }
      ],
      subtotal: 500,
      shipping: 50,
      tax: 90,
      total: 640,
      payment_method: 'cod',
      payment_type: 'cod',
      payment_status: 'unpaid',
      cod: true
    }
    
    const orderResponse = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(orderData)
    })
    
    if (!orderResponse.ok) {
      const errorData = await orderResponse.json().catch(() => ({}))
      console.error('❌ Order creation failed:', errorData)
      throw new Error('Order creation failed')
    }
    
    const orderResult = await orderResponse.json()
    const order = orderResult.data || orderResult
    const orderId = order.id
    
    console.log('✅ Order created successfully!')
    console.log(`   Order ID: ${orderId}`)
    console.log(`   Order Number: ${order.order_number || orderNumber}`)
    console.log(`   Total: ₹${order.total}`)
    console.log(`   COD: ${order.cod}`)
    console.log(`   Payment Status: ${order.payment_status}`)
    
    // Step 3: Wait a moment for async Shiprocket processing
    console.log('\n⏳ Step 3: Waiting for Shiprocket shipment creation...')
    await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3 seconds
    
    // Step 4: Check if Shiprocket shipment was created
    console.log('\n🔍 Step 4: Checking for Shiprocket shipment...')
    const shipmentCheck = await pool.query(
      `SELECT * FROM shiprocket_shipments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
      [orderId]
    )
    
    if (shipmentCheck.rows.length > 0) {
      const shipment = shipmentCheck.rows[0]
      console.log('✅ Shiprocket shipment found!')
      console.log(`   Shipment ID: ${shipment.id}`)
      console.log(`   Shiprocket Shipment ID: ${shipment.shipment_id || 'Not assigned yet'}`)
      console.log(`   AWB Code: ${shipment.awb_code || 'Not generated yet'}`)
      console.log(`   Status: ${shipment.status}`)
      console.log(`   Tracking URL: ${shipment.tracking_url || 'Not available'}`)
      console.log(`   Label URL: ${shipment.label_url || 'Not available'}`)
      console.log(`   Created At: ${shipment.created_at}`)
      
      // Step 5: Verify Shiprocket API integration
      if (shipment.shipment_id) {
        console.log('\n🌐 Step 5: Verifying Shiprocket API integration...')
        const { rows: configRows } = await pool.query(
          'SELECT api_key, api_secret FROM shiprocket_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
        )
        
        if (configRows.length > 0) {
          const config = configRows[0]
          console.log('✅ Shiprocket credentials found in database')
          console.log(`   API Email: ${config.api_key}`)
          console.log(`   API Password: ${config.api_secret ? '***' + config.api_secret.slice(-4) : 'Not set'}`)
          
          // Test Shiprocket authentication
          try {
            const shiprocketResponse = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: config.api_key,
                password: config.api_secret
              })
            })
            
            if (shiprocketResponse.ok) {
              const shiprocketData = await shiprocketResponse.json()
              console.log('✅ Shiprocket API authentication successful!')
              console.log(`   Token received: ${shiprocketData.token ? 'Yes' : 'No'}`)
            } else {
              const errorData = await shiprocketResponse.json().catch(() => ({}))
              console.log('⚠️ Shiprocket API authentication failed:', errorData)
            }
          } catch (err) {
            console.log('⚠️ Error testing Shiprocket API:', err.message)
          }
        } else {
          console.log('⚠️ No active Shiprocket credentials found')
        }
      } else {
        console.log('\n⚠️ Shipment created in database but Shiprocket shipment_id not yet assigned')
        console.log('   This might mean:')
        console.log('   - Shiprocket API call is still processing')
        console.log('   - There was an error creating the shipment in Shiprocket')
        console.log('   - Check backend logs for more details')
      }
    } else {
      console.log('❌ No Shiprocket shipment found!')
      console.log('   This means the automatic shipment creation did not work.')
      console.log('   Possible reasons:')
      console.log('   - Shiprocket credentials not configured')
      console.log('   - Error in automatic shipment creation logic')
      console.log('   - Check backend logs for errors')
      
      // Check if Shiprocket config exists
      const configCheck = await pool.query(
        'SELECT * FROM shiprocket_config WHERE is_active = true ORDER BY updated_at DESC LIMIT 1'
      )
      
      if (configCheck.rows.length === 0) {
        console.log('\n⚠️ No active Shiprocket configuration found in database')
      } else {
        console.log('\n✅ Shiprocket configuration exists in database')
        console.log('   But shipment was not created automatically')
      }
    }
    
    // Step 6: Check order details from database
    console.log('\n📋 Step 6: Checking order details from database...')
    const orderDetails = await pool.query(
      `SELECT id, order_number, customer_name, customer_email, cod, payment_status, 
              shipping_address, items, total, created_at
       FROM orders WHERE id = $1`,
      [orderId]
    )
    
    if (orderDetails.rows.length > 0) {
      const orderDetail = orderDetails.rows[0]
      console.log('✅ Order details retrieved:')
      console.log(`   COD: ${orderDetail.cod}`)
      console.log(`   Payment Status: ${orderDetail.payment_status}`)
      
      // Parse shipping address
      let shippingAddr = orderDetail.shipping_address
      if (typeof shippingAddr === 'string') {
        try {
          shippingAddr = JSON.parse(shippingAddr)
        } catch (e) {
          shippingAddr = {}
        }
      }
      
      console.log(`   Shipping Address: ${shippingAddr?.address || 'N/A'}`)
      console.log(`   Shipping City: ${shippingAddr?.city || 'N/A'}`)
      console.log(`   Shipping Pincode: ${shippingAddr?.pincode || shippingAddr?.zip || 'N/A'}`)
      
      // Check if conditions for auto-shipment creation are met
      const hasCompleteAddress = shippingAddr?.address && shippingAddr?.city && (shippingAddr?.pincode || shippingAddr?.zip)
      const shouldCreateShipment = (orderDetail.payment_status === 'paid' || orderDetail.cod === true) && hasCompleteAddress
      
      console.log(`\n   Auto-shipment conditions:`)
      console.log(`   - Payment is paid OR COD: ${orderDetail.payment_status === 'paid' || orderDetail.cod === true ? '✅' : '❌'}`)
      console.log(`   - Address complete: ${hasCompleteAddress ? '✅' : '❌'}`)
      console.log(`   - Should create shipment: ${shouldCreateShipment ? '✅' : '❌'}`)
    }
    
    // Step 7: Try to manually create shipment via API to test
    if (shipmentCheck.rows.length > 0 && !shipmentCheck.rows[0].shipment_id) {
      console.log('\n🔧 Step 7: Attempting manual shipment creation via API...')
      try {
        const manualShipmentResponse = await fetch(`${API_BASE_URL}/api/shiprocket/orders/${orderId}/shipment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-user-role': 'admin',
            'x-user-permissions': 'orders:update'
          }
        })
        
        if (manualShipmentResponse.ok) {
          const manualShipmentData = await manualShipmentResponse.json()
          console.log('✅ Manual shipment creation successful!')
          console.log(`   Shiprocket Response:`, JSON.stringify(manualShipmentData, null, 2))
        } else {
          const errorData = await manualShipmentResponse.json().catch(() => ({}))
          console.log('❌ Manual shipment creation failed:', errorData)
        }
      } catch (err) {
        console.log('⚠️ Error in manual shipment creation:', err.message)
      }
    }
    
    // Step 8: Summary
    console.log('\n' + '='.repeat(60))
    console.log('\n📊 Test Summary:')
    console.log(`   Order Created: ✅`)
    console.log(`   Order ID: ${orderId}`)
    console.log(`   Order Number: ${order.order_number || orderNumber}`)
    console.log(`   Shiprocket Shipment Record: ${shipmentCheck.rows.length > 0 ? '✅' : '❌'}`)
    
    if (shipmentCheck.rows.length > 0) {
      const shipment = shipmentCheck.rows[0]
      console.log(`   Shiprocket Shipment ID: ${shipment.shipment_id || '❌ Not assigned'}`)
      console.log(`   Status: ${shipment.status}`)
      
      if (!shipment.shipment_id) {
        console.log(`\n   ⚠️  ISSUE DETECTED:`)
        console.log(`   A shipment record was created in the database, but no Shiprocket shipment_id was assigned.`)
        console.log(`   This means the automatic Shiprocket API call likely failed.`)
        console.log(`   Check backend server logs for error messages.`)
        console.log(`   You can manually create the shipment from the admin panel.`)
      } else {
        console.log(`\n   ✅ SUCCESS:`)
        console.log(`   Order was automatically sent to Shiprocket!`)
        console.log(`   Shiprocket Shipment ID: ${shipment.shipment_id}`)
      }
    } else {
      console.log(`\n   ⚠️  ISSUE DETECTED:`)
      console.log(`   No shipment record was created.`)
      console.log(`   Check if automatic shipment creation conditions are met.`)
    }
    
    console.log('\n✅ Test completed!\n')
    
  } catch (err) {
    console.error('\n❌ Test failed with error:', err.message)
    console.error(err)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the test
testShiprocketOrder()

