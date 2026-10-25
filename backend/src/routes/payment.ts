import { Router } from 'express'
import crypto from 'crypto'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { getRazorpay, isRazorpayConfigured, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET } from '../config/razorpay'
import { sendPaymentFailedEmail, sendOrderConfirmationEmail, sendInvoicePDFEmail } from '../services/emailService'
import { deductStockForOrder } from '../services/inventoryBatchService'

const router = Router()

/** Amount actually owed for an order, in paise (orders.total is the remaining amount after coins). */
function orderAmountInPaise(order: any): number {
  return Math.round((Number(order?.total) || 0) * 100)
}

// Create Razorpay order
export const createRazorpayOrder = (pool: any) => async (req: any, res: any) => {
  try {
    const { amount, currency = 'INR', order_number, customer_name, customer_email, customer_phone } = req.body

    if (!order_number || typeof order_number !== 'string' || order_number.trim() === '') {
      console.error('Invalid order_number provided:', order_number)
      return sendError(res, 400, 'Valid order_number is required')
    }

    // The amount charged always comes from the stored order, never from the client.
    const { rows: orderRows } = await pool.query(
      'SELECT id, order_number, total, payment_status FROM orders WHERE order_number = $1',
      [order_number]
    )
    if (orderRows.length === 0) {
      return sendError(res, 404, `Order not found: ${order_number}`)
    }
    const storedOrder = orderRows[0]
    if (storedOrder.payment_status === 'paid') {
      return sendError(res, 400, 'This order has already been paid')
    }

    const amountNum = orderAmountInPaise(storedOrder) / 100
    const clientAmount = parseFloat(String(amount))
    if (Number.isFinite(clientAmount) && Math.abs(clientAmount - amountNum) > 1) {
      console.warn('Razorpay create-order: client amount differs from order total; using order total', {
        order_number,
        clientAmount,
        orderTotal: amountNum,
      })
    }

    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('Order total is not a valid positive number:', storedOrder.total)
      return sendError(res, 400, 'Amount must be a valid positive number')
    }

    // Validate minimum amount (Razorpay minimum is 1 INR = 100 paise)
    if (amountNum < 1) {
      console.error('Amount below minimum:', amountNum)
      return sendError(res, 400, 'Amount must be at least ₹1')
    }

    // Validate maximum amount (Razorpay maximum is typically 99,99,999.99 INR)
    if (amountNum > 9999999.99) {
      console.error('Amount exceeds maximum:', amountNum)
      return sendError(res, 400, 'Amount exceeds maximum limit')
    }

    // Check if Razorpay credentials are configured
    if (!isRazorpayConfigured()) {
      console.error('Razorpay credentials not configured')
      return sendError(res, 500, 'Payment gateway not configured')
    }

    // Validate receipt field (Razorpay has a 40 character limit)
    const receipt = order_number.length > 40 ? order_number.substring(0, 40) : order_number

    // Calculate amount in paise (must be integer, no decimals)
    const amountInPaise = Math.round(amountNum * 100)
    
    // Ensure amount is at least 100 paise (1 INR)
    if (amountInPaise < 100) {
      console.error('Amount in paise below minimum:', amountInPaise)
      return sendError(res, 400, 'Amount must be at least ₹1')
    }

    console.log('Creating Razorpay order:', {
      order_number,
      amount: amountNum,
      currency,
      amount_in_paise: amountInPaise,
      receipt
    })

    // Create order in Razorpay
    const options = {
      amount: amountInPaise, // Amount in paise (integer)
      currency: currency,
      receipt: receipt,
      notes: {
        order_number,
        customer_name: customer_name || undefined,
        customer_email: customer_email || undefined,
        customer_phone: customer_phone || undefined
      }
    }

    let order
    try {
      order = await getRazorpay().orders.create(options)
    } catch (razorpayErr: any) {
      console.error('Razorpay API error:', {
        error: razorpayErr.message,
        statusCode: razorpayErr.statusCode,
        error_description: razorpayErr.description || razorpayErr.error?.description,
        error_code: razorpayErr.error?.code,
        field: razorpayErr.field,
        source: razorpayErr.source,
        step: razorpayErr.step,
        reason: razorpayErr.reason,
        metadata: razorpayErr.metadata,
        options: {
          ...options,
          amount: amountInPaise,
          receipt: receipt
        }
      })
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create Razorpay order'
      if (razorpayErr.statusCode === 401) {
        errorMessage = 'Invalid Razorpay credentials. Please check your API keys.'
      } else if (razorpayErr.statusCode === 400) {
        errorMessage = razorpayErr.description || razorpayErr.error?.description || 'Invalid payment request'
      } else if (razorpayErr.statusCode === 500) {
        errorMessage = 'Razorpay service error. Please try again later.'
      } else if (razorpayErr.message) {
        errorMessage = razorpayErr.message
      }
      
      return sendError(res, razorpayErr.statusCode || 500, errorMessage, razorpayErr)
    }

    console.log('✅ Razorpay order created successfully:', {
      order_id: order.id,
      order_number,
      amount: order.amount
    })

    // Remember which Razorpay order belongs to this store order (checked again on verify)
    try {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`)
      await pool.query(`UPDATE orders SET razorpay_order_id = $1, updated_at = now() WHERE id = $2`, [order.id, storedOrder.id])
    } catch (linkErr: any) {
      console.error('Failed to store razorpay_order_id on order:', linkErr?.message || linkErr)
    }

    sendSuccess(res, {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID
    })
  } catch (err: any) {
    console.error('Error creating Razorpay order:', {
      error: err.message,
      stack: err.stack,
      error_description: err.description || err.error?.description,
      error_code: err.statusCode || err.error?.code,
      body: req.body
    })
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create Razorpay order'
    if (err.statusCode === 401) {
      errorMessage = 'Invalid Razorpay credentials'
    } else if (err.statusCode === 400) {
      errorMessage = err.description || err.error?.description || 'Invalid payment request'
    } else if (err.message) {
      errorMessage = err.message
    }
    
    sendError(res, 500, errorMessage, err)
  }
}

// Verify Razorpay payment
export const verifyRazorpayPayment = (pool: any) => async (req: any, res: any) => {
  let order_number: string | undefined
  try {
    // Validate pool is available
    if (!pool) {
      console.error('Database pool not available for payment verification')
      return sendError(res, 500, 'Database connection not available')
    }

    // Validate Razorpay credentials
    if (!RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET not configured')
      return sendError(res, 500, 'Payment gateway not configured')
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_number: orderNum } = req.body
    order_number = orderNum

    // Validate all required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing payment verification details:', { 
        has_order_id: !!razorpay_order_id, 
        has_payment_id: !!razorpay_payment_id, 
        has_signature: !!razorpay_signature 
      })
      return sendError(res, 400, 'Payment verification details are required')
    }

    if (!order_number || typeof order_number !== 'string' || order_number.trim() === '') {
      console.error('Missing or invalid order_number:', order_number)
      return sendError(res, 400, 'Order number is required for payment verification')
    }

    // Verify the signature
    const generated_signature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const isAuthentic = generated_signature === razorpay_signature

    if (!isAuthentic) {
      console.error('Payment signature verification failed', {
        order_id: razorpay_order_id,
        order_number: order_number,
        generated_sig: generated_signature.substring(0, 10) + '...',
        received_sig: razorpay_signature.substring(0, 10) + '...'
      })
      return sendError(res, 400, 'Payment verification failed: Invalid signature')
    }

    // Check if order exists before updating
    let orderCheck
    try {
      orderCheck = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number])
    } catch (dbErr: any) {
      console.error('Database error while checking order:', {
        error: dbErr.message,
        code: dbErr.code,
        order_number: order_number
      })
      return sendError(res, 500, 'Database error while verifying order', dbErr)
    }
    
    if (orderCheck.rows.length === 0) {
      console.error('Order not found for verification:', order_number)
      return sendError(res, 404, `Order not found: ${order_number}`)
    }

    // The signature only proves the payment happened — also prove it was for THIS order and the full amount.
    const storedOrder = orderCheck.rows[0]
    if (storedOrder.razorpay_order_id !== razorpay_order_id) {
      try {
        const rzOrder: any = await getRazorpay().orders.fetch(razorpay_order_id)
        const belongsToOrder =
          rzOrder?.notes?.order_number === order_number || rzOrder?.receipt === order_number.substring(0, 40)
        const paidEnough = Number(rzOrder?.amount) >= orderAmountInPaise(storedOrder) - 100
        if (!belongsToOrder || !paidEnough) {
          console.error('Payment does not match order:', {
            order_number,
            razorpay_order_id,
            razorpay_amount: rzOrder?.amount,
            expected_amount: orderAmountInPaise(storedOrder),
            belongsToOrder,
          })
          return sendError(res, 400, 'Payment verification failed: payment does not match this order')
        }
      } catch (fetchErr: any) {
        console.error('Could not fetch Razorpay order for verification:', fetchErr?.message || fetchErr)
        return sendError(res, 502, 'Could not confirm the payment with Razorpay. Please contact support with your payment ID.')
      }
    }

    // Ensure Razorpay columns exist in orders table
    try {
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT`)
      await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT`)
    } catch (colErr: any) {
      // Log but don't fail if columns already exist or other minor issues
      console.warn('Warning while ensuring Razorpay columns:', colErr.message)
    }

    // Update order status in database
    let updateResult
    try {
      updateResult = await pool.query(
        `UPDATE orders SET status = $1, payment_status = $2, razorpay_order_id = $3, razorpay_payment_id = $4, updated_at = now() WHERE order_number = $5`,
        ['confirmed', 'paid', razorpay_order_id, razorpay_payment_id, order_number]
      )
    } catch (dbErr: any) {
      console.error('Database error while updating order:', {
        error: dbErr.message,
        code: dbErr.code,
        order_number: order_number
      })
      return sendError(res, 500, 'Database error while updating order status', dbErr)
    }

    if (updateResult.rowCount === 0) {
      console.error('Failed to update order (no rows affected):', order_number)
      return sendError(res, 500, 'Failed to update order status')
    }

    // Get the updated order details
    let result
    try {
      result = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number])
    } catch (dbErr: any) {
      console.error('Database error while fetching updated order:', {
        error: dbErr.message,
        code: dbErr.code,
        order_number: order_number
      })
      return sendError(res, 500, 'Database error while fetching order details', dbErr)
    }
    
    if (result.rows.length === 0) {
      console.error('Order not found after update:', order_number)
      return sendError(res, 500, 'Order verification completed but order not found')
    }

    console.log('✅ Payment verified successfully for order:', order_number)

    const updatedOrder = result.rows[0]

    // Stock deduction for paid online orders (only when INVENTORY_DEDUCT_ON_ORDER=1)
    await deductStockForOrder(pool, updatedOrder.id)
    
    // After payment is verified: send confirmation emails.
    // Shiprocket shipment is NOT auto-created — admin must confirm and select courier from the admin panel.
    if (updatedOrder.payment_status === 'paid') {
      // Send order confirmation and invoice emails now that payment is confirmed
      sendOrderConfirmationEmail(updatedOrder, false, pool).catch((err: any) => {
        console.error('Failed to send order confirmation email to customer:', err)
      })
      sendOrderConfirmationEmail(updatedOrder, true, pool).catch((err: any) => {
        console.error('Failed to send order confirmation email to admin:', err)
      })
      sendInvoicePDFEmail(pool, updatedOrder, 'https://thenefol.com').catch((err: any) => {
        console.error('Failed to send invoice PDF email:', err)
      })
    }
    
    sendSuccess(res, {
      verified: true,
      order: updatedOrder
    })
  } catch (err: any) {
    console.error('Error verifying Razorpay payment:', {
      error: err.message,
      stack: err.stack,
      body: req.body,
      error_code: err.code,
      error_name: err.name
    })

    // Send payment failed email if we have order details
    if (order_number) {
      try {
        const orderResult = await pool.query('SELECT * FROM orders WHERE order_number = $1', [order_number])
        if (orderResult.rows.length > 0) {
          const order = orderResult.rows[0]
          sendPaymentFailedEmail(
            order.customer_email,
            order.customer_name,
            order_number,
            err.message || 'Payment verification failed'
          ).catch(emailErr => {
            console.error('Failed to send payment failed email:', emailErr)
          })
        }
      } catch (emailErr) {
        console.error('Error fetching order for payment failed email:', emailErr)
      }
    }

    sendError(res, 500, 'Failed to verify payment', err)
  }
}

// Razorpay webhook handler
export const razorpayWebhook = (pool: any) => async (req: any, res: any) => {
  try {
    const webhook_secret = req.headers['x-razorpay-signature']
    const webhookBody = JSON.stringify(req.body)

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex')

    if (webhook_secret !== expectedSignature) {
      return sendError(res, 401, 'Invalid webhook signature')
    }

    const event = req.body.event

    // Handle payment success
    if (event === 'payment.captured' || event === 'payment.authorized') {
      const paymentData = req.body.payload.payment.entity
      const orderId = paymentData.notes.order_number

      // Only mark paid when the captured amount covers the order total
      const { rows: webhookOrderRows } = await pool.query('SELECT total FROM orders WHERE order_number = $1', [orderId])
      if (webhookOrderRows.length && Number(paymentData.amount) >= orderAmountInPaise(webhookOrderRows[0]) - 100) {
        await pool.query(
          `UPDATE orders SET status = $1, payment_status = $2 WHERE order_number = $3`,
          ['confirmed', 'paid', orderId]
        )
        console.log('✅ Payment captured for order:', orderId)
      } else {
        console.error('⚠️ Webhook payment amount does not cover order total; order not marked paid:', {
          order_number: orderId,
          amount: paymentData.amount,
        })
      }
    }

    // Handle payment failure
    if (event === 'payment.failed') {
      const paymentData = req.body.payload.payment.entity
      const orderId = paymentData.notes.order_number

      // Update order status
      await pool.query(
        `UPDATE orders SET status = $1, payment_status = $2 WHERE order_number = $3`,
        ['pending', 'failed', orderId]
      )

      console.log('❌ Payment failed for order:', orderId)
    }

    // Handle refund processed
    if (event === 'refund.processed') {
      const refundData = req.body.payload.refund.entity
      const cancellationId = refundData.notes?.cancellation_id

      if (cancellationId) {
        await pool.query(
          `UPDATE order_cancellations 
          SET refund_status = 'processed', updated_at = now() 
          WHERE id = $1`,
          [cancellationId]
        )
        console.log('✅ Refund processed for cancellation:', cancellationId)
      }
    }

    // Handle refund failed
    if (event === 'refund.failed') {
      const refundData = req.body.payload.refund.entity
      const cancellationId = refundData.notes?.cancellation_id

      if (cancellationId) {
        await pool.query(
          `UPDATE order_cancellations 
          SET refund_status = 'failed', updated_at = now() 
          WHERE id = $1`,
          [cancellationId]
        )
        console.log('❌ Refund failed for cancellation:', cancellationId)
      }
    }

    sendSuccess(res, { received: true })
  } catch (err: any) {
    console.error('Webhook error:', err)
    sendError(res, 500, 'Webhook processing failed', err)
  }
}

// Process refund (for admin/manual refunds)
export const processRefund = (pool: any) => async (req: any, res: any) => {
  try {
    const { payment_id, amount, reason, cancellation_id } = req.body

    validateRequired({ payment_id, amount }, res)

    const refund = await getRazorpay().payments.refund(payment_id, {
      amount: Math.round(amount * 100), // Convert to paise
      notes: {
        cancellation_id: cancellation_id?.toString(),
        reason: reason || 'Order cancellation'
      }
    })

    // Update cancellation if provided
    if (cancellation_id) {
      await pool.query(
        `UPDATE order_cancellations 
        SET refund_status = 'processing', razorpay_refund_id = $1, refund_id = $2, updated_at = now()
        WHERE id = $3`,
        [refund.id, refund.id, cancellation_id]
      )
    }

    sendSuccess(res, {
      refund_id: refund.id,
      status: refund.status,
      amount: refund.amount ? refund.amount / 100 : 0,
      message: 'Refund processed successfully'
    })
  } catch (err: any) {
    console.error('Error processing refund:', err)
    sendError(res, 500, 'Failed to process refund', err)
  }
}

export default router

