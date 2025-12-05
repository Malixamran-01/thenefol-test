/**
 * WhatsApp Webhook Routes
 * 
 * Handles Meta's WhatsApp Business Cloud API webhook requests:
 * - GET /webhook: Webhook verification
 * - POST /webhook: Incoming messages and status updates
 * 
 * @module routes/whatsappWebhook
 */

import { Pool } from 'pg'
import { Request, Response } from 'express'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { verifyWebhookSignature, processIncomingMessage, processStatusUpdate } from '../utils/whatsappUtils'
import { WhatsAppService } from '../services/whatsappService'

/**
 * GET endpoint for Meta webhook verification
 * Meta sends: hub.mode, hub.verify_token, hub.challenge
 * We verify the token and return the challenge
 */
export const verifyWebhook = async (req: Request, res: Response) => {
  try {
    // Parse query parameters manually to handle dots properly
    // Express may not parse query params with dots correctly by default
    // Also, when behind nginx proxy, req.url might not have query string, use req.originalUrl
    let mode: string | undefined
    let token: string | undefined
    let challenge: string | undefined

    // Try accessing via req.query first (Express should parse these)
    mode = req.query['hub.mode'] as string | undefined
    token = req.query['hub.verify_token'] as string | undefined
    challenge = req.query['hub.challenge'] as string | undefined

    // If not found in req.query, try parsing from originalUrl (includes query string even when proxied)
    if (!mode || !token || !challenge) {
      // Use originalUrl which preserves query string even when behind proxy
      const fullUrl = (req as any).originalUrl || req.url || ''
      const queryString = fullUrl.split('?')[1] || ''
      const params = new URLSearchParams(queryString)
      
      mode = mode || params.get('hub.mode') || undefined
      token = token || params.get('hub.verify_token') || undefined
      challenge = challenge || params.get('hub.challenge') || undefined
    }

    // Debug logging
    console.log('🔍 Webhook verification request:')
    console.log('   req.url:', req.url)
    console.log('   req.originalUrl:', (req as any).originalUrl || 'not available')
    console.log('   req.query:', JSON.stringify(req.query))
    console.log('   Query string from URL:', ((req as any).originalUrl || req.url || '').split('?')[1] || 'none')
    console.log('   Mode:', mode || 'undefined')
    console.log('   Token received:', token ? '***' + token.slice(-4) : 'undefined')
    console.log('   Challenge:', challenge ? 'present (' + challenge.length + ' chars)' : 'missing')

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    if (!verifyToken) {
      console.error('❌ WHATSAPP_VERIFY_TOKEN not configured in environment')
      return res.status(500).send('Webhook verification token not configured')
    }

    // Verify the mode and token
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified successfully')
      return res.status(200).send(challenge || '')
    } else {
      console.error('❌ WhatsApp webhook verification failed')
      console.error('   Expected token:', verifyToken ? '***' + verifyToken.slice(-4) : 'not set')
      console.error('   Received token:', token ? '***' + token.slice(-4) : 'undefined')
      console.error('   Mode:', mode || 'undefined')
      console.error('   Challenge:', challenge ? 'present' : 'missing')
      return res.status(403).send('Forbidden')
    }
  } catch (err: any) {
    console.error('Webhook verification error:', err)
    console.error('   Error details:', err.message)
    if (err.stack) {
      console.error('   Stack:', err.stack)
    }
    return res.status(500).send('Internal server error')
  }
}

/**
 * POST endpoint to receive incoming messages and status updates
 * Handles:
 * - Incoming messages (text, image, document, etc.)
 * - Message status updates (sent, delivered, read, failed)
 */
export const handleWebhook = async (pool: Pool, req: Request, res: Response) => {
  try {
    // Get raw body for signature verification (express.raw() middleware provides Buffer)
    // CRITICAL: The body must be the exact raw bytes as received from Meta
    let rawBody: Buffer
    let bodyString: string

    if (Buffer.isBuffer(req.body)) {
      // Body is already a Buffer (from express.raw())
      rawBody = req.body
      bodyString = rawBody.toString('utf-8')
    } else if (typeof req.body === 'string') {
      // Body is a string (shouldn't happen with express.raw(), but handle it)
      bodyString = req.body
      rawBody = Buffer.from(bodyString, 'utf-8')
    } else {
      // Body was parsed as JSON (shouldn't happen, but handle it)
      console.error('❌ Body was parsed as JSON instead of raw Buffer')
      bodyString = JSON.stringify(req.body)
      rawBody = Buffer.from(bodyString, 'utf-8')
    }

    // Debug logging for signature verification
    console.log('📨 Webhook POST request received:')
    console.log('   Body type:', Buffer.isBuffer(req.body) ? 'Buffer' : typeof req.body)
    console.log('   Body length:', rawBody.length, 'bytes')
    console.log('   Content-Type:', req.headers['content-type'])

    // Verify webhook signature for security
    const signature = req.headers['x-hub-signature-256'] as string
    if (!signature) {
      console.error('❌ Missing X-Hub-Signature-256 header')
      return res.status(401).json({ error: 'Missing signature' })
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET
    if (!appSecret) {
      console.error('❌ WHATSAPP_APP_SECRET not configured')
      // In development, we might skip signature verification
      // In production, this should be required
      console.warn('⚠️  Proceeding without signature verification (not recommended for production)')
    } else {
      // Use the raw body string for signature verification
      // Meta calculates signature on the exact raw request body
      const isValid = verifyWebhookSignature(bodyString, signature, appSecret)
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        console.error('   Body preview (first 200 chars):', bodyString.substring(0, 200))
        return res.status(401).json({ error: 'Invalid signature' })
      }
      console.log('✅ Webhook signature verified successfully')
    }

    // Parse JSON body for processing
    const body = JSON.parse(bodyString)

    // Meta webhook payload structure:
    // {
    //   "object": "whatsapp_business_account",
    //   "entry": [{
    //     "changes": [{
    //       "value": {
    //         "messaging_product": "whatsapp",
    //         "messages": [...], // incoming messages
    //         "statuses": [...]   // status updates
    //       }
    //     }]
    //   }]
    // }

    if (body.object !== 'whatsapp_business_account') {
      console.log('⚠️  Received webhook for non-WhatsApp object:', body.object)
      return res.status(200).json({ status: 'ignored' })
    }

    // Process each entry
    if (body.entry && Array.isArray(body.entry)) {
      for (const entry of body.entry) {
        if (entry.changes && Array.isArray(entry.changes)) {
          for (const change of entry.changes) {
            const value = change.value

            if (!value || value.messaging_product !== 'whatsapp') {
              continue
            }

            // Initialize WhatsApp service for processing
            const whatsappService = new WhatsAppService(pool)

            // Process incoming messages
            if (value.messages && Array.isArray(value.messages)) {
              for (const message of value.messages) {
                try {
                  // Use service method for better abstraction
                  await whatsappService.handleIncomingMessage(message)
                  // Also use utility for database logging (backward compatibility)
                  await processIncomingMessage(pool, message, value.metadata)
                } catch (err: any) {
                  console.error('Error processing incoming message:', err)
                  // Continue processing other messages even if one fails
                }
              }
            }

            // Process status updates
            if (value.statuses && Array.isArray(value.statuses)) {
              for (const status of value.statuses) {
                try {
                  // Use service method for better abstraction
                  await whatsappService.handleStatusUpdate(status)
                  // Also use utility for database logging (backward compatibility)
                  await processStatusUpdate(pool, status)
                } catch (err: any) {
                  console.error('Error processing status update:', err)
                  // Continue processing other statuses even if one fails
                }
              }
            }
          }
        }
      }
    }

    // Always return 200 OK to acknowledge receipt
    // Meta will retry if we return an error
    return res.status(200).json({ status: 'ok' })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    // Still return 200 to prevent Meta from retrying
    // Log the error for debugging
    return res.status(200).json({ status: 'error', message: err.message })
  }
}

