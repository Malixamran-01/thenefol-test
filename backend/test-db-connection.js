/**
 * Quick database connection test
 * Helps identify the correct database credentials
 */

const { Pool } = require('pg')
require('dotenv').config()

async function testConnection() {
  console.log('🔍 Testing PostgreSQL Connection...\n')
  
  // Try different connection options
  const connectionOptions = [
    {
      name: 'DATABASE_URL from .env',
      config: process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : null
    },
    {
      name: 'Default postgres user',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
      }
    },
    {
      name: 'postgres user with nefol database',
      config: {
        host: 'localhost',
        port: 5432,
        database: 'nefol',
        user: 'postgres',
        password: 'postgres'
      }
    },
    {
      name: 'Individual DB settings from .env',
      config: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'nefol',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      }
    }
  ]

  for (const option of connectionOptions) {
    if (!option.config) continue
    
    try {
      console.log(`Testing: ${option.name}...`)
      const pool = new Pool(option.config)
      const result = await pool.query('SELECT version(), current_database(), current_user')
      console.log(`✅ SUCCESS with ${option.name}`)
      console.log(`   Database: ${result.rows[0].current_database}`)
      console.log(`   User: ${result.rows[0].current_user}`)
      console.log(`   Version: ${result.rows[0].version.split(',')[0]}\n`)
      
      // Check if nefol database exists
      const dbCheck = await pool.query(
        "SELECT 1 FROM pg_database WHERE datname = 'nefol'"
      )
      if (dbCheck.rows.length === 0) {
        console.log('⚠️  Database "nefol" does not exist. Creating...')
        await pool.query('CREATE DATABASE nefol')
        console.log('✅ Database "nefol" created\n')
      }
      
      await pool.end()
      return option.config
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}\n`)
    }
  }
  
  console.log('❌ All connection attempts failed!')
  console.log('\n💡 Tips:')
  console.log('   1. Make sure PostgreSQL is running')
  console.log('   2. Check your .env file for correct credentials')
  console.log('   3. Try connecting with: psql -U postgres')
  console.log('   4. Create user: CREATE USER nofol_users WITH PASSWORD \'Anupnefoldb\';')
  console.log('   5. Grant access: GRANT ALL PRIVILEGES ON DATABASE nefol TO nofol_users;')
  
  return null
}

testConnection().then(config => {
  if (config) {
    console.log('✅ Use this configuration in your .env file:')
    if (config.connectionString) {
      console.log(`DATABASE_URL=${config.connectionString}`)
    } else {
      console.log(`DB_HOST=${config.host}`)
      console.log(`DB_PORT=${config.port}`)
      console.log(`DB_NAME=${config.database}`)
      console.log(`DB_USER=${config.user}`)
      console.log(`DB_PASSWORD=${config.password}`)
    }
  }
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})


