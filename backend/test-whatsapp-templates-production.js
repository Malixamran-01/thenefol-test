/**
 * Test WhatsApp Templates on Production
 * 
 * This script tests all WhatsApp template endpoints on https://thenefol.com/
 * 
 * Usage: node test-whatsapp-templates-production.js <phone_number>
 * Example: node test-whatsapp-templates-production.js 919876543210
 */

const BASE_URL = 'https://thenefol.com'

// Get phone number from command line
const testPhone = process.argv[2]

if (!testPhone) {
  console.log('❌ Usage: node test-whatsapp-templates-production.js <phone_number>')
  console.log('   Example: node test-whatsapp-templates-production.js 919876543210')
  process.exit(1)
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testEndpoint(name, method, endpoint, body = null, headers = {}) {
  try {
    const url = `${BASE_URL}${endpoint}`
    log(`\n🧪 Testing: ${name}`, 'cyan')
    log(`   ${method} ${url}`, 'blue')
    
    if (body) {
      log(`   Body: ${JSON.stringify(body, null, 2)}`, 'blue')
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (response.ok) {
      log(`   ✅ Success (${response.status})`, 'green')
      if (data.data || data.success) {
        log(`   Response: ${JSON.stringify(data, null, 2)}`, 'green')
      }
      return { success: true, data }
    } else {
      log(`   ❌ Failed (${response.status})`, 'red')
      log(`   Error: ${JSON.stringify(data, null, 2)}`, 'red')
      return { success: false, error: data }
    }
  } catch (error) {
    log(`   ❌ Exception: ${error.message}`, 'red')
    return { success: false, error: error.message }
  }
}

async function runTests() {
  log('\n' + '='.repeat(60), 'bright')
  log('🚀 WhatsApp Templates Production Test Suite', 'bright')
  log('='.repeat(60), 'bright')
  log(`\n📍 Base URL: ${BASE_URL}`, 'yellow')
  log(`📱 Test Phone: ${testPhone}`, 'yellow')
  log(`\n⏰ Started at: ${new Date().toISOString()}\n`, 'yellow')

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0
  }

  // Test 1: Send OTP (nefol_verify_code)
  const otpResult = await testEndpoint(
    '1. Send OTP (nefol_verify_code)',
    'POST',
    '/api/auth/send-otp',
    { phone: testPhone }
  )
  if (otpResult.success) results.passed++
  else results.failed++

  // Wait 2 seconds between requests
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 2: Password Reset (nefol_reset_password)
  const resetResult = await testEndpoint(
    '2. Password Reset (nefol_reset_password)',
    'POST',
    '/api/auth/request-reset',
    { phone: testPhone }
  )
  if (resetResult.success) results.passed++
  else results.failed++

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 3: Test WhatsApp (Plain Text)
  const testWhatsAppResult = await testEndpoint(
    '3. Test WhatsApp (Plain Text)',
    'POST',
    '/api/alerts/test/whatsapp',
    {
      phone_number: testPhone,
      message: `Test message from production test script - ${new Date().toISOString()}`
    }
  )
  if (testWhatsAppResult.success) results.passed++
  else results.failed++

  await new Promise(resolve => setTimeout(resolve, 2000))

  // Test 4: WhatsApp Subscribe
  const subscribeResult = await testEndpoint(
    '4. WhatsApp Subscribe',
    'POST',
    '/api/whatsapp/subscribe',
    { phone: testPhone }
  )
  if (subscribeResult.success) results.passed++
  else results.failed++

  // Summary
  log('\n' + '='.repeat(60), 'bright')
  log('📊 Test Summary', 'bright')
  log('='.repeat(60), 'bright')
  log(`✅ Passed: ${results.passed}`, 'green')
  log(`❌ Failed: ${results.failed}`, 'red')
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow')
  log(`\n⏰ Completed at: ${new Date().toISOString()}`, 'yellow')
  log('\n' + '='.repeat(60), 'bright')

  // Notes
  log('\n📝 Notes:', 'cyan')
  log('   • OTP and Password Reset templates require user to exist in database', 'yellow')
  log('   • Order templates (shipped, delivered) require admin authentication', 'yellow')
  log('   • Cart recovery is triggered by cron job (not directly testable)', 'yellow')
  log('   • Signup and Login templates are triggered during user flows', 'yellow')
  log('\n💡 To test order templates:', 'cyan')
  log('   1. Login as admin to get JWT token', 'yellow')
  log('   2. Create or find an order ID', 'yellow')
  log('   3. Use PUT /api/orders/:id with status="shipped" or "delivered"', 'yellow')
  log('\n💡 To test signup/login templates:', 'cyan')
  log('   1. Register a new user with phone number', 'yellow')
  log('   2. Login from a new device/IP', 'yellow')
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red')
  process.exit(1)
})

