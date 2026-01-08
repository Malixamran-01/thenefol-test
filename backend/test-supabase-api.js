/**
 * Test Supabase REST API connection
 * Using the API credentials from Supabase dashboard
 */

const SUPABASE_URL = 'https://hlfycrtaeaexydwaevrb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_NN3zRR3reype439LZjMybA_vqAQ6RAO'

async function testSupabaseAPI() {
  console.log('🔍 Testing Supabase REST API Connection\n')
  console.log(`Project URL: ${SUPABASE_URL}`)
  console.log(`API Key: ${SUPABASE_KEY.substring(0, 20)}...\n`)

  try {
    // Test API health/status
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })

    if (response.ok) {
      console.log('✅ Supabase REST API is accessible!')
      console.log(`   Status: ${response.status}`)
      console.log(`   Project is active and responding\n`)
      
      // Try to query a table (this will fail if no tables exist, but confirms API works)
      try {
        const tablesResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Accept': 'application/json'
          }
        })
        console.log('✅ API endpoint is working')
      } catch (err) {
        console.log('ℹ️  API is accessible (tables may not exist yet)')
      }
      
      return true
    } else {
      console.log(`⚠️  API responded with status: ${response.status}`)
      return false
    }
  } catch (err) {
    console.error('❌ API connection failed:', err.message)
    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS resolution failed')
      console.log('   This means the project might still be paused')
      console.log('   OR the hostname format is different for REST API')
    }
    return false
  }
}

// Also test database connection
async function testDatabaseConnection() {
  console.log('\n🔍 Testing Direct Database Connection\n')
  
  const { Pool } = require('pg')
  const connectionString = 'postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres'
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  })
  
  try {
    const result = await pool.query('SELECT version(), current_database()')
    console.log('✅ Direct database connection successful!')
    console.log(`   Database: ${result.rows[0].current_database}`)
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}\n`)
    await pool.end()
    return true
  } catch (err) {
    console.error('❌ Database connection failed:', err.message)
    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 Project might be paused - check Supabase dashboard')
    }
    await pool.end()
    return false
  }
}

async function runTests() {
  console.log('🧪 Testing Supabase Connections\n')
  console.log('='.repeat(50) + '\n')
  
  const apiWorks = await testSupabaseAPI()
  const dbWorks = await testDatabaseConnection()
  
  console.log('\n' + '='.repeat(50))
  console.log('📊 Test Results:')
  console.log(`   REST API: ${apiWorks ? '✅ Working' : '❌ Failed'}`)
  console.log(`   Database: ${dbWorks ? '✅ Working' : '❌ Failed'}\n`)
  
  if (apiWorks && !dbWorks) {
    console.log('💡 REST API works but direct DB connection fails')
    console.log('   This suggests the project is active but direct DB access might be restricted')
    console.log('   Consider using Supabase CLI or REST API instead\n')
  } else if (!apiWorks && !dbWorks) {
    console.log('💡 Both connections failed')
    console.log('   Project might be paused - check Supabase dashboard\n')
  } else if (apiWorks && dbWorks) {
    console.log('🎉 Both connections work! You can proceed with migrations\n')
  }
}

runTests().catch(console.error)

