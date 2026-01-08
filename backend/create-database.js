/**
 * Create nefol database if it doesn't exist
 */

const { Pool } = require('pg')
require('dotenv').config()

async function createDatabase() {
  console.log('🔧 Creating database if needed...\n')
  
  // Connect to default postgres database first
  const adminPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '2015127a'
  })
  
  try {
    // Check if database exists
    const checkResult = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = 'nefol'"
    )
    
    if (checkResult.rows.length === 0) {
      console.log('📦 Database "nefol" does not exist. Creating...')
      await adminPool.query('CREATE DATABASE nefol')
      console.log('✅ Database "nefol" created successfully!\n')
    } else {
      console.log('✅ Database "nefol" already exists.\n')
    }
    
    // Now test connection to nefol database
    const nefolPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'nefol',
      user: 'postgres',
      password: '2015127a'
    })
    
    const testResult = await nefolPool.query('SELECT version(), current_database()')
    console.log('✅ Successfully connected to "nefol" database')
    console.log(`   Database: ${testResult.rows[0].current_database}`)
    console.log(`   Version: ${testResult.rows[0].version.split(',')[0]}\n`)
    
    await nefolPool.end()
    await adminPool.end()
    
    console.log('✅ Database setup complete!')
    return true
  } catch (err) {
    console.error('❌ Error:', err.message)
    await adminPool.end()
    return false
  }
}

createDatabase().then(success => {
  process.exit(success ? 0 : 1)
})


