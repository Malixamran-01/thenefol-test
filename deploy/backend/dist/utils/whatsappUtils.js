"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessage = sendWhatsAppMessage;
exports.sendWelcomeOffer = sendWelcomeOffer;
/**
 * Send a WhatsApp message using Facebook Graph API
 * @param phone - Recipient phone number (with country code, no spaces/special chars)
 * @param message - Text message to send
 * @param pool - Database pool (optional, for logging)
 * @returns Promise with success status and response data
 */
async function sendWhatsAppMessage(phone, message, pool) {
    try {
        // Get WhatsApp credentials from environment
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        if (!accessToken || !phoneNumberId) {
            console.error('❌ WhatsApp credentials not configured');
            console.error('   Missing:', !accessToken ? 'WHATSAPP_ACCESS_TOKEN' : '', !phoneNumberId ? 'WHATSAPP_PHONE_NUMBER_ID' : '');
            return { success: false, error: 'WhatsApp credentials not configured' };
        }
        if (!phone) {
            return { success: false, error: 'Recipient phone number is required' };
        }
        // Prepare the request body for text message
        const requestBody = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: {
                body: message
            }
        };
        // Make request to Facebook Graph API
        const facebookUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
        const response = await fetch(facebookUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('❌ WhatsApp API error:', JSON.stringify(responseData, null, 2));
            console.error('   Phone:', phone);
            console.error('   Status:', response.status);
            return {
                success: false,
                error: responseData.error?.message || 'Failed to send WhatsApp message',
                data: responseData
            };
        }
        // Log the message to database if pool is provided and table exists
        if (pool) {
            try {
                await pool.query(`
          INSERT INTO whatsapp_chat_sessions (customer_name, customer_phone, last_message, last_message_time, status)
          VALUES ($1, $2, $3, NOW(), 'active')
          ON CONFLICT (customer_phone) 
          DO UPDATE SET 
            last_message = $3,
            last_message_time = NOW(),
            status = 'active'
        `, [`Customer_${phone}`, phone, message]);
            }
            catch (dbErr) {
                // Table might not exist, just log the error
                console.error('Failed to log WhatsApp message to database:', dbErr);
            }
        }
        return {
            success: true,
            data: responseData
        };
    }
    catch (err) {
        console.error('WhatsApp send error:', err);
        return {
            success: false,
            error: err.message || 'Failed to send WhatsApp message'
        };
    }
}
/**
 * Send a welcome offer message to a new subscriber
 * @param phone - Recipient phone number
 * @param name - Subscriber name (optional)
 * @param pool - Database pool (optional, for logging)
 * @returns Promise with success status
 */
async function sendWelcomeOffer(phone, name, pool) {
    try {
        // Get welcome offer message from database settings or use default
        let welcomeMessage = `🎉 Welcome to NEFÖL! 🎉

Thank you for subscribing to our WhatsApp updates!

As a special welcome gift, you now have access to:
✨ Exclusive member-only offers
🎁 Early access to new collections
💎 Special discounts and promotions
📱 Real-time updates on sales and launches

We're excited to have you in the NEFÖL family! Stay tuned for amazing fashion updates.`;
        // Try to get custom welcome message from database
        if (pool) {
            try {
                const result = await pool.query('SELECT setting_value FROM store_settings WHERE setting_key = $1', ['whatsapp_welcome_message']);
                if (result.rows.length > 0 && result.rows[0].setting_value) {
                    welcomeMessage = result.rows[0].setting_value;
                }
            }
            catch (err) {
                // If setting doesn't exist, use default message
                console.log('Using default welcome message');
            }
        }
        // Personalize message with name if provided
        if (name) {
            welcomeMessage = `Hi ${name}! 👋\n\n${welcomeMessage}`;
        }
        // Send the welcome message
        const result = await sendWhatsAppMessage(phone, welcomeMessage, pool);
        if (result.success) {
            console.log(`✅ Welcome offer sent to ${phone}`);
        }
        else {
            console.error(`❌ Failed to send welcome offer to ${phone}:`, result.error);
        }
        return result;
    }
    catch (err) {
        console.error('Error sending welcome offer:', err);
        return {
            success: false,
            error: err.message || 'Failed to send welcome offer'
        };
    }
}
