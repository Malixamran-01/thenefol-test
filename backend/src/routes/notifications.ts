/**
 * Notifications Routes - WhatsApp + Email Notifications
 * 
 * This module handles:
 * - Alert configuration (getConfig, saveConfig)
 * - Test notifications (testWhatsApp, testEmail)
 * - Order notifications via WhatsApp
 * - General alert sending (sendAlert)
 * 
 * @module routes/notifications
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { WhatsAppService } from '../services/whatsappService'
import nodemailer from 'nodemailer'

/**
 * Ensure notification_config table exists
 */
async function ensureTables(pool: Pool) {
  await pool.query(`
    create table if not exists notification_config (
      id serial primary key,
      whatsapp_token text,
      whatsapp_phone_id text,
      notify_phone text,
      smtp_provider text, -- gmail|hostinger|godaddy|custom
      smtp_host text,
      smtp_port int,
      smtp_user text,
      smtp_pass text,
      notify_email text,
      from_email text,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );
  `)
}

/**
 * Create email transporter from config
 */
function createTransport(cfg: any) {
  if (cfg.smtp_provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass
      }
    })
  }
  
  if (cfg.smtp_provider === 'hostinger') {
    return nodemailer.createTransport({
      host: cfg.smtp_host || 'smtp.hostinger.com',
      port: Number(cfg.smtp_port || 587),
      secure: false,
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass
      },
      tls: {
        rejectUnauthorized: false
      }
    })
  }
  
  if (cfg.smtp_provider === 'godaddy') {
    return nodemailer.createTransport({
      host: cfg.smtp_host || 'smtpout.secureserver.net',
      port: Number(cfg.smtp_port || 587),
      secure: false,
      auth: {
        user: cfg.smtp_user,
        pass: cfg.smtp_pass
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false
      }
    })
  }
  
  // Custom SMTP
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_port || 587),
    secure: Number(cfg.smtp_port) === 465,
    auth: {
      user: cfg.smtp_user,
      pass: cfg.smtp_pass
    },
    tls: {
      rejectUnauthorized: false
    }
  })
}

/**
 * Get notification configuration
 * GET /api/alerts/config
 */
export async function getConfig(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTables(pool)
    const { rows } = await pool.query('SELECT * FROM notification_config ORDER BY id DESC LIMIT 1')
    sendSuccess(res, rows[0] || null)
  } catch (err: any) {
    sendError(res, 500, 'Failed to fetch notification config', err)
  }
}

/**
 * Save notification configuration
 * POST /api/alerts/config
 */
export async function saveConfig(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTables(pool)
    const cfg = req.body || {}
    await pool.query(`
      INSERT INTO notification_config (
        whatsapp_token, whatsapp_phone_id, notify_phone,
        smtp_provider, smtp_host, smtp_port,
        smtp_user, smtp_pass, notify_email, from_email,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    `, [
      cfg.whatsapp_token || null,
      cfg.whatsapp_phone_id || null,
      cfg.notify_phone || null,
      cfg.smtp_provider || null,
      cfg.smtp_host || null,
      cfg.smtp_port || null,
      cfg.smtp_user || null,
      cfg.smtp_pass || null,
      cfg.notify_email || null,
      cfg.from_email || null
    ])
    sendSuccess(res, { saved: true }, 201)
  } catch (err: any) {
    sendError(res, 500, 'Failed to save notification config', err)
  }
}

/**
 * Test WhatsApp notification
 * POST /api/alerts/test/whatsapp
 */
export async function testWhatsApp(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTables(pool)
    const { phone_number, message } = req.body || {}
    const validationError = validateRequired({ phone_number, message }, ['phone_number', 'message'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }
    const { rows } = await pool.query('SELECT whatsapp_token, whatsapp_phone_id FROM notification_config ORDER BY id DESC LIMIT 1')
    const token = rows[0]?.whatsapp_token
    const phoneId = rows[0]?.whatsapp_phone_id
    if (!token || !phoneId) {
      return sendError(res, 400, 'WhatsApp config missing')
    }
    const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(phoneId)}/messages`
    const payload = {
      messaging_product: 'whatsapp',
      to: phone_number,
      type: 'text',
      text: { body: message }
    }
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    const data = await resp.json() as any
    if (!resp.ok) {
      return sendError(res, 400, 'WhatsApp send failed', data)
    }
    sendSuccess(res, { sent: true, id: data?.messages?.[0]?.id || null })
  } catch (err: any) {
    sendError(res, 500, 'Failed to send WhatsApp message', err)
  }
}

/**
 * Test Email notification
 * POST /api/alerts/test/email
 */
export async function testEmail(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTables(pool)
    const { to, subject, text } = req.body || {}
    const validationError = validateRequired({ to, subject, text }, ['to', 'subject', 'text'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }
    const { rows } = await pool.query('SELECT * FROM notification_config ORDER BY id DESC LIMIT 1')
    const cfg = rows[0]
    if (!cfg?.smtp_user || !cfg?.smtp_pass) {
      return sendError(res, 400, 'SMTP config missing')
    }
    const transporter = createTransport(cfg)
    const info = await transporter.sendMail({
      from: cfg.from_email || cfg.smtp_user,
      to,
      subject,
      text
    })
    sendSuccess(res, { sent: true, messageId: info.messageId })
  } catch (err: any) {
    sendError(res, 500, 'Failed to send email', err)
  }
}

/**
 * Get configuration (internal helper)
 */
async function getCfg(pool: Pool) {
  const { rows } = await pool.query('SELECT * FROM notification_config ORDER BY id DESC LIMIT 1')
  return rows[0]
}

/**
 * Send alert (used by other modules)
 * @param pool - Database pool
 * @param params - Alert parameters { subject, text }
 */
export async function sendAlert(pool: Pool, params: { subject: string; text: string }) {
  try {
    const cfg = await getCfg(pool)
    if (!cfg) return

    // WhatsApp
    if (cfg.whatsapp_token && cfg.whatsapp_phone_id && cfg.notify_phone) {
      try {
        const url = `https://graph.facebook.com/v20.0/${encodeURIComponent(cfg.whatsapp_phone_id)}/messages`
        const payload = {
          messaging_product: 'whatsapp',
          to: cfg.notify_phone,
          type: 'text',
          text: { body: params.text }
        }
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cfg.whatsapp_token}`
          },
          body: JSON.stringify(payload)
        })
      } catch {}
    }

    // Email
    if (cfg.smtp_user && cfg.smtp_pass && (cfg.notify_email || cfg.from_email)) {
      try {
        const transporter = createTransport(cfg)
        await transporter.sendMail({
          from: cfg.from_email || cfg.smtp_user,
          to: cfg.notify_email || cfg.from_email,
          subject: params.subject,
          text: params.text
        })
      } catch {}
    }
  } catch {}
}

/**
 * Send order notification via WhatsApp
 * 
 * POST /api/notifications/order
 * Body: {
 *   "phone": "91XXXXXXXXXX",
 *   "name": "Rahul",
 *   "orderId": "NF12345",
 *   "total": 899,
 *   "items": ["Item 1", "Item 2"]
 * }
 * 
 * @param {Pool} pool - Database pool
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 */
export async function sendOrderNotification(pool: Pool, req: Request, res: Response) {
  try {
    const { phone, name, orderId, total, items } = req.body

    console.log('📦 Order notification request:', { phone, name, orderId, total, items })

    const validationError = validateRequired(req.body, ['phone', 'name', 'orderId', 'total', 'items'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }

    // Validate items is an array
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Items must be a non-empty array')
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/[\s+\-()]/g, '')

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService(pool)

    // Send order notification
    const result = await whatsappService.sendOrderNotification(normalizedPhone, {
      name,
      orderId,
      total: parseFloat(total.toString()),
      items: items.map((item: any) => item.toString())
    })

    if (result.success) {
      console.log('✅ Order notification sent successfully to:', normalizedPhone)
      sendSuccess(res, {
        message: 'Order notification sent successfully',
        orderId,
        phone: normalizedPhone
      })
    } else {
      console.error('❌ Failed to send order notification:', result.error)
      return sendError(res, 500, result.error || 'Failed to send order notification')
    }
  } catch (err: any) {
    console.error('❌ Error sending order notification:', err)
    sendError(res, 500, 'Failed to send order notification', err)
  }
}
