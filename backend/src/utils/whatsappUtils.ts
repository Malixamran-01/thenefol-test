// WhatsApp utility functions
import { Pool } from 'pg'
import crypto from 'crypto'

/**
 * Send a WhatsApp message using Facebook Graph API
 * @param phone - Recipient phone number (with country code, no spaces/special chars)
 * @param message - Text message to send
 * @param pool - Database pool (optional, for logging)
 * @returns Promise with success status and response data
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  pool?: Pool
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Get WhatsApp credentials from environment
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials not configured')
      console.error('   Missing:', !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : '', !phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : '')
      return { success: false, error: 'WhatsApp credentials not configured' }
    }

    if (!phone) {
      return { success: false, error: 'Recipient phone number is required' }
    }

    // Prepare the request body for text message
    const requestBody = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: {
        body: message
      }
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
      console.error('   Phone:', phone)
      console.error('   Status:', response.status)
      return {
        success: false,
        error: responseData.error?.message || 'Failed to send WhatsApp message',
        data: responseData
      }
    }

    // Log the message to database if pool is provided and table exists
    if (pool) {
      try {
        const customerName = `Customer_${phone}`
        
        // First try to update existing session
        const updateResult = await pool.query(`
          UPDATE whatsapp_chat_sessions
          SET 
            last_message = $1,
            last_message_time = NOW(),
            status = 'active',
            message_count = message_count + 1,
            updated_at = NOW()
          WHERE customer_phone = $2
        `, [message, phone])

        // If no rows were updated, insert a new session
        if (updateResult.rowCount === 0) {
          await pool.query(`
            INSERT INTO whatsapp_chat_sessions (customer_name, customer_phone, last_message, last_message_time, status, message_count)
            VALUES ($1, $2, $3, NOW(), 'active', 1)
          `, [customerName, phone, message])
        }
      } catch (dbErr: any) {
        // Table might not exist, or unique constraint violation (race condition)
        if (dbErr.code === '23505') {
          // Try update again if it was a race condition
          try {
            await pool.query(`
              UPDATE whatsapp_chat_sessions
              SET 
                last_message = $1,
                last_message_time = NOW(),
                status = 'active',
                message_count = message_count + 1,
                updated_at = NOW()
              WHERE customer_phone = $2
            `, [message, phone])
          } catch (retryErr: any) {
            console.error('Failed to log WhatsApp message to database:', retryErr.message)
          }
        } else {
          console.error('Failed to log WhatsApp message to database:', dbErr.message)
        }
      }
    }

    return {
      success: true,
      data: responseData
    }
  } catch (err: any) {
    console.error('WhatsApp send error:', err)
    return {
      success: false,
      error: err.message || 'Failed to send WhatsApp message'
    }
  }
}

/**
 * Send a welcome offer message to a new subscriber
 * @param phone - Recipient phone number
 * @param name - Subscriber name (optional)
 * @param pool - Database pool (optional, for logging)
 * @returns Promise with success status
 */
export async function sendWelcomeOffer(
  phone: string,
  name?: string,
  pool?: Pool
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get welcome offer message from database settings or use default
    let welcomeMessage = `🎉 Welcome to NEFÖL! 🎉

Thank you for subscribing to our WhatsApp updates!

As a special welcome gift, you now have access to:
✨ Exclusive member-only offers
🎁 Early access to new collections
💎 Special discounts and promotions
📱 Real-time updates on sales and launches

We're excited to have you in the NEFÖL family! Stay tuned for amazing fashion updates.`

    // Try to get custom welcome message from database
    if (pool) {
      try {
        const result = await pool.query(
          'SELECT setting_value FROM store_settings WHERE setting_key = $1',
          ['whatsapp_welcome_message']
        )
        if (result.rows.length > 0 && result.rows[0].setting_value) {
          welcomeMessage = result.rows[0].setting_value
        }
      } catch (err) {
        // If setting doesn't exist, use default message
        console.log('Using default welcome message')
      }
    }

    // Personalize message with name if provided
    if (name) {
      welcomeMessage = `Hi ${name}! 👋\n\n${welcomeMessage}`
    }

    // Send the welcome message
    const result = await sendWhatsAppMessage(phone, welcomeMessage, pool)

    if (result.success) {
      console.log(`✅ Welcome offer sent to ${phone}`)
    } else {
      console.error(`❌ Failed to send welcome offer to ${phone}:`, result.error)
    }

    return result
  } catch (err: any) {
    console.error('Error sending welcome offer:', err)
    return {
      success: false,
      error: err.message || 'Failed to send welcome offer'
    }
  }
}

/**
 * Verify webhook signature from Meta
 * @param payload - Raw request body (should be string or Buffer)
 * @param signature - X-Hub-Signature-256 header value
 * @param appSecret - WhatsApp App Secret from environment
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: any,
  signature: string,
  appSecret: string
): boolean {
  try {
    // Signature format: sha256=<hash>
    if (!signature.startsWith('sha256=')) {
      console.error('Invalid signature format')
      return false
    }

    const expectedSignature = signature.substring(7) // Remove 'sha256=' prefix

    // Convert payload to string if it's an object
    const payloadString = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload)

    // Calculate HMAC SHA256
    const hmac = crypto.createHmac('sha256', appSecret)
    hmac.update(payloadString)
    const calculatedSignature = hmac.digest('hex')

    // Compare signatures using constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(calculatedSignature, 'hex')
    )

    if (!isValid) {
      console.error('Signature mismatch')
      console.error('Expected:', calculatedSignature)
      console.error('Received:', expectedSignature)
    }

    return isValid
  } catch (err: any) {
    console.error('Error verifying webhook signature:', err)
    return false
  }
}

/**
 * Extract message content from different message types
 * @param message - WhatsApp message object from webhook
 * @returns Extracted content (text, media URL, etc.)
 */
export function extractMessageContent(message: any): {
  type: string
  text?: string
  mediaUrl?: string
  caption?: string
  mimeType?: string
  fileName?: string
  documentId?: string
  imageId?: string
  videoId?: string
  audioId?: string
} {
  const messageType = message.type || 'unknown'

  switch (messageType) {
    case 'text':
      return {
        type: 'text',
        text: message.text?.body || ''
      }

    case 'image':
      return {
        type: 'image',
        mediaUrl: message.image?.id ? `https://graph.facebook.com/v22.0/${message.image.id}` : undefined,
        caption: message.image?.caption || '',
        mimeType: message.image?.mime_type,
        imageId: message.image?.id
      }

    case 'video':
      return {
        type: 'video',
        mediaUrl: message.video?.id ? `https://graph.facebook.com/v22.0/${message.video.id}` : undefined,
        caption: message.video?.caption || '',
        mimeType: message.video?.mime_type,
        videoId: message.video?.id
      }

    case 'audio':
      return {
        type: 'audio',
        mediaUrl: message.audio?.id ? `https://graph.facebook.com/v22.0/${message.audio.id}` : undefined,
        mimeType: message.audio?.mime_type,
        audioId: message.audio?.id
      }

    case 'document':
      return {
        type: 'document',
        mediaUrl: message.document?.id ? `https://graph.facebook.com/v22.0/${message.document.id}` : undefined,
        caption: message.document?.caption || '',
        fileName: message.document?.filename,
        mimeType: message.document?.mime_type,
        documentId: message.document?.id
      }

    case 'location':
      return {
        type: 'location',
        text: `Location: ${message.location?.latitude}, ${message.location?.longitude}`
      }

    case 'contacts':
      return {
        type: 'contacts',
        text: 'Contact shared'
      }

    case 'sticker':
      return {
        type: 'sticker',
        mediaUrl: message.sticker?.id ? `https://graph.facebook.com/v22.0/${message.sticker.id}` : undefined,
        mimeType: message.sticker?.mime_type
      }

    default:
      return {
        type: messageType,
        text: JSON.stringify(message)
      }
  }
}

/**
 * Process incoming WhatsApp message from webhook
 * @param pool - Database pool
 * @param message - Message object from webhook
 * @param metadata - Metadata from webhook (phone number, etc.)
 */
export async function processIncomingMessage(
  pool: Pool,
  message: any,
  metadata?: any
): Promise<void> {
  try {
    const messageId = message.id
    const fromPhone = message.from
    const timestamp = message.timestamp ? new Date(parseInt(message.timestamp) * 1000) : new Date()

    // Extract message content
    const content = extractMessageContent(message)
    
    // Handle COD confirmation (YES/NO replies)
    if (content.type === 'text' && content.text) {
      const normalizedText = content.text.trim().toUpperCase()
      if (normalizedText === 'YES' || normalizedText === 'NO') {
        try {
          // Find pending COD order for this phone
          const orderResult = await pool.query(
            `SELECT id, order_number, order_id, status, payment_method, total 
             FROM orders 
             WHERE customer_phone = $1 
               AND (payment_method ILIKE '%cod%' OR payment_method ILIKE '%cash%')
               AND status IN ('pending', 'confirmed', 'processing')
             ORDER BY created_at DESC 
             LIMIT 1`,
            [fromPhone]
          )
          
          if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0]
            const orderId = order.order_number || order.order_id || order.id.toString()
            
            if (normalizedText === 'YES') {
              // Confirm COD order
              await pool.query(
                `UPDATE orders 
                 SET status = 'confirmed', 
                     updated_at = NOW() 
                 WHERE id = $1`,
                [order.id]
              )
              console.log(`✅ COD order confirmed via WhatsApp: ${orderId}`)
              
              // Send confirmation message
              await sendWhatsAppMessage(
                fromPhone,
                `Thank you! Your COD order #${orderId} has been confirmed. We'll process it shortly.`,
                pool
              )
            } else {
              // Cancel COD order
              await pool.query(
                `UPDATE orders 
                 SET status = 'cancelled', 
                     updated_at = NOW() 
                 WHERE id = $1`,
                [order.id]
              )
              console.log(`❌ COD order cancelled via WhatsApp: ${orderId}`)
              
              // Send cancellation message
              await sendWhatsAppMessage(
                fromPhone,
                `Your COD order #${orderId} has been cancelled as requested.`,
                pool
              )
            }
            
            // Return early - COD handling complete
            return
          }
        } catch (codErr: any) {
          console.error('Error handling COD confirmation:', codErr)
          // Continue with normal message processing
        }
      }
    }

    // Log incoming message to database
    try {
      await pool.query(`
        INSERT INTO whatsapp_incoming_messages (
          message_id, from_phone, to_phone, message_type, message_text,
          media_url, timestamp, status, raw_payload, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (message_id) DO NOTHING
      `, [
        messageId,
        fromPhone,
        metadata?.phone_number_id || null,
        content.type,
        content.text || content.caption || null,
        content.mediaUrl || null,
        timestamp,
        'received',
        JSON.stringify(message)
      ])
    } catch (dbErr: any) {
      // Table might not exist yet, log error but continue
      console.error('Failed to log incoming message to database:', dbErr.message)
    }

    // Update or create chat session
    try {
      const customerName = `Customer_${fromPhone}`
      const lastMessage = content.text || content.caption || `[${content.type}]`

      // First try to update existing session
      const updateResult = await pool.query(`
        UPDATE whatsapp_chat_sessions
        SET 
          last_message = $1,
          last_message_time = $2,
          status = 'active',
          message_count = message_count + 1,
          updated_at = NOW()
        WHERE customer_phone = $3
      `, [lastMessage, timestamp, fromPhone])

      // If no rows were updated, insert a new session
      if (updateResult.rowCount === 0) {
        await pool.query(`
          INSERT INTO whatsapp_chat_sessions (
            customer_name, customer_phone, last_message, last_message_time, status, message_count
          )
          VALUES ($1, $2, $3, $4, 'active', 1)
        `, [customerName, fromPhone, lastMessage, timestamp])
      }
    } catch (dbErr: any) {
      console.error('Failed to update chat session:', dbErr.message)
      // If it's a unique constraint violation, try update again (race condition)
      if (dbErr.code === '23505') {
        try {
          await pool.query(`
            UPDATE whatsapp_chat_sessions
            SET 
              last_message = $1,
              last_message_time = $2,
              status = 'active',
              message_count = message_count + 1,
              updated_at = NOW()
            WHERE customer_phone = $3
          `, [content.text || content.caption || `[${content.type}]`, timestamp, fromPhone])
        } catch (retryErr: any) {
          console.error('Failed to update chat session on retry:', retryErr.message)
        }
      }
    }

    console.log(`✅ Processed incoming ${content.type} message from ${fromPhone}`)
  } catch (err: any) {
    console.error('Error processing incoming message:', err)
    throw err
  }
}

/**
 * Process message status update from webhook
 * @param pool - Database pool
 * @param status - Status object from webhook
 */
export async function processStatusUpdate(
  pool: Pool,
  status: any
): Promise<void> {
  try {
    const messageId = status.id
    const statusType = status.status // 'sent', 'delivered', 'read', 'failed'
    const timestamp = status.timestamp ? new Date(parseInt(status.timestamp) * 1000) : new Date()
    const recipientId = status.recipient_id

    // Log status update to database
    try {
      await pool.query(`
        INSERT INTO whatsapp_message_status (
          message_id, status, timestamp, error_code, error_message, created_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        messageId,
        statusType,
        timestamp,
        status.errors?.[0]?.code || null,
        status.errors?.[0]?.title || status.errors?.[0]?.message || null
      ])
    } catch (dbErr: any) {
      // Table might not exist yet, log error but continue
      console.error('Failed to log status update to database:', dbErr.message)
    }

    console.log(`✅ Processed status update: ${statusType} for message ${messageId}`)

    // If message failed, log error details
    if (statusType === 'failed' && status.errors) {
      console.error(`❌ Message ${messageId} failed:`, status.errors)
    }
  } catch (err: any) {
    console.error('Error processing status update:', err)
    throw err
  }
}

