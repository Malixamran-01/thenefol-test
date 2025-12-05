/**
 * Test Script for All WhatsApp Templates
 * Tests all 12 WhatsApp templates with real phone number
 * 
 * Usage: node test-all-whatsapp-templates.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })
const { sendWhatsAppTemplate } = require('./dist/utils/whatsappTemplateHelper')

const TEST_PHONE = '918081013175' // Real phone number for testing

// All 12 WhatsApp templates with their required variables
const templates = [
  {
    name: 'nefol_verify_code',
    description: 'OTP Verification Code',
    variables: [
      { type: 'text', text: '123456' } // OTP code
    ],
    language: 'en'
  },
  {
    name: 'nefol_login_otp',
    description: 'Login OTP Verification Code',
    variables: [
      { type: 'text', text: '123456' } // OTP code
    ],
    language: 'en'
  },
  {
    name: 'nefol_reset_password',
    description: 'Password Reset Code',
    variables: [
      { type: 'text', text: 'RESET456' } // Reset code
    ],
    language: 'en'
  },
  {
    name: 'nefol_signup_success',
    description: 'Signup Success Notification',
    variables: [
      { type: 'text', text: 'Rahul' } // User name
    ],
    language: 'en'
  },
  {
    name: 'nefol_login_alert',
    description: 'Login Alert (New Device/IP)',
    variables: [
      { type: 'text', text: 'Chrome Browser' }, // Device
      { type: 'text', text: '192.168.1.1' } // IP Address
    ],
    language: 'en'
  },
  {
    name: 'nefol_cart_recover',
    description: 'Cart Recovery Message',
    variables: [
      { type: 'text', text: 'Rahul' }, // User name
      { type: 'text', text: 'https://thenefol.com/cart' } // Cart URL
    ],
    language: 'en'
  },
  {
    name: 'nefol_order_shipped',
    description: 'Order Shipped Notification',
    variables: [
      { type: 'text', text: 'Rahul' }, // User name
      { type: 'text', text: 'NEFOL-2024-001' }, // Order number
      { type: 'text', text: 'DTDC123456789' } // Tracking number
    ],
    language: 'en'
  },
  {
    name: 'nefol_order_delivered',
    description: 'Order Delivered Notification',
    variables: [
      { type: 'text', text: 'Rahul' }, // User name
      { type: 'text', text: 'NEFOL-2024-001' } // Order number
    ],
    language: 'en'
  },
  {
    name: 'nefol_refund_1',
    description: 'Refund Notification',
    variables: [
      { type: 'text', text: 'Rahul' }, // User name ({{1}})
      { type: 'text', text: 'NEFOL-2024-001' }, // Order ID ({{2}})
      { type: 'text', text: '₹1,299' } // Refund amount ({{3}})
    ],
    language: 'en'
  },
  {
    name: 'nefol_cod_verify',
    description: 'COD Verification Request',
    variables: [
      { type: 'text', text: 'Rahul' }, // User name
      { type: 'text', text: 'NEFOL-2024-001' } // Order number
    ],
    language: 'en'
  },
  {
    name: 'nefol_greet_1',
    description: 'Greeting Message',
    variables: [
      { type: 'text', text: 'Rahul' } // User name
    ],
    language: 'en'
  },
  {
    name: 'nefol_welcome_1',
    description: 'Welcome Message',
    variables: [
      { type: 'text', text: 'Rahul' } // User name
    ],
    language: 'en'
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

async function testTemplate(template, index, totalTemplates) {
  logHeader(`Template ${index + 1}/${totalTemplates}: ${template.name}`)
  logInfo(`Description: ${template.description}`)
  logInfo(`Phone: ${TEST_PHONE}`)
  logInfo(`Variables: ${JSON.stringify(template.variables.map(v => v.text))}`)
  
  try {
    const result = await sendWhatsAppTemplate(
      TEST_PHONE,
      template.name,
      template.variables,
      template.language
    )
    
    if (result.ok) {
      logSuccess(`Template sent successfully!`)
      logInfo(`Message ID: ${result.providerId || 'N/A'}`)
      return { success: true, template: template.name, messageId: result.providerId }
    } else {
      logError(`Template send failed!`)
      logError(`Error: ${result.error?.message || JSON.stringify(result.error)}`)
      if (result.error?.code) {
        logError(`Error Code: ${result.error.code}`)
      }
      if (result.error?.error_data) {
        logError(`Details: ${JSON.stringify(result.error.error_data)}`)
      }
      return { success: false, template: template.name, error: result.error }
    }
  } catch (error) {
    logError(`Exception occurred: ${error.message}`)
    return { success: false, template: template.name, error: { message: error.message } }
  }
}

async function runAllTests() {
  logHeader('WhatsApp Templates Test Suite')
  logInfo(`Testing ${templates.length} templates`)
  // Update count in template loop messages
  logInfo(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logInfo(`Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WA_NUMBER_ID || 'NOT SET'}`)
  logInfo(`Access Token: ${process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_ACCESS_TOKEN ? 'SET' : 'NOT SET'}`)
  logInfo(`Test Phone Number: ${TEST_PHONE}`)
  logInfo(`Starting tests...\n`)
  
  const results = []
  
  // Test each template with a delay to avoid rate limiting
  for (let i = 0; i < templates.length; i++) {
    const template = templates[i]
    const result = await testTemplate(template, i, templates.length)
    results.push(result)
    
    // Wait 2 seconds between requests to avoid rate limiting
    if (i < templates.length - 1) {
      logInfo('Waiting 2 seconds before next test...\n')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }
  
  // Summary
  logHeader('Test Summary')
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  logSuccess(`Successful: ${successful}/${templates.length}`)
  if (failed > 0) {
    logError(`Failed: ${failed}/${templates.length}`)
  }
  
  log('\nDetailed Results:', 'bright')
  results.forEach((result, index) => {
    if (result.success) {
      logSuccess(`${index + 1}. ${result.template} - ✅ Success (ID: ${result.messageId || 'N/A'})`)
    } else {
      logError(`${index + 1}. ${result.template} - ❌ Failed`)
      if (result.error?.message) {
        logError(`   Error: ${result.error.message}`)
      }
      if (result.error?.code) {
        logError(`   Code: ${result.error.code}`)
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

module.exports = { runAllTests, templates, TEST_PHONE }

