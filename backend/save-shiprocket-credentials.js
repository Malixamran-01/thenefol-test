// Script to save Shiprocket credentials to database
const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

async function saveCredentials() {
  const email = 'divyantechnologies@gmail.com'
  const password = 'Py3I8m@Yr0&3gr&a'
  
  try {
    console.log('Connecting to database...')
    
    // Deactivate old configs
    await pool.query('UPDATE shiprocket_config SET is_active = false WHERE is_active = true')
    console.log('Deactivated old Shiprocket configs')
    
    // Insert new config
    const { rows } = await pool.query(
      `INSERT INTO shiprocket_config (api_key, api_secret, is_active, created_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW())
       RETURNING id, is_active, created_at`,
      [email, password]
    )
    
    console.log('✓ Shiprocket credentials saved successfully!')
    console.log('Config ID:', rows[0].id)
    console.log('Active:', rows[0].is_active)
    console.log('Created at:', rows[0].created_at)
    
    // Test authentication
    console.log('\nTesting authentication...')
    const response = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✓ Authentication successful!')
      console.log('Token received:', data.token ? 'Yes' : 'No')
      if (data.token) {
        console.log('Token preview:', data.token.substring(0, 20) + '...')
      }
    } else {
      const error = await response.json()
      console.error('✗ Authentication failed:', error)
    }
    
  } catch (err) {
    console.error('Error:', err.message)
    console.error(err)
  } finally {
    await pool.end()
  }
}

saveCredentials()

