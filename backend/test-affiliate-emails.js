/**
 * Test Script for Affiliate Email Automation
 * 
 * This script tests both affiliate email functions:
 * 1. Application Submission Confirmation Email
 * 2. Approval Email with Verification Code
 * 
 * Usage: node test-affiliate-emails.js
 */

const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

// Import email functions
const {
  sendAffiliateApplicationSubmittedEmail,
  sendAffiliateCodeEmail
} = require('./dist/services/emailService')

const TEST_EMAIL = 'rahulseth3988@gmail.com' // Real email for testing
const TEST_NAME = 'Rahul Seth'
const TEST_VERIFICATION_CODE = 'AFF1234567890123456' // 20 characters

async function testAffiliateEmails() {
  console.log('🧪 Testing Affiliate Email Automation')
  console.log('=' .repeat(70))
  console.log(`📧 Test Email: ${TEST_EMAIL}`)
  console.log(`👤 Test Name: ${TEST_NAME}`)
  console.log(`🔑 Test Verification Code: ${TEST_VERIFICATION_CODE}`)
  console.log('=' .repeat(70))
  console.log('')

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: []
  }

  // Test 1: Application Submission Email
  console.log('📧 Test 1/2: Application Submission Confirmation Email')
  console.log('-'.repeat(70))
  results.total++
  try {
    await sendAffiliateApplicationSubmittedEmail(TEST_EMAIL, TEST_NAME)
    console.log('✅ PASSED: Application submission email sent successfully!')
    console.log(`   → Sent to: ${TEST_EMAIL}`)
    console.log(`   → Subject: "Your Affiliate Application Has Been Received"`)
    results.passed++
  } catch (error) {
    console.error('❌ FAILED: Application submission email error')
    console.error(`   Error: ${error.message}`)
    results.failed++
    results.errors.push({
      test: 'Application Submission Email',
      error: error.message
    })
  }

  console.log('')
  console.log('⏳ Waiting 3 seconds before next test...\n')
  await new Promise(resolve => setTimeout(resolve, 3000))

  // Test 2: Approval Email with Verification Code
  console.log('📧 Test 2/2: Approval Email with Verification Code')
  console.log('-'.repeat(70))
  results.total++
  try {
    await sendAffiliateCodeEmail(TEST_EMAIL, TEST_NAME, TEST_VERIFICATION_CODE)
    console.log('✅ PASSED: Approval email with verification code sent successfully!')
    console.log(`   → Sent to: ${TEST_EMAIL}`)
    console.log(`   → Subject: "Your Affiliate Application Has Been Approved - Verification Code"`)
    console.log(`   → Verification Code: ${TEST_VERIFICATION_CODE}`)
    results.passed++
  } catch (error) {
    console.error('❌ FAILED: Approval email error')
    console.error(`   Error: ${error.message}`)
    results.failed++
    results.errors.push({
      test: 'Approval Email with Verification Code',
      error: error.message
    })
  }

  // Summary
  console.log('')
  console.log('=' .repeat(70))
  console.log('📊 Test Summary')
  console.log('=' .repeat(70))
  console.log(`Total Tests: ${results.total}`)
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log('')

  if (results.failed > 0) {
    console.log('❌ Errors:')
    results.errors.forEach((err, index) => {
      console.log(`   ${index + 1}. ${err.test}: ${err.error}`)
    })
    console.log('')
  }

  console.log('📬 Next Steps:')
  console.log(`   1. Check your inbox at: ${TEST_EMAIL}`)
  console.log('   2. Look for these emails:')
  console.log('      - "Your Affiliate Application Has Been Received"')
  console.log('      - "Your Affiliate Application Has Been Approved - Verification Code"')
  console.log('   3. Check spam/junk folder if emails are not in inbox')
  console.log('')
  console.log('💡 Troubleshooting:')
  console.log('   - Verify EMAIL_USER and EMAIL_PASS in .env file')
  console.log('   - Check SMTP server configuration (smtp.hostinger.com:465)')
  console.log('   - Ensure email service is properly configured')
  console.log('')

  return results
}

// Run the tests
testAffiliateEmails()
  .then((results) => {
    if (results.failed === 0) {
      console.log('🎉 All affiliate email tests passed!')
      process.exit(0)
    } else {
      console.log('⚠️ Some tests failed. Please check the errors above.')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error)
    console.error('')
    console.error('Troubleshooting:')
    console.error('1. Make sure you have built the project: npm run build')
    console.error('2. Check that dist/services/emailService.js exists')
    console.error('3. Verify environment variables are set in .env file')
    process.exit(1)
  })

