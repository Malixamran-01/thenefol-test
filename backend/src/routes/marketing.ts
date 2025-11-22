import { Pool } from 'pg'
import { Request, Response } from 'express'
import { sendSuccess, sendError } from '../utils/apiHelpers'
import nodemailer from 'nodemailer'

// ==================== CASHBACK SYSTEM ====================

export const getCashbackWallet = async (pool: Pool, req: Request, res: Response) => {
  try {
    const userId = (req as any).userId
    const role = req.headers['x-user-role'] as string
    
    // For admin users, return aggregate data or allow querying by user_id
    if (role === 'admin' || role === 'manager') {
      const queryUserId = req.query.user_id as string || userId
      
      // If no user_id provided and no userId from token, return aggregate stats
      if (!queryUserId) {
        const aggregateResult = await pool.query(`
          SELECT 
            COALESCE(SUM(total * 0.05), 0) as total_earned,
            COALESCE(SUM(CASE WHEN status IN ('pending', 'approved') THEN total * 0.05 ELSE 0 END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN total * 0.05 ELSE 0 END), 0) as used_amount
          FROM orders
        `)
        
        const totalEarned = parseFloat(aggregateResult.rows[0]?.total_earned || 0)
        const pendingAmount = parseFloat(aggregateResult.rows[0]?.pending_amount || 0)
        const usedAmount = parseFloat(aggregateResult.rows[0]?.used_amount || 0)
        const availableBalance = totalEarned - usedAmount
        
        return sendSuccess(res, {
          totalEarned: Math.floor(totalEarned * 10), // Convert to coins (1 rupee = 10 coins)
          availableBalance: Math.floor(availableBalance * 10),
          pendingAmount: Math.floor(pendingAmount * 10),
          usedAmount: Math.floor(usedAmount * 10),
          nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          payoutMethod: 'Bank Transfer'
        })
      }
      
      // Admin querying specific user's wallet
      const walletResult = await pool.query(`
        SELECT 
          COALESCE(SUM(total * 0.05), 0) as total_earned,
          COALESCE(SUM(total), 0) as total_spent
        FROM orders 
        WHERE customer_email = (
          SELECT email FROM users WHERE id = $1
        )
      `, [queryUserId])
      
      const totalEarned = parseFloat(walletResult.rows[0]?.total_earned || 0)
      const totalSpent = walletResult.rows[0]?.total_spent || 0
      
      // Get pending and used amounts from transactions
      const transactionsResult = await pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'credited' THEN amount ELSE 0 END), 0) as used_amount
        FROM cashback_transactions
        WHERE user_id = $1
      `, [queryUserId])
      
      const pendingAmount = parseFloat(transactionsResult.rows[0]?.pending_amount || 0)
      const usedAmount = parseFloat(transactionsResult.rows[0]?.used_amount || 0)
      const availableBalance = totalEarned - usedAmount
      
      return sendSuccess(res, {
        totalEarned: Math.floor(totalEarned * 10), // Convert to coins
        availableBalance: Math.floor(availableBalance * 10),
        pendingAmount: Math.floor(pendingAmount * 10),
        usedAmount: Math.floor(usedAmount * 10),
        nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        payoutMethod: 'Bank Transfer'
      })
    }
    
    // Regular user flow
    if (!userId) {
      return sendError(res, 401, 'Unauthorized')
    }
    
    // Get cashback wallet balance from orders (5% of total spent)
    const walletResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total * 0.05), 0) as total_earned,
        COALESCE(SUM(total), 0) as total_spent
      FROM orders 
      WHERE customer_email = (
        SELECT email FROM users WHERE id = $1
      )
    `, [userId])
    
    const totalEarned = parseFloat(walletResult.rows[0]?.total_earned || 0)
    const totalSpent = walletResult.rows[0]?.total_spent || 0
    
    // Get pending and used amounts from transactions
    const transactionsResult = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COALESCE(SUM(CASE WHEN status = 'credited' THEN amount ELSE 0 END), 0) as used_amount
      FROM cashback_transactions
      WHERE user_id = $1
    `, [userId])
    
    const pendingAmount = parseFloat(transactionsResult.rows[0]?.pending_amount || 0)
    const usedAmount = parseFloat(transactionsResult.rows[0]?.used_amount || 0)
    const availableBalance = totalEarned - usedAmount
    
    sendSuccess(res, {
      totalEarned: Math.floor(totalEarned * 10), // Convert to coins (1 rupee = 10 coins)
      availableBalance: Math.floor(availableBalance * 10),
      pendingAmount: Math.floor(pendingAmount * 10),
      usedAmount: Math.floor(usedAmount * 10),
      nextPayoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      payoutMethod: 'Bank Transfer'
    })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch cashback wallet', err)
  }
}

export const getCashbackOffers = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM cashback_offers
      WHERE is_active = true
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch cashback offers', err)
  }
}

export const getCashbackTransactions = async (pool: Pool, req: Request, res: Response) => {
  try {
    const userId = (req as any).userId || req.headers['user-id'] as string
    const role = req.headers['x-user-role'] as string
    const queryUserId = req.query.user_id as string || userId
    
    // For admin users, return all transactions or filter by user_id if provided
    if (role === 'admin' || role === 'manager') {
      if (queryUserId) {
        const { rows } = await pool.query(`
          SELECT * FROM cashback_transactions
          WHERE user_id = $1
          ORDER BY created_at DESC
        `, [queryUserId])
        return sendSuccess(res, rows)
      } else {
        // Return all transactions for admin overview
        const { rows } = await pool.query(`
          SELECT * FROM cashback_transactions
          ORDER BY created_at DESC
          LIMIT 100
        `)
        return sendSuccess(res, rows)
      }
    }
    
    // Regular user flow - require userId
    if (!userId || userId === '0') {
      return sendError(res, 401, 'Unauthorized')
    }
    
    const { rows } = await pool.query(`
      SELECT * FROM cashback_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId])
    
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch cashback transactions', err)
  }
}

export const redeemCashback = async (pool: Pool, req: Request, res: Response) => {
  try {
    const userId = req.headers['user-id'] as string || '0'
    const { amount } = req.body
    
    if (!amount || amount <= 0) {
      return sendError(res, 400, 'Invalid amount')
    }
    
    // Get current balance
    const walletResult = await pool.query(`
      SELECT COALESCE(SUM(total * 0.05), 0) as balance
      FROM orders 
      WHERE customer_email = (
        SELECT email FROM users WHERE id = $1
      )
    `, [userId])
    
    const balance = walletResult.rows[0]?.balance || 0
    
    if (amount > balance) {
      return sendError(res, 400, 'Insufficient cashback balance')
    }
    
    // Create transaction record
    const { rows } = await pool.query(`
      INSERT INTO cashback_transactions (user_id, amount, transaction_type, status)
      VALUES ($1, $2, 'redeem', 'pending')
      RETURNING *
    `, [userId, amount])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to redeem cashback', err)
  }
}

// ==================== EMAIL MARKETING ====================

// Helper function to get SMTP config and create transport
async function getEmailTransport(pool: Pool) {
  const { rows } = await pool.query('SELECT * FROM notification_config ORDER BY id DESC LIMIT 1')
  const cfg = rows[0]
  if (!cfg?.smtp_user || !cfg?.smtp_pass) {
    throw new Error('SMTP configuration not found. Please configure email settings first.')
  }
  
  if (cfg.smtp_provider === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass }
    })
  }
  
  if (cfg.smtp_provider === 'hostinger') {
    return nodemailer.createTransport({
      host: cfg.smtp_host || 'smtp.hostinger.com',
      port: Number(cfg.smtp_port || 587),
      secure: false,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      tls: { rejectUnauthorized: false }
    })
  }
  
  if (cfg.smtp_provider === 'godaddy') {
    return nodemailer.createTransport({
      host: cfg.smtp_host || 'smtpout.secureserver.net',
      port: Number(cfg.smtp_port || 587),
      secure: false,
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
      tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
    })
  }
  
  // Custom SMTP
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_port || 587),
    secure: Number(cfg.smtp_port) === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    tls: { rejectUnauthorized: false }
  })
}

export const getEmailCampaigns = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.*,
        COUNT(DISTINCT l.id) as total_sent,
        COUNT(DISTINCT CASE WHEN l.status = 'opened' THEN l.id END) as total_opened,
        COUNT(DISTINCT CASE WHEN l.status = 'clicked' THEN l.id END) as total_clicked
      FROM email_campaigns c
      LEFT JOIN email_sending_logs l ON l.campaign_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch email campaigns', err)
  }
}

export const createEmailCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { name, subject, content, audience, type, scheduled_date } = req.body
    
    if (!name || !subject || !content) {
      return sendError(res, 400, 'Name, subject, and content are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO email_campaigns (name, subject, content, audience, status, scheduled_date, type)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [name, subject, content, audience || 'all', scheduled_date ? 'scheduled' : 'draft', scheduled_date || null, type || 'promotional'])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create email campaign', err)
  }
}

export const updateEmailCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    
    const { rows } = await pool.query(`
      UPDATE email_campaigns 
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Campaign not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update email campaign', err)
  }
}

export const deleteEmailCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query(`
      DELETE FROM email_campaigns
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Campaign not found')
    }
    
    sendSuccess(res, { message: 'Campaign deleted successfully' })
  } catch (err) {
    sendError(res, 500, 'Failed to delete email campaign', err)
  }
}

export const getEmailTemplates = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM email_templates
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch email templates', err)
  }
}

export const createEmailTemplate = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { name, subject, content, category } = req.body
    
    if (!name || !subject || !content) {
      return sendError(res, 400, 'Name, subject, and content are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO email_templates (name, subject, content, category)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [name, subject, content, category || 'general'])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create email template', err)
  }
}

export const updateEmailTemplate = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    
    const { rows } = await pool.query(`
      UPDATE email_templates
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Template not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update email template', err)
  }
}

export const deleteEmailTemplate = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query(`
      DELETE FROM email_templates
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Template not found')
    }
    
    sendSuccess(res, { message: 'Template deleted successfully' })
  } catch (err) {
    sendError(res, 500, 'Failed to delete email template', err)
  }
}

// Send email campaign to recipients
export const sendEmailCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { campaign_id, recipient_emails, recipient_list_id } = req.body
    
    if (!campaign_id) {
      return sendError(res, 400, 'Campaign ID is required')
    }
    
    // Get campaign details
    const campaignResult = await pool.query('SELECT * FROM email_campaigns WHERE id = $1', [campaign_id])
    if (campaignResult.rows.length === 0) {
      return sendError(res, 404, 'Campaign not found')
    }
    const campaign = campaignResult.rows[0]
    
    // Get recipients
    let recipients: Array<{ email: string; name?: string }> = []
    
    if (recipient_list_id) {
      const listResult = await pool.query(`
        SELECT email, name FROM email_subscribers 
        WHERE list_id = $1 AND status = 'subscribed'
      `, [recipient_list_id])
      recipients = listResult.rows
    } else if (recipient_emails && Array.isArray(recipient_emails)) {
      recipients = recipient_emails.map((email: string) => ({ email }))
    } else if (campaign.audience === 'all') {
      // Get all subscribed users
      const usersResult = await pool.query('SELECT email, name FROM users WHERE email IS NOT NULL')
      recipients = usersResult.rows
    } else {
      return sendError(res, 400, 'Recipients not specified')
    }
    
    if (recipients.length === 0) {
      return sendError(res, 400, 'No recipients found')
    }
    
    // Get SMTP config
    const transporter = await getEmailTransport(pool)
    const { rows: cfgRows } = await pool.query('SELECT from_email, smtp_user FROM notification_config ORDER BY id DESC LIMIT 1')
    const fromEmail = cfgRows[0]?.from_email || cfgRows[0]?.smtp_user
    
    // Send emails in batches (rate limiting)
    const batchSize = 10
    let sentCount = 0
    let failedCount = 0
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      await Promise.all(batch.map(async (recipient: { email: string; name?: string }) => {
        try {
          const info = await transporter.sendMail({
            from: fromEmail,
            to: recipient.email,
            subject: campaign.subject,
            html: campaign.content,
            text: campaign.content.replace(/<[^>]*>/g, '') // Strip HTML for text version
          })
          
          // Log successful send
          await pool.query(`
            INSERT INTO email_sending_logs (campaign_id, recipient_email, recipient_name, subject, status, message_id, sent_at)
            VALUES ($1, $2, $3, $4, 'sent', $5, NOW())
          `, [campaign_id, recipient.email, recipient.name || null, campaign.subject, info.messageId])
          
          sentCount++
        } catch (error: any) {
          // Log failed send
          await pool.query(`
            INSERT INTO email_sending_logs (campaign_id, recipient_email, recipient_name, subject, status, error_message, sent_at)
            VALUES ($1, $2, $3, $4, 'failed', $5, NOW())
          `, [campaign_id, recipient.email, recipient.name || null, campaign.subject, error.message])
          
          failedCount++
        }
      }))
      
      // Rate limiting: wait 1 second between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // Update campaign status
    await pool.query(`
      UPDATE email_campaigns 
      SET status = 'sent', sent_date = NOW(), sent_count = $1
      WHERE id = $2
    `, [sentCount, campaign_id])
    
    sendSuccess(res, {
      message: 'Campaign sent successfully',
      sent: sentCount,
      failed: failedCount,
      total: recipients.length
    })
  } catch (err: any) {
    sendError(res, 500, 'Failed to send email campaign', err)
  }
}

// Get email lists
export const getEmailLists = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        l.*,
        COUNT(DISTINCT s.id) as subscriber_count
      FROM email_lists l
      LEFT JOIN email_subscribers s ON s.list_id = l.id AND s.status = 'subscribed'
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch email lists', err)
  }
}

// Create email list
export const createEmailList = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { name, description } = req.body
    
    if (!name) {
      return sendError(res, 400, 'List name is required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO email_lists (name, description)
      VALUES ($1, $2)
      RETURNING *
    `, [name, description || null])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create email list', err)
  }
}

// Add subscribers to list
export const addEmailSubscribers = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { list_id, subscribers } = req.body
    
    if (!list_id || !subscribers || !Array.isArray(subscribers)) {
      return sendError(res, 400, 'List ID and subscribers array are required')
    }
    
    const added: any[] = []
    const errors: any[] = []
    
    for (const sub of subscribers) {
      try {
        const { rows } = await pool.query(`
          INSERT INTO email_subscribers (email, name, list_id, status)
          VALUES ($1, $2, $3, 'subscribed')
          ON CONFLICT (email, list_id) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, email_subscribers.name),
            status = 'subscribed',
            subscribed_at = NOW(),
            unsubscribed_at = NULL
          RETURNING *
        `, [sub.email, sub.name || null, list_id])
        
        added.push(rows[0])
      } catch (error: any) {
        errors.push({ email: sub.email, error: error.message })
      }
    }
    
    // Update subscriber count
    await pool.query(`
      UPDATE email_lists 
      SET subscriber_count = (SELECT COUNT(*) FROM email_subscribers WHERE list_id = $1 AND status = 'subscribed')
      WHERE id = $1
    `, [list_id])
    
    sendSuccess(res, { added: added.length, errors: errors.length, details: { added, errors } })
  } catch (err) {
    sendError(res, 500, 'Failed to add subscribers', err)
  }
}

// Get sending logs for a campaign
export const getEmailSendingLogs = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { campaign_id } = req.query
    
    let query = 'SELECT * FROM email_sending_logs'
    const params: any[] = []
    
    if (campaign_id) {
      query += ' WHERE campaign_id = $1'
      params.push(campaign_id)
    }
    
    query += ' ORDER BY created_at DESC LIMIT 1000'
    
    const { rows } = await pool.query(query, params)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch sending logs', err)
  }
}

export const getEmailAutomations = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM email_automations
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch email automations', err)
  }
}

export const createEmailAutomation = async (pool: Pool, req: Request, res: Response) => {
  try {
    const body = req.body
    const { name, trigger, condition, action, is_active } = body
    
    const { rows } = await pool.query(`
      INSERT INTO email_automations (name, trigger, condition, action, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, trigger, condition, action, is_active || false])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create email automation', err)
  }
}

export const updateEmailAutomation = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    
    const { rows } = await pool.query(`
      UPDATE email_automations
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Automation not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update email automation', err)
  }
}

// ==================== SMS MARKETING ====================

export const getSMSCampaigns = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM sms_campaigns
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch SMS campaigns', err)
  }
}

export const createSMSCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const body = req.body
    const { name, message, audience, scheduled_date } = body
    
    const { rows } = await pool.query(`
      INSERT INTO sms_campaigns (name, message, audience, scheduled_date, status)
      VALUES ($1, $2, $3, $4, 'draft')
      RETURNING *
    `, [name, message, audience, scheduled_date])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create SMS campaign', err)
  }
}

export const updateSMSCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    
    const { rows } = await pool.query(`
      UPDATE sms_campaigns
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Campaign not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update SMS campaign', err)
  }
}

export const deleteSMSCampaign = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query(`
      DELETE FROM sms_campaigns
      WHERE id = $1
      RETURNING *
    `, [id])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Campaign not found')
    }
    
    sendSuccess(res, { message: 'Campaign deleted successfully' })
  } catch (err) {
    sendError(res, 500, 'Failed to delete SMS campaign', err)
  }
}

export const getSMSTemplates = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM sms_templates
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch SMS templates', err)
  }
}

export const getSMSAutomations = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM sms_automations
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch SMS automations', err)
  }
}

export const createSMSAutomation = async (pool: Pool, req: Request, res: Response) => {
  try {
    const body = req.body
    const { name, trigger, condition, action, is_active } = body
    
    const { rows } = await pool.query(`
      INSERT INTO sms_automations (name, trigger, condition, action, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, trigger, condition, action, is_active || false])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create SMS automation', err)
  }
}

export const updateSMSAutomation = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body
    
    const { rows } = await pool.query(`
      UPDATE sms_automations
      SET ${Object.keys(body).map((key, i) => `${key} = $${i + 2}`).join(', ')}
      WHERE id = $1
      RETURNING *
    `, [id, ...Object.values(body)])
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Automation not found')
    }
    
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update SMS automation', err)
  }
}

// ==================== PUSH NOTIFICATIONS ====================

export const getPushNotifications = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM push_notifications
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch push notifications', err)
  }
}

export const getPushTemplates = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM push_templates
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch push templates', err)
  }
}

export const getPushAutomations = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM push_automations
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch push automations', err)
  }
}

// ==================== WHATSAPP CHAT ====================

export const getWhatsAppChats = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM whatsapp_chat_sessions
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch WhatsApp chats', err)
  }
}

export const getWhatsAppTemplates = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM whatsapp_templates
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch WhatsApp templates', err)
  }
}

export const getWhatsAppAutomations = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM whatsapp_automations
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch WhatsApp automations', err)
  }
}

// Send WhatsApp message via Facebook Graph API
export const sendWhatsAppMessage = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { to, template, message } = req.body
    
    // Get WhatsApp credentials from environment
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    
    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials not configured')
      console.error('   Missing:', !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : '', !phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : '')
      return sendError(res, 400, 'WhatsApp credentials not configured. Please check your environment variables.')
    }
    
    if (!to) {
      return sendError(res, 400, 'Recipient phone number is required')
    }
    
    // Prepare the request body
    let requestBody: any
    
    // If template is provided, use template message format
    if (template && template.name) {
      requestBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: template.name,
          language: {
            code: template.language || 'en_US'
          }
        }
      }
    } else if (message) {
      // Use text message
      requestBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      }
    } else {
      return sendError(res, 400, 'Either template or message is required')
    }
    
    // Make request to Facebook Graph API
    const facebookUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`
    
    const response = await fetch(facebookUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })
    
    const responseData = await response.json() as any
    
    if (!response.ok) {
      console.error('❌ WhatsApp API error:', JSON.stringify(responseData, null, 2))
      console.error('   Phone:', to)
      console.error('   Status:', response.status)
      return sendError(res, response.status, responseData.error?.message || 'Failed to send WhatsApp message', responseData)
    }
    
    // Log the message to database if chat_sessions table exists
    try {
      await pool.query(`
        INSERT INTO whatsapp_chat_sessions (customer_name, customer_phone, last_message, last_message_time, status)
        VALUES ($1, $2, $3, NOW(), 'active')
      `, [`Customer_${to}`, to, message || JSON.stringify(template)])
    } catch (dbErr) {
      console.error('Failed to log WhatsApp message:', dbErr)
    }
    
    sendSuccess(res, {
      message: 'WhatsApp message sent successfully',
      whatsappResponse: responseData
    })
  } catch (err) {
    console.error('WhatsApp send error:', err)
    sendError(res, 500, 'Failed to send WhatsApp message', err)
  }
}

// ==================== WHATSAPP CONFIGURATION ====================

export const getWhatsAppConfig = async (pool: Pool, req: Request, res: Response) => {
  try {
    const config = {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
      webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || '',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || ''
    }
    sendSuccess(res, config)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch WhatsApp config', err)
  }
}

export const saveWhatsAppConfig = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { accessToken, phoneNumberId, businessAccountId, webhookUrl, verifyToken } = req.body
    
    // In production, you would save these to a secure configuration store
    // For now, we'll just validate and return success
    // You should update the .env file or use a secure config management system
    
    if (!accessToken || !phoneNumberId) {
      return sendError(res, 400, 'Access token and phone number ID are required')
    }
    
    // Store in database for persistence
    await pool.query(`
      INSERT INTO whatsapp_config (access_token, phone_number_id, business_account_id, webhook_url, verify_token, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        access_token = $1,
        phone_number_id = $2,
        business_account_id = $3,
        webhook_url = $4,
        verify_token = $5,
        updated_at = NOW()
    `, [accessToken, phoneNumberId, businessAccountId || null, webhookUrl || null, verifyToken || null])
    
    sendSuccess(res, { message: 'Configuration saved successfully' })
  } catch (err) {
    sendError(res, 500, 'Failed to save WhatsApp config', err)
  }
}

export const createWhatsAppTemplate = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { name, content, category, language, scheduled_date, scheduled_time, is_scheduled } = req.body
    
    if (!name || !content) {
      return sendError(res, 400, 'Name and content are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO whatsapp_templates (name, category, content, is_approved, scheduled_date, scheduled_time, is_scheduled, created_at, updated_at)
      VALUES ($1, $2, $3, false, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [name, category || 'Custom', content, scheduled_date || null, scheduled_time || null, is_scheduled || false])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create template', err)
  }
}

export const createWhatsAppAutomation = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { name, trigger, action, template_id, scheduled_date, scheduled_time, is_scheduled } = req.body
    
    if (!name || !trigger) {
      return sendError(res, 400, 'Name and trigger are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO whatsapp_automations (name, trigger, condition, action, template_id, scheduled_date, scheduled_time, is_scheduled, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, NOW(), NOW())
      RETURNING *
    `, [name, trigger, 'Always', action || 'Send WhatsApp Message', template_id || null, scheduled_date || null, scheduled_time || null, is_scheduled || false])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create automation', err)
  }
}

// Get scheduled WhatsApp messages
export const getScheduledWhatsAppMessages = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { status } = req.query
    let query = `
      SELECT sm.*, 
             t.name as template_name,
             a.name as automation_name
      FROM whatsapp_scheduled_messages sm
      LEFT JOIN whatsapp_templates t ON sm.template_id = t.id
      LEFT JOIN whatsapp_automations a ON sm.automation_id = a.id
    `
    const params: any[] = []
    
    if (status) {
      query += ' WHERE sm.status = $1'
      params.push(status)
    }
    
    query += ' ORDER BY sm.scheduled_at ASC'
    
    const { rows } = await pool.query(query, params)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch scheduled messages', err)
  }
}

// Create scheduled WhatsApp message
export const createScheduledWhatsAppMessage = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { template_id, automation_id, phone, message, scheduled_at } = req.body
    
    if (!phone || !message || !scheduled_at) {
      return sendError(res, 400, 'Phone, message, and scheduled_at are required')
    }
    
    const { rows } = await pool.query(`
      INSERT INTO whatsapp_scheduled_messages (template_id, automation_id, phone, message, scheduled_at, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
      RETURNING *
    `, [template_id || null, automation_id || null, phone, message, scheduled_at])
    
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create scheduled message', err)
  }
}

// ==================== LIVE CHAT ====================

export const getLiveChatSessions = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        s.*,
        COALESCE(NULLIF(s.customer_name, ''), NULLIF(u.name, ''), 'User') as customer_name,
        COALESCE(NULLIF(s.customer_email, ''), NULLIF(u.email, ''), '') as customer_email
      FROM live_chat_sessions s
      LEFT JOIN users u ON s.user_id::text = u.id::text
      ORDER BY s.last_message_time DESC NULLS LAST, s.created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch live chat sessions', err)
  }
}

export const getLiveChatAgents = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM live_chat_agents
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch live chat agents', err)
  }
}

export const getLiveChatWidgets = async (pool: Pool, req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM live_chat_widgets
      ORDER BY created_at DESC
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch live chat widgets', err)
  }
}

