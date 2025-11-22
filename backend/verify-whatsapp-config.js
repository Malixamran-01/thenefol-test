/**
 * WhatsApp Configuration Verification Script
 * 
 * This script checks if WhatsApp environment variables are properly configured.
 * Run this with: node verify-whatsapp-config.js
 */

require('dotenv').config()

console.log('🔍 Checking WhatsApp Configuration...\n')

// Check environment variables
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

let allGood = true

// Check WHATSAPP_ACCESS_TOKEN
if (!accessToken) {
  console.log('❌ WHATSAPP_ACCESS_TOKEN is not set')
  allGood = false
} else if (accessToken === 'your_whatsapp_access_token' || accessToken.includes('your_')) {
  console.log('⚠️  WHATSAPP_ACCESS_TOKEN appears to be a placeholder value')
  allGood = false
} else {
  // Mask the token for security (show first 10 and last 4 characters)
  const maskedToken = accessToken.length > 14 
    ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 4)}`
    : '***'
  console.log(`✅ WHATSAPP_ACCESS_TOKEN is set: ${maskedToken}`)
}

// Check WHATSAPP_PHONE_NUMBER_ID
if (!phoneNumberId) {
  console.log('❌ WHATSAPP_PHONE_NUMBER_ID is not set')
  allGood = false
} else if (phoneNumberId === 'your_whatsapp_phone_number_id' || phoneNumberId.includes('your_')) {
  console.log('⚠️  WHATSAPP_PHONE_NUMBER_ID appears to be a placeholder value')
  allGood = false
} else {
  console.log(`✅ WHATSAPP_PHONE_NUMBER_ID is set: ${phoneNumberId}`)
}

console.log('\n' + '='.repeat(50))

if (allGood) {
  console.log('✅ All WhatsApp environment variables are configured correctly!')
  console.log('\n📝 Next steps:')
  console.log('   1. Make sure your backend server is restarted after adding these variables')
  console.log('   2. Test the WhatsApp login/signup flow in your frontend')
  console.log('   3. Check backend logs for any WhatsApp API errors')
} else {
  console.log('❌ WhatsApp configuration is incomplete')
  console.log('\n📝 To fix:')
  console.log('   1. Open backend/.env file')
  console.log('   2. Add or update these lines:')
  console.log('      WHATSAPP_ACCESS_TOKEN=your_actual_token_here')
  console.log('      WHATSAPP_PHONE_NUMBER_ID=your_actual_phone_number_id_here')
  console.log('   3. Save the file and restart your backend server')
  console.log('\n💡 Get your credentials from:')
  console.log('   - Meta for Developers: https://developers.facebook.com/')
  console.log('   - Go to your app → WhatsApp → API Setup')
}

console.log('\n' + '='.repeat(50))

// Test API connection (optional)
if (allGood && process.argv.includes('--test')) {
  console.log('\n🧪 Testing WhatsApp API connection...')
  
  const testPhone = process.argv.find(arg => arg.startsWith('--phone='))?.split('=')[1]
  
  if (!testPhone) {
    console.log('⚠️  To test API connection, provide a phone number:')
    console.log('   node verify-whatsapp-config.js --test --phone=919876543210')
    return
  }
  
  const normalizedPhone = testPhone.replace(/[\s+\-()]/g, '')
  const facebookUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`
  
  fetch(facebookUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'text',
      text: {
        body: 'Test message from WhatsApp verification script'
      }
    })
  })
  .then(async (response) => {
    const data = await response.json()
    if (response.ok) {
      console.log('✅ WhatsApp API connection successful!')
      console.log('   Message ID:', data.messages?.[0]?.id || 'N/A')
    } else {
      console.log('❌ WhatsApp API connection failed')
      console.log('   Error:', JSON.stringify(data, null, 2))
    }
  })
  .catch((error) => {
    console.log('❌ Failed to connect to WhatsApp API')
    console.log('   Error:', error.message)
  })
}

