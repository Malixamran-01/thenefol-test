// Test admin login API
const fetch = require('node-fetch');

const RAILWAY_BACKEND_URL = process.env.RAILWAY_BACKEND_URL || 'https://nefolbackend-production.up.railway.app';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@thenefol.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function testLogin() {
  console.log('🧪 Testing Admin Login API\n');
  console.log('Backend URL:', RAILWAY_BACKEND_URL);
  console.log('Email:', ADMIN_EMAIL);
  console.log('Password:', ADMIN_PASSWORD);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    const url = `${RAILWAY_BACKEND_URL}/api/staff/auth/login`;
    console.log('📡 Calling:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      })
    });
    
    const data = await response.json();
    
    console.log('\n📊 Response:');
    console.log('   Status:', response.status, response.statusText);
    
    if (response.ok) {
      console.log('   ✅ Login successful!');
      console.log('   User ID:', data.user?.id);
      console.log('   Email:', data.user?.email);
      console.log('   Name:', data.user?.name);
      console.log('   Role:', data.user?.role);
      console.log('   Token:', data.token ? '✅ Present' : '❌ Missing');
    } else {
      console.log('   ❌ Login failed!');
      console.log('   Error:', data.error || data.message || 'Unknown error');
    }
    
    console.log('\n📋 Full Response:');
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.error('   DNS lookup failed. Check if the backend URL is correct.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused. Backend might be down.');
    }
  }
}

testLogin();
