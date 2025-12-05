"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRefund = exports.razorpayWebhook = exports.verifyRazorpayPayment = exports.createRazorpayOrder = void 0;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const apiHelpers_1 = require("../utils/apiHelpers");
const razorpay_1 = __importDefault(require("razorpay"));
const router = (0, express_1.Router)();
// Get Razorpay credentials
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_RigxrHNSReeV37';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'F9PT2uJbFVQUedEXI3iL59N9';
// Initialize Razorpay
const razorpay = new razorpay_1.default({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
});
// Create Razorpay order
const createRazorpayOrder = (pool) => async (req, res) => {
    try {
        const { amount, currency = 'INR', order_number, customer_name, customer_email, customer_phone } = req.body;
        if (!amount || !order_number) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Amount and order_number are required');
        }
        // Create order in Razorpay
        const options = {
            amount: Math.round(amount * 100), // Convert to paise
            currency: currency,
            receipt: order_number,
            notes: {
                order_number,
                customer_name,
                customer_email,
                customer_phone
            }
        };
        const order = await razorpay.orders.create(options);
        (0, apiHelpers_1.sendSuccess)(res, {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: RAZORPAY_KEY_ID
        });
    }
    catch (err) {
        console.error('Error creating Razorpay order:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to create Razorpay order', err);
    }
};
exports.createRazorpayOrder = createRazorpayOrder;
// Verify Razorpay payment
const verifyRazorpayPayment = (pool) => async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_number } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Payment verification details are required');
        }
        // Verify the signature
        const generated_signature = crypto_1.default
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');
        const isAuthentic = generated_signature === razorpay_signature;
        if (!isAuthentic) {
            return (0, apiHelpers_1.sendError)(res, 400, 'Payment verification failed');
        }
        // Update order status in database
        await pool.query(`UPDATE orders SET status = $1, payment_status = $2, razorpay_order_id = $3, razorpay_payment_id = $4 WHERE order_number = $5`, ['confirmed', 'paid', razorpay_order_id, razorpay_payment_id, order_number]);
        // Get the order details
        const result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number]);
        (0, apiHelpers_1.sendSuccess)(res, {
            verified: true,
            order: result.rows[0]
        });
    }
    catch (err) {
        console.error('Error verifying Razorpay payment:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to verify payment', err);
    }
};
exports.verifyRazorpayPayment = verifyRazorpayPayment;
// Razorpay webhook handler
const razorpayWebhook = (pool) => async (req, res) => {
    try {
        const webhook_secret = req.headers['x-razorpay-signature'];
        const webhookBody = JSON.stringify(req.body);
        // Verify webhook signature
        const expectedSignature = crypto_1.default
            .createHmac('sha256', RAZORPAY_KEY_SECRET)
            .update(webhookBody)
            .digest('hex');
        if (webhook_secret !== expectedSignature) {
            return (0, apiHelpers_1.sendError)(res, 401, 'Invalid webhook signature');
        }
        const event = req.body.event;
        // Handle payment success
        if (event === 'payment.captured' || event === 'payment.authorized') {
            const paymentData = req.body.payload.payment.entity;
            const orderId = paymentData.notes.order_number;
            // Update order status
            await pool.query(`UPDATE orders SET status = $1, payment_status = $2 WHERE order_number = $3`, ['confirmed', 'paid', orderId]);
            console.log('✅ Payment captured for order:', orderId);
        }
        // Handle payment failure
        if (event === 'payment.failed') {
            const paymentData = req.body.payload.payment.entity;
            const orderId = paymentData.notes.order_number;
            // Update order status
            await pool.query(`UPDATE orders SET status = $1, payment_status = $2 WHERE order_number = $3`, ['pending', 'failed', orderId]);
            console.log('❌ Payment failed for order:', orderId);
        }
        // Handle refund processed
        if (event === 'refund.processed') {
            const refundData = req.body.payload.refund.entity;
            const cancellationId = refundData.notes?.cancellation_id;
            if (cancellationId) {
                await pool.query(`UPDATE order_cancellations 
          SET refund_status = 'processed', updated_at = now() 
          WHERE id = $1`, [cancellationId]);
                console.log('✅ Refund processed for cancellation:', cancellationId);
            }
        }
        // Handle refund failed
        if (event === 'refund.failed') {
            const refundData = req.body.payload.refund.entity;
            const cancellationId = refundData.notes?.cancellation_id;
            if (cancellationId) {
                await pool.query(`UPDATE order_cancellations 
          SET refund_status = 'failed', updated_at = now() 
          WHERE id = $1`, [cancellationId]);
                console.log('❌ Refund failed for cancellation:', cancellationId);
            }
        }
        (0, apiHelpers_1.sendSuccess)(res, { received: true });
    }
    catch (err) {
        console.error('Webhook error:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Webhook processing failed', err);
    }
};
exports.razorpayWebhook = razorpayWebhook;
// Process refund (for admin/manual refunds)
const processRefund = (pool) => async (req, res) => {
    try {
        const { payment_id, amount, reason, cancellation_id } = req.body;
        (0, apiHelpers_1.validateRequired)({ payment_id, amount }, res);
        const refund = await razorpay.payments.refund(payment_id, {
            amount: Math.round(amount * 100), // Convert to paise
            notes: {
                cancellation_id: cancellation_id?.toString(),
                reason: reason || 'Order cancellation'
            }
        });
        // Update cancellation if provided
        if (cancellation_id) {
            await pool.query(`UPDATE order_cancellations 
        SET refund_status = 'processing', razorpay_refund_id = $1, refund_id = $2, updated_at = now()
        WHERE id = $3`, [refund.id, refund.id, cancellation_id]);
        }
        (0, apiHelpers_1.sendSuccess)(res, {
            refund_id: refund.id,
            status: refund.status,
            amount: refund.amount ? refund.amount / 100 : 0,
            message: 'Refund processed successfully'
        });
    }
    catch (err) {
        console.error('Error processing refund:', err);
        (0, apiHelpers_1.sendError)(res, 500, 'Failed to process refund', err);
    }
};
exports.processRefund = processRefund;
exports.default = router;
