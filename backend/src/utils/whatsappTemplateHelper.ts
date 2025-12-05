/**
 * Low-level WhatsApp Template Helper
 * 
 * Provides core template sending functionality with retry logic,
 * error handling, and E.164 phone number validation.
 * 
 * @module utils/whatsappTemplateHelper
 */

import { getWhatsAppApiUrl, getPhoneNumberIdFromEnv, getAccessToken } from '../config/whatsapp'

export interface TemplateVariable {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
  image?: { link: string }
  document?: { link: string; filename?: string }
  video?: { link: string }
}

export interface SendTemplateResult {
  ok: boolean
  providerId?: string
  error?: {
    code: number
    message: string
    isTemplateError: boolean
    isPermanent: boolean
  }
}

/**
 * Normalize phone number to E.164 format
 * Accepts formats like: 919876543210, +919876543210, 91 98765 43210
 * Returns: 919876543210 (without +)
 * 
 * @param {string} phone - Phone number in various formats
 * @returns {string} Normalized phone number
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all spaces, dashes, parentheses, and plus signs
  let normalized = phone.replace(/[\s+\-()]/g, '')
  
  // If starts with +, remove it
  if (normalized.startsWith('+')) {
    normalized = normalized.substring(1)
  }
  
  // If Indian number starts with 0, remove it (e.g., 09876543210 -> 9876543210)
  if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = normalized.substring(1)
  }
  
  // If Indian number without country code, add 91
  if (normalized.length === 10 && !normalized.startsWith('91')) {
    normalized = '91' + normalized
  }
  
  return normalized
}

/**
 * Send WhatsApp template message with retry logic
 * 
 * Template: nefol_verify_code, nefol_reset_password, nefol_order_delivered, etc.
 * Variables are converted to components.body.parameters in order
 * 
 * @param {string} to - Recipient phone number (will be normalized to E.164)
 * @param {string} templateName - Template name (e.g., 'nefol_verify_code')
 * @param {TemplateVariable[]} variables - Template variables in order
 * @param {string} languageCode - Language code (default: 'en')
 * @returns {Promise<SendTemplateResult>} Result with provider message ID or error
 * 
 * @example
 * await sendWhatsAppTemplate('919876543210', 'nefol_verify_code', [
 *   { type: 'text', text: '123456' },
 *   { type: 'text', text: '5' }
 * ])
 */
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  variables: TemplateVariable[] = [],
  languageCode: string = 'en'
): Promise<SendTemplateResult> {
  try {
    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(to)
    
    // Validate phone format (should be digits only, 10-15 digits)
    if (!/^\d{10,15}$/.test(normalizedPhone)) {
      return {
        ok: false,
        error: {
          code: 400,
          message: `Invalid phone number format: ${to}`,
          isTemplateError: false,
          isPermanent: true
        }
      }
    }
    
    const phoneNumberId = getPhoneNumberIdFromEnv()
    const baseUrl = getWhatsAppApiUrl()
    const accessToken = getAccessToken()
    const endpoint = `${baseUrl}/${phoneNumberId}/messages`
    
    // Convert variables to template components
    // Templates expect OTP structure with body + URL button
    const addOtpComponents = (otpValue: string) => {
      components.push({
        type: 'body',
        parameters: [
          {
            type: 'text',
            text: otpValue
          }
        ]
      })
      
      components.push({
        type: 'button',
        sub_type: 'url',
        index: 0,
        parameters: [
          {
            type: 'text',
            text: otpValue
          }
        ]
      })
    }
    const bodyParameters = variables.map(variable => {
      if (variable.type === 'text') {
        return { type: 'text', text: variable.text || '' }
      } else if (variable.type === 'currency') {
        return {
          type: 'currency',
          currency: variable.currency
        }
      } else if (variable.type === 'date_time') {
        return {
          type: 'date_time',
          date_time: variable.date_time
        }
      } else if (variable.type === 'image') {
        return {
          type: 'image',
          image: variable.image
        }
      } else if (variable.type === 'document') {
        return {
          type: 'document',
          document: variable.document
        }
      } else if (variable.type === 'video') {
        return {
          type: 'video',
          video: variable.video
        }
      }
      return { type: 'text', text: '' }
    })
    
    // Build components array
    const components: any[] = []
    
    // Special handling for nefol_verify_code (Authentication template with copy-code button)
    if (templateName === 'nefol_verify_code' && bodyParameters.length > 0) {
      const otp = bodyParameters[0]?.text || ''
      addOtpComponents(otp)
    } else if (templateName === 'nefol_login_otp' && bodyParameters.length > 0) {
      const otp = bodyParameters[0]?.text || ''
      addOtpComponents(otp)
    } else if (templateName === 'nefol_reset_password' && bodyParameters.length > 0) {
      const resetCode = bodyParameters[0]?.text || ''
      addOtpComponents(resetCode)
    } else {
      // Standard template handling
      if (bodyParameters.length > 0) {
        components.push({
          type: 'body',
          parameters: bodyParameters
        })
      }
    }
    
    const requestBody = {
      messaging_product: 'whatsapp',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    }
    
    // Retry logic: 1 retry for transient 5xx errors
    let lastError: any = null
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retrying WhatsApp template send (attempt ${attempt + 1})...`)
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        })
        
        const responseData = await response.json() as any
        
        if (!response.ok) {
          const errorCode = responseData.error?.code || response.status
          const errorMessage = responseData.error?.message || `HTTP ${response.status}`
          
          // Check if it's a template error
          // 132001 = template doesn't exist / not approved
          // 132018 = template parameter issue
          // 132000 = template general error
          const isTemplateError = errorCode === 132001 || 
                                 errorCode === 132018 || 
                                 errorCode === 132000 ||
                                 errorMessage.toLowerCase().includes('template') ||
                                 errorMessage.toLowerCase().includes('parameter') ||
                                 errorMessage.toLowerCase().includes('translation')
          
          // Check if it's a permanent error (4xx) vs transient (5xx)
          const isPermanent = response.status >= 400 && response.status < 500
          
          // If transient 5xx error and not last attempt, retry
          if (!isPermanent && response.status >= 500 && attempt < 1) {
            lastError = { code: errorCode, message: errorMessage, isTemplateError, isPermanent }
            continue
          }
          
          console.error(`❌ WhatsApp Template Error [${errorCode}]:`, errorMessage)
          console.error('   Template:', templateName)
          console.error('   Phone:', normalizedPhone)
          console.error('   Response:', JSON.stringify(responseData, null, 2))
          
          return {
            ok: false,
            error: {
              code: errorCode,
              message: errorMessage,
              isTemplateError,
              isPermanent
            }
          }
        }
        
        // Success
        const messageId = responseData.messages?.[0]?.id
        console.log(`✅ WhatsApp template sent: ${templateName} to ${normalizedPhone}, Message ID: ${messageId}`)
        
        return {
          ok: true,
          providerId: messageId
        }
      } catch (error: any) {
        lastError = error
        
        // If network error and not last attempt, retry
        if (attempt < 1 && (error.message?.includes('fetch') || error.message?.includes('network'))) {
          continue
        }
        
        throw error
      }
    }
    
    // If we get here, all retries failed
    return {
      ok: false,
      error: {
        code: lastError?.code || 500,
        message: lastError?.message || 'Failed to send template after retries',
        isTemplateError: false,
        isPermanent: false
      }
    }
  } catch (error: any) {
    console.error('❌ WhatsApp template send failed:', error)
    return {
      ok: false,
      error: {
        code: 500,
        message: error.message || 'Unknown error',
        isTemplateError: false,
        isPermanent: false
      }
    }
  }
}

