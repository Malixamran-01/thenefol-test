"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestCancellation = requestCancellation;
exports.getUserCancellations = getUserCancellations;
exports.getCancellationDetails = getCancellationDetails;
exports.getAllCancellations = getAllCancellations;
exports.approveCancellation = approveCancellation;
exports.rejectCancellation = rejectCancellation;
exports.cancelOrderImmediate = cancelOrderImmediate;
const apiHelpers_1 = require("../utils/apiHelpers");
const razorpay_1 = __importDefault(require("razorpay"));
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'F9PT2uJbFVQUedEXI3iL59N9';
const razorpay = new razorpay_1.default({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_live_RigxrHNSReeV37',
    key_secret: RAZORPAY_KEY_SECRET
});
// Request cancellation
async function requestCancellation(pool, req, res) {
    try {
        const userId = req.userId;
        const { order_number, reason, cancellation_type = 'full', items_to_cancel } = req.body;
        const validationError = (0, apiHelpers_1.validateRequired)({ order_number, reason }, ['order_number', 'reason']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        // Get order details
        const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number]);
        if (orderRows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Order not found');
        }
        const order = orderRows[0];
        // Check if user owns this order
        if (userId && order.customer_email) {
            const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userRows.length === 0 || userRows[0].email !== order.customer_email) {
                return (0, apiHelpers_1.sendError)(res, 403, 'You do not have permission to cancel this order');
            }
        }
        // Check if order is delivered
        if (order.status !== 'delivered' && order.status !== 'completed') {
            return (0, apiHelpers_1.sendError)(res, 400, 'Order must be delivered before cancellation can be requested');
        }
        // Check if order was delivered within last 5 days
        const deliveredAt = order.delivered_at || order.updated_at;
        if (!deliveredAt) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Order delivery date not found');
        }
        const deliveryDate = new Date(deliveredAt);
        const now = new Date();
        const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceDelivery > 5) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Cancellation can only be requested within 5 days of delivery');
        }
        // Check if cancellation already exists
        const { rows: existingCancellation } = await pool.query('SELECT * FROM order_cancellations WHERE order_number = $1 AND status IN ($2, $3)', [order_number, 'pending', 'approved']);
        if (existingCancellation.length > 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Cancellation request already exists for this order');
        }
        // Calculate refund amount (for now, full refund)
        const refundAmount = cancellation_type === 'partial' && items_to_cancel
            ? calculatePartialRefund(order.items, items_to_cancel)
            : parseFloat(order.total);
        // Create cancellation request
        const { rows: cancellationRows } = await pool.query(`INSERT INTO order_cancellations 
      (order_id, order_number, user_id, cancellation_reason, cancellation_type, items_to_cancel, refund_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
      RETURNING *`, [
            order.id,
            order_number,
            userId || null,
            reason,
            cancellation_type,
            items_to_cancel ? JSON.stringify(items_to_cancel) : null,
            refundAmount,
            'pending'
        ]);
        // Update order
        await pool.query(`UPDATE orders SET cancellation_requested_at = now(), can_cancel = false WHERE order_number = $1`, [order_number]);
        (0, apiHelpers_1.sendSuccess)(res, { ...cancellationRows[0], message: 'Cancellation request submitted successfully' });
    }
    catch (err) {
        console.error('Error requesting cancellation:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to request cancellation', err);
    }
}
// Get cancellation requests (for user)
async function getUserCancellations(pool, req, res) {
    try {
        const userId = req.userId;
        const { rows } = await pool.query(`SELECT oc.*, o.status as order_status, o.total as order_total
      FROM order_cancellations oc
      JOIN orders o ON oc.order_id = o.id
      WHERE oc.user_id = $1
      ORDER BY oc.created_at DESC`, [userId]);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        console.error('Error fetching user cancellations:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cancellations', err);
    }
}
// Get cancellation details
async function getCancellationDetails(pool, req, res) {
    try {
        const { id } = req.params;
        const { rows } = await pool.query(`SELECT oc.*, o.*, o.id as order_db_id
      FROM order_cancellations oc
      JOIN orders o ON oc.order_id = o.id
      WHERE oc.id = $1`, [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Cancellation not found');
        }
        (0, apiHelpers_1.sendSuccess)(res, rows[0]);
    }
    catch (err) {
        console.error('Error fetching cancellation details:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cancellation details', err);
    }
}
// Admin: Get all cancellation requests
async function getAllCancellations(pool, req, res) {
    try {
        const { status, refund_status } = req.query;
        let query = `
      SELECT oc.*, o.customer_name, o.customer_email, o.status as order_status, 
             u.name as user_name, u.email as user_email,
             s.name as processed_by_name
      FROM order_cancellations oc
      JOIN orders o ON oc.order_id = o.id
      LEFT JOIN users u ON oc.user_id = u.id
      LEFT JOIN staff_users s ON oc.processed_by = s.id
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 1;
        if (status) {
            query += ` AND oc.status = $${paramCount}`;
            params.push(status);
            paramCount++;
        }
        if (refund_status) {
            query += ` AND oc.refund_status = $${paramCount}`;
            params.push(refund_status);
            paramCount++;
        }
        query += ` ORDER BY oc.created_at DESC`;
        const { rows } = await pool.query(query, params);
        (0, apiHelpers_1.sendSuccess)(res, rows);
    }
    catch (err) {
        console.error('Error fetching cancellations:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to fetch cancellations', err);
    }
}
// Admin: Approve cancellation
async function approveCancellation(pool, req, res) {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;
        const staffId = req.userId;
        // Get cancellation details
        const { rows: cancellationRows } = await pool.query(`SELECT oc.*, o.razorpay_payment_id, o.razorpay_order_id, o.total, o.payment_method
      FROM order_cancellations oc
      JOIN orders o ON oc.order_id = o.id
      WHERE oc.id = $1`, [id]);
        if (cancellationRows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Cancellation not found');
        }
        const cancellation = cancellationRows[0];
        if (cancellation.status !== 'pending') {
            return (0, apiHelpers_1.sendError)(res, 400, `Cancellation is already ${cancellation.status}`);
        }
        // Update cancellation status
        await pool.query(`UPDATE order_cancellations 
      SET status = 'approved', processed_by = $1, processed_at = now(), admin_notes = $2
      WHERE id = $3`, [staffId, admin_notes || null, id]);
        // Update order status
        await pool.query(`UPDATE orders SET status = 'cancelled' WHERE order_number = $1`, [cancellation.order_number]);
        // Initialize refund if payment was made via Razorpay
        if (cancellation.razorpay_payment_id && cancellation.payment_method !== 'cod') {
            try {
                const refund = await razorpay.payments.refund(cancellation.razorpay_payment_id, {
                    amount: Math.round(parseFloat(cancellation.refund_amount) * 100), // Convert to paise
                    notes: {
                        cancellation_id: id.toString(),
                        order_number: cancellation.order_number,
                        reason: cancellation.cancellation_reason
                    }
                });
                // Update cancellation with refund details
                await pool.query(`UPDATE order_cancellations 
          SET refund_status = 'processing', razorpay_refund_id = $1, refund_id = $2
          WHERE id = $3`, [refund.id, refund.id, id]);
                (0, apiHelpers_1.sendSuccess)(res, {
                    cancellation_id: id,
                    refund_id: refund.id,
                    message: 'Cancellation approved and refund initiated'
                });
            }
            catch (refundErr) {
                console.error('Error initiating refund:', refundErr);
                // Update refund status to failed
                await pool.query(`UPDATE order_cancellations SET refund_status = 'failed' WHERE id = $1`, [id]);
                (0, apiHelpers_1.sendError)(res, 500, 'Cancellation approved but refund initiation failed', refundErr);
            }
        }
        else {
            // For COD or other payment methods, mark refund as processed
            await pool.query(`UPDATE order_cancellations SET refund_status = 'processed' WHERE id = $1`, [id]);
            (0, apiHelpers_1.sendSuccess)(res, {
                cancellation_id: id,
                message: 'Cancellation approved. Refund will be processed manually for COD orders.'
            });
        }
    }
    catch (err) {
        console.error('Error approving cancellation:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to approve cancellation', err);
    }
}
// Admin: Reject cancellation
async function rejectCancellation(pool, req, res) {
    try {
        const { id } = req.params;
        const { admin_notes } = req.body;
        const staffId = req.userId;
        const validationError = (0, apiHelpers_1.validateRequired)({ admin_notes }, ['admin_notes']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        // Get cancellation details
        const { rows } = await pool.query('SELECT * FROM order_cancellations WHERE id = $1', [id]);
        if (rows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Cancellation not found');
        }
        if (rows[0].status !== 'pending') {
            return (0, apiHelpers_1.sendError)(res, 400, `Cancellation is already ${rows[0].status}`);
        }
        // Update cancellation status
        await pool.query(`UPDATE order_cancellations 
      SET status = 'rejected', processed_by = $1, processed_at = now(), admin_notes = $2
      WHERE id = $3`, [staffId, admin_notes, id]);
        // Re-enable cancellation on order
        await pool.query(`UPDATE orders SET can_cancel = true WHERE order_number = $1`, [rows[0].order_number]);
        (0, apiHelpers_1.sendSuccess)(res, { cancellation_id: id, message: 'Cancellation rejected' });
    }
    catch (err) {
        console.error('Error rejecting cancellation:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to reject cancellation', err);
    }
}
// Immediate cancellation (for non-delivered orders)
async function cancelOrderImmediate(pool, req, res, io) {
    try {
        const userId = req.userId;
        const { order_number, reason } = req.body;
        const validationError = (0, apiHelpers_1.validateRequired)({ order_number, reason }, ['order_number', 'reason']);
        if (validationError)
            return (0, apiHelpers_1.sendError)(res, 400, validationError);
        // Get order details
        const { rows: orderRows } = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number]);
        if (orderRows.length === 0) {
            return (0, apiHelpers_1.sendError)(res, 404, 'Order not found');
        }
        const order = orderRows[0];
        // Check if user owns this order
        if (userId && order.customer_email) {
            const { rows: userRows } = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            if (userRows.length === 0 || userRows[0].email !== order.customer_email) {
                return (0, apiHelpers_1.sendError)(res, 403, 'You do not have permission to cancel this order');
            }
        }
        // Check if order is already cancelled
        if (order.status === 'cancelled') {
            return (0, apiHelpers_1.sendError)(res, 400, 'Order is already cancelled');
        }
        // Check if order is delivered (use requestCancellation for delivered orders)
        if (order.status === 'delivered' || order.status === 'completed') {
            return (0, apiHelpers_1.sendError)(res, 400, 'Please use cancellation request for delivered orders');
        }
        // Check if cancellation already exists
        const { rows: existingCancellation } = await pool.query('SELECT * FROM order_cancellations WHERE order_number = $1 AND status IN ($2, $3)', [order_number, 'pending', 'approved']);
        if (existingCancellation.length > 0) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Cancellation request already exists for this order');
        }
        // Cancel order in Shiprocket if shipment exists
        let shiprocketCancelled = false;
        try {
            const { rows: shipments } = await pool.query('SELECT * FROM shiprocket_shipments WHERE order_id = $1 ORDER BY id DESC LIMIT 1', [order.id]);
            if (shipments.length > 0 && shipments[0].shipment_id) {
                // Import Shiprocket functions
                const { getToken } = await Promise.resolve().then(() => __importStar(require('./shiprocket')));
                const token = await getToken(pool);
                if (token) {
                    const baseUrl = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
                    const cancelResp = await fetch(`${baseUrl}/orders/cancel/shipment/${shipments[0].shipment_id}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (cancelResp.ok) {
                        shiprocketCancelled = true;
                        console.log(`✅ Order ${order_number} cancelled in Shiprocket`);
                    }
                    else {
                        const errorData = await cancelResp.json().catch(() => ({}));
                        console.error('Failed to cancel in Shiprocket:', errorData);
                    }
                }
            }
        }
        catch (shiprocketErr) {
            console.error('Error cancelling in Shiprocket:', shiprocketErr);
            // Continue with cancellation even if Shiprocket fails
        }
        // Calculate refund amount
        const refundAmount = parseFloat(order.total);
        // Create cancellation record
        const { rows: cancellationRows } = await pool.query(`INSERT INTO order_cancellations 
      (order_id, order_number, user_id, cancellation_reason, cancellation_type, refund_amount, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`, [
            order.id,
            order_number,
            userId || null,
            reason,
            'full',
            refundAmount,
            'approved' // Auto-approve immediate cancellations
        ]);
        // Update order status to cancelled
        await pool.query(`UPDATE orders SET status = 'cancelled', cancellation_requested_at = now(), can_cancel = false, updated_at = now() WHERE order_number = $1`, [order_number]);
        // Reverse coins if coins were used for payment
        if (order.coins_used && order.coins_used > 0) {
            try {
                // Get user by email
                const userResult = await pool.query('SELECT id, loyalty_points FROM users WHERE email = $1', [order.customer_email]);
                const userId = userResult.rows[0]?.id;
                if (userId) {
                    // Refund coins back to user
                    await pool.query(`
            UPDATE users 
            SET loyalty_points = loyalty_points + $1
            WHERE id = $2
          `, [order.coins_used, userId]);
                    // Record coin transaction for refund
                    await pool.query(`
            INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
                        userId,
                        order.coins_used, // Positive amount for refund
                        'refund',
                        `Refunded ${order.coins_used} coins (₹${(order.coins_used / 10).toFixed(2)}) for cancelled order ${order_number}`,
                        'completed',
                        order.id,
                        new Date()
                    ]);
                    console.log(`✅ Refunded ${order.coins_used} coins to user ${order.customer_email} for cancelled order ${order_number}`);
                }
            }
            catch (coinsErr) {
                console.error('Error refunding coins:', coinsErr);
                // Don't fail cancellation if coins refund fails
            }
        }
        // Reverse referral coins if this was a referred order
        if (order.affiliate_id) {
            try {
                // Find the affiliate user
                const affiliateResult = await pool.query(`
          SELECT user_id, id FROM affiliate_partners WHERE id = $1
        `, [order.affiliate_id]);
                if (affiliateResult.rows.length > 0 && affiliateResult.rows[0].user_id) {
                    const affiliateUserId = affiliateResult.rows[0].user_id;
                    // Find referral coins transaction for this order (within last 8 days)
                    const referralCoinsResult = await pool.query(`
            SELECT amount, id FROM coin_transactions
            WHERE user_id = $1
              AND type = 'referral_commission'
              AND order_id = $2
              AND amount > 0
              AND created_at > NOW() - INTERVAL '8 days'
            ORDER BY created_at DESC
            LIMIT 1
          `, [affiliateUserId, order.id]);
                    if (referralCoinsResult.rows.length > 0) {
                        const referralCoins = referralCoinsResult.rows[0].amount;
                        // Deduct referral coins from affiliate
                        await pool.query(`
              UPDATE users 
              SET loyalty_points = loyalty_points - $1
              WHERE id = $2
            `, [referralCoins, affiliateUserId]);
                        // Update affiliate partner stats
                        const commissionEarned = referralCoins / 10; // Convert coins to rupees
                        await pool.query(`
              UPDATE affiliate_partners 
              SET total_referrals = GREATEST(0, total_referrals - 1),
                  total_earnings = GREATEST(0, total_earnings - $1),
                  pending_earnings = GREATEST(0, pending_earnings - $1)
              WHERE id = $2
            `, [commissionEarned, order.affiliate_id]);
                        // Record reversal transaction
                        await pool.query(`
              INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [
                            affiliateUserId,
                            -referralCoins, // Negative amount for reversal
                            'referral_commission_reversed',
                            `Reversed ${referralCoins} referral coins (₹${commissionEarned.toFixed(2)}) due to cancelled order ${order_number}`,
                            'completed',
                            order.id,
                            new Date()
                        ]);
                        console.log(`✅ Reversed ${referralCoins} referral coins from affiliate ${affiliateUserId} for cancelled order ${order_number}`);
                    }
                }
            }
            catch (referralErr) {
                console.error('Error reversing referral coins:', referralErr);
                // Don't fail cancellation if referral reversal fails
            }
        }
        // Reverse cashback coins (5% of order total) if they were added
        try {
            // Find cashback coins transaction for this order
            const cashbackResult = await pool.query(`
        SELECT amount, id FROM coin_transactions
        WHERE user_id = (SELECT id FROM users WHERE email = $1)
          AND type = 'cashback'
          AND order_id = $2
          AND amount > 0
        ORDER BY created_at DESC
        LIMIT 1
      `, [order.customer_email, order.id]);
            if (cashbackResult.rows.length > 0) {
                const cashbackCoins = cashbackResult.rows[0].amount;
                const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [order.customer_email]);
                const userId = userResult.rows[0]?.id;
                if (userId) {
                    // Deduct cashback coins
                    await pool.query(`
            UPDATE users 
            SET loyalty_points = loyalty_points - $1
            WHERE id = $2
          `, [cashbackCoins, userId]);
                    // Record reversal transaction
                    await pool.query(`
            INSERT INTO coin_transactions (user_id, amount, type, description, status, order_id, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
                        userId,
                        -cashbackCoins, // Negative amount for reversal
                        'cashback_reversed',
                        `Reversed ${cashbackCoins} cashback coins (₹${(cashbackCoins / 10).toFixed(2)}) due to cancelled order ${order_number}`,
                        'completed',
                        order.id,
                        new Date()
                    ]);
                    console.log(`✅ Reversed ${cashbackCoins} cashback coins from user ${order.customer_email} for cancelled order ${order_number}`);
                }
            }
        }
        catch (cashbackErr) {
            console.error('Error reversing cashback coins:', cashbackErr);
            // Don't fail cancellation if cashback reversal fails
        }
        // Process refund if payment was made via Razorpay
        if (order.razorpay_payment_id && order.payment_method !== 'cod') {
            try {
                const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
                    amount: Math.round(refundAmount * 100), // Convert to paise
                    notes: {
                        cancellation_id: cancellationRows[0].id.toString(),
                        order_number: order_number,
                        reason: reason
                    }
                });
                // Update cancellation with refund details
                await pool.query(`UPDATE order_cancellations 
          SET refund_status = 'processing', razorpay_refund_id = $1, refund_id = $2
          WHERE id = $3`, [refund.id, refund.id, cancellationRows[0].id]);
            }
            catch (refundErr) {
                console.error('Error initiating refund:', refundErr);
                await pool.query(`UPDATE order_cancellations SET refund_status = 'failed' WHERE id = $1`, [cancellationRows[0].id]);
            }
        }
        else {
            // For COD or other payment methods, mark refund as processed
            await pool.query(`UPDATE order_cancellations SET refund_status = 'processed' WHERE id = $1`, [cancellationRows[0].id]);
        }
        // Notify admin
        try {
            if (io) {
                const { rows: notificationRows } = await pool.query(`
          INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
                    userId || null,
                    'order_cancelled',
                    'Order Cancelled',
                    `Order ${order_number} has been cancelled by customer. Reason: ${reason}`,
                    `/admin/sales/orders/${order.id}`,
                    'x-circle',
                    'high',
                    JSON.stringify({ order_number, reason, shiprocket_cancelled: shiprocketCancelled })
                ]);
                // Emit real-time notification to admin panel
                io.to('admin-panel').emit('new-notification', notificationRows[0]);
            }
        }
        catch (notifErr) {
            console.error('Error creating admin notification:', notifErr);
            // Continue even if notification fails
        }
        // Create user notification for order cancellation
        try {
            if (userId) {
                const { rows: userNotificationRows } = await pool.query(`
          INSERT INTO user_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
                    userId,
                    'order_cancelled',
                    'Order Cancelled',
                    `Your order ${order_number} has been cancelled successfully.${refundAmount > 0 ? ` Refund of ₹${refundAmount.toFixed(2)} will be processed.` : ''}`,
                    `/user/orders/${order.id}`,
                    'x-circle',
                    'high',
                    JSON.stringify({ order_id: order.id, order_number, reason, refund_amount: refundAmount })
                ]);
                // Emit real-time notification to user
                if (io) {
                    io.to(`user-${userId}`).emit('notification', userNotificationRows[0]);
                }
            }
        }
        catch (userNotifErr) {
            console.error('Error creating user notification:', userNotifErr);
            // Continue even if notification fails
        }
        (0, apiHelpers_1.sendSuccess)(res, {
            ...cancellationRows[0],
            shiprocket_cancelled: shiprocketCancelled,
            message: 'Order cancelled successfully'
        });
    }
    catch (err) {
        console.error('Error cancelling order:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to cancel order', err);
    }
}
// Helper function to calculate partial refund
function calculatePartialRefund(orderItems, itemsToCancel) {
    let refundAmount = 0;
    if (!Array.isArray(orderItems) || !Array.isArray(itemsToCancel)) {
        return 0;
    }
    itemsToCancel.forEach((itemToCancel) => {
        const orderItem = orderItems.find((item) => item.id === itemToCancel.id || item.slug === itemToCancel.slug);
        if (orderItem) {
            const quantity = itemToCancel.quantity || orderItem.quantity || 1;
            const price = parseFloat(orderItem.price || 0);
            refundAmount += price * quantity;
        }
    });
    return refundAmount;
}
