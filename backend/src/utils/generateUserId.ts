/**
 * Generate a unique user ID for new users
 * Format: NEFOL-XXXXXX (where X is alphanumeric)
 * Example: NEFOL-A1B2C3, NEFOL-9X7K2M
 */

import { Pool } from 'pg'
import crypto from 'crypto'

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ID_LENGTH = 6
const PREFIX = 'NEFOL'

/**
 * Generate a random alphanumeric string of given length
 */
function generateRandomString(length: number): string {
  let result = ''
  const bytes = crypto.randomBytes(length)
  
  for (let i = 0; i < length; i++) {
    result += CHARSET[bytes[i] % CHARSET.length]
  }
  
  return result
}

/**
 * Generate a unique user ID
 * @param pool - PostgreSQL pool instance
 * @returns Promise<string> - Unique user ID in format NEFOL-XXXXXX
 */
export async function generateUniqueUserId(pool: Pool): Promise<string> {
  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    // Generate random ID
    const randomPart = generateRandomString(ID_LENGTH)
    const userId = `${PREFIX}-${randomPart}`
    
    // Check if this ID already exists
    try {
      const result = await pool.query(
        'SELECT id FROM users WHERE unique_user_id = $1',
        [userId]
      )
      
      if (result.rows.length === 0) {
        // ID is unique, return it
        return userId
      }
    } catch (error) {
      console.error('Error checking user ID uniqueness:', error)
      throw error
    }
    
    attempts++
  }
  
  throw new Error('Failed to generate unique user ID after maximum attempts')
}

/**
 * Backfill unique user IDs for existing users without one
 * @param pool - PostgreSQL pool instance
 * @returns Promise<number> - Number of users updated
 */
export async function backfillExistingUserIds(pool: Pool): Promise<number> {
  try {
    // Get all users without a unique_user_id
    const usersWithoutId = await pool.query(
      'SELECT id FROM users WHERE unique_user_id IS NULL'
    )
    
    let updatedCount = 0
    
    for (const user of usersWithoutId.rows) {
      const uniqueUserId = await generateUniqueUserId(pool)
      
      await pool.query(
        'UPDATE users SET unique_user_id = $1 WHERE id = $2',
        [uniqueUserId, user.id]
      )
      
      updatedCount++
    }
    
    console.log(`✅ Backfilled ${updatedCount} existing users with unique user IDs`)
    return updatedCount
  } catch (error) {
    console.error('❌ Error backfilling user IDs:', error)
    throw error
  }
}
