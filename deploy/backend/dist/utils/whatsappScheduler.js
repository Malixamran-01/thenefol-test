"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledWhatsAppMessages = processScheduledWhatsAppMessages;
exports.createScheduledMessagesFromTemplate = createScheduledMessagesFromTemplate;
const whatsappUtils_1 = require("./whatsappUtils");
/**
 * Process scheduled WhatsApp messages that are due to be sent
 * This function should be called periodically (e.g., every minute via cron)
 */
async function processScheduledWhatsAppMessages(pool) {
    try {
        const now = new Date();
        // Find all pending scheduled messages that are due
        const { rows: scheduledMessages } = await pool.query(`
      SELECT * FROM whatsapp_scheduled_messages
      WHERE status = 'pending'
      AND scheduled_at <= $1
      ORDER BY scheduled_at ASC
      LIMIT 50
    `, [now]);
        if (scheduledMessages.length === 0) {
            return { processed: 0, success: 0, failed: 0 };
        }
        let successCount = 0;
        let failedCount = 0;
        for (const scheduledMessage of scheduledMessages) {
            try {
                // Normalize phone number (remove spaces, +, etc.)
                const normalizedPhone = scheduledMessage.phone.replace(/[\s+\-()]/g, '');
                // Send the message
                const result = await (0, whatsappUtils_1.sendWhatsAppMessage)(normalizedPhone, scheduledMessage.message, pool);
                if (result.success) {
                    // Update status to sent
                    await pool.query(`
            UPDATE whatsapp_scheduled_messages
            SET status = 'sent',
                sent_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
          `, [scheduledMessage.id]);
                    successCount++;
                    console.log(`✅ Sent scheduled WhatsApp message ${scheduledMessage.id} to ${normalizedPhone}`);
                }
                else {
                    // Update status to failed
                    await pool.query(`
            UPDATE whatsapp_scheduled_messages
            SET status = 'failed',
                error_message = $1,
                updated_at = NOW()
            WHERE id = $2
          `, [result.error || 'Unknown error', scheduledMessage.id]);
                    failedCount++;
                    console.error(`❌ Failed to send scheduled WhatsApp message ${scheduledMessage.id}:`, result.error);
                }
            }
            catch (err) {
                // Update status to failed
                await pool.query(`
          UPDATE whatsapp_scheduled_messages
          SET status = 'failed',
              error_message = $1,
              updated_at = NOW()
          WHERE id = $2
        `, [err.message || 'Unknown error', scheduledMessage.id]);
                failedCount++;
                console.error(`❌ Error processing scheduled WhatsApp message ${scheduledMessage.id}:`, err);
            }
        }
        return {
            processed: scheduledMessages.length,
            success: successCount,
            failed: failedCount
        };
    }
    catch (err) {
        console.error('Error processing scheduled WhatsApp messages:', err);
        return { processed: 0, success: 0, failed: 0, error: err };
    }
}
/**
 * Create scheduled messages from templates/automations that have scheduling enabled
 * This should be called when templates/automations are created or updated with scheduling
 */
async function createScheduledMessagesFromTemplate(pool, templateId, phoneNumbers, message) {
    try {
        // Get template scheduling info
        const { rows: templates } = await pool.query(`
      SELECT scheduled_date, scheduled_time, is_scheduled
      FROM whatsapp_templates
      WHERE id = $1 AND is_scheduled = true
    `, [templateId]);
        if (templates.length === 0) {
            return { created: 0 };
        }
        const template = templates[0];
        // Combine date and time to create scheduled_at timestamp
        let scheduledAt;
        if (template.scheduled_date && template.scheduled_time) {
            const [hours, minutes] = template.scheduled_time.split(':');
            scheduledAt = new Date(template.scheduled_date);
            scheduledAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        else {
            // If no specific time, schedule for the date at 9 AM
            scheduledAt = new Date(template.scheduled_date);
            scheduledAt.setHours(9, 0, 0, 0);
        }
        // Create scheduled messages for each phone number
        const created = [];
        for (const phone of phoneNumbers) {
            const normalizedPhone = phone.replace(/[\s+\-()]/g, '');
            const { rows } = await pool.query(`
        INSERT INTO whatsapp_scheduled_messages (template_id, phone, message, scheduled_at, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending', NOW(), NOW())
        RETURNING id
      `, [templateId, normalizedPhone, message, scheduledAt]);
            created.push(rows[0].id);
        }
        return { created: created.length, ids: created };
    }
    catch (err) {
        console.error('Error creating scheduled messages from template:', err);
        return { created: 0, error: err };
    }
}
