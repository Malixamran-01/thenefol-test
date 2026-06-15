// Email Service - All Email Automation Events
import { transporter, getAdminEmail } from '../utils/email'
import { Pool } from 'pg'
import { generateInvoicePDF } from '../utils/pdfGenerator'

const LOGO_URL = 'https://thenefol.com/IMAGES/NEFOL%20wide.png'
const BRAND_COLOR = '#1a1a2e'
const ACCENT_COLOR = '#667eea'

function emailWrapper(headerBg: string, headerContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- Logo header -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:24px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="NEFOL" width="160" style="display:inline-block;max-width:160px;" />
          </td>
        </tr>

        <!-- Coloured banner -->
        <tr>
          <td style="background:${headerBg};padding:32px 40px;text-align:center;">
            ${headerContent}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:#333333;font-size:15px;line-height:1.7;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f7f7f7;padding:24px 40px;text-align:center;border-top:1px solid #e8e8e8;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#888;">Questions? Reach us at <a href="mailto:${getAdminEmail()}" style="color:${ACCENT_COLOR};text-decoration:none;">${getAdminEmail()}</a></p>
            <p style="margin:0;font-size:12px;color:#aaa;">&copy; ${new Date().getFullYear()} NEFOL. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string, color = ACCENT_COLOR): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:13px 32px;border-radius:6px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">${label}</a>
  </div>`
}

function infoCard(content: string, accentColor = ACCENT_COLOR): string {
  return `<div style="background:#f9f9ff;border-left:4px solid ${accentColor};border-radius:0 8px 8px 0;padding:18px 20px;margin:20px 0;">${content}</div>`
}

// 1. Welcome Email
export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  try {
    const html = emailWrapper(
      `linear-gradient(135deg, ${ACCENT_COLOR} 0%, #764ba2 100%)`,
      `<h1 style="color:#fff;margin:0;font-size:26px;font-weight:700;">Welcome to NEFOL!</h1>
       <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:15px;">Your skincare journey starts here.</p>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>We're so glad you're here. Your NEFOL account is all set and ready to go.</p>
       <p>Discover our premium skincare and beauty products crafted with the finest natural ingredients — made with care, just for you.</p>
       ${ctaButton('https://thenefol.com', 'Start Shopping')}
       <p style="font-size:14px;color:#666;">Thank you for choosing NEFOL. We can't wait to be part of your skincare routine!</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Welcome to NEFOL — your account is ready.',
      html
    })
    console.log(`✅ Welcome email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending welcome email:', error)
  }
}

// 2. Cart Reminder
export async function sendCartAddedEmail(
  userEmail: string,
  userName: string,
  productName: string,
  productPrice: number
): Promise<void> {
  try {
    const html = emailWrapper(
      ACCENT_COLOR,
      `<h2 style="color:#fff;margin:0;font-size:22px;">Item Added to Your Cart</h2>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>Great choice! <strong>${productName}</strong> is waiting in your cart.</p>
       ${infoCard(`<p style="margin:0;font-size:17px;font-weight:700;">${productName}</p>
                   <p style="margin:8px 0 0;font-size:16px;color:${ACCENT_COLOR};font-weight:600;">₹${productPrice.toFixed(2)}</p>`)}
       ${ctaButton('https://thenefol.com/#/user/checkout', 'Complete Your Checkout')}
       <p style="font-size:14px;color:#666;">Don't wait too long — complete your purchase to secure your item!</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `${productName} added to your cart`,
      html
    })
    console.log(`✅ Cart reminder email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending cart reminder email:', error)
  }
}

// 3. Order Confirmation
export async function sendOrderConfirmationEmail(order: any, sendToAdmin: boolean = false): Promise<void> {
  try {
    const toNumber = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0
      const num = typeof value === 'string' ? parseFloat(value) : Number(value)
      return isNaN(num) ? 0 : num
    }

    const itemsHtml = order.items?.map((item: any) => {
      const itemPrice = toNumber(item.price)
      const itemQuantity = toNumber(item.quantity) || 1
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${item.title || item.name || 'Product'}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${itemQuantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">₹${(itemPrice * itemQuantity).toFixed(2)}</td>
      </tr>`
    }).join('') || ''

    const subtotal = toNumber(order.subtotal)
    const shipping = toNumber(order.shipping)
    const tax = toNumber(order.tax)
    const total = toNumber(order.total)
    const discountAmount = toNumber(order.discount_amount)

    const orderTable = `
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:10px 8px;text-align:left;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Item</th>
            <th style="padding:10px 8px;text-align:center;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Qty</th>
            <th style="padding:10px 8px;text-align:right;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr><td style="padding:5px 8px;font-size:14px;color:#555;">Subtotal</td><td style="text-align:right;padding:5px 8px;font-size:14px;">₹${subtotal.toFixed(2)}</td></tr>
        <tr><td style="padding:5px 8px;font-size:14px;color:#555;">Shipping</td><td style="text-align:right;padding:5px 8px;font-size:14px;">₹${shipping.toFixed(2)}</td></tr>
        <tr><td style="padding:5px 8px;font-size:14px;color:#555;">Tax</td><td style="text-align:right;padding:5px 8px;font-size:14px;">₹${tax.toFixed(2)}</td></tr>
        ${discountAmount > 0 ? `<tr><td style="padding:5px 8px;font-size:14px;color:#28a745;">Discount</td><td style="text-align:right;padding:5px 8px;font-size:14px;color:#28a745;">−₹${discountAmount.toFixed(2)}</td></tr>` : ''}
        <tr style="border-top:2px solid ${ACCENT_COLOR};">
          <td style="padding:12px 8px;font-weight:700;font-size:15px;">Total</td>
          <td style="text-align:right;padding:12px 8px;font-weight:700;font-size:17px;color:${ACCENT_COLOR};">₹${total.toFixed(2)}</td>
        </tr>
      </table>`

    const html = emailWrapper(
      ACCENT_COLOR,
      `<h1 style="color:#fff;margin:0;font-size:26px;">Order Confirmed!</h1>
       <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:14px;">Order #${order.order_number}</p>`,
      `<p>Hi <strong>${order.customer_name}</strong>,</p>
       <p>Thank you for your order! We've received it and will begin processing shortly.</p>
       ${infoCard(`<p style="margin:0 0 6px;font-size:14px;color:#555;"><strong>Order Number:</strong> ${order.order_number}</p>
                   <p style="margin:0 0 6px;font-size:14px;color:#555;"><strong>Payment Status:</strong> ${order.payment_status || 'Pending'}</p>
                   <p style="margin:0;font-size:14px;color:#555;"><strong>Payment Method:</strong> ${order.payment_method || 'N/A'}</p>`)}
       <h3 style="font-size:15px;color:${ACCENT_COLOR};margin:24px 0 12px;">Order Summary</h3>
       <div style="background:#f9f9ff;border-radius:8px;padding:20px;">${orderTable}</div>
       <p style="font-size:14px;color:#666;margin-top:24px;">We'll send you another email once your order ships. Thank you for shopping with NEFOL!</p>`
    )

    const recipient = sendToAdmin ? getAdminEmail() : order.customer_email
    const subject = sendToAdmin
      ? `[Admin] New Order: ${order.order_number}`
      : `Order Confirmed — #${order.order_number}`

    await transporter.sendMail({ from: `"NEFOL" <${getAdminEmail()}>`, to: recipient, subject, html })
    console.log(`✅ Order confirmation email sent to: ${recipient}`)
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error)
  }
}

// 4. Payment Failed
export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
  orderNumber: string,
  errorMessage?: string
): Promise<void> {
  try {
    const html = emailWrapper(
      '#dc3545',
      `<h1 style="color:#fff;margin:0;font-size:24px;">Payment Failed</h1>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>We encountered an issue processing your payment for order <strong>${orderNumber}</strong>.</p>
       ${errorMessage ? infoCard(`<p style="margin:0;font-size:14px;color:#dc3545;">${errorMessage}</p>`, '#dc3545') : ''}
       <p>Don't worry — your order is still saved. Please try again or use a different payment method.</p>
       ${ctaButton('https://thenefol.com/#/user/checkout', 'Retry Payment')}
       <p style="font-size:14px;color:#666;">If you continue to experience issues, please contact our support team.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Payment Failed — Order ${orderNumber}`,
      html
    })
    console.log(`✅ Payment failed email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending payment failed email:', error)
  }
}

// 5. Order Status Update
export async function sendOrderStatusUpdateEmail(order: any): Promise<void> {
  try {
    const statusMessages: { [key: string]: { title: string; message: string; color: string } } = {
      shipped: { title: 'Your Order Has Shipped!', message: 'Great news! Your order is on its way to you.', color: '#28a745' },
      out_for_delivery: { title: 'Out for Delivery', message: 'Your order is out for delivery and should arrive soon!', color: '#17a2b8' },
      delivered: { title: 'Order Delivered!', message: 'Your order has been delivered. We hope you love your purchase!', color: ACCENT_COLOR }
    }

    const statusInfo = statusMessages[order.status?.toLowerCase()] || {
      title: 'Order Status Updated',
      message: `Your order status has been updated to: ${order.status}`,
      color: ACCENT_COLOR
    }

    const trackingHtml = order.tracking
      ? infoCard(
          `<p style="margin:0 0 6px;font-size:14px;"><strong>Tracking Number:</strong> ${order.tracking}</p>
           ${order.tracking_url ? `<p style="margin:0;font-size:14px;"><a href="${order.tracking_url}" style="color:${statusInfo.color};font-weight:600;">Track Your Order →</a></p>` : ''}`,
          statusInfo.color
        )
      : ''

    const html = emailWrapper(
      statusInfo.color,
      `<h1 style="color:#fff;margin:0;font-size:24px;">${statusInfo.title}</h1>`,
      `<p>Hi <strong>${order.customer_name}</strong>,</p>
       <p>${statusInfo.message}</p>
       ${infoCard(`<p style="margin:0 0 6px;font-size:14px;"><strong>Order Number:</strong> ${order.order_number}</p>
                   <p style="margin:0;font-size:14px;"><strong>Status:</strong> <span style="color:${statusInfo.color};font-weight:700;">${order.status}</span></p>`, statusInfo.color)}
       ${trackingHtml}
       ${ctaButton('https://thenefol.com/#/user/orders', 'View Order Details', statusInfo.color)}
       <p style="font-size:14px;color:#666;">Thank you for shopping with NEFOL!</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `${statusInfo.title} — Order ${order.order_number}`,
      html
    })
    console.log(`✅ Order status update email sent to: ${order.customer_email}`)
  } catch (error) {
    console.error('❌ Error sending order status update email:', error)
  }
}

// 6. Cart Abandonment
export async function sendCartAbandonmentEmail(userEmail: string, userName: string, cartItems: any[]): Promise<void> {
  try {
    const itemsHtml = cartItems.map(item => `<tr>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${item.product?.title || item.title || 'Product'}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.quantity || 1}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">₹${((item.product?.price || item.price || 0) * (item.quantity || 1)).toFixed(2)}</td>
    </tr>`).join('')

    const totalAmount = cartItems.reduce((sum, item) => sum + ((item.product?.price || item.price || 0) * (item.quantity || 1)), 0)

    const html = emailWrapper(
      '#f59e0b',
      `<h1 style="color:#1a1a2e;margin:0;font-size:24px;">Don't Miss Out!</h1>
       <p style="color:rgba(26,26,46,0.7);margin:10px 0 0;font-size:15px;">You left some great items behind.</p>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>You left some amazing products in your cart. Complete your purchase before they're gone!</p>
       <div style="background:#f9f9ff;border-radius:8px;padding:20px;margin:20px 0;">
         <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
           <thead><tr style="background:#f5f5f5;">
             <th style="padding:10px 8px;text-align:left;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;">Item</th>
             <th style="padding:10px 8px;text-align:center;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;">Qty</th>
             <th style="padding:10px 8px;text-align:right;border-bottom:2px solid ${ACCENT_COLOR};font-size:13px;">Price</th>
           </tr></thead>
           <tbody>${itemsHtml}</tbody>
           <tfoot><tr style="border-top:2px solid ${ACCENT_COLOR};">
             <td colspan="2" style="padding:12px 8px;font-weight:700;font-size:15px;">Total</td>
             <td style="text-align:right;padding:12px 8px;font-weight:700;font-size:17px;color:${ACCENT_COLOR};">₹${totalAmount.toFixed(2)}</td>
           </tr></tfoot>
         </table>
       </div>
       ${ctaButton('https://thenefol.com/#/user/checkout', 'Complete Your Purchase')}
       <p style="font-size:14px;color:#666;">Hurry — complete your checkout to secure these items!</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Complete Your Purchase — Items Waiting in Your Cart',
      html
    })
    console.log(`✅ Cart abandonment email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending cart abandonment email:', error)
  }
}

// 7. Password Reset
export async function sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string): Promise<void> {
  try {
    const html = emailWrapper(
      ACCENT_COLOR,
      `<h1 style="color:#fff;margin:0;font-size:24px;">Password Reset Request</h1>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>We received a request to reset the password for your NEFOL account. Click the button below to set a new password.</p>
       ${ctaButton(resetLink, 'Reset Your Password')}
       <p style="font-size:14px;color:#666;">Or copy and paste this link into your browser:</p>
       <p style="font-size:12px;color:#999;word-break:break-all;background:#f5f5f5;padding:10px 14px;border-radius:6px;border:1px solid #ddd;">${resetLink}</p>
       <p style="font-size:14px;color:#666;"><strong>This link will expire in 15 minutes.</strong></p>
       <p style="font-size:14px;color:#666;">If you did not request a password reset, please ignore this email — your password will remain unchanged.</p>
       <p style="font-size:14px;color:#666;">For security reasons, this link can only be used once.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Reset Your Password — NEFOL',
      html
    })
    console.log(`✅ Password reset email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending password reset email:', error)
    throw error
  }
}

// 8. Password Reset Confirmation
export async function sendPasswordResetConfirmationEmail(userEmail: string): Promise<void> {
  try {
    const html = emailWrapper(
      '#7DD3D3',
      `<h1 style="color:#fff;margin:0;font-size:24px;">Your Password Has Been Changed</h1>`,
      `<p>This is a confirmation that the password for your NEFOL account was just updated.</p>
       <p style="font-size:14px;color:#555;">If this was you, no further action is needed. You can now sign in with your new password.</p>
       <p style="font-size:14px;color:#555;">If you did not make this change, please secure your account immediately by resetting your password and checking recent activity.</p>
       ${ctaButton('https://thenefol.com/#/user/login', 'Go to Login', '#5EC4C4')}
       <p style="font-size:12px;color:#999;">For your security, we never include your password in any email.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your NEFOL password has been changed',
      html
    })
    console.log(`✅ Password reset confirmation email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending password reset confirmation email:', error)
  }
}

// 9. Email Verification OTP
export async function sendVerificationEmail(userEmail: string, otp: string): Promise<void> {
  try {
    const html = emailWrapper(
      '#7DD3D3',
      `<h1 style="color:#fff;margin:0;font-size:24px;">Verify Your Email</h1>`,
      `<p>Please use the one-time code below to verify your email address for your NEFOL account.</p>
       <div style="background:#f9f9ff;border:2px dashed ${ACCENT_COLOR};border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
         <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.5px;">Your verification code</p>
         <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:10px;color:#1a1a2e;font-family:'Courier New',monospace;">${otp}</span>
       </div>
       <p style="font-size:14px;color:#555;">This code will expire in a few minutes. For your security, do not share it with anyone.</p>
       <p style="font-size:12px;color:#999;">If you did not request this verification, you can ignore this email.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Verify your email address — NEFOL',
      html
    })
    console.log(`✅ Verification email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending verification email:', error)
  }
}

// 10. Login Alert
export async function sendLoginAlertEmail(
  userEmail: string,
  ipAddress: string | undefined,
  deviceInfo: string | undefined
): Promise<void> {
  try {
    const safeDevice = deviceInfo || 'Unknown device'
    const safeIp = ipAddress || 'Unknown IP'

    const html = emailWrapper(
      '#7DD3D3',
      `<h1 style="color:#fff;margin:0;font-size:24px;">New Login Detected</h1>`,
      `<p>A new login to your NEFOL account was just detected.</p>
       ${infoCard(`
         <p style="margin:0 0 8px;font-size:14px;"><strong>Device:</strong> ${safeDevice}</p>
         <p style="margin:0 0 8px;font-size:14px;"><strong>IP Address:</strong> ${safeIp}</p>
         <p style="margin:0;font-size:13px;color:#777;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
       `, '#5EC4C4')}
       <p style="font-size:14px;color:#555;">If this was you, you can safely ignore this email.</p>
       <p style="font-size:14px;color:#555;">If you do not recognise this activity, we recommend changing your password immediately and reviewing your recent account activity.</p>
       ${ctaButton('https://thenefol.com/#/user/account', 'Review Account', '#5EC4C4')}`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'New login detected on your NEFOL account',
      html
    })
    console.log(`✅ Login alert email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending login alert email:', error)
  }
}

// 11. Account Security Alert
export async function sendAccountSecurityAlertEmail(userEmail: string, action: string): Promise<void> {
  try {
    const safeAction = action || 'a security-related change'

    const html = emailWrapper(
      '#dc3545',
      `<h1 style="color:#fff;margin:0;font-size:24px;">Account Security Alert</h1>`,
      `<p>A change related to your account security was detected: <strong>${safeAction}</strong>.</p>
       <p style="font-size:14px;color:#555;">If this was you, no further action is needed. If you do not recognise this, please secure your account immediately.</p>
       ${ctaButton('https://thenefol.com/#/user/account', 'Review Security Settings', '#5EC4C4')}
       <p style="font-size:12px;color:#999;">For any help, contact our support team.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Security alert on your NEFOL account',
      html
    })
    console.log(`✅ Account security alert email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending account security alert email:', error)
  }
}

// 12. Order Shipped (wrapper)
export async function sendOrderShippedEmail(order: any): Promise<void> {
  try {
    await sendOrderStatusUpdateEmail(order)
    console.log(`✅ Order shipped email sent for order: ${order?.order_number}`)
  } catch (error) {
    console.error('❌ Error sending order shipped email:', error)
  }
}

// 13. Order Delivered (wrapper)
export async function sendOrderDeliveredEmail(order: any): Promise<void> {
  try {
    await sendOrderStatusUpdateEmail(order)
    console.log(`✅ Order delivered email sent for order: ${order?.order_number}`)
  } catch (error) {
    console.error('❌ Error sending order delivered email:', error)
  }
}

// 14. Subscription Activated
export async function sendSubscriptionActivatedEmail(
  userEmail: string,
  plan: { name?: string; price?: number; interval?: string } | any
): Promise<void> {
  try {
    const planName = plan?.name || 'your subscription'
    const priceText = typeof plan?.price === 'number' ? `₹${plan.price.toFixed(2)}` : ''
    const intervalText = plan?.interval ? ` / ${plan.interval}` : ''

    const html = emailWrapper(
      '#7DD3D3',
      `<h1 style="color:#fff;margin:0;font-size:24px;">Your Subscription Is Active</h1>`,
      `<p>Thank you for subscribing to <strong>${planName}</strong> at NEFOL.</p>
       ${priceText ? infoCard(`<p style="margin:0;font-size:14px;">Plan: <strong>${planName}</strong><br>Price: <strong>${priceText}${intervalText}</strong></p>`, '#5EC4C4') : ''}
       <p style="font-size:14px;color:#555;">You can manage your subscription and billing details from your account at any time.</p>
       ${ctaButton('https://thenefol.com/#/user/subscriptions', 'Manage Subscription', '#5EC4C4')}`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your NEFOL subscription is active',
      html
    })
    console.log(`✅ Subscription activated email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending subscription activated email:', error)
  }
}

// 15. Subscription Reminder / Cancelled
export async function sendSubscriptionReminderOrCancelledEmail(
  userEmail: string,
  plan: { name?: string } | any,
  type: 'expiring' | 'cancelled' | string
): Promise<void> {
  try {
    const planName = plan?.name || 'your subscription'
    const isExpiring = (type || '').toLowerCase() === 'expiring'
    const title = isExpiring ? 'Your Subscription Is Ending Soon' : 'Your Subscription Has Been Cancelled'
    const subject = isExpiring ? 'Your NEFOL subscription is ending soon' : 'Your NEFOL subscription has been cancelled'
    const mainMessage = isExpiring
      ? `Your plan for <strong>${planName}</strong> will end soon. Renew before it expires to keep your benefits.`
      : `Your plan for <strong>${planName}</strong> has been cancelled. You'll keep access until the end of your current billing period.`

    const html = emailWrapper(
      '#7DD3D3',
      `<h1 style="color:#fff;margin:0;font-size:24px;">${title}</h1>`,
      `<p>${mainMessage}</p>
       <p style="font-size:14px;color:#555;">You can review your subscription options and make changes from your account at any time.</p>
       ${ctaButton('https://thenefol.com/#/user/subscriptions', isExpiring ? 'Renew Subscription' : 'View Subscriptions', '#5EC4C4')}`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject,
      html
    })
    console.log(`✅ Subscription ${isExpiring ? 'reminder' : 'cancelled'} email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending subscription reminder/cancelled email:', error)
  }
}

// 16. Affiliate Code (Approved)
export async function sendAffiliateCodeEmail(
  userEmail: string,
  userName: string,
  verificationCode: string
): Promise<void> {
  try {
    const html = emailWrapper(
      `linear-gradient(135deg, ${ACCENT_COLOR} 0%, #764ba2 100%)`,
      `<h1 style="color:#fff;margin:0;font-size:26px;">Congratulations!</h1>
       <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">Your Affiliate Application Has Been Approved</p>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>We're thrilled to inform you that your affiliate application has been approved! Welcome to the NEFOL Affiliate Program.</p>
       <div style="background:#f9f9ff;border:2px solid ${ACCENT_COLOR};border-radius:10px;padding:24px;text-align:center;margin:24px 0;">
         <p style="margin:0 0 10px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1.5px;">Your Affiliate Verification Code</p>
         <span style="display:inline-block;font-size:28px;font-weight:700;color:${ACCENT_COLOR};letter-spacing:4px;font-family:'Courier New',monospace;">${verificationCode}</span>
       </div>
       <p><strong>What's Next?</strong></p>
       <ul style="font-size:14px;color:#555;padding-left:20px;line-height:1.9;">
         <li>Use this verification code to verify your affiliate account</li>
         <li>Start sharing your unique affiliate link</li>
         <li>Earn commissions on every successful referral</li>
         <li>Track your earnings and referrals in your affiliate dashboard</li>
       </ul>
       ${ctaButton('https://thenefol.com/#/user/affiliate', 'Access Your Affiliate Dashboard')}
       ${infoCard(`<p style="margin:0;font-size:13px;color:#555;"><strong>Important:</strong> Keep this verification code secure. You'll need it to verify your affiliate account and access your dashboard.</p>`)}
       <p style="font-size:14px;color:#666;">Welcome aboard! We're excited to have you as part of the NEFOL family.</p>
       <p style="font-size:14px;color:#666;">Best regards,<br><strong>The NEFOL Team</strong></p>`
    )

    await transporter.sendMail({
      from: `"NEFOL Affiliate Program" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your Affiliate Application Has Been Approved — Verification Code',
      html
    })
    console.log(`✅ Affiliate code email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending affiliate code email:', error)
  }
}

// 17. Affiliate Application Submitted
export async function sendAffiliateApplicationSubmittedEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  try {
    const html = emailWrapper(
      `linear-gradient(135deg, ${ACCENT_COLOR} 0%, #764ba2 100%)`,
      `<h1 style="color:#fff;margin:0;font-size:26px;">Application Received!</h1>
       <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:16px;">Thank You for Your Interest</p>`,
      `<p>Hi <strong>${userName}</strong>,</p>
       <p>Thank you for applying to join the NEFOL Affiliate Program! We've received your application and our team is reviewing it.</p>
       ${infoCard(`<p style="margin:0 0 12px;font-size:15px;font-weight:700;color:${ACCENT_COLOR};">What Happens Next?</p>
         <ul style="margin:0;padding-left:20px;font-size:14px;color:#555;line-height:1.9;">
           <li>Our team will review your application (usually within 24–48 hours)</li>
           <li>You'll receive an email notification once it's reviewed</li>
           <li>If approved, you'll receive your affiliate verification code via email</li>
           <li>You can then start sharing your unique affiliate link and earning commissions</li>
         </ul>`)}
       <p style="font-size:14px;color:#555;margin-top:20px;"><strong>Note:</strong> Please check your email regularly for updates. Don't forget to check your spam folder as well.</p>
       <p style="font-size:14px;color:#666;">We appreciate your interest in partnering with NEFOL!</p>
       <p style="font-size:14px;color:#666;">Best regards,<br><strong>The NEFOL Team</strong></p>`
    )

    await transporter.sendMail({
      from: `"NEFOL Affiliate Program" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your Affiliate Application Has Been Received',
      html
    })
    console.log(`✅ Affiliate application confirmation email sent to: ${userEmail}`)
  } catch (error) {
    console.error('❌ Error sending affiliate application confirmation email:', error)
  }
}

// 18. Invoice PDF Email
export async function sendInvoicePDFEmail(
  pool: Pool,
  order: any,
  baseUrl: string = 'https://thenefol.com'
): Promise<void> {
  try {
    const pdfBuffer = await generateInvoicePDF(pool, order, baseUrl)
    const invoiceFileName = `Invoice-${order.invoice_number || order.order_number || order.id}.pdf`

    const html = emailWrapper(
      ACCENT_COLOR,
      `<h1 style="color:#fff;margin:0;font-size:24px;">Your Invoice</h1>
       <p style="color:rgba(255,255,255,0.85);margin:10px 0 0;font-size:14px;">Order #${order.order_number}</p>`,
      `<p>Hi <strong>${order.customer_name}</strong>,</p>
       <p>Thank you for your order! Please find your invoice attached to this email.</p>
       ${infoCard(`
         <p style="margin:0 0 6px;font-size:14px;"><strong>Order Number:</strong> ${order.order_number}</p>
         ${order.invoice_number ? `<p style="margin:0 0 6px;font-size:14px;"><strong>Invoice Number:</strong> ${order.invoice_number}</p>` : ''}
         <p style="margin:0 0 6px;font-size:14px;"><strong>Order Date:</strong> ${new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
         <p style="margin:0;font-size:14px;font-weight:700;"><strong>Total Amount:</strong> ₹${parseFloat(order.total || 0).toFixed(2)}</p>
       `)}
       <p style="font-size:14px;color:#666;">The invoice PDF is attached to this email for your records. Thank you for shopping with NEFOL!</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `Invoice — Order ${order.order_number}`,
      html,
      attachments: [{ filename: invoiceFileName, content: pdfBuffer, contentType: 'application/pdf' }]
    })
    console.log(`✅ Invoice PDF email sent to: ${order.customer_email}`)
  } catch (error: any) {
    const errorMessage = error?.message || String(error)
    console.error('❌ Error sending invoice PDF email:', errorMessage)
    if (
      errorMessage.includes('Failed to launch the browser process') ||
      errorMessage.includes('libatk-1.0.so.0') ||
      errorMessage.includes('shared libraries')
    ) {
      console.error('⚠️ Puppeteer browser dependencies missing. PDF generation skipped.')
    }
  }
}

// 19. Staff / Admin Onboarding Invitation
export async function sendStaffAdminInvitationEmail({
  to,
  inviteUrl,
  expiresInHours,
}: {
  to: string
  inviteUrl: string
  expiresInHours: number
}): Promise<void> {
  try {
    const html = emailWrapper(
      BRAND_COLOR,
      `<h1 style="color:#fff;margin:0;font-size:24px;">You're Invited to Join NEFOL Admin</h1>
       <p style="color:rgba(255,255,255,0.7);margin:10px 0 0;font-size:14px;">Complete your onboarding to get started</p>`,
      `<p>You've been invited to join the <strong>NEFOL admin panel</strong> as a staff member.</p>
       <p>Click the button below to complete your onboarding — confirm your details, review and accept the staff agreement, and set your password.</p>
       ${ctaButton(inviteUrl, 'Complete Admin Onboarding')}
       ${infoCard(`
         <p style="margin:0 0 8px;font-size:14px;"><strong>What happens after onboarding?</strong></p>
         <ul style="margin:0;padding-left:18px;font-size:14px;color:#555;line-height:1.8;">
           <li>An administrator will assign your access roles</li>
           <li>You'll be able to log in to the admin panel immediately</li>
           <li>Your account will have the permissions set by your administrator</li>
         </ul>
       `)}
       <p style="font-size:14px;color:#888;">This invitation link expires in <strong>${expiresInHours} hours</strong>. If you weren't expecting this, you can safely ignore this email.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to,
      subject: 'Complete your NEFOL admin onboarding',
      html,
    })
    console.log(`✅ Staff invitation email sent to: ${to}`)
  } catch (error) {
    console.error('❌ Error sending staff invitation email:', error)
    throw error
  }
}
