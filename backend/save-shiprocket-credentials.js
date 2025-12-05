/**
 * Script to save Shiprocket credentials to database
 * 
 * This script reads Shiprocket credentials from environment variables or command line arguments
 * and saves them to the database.
 * 
 * Usage:
 *   1. Set environment variables in .env file:
 *      SHIPROCKET_EMAIL=your_email@example.com
 *      SHIPROCKET_PASSWORD=your_password
 *   
 *   2. Run the script:
 *      node save-shiprocket-credentials.js
 *   
 *   3. Or pass credentials as command line arguments:
 *      node save-shiprocket-credentials.js your_email@example.com your_password
 */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function saveCredentials() {
  // Get credentials from command line arguments or environment variables
  const email = process.argv[2] || process.env.SHIPROCKET_EMAIL || 'divyantechnologies@gmail.com'
  const password = process.argv[3] || process.env.SHIPROCKET_PASSWORD || 'Py3I8m@Yr0&3gr&a'
  
  // Validate credentials
  if (!email || !password) {
    console.error('❌ Error: Shiprocket credentials are required!')
    console.error('')
    console.error('Please provide credentials in one of these ways:')
    console.error('  1. Set environment variables in .env file:')
    console.error('     SHIPROCKET_EMAIL=your_email@example.com')
    console.error('     SHIPROCKET_PASSWORD=your_password')
    console.error('')
    console.error('  2. Pass as command line arguments:')
    console.error('     node save-shiprocket-credentials.js email@example.com password')
    console.error('')
    process.exit(1)
  }
  
  try {
    console.log('🚀 Shiprocket Credentials Setup Script')
    console.log('=' .repeat(60))
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Password: ${password.substring(0, 3)}${'*'.repeat(password.length - 3)}`)
    console.log('=' .repeat(60))
    console.log('')
    console.log('Connecting to database...')
    
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shiprocket_config'
      )
    `)
    
    if (!tableCheck.rows[0]?.exists) {
      console.error('❌ Error: shiprocket_config table does not exist!')
      console.error('   Please run database migrations first.')
      process.exit(1)
    }
    
    // Deactivate old configs
    await pool.query('UPDATE shiprocket_config SET is_active = false WHERE is_active = true')
    console.log('✓ Deactivated old Shiprocket configs')
    
    // Insert new config
    const { rows } = await pool.query(
      `INSERT INTO shiprocket_config (api_key, api_secret, is_active, created_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW())
       RETURNING id, is_active, created_at`,
      [email, password]
    )
    
    console.log('✓ Shiprocket credentials saved successfully!')
    console.log(`  Config ID: ${rows[0].id}`)
    console.log(`  Active: ${rows[0].is_active}`)
    console.log(`  Created at: ${rows[0].created_at}`)
    
    // Test authentication
    console.log('')
    console.log('🔐 Testing authentication with Shiprocket API...')
    const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✓ Authentication successful!')
      console.log(`  Token received: ${data.token ? 'Yes' : 'No'}`)
      if (data.token) {
        console.log(`  Token preview: ${data.token.substring(0, 20)}...`)
      }
      console.log('')
      console.log('✅ Shiprocket credentials configured successfully!')
      console.log('   Your credentials are now active in the database.')
    } else {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      console.error('❌ Authentication failed!')
      console.error(`  Status: ${response.status}`)
      console.error(`  Error: ${JSON.stringify(error, null, 2)}`)
      console.error('')
      console.error('⚠️  Warning: Credentials were saved to database but authentication test failed.')
      console.error('   Please verify your credentials are correct.')
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message)
    if (err.code === '42P01') {
      console.error('   Database table "shiprocket_config" does not exist. Please run migrations.')
    } else {
      console.error(err)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

saveCredentials()

