/**
 * Authentication Routes - Password Reset System
 * 
 * This module handles:
 * - Forgot password request
 * - Password reset with secure token
 * 
 * @module routes/auth
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from '../services/emailService'
import { WhatsAppService } from '../services/whatsappService'
import { generateAndSendOtp } from '../services/otpService'

const SALT_ROUNDS = 12 // Updated to 12 as per requirements
const TOKEN_BYTES = 32
const TOKEN_EXPIRY_MINUTES = 15

/**
 * Generate a secure random token for password reset
 * @returns {string} Raw token (32 bytes, hex encoded = 64 chars)
 */
function generateResetToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex')
}

/**
 * Hash a token using SHA256 for database storage
 * @param {string} token - Raw token
 * @returns {string} Hashed token
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Hash a password using bcrypt with saltRounds=12
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a bcrypt hash
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {string|null} Error message if invalid, null if valid
 */
function validatePasswordStrength(password: string): string | null {
  if (!password || password.length === 0) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  if (password.length > 128) {
    return 'Password must be less than 128 characters'
  }
  // Basic strength check - at least one letter and one number
  if (!/[a-zA-Z]/.test(password)) {
    return 'Password must contain at least one letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

/**
 * Request Password Reset - Supports both email and phone
 * 
 * POST /api/auth/request-reset
 * Body: { "email": "user@example.com" } or { "phone": "91XXXXXXXXXX" }
 * 
 * If phone: sends 6-digit OTP via WhatsApp using nefol_reset_password template
 * If email: sends reset link via email
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function forgotPassword(pool: Pool, req: Request, res: Response) {
  try {
    const { email, phone } = req.body

    console.log('🔐 Password reset request:', { 
      email: email ? email.substring(0, 3) + '***' : undefined,
      phone: phone ? '***' : undefined 
    })

    if (!email && !phone) {
      return sendError(res, 400, 'Either email or phone is required')
    }

    // Always return success to prevent enumeration
    let userFound = false

    if (phone) {
      // Phone-based reset: Generate 6-digit OTP and send via WhatsApp
      try {
        const normalizedPhone = phone.replace(/[\s+\-()]/g, '')
        
        // Find user by phone
        const userResult = await pool.query(
          'SELECT id, name, phone FROM users WHERE phone = $1',
          [normalizedPhone]
        )

        if (userResult.rows.length > 0) {
          userFound = true
          const user = userResult.rows[0]
          
          const whatsappService = new WhatsAppService(pool)
          
          // Generate 6-digit OTP
          const resetCode = Math.floor(100000 + Math.random() * 900000).toString()
          
          // Send via WhatsApp template
          const whatsappResult = await whatsappService.sendResetPasswordWhatsApp(
            normalizedPhone,
            resetCode,
            user.name || 'User'
          )
          
          if (whatsappResult.ok) {
            // Store OTP in otps table (will be verified later)
            const otpHash = crypto.createHash('sha256').update(resetCode).digest('hex')
            const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)
            
            // Delete existing unused OTPs for this phone
            await pool.query('DELETE FROM otps WHERE phone_or_email = $1 AND used = FALSE', [normalizedPhone])
            
            // Insert new OTP
            await pool.query(
              `INSERT INTO otps (phone_or_email, otp_hash, expires_at)
               VALUES ($1, $2, $3)`,
              [normalizedPhone, otpHash, expiresAt]
            )
            
            console.log(`✅ Password reset OTP sent via WhatsApp to: ${normalizedPhone}`)
          } else {
            // Fallback to email if WhatsApp fails
            if (userResult.rows[0].email) {
              const rawToken = generateResetToken()
              const hashedToken = hashToken(rawToken)
              const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)
              
              await pool.query(
                `UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3`,
                [hashedToken, expiresAt, user.id]
              )
              
              const frontendUrl = process.env.FRONTEND_URL || process.env.USER_PANEL_URL || 'https://thenefol.com'
              const resetLink = `${frontendUrl}/#/user/reset-password?token=${rawToken}&email=${encodeURIComponent(userResult.rows[0].email)}`
              
              await sendPasswordResetEmail(userResult.rows[0].email, user.name || 'User', resetLink)
              console.log(`✅ Password reset email sent (WhatsApp fallback)`)
            }
          }
        }
      } catch (phoneErr: any) {
        console.error('❌ Error processing phone reset:', phoneErr)
      }
    } else if (email) {
      // Email-based reset: Generate secure token and send link
      try {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          return sendError(res, 400, 'Invalid email format')
        }

        const userResult = await pool.query(
          'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1)',
          [email]
        )

        if (userResult.rows.length > 0) {
          userFound = true
          const user = userResult.rows[0]

          // Generate secure reset token
          const rawToken = generateResetToken()
          const hashedToken = hashToken(rawToken)
          const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

          // Save hashed token and expiry
          await pool.query(
            `UPDATE users 
             SET reset_password_token = $1, 
                 reset_password_expires = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [hashedToken, expiresAt, user.id]
          )

          // Build reset link - use hash routing for frontend
          const frontendUrl = process.env.FRONTEND_URL || process.env.USER_PANEL_URL || 'https://thenefol.com'
          const resetLink = `${frontendUrl}/#/user/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`

          // Send password reset email
          await sendPasswordResetEmail(email, user.name || 'User', resetLink)
          console.log(`✅ Password reset email sent to: ${email}`)
        }
      } catch (emailErr: any) {
        console.error('❌ Error processing email reset:', emailErr)
      }
    }

    // Always return success to prevent enumeration
    sendSuccess(res, {
      message: 'If an account exists, a password reset code has been sent.'
    })
  } catch (err: any) {
    console.error('❌ Error in forgot password:', err)
    sendError(res, 500, 'Failed to process password reset request', err)
  }
}

/**
 * Reset Password - Reset password using token
 * 
 * POST /api/auth/reset-password
 * Body: {
 *   "email": "user@example.com",
 *   "token": "raw_token_from_email",
 *   "newPassword": "NewSecurePass123"
 * }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function resetPassword(pool: Pool, req: Request, res: Response) {
  try {
    const { email, token, newPassword } = req.body

    console.log('🔐 Reset password request:', { email, tokenLength: token?.length || 0 })

    // Validate required fields
    const validationError = validateRequired(req.body, ['email', 'token', 'newPassword'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return sendError(res, 400, 'Invalid email format')
    }

    // Validate password strength
    const passwordError = validatePasswordStrength(newPassword)
    if (passwordError) {
      return sendError(res, 400, passwordError)
    }

    // Validate token format (should be 64 hex characters for 32 bytes)
    if (!token || token.length !== 64 || !/^[0-9a-fA-F]+$/.test(token)) {
      return sendError(res, 400, 'Invalid or malformed reset token')
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = hashToken(token)

    // Find user with matching email and token
    const { rows } = await pool.query(
      `SELECT id, name, email, reset_password_token, reset_password_expires 
       FROM users 
       WHERE LOWER(email) = LOWER($1) 
       AND reset_password_token = $2`,
      [email, hashedToken]
    )

    if (rows.length === 0) {
      console.error('❌ Invalid reset token or email')
      return sendError(res, 400, 'Invalid or expired reset token')
    }

    const user = rows[0]

    // Check if token has expired
    if (!user.reset_password_expires || new Date(user.reset_password_expires) < new Date()) {
      // Clear expired token
      await pool.query(
        `UPDATE users 
         SET reset_password_token = NULL, 
             reset_password_expires = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      )
      console.error('❌ Reset token expired for user:', user.id)
      return sendError(res, 400, 'Reset token has expired. Please request a new one.')
    }

    // Hash the new password with bcrypt saltRounds=12
    const hashedPassword = await hashPassword(newPassword)

    // Update password and clear reset token fields
    await pool.query(
      `UPDATE users 
       SET password = $1,
           reset_password_token = NULL,
           reset_password_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hashedPassword, user.id]
    )

    console.log(`✅ Password reset successful for user: ${user.id} (${email})`)

    // Send password reset confirmation email (async, do not block response)
    try {
      await sendPasswordResetConfirmationEmail(email)
    } catch (emailErr: any) {
      console.error('❌ Failed to send password reset confirmation email:', emailErr)
    }

    sendSuccess(res, {
      message: 'Password has been reset successfully. You can now login with your new password.'
    })
  } catch (err: any) {
    console.error('❌ Error in reset password:', err)
    sendError(res, 500, 'Failed to reset password', err)
  }
}

