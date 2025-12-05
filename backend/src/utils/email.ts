// Email Configuration with Nodemailer + Hostinger SMTP
import nodemailer from 'nodemailer'

// Create and export Nodemailer transporter with Hostinger SMTP
export const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Verify transporter configuration
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    await transporter.verify()
    console.log('✅ Email transporter configured successfully')
    return true
  } catch (error) {
    console.error('❌ Email transporter configuration failed:', error)
    return false
  }
}

// Get admin email from environment or use default
export function getAdminEmail(): string {
  return process.env.EMAIL_USER || 'support@thenefol.com'
}

