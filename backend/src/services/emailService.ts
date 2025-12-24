// Email Service - All 6 Email Automation Events
import { transporter, getAdminEmail } from '../utils/email'
import { Pool } from 'pg'
import { generateInvoicePDF } from '../utils/pdfGenerator'

// 1. Welcome Email - User Signup
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to NEFOL®</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Welcome to NEFOL®!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Your account is ready! We're thrilled to have you join the NEFOL® family.</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Start exploring our premium skincare and beauty products crafted with care.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com" style="background: #667eea; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Start Shopping</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Thank you for choosing NEFOL®!</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Welcome to NEFOL® — your account is ready.',
      html
    })

    console.log(`✅ Welcome email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
    // Don't throw - email failures shouldn't break user signup
  }
}

// 2. Cart Reminder - Item Added to Cart
export async function sendCartAddedEmail(
  userEmail: string,
  userName: string,
  productName: string,
  productPrice: number
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Item Added to Cart</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: #fff; margin: 0;">Item Added to Your Cart</h2>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Great choice! We've added <strong>${productName}</strong> to your cart.</p>
          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-size: 18px; font-weight: bold;">${productName}</p>
            <p style="margin: 10px 0 0 0; font-size: 16px; color: #667eea;">₹${productPrice.toFixed(2)}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/checkout" style="background: #667eea; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Complete Your Checkout</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Don't wait too long - complete your purchase to secure your items!</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `${productName} added to your cart`,
      html
    })

    console.log(`✅ Cart reminder email sent to: ${userEmail} for product: ${productName}`)
  } catch (error) {
    console.error('❌ Error sending cart reminder email:', error)
    // Don't throw - email failures shouldn't break cart operations
  }
}

// 3. Order Confirmation - Order Placed
export async function sendOrderConfirmationEmail(
  order: any,
  sendToAdmin: boolean = false
): Promise<void> {
  try {
    // Helper function to safely convert values to numbers
    const toNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      return isNaN(num) ? 0 : num
    }

    const itemsHtml = order.items?.map((item: any) => {
      const itemPrice = toNumber(item.price)
      const itemQuantity = toNumber(item.quantity) || 1
      const itemTotal = itemPrice * itemQuantity
      return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title || item.name || 'Product'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${itemQuantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `
    }).join('') || ''

    // Convert all order values to numbers safely
    const subtotal = toNumber(order.subtotal)
    const shipping = toNumber(order.shipping)
    const tax = toNumber(order.tax)
    const total = toNumber(order.total)
    const discountAmount = toNumber(order.discount_amount)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Order Confirmed!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${order.customer_name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your order! We've received your order and will process it shortly.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status || 'Pending'}</p>
            <p><strong>Payment Method:</strong> ${order.payment_method || 'N/A'}</p>
          </div>

          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #667eea;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Subtotal:</strong></td>
                <td style="text-align: right; padding: 5px 0;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Shipping:</strong></td>
                <td style="text-align: right; padding: 5px 0;">₹${shipping.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Tax:</strong></td>
                <td style="text-align: right; padding: 5px 0;">₹${tax.toFixed(2)}</td>
              </tr>
              ${discountAmount > 0 ? `
              <tr>
                <td style="padding: 5px 0;"><strong>Discount:</strong></td>
                <td style="text-align: right; padding: 5px 0; color: #28a745;">-₹${discountAmount.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr style="border-top: 2px solid #667eea;">
                <td style="padding: 10px 0;"><strong>Total:</strong></td>
                <td style="text-align: right; padding: 10px 0; font-size: 18px; font-weight: bold; color: #667eea;">₹${total.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">We'll send you another email once your order ships. Thank you for shopping with NEFOL®!</p>
        </div>
      </body>
      </html>
    `

    const recipient = sendToAdmin ? getAdminEmail() : order.customer_email
    const subject = sendToAdmin 
      ? `[Admin] New Order: ${order.order_number}` 
      : `Order Confirmation - ${order.order_number}`

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: recipient,
      subject,
      html
    })

    console.log(`✅ Order confirmation email sent to: ${recipient} for order: ${order.order_number}`)
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error)
    // Don't throw - email failures shouldn't break order creation
  }
}

// 4. Payment Failed Email
export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
  orderNumber: string,
  errorMessage?: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Failed</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Payment Failed</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">We encountered an issue processing your payment for order <strong>${orderNumber}</strong>.</p>
          ${errorMessage ? `<p style="font-size: 14px; color: #dc3545; background: #fff; padding: 15px; border-radius: 5px; margin: 20px 0;">${errorMessage}</p>` : ''}
          <p style="font-size: 16px; margin-bottom: 20px;">Don't worry - your order is still saved. Please try again or use a different payment method.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/checkout" style="background: #667eea; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Retry Payment</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you continue to experience issues, please contact our support team at ${getAdminEmail()}</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Payment Failed - Order ${orderNumber}`,
      html
    })

    console.log(`✅ Payment failed email sent to: ${userEmail} for order: ${orderNumber}`)
  } catch (error) {
    console.error('❌ Error sending payment failed email:', error)
    // Don't throw - email failures shouldn't break payment flow
  }
}

// 5. Order Status Update Email
export async function sendOrderStatusUpdateEmail(
  order: any
): Promise<void> {
  try {
    const statusMessages: { [key: string]: { title: string; message: string; color: string } } = {
      'shipped': {
        title: 'Your Order Has Shipped!',
        message: 'Great news! Your order has been shipped and is on its way to you.',
        color: '#28a745'
      },
      'out_for_delivery': {
        title: 'Out for Delivery',
        message: 'Your order is out for delivery and should arrive soon!',
        color: '#17a2b8'
      },
      'delivered': {
        title: 'Order Delivered!',
        message: 'Your order has been delivered. We hope you love your purchase!',
        color: '#667eea'
      }
    }

    const statusInfo = statusMessages[order.status?.toLowerCase()] || {
      title: 'Order Status Updated',
      message: `Your order status has been updated to: ${order.status}`,
      color: '#667eea'
    }

    const trackingHtml = order.tracking ? `
      <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${statusInfo.color};">
        <p style="margin: 0; font-size: 16px;"><strong>Tracking Number:</strong> ${order.tracking}</p>
        ${order.tracking_url ? `<p style="margin: 10px 0 0 0;"><a href="${order.tracking_url}" style="color: ${statusInfo.color}; text-decoration: none;">Track Your Order →</a></p>` : ''}
      </div>
    ` : ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: ${statusInfo.color}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">${statusInfo.title}</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${order.customer_name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">${statusInfo.message}</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${order.order_number}</p>
            <p style="margin: 10px 0 0 0;"><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${order.status}</span></p>
          </div>

          ${trackingHtml}

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/orders" style="background: ${statusInfo.color}; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Order Details</a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">Thank you for shopping with NEFOL®!</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `${statusInfo.title} - Order ${order.order_number}`,
      html
    })

    console.log(`✅ Order status update email sent to: ${order.customer_email} for order: ${order.order_number} (Status: ${order.status})`)
  } catch (error) {
    console.error('❌ Error sending order status update email:', error)
    // Don't throw - email failures shouldn't break status updates
  }
}

// 6. Cart Abandonment Email
export async function sendCartAbandonmentEmail(
  userEmail: string,
  userName: string,
  cartItems: any[]
): Promise<void> {
  try {
    const itemsHtml = cartItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product?.title || item.title || 'Product'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${((item.product?.price || item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('')

    const totalAmount = cartItems.reduce((sum, item) => {
      return sum + ((item.product?.price || item.price || 0) * (item.quantity || 1))
    }, 0)

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Complete Your Purchase</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #ffc107; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #333; margin: 0;">Don't Miss Out!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">You left some amazing products in your cart! Complete your purchase now before they're gone.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Items in Your Cart</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #667eea;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #667eea;">
                  <td colspan="2" style="padding: 10px 0; font-weight: bold;">Total:</td>
                  <td style="text-align: right; padding: 10px 0; font-size: 18px; font-weight: bold; color: #667eea;">₹${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/checkout" style="background: #667eea; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Complete Your Purchase</a>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">Hurry! Complete your checkout to secure these items before they're gone.</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Complete Your Purchase - Items Waiting in Your Cart',
      html
    })

    console.log(`✅ Cart abandonment email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending cart abandonment email:', error)
    // Don't throw - email failures shouldn't break cron job
  }
}

// 7. Password Reset Email
export async function sendPasswordResetEmail(
  userEmail: string,
  userName: string,
  resetLink: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">We received a request to reset your password for your NEFOL® account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #667eea; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Reset Your Password</a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Or copy and paste this link into your browser:</p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #ddd;">${resetLink}</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;"><strong>This link will expire in 15 minutes.</strong></p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">For security reasons, this link can only be used once.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you continue to have problems, please contact our support team.</p>
          
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Thank you,<br>The NEFOL® Team</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Reset Your Password - NEFOL®',
      html
    })

    console.log(`✅ Password reset email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    throw error // Throw here so we know if email sending failed
  }
}

// 8. Password Reset Confirmation Email
export async function sendPasswordResetConfirmationEmail(
  userEmail: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed Successfully</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #7DD3D3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Your password has been changed</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            This is a confirmation that the password for your NEFOL® account was just updated.
          </p>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            If this was you, no further action is needed. You can now sign in with your new password.
          </p>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            If you did not make this change, please secure your account immediately by resetting your password again and checking recent activity.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/login" style="background: #5EC4C4; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Go to login
            </a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 20px;">
            For your security, we never include your password in any email.
          </p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your NEFOL® password has been changed',
      html
    })

    console.log(`✅ Password reset confirmation email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending password reset confirmation email:', error)
    // Do not throw - this should not break the reset flow
  }
}

// 9. Email Verification OTP Email
export async function sendVerificationEmail(
  userEmail: string,
  otp: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #7DD3D3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Verify your email</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Please use the one-time code below to verify your email address for your NEFOL® account.
          </p>
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #E0EAEA; text-align: center; margin: 20px 0;">
            <span style="display: inline-block; font-size: 26px; letter-spacing: 8px; font-weight: bold; color: #333;">
              ${otp}
            </span>
          </div>
          <p style="font-size: 14px; color: #555; margin-bottom: 8px;">
            This code will expire in a few minutes. For your security, do not share it with anyone.
          </p>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">
            If you did not request this verification, you can ignore this email.
          </p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Verify your email address - NEFOL®',
      html
    })

    console.log(`✅ Verification email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
    // Do not throw - should not stop signup/login flows
  }
}

// 10. Login Alert Email (New Device/IP)
export async function sendLoginAlertEmail(
  userEmail: string,
  ipAddress: string | undefined,
  deviceInfo: string | undefined
): Promise<void> {
  try {
    const safeDevice = deviceInfo || 'Unknown device'
    const safeIp = ipAddress || 'Unknown IP'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Login Detected</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #7DD3D3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">New login to your account</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A new login to your NEFOL® account was just detected.
          </p>
          <div style="background: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #E0EAEA; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Device:</strong> ${safeDevice}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>IP Address:</strong> ${safeIp}</p>
            <p style="margin: 0; font-size: 13px; color: #777;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            If this was you, you can safely ignore this email.
          </p>
          <p style="font-size: 14px; color: #555; margin-bottom: 24px;">
            If you do not recognize this activity, we recommend that you change your password immediately and review your recent account activity.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/account" style="background: #5EC4C4; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Review account
            </a>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'New login detected on your NEFOL® account',
      html
    })

    console.log(`✅ Login alert email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending login alert email:', error)
  }
}

// 11. Account Security Alert Email
export async function sendAccountSecurityAlertEmail(
  userEmail: string,
  action: string
): Promise<void> {
  try {
    const safeAction = action || 'a security-related change'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Security Alert</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #dc3545; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Account security alert</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            A change related to your account security was detected: <strong>${safeAction}</strong>.
          </p>
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            If this was you, no further action is needed. If you do not recognize this, please secure your account immediately.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/account" style="background: #5EC4C4; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Review security settings
            </a>
          </div>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">
            For any help, you can contact our support team at ${getAdminEmail()}.
          </p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Security alert on your NEFOL® account',
      html
    })

    console.log(`✅ Account security alert email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending account security alert email:', error)
  }
}

// 12. Order Shipped Email (wrapper around status update)
export async function sendOrderShippedEmail(order: any): Promise<void> {
  try {
    // Reuse the existing status update email template and logic.
    await sendOrderStatusUpdateEmail(order)
    console.log(`✅ Order shipped email (status update) sent for order: ${order?.order_number}`)
  } catch (error) {
    console.error('❌ Error sending order shipped email:', error)
  }
}

// 13. Order Delivered Email (wrapper around status update)
export async function sendOrderDeliveredEmail(order: any): Promise<void> {
  try {
    await sendOrderStatusUpdateEmail(order)
    console.log(`✅ Order delivered email (status update) sent for order: ${order?.order_number}`)
  } catch (error) {
    console.error('❌ Error sending order delivered email:', error)
  }
}

// 14. Subscription Activated Email
export async function sendSubscriptionActivatedEmail(
  userEmail: string,
  plan: { name?: string; price?: number; interval?: string } | any
): Promise<void> {
  try {
    const planName = plan?.name || 'your subscription'
    const priceText = typeof plan?.price === 'number' ? `₹${plan.price.toFixed(2)}` : ''
    const intervalText = plan?.interval ? ` / ${plan.interval}` : ''

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Activated</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #7DD3D3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Your subscription is active</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for subscribing to ${planName} at NEFOL®.
          </p>
          ${priceText ? `
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            Plan price: <strong>${priceText}${intervalText}</strong>
          </p>` : ''}
          <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
            You can manage your subscription and billing details from your account at any time.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/subscriptions" style="background: #5EC4C4; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Manage subscription
            </a>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your NEFOL® subscription is active',
      html
    })

    console.log(`✅ Subscription activated email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending subscription activated email:', error)
  }
}

// 15. Subscription Reminder / Cancelled Email
export async function sendSubscriptionReminderOrCancelledEmail(
  userEmail: string,
  plan: { name?: string } | any,
  type: 'expiring' | 'cancelled' | string
): Promise<void> {
  try {
    const planName = plan?.name || 'your subscription'
    const normalizedType = (type || '').toLowerCase()

    const isExpiring = normalizedType === 'expiring'
    const title = isExpiring ? 'Your subscription is ending soon' : 'Your subscription has been cancelled'
    const subject = isExpiring
      ? 'Your NEFOL® subscription is ending soon'
      : 'Your NEFOL® subscription has been cancelled'

    const mainMessage = isExpiring
      ? `Your plan for ${planName} will end soon. If you want to keep your benefits, you can renew your subscription before it expires.`
      : `Your plan for ${planName} has been cancelled. You will keep access until the end of your current billing period, if applicable.`

    const ctaText = isExpiring ? 'Renew subscription' : 'View subscriptions'
    const ctaLink = 'https://thenefol.com/#/user/subscriptions'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #7DD3D3; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">${title}</h1>
        </div>
        <div style="background: #F4F9F9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${mainMessage}
          </p>
          <p style="font-size: 14px; color: #555; margin-bottom: 24px;">
            You can review your subscription options and make any changes from your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ctaLink}" style="background: #5EC4C4; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              ${ctaText}
            </a>
          </div>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: userEmail,
      subject,
      html
    })

    console.log(`✅ Subscription ${isExpiring ? 'reminder' : 'cancelled'} email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending subscription reminder/cancelled email:', error)
  }
}

// 15. Affiliate Code Email - Send affiliate verification code
export async function sendAffiliateCodeEmail(
  userEmail: string,
  userName: string,
  verificationCode: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Affiliate Verification Code</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">🎉 Congratulations!</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 18px;">Your Affiliate Application Has Been Approved</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">We're thrilled to inform you that your affiliate application has been approved! Welcome to the NEFOL® Affiliate Program.</p>
          <div style="background: #fff; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #667eea; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Your Affiliate Verification Code</p>
            <p style="margin: 0; font-size: 28px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: 'Courier New', monospace;">${verificationCode}</p>
          </div>
          <p style="font-size: 16px; margin-bottom: 20px;"><strong>What's Next?</strong></p>
          <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
            <li>Use this verification code to verify your affiliate account</li>
            <li>Start sharing your unique affiliate link</li>
            <li>Earn commissions on every successful referral</li>
            <li>Track your earnings and referrals in your affiliate dashboard</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://thenefol.com/#/user/affiliate" style="background: #667eea; color: #fff; padding: 14px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">Access Your Affiliate Dashboard</a>
          </div>
          <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Important:</strong> Keep this verification code secure. You'll need it to verify your affiliate account and access your dashboard.</p>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any questions, feel free to reach out to us at <a href="mailto:support@thenefol.com" style="color: #667eea;">support@thenefol.com</a></p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Welcome aboard! We're excited to have you as part of the NEFOL® family.</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Best regards,<br><strong>The NEFOL® Team</strong></p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL® Affiliate Program" <${getAdminEmail()}>`,
      to: userEmail,
      subject: '🎉 Your Affiliate Application Has Been Approved - Verification Code',
      html
    })

    console.log(`✅ Affiliate code email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending affiliate code email:', error)
    // Don't throw - email failures shouldn't break the approval process
  }
}

// 16. Affiliate Application Submitted Email - Send confirmation when user applies
export async function sendAffiliateApplicationSubmittedEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Affiliate Application Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Application Received!</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 18px;">Thank You for Your Interest</p>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Thank you for applying to join the NEFOL® Affiliate Program! We've received your application and our team is reviewing it.</p>
          <div style="background: #fff; padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #667eea;">
            <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: bold; color: #667eea;">What Happens Next?</p>
            <ul style="font-size: 16px; margin: 0; padding-left: 20px; color: #555;">
              <li style="margin-bottom: 10px;">Our team will review your application (usually within 24-48 hours)</li>
              <li style="margin-bottom: 10px;">You'll receive an email notification once your application is reviewed</li>
              <li style="margin-bottom: 10px;">If approved, you'll receive your affiliate verification code via email</li>
              <li style="margin-bottom: 10px;">You can then start sharing your unique affiliate link and earning commissions</li>
            </ul>
          </div>
          <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin-top: 30px; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Note:</strong> Please check your email regularly for updates on your application status. Make sure to check your spam folder as well.</p>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">If you have any questions about your application, feel free to reach out to us at <a href="mailto:support@thenefol.com" style="color: #667eea;">support@thenefol.com</a></p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">We appreciate your interest in partnering with NEFOL®!</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Best regards,<br><strong>The NEFOL® Team</strong></p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL® Affiliate Program" <${getAdminEmail()}>`,
      to: userEmail,
      subject: '✅ Your Affiliate Application Has Been Received',
      html
    })

    console.log(`✅ Affiliate application confirmation email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending affiliate application confirmation email:', error)
    // Don't throw - email failures shouldn't break the application submission
  }
}

// 17. Send Invoice PDF Email - Automatically send invoice PDF when order is created
export async function sendInvoicePDFEmail(
  pool: Pool,
  order: any,
  baseUrl: string = 'https://thenefol.com'
): Promise<void> {
  try {
    // Generate PDF invoice
    const pdfBuffer = await generateInvoicePDF(pool, order, baseUrl)
    
    const invoiceFileName = `Invoice-${order.invoice_number || order.order_number || order.id}.pdf`
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Invoice - ${order.order_number}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 10px;">
          <img src="https://thenefol.com//IMAGES/light%20theme%20logo.webp" alt="NEFOL® Logo" width="150" style="display: block; margin: 0 auto 20px auto;" />
        </div>
        <div style="background: #667eea; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: #fff; margin: 0;">Your Invoice</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${order.customer_name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">Thank you for your order! Please find your invoice attached to this email.</p>
          
          <div style="background: #fff; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #667eea;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            ${order.invoice_number ? `<p><strong>Invoice Number:</strong> ${order.invoice_number}</p>` : ''}
            <p><strong>Order Date:</strong> ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p><strong>Total Amount:</strong> ₹${parseFloat(order.total || 0).toFixed(2)}</p>
          </div>

          <p style="font-size: 14px; color: #666; margin-top: 30px;">The invoice PDF is attached to this email for your records.</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">If you have any questions about your order, please contact us at ${getAdminEmail()}</p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">Thank you for shopping with NEFOL®!</p>
        </div>
      </body>
      </html>
    `

    await transporter.sendMail({
      from: `"NEFOL®" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `Invoice - Order ${order.order_number}`,
      html,
      attachments: [
        {
          filename: invoiceFileName,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    })

    console.log(`✅ Invoice PDF email sent to: ${order.customer_email} for order: ${order.order_number}`)
  } catch (error: any) {
    // Log detailed error for debugging
    const errorMessage = error?.message || String(error)
    console.error('❌ Error sending invoice PDF email:', errorMessage)
    
    // Check if it's a Puppeteer browser launch error
    if (errorMessage.includes('Failed to launch the browser process') || 
        errorMessage.includes('libatk-1.0.so.0') ||
        errorMessage.includes('shared libraries')) {
      console.error('⚠️ Puppeteer browser dependencies missing. PDF generation skipped.')
      console.error('💡 To fix: Install required system libraries on the server:')
      console.error('   Ubuntu/Debian: sudo apt-get install -y libatk-bridge2.0-0 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2')
      console.error('   Or set PUPPETEER_EXECUTABLE_PATH environment variable to use system Chrome')
    }
    
    // Don't throw - email failures shouldn't break order creation
    // Order confirmation email will still be sent without PDF attachment
  }
}

