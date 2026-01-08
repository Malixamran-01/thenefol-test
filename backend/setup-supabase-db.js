/**
 * Setup Supabase test database
 * Creates nefol database and runs migrations
 */

const { Pool } = require('pg')
require('dotenv').config()

// Supabase connection details
// Updated from Supabase Dashboard > Settings > Database
const SUPABASE_HOST = 'db.hlfycrtaeaexydwaevrb.supabase.co'
const SUPABASE_PORT = 5432
const SUPABASE_USER = 'postgres'
const SUPABASE_PASSWORD = 'UvI09HmgBBon89zk'
const SUPABASE_DB = 'postgres' // Default database (from Supabase)
const TARGET_DB = 'nefol' // Database we want to create

async function setupDatabase() {
  console.log('🔧 Setting up Supabase Test Database\n')
  
  // Connect to default postgres database first
  // Supabase requires SSL connection
  const adminPool = new Pool({
    host: SUPABASE_HOST,
    port: SUPABASE_PORT,
    user: SUPABASE_USER,
    password: SUPABASE_PASSWORD,
    database: SUPABASE_DB,
    ssl: {
      rejectUnauthorized: false // Required for Supabase
    },
    connectionTimeoutMillis: 10000 // 10 second timeout
  })
  
  try {
    // Test connection
    console.log('📡 Testing connection to Supabase...')
    const testResult = await adminPool.query('SELECT version(), current_database()')
    console.log('✅ Connected to Supabase!')
    console.log(`   Database: ${testResult.rows[0].current_database}`)
    console.log(`   Version: ${testResult.rows[0].version.split(',')[0]}\n`)
    
    // Check if nefol database exists
    console.log(`📦 Checking if '${TARGET_DB}' database exists...`)
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TARGET_DB]
    )
    
    if (dbCheck.rows.length === 0) {
      console.log(`   Database '${TARGET_DB}' does not exist. Creating...`)
      await adminPool.query(`CREATE DATABASE ${TARGET_DB}`)
      console.log(`✅ Database '${TARGET_DB}' created successfully!\n`)
    } else {
      console.log(`✅ Database '${TARGET_DB}' already exists\n`)
    }
    
    await adminPool.end()
    
    // Now connect to nefol database
    console.log(`📡 Connecting to '${TARGET_DB}' database...`)
    const nefolPool = new Pool({
      host: SUPABASE_HOST,
      port: SUPABASE_PORT,
      user: SUPABASE_USER,
      password: SUPABASE_PASSWORD,
      database: TARGET_DB,
      ssl: { rejectUnauthorized: false }
    })
    
    const nefolResult = await nefolPool.query('SELECT current_database()')
    console.log(`✅ Connected to '${nefolResult.rows[0].current_database}' database\n`)
    
    // Generate connection string
    const connectionString = `postgresql://${SUPABASE_USER}:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:${SUPABASE_PORT}/${TARGET_DB}`
    
    console.log('📝 Connection String for Deployment:')
    console.log(`DATABASE_URL=${connectionString.replace(SUPABASE_PASSWORD, '[PASSWORD]')}\n`)
    
    console.log('✅ Database setup complete!')
    console.log('\nNext steps:')
    console.log('1. Use the connection string above in your deployment platform')
    console.log('2. Run migrations: DATABASE_URL="..." node migrate.js')
    console.log('3. Never commit the password to Git!\n')
    
    await nefolPool.end()
    return connectionString
  } catch (err) {
    console.error('❌ Error:', err.message)
    if (err.message.includes('ENOTFOUND')) {
      console.log('\n💡 Network error. Check:')
      console.log('   - Internet connection')
      console.log('   - Supabase project is active')
      console.log('   - Hostname is correct')
    } else if (err.message.includes('password authentication')) {
      console.log('\n💡 Authentication failed. Check:')
      console.log('   - Password is correct')
      console.log('   - User has permissions')
    }
    await adminPool.end()
    return null
  }
}

setupDatabase().then(connString => {
  if (connString) {
    // Save connection string to a file (without password in readable form)
    const fs = require('fs')
    const safeString = connString.replace(SUPABASE_PASSWORD, '[PASSWORD]')
    fs.writeFileSync('supabase-connection-string.txt', safeString)
    console.log('💾 Connection string saved to: supabase-connection-string.txt')
  }
  process.exit(connString ? 0 : 1)
})

