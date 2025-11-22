/**
 * Test WhatsApp OTP Sending
 * 
 * This script tests sending an OTP via WhatsApp API
 * Usage: node test-whatsapp-otp.js <phone_number>
 * Example: node test-whatsapp-otp.js 919876543210
 */

require('dotenv').config()

const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

if (!accessToken || !phoneNumberId) {
  console.error('❌ WhatsApp credentials not configured')
  console.error('   Missing:', !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : '', !phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : '')
  process.exit(1)
}

const phone = process.argv[2]

if (!phone) {
  console.error('❌ Phone number required')
  console.log('Usage: node test-whatsapp-otp.js <phone_number>')
  console.log('Example: node test-whatsapp-otp.js 919876543210')
  process.exit(1)
}

// Normalize phone number
const normalizedPhone = phone.replace(/[\s+\-()]/g, '')

// Generate test OTP
const otp = Math.floor(100000 + Math.random() * 900000).toString()

console.log('🧪 Testing WhatsApp OTP Sending...\n')
console.log('📋 Configuration:')
console.log(`   Phone Number ID: ${phoneNumberId}`)
console.log(`   Access Token: ${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 4)}`)
console.log(`   Recipient: ${normalizedPhone}`)
console.log(`   OTP: ${otp}\n`)

// Send OTP message
const message = `Your NEFÖL verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nDo not share this code with anyone.`

const facebookUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`

console.log('📤 Sending request to WhatsApp API...')
console.log(`   URL: ${facebookUrl}`)
console.log(`   Method: POST\n`)

const requestBody = {
  messaging_product: 'whatsapp',
  to: normalizedPhone,
  type: 'text',
  text: {
    body: message
  }
}

console.log('📦 Request Body:')
console.log(JSON.stringify(requestBody, null, 2))
console.log('')

fetch(facebookUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestBody)
})
.then(async (response) => {
  const data = await response.json()
  
  console.log('📥 Response Status:', response.status, response.statusText)
  console.log('📥 Response Body:')
  console.log(JSON.stringify(data, null, 2))
  console.log('')
  
  if (response.ok) {
    console.log('✅ SUCCESS! OTP sent successfully')
    console.log(`   Message ID: ${data.messages?.[0]?.id || 'N/A'}`)
    console.log(`   OTP Code: ${otp}`)
    console.log('\n💡 If you received the message, your WhatsApp API is working correctly!')
  } else {
    console.log('❌ FAILED! OTP not sent')
    console.log('\n🔍 Error Details:')
    
    if (data.error) {
      console.log(`   Error Type: ${data.error.type || 'Unknown'}`)
      console.log(`   Error Code: ${data.error.code || 'N/A'}`)
      console.log(`   Error Message: ${data.error.message || 'N/A'}`)
      console.log(`   Error Subcode: ${data.error.error_subcode || 'N/A'}`)
      
      if (data.error.error_data) {
        console.log(`   Error Data: ${JSON.stringify(data.error.error_data, null, 2)}`)
      }
      
      // Common error solutions
      console.log('\n💡 Common Solutions:')
      
      if (data.error.code === 100) {
        console.log('   - Invalid phone number format. Use international format without + (e.g., 919876543210)')
      } else if (data.error.code === 190) {
        console.log('   - Access token expired. Generate a new token from Meta Developer Console')
      } else if (data.error.code === 131047) {
        console.log('   - Phone number not registered on WhatsApp. User needs to have WhatsApp installed')
      } else if (data.error.code === 131026) {
        console.log('   - Message template not approved. Use text messages or approved templates')
      } else if (data.error.code === 80007) {
        console.log('   - Rate limit exceeded. Wait a few minutes before retrying')
      } else if (data.error.error_subcode === 2494012) {
        console.log('   - Phone number not in allowed list (for test numbers)')
        console.log('   - Add the number to your Meta App\'s test numbers list')
      }
    }
  }
})
.catch((error) => {
  console.error('❌ Network Error:', error.message)
  console.error('   Check your internet connection and try again')
})

