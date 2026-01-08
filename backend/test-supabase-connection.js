/**
 * Test Supabase database connection
 * Uses the connection string from .env
 */

require('dotenv').config()
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error('❌ DATABASE_URL not found in .env file')
  process.exit(1)
}

console.log('🔍 Testing Supabase Database Connection\n')
console.log('Connection String:', connectionString.replace(/:[^:@]+@/, ':****@'))
console.log('')

// Check if Supabase connection
const isSupabase = connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com')

const poolConfig = isSupabase 
  ? { 
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  : { connectionString }

const pool = new Pool(poolConfig)

async function testConnection() {
  try {
    console.log('📡 Connecting to database...')
    const result = await pool.query('SELECT version(), current_database(), current_user')
    
    console.log('✅ Connection successful!')
    console.log(`   Database: ${result.rows[0].current_database}`)
    console.log(`   User: ${result.rows[0].current_user}`)
    console.log(`   Version: ${result.rows[0].version.split(',')[0]}\n`)
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    if (tablesResult.rows.length > 0) {
      console.log(`✅ Found ${tablesResult.rows.length} tables in database:`)
      tablesResult.rows.slice(0, 10).forEach(row => {
        console.log(`   - ${row.table_name}`)
      })
      if (tablesResult.rows.length > 10) {
        console.log(`   ... and ${tablesResult.rows.length - 10} more`)
      }
    } else {
      console.log('⚠️  No tables found. Run migrations: node migrate.js')
    }
    
    console.log('\n✅ Database connection is working!')
    await pool.end()
    return true
    
  } catch (err) {
    console.error('❌ Connection failed:', err.message)
    
    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS resolution failed')
      console.log('   - Check if Supabase project is active')
      console.log('   - Verify connection string in .env')
    } else if (err.message.includes('password authentication')) {
      console.log('\n💡 Authentication failed')
      console.log('   - Check password in connection string')
    } else if (err.message.includes('SSL')) {
      console.log('\n💡 SSL error')
      console.log('   - Make sure SSL is enabled for Supabase')
    }
    
    await pool.end()
    return false
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1)
})

