// Subscription API (WhatsApp)
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { sendWelcomeOffer } from '../utils/whatsappUtils'
import { sendSubscriptionActivatedEmail, sendSubscriptionReminderOrCancelledEmail } from '../services/emailService'

// Subscribe to WhatsApp
export async function subscribeWhatsApp(pool: Pool, req: Request, res: Response) {
  try {
    const { phone, name, source, metadata } = req.body

    const validationError = validateRequired(req.body, ['phone'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }

    // Normalize phone number (remove spaces, +, etc.)
    const normalizedPhone = phone.replace(/[\s+\-()]/g, '')

    // Check if already subscribed
    const existing = await pool.query(
      'SELECT * FROM whatsapp_subscriptions WHERE phone = $1',
      [normalizedPhone]
    )

    let isNewSubscription = false
    if (existing.rows.length > 0) {
      const subscription = existing.rows[0]
      
      if (subscription.is_active) {
        // Already subscribed - return error to prevent duplicate
        return sendError(res, 409, `This phone number (${normalizedPhone}) is already subscribed.`)
      } else {
        // Reactivate subscription
        await pool.query(`
          UPDATE whatsapp_subscriptions
          SET is_active = true,
              subscribed_at = NOW(),
              unsubscribed_at = NULL,
              name = COALESCE($1, name),
              source = COALESCE($2, source)
          WHERE phone = $3
        `, [name, source, normalizedPhone])
        isNewSubscription = true
      }
    } else {
      // New subscription
      await pool.query(`
        INSERT INTO whatsapp_subscriptions (phone, name, source, metadata)
        VALUES ($1, $2, $3, $4)
      `, [normalizedPhone, name, source || 'popup', metadata || {}])
      isNewSubscription = true
    }

    // Get the subscription details for notification
    const { rows: subscriptionRows } = await pool.query(
      'SELECT * FROM whatsapp_subscriptions WHERE phone = $1',
      [normalizedPhone]
    )
    const subscription = subscriptionRows[0]

    // Find user by phone number if they have an account
    let userId: number | null = null
    let userEmail: string | null = null
    try {
      const userResult = await pool.query(
        'SELECT id, email FROM users WHERE phone = $1',
        [normalizedPhone]
      )
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id
        userEmail = userResult.rows[0].email || null
      }
    } catch (err) {
      console.error('Error finding user by phone:', err)
    }

    // Automatically enroll user in active offers and promotions
    try {
      const now = new Date()
      
      // Get all active discounts
      const activeDiscounts = await pool.query(`
        SELECT id FROM discounts 
        WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      `, [now])
      
      // Get all active cashback offers
      const activeCashbackOffers = await pool.query(`
        SELECT id FROM cashback_offers 
        WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      `, [now])

      // Enroll in all active discounts
      for (const discount of activeDiscounts.rows) {
        try {
          // Check if already enrolled to avoid duplicates
          const existingEnrollment = await pool.query(`
            SELECT id FROM promotion_enrollments 
            WHERE (user_id = $1 OR phone = $2)
            AND discount_id = $3
            AND is_active = true
          `, [userId, normalizedPhone, discount.id])
          
          if (existingEnrollment.rows.length === 0) {
            await pool.query(`
              INSERT INTO promotion_enrollments (user_id, phone, discount_id, enrollment_source)
              VALUES ($1, $2, $3, 'whatsapp_subscription')
            `, [userId, normalizedPhone, discount.id])
            console.log(`✅ Enrolled ${normalizedPhone} in discount ${discount.id}`)
          }
        } catch (err) {
          console.error(`Error enrolling in discount ${discount.id}:`, err)
        }
      }

      // Enroll in all active cashback offers
      for (const offer of activeCashbackOffers.rows) {
        try {
          // Check if already enrolled to avoid duplicates
          const existingEnrollment = await pool.query(`
            SELECT id FROM promotion_enrollments 
            WHERE (user_id = $1 OR phone = $2)
            AND cashback_offer_id = $3
            AND is_active = true
          `, [userId, normalizedPhone, offer.id])
          
          if (existingEnrollment.rows.length === 0) {
            await pool.query(`
              INSERT INTO promotion_enrollments (user_id, phone, cashback_offer_id, enrollment_source)
              VALUES ($1, $2, $3, 'whatsapp_subscription')
            `, [userId, normalizedPhone, offer.id])
            console.log(`✅ Enrolled ${normalizedPhone} in cashback offer ${offer.id}`)
          }
        } catch (err) {
          console.error(`Error enrolling in cashback offer ${offer.id}:`, err)
        }
      }
      
      console.log(`🎁 Auto-enrolled ${normalizedPhone} in ${activeDiscounts.rows.length} discounts and ${activeCashbackOffers.rows.length} cashback offers`)
    } catch (err) {
      console.error('Error auto-enrolling in offers:', err)
      // Don't fail the subscription if enrollment fails
    }

    // Emit real-time notification to admin panel via Socket.IO
    const io = (req as any).io
    if (io) {
      io.to('admin-panel').emit('update', {
        type: 'whatsapp-subscription',
        data: {
          subscription: {
            id: subscription.id,
            phone: subscription.phone,
            name: subscription.name,
            source: subscription.source,
            subscribed_at: subscription.subscribed_at
          },
          message: `New WhatsApp subscription: ${normalizedPhone}`
        }
      })
      console.log('📱 Emitted WhatsApp subscription notification to admin panel')
    }

    // Send welcome offer WhatsApp message
    if (isNewSubscription) {
      try {
        // Send welcome offer asynchronously (don't block the response)
        sendWelcomeOffer(normalizedPhone, name || undefined, pool)
          .then((result) => {
            if (result.success) {
              console.log(`🎉 Welcome offer sent successfully to ${normalizedPhone}`)
            } else {
              console.error(`⚠️ Failed to send welcome offer to ${normalizedPhone}:`, result.error)
            }
        })
          .catch((err) => {
            console.error(`⚠️ Error sending welcome offer to ${normalizedPhone}:`, err)
          })
      } catch (err) {
        // Log error but don't fail the subscription
        console.error('Error initiating welcome offer send:', err)
      }

      // Send subscription activated email if we have a matching user email
      if (userEmail) {
        sendSubscriptionActivatedEmail(userEmail, { name: 'WhatsApp updates' }).catch(emailErr => {
          console.error('Error sending subscription activated email:', emailErr)
        })
      }
    }

    sendSuccess(res, { 
      message: 'Successfully subscribed to WhatsApp updates',
      subscribed: true
    })
  } catch (err: any) {
    console.error('Error subscribing to WhatsApp:', err)
    sendError(res, 500, 'Failed to subscribe to WhatsApp', err)
  }
}

// Unsubscribe from WhatsApp
export async function unsubscribeWhatsApp(pool: Pool, req: Request, res: Response) {
  try {
    const { phone } = req.body

    const validationError = validateRequired(req.body, ['phone'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }

    const normalizedPhone = phone.replace(/[\s+\-()]/g, '')

    // Try to find matching user email (for subscription cancelled email)
    let userEmail: string | null = null
    try {
      const userResult = await pool.query(
        'SELECT email FROM users WHERE phone = $1',
        [normalizedPhone]
      )
      if (userResult.rows.length > 0) {
        userEmail = userResult.rows[0].email || null
      }
    } catch (lookupErr: any) {
      console.error('Error finding user email for unsubscribe:', lookupErr)
    }

    const { rowCount } = await pool.query(
      'UPDATE whatsapp_subscriptions SET is_active = false, unsubscribed_at = NOW() WHERE phone = $1',
      [normalizedPhone]
    )

    if (rowCount === 0) {
      return sendError(res, 404, 'Subscription not found')
    }

    // Send subscription cancelled email if we have an email
    if (userEmail) {
      sendSubscriptionReminderOrCancelledEmail(userEmail, { name: 'WhatsApp updates' }, 'cancelled').catch(emailErr => {
        console.error('Error sending subscription cancelled email:', emailErr)
      })
    }

    sendSuccess(res, { message: 'Successfully unsubscribed from WhatsApp updates' })
  } catch (err: any) {
    console.error('Error unsubscribing from WhatsApp:', err)
    sendError(res, 500, 'Failed to unsubscribe from WhatsApp', err)
  }
}

// Get WhatsApp subscriptions (admin only)
export async function getWhatsAppSubscriptions(pool: Pool, req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 50
    const offset = (page - 1) * limit
    const search = req.query.search as string

    let query = `
      SELECT id, phone, name, source, subscribed_at, unsubscribed_at, is_active, metadata
      FROM whatsapp_subscriptions
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (search) {
      query += ` AND (phone LIKE $${paramIndex} OR name LIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }

    query += ` ORDER BY subscribed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const { rows } = await pool.query(query, params)

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM whatsapp_subscriptions WHERE 1=1'
    const countParams: any[] = []
    if (search) {
      countQuery += ` AND (phone LIKE $1 OR name LIKE $1)`
      countParams.push(`%${search}%`)
    }
    const { rows: countRows } = await pool.query(countQuery, countParams)
    const total = parseInt(countRows[0].total)

    sendSuccess(res, {
      subscriptions: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (err: any) {
    console.error('Error fetching WhatsApp subscriptions:', err)
    sendError(res, 500, 'Failed to fetch WhatsApp subscriptions', err)
  }
}

// Get WhatsApp subscription stats (admin only)
export async function getWhatsAppStats(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_active = true) as active_subscribers,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_subscribers,
        COUNT(*) as total_subscribers,
        COUNT(*) FILTER (WHERE subscribed_at > NOW() - INTERVAL '7 days') as new_last_7_days,
        COUNT(*) FILTER (WHERE subscribed_at > NOW() - INTERVAL '30 days') as new_last_30_days,
        COUNT(*) FILTER (WHERE subscribed_at > NOW() - INTERVAL '24 hours') as new_last_24_hours
      FROM whatsapp_subscriptions
    `)

    sendSuccess(res, rows[0])
  } catch (err: any) {
    console.error('Error fetching WhatsApp stats:', err)
    sendError(res, 500, 'Failed to fetch WhatsApp stats', err)
  }
}

