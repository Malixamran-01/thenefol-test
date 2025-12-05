"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscribeWhatsApp = subscribeWhatsApp;
exports.unsubscribeWhatsApp = unsubscribeWhatsApp;
exports.getWhatsAppSubscriptions = getWhatsAppSubscriptions;
exports.getWhatsAppStats = getWhatsAppStats;
const apiHelpers_1 = require("../utils/apiHelpers");
const whatsappUtils_1 = require("../utils/whatsappUtils");
// Subscribe to WhatsApp
async function subscribeWhatsApp(pool, req, res) {
    try {
        const { phone, name, source, metadata } = req.body;
        const validationError = (0, apiHelpers_1.validateRequired)(req.body, ['phone']);
        if (validationError) {
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        }
        // Normalize phone number (remove spaces, +, etc.)
        const normalizedPhone = phone.replace(/[\s+\-()]/g, '');
        // Check if already subscribed
        const existing = await pool.query('SELECT * FROM whatsapp_subscriptions WHERE phone = $1', [normalizedPhone]);
        let isNewSubscription = false;
        if (existing.rows.length > 0) {
            const subscription = existing.rows[0];
            if (subscription.is_active) {
                // Already subscribed - return error to prevent duplicate
                return (0, apiHelpers_1.sendError)(res, 409, `This phone number (${normalizedPhone}) is already subscribed.`);
            }
            else {
                // Reactivate subscription
                await pool.query(`
          UPDATE whatsapp_subscriptions
          SET is_active = true,
              subscribed_at = NOW(),
              unsubscribed_at = NULL,
              name = COALESCE($1, name),
              source = COALESCE($2, source)
          WHERE phone = $3
        `, [name, source, normalizedPhone]);
                isNewSubscription = true;
            }
        }
        else {
            // New subscription
            await pool.query(`
        INSERT INTO whatsapp_subscriptions (phone, name, source, metadata)
        VALUES ($1, $2, $3, $4)
      `, [normalizedPhone, name, source || 'popup', metadata || {}]);
            isNewSubscription = true;
        }
        // Get the subscription details for notification
        const { rows: subscriptionRows } = await pool.query('SELECT * FROM whatsapp_subscriptions WHERE phone = $1', [normalizedPhone]);
        const subscription = subscriptionRows[0];
        // Find user by phone number if they have an account
        let userId = null;
        try {
            const userResult = await pool.query('SELECT id FROM users WHERE phone = $1', [normalizedPhone]);
            if (userResult.rows.length > 0) {
                userId = userResult.rows[0].id;
            }
        }
        catch (err) {
            console.error('Error finding user by phone:', err);
        }
        // Automatically enroll user in active offers and promotions
        try {
            const now = new Date();
            // Get all active discounts
            const activeDiscounts = await pool.query(`
        SELECT id FROM discounts 
        WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      `, [now]);
            // Get all active cashback offers
            const activeCashbackOffers = await pool.query(`
        SELECT id FROM cashback_offers 
        WHERE is_active = true 
        AND (valid_from IS NULL OR valid_from <= $1)
        AND (valid_until IS NULL OR valid_until >= $1)
      `, [now]);
            // Enroll in all active discounts
            for (const discount of activeDiscounts.rows) {
                try {
                    // Check if already enrolled to avoid duplicates
                    const existingEnrollment = await pool.query(`
            SELECT id FROM promotion_enrollments 
            WHERE (user_id = $1 OR phone = $2)
            AND discount_id = $3
            AND is_active = true
          `, [userId, normalizedPhone, discount.id]);
                    if (existingEnrollment.rows.length === 0) {
                        await pool.query(`
              INSERT INTO promotion_enrollments (user_id, phone, discount_id, enrollment_source)
              VALUES ($1, $2, $3, 'whatsapp_subscription')
            `, [userId, normalizedPhone, discount.id]);
                        console.log(`✅ Enrolled ${normalizedPhone} in discount ${discount.id}`);
                    }
                }
                catch (err) {
                    console.error(`Error enrolling in discount ${discount.id}:`, err);
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
          `, [userId, normalizedPhone, offer.id]);
                    if (existingEnrollment.rows.length === 0) {
                        await pool.query(`
              INSERT INTO promotion_enrollments (user_id, phone, cashback_offer_id, enrollment_source)
              VALUES ($1, $2, $3, 'whatsapp_subscription')
            `, [userId, normalizedPhone, offer.id]);
                        console.log(`✅ Enrolled ${normalizedPhone} in cashback offer ${offer.id}`);
                    }
                }
                catch (err) {
                    console.error(`Error enrolling in cashback offer ${offer.id}:`, err);
                }
            }
            console.log(`🎁 Auto-enrolled ${normalizedPhone} in ${activeDiscounts.rows.length} discounts and ${activeCashbackOffers.rows.length} cashback offers`);
        }
        catch (err) {
            console.error('Error auto-enrolling in offers:', err);
            // Don't fail the subscription if enrollment fails
        }
        // Emit real-time notification to admin panel via Socket.IO
        const io = req.io;
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
            });
            console.log('📱 Emitted WhatsApp subscription notification to admin panel');
        }
        // Send welcome offer WhatsApp message
        if (isNewSubscription) {
            try {
                // Send welcome offer asynchronously (don't block the response)
                (0, whatsappUtils_1.sendWelcomeOffer)(normalizedPhone, name || undefined, pool)
                    .then((result) => {
                    if (result.success) {
                        console.log(`🎉 Welcome offer sent successfully to ${normalizedPhone}`);
                    }
                    else {
                        console.error(`⚠️ Failed to send welcome offer to ${normalizedPhone}:`, result.error);
                    }
                })
                    .catch((err) => {
                    console.error(`⚠️ Error sending welcome offer to ${normalizedPhone}:`, err);
                });
            }
            catch (err) {
                // Log error but don't fail the subscription
                console.error('Error initiating welcome offer send:', err);
            }
        }
        (0, apiHelpers_1.sendSuccess)(res, {
            message: 'Successfully subscribed to WhatsApp updates',
            subscribed: true
        });
    }
    catch (err) {
        console.error('Error subscribing to WhatsApp:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to subscribe to WhatsApp', err);
    }
}
// Unsubscribe from WhatsApp
async function unsubscribeWhatsApp(pool, req, res) {
    try {
        const { phone } = req.body;
        const validationError = (0, apiHelpers_1.validateRequired)(req.body, ['phone']);
        if (validationError) {
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        }
        const normalizedPhone = phone.replace(/[\s+\-()]/g, '');
        const { rowCount } = await pool.query('UPDATE whatsapp_subscriptions SET is_active = false, unsubscribed_at = NOW() WHERE phone = $1', [normalizedPhone]);
        if (rowCount === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Subscription not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, { message: 'Successfully unsubscribed from WhatsApp updates' });
    }
    catch (err) {
        console.error('Error unsubscribing from WhatsApp:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to unsubscribe from WhatsApp', err);
    }
}
// Get WhatsApp subscriptions (admin only)
async function getWhatsAppSubscriptions(pool, req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const search = req.query.search;
        let query = `
      SELECT id, phone, name, source, subscribed_at, unsubscribed_at, is_active, metadata
      FROM whatsapp_subscriptions
      WHERE 1=1
    `;
        const params = [];
        let paramIndex = 1;
        if (search) {
            query += ` AND (phone LIKE $${paramIndex} OR name LIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        query += ` ORDER BY subscribed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const { rows } = await pool.query(query, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) as total FROM whatsapp_subscriptions WHERE 1=1';
        const countParams = [];
        if (search) {
            countQuery += ` AND (phone LIKE $1 OR name LIKE $1)`;
            countParams.push(`%${search}%`);
        }
        const { rows: countRows } = await pool.query(countQuery, countParams);
        const total = parseInt(countRows[0].total);
        (0, apiHelpers_1.sendSuccess)(res, {
            subscriptions: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    }
    catch (err) {
        console.error('Error fetching WhatsApp subscriptions:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp subscriptions', err);
    }
}
// Get WhatsApp subscription stats (admin only)
async function getWhatsAppStats(pool, req, res) {
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
    `);
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        console.error('Error fetching WhatsApp stats:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch WhatsApp stats', err);
    }
}
