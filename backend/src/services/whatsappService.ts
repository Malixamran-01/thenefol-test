/**
 * WhatsApp Business Cloud API Service
 * 
 * This service class provides methods for sending WhatsApp messages,
 * handling OTPs, order notifications, templates, and processing webhooks.
 * 
 * @module services/whatsappService
 */

import { Pool } from 'pg'
import { getWhatsAppApiUrl, getPhoneNumberId, getAccessToken, whatsappRequest } from '../config/whatsapp'
import { sendWhatsAppMessage as sendMessageUtil } from '../utils/whatsappUtils'
import { sendWhatsAppTemplate, TemplateVariable } from '../utils/whatsappTemplateHelper'

/**
 * WhatsApp Service Class
 * Provides all WhatsApp Business API functionality
 */
export class WhatsAppService {
  private pool?: Pool

  constructor(pool?: Pool) {
    this.pool = pool
  }

  /**
   * Send a simple text message via WhatsApp
   * 
   * @param {string} to - Recipient phone number (with country code, no spaces)
   * @param {string} message - Text message to send
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   * 
   * @example
   * const service = new WhatsAppService(pool)
   * const result = await service.sendText('919876543210', 'Hello!')
   */
  async sendText(to: string, message: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      return await sendMessageUtil(to, message, this.pool)
    } catch (error: any) {
      console.error('Error in sendText:', error)
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      }
    }
  }

  /**
   * Send OTP via WhatsApp using nefol_verify_code template
   * Template: nefol_verify_code
   * Variables: [otp] - Requires 1 body parameter: {{1}} = OTP code
   * Also includes button component with copy-code functionality
   * 
   * @param {string} phone - Recipient phone number
   * @param {string} otp - OTP code to send (6-digit)
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendOTPWhatsApp(phone: string, otp: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      // Template expects 1 parameter: the OTP code
      // Template format: "*{{1}}* is your verification code. For your security, do not share this code."
      const variables: TemplateVariable[] = [
        { type: 'text', text: otp }
      ]
      
      const result = await sendWhatsAppTemplate(phone, 'nefol_verify_code', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Log error only - no fallback for authentication templates
      console.error('❌ WhatsApp OTP template send failed:', result.error?.message)
      return { ok: false, error: result.error }
    } catch (error: any) {
      // Log error only
      console.error('❌ Error in sendOTPWhatsApp:', error.message)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send OTP via WhatsApp (legacy method, uses template)
   * 
   * @param {string} to - Recipient phone number
   * @param {string} otp - OTP code to send
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async sendOTP(to: string, otp: string): Promise<{ success: boolean; data?: any; error?: string }> {
    const result = await this.sendOTPWhatsApp(to, otp)
    return {
      success: result.ok,
      data: result.providerId ? { messageId: result.providerId } : undefined,
      error: result.error?.message
    }
  }

  /**
   * Send a template message via WhatsApp
   * 
   * @param {string} to - Recipient phone number
   * @param {string} templateName - Template name (must be approved in Meta Business)
   * @param {string} languageCode - Language code (e.g., 'en', 'hi_IN')
   * @param {Array} components - Template components (body parameters, buttons, etc.)
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   * 
   * @example
   * const service = new WhatsAppService(pool)
   * const result = await service.sendTemplate(
   *   '919876543210',
   *   'otp_verification',
   *   'en',
   *   [{
   *     type: 'body',
   *     parameters: [{ type: 'text', text: '123456' }]
   *   }]
   * )
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components: any[] = []
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const phoneNumberId = getPhoneNumberId()
      const endpoint = `/${phoneNumberId}/messages`

      const requestBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode
          },
          components: components
        }
      }

      const response = await whatsappRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Log to database if pool is available
      if (this.pool) {
        try {
          const customerName = `Customer_${to}`
          const lastMessage = `Template: ${templateName}`
          
          const updateResult = await this.pool.query(`
            UPDATE whatsapp_chat_sessions
            SET 
              last_message = $1,
              last_message_time = NOW(),
              status = 'active',
              message_count = COALESCE(message_count, 0) + 1,
              updated_at = NOW()
            WHERE customer_phone = $2
          `, [lastMessage, to])

          if (updateResult.rowCount === 0) {
            await this.pool.query(`
              INSERT INTO whatsapp_chat_sessions (customer_name, customer_phone, last_message, last_message_time, status, message_count)
              VALUES ($1, $2, $3, NOW(), 'active', 1)
            `, [customerName, to, lastMessage])
          }
        } catch (dbErr: any) {
          console.error('Failed to log template message to database:', dbErr.message)
        }
      }

      return {
        success: true,
        data: response
      }
    } catch (error: any) {
      console.error('Error in sendTemplate:', error)
      return {
        success: false,
        error: error.message || 'Failed to send template message'
      }
    }
  }

  /**
   * Send order notification via WhatsApp
   * Format: "Hi {name}, your order #{orderId} is confirmed. Total: ₹{total}. Items: {items}"
   * 
   * @param {string} to - Recipient phone number
   * @param {Object} orderObject - Order object with name, orderId, total, items
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   * 
   * @example
   * const service = new WhatsAppService(pool)
   * const result = await service.sendOrderNotification('919876543210', {
   *   name: 'Rahul',
   *   orderId: 'NF12345',
   *   total: 899,
   *   items: ['Item 1', 'Item 2']
   * })
   */
  async sendOrderNotification(
    to: string,
    orderObject: {
      name: string
      orderId: string
      total: number
      items: string[]
    }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const itemsList = orderObject.items.join(', ')
      const message = `Hi ${orderObject.name}, your order #${orderObject.orderId} is confirmed. Total: ₹${orderObject.total}. Items: ${itemsList}`
      
      return await this.sendText(to, message)
    } catch (error: any) {
      console.error('Error in sendOrderNotification:', error)
      return {
        success: false,
        error: error.message || 'Failed to send order notification'
      }
    }
  }

  /**
   * Handle incoming message from webhook
   * Parses contacts, messages, and message types (text, button, interactive)
   * 
   * @param {Object} payload - Webhook payload from Meta
   * @returns {Promise<void>}
   * 
   * @example
   * const service = new WhatsAppService(pool)
   * await service.handleIncomingMessage({
   *   id: 'wamid.xxx',
   *   from: '919876543210',
   *   type: 'text',
   *   text: { body: 'Hello' },
   *   timestamp: '1234567890'
   * })
   */
  async handleIncomingMessage(payload: any): Promise<void> {
    try {
      if (!this.pool) {
        console.error('Database pool not available for handling incoming message')
        return
      }

      const { processIncomingMessage } = await import('../utils/whatsappUtils')
      await processIncomingMessage(this.pool, payload)
    } catch (error: any) {
      console.error('Error in handleIncomingMessage:', error)
      throw error
    }
  }

  /**
   * Handle status update from webhook
   * Handles delivery, read, and failed events
   * 
   * @param {Object} payload - Status update payload from Meta
   * @returns {Promise<void>}
   * 
   * @example
   * const service = new WhatsAppService(pool)
   * await service.handleStatusUpdate({
   *   id: 'wamid.xxx',
   *   status: 'delivered',
   *   timestamp: '1234567890',
   *   recipient_id: '919876543210'
   * })
   */
  async handleStatusUpdate(payload: any): Promise<void> {
    try {
      if (!this.pool) {
        console.error('Database pool not available for handling status update')
        return
      }

      const { processStatusUpdate } = await import('../utils/whatsappUtils')
      await processStatusUpdate(this.pool, payload)
    } catch (error: any) {
      console.error('Error in handleStatusUpdate:', error)
      throw error
    }
  }

  /**
   * Send password reset code via WhatsApp using nefol_reset_password template
   * Template: nefol_reset_password
   * Variables: [resetCode] - Requires 1 parameter: {{1}} = Reset Code or Link
   * Also includes button component with copy-code functionality
   * 
   * @param {string} phone - Recipient phone number
   * @param {string} code - Reset code (6-digit OTP)
   * @param {string} name - User name (optional)
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendResetPasswordWhatsApp(phone: string, code: string, name: string = ''): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      // Template expects 1 parameter (reset code)
      // Authentication templates must use en and NO fallback to plain text
      const variables: TemplateVariable[] = [
        { type: 'text', text: code }
      ]
      
      const result = await sendWhatsAppTemplate(phone, 'nefol_reset_password', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // NO fallback to plain text for authentication templates
      // Return error to caller - they must handle it
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendResetPasswordWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send signup success message via WhatsApp using nefol_signup_success template
   * Template: nefol_signup_success
   * Variables: [name]
   * 
   * @param {any} user - User object with name, phone, email
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendSignupWhatsApp(user: { name: string; phone?: string; email?: string }): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' }
      ]
      
      // Authentication templates must use en and NO fallback to plain text
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_signup_success', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // NO fallback to plain text for authentication templates
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendSignupWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send login alert via WhatsApp using nefol_login_alert template
   * Template: nefol_login_alert
   * Variables: [name, deviceInfo, timestamp]
   * 
   * @param {any} user - User object with name, phone
   * @param {string} deviceInfo - Device/browser information
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendLoginAlertWhatsApp(user: { name: string; phone?: string }, deviceInfo: string = 'Unknown device'): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: deviceInfo },
        { type: 'text', text: timestamp }
      ]
      
      // Authentication templates must use en and NO fallback to plain text
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_login_alert', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // NO fallback to plain text for authentication templates
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendLoginAlertWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send cart recovery message via WhatsApp using nefol_cart_recover template
   * Template: nefol_cart_recover
   * Variables: [name, cartUrl] - Requires 2 parameters: {{1}} = User Name, {{2}} = Cart Link/Items
   * 
   * @param {any} user - User object with name, phone
   * @param {string} cartUrl - URL to view cart
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendCartRecoveryWhatsApp(user: { name: string; phone?: string }, cartUrl: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const frontendUrl = process.env.FRONTEND_URL || process.env.USER_PANEL_URL || 'https://thenefol.com'
      const fullCartUrl = cartUrl.startsWith('http') ? cartUrl : `${frontendUrl}${cartUrl.startsWith('/') ? '' : '/'}${cartUrl}`
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: fullCartUrl }
      ]
      
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_cart_recover', variables)
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Fallback to plain text
      if (result.error?.isTemplateError) {
        const fallbackResult = await this.sendText(user.phone, `Hi ${user.name}, you have items in your cart. Complete your purchase: ${fullCartUrl}`)
        return {
          ok: fallbackResult.success,
          providerId: fallbackResult.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendCartRecoveryWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send order shipped notification via WhatsApp using nefol_order_shipped template
   * Template: nefol_order_shipped
   * Variables: [name, orderId, tracking] - Requires 3 parameters: {{1}} = User Name, {{2}} = Order ID, {{3}} = Tracking Number
   * 
   * @param {any} user - User object with name, phone
   * @param {string} orderId - Order ID
   * @param {string} tracking - Tracking URL or number
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendOrderShippedWhatsApp(user: { name: string; phone?: string }, orderId: string, tracking: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: orderId },
        { type: 'text', text: tracking }
      ]
      
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_order_shipped', variables)
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Fallback to plain text
      if (result.error?.isTemplateError) {
        const fallbackResult = await this.sendText(user.phone, `Hi ${user.name}, your order #${orderId} has been shipped! Track: ${tracking}`)
        return {
          ok: fallbackResult.success,
          providerId: fallbackResult.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendOrderShippedWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send order delivered notification via WhatsApp using nefol_order_delivered template
   * Template: nefol_order_delivered
   * Variables: [name, orderId]
   * 
   * @param {any} user - User object with name, phone
   * @param {string} orderId - Order ID
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendOrderDeliveredWhatsApp(user: { name: string; phone?: string }, orderId: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: orderId }
      ]
      
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_order_delivered', variables)
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Fallback to plain text
      if (result.error?.isTemplateError) {
        const fallbackResult = await this.sendText(user.phone, `Hi ${user.name}, your order #${orderId} has been delivered! Thank you for shopping with us.`)
        return {
          ok: fallbackResult.success,
          providerId: fallbackResult.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendOrderDeliveredWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send refund notification via WhatsApp using nefol_refund_1 template
   * Template: nefol_refund_1
   * Variables: [name, orderId, amount] - Requires 3 parameters: {{1}} = User Name, {{2}} = Order ID, {{3}} = Refund Amount
   * 
   * @param {any} user - User object with name, phone
   * @param {string} orderId - Order ID
   * @param {number} amount - Refund amount
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendRefundWhatsApp(user: { name: string; phone?: string }, orderId: string, amount: number): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: orderId },
        { type: 'text', text: `₹${amount}` }
      ]
      
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_refund_1', variables)
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Fallback to plain text
      if (result.error?.isTemplateError) {
        const fallbackResult = await this.sendText(user.phone, `Hi ${user.name}, refund of ₹${amount} for order #${orderId} has been processed.`)
        return {
          ok: fallbackResult.success,
          providerId: fallbackResult.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendRefundWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send COD verification request via WhatsApp using nefol_cod_verify template
   * Template: nefol_cod_verify
   * Variables: [name, orderId] - Requires 2 parameters: {{1}} = User Name, {{2}} = Order ID/OTP
   * 
   * @param {any} user - User object with name, phone
   * @param {string} orderId - Order ID
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendCODVerifyWhatsApp(user: { name: string; phone?: string }, orderId: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      // Template expects only 2 parameters: name and order number
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' },
        { type: 'text', text: orderId }
      ]
      
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_cod_verify', variables)
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // Fallback to plain text
      if (result.error?.isTemplateError) {
        const fallbackResult = await this.sendText(user.phone, `Hi ${user.name}, please confirm your COD order #${orderId}. Reply YES to confirm or NO to cancel.`)
        return {
          ok: fallbackResult.success,
          providerId: fallbackResult.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendCODVerifyWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send affiliate verification code via WhatsApp
   * First tries to use nefol_affiliate template (AUTHENTICATION category), falls back to plain text if template not available
   * 
   * Template: nefol_affiliate (AUTHENTICATION category - when approved in Meta Business Manager)
   * Template structure: "This OTP code is for {{1}} your {{2}} account and linking it to {{3}}. OTP: {{4}}. Do not share it with anyone, even to {{5}}, or they'll be able to access your account."
   * Variables: [creating, NEFOL, affiliate, verificationCode (number), NEFOL]
   * Category: AUTHENTICATION (required for OTP codes)
   * Language: English (US) - en_US
   * 
   * @param {string} phone - Recipient phone number
   * @param {string} name - Affiliate partner name (not used in template but kept for backward compatibility)
   * @param {string} verificationCode - 20-digit OTP code
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendAffiliateCodeWhatsApp(phone: string, name: string, verificationCode: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!phone) {
        return { ok: false, error: { message: 'Phone number not provided' } }
      }

      // Try to use template first (if approved in Meta Business Manager)
      // Note: This template should be in AUTHENTICATION category
      // Template structure: "This OTP code is for {{1}} your {{2}} account and linking it to {{3}}. OTP: {{4}}. Do not share it with anyone, even to {{5}}, or they'll be able to access your account."
      try {
        const variables: TemplateVariable[] = [
          { type: 'text', text: 'creating' },        // {{1}} - "creating"
          { type: 'text', text: 'NEFOL' },          // {{2}} - "NEFOL"
          { type: 'text', text: 'affiliate' },      // {{3}} - "affiliate"
          { type: 'text', text: verificationCode },  // {{4}} - OTP code (as text since WhatsApp API expects text for all params in template helper, but defined as NUMBER in Meta)
          { type: 'text', text: 'NEFOL' }           // {{5}} - "NEFOL"
        ]
        
        const templateResult = await sendWhatsAppTemplate(phone, 'nefol_affiliate', variables, 'en')
        
        if (templateResult.ok) {
          console.log(`✅ Affiliate code WhatsApp sent via template (AUTHENTICATION) to: ${phone}`)
          return { ok: true, providerId: templateResult.providerId }
        }
        
        // If template fails (not approved yet), fall back to plain text
        console.warn('⚠️ Template nefol_affiliate not available, using plain text fallback')
      } catch (templateError: any) {
        console.warn('⚠️ Template error, using plain text fallback:', templateError.message)
      }

      // Fallback to plain text message (only if template not approved)
      const message = `🎉 Congratulations ${name}!\n\nYour affiliate application has been approved!\n\nYour Affiliate Verification Code:\n*${verificationCode}*\n\nPlease use this code to verify your affiliate account and start earning commissions.\n\nWelcome to the Nefol Affiliate Program! 💙\n\nFor any queries, contact us at support@thenefol.com`

      const result = await this.sendText(phone, message)
      
      if (result.success) {
        console.log(`✅ Affiliate code WhatsApp sent (plain text) to: ${phone}`)
        return { 
          ok: true, 
          providerId: result.data?.messages?.[0]?.id,
          fallbackUsed: true
        }
      }
      
      return { ok: false, error: { message: result.error || 'Failed to send WhatsApp' } }
    } catch (error: any) {
      console.error('❌ Error in sendAffiliateCodeWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send greeting message via WhatsApp using nefol_greet_1 template
   * Template: nefol_greet_1
   * Variables: [name]
   * 
   * @param {any} user - User object with name, phone
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendGreetingWhatsApp(user: { name: string; phone?: string }): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' }
      ]
      
      // Authentication templates must use en and NO fallback to plain text
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_greet_1', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // NO fallback to plain text for authentication templates
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendGreetingWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }

  /**
   * Send welcome message via WhatsApp using nefol_welcome_1 template
   * Template: nefol_welcome_1
   * Variables: [name]
   * 
   * @param {any} user - User object with name, phone
   * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
   */
  async sendWelcomeWhatsApp(user: { name: string; phone?: string }): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
    try {
      if (!user.phone) {
        return { ok: false, error: { message: 'User phone number not available' } }
      }
      
      const variables: TemplateVariable[] = [
        { type: 'text', text: user.name || 'User' }
      ]
      
      // Authentication templates must use en and NO fallback to plain text
      const result = await sendWhatsAppTemplate(user.phone, 'nefol_welcome_1', variables, 'en')
      
      if (result.ok) {
        return { ok: true, providerId: result.providerId }
      }
      
      // NO fallback to plain text for authentication templates
      return { ok: false, error: result.error }
    } catch (error: any) {
      console.error('Error in sendWelcomeWhatsApp:', error)
      return { ok: false, error: { message: error.message } }
    }
  }
}

/**
 * Create a WhatsApp service instance
 * 
 * @param {Pool} pool - Database pool (optional)
 * @returns {WhatsAppService}
 */
export function createWhatsAppService(pool?: Pool): WhatsAppService {
  return new WhatsAppService(pool)
}

