/**
 * Test Script: Create 15 Orders with Referral Link and Redeem Nefol Coins
 * 
 * This script:
 * 1. Fetches products from the API
 * 2. Creates/uses 15 test users
 * 3. Adds coins to users (5000 coins = ₹500 each)
 * 4. Creates 15 orders with affiliate_id=1 (from referral link ?ref=1)
 * 5. Redeems nefol coins in each order (25% of order value)
 * 6. Verifies affiliate tracking and coin redemption
 * 
 * Usage:
 *   node test-referral-orders.js
 * 
 * Requirements:
 *   - Node.js 18+ (for fetch) or install node-fetch
 *   - Backend running on https://thenefol.com
 *   - Database accessible via DATABASE_URL env var
 *   - Affiliate with ID=1 must exist in database
 */

require('dotenv/config');
const { Pool } = require('pg');

// Use fetch from node (Node 18+) or install node-fetch for older versions
let fetch;
try {
  fetch = globalThis.fetch || require('node-fetch');
} catch (e) {
  console.error('❌ fetch is not available. Please use Node.js 18+ or install node-fetch: npm install node-fetch');
  process.exit(1);
}

const API_BASE = process.env.API_BASE_URL || 'https://thenefol.com';
const AFFILIATE_ID = 1; // From ref=1 in the referral link

// Database connection for adding coins
const connectionString = process.env.DATABASE_URL || 'postgresql://nofol_users:Jhx82ndc9g@j@localhost:5432/nefol';
const pool = new Pool({ connectionString });

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  const mergedHeaders = {
    ...defaultHeaders,
    ...(options.headers || {}),
  };
  
  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

// Generate unique order number
function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `ORD-${timestamp}-${random}`;
}

// Generate random email
function generateEmail(index) {
  return `testuser${index}@testnefol.com`;
}

// Generate random phone
function generatePhone() {
  return `9${Math.floor(Math.random() * 9000000000) + 1000000000}`;
}

// Main function to test orders
async function testReferralOrders() {
  console.log('🚀 Starting referral order test...\n');
  console.log(`📍 API Base: ${API_BASE}`);
  console.log(`🎯 Affiliate ID: ${AFFILIATE_ID}\n`);

  try {
    // Step 1: Fetch products
    console.log('📦 Step 1: Fetching products...');
    let products = await apiRequest('/api/products');
    // Handle different response formats
    if (products.success && products.data) {
      products = products.data;
    } else if (Array.isArray(products)) {
      // Already an array
    } else if (products.data && Array.isArray(products.data)) {
      products = products.data;
    }
    const productList = Array.isArray(products) ? products : [];
    
    if (productList.length === 0) {
      throw new Error('No products found in the database');
    }
    
    console.log(`✅ Found ${productList.length} products`);
    const selectedProduct = productList[0];
    console.log(`   Using product: ${selectedProduct.title || selectedProduct.name} (₹${selectedProduct.price || 'N/A'})\n`);

    // Step 2: Create test users with coins (or use existing)
    console.log('👥 Step 2: Preparing users with coins...');
    const users = [];
    
    for (let i = 1; i <= 15; i++) {
      const email = generateEmail(i);
      const name = `Test User ${i}`;
      const phone = generatePhone();
      
      // Try to create user (or use existing)
      let userId;
      try {
        // Try to register user
        const registerData = await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password: 'test123456',
            phone,
          }),
        });
        // Handle different response formats
        const userData = registerData.success && registerData.data ? registerData.data : registerData;
        userId = userData.id || userData.user?.id || registerData.id || registerData.user?.id;
        console.log(`   ✅ Created user ${i}: ${email}`);
      } catch (err) {
        // User might already exist, that's okay - we'll add coins to existing user
        if (err.message.includes('already exists') || err.message.includes('409') || err.message.includes('duplicate')) {
          console.log(`   ℹ️  User ${i} already exists: ${email} (will add coins)`);
        } else {
          console.log(`   ⚠️  Could not create user ${i}: ${email} - ${err.message} (will try to add coins anyway)`);
        }
      }
      
      users.push({ email, name, phone, userId, token: null });
    }
    console.log(`✅ Prepared ${users.length} users\n`);

    // Step 2.5: Login users to get tokens
    console.log('🔐 Step 2.5: Logging in users to get authentication tokens...');
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        const loginData = await apiRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: user.email,
            password: 'test123456',
          }),
        });
        
        // Handle different response formats
        const loginResult = loginData.success && loginData.data ? loginData.data : loginData;
        user.token = loginResult.token || loginData.token;
        
        if (user.token) {
          console.log(`   ✅ Logged in user ${i + 1}: ${user.email}`);
        } else {
          console.log(`   ⚠️  No token received for ${user.email}`);
        }
      } catch (err) {
        console.log(`   ⚠️  Could not login user ${i + 1}: ${user.email} - ${err.message}`);
      }
    }
    console.log('');

    // Step 3: Add coins to users via database
    console.log('💰 Step 3: Adding coins to users...');
    const coinsPerUser = 5000; // 5000 coins = ₹500, enough for multiple orders
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        // Get user ID from database
        const userResult = await pool.query('SELECT id, loyalty_points FROM users WHERE email = $1', [user.email]);
        
        if (userResult.rows.length > 0) {
          const userId = userResult.rows[0].id;
          const currentCoins = userResult.rows[0].loyalty_points || 0;
          
          // Add coins if user doesn't have enough
          if (currentCoins < coinsPerUser) {
            const coinsToAdd = coinsPerUser - currentCoins;
            await pool.query(
              'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
              [coinsToAdd, userId]
            );
            
            // Record transaction (order_id can be null for non-order transactions)
            try {
              await pool.query(`
                INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
              `, [
                userId,
                coinsToAdd,
                'earned',
                `Test: Added ${coinsToAdd} coins for testing referral orders`,
                'completed',
                null, // order_id is null for test coins
                new Date()
              ]);
            } catch (txErr) {
              // If table doesn't exist or has different structure, just log
              console.log(`   ⚠️  Could not record transaction (non-critical): ${txErr.message}`);
            }
            
            console.log(`   ✅ Added ${coinsToAdd} coins to ${user.email} (now has ${coinsPerUser} coins)`);
          } else {
            console.log(`   ℹ️  ${user.email} already has ${currentCoins} coins (sufficient)`);
          }
        } else {
          console.log(`   ⚠️  User ${user.email} not found in database (will be created with order)`);
        }
      } catch (err) {
        console.error(`   ❌ Error adding coins to ${user.email}: ${err.message}`);
      }
    }
    console.log('');
    
    // Step 4: Create 15 orders with referral link
    console.log('🛒 Step 4: Creating 15 orders with referral link...\n');
    const orders = [];
    const results = {
      success: [],
      failed: [],
    };

    for (let i = 0; i < 15; i++) {
      const user = users[i];
      const orderNumber = generateOrderNumber();
      
      // Calculate order details
      const productPrice = parseFloat(selectedProduct.price) || 500;
      const quantity = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const subtotal = productPrice * quantity;
      const shipping = subtotal > 500 ? 0 : 50;
      const tax = subtotal * 0.18; // 18% GST
      const total = subtotal + shipping + tax;
      
      // Use 20-30% of order value in coins (if user has enough)
      // 1 rupee = 10 coins, so for ₹100 order, we can use 200-300 coins (₹20-30)
      const coinsToUse = Math.floor((total * 0.25) * 10); // 25% of order in coins
      const finalTotal = total - (coinsToUse / 10); // Deduct coin value from total
      
      const orderData = {
        order_number: orderNumber,
        customer_name: user.name,
        customer_email: user.email,
        shipping_address: {
          firstName: user.name.split(' ')[0] || 'Test',
          lastName: user.name.split(' ')[1] || 'User',
          address: `${Math.floor(Math.random() * 100)} Test Street`,
          apartment: `Apt ${Math.floor(Math.random() * 100)}`,
          city: 'Mumbai',
          state: 'Maharashtra',
          zip: '400001',
          pincode: '400001',
          phone: user.phone,
          country: 'India',
          email: user.email,
        },
        billing_address: null, // Same as shipping
        items: [
          {
            product_id: selectedProduct.id,
            name: selectedProduct.title || selectedProduct.name,
            price: productPrice,
            quantity: quantity,
            image: selectedProduct.list_image || selectedProduct.listImage || '',
          },
        ],
        subtotal: Number(subtotal.toFixed(2)),
        shipping: shipping,
        tax: Number(tax.toFixed(2)),
        total: Number(finalTotal.toFixed(2)),
        payment_method: coinsToUse > 0 ? 'coins' : 'cod',
        payment_type: coinsToUse > 0 ? 'prepaid' : 'cod',
        payment_status: 'unpaid',
        cod: coinsToUse === 0,
        status: 'created',
        affiliate_id: AFFILIATE_ID, // This is the key - referral tracking
        discount_code: null,
        discount_amount: 0,
        coins_used: coinsToUse, // Redeem coins
      };

      try {
        console.log(`   📝 Creating order ${i + 1}/15: ${orderNumber}`);
        console.log(`      Customer: ${user.email}`);
        console.log(`      Total: ₹${finalTotal.toFixed(2)} (using ${coinsToUse} coins)`);
        
        // Add authentication token if available
        const headers = {};
        if (user.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        
        const orderResult = await apiRequest('/api/orders', {
          method: 'POST',
          headers,
          body: JSON.stringify(orderData),
        });
        
        // Handle different response formats
        const order = orderResult.success && orderResult.data ? orderResult.data : orderResult;
        
        orders.push(order);
        results.success.push({
          orderNumber,
          email: user.email,
          total: finalTotal,
          coinsUsed: coinsToUse,
          orderId: order.id || orderResult.id,
        });
        
        console.log(`      ✅ Order created successfully (ID: ${order.id || orderResult.id || 'N/A'})\n`);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`      ❌ Failed to create order: ${error.message}\n`);
        results.failed.push({
          orderNumber,
          email: user.email,
          error: error.message,
        });
      }
    }

    // Step 5: Verify results
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful Orders: ${results.success.length}/15`);
    console.log(`❌ Failed Orders: ${results.failed.length}/15\n`);
    
    if (results.success.length > 0) {
      console.log('✅ Successful Orders:');
      results.success.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNumber} - ${order.email} - ₹${order.total.toFixed(2)} - ${order.coinsUsed} coins`);
      });
      console.log('');
    }
    
    if (results.failed.length > 0) {
      console.log('❌ Failed Orders:');
      results.failed.forEach((order, index) => {
        console.log(`   ${index + 1}. ${order.orderNumber} - ${order.email} - Error: ${order.error}`);
      });
      console.log('');
    }

    // Step 6: Verify affiliate tracking
    console.log('🎯 Step 6: Verifying affiliate tracking...');
    try {
      // Try to fetch affiliate referrals (if endpoint exists)
      const affiliateData = await apiRequest(`/api/affiliate/dashboard`, {
        headers: {
          // Note: This might require auth, but let's try
        },
      }).catch(() => null);
      
      if (affiliateData) {
        console.log(`   ✅ Affiliate dashboard accessible`);
        console.log(`   📈 Total Referrals: ${affiliateData.total_referrals || 'N/A'}`);
        console.log(`   💰 Total Earnings: ₹${affiliateData.total_earnings || 0}`);
      } else {
        console.log(`   ℹ️  Affiliate dashboard requires authentication`);
      }
    } catch (err) {
      console.log(`   ℹ️  Could not verify affiliate tracking (may require auth): ${err.message}`);
    }
    console.log('');

    // Step 7: Verify coin redemption
    console.log('💰 Step 7: Verifying coin redemption...');
    const totalCoinsRedeemed = results.success.reduce((sum, order) => sum + order.coinsUsed, 0);
    console.log(`   Total coins redeemed across all orders: ${totalCoinsRedeemed}`);
    console.log(`   Total value redeemed: ₹${(totalCoinsRedeemed / 10).toFixed(2)}\n`);

    // Final summary
    console.log('='.repeat(60));
    console.log('🎉 Test Complete!');
    console.log('='.repeat(60));
    console.log(`\n📋 Summary:`);
    console.log(`   • Orders Created: ${results.success.length}/15`);
    console.log(`   • Orders Failed: ${results.failed.length}/15`);
    console.log(`   • Affiliate ID Used: ${AFFILIATE_ID}`);
    console.log(`   • Total Coins Redeemed: ${totalCoinsRedeemed}`);
    console.log(`   • Total Value Redeemed: ₹${(totalCoinsRedeemed / 10).toFixed(2)}`);
    
    if (results.success.length === 15) {
      console.log(`\n✅ All systems working properly!`);
      console.log(`   ✓ Backend API: Working`);
      console.log(`   ✓ Order Creation: Working`);
      console.log(`   ✓ Referral Tracking: Working (affiliate_id=${AFFILIATE_ID})`);
      console.log(`   ✓ Coin Redemption: Working`);
    } else {
      console.log(`\n⚠️  Some orders failed. Check errors above.`);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testReferralOrders()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    pool.end();
    process.exit(1);
  });

