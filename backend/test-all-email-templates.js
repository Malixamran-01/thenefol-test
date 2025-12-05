/**
 * Test Script for All Email Templates
 * Tests all 14 email automation functions with real email address
 * 
 * Usage: node test-all-email-templates.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

// Import all email functions
const {
  sendWelcomeEmail,
  sendCartAddedEmail,
  sendOrderConfirmationEmail,
  sendPaymentFailedEmail,
  sendOrderStatusUpdateEmail,
  sendCartAbandonmentEmail,
  sendPasswordResetEmail,
  sendPasswordResetConfirmationEmail,
  sendVerificationEmail,
  sendLoginAlertEmail,
  sendAccountSecurityAlertEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionReminderOrCancelledEmail
} = require('./dist/services/emailService')

const TEST_EMAIL = 'rahulseth3988@gmail.com' // Real email for testing

// All 14 email functions with their required parameters
const emailTests = [
  {
    name: 'sendWelcomeEmail',
    description: 'Welcome Email - User Signup',
    function: sendWelcomeEmail,
    params: [TEST_EMAIL, 'Rahul Seth']
  },
  {
    name: 'sendCartAddedEmail',
    description: 'Cart Item Added Email',
    function: sendCartAddedEmail,
    params: [TEST_EMAIL, 'Rahul Seth', 'Premium Face Serum', 1299]
  },
  {
    name: 'sendOrderConfirmationEmail',
    description: 'Order Confirmation Email',
    function: sendOrderConfirmationEmail,
    params: [{
      order_number: 'NEFOL-2024-001',
      customer_name: 'Rahul Seth',
      customer_email: TEST_EMAIL,
      items: [
        { title: 'Premium Face Serum', quantity: 1, price: 1299 },
        { title: 'Moisturizing Cream', quantity: 2, price: 899 }
      ],
      subtotal: 3097,
      shipping: 50,
      tax: 557.46,
      total: 3704.46,
      payment_status: 'Paid',
      payment_method: 'Razorpay',
      discount_amount: 0
    }, false]
  },
  {
    name: 'sendPaymentFailedEmail',
    description: 'Payment Failed Email',
    function: sendPaymentFailedEmail,
    params: [TEST_EMAIL, 'Rahul Seth', 'NEFOL-2024-001', 'Insufficient funds']
  },
  {
    name: 'sendOrderStatusUpdateEmail',
    description: 'Order Status Update Email',
    function: sendOrderStatusUpdateEmail,
    params: [{
      order_number: 'NEFOL-2024-001',
      customer_name: 'Rahul Seth',
      customer_email: TEST_EMAIL,
      status: 'shipped',
      tracking: 'DTDC123456789',
      tracking_url: 'https://tracking.dtdc.com/123456789'
    }]
  },
  {
    name: 'sendCartAbandonmentEmail',
    description: 'Cart Abandonment Email',
    function: sendCartAbandonmentEmail,
    params: [TEST_EMAIL, 'Rahul Seth', [
      { product: { title: 'Premium Face Serum', price: 1299 }, quantity: 1 },
      { product: { title: 'Moisturizing Cream', price: 899 }, quantity: 2 }
    ]]
  },
  {
    name: 'sendPasswordResetEmail',
    description: 'Password Reset Email',
    function: sendPasswordResetEmail,
    params: [TEST_EMAIL, 'Rahul Seth', 'https://thenefol.com/#/user/reset-password?token=abc123xyz']
  },
  {
    name: 'sendPasswordResetConfirmationEmail',
    description: 'Password Reset Confirmation Email',
    function: sendPasswordResetConfirmationEmail,
    params: [TEST_EMAIL]
  },
  {
    name: 'sendVerificationEmail',
    description: 'Email Verification OTP',
    function: sendVerificationEmail,
    params: [TEST_EMAIL, '123456']
  },
  {
    name: 'sendLoginAlertEmail',
    description: 'Login Alert Email (New Device/IP)',
    function: sendLoginAlertEmail,
    params: [TEST_EMAIL, '192.168.1.1', 'Chrome Browser on Windows']
  },
  {
    name: 'sendAccountSecurityAlertEmail',
    description: 'Account Security Alert Email',
    function: sendAccountSecurityAlertEmail,
    params: [TEST_EMAIL, 'Password changed']
  },
  {
    name: 'sendOrderShippedEmail',
    description: 'Order Shipped Email',
    function: sendOrderShippedEmail,
    params: [{
      order_number: 'NEFOL-2024-001',
      customer_name: 'Rahul Seth',
      customer_email: TEST_EMAIL,
      status: 'shipped',
      tracking: 'DTDC123456789'
    }]
  },
  {
    name: 'sendOrderDeliveredEmail',
    description: 'Order Delivered Email',
    function: sendOrderDeliveredEmail,
    params: [{
      order_number: 'NEFOL-2024-001',
      customer_name: 'Rahul Seth',
      customer_email: TEST_EMAIL,
      status: 'delivered'
    }]
  },
  {
    name: 'sendSubscriptionActivatedEmail',
    description: 'Subscription Activated Email',
    function: sendSubscriptionActivatedEmail,
    params: [TEST_EMAIL, { name: 'Premium Plan', price: 999, interval: 'month' }]
  },
  {
    name: 'sendSubscriptionReminderOrCancelledEmail',
    description: 'Subscription Reminder/Cancelled Email',
    function: sendSubscriptionReminderOrCancelledEmail,
    params: [TEST_EMAIL, { name: 'Premium Plan' }, 'expiring']
  }
]

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logHeader(message) {
  log(`\n${'='.repeat(60)}`, 'cyan')
  log(message, 'bright')
  log('='.repeat(60), 'cyan')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

async function testEmail(emailTest, index, totalTests) {
  logHeader(`Email ${index + 1}/${totalTests}: ${emailTest.name}`)
  logInfo(`Description: ${emailTest.description}`)
  logInfo(`Email: ${TEST_EMAIL}`)
  logInfo(`Parameters: ${emailTest.params.length} parameter(s)`)
  
  try {
    await emailTest.function(...emailTest.params)
    logSuccess(`Email sent successfully!`)
    return { success: true, name: emailTest.name }
  } catch (error) {
    logError(`Email send failed!`)
    logError(`Error: ${error.message}`)
    if (error.stack) {
      logError(`Stack: ${error.stack.split('\n')[0]}`)
    }
    return { success: false, name: emailTest.name, error: error.message }
  }
}

async function runAllTests() {
  logHeader('Email Templates Test Suite')
  logInfo(`Testing ${emailTests.length} email functions`)
  logInfo(`Test Email: ${TEST_EMAIL}`)
  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logInfo(`SMTP Host: smtp.hostinger.com`)
  logInfo(`SMTP User: ${process.env.EMAIL_USER || 'NOT SET'}`)
  logInfo(`SMTP Pass: ${process.env.EMAIL_PASS ? 'SET' : 'NOT SET'}`)
  logInfo(`Starting tests...\n`)
  
  const results = []
  
  // Test each email with a delay to avoid rate limiting
  for (let i = 0; i < emailTests.length; i++) {
    const emailTest = emailTests[i]
    const result = await testEmail(emailTest, i, emailTests.length)
    results.push(result)
    
    // Wait 1 second between requests to avoid rate limiting
    if (i < emailTests.length - 1) {
      logInfo('Waiting 1 second before next test...\n')
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // Summary
  logHeader('Test Summary')
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  logSuccess(`Successful: ${successful}/${emailTests.length}`)
  if (failed > 0) {
    logError(`Failed: ${failed}/${emailTests.length}`)
  }
  
  log('\nDetailed Results:', 'bright')
  results.forEach((result, index) => {
    if (result.success) {
      logSuccess(`${index + 1}. ${result.name} - ✅ Success`)
    } else {
      logError(`${index + 1}. ${result.name} - ❌ Failed`)
      if (result.error) {
        logError(`   Error: ${result.error}`)
      }
    }
  })
  
  log('\n' + '='.repeat(60), 'cyan')
  log('Testing completed!', 'bright')
  log('='.repeat(60) + '\n', 'cyan')
  
  return results
}

// Run tests
if (require.main === module) {
  runAllTests()
    .then(() => {
      process.exit(0)
    })
    .catch(error => {
      logError(`Fatal error: ${error.message}`)
      console.error(error)
      process.exit(1)
    })
}

module.exports = { runAllTests, emailTests, TEST_EMAIL }

