/**
 * OTP Routes - WhatsApp + Email OTP System
 * 
 * This module handles OTP generation, sending (via WhatsApp and Email),
 * and verification for user authentication.
 * 
 * @module routes/otp
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { WhatsAppService } from '../services/whatsappService'
import { transporter, getAdminEmail } from '../utils/email'
import { generateAndSendOtp, verifyOtp, maskOTP } from '../services/otpService'

/**
 * Send OTP via WhatsApp (primary) and Email (secondary)
 * 
 * POST /api/auth/send-otp
 * Body: { "phone": "91XXXXXXXXXX" } or { "email": "user@example.com" }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function sendOTP(pool: Pool, req: Request, res: Response) {
  try {
    const { phone, email } = req.body

    console.log('📱 OTP Request received:', { phone: phone ? '***' : undefined, email: email ? email.substring(0, 3) + '***' : undefined })

    if (!phone && !email) {
      return sendError(res, 400, 'Either phone or email is required')
    }

    const phoneOrEmail = phone || email
    const whatsappService = new WhatsAppService(pool)
    
    // For WhatsApp: Generate OTP in backend and send via template
    if (phone) {
      try {
        // Generate OTP and send via WhatsApp template
        const sendWhatsAppOtp = async (phoneNum: string, otp: string) => {
          const result = await whatsappService.sendOTPWhatsApp(phoneNum, otp)
          return result
        }
        
        const result = await generateAndSendOtp(
          pool,
          phone,
          sendWhatsAppOtp,
          undefined // No email fallback for phone
        )
        
        if (!result.ok) {
          console.error('❌ WhatsApp OTP send failed:', result.error?.message)
          return sendError(res, 500, result.error?.message || 'Failed to send WhatsApp OTP')
        }
        
        console.log(`✅ WhatsApp OTP template sent to ${phone.replace(/.(?=.{4})/g, '*')}`)
        
        const otpTtl = parseInt(process.env.OTP_TTL_SECONDS || '300')
        return sendSuccess(res, {
          message: 'OTP sent successfully to your WhatsApp',
          method: 'whatsapp',
          expiresIn: otpTtl
        })
      } catch (err: any) {
        console.error('❌ Error sending WhatsApp OTP:', err.message)
        return sendError(res, 500, 'Failed to send WhatsApp OTP', err)
      }
    }
    
    // For Email: Generate OTP in backend (email doesn't support Meta's auto-OTP)
    const sendEmailOtp = async (emailAddr: string, otp: string) => {
      try {
        const userResult = await pool.query('SELECT name FROM users WHERE email = $1', [emailAddr])
        const userName = userResult.rows[0]?.name || 'User'
        
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"><title>OTP Verification</title></head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: #fff; margin: 0;">OTP Verification</h1>
            </div>
            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p style="font-size: 16px;">Hi ${userName},</p>
              <p style="font-size: 16px;">Your verification code is:</p>
              <div style="background: #fff; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <h2 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h2>
              </div>
              <p style="font-size: 14px; color: #666;">This code will expire in ${Math.ceil(parseInt(process.env.OTP_TTL_SECONDS || '300') / 60)} minutes.</p>
            </div>
          </body>
          </html>
        `
        
        await transporter.sendMail({
          from: `"Thenefol" <${getAdminEmail()}>`,
          to: emailAddr,
          subject: 'OTP Verification - Thenefol',
          html: emailHtml
        })
      } catch (err: any) {
        throw new Error(`Email send failed: ${err.message}`)
      }
    }

    // Generate and send OTP for email
    const result = await generateAndSendOtp(
      pool,
      phoneOrEmail,
      undefined, // No WhatsApp function - already handled above
      sendEmailOtp
    )

    if (!result.ok) {
      return sendError(res, 500, result.error?.message || 'Failed to send OTP')
    }

    const otpTtl = parseInt(process.env.OTP_TTL_SECONDS || '300')
    sendSuccess(res, {
      message: phone ? 'OTP sent successfully to your WhatsApp' : 'OTP sent successfully to your email',
      method: phone ? 'whatsapp' : 'email',
      expiresIn: otpTtl
    })
  } catch (err: any) {
    console.error('❌ Error sending OTP:', err)
    sendError(res, 500, 'Failed to send OTP', err)
  }
}

/**
 * Verify OTP
 * 
 * POST /api/auth/verify-otp
 * Body: { "phone": "91XXXXXXXXXX", "otp": "123456" } or { "email": "user@example.com", "otp": "123456" }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function verifyOTP(pool: Pool, req: Request, res: Response) {
  try {
    const { phone, email, otp } = req.body

    console.log(`🔍 OTP Verification Request: phone="${phone}", email="${email}", otp="${otp ? otp.substring(0, 2) + '****' : 'missing'}"`)

    if (!phone && !email) {
      return sendError(res, 400, 'Either phone or email is required')
    }

    if (!otp) {
      return sendError(res, 400, 'OTP is required')
    }

    const phoneOrEmail = phone || email

    // Verify OTP using service
    const result = await verifyOtp(pool, phoneOrEmail, otp)

    if (!result.ok) {
      return sendError(res, 400, result.error?.message || 'OTP verification failed')
    }

    console.log(`✅ OTP verified successfully for ${phone ? 'phone' : 'email'}: ${phone ? phone.replace(/.(?=.{4})/g, '*') : email.substring(0, 3) + '***'}`)

    sendSuccess(res, {
      message: 'OTP verified successfully',
      verified: true,
      userId: result.userId
    })
  } catch (err: any) {
    console.error('❌ Error verifying OTP:', err)
    sendError(res, 500, 'Failed to verify OTP', err)
  }
}

