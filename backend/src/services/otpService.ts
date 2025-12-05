/**
 * OTP Service - Generate, Store, and Verify OTPs
 * 
 * Uses PostgreSQL to store hashed OTPs with expiry and attempt tracking.
 * Supports both phone and email OTPs.
 * 
 * @module services/otpService
 */

import { Pool } from 'pg'
import crypto from 'crypto'
import { normalizePhoneNumber } from '../utils/whatsappTemplateHelper'

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6')
const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '300')
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5')

/**
 * Generate a numeric OTP
 * 
 * @param {number} length - OTP length (default: 6)
 * @returns {string} Numeric OTP
 */
export function generateOTP(length: number = OTP_LENGTH): string {
  const min = Math.pow(10, length - 1)
  const max = Math.pow(10, length) - 1
  return Math.floor(min + Math.random() * (max - min + 1)).toString()
}

/**
 * Hash OTP using SHA256
 * 
 * @param {string} otp - Raw OTP
 * @returns {string} Hashed OTP (hex)
 */
export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

/**
 * Mask OTP for logging (show only last 2 digits)
 * 
 * @param {string} otp - Raw OTP
 * @returns {string} Masked OTP (e.g., "****56")
 */
export function maskOTP(otp: string): string {
  if (otp.length <= 2) return '**'
  return '*'.repeat(otp.length - 2) + otp.slice(-2)
}

/**
 * Ensure OTP table exists in database
 * 
 * @param {Pool} pool - Database pool
 */
async function ensureOTPTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id SERIAL PRIMARY KEY,
      phone_or_email TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      attempts INTEGER DEFAULT 0,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otps_phone_email ON otps(phone_or_email)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otps_expires ON otps(expires_at)
  `)
  
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_otps_used ON otps(used) WHERE used = FALSE
  `)
  
  // Delete expired OTPs periodically (cleanup)
  try {
    await pool.query('DELETE FROM otps WHERE expires_at < NOW() AND used = FALSE')
  } catch (err) {
    // Ignore cleanup errors
  }
}

/**
 * Generate and send OTP
 * 
 * @param {Pool} pool - Database pool
 * @param {string} phoneOrEmail - Phone number or email address
 * @param {Function} sendWhatsAppFn - Function to send WhatsApp OTP
 * @param {Function} sendEmailFn - Function to send Email OTP (fallback)
 * @returns {Promise<{ok: boolean, otp?: string, error?: any}>}
 */
export async function generateAndSendOtp(
  pool: Pool,
  phoneOrEmail: string,
  sendWhatsAppFn?: (phone: string, otp: string) => Promise<any>,
  sendEmailFn?: (email: string, otp: string) => Promise<any>
): Promise<{ ok: boolean; otp?: string; error?: any }> {
  try {
    await ensureOTPTable(pool)
    
    // Normalize phone/email
    const normalized = phoneOrEmail.toLowerCase().trim()
    const isPhone = /^\d{10,15}$/.test(normalized.replace(/[\s+\-()]/g, ''))
    // Use normalizePhoneNumber to ensure consistent format (adds country code if missing)
    const normalizedPhone = isPhone ? normalizePhoneNumber(normalized) : normalized
    
    // Generate OTP
    const otp = generateOTP(OTP_LENGTH)
    const otpHash = hashOTP(otp)
    const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000)
    
    // Delete existing unused OTPs for this phone/email
    await pool.query(
      'DELETE FROM otps WHERE phone_or_email = $1 AND used = FALSE',
      [normalizedPhone]
    )
    
    // Store hashed OTP
    await pool.query(
      `INSERT INTO otps (phone_or_email, otp_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [normalizedPhone, otpHash, expiresAt]
    )
    
    console.log(`✅ OTP generated for ${isPhone ? 'phone' : 'email'}: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}, OTP: ${maskOTP(otp)}`)
    console.log(`💾 OTP stored in DB: phone_or_email=${normalizedPhone}, hash_length=${otpHash.length}, expires_at=${expiresAt.toISOString()}`)
    
    // Send OTP
    let sent = false
    
    if (isPhone && sendWhatsAppFn) {
      try {
        const result = await sendWhatsAppFn(normalizedPhone, otp)
        if (result.ok || result.success) {
          sent = true
          console.log(`✅ OTP sent via WhatsApp to ${normalizedPhone}`)
        }
      } catch (err: any) {
        console.error('❌ Failed to send OTP via WhatsApp:', err.message)
      }
    }
    
    // Fallback to email if WhatsApp failed or if it's an email
    if (!sent && sendEmailFn) {
      try {
        await sendEmailFn(normalized, otp)
        sent = true
        console.log(`✅ OTP sent via Email to ${normalized.substring(0, 3) + '***'}`)
      } catch (err: any) {
        console.error('❌ Failed to send OTP via Email:', err.message)
      }
    }
    
    if (!sent) {
      return { ok: false, error: { message: 'Failed to send OTP via any method' } }
    }
    
    return { ok: true, otp: otp } // Return OTP for testing, but never log it
  } catch (error: any) {
    console.error('❌ Error generating OTP:', error)
    return { ok: false, error: { message: error.message } }
  }
}

/**
 * Verify OTP
 * 
 * @param {Pool} pool - Database pool
 * @param {string} phoneOrEmail - Phone number or email address
 * @param {string} rawOtp - Raw OTP from user
 * @returns {Promise<{ok: boolean, userId?: number, error?: any}>}
 */
export async function verifyOtp(
  pool: Pool,
  phoneOrEmail: string,
  rawOtp: string
): Promise<{ ok: boolean; userId?: number; error?: any }> {
  try {
    await ensureOTPTable(pool)
    
    // Normalize phone/email
    const normalized = phoneOrEmail.toLowerCase().trim()
    const isPhone = /^\d{10,15}$/.test(normalized.replace(/[\s+\-()]/g, ''))
    // Use normalizePhoneNumber to ensure consistent format (adds country code if missing)
    const normalizedPhone = isPhone ? normalizePhoneNumber(normalized) : normalized
    
    // Hash provided OTP (trim and ensure it's a string)
    const cleanOtp = String(rawOtp).trim()
    const providedHash = hashOTP(cleanOtp)
    
    console.log(`🔍 Verifying OTP for: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}, OTP length: ${cleanOtp.length}`)
    console.log(`🔍 Input phone/email: "${phoneOrEmail}" → Normalized: "${normalizedPhone}"`)
    
    // Find unused OTP record - also check for recent OTPs (within last 10 minutes) for debugging
    const result = await pool.query(
      `SELECT id, otp_hash, attempts, expires_at, created_at, phone_or_email
       FROM otps
       WHERE phone_or_email = $1 AND used = FALSE
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedPhone]
    )
    
    // Debug: Check if there are any OTPs for this phone (even if used)
    if (result.rows.length === 0) {
      const debugResult = await pool.query(
        `SELECT phone_or_email, used, created_at, expires_at
         FROM otps
         WHERE phone_or_email = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [normalizedPhone]
      )
      console.error(`❌ OTP not found for: ${normalizedPhone}`)
      console.error(`   Searching for unused OTP with phone_or_email: "${normalizedPhone}"`)
      if (debugResult.rows.length > 0) {
        console.error(`   Found ${debugResult.rows.length} OTP record(s) (may be used/expired):`)
        debugResult.rows.forEach((row: any, idx: number) => {
          console.error(`     ${idx + 1}. phone_or_email="${row.phone_or_email}", used=${row.used}, created=${row.created_at}, expires=${row.expires_at}`)
        })
      } else {
        console.error(`   No OTP records found at all for: "${normalizedPhone}"`)
        // Try to find similar phone numbers
        const similarResult = await pool.query(
          `SELECT DISTINCT phone_or_email, used, created_at
           FROM otps
           WHERE phone_or_email LIKE $1
           ORDER BY created_at DESC
           LIMIT 5`,
          [`%${normalizedPhone.slice(-4)}%`]
        )
        if (similarResult.rows.length > 0) {
          console.error(`   Found similar phone numbers in DB:`)
          similarResult.rows.forEach((row: any) => {
            console.error(`     - "${row.phone_or_email}" (used=${row.used}, created=${row.created_at})`)
          })
        }
      }
      return { ok: false, error: { message: 'OTP not found or already used' } }
    }
    
    const otpRecord = result.rows[0]
    
    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpRecord.id])
      console.error(`❌ OTP expired for: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}`)
      return { ok: false, error: { message: 'OTP has expired' } }
    }
    
    // Check attempts
    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpRecord.id])
      console.error(`❌ Max attempts exceeded for: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}`)
      return { ok: false, error: { message: 'Maximum attempts exceeded' } }
    }
    
    // Verify hash (constant-time comparison)
    const storedHash = otpRecord.otp_hash
    
    // Ensure both hashes are the same length before comparison
    if (providedHash.length !== storedHash.length) {
      console.error(`❌ Hash length mismatch: provided=${providedHash.length}, stored=${storedHash.length}`)
      await pool.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      )
      return { ok: false, error: { message: 'Invalid OTP format' } }
    }
    
    try {
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedHash, 'hex'),
        Buffer.from(storedHash, 'hex')
      )
      
      if (!isValid) {
        // Increment attempts
        await pool.query(
          'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
          [otpRecord.id]
        )
        console.error(`❌ Invalid OTP for: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}, attempts: ${otpRecord.attempts + 1}`)
        return { ok: false, error: { message: 'Invalid OTP' } }
      }
    } catch (compareError: any) {
      console.error(`❌ Hash comparison error: ${compareError.message}`)
      await pool.query(
        'UPDATE otps SET attempts = attempts + 1 WHERE id = $1',
        [otpRecord.id]
      )
      return { ok: false, error: { message: 'OTP verification failed' } }
    }
    
    // Mark as used
    await pool.query('UPDATE otps SET used = TRUE WHERE id = $1', [otpRecord.id])
    
    // Try to find user by phone or email
    let userId: number | undefined
    try {
      const userResult = await pool.query(
        'SELECT id FROM users WHERE phone = $1 OR email = $2 LIMIT 1',
        [normalizedPhone, normalized]
      )
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
      }
    } catch (userErr) {
      // User lookup failed, but OTP is valid
      console.warn('Could not find user for OTP verification:', userErr)
    }
    
    console.log(`✅ OTP verified for ${isPhone ? 'phone' : 'email'}: ${isPhone ? normalizedPhone : normalized.substring(0, 3) + '***'}`)
    
    return { ok: true, userId }
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error)
    return { ok: false, error: { message: error.message } }
  }
}

