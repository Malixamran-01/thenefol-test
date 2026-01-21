/**
 * Migration script to backfill unique_user_id for existing users
 * 
 * Run this script once to generate unique IDs for all existing users without one.
 * 
 * Usage: node backfill-user-ids.js
 */

require('dotenv').config()
const { Pool } = require('pg')

// Create PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
})

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ID_LENGTH = 6
const PREFIX = 'N'

/**
 * Generate a random alphanumeric string
 */
function generateRandomString(length) {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return result
}

/**
 * Generate a unique user ID
 */
async function generateUniqueUserId() {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const randomPart = generateRandomString(ID_LENGTH)
    const userId = `${PREFIX}-${randomPart}`
    
    // Check if this ID already exists
    const result = await pool.query(
      'SELECT id FROM users WHERE unique_user_id = $1',
      [userId]
    )
    
    if (result.rows.length === 0) {
      return userId
    }
    
    attempts++
  }
  
  throw new Error('Failed to generate unique user ID after maximum attempts')
}

/**
 * Main migration function
 */
async function backfillUserIds() {
  try {
    console.log('🚀 Starting user ID backfill migration...')
    
    // First, ensure the column exists
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS unique_user_id TEXT UNIQUE
    `)
    console.log('✅ Ensured unique_user_id column exists')
    
    // Get all users without a unique_user_id
    const usersResult = await pool.query(
      'SELECT id, name, email FROM users WHERE unique_user_id IS NULL ORDER BY id'
    )
    
    const totalUsers = usersResult.rows.length
    console.log(`📊 Found ${totalUsers} users without unique IDs`)
    
    if (totalUsers === 0) {
      console.log('✅ All users already have unique IDs!')
      return
    }
    
    let successCount = 0
    let errorCount = 0
    
    // Process each user
    for (let i = 0; i < usersResult.rows.length; i++) {
      const user = usersResult.rows[i]
      
      try {
        const uniqueUserId = await generateUniqueUserId()
        
        await pool.query(
          'UPDATE users SET unique_user_id = $1 WHERE id = $2',
          [uniqueUserId, user.id]
        )
        
        successCount++
        console.log(`✅ [${successCount}/${totalUsers}] Generated UID for user ${user.id} (${user.name}): ${uniqueUserId}`)
      } catch (err) {
        errorCount++
        console.error(`❌ Failed to generate UID for user ${user.id}:`, err.message)
      }
    }
    
    console.log('\n📊 Migration Summary:')
    console.log(`   Total users processed: ${totalUsers}`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log('\n✅ User ID backfill migration completed!')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Run migration
backfillUserIds().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
