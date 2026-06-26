// Email Service — All Email Automation Events
import { transporter, getAdminEmail } from '../utils/email'
import { Pool } from 'pg'
import { generateInvoicePDF } from '../utils/pdfGenerator'

const SITE_URL     = 'https://thenefol.com'
const LOGO_URL     = 'https://thenefol.com/IMAGES/NEFOL%20wide.png'
const BRAND_DARK   = '#0f172a'   // near-black navy for header
const BRAND_ACCENT = '#7c3aed'   // rich violet
const BRAND_GOLD   = '#f59e0b'   // amber accent
const TEXT_DARK    = '#1e293b'
const TEXT_MID     = '#475569'
const TEXT_LIGHT   = '#94a3b8'
const BG_PAGE      = '#f1f5f9'
const BG_CARD      = '#ffffff'
const BG_SUBTLE    = '#f8fafc'
const BORDER       = '#e2e8f0'

// ─── Layout helpers ──────────────────────────────────────────────────────────

function shell(preheader: string, headerHtml: string, bodyHtml: string, footerExtra = ''): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>NEFOL</title>
</head>
<body style="margin:0;padding:0;background:${BG_PAGE};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- preheader -->
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG_PAGE};padding:32px 0 48px;">
    <tr><td align="center" style="padding:0 16px;">

      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BG_CARD};border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        <!-- Logo bar -->
        <tr>
          <td style="background:${BRAND_DARK};padding:20px 40px;text-align:center;">
            <img src="${LOGO_URL}" alt="NEFOL" width="140" style="display:inline-block;max-width:140px;" />
          </td>
        </tr>

        <!-- Hero banner -->
        ${headerHtml}

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;color:${TEXT_DARK};font-size:15px;line-height:1.75;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BG_SUBTLE};padding:24px 40px;text-align:center;border-top:1px solid ${BORDER};">
            ${footerExtra ? `<div style="margin-bottom:14px;">${footerExtra}</div>` : ''}
            <p style="margin:0 0 6px;font-size:13px;color:${TEXT_MID};">Questions? Email us at <a href="mailto:${getAdminEmail()}" style="color:${BRAND_ACCENT};text-decoration:none;font-weight:600;">${getAdminEmail()}</a></p>
            <p style="margin:0 0 10px;font-size:12px;color:${TEXT_LIGHT};">
              <a href="${SITE_URL}" style="color:${TEXT_LIGHT};text-decoration:none;">thenefol.com</a>
              &nbsp;&bull;&nbsp;
              <a href="${SITE_URL}/#/privacy" style="color:${TEXT_LIGHT};text-decoration:none;">Privacy</a>
              &nbsp;&bull;&nbsp;
              <a href="${SITE_URL}/#/user/orders" style="color:${TEXT_LIGHT};text-decoration:none;">My Orders</a>
            </p>
            <p style="margin:0;font-size:11px;color:${TEXT_LIGHT};">&copy; ${new Date().getFullYear()} NEFOL Beauty. All rights reserved.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function heroBanner(bg: string, emoji: string, title: string, subtitle = ''): string {
  return `<tr>
    <td style="background:${bg};padding:36px 40px 32px;text-align:center;">
      <div style="font-size:42px;margin-bottom:12px;line-height:1;">${emoji}</div>
      <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${title}</h1>
      ${subtitle ? `<p style="margin:0;font-size:15px;color:rgba(255,255,255,0.82);">${subtitle}</p>` : ''}
    </td>
  </tr>`
}

function btn(href: string, label: string, bg = BRAND_ACCENT): string {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${href}" style="display:inline-block;background:${bg};color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.2px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">${label}</a>
  </div>`
}

function infoBox(html: string, accent = BRAND_ACCENT): string {
  return `<div style="background:${BG_SUBTLE};border-left:4px solid ${accent};border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0;font-size:14px;color:${TEXT_DARK};">${html}</div>`
}

function divider(): string {
  return `<div style="border-top:1px solid ${BORDER};margin:24px 0;"></div>`
}

function badge(text: string, bg = BRAND_ACCENT): string {
  return `<span style="display:inline-block;background:${bg};color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:50px;letter-spacing:0.5px;text-transform:uppercase;">${text}</span>`
}

// ─── Order item row with product image ───────────────────────────────────────

function orderItemRow(item: any): string {
  const toNum = (v: any) => { const n = parseFloat(String(v ?? 0)); return isNaN(n) ? 0 : n }
  const price = toNum(item.price)
  const qty   = toNum(item.quantity) || 1
  const lineTotal = (price * qty).toFixed(2)
  const name  = item.title || item.name || 'Product'
  const img   = item.listImage || item.list_image || item.image || ''
  const slug  = item.slug || ''

  const imgCell = img
    ? `<img src="${img}" alt="${name}" width="80" height="80" style="width:80px;height:80px;object-fit:cover;border-radius:8px;display:block;border:1px solid ${BORDER};" />`
    : `<div style="width:80px;height:80px;border-radius:8px;background:${BG_SUBTLE};border:1px solid ${BORDER};display:flex;align-items:center;justify-content:center;font-size:28px;">🧴</div>`

  const productUrl = slug ? `${SITE_URL}/#/products/${slug}` : SITE_URL

  return `<tr>
    <td style="padding:16px 0;border-bottom:1px solid ${BORDER};vertical-align:top;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="width:88px;vertical-align:top;padding-right:16px;">
            <a href="${productUrl}" style="text-decoration:none;">${imgCell}</a>
          </td>
          <td style="vertical-align:top;">
            <a href="${productUrl}" style="font-size:15px;font-weight:600;color:${TEXT_DARK};text-decoration:none;display:block;margin-bottom:4px;">${name}</a>
            ${item.variant ? `<p style="margin:0 0 4px;font-size:13px;color:${TEXT_MID};">${item.variant}</p>` : ''}
            <p style="margin:0;font-size:13px;color:${TEXT_MID};">Qty: <strong>${qty}</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Unit price: <strong>₹${price.toFixed(2)}</strong></p>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;padding-left:12px;">
            <span style="font-size:16px;font-weight:700;color:${TEXT_DARK};">₹${lineTotal}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function orderTotalsTable(order: any): string {
  const toNum = (v: any) => { const n = parseFloat(String(v ?? 0)); return isNaN(n) ? 0 : n }
  const subtotal  = toNum(order.subtotal)
  const shipping  = toNum(order.shipping)
  const discount  = toNum(order.discount_amount)
  const segDisc   = toNum(order.segment_discount)
  const coinsUsed = toNum(order.coins_used)
  const total     = toNum(order.total)

  const row = (label: string, value: string, bold = false, color = TEXT_DARK) =>
    `<tr>
      <td style="padding:6px 0;font-size:14px;color:${TEXT_MID};">${label}</td>
      <td style="padding:6px 0;font-size:14px;font-weight:${bold ? '700' : '400'};color:${color};text-align:right;">${value}</td>
    </tr>`

  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
    ${row('Subtotal', `₹${subtotal.toFixed(2)}`)}
    ${row('Shipping', shipping > 0 ? `₹${shipping.toFixed(2)}` : '<span style="color:#16a34a;font-weight:600;">Free</span>')}
    ${discount  > 0 ? row('Discount (coupon)', `−₹${discount.toFixed(2)}`, false, '#16a34a') : ''}
    ${segDisc   > 0 ? row('Member discount',   `−₹${segDisc.toFixed(2)}`,  false, '#16a34a') : ''}
    ${coinsUsed > 0 ? row(`Nefol Coins (${coinsUsed} coins)`, `−₹${(coinsUsed / 10).toFixed(2)}`, false, BRAND_GOLD) : ''}
    <tr><td colspan="2" style="padding:6px 0;"><div style="border-top:2px solid ${BRAND_ACCENT};"></div></td></tr>
    <tr>
      <td style="padding:10px 0;font-size:17px;font-weight:800;color:${TEXT_DARK};">Total Paid</td>
      <td style="padding:10px 0;font-size:20px;font-weight:800;color:${BRAND_ACCENT};text-align:right;">₹${total.toFixed(2)}</td>
    </tr>
  </table>`
}

function shippingAddressBlock(addr: any): string {
  if (!addr) return ''
  const a = typeof addr === 'string' ? (() => { try { return JSON.parse(addr) } catch { return {} } })() : addr
  const name    = a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim()
  const street  = [a.address || a.street, a.apartment || a.area].filter(Boolean).join(', ')
  const cityLine = [a.city, a.state, a.zip || a.pincode].filter(Boolean).join(', ')
  const phone   = a.phone || ''

  return `<div style="font-size:14px;color:${TEXT_DARK};line-height:1.8;">
    ${name    ? `<strong>${name}</strong><br>` : ''}
    ${street  ? `${street}<br>` : ''}
    ${cityLine ? `${cityLine}<br>` : ''}
    ${a.country || 'India'}${phone ? `<br>📞 ${phone}` : ''}
  </div>`
}

// ─── 1. Welcome / Sign-up ────────────────────────────────────────────────────

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      `Welcome to NEFOL, ${firstName}! Your account is ready.`,
      heroBanner(
        `linear-gradient(135deg, ${BRAND_ACCENT} 0%, #4f46e5 100%)`,
        '🌿',
        `Welcome to NEFOL, ${firstName}!`,
        'Your skincare journey starts now.'
      ),
      `<p style="font-size:16px;margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>We're so excited to have you here. Your NEFOL account is all set — you're now part of a community that believes in honest, clean skincare made with real ingredients.</p>

       <div style="background:linear-gradient(135deg,#faf5ff,#ede9fe);border-radius:12px;padding:24px 28px;margin:24px 0;text-align:center;">
         <p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${BRAND_ACCENT};">What's waiting for you</p>
         <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;">
           <tr>
             <td style="text-align:center;padding:8px;vertical-align:top;width:33%;">
               <div style="font-size:28px;margin-bottom:8px;">🛍️</div>
               <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_DARK};">Shop Premium</p>
               <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MID};">100% natural skincare</p>
             </td>
             <td style="text-align:center;padding:8px;vertical-align:top;width:33%;">
               <div style="font-size:28px;margin-bottom:8px;">🪙</div>
               <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_DARK};">Earn Coins</p>
               <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MID};">5% back on every order</p>
             </td>
             <td style="text-align:center;padding:8px;vertical-align:top;width:33%;">
               <div style="font-size:28px;margin-bottom:8px;">🤝</div>
               <p style="margin:0;font-size:13px;font-weight:600;color:${TEXT_DARK};">Refer & Earn</p>
               <p style="margin:4px 0 0;font-size:12px;color:${TEXT_MID};">Share with friends</p>
             </td>
           </tr>
         </table>
       </div>

       ${btn(`${SITE_URL}`, 'Start Shopping →')}

       <p style="font-size:13px;color:${TEXT_MID};text-align:center;margin-top:-8px;">Use code <strong>WELCOME10</strong> on your first order for a special surprise 🎁</p>
       ${divider()}
       <p style="font-size:14px;color:${TEXT_MID};">Need help? Just reply to this email — our team is always here.</p>
       <p style="font-size:14px;color:${TEXT_DARK};">With love,<br><strong>Team NEFOL 🌿</strong></p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Welcome to NEFOL, ${firstName}! 🌿 Your account is ready`,
      html
    })
    console.log(`✅ Welcome email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Welcome email error:', err)
  }
}

// ─── 2. Email OTP Verification ───────────────────────────────────────────────

export async function sendVerificationEmail(userEmail: string, otp: string): Promise<void> {
  try {
    const html = shell(
      `Your NEFOL verification code is ${otp}`,
      heroBanner('#0f172a', '🔐', 'Verify Your Email', 'One quick step to secure your account'),
      `<p>Use the code below to verify your NEFOL account. This code expires in <strong>10 minutes</strong>.</p>

       <div style="background:${BG_SUBTLE};border:2px dashed ${BRAND_ACCENT};border-radius:12px;padding:28px;text-align:center;margin:28px 0;">
         <p style="margin:0 0 8px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:${TEXT_LIGHT};">Verification Code</p>
         <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:${BRAND_ACCENT};font-family:'Courier New',Courier,monospace;line-height:1;">${otp}</div>
       </div>

       <p style="font-size:14px;color:${TEXT_MID};">⚠️ <strong>Never share this code with anyone</strong> — NEFOL will never ask for it via phone or chat.</p>
       <p style="font-size:13px;color:${TEXT_LIGHT};">If you didn't request this, you can safely ignore this email.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `${otp} is your NEFOL verification code`,
      html
    })
    console.log(`✅ Verification email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Verification email error:', err)
  }
}

// ─── 3. Password Reset ───────────────────────────────────────────────────────

export async function sendPasswordResetEmail(userEmail: string, userName: string, resetLink: string): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      'Reset your NEFOL password',
      heroBanner(BRAND_DARK, '🔑', 'Password Reset', 'We received a request to reset your password'),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p>Click the button below to set a new password for your NEFOL account. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>

       ${btn(resetLink, 'Reset My Password')}

       <p style="font-size:13px;color:${TEXT_MID};text-align:center;margin-top:-12px;">Or paste this link in your browser:</p>
       <p style="font-size:12px;color:${TEXT_LIGHT};word-break:break-all;background:${BG_SUBTLE};padding:12px 16px;border-radius:6px;border:1px solid ${BORDER};">${resetLink}</p>

       ${infoBox(`<strong>Didn't request this?</strong> Your password hasn't changed. You can safely ignore this email. If you're concerned, <a href="${SITE_URL}/#/contact" style="color:${BRAND_ACCENT};">contact our support team</a>.`, '#dc2626')}

       <p style="font-size:13px;color:${TEXT_LIGHT};">For security, NEFOL never asks for your password over email or chat.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Reset your NEFOL password',
      html
    })
    console.log(`✅ Password reset email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Password reset email error:', err)
    throw err
  }
}

// ─── 4. Password Changed Confirmation ────────────────────────────────────────

export async function sendPasswordResetConfirmationEmail(userEmail: string): Promise<void> {
  try {
    const html = shell(
      'Your NEFOL password was changed',
      heroBanner('#16a34a', '✅', 'Password Changed', 'Your account password was updated successfully'),
      `<p>This is a confirmation that the password for your NEFOL account was just changed.</p>
       <p style="font-size:14px;color:${TEXT_MID};">If <strong>you made this change</strong>, no further action is needed. Sign in with your new password.</p>

       ${btn(`${SITE_URL}/#/user/login`, 'Sign In to NEFOL', '#16a34a')}

       ${infoBox(`<strong>Didn't change your password?</strong> Someone may have access to your account. <a href="${SITE_URL}/#/user/forgot-password" style="color:#dc2626;font-weight:600;">Reset your password immediately</a> and contact us at ${getAdminEmail()}.`, '#dc2626')}

       <p style="font-size:13px;color:${TEXT_LIGHT};">NEFOL never stores or emails your actual password.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Your NEFOL password has been changed',
      html
    })
    console.log(`✅ Password confirmation email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Password confirmation email error:', err)
  }
}

// ─── 5. Login Alert ──────────────────────────────────────────────────────────

export async function sendLoginAlertEmail(
  userEmail: string,
  ipAddress: string | undefined,
  deviceInfo: string | undefined
): Promise<void> {
  try {
    const html = shell(
      'New login detected on your NEFOL account',
      heroBanner('#0f172a', '🛡️', 'New Login Detected', 'Someone signed in to your account'),
      `<p>A new sign-in to your NEFOL account was detected.</p>

       ${infoBox(`
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr><td style="padding:4px 0;font-size:14px;width:120px;color:${TEXT_MID};">🕐 Time</td><td style="font-size:14px;color:${TEXT_DARK};font-weight:600;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
           <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_MID};">📱 Device</td><td style="font-size:14px;color:${TEXT_DARK};font-weight:600;">${deviceInfo || 'Unknown device'}</td></tr>
           <tr><td style="padding:4px 0;font-size:14px;color:${TEXT_MID};">🌐 IP</td><td style="font-size:14px;color:${TEXT_DARK};font-weight:600;">${ipAddress || 'Unknown'}</td></tr>
         </table>
       `)}

       <p style="font-size:14px;color:${TEXT_MID};">If this was you — great, you're all set! If not, secure your account immediately.</p>

       ${btn(`${SITE_URL}/#/user/account`, 'Review My Account', '#dc2626')}`
    )
    await transporter.sendMail({
      from: `"NEFOL Security" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'New sign-in to your NEFOL account',
      html
    })
    console.log(`✅ Login alert email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Login alert email error:', err)
  }
}

// ─── 6. Account Security Alert ───────────────────────────────────────────────

export async function sendAccountSecurityAlertEmail(userEmail: string, action: string): Promise<void> {
  try {
    const html = shell(
      'Security alert on your NEFOL account',
      heroBanner('#dc2626', '⚠️', 'Security Alert', 'An important change was made to your account'),
      `<p>The following change was made to your NEFOL account:</p>
       ${infoBox(`<p style="margin:0;font-size:15px;font-weight:600;">${action || 'Account security change'}</p>`, '#dc2626')}
       <p style="font-size:14px;color:${TEXT_MID};">If this was you — you're all set. If not, please take action below immediately.</p>
       ${btn(`${SITE_URL}/#/user/account`, 'Secure My Account', '#dc2626')}
       <p style="font-size:13px;color:${TEXT_LIGHT};">For urgent help, email us directly at ${getAdminEmail()}</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL Security" <${getAdminEmail()}>`,
      to: userEmail,
      subject: '⚠️ Security alert on your NEFOL account',
      html
    })
    console.log(`✅ Security alert email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Security alert email error:', err)
  }
}

// ─── 7. Order Confirmation ────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order: any, sendToAdmin = false): Promise<void> {
  try {
    const items: any[] = Array.isArray(order.items) ? order.items : (() => {
      try { return JSON.parse(order.items || '[]') } catch { return [] }
    })()

    const shippingAddr = (() => {
      try {
        return typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : (order.shipping_address || {})
      } catch { return {} }
    })()

    const paymentLabel: Record<string, string> = {
      razorpay: 'Online Payment (Razorpay)',
      'coins+razorpay': 'Coins + Online Payment',
      cod: 'Cash on Delivery',
      coins: 'Nefol Coins',
    }
    const pmLabel = paymentLabel[order.payment_method] || order.payment_method || 'Online Payment'

    const isCOD = order.payment_method === 'cod'
    const itemsHtml = items.map(orderItemRow).join('')
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const customerBody = `
      <p style="font-size:16px;margin-top:0;">Hi <strong>${(order.customer_name || 'there').split(' ')[0]}</strong>, 👋</p>
      <p style="font-size:15px;">Your order has been ${isCOD ? 'placed' : 'confirmed and paid'} — thank you for shopping with NEFOL! 🎉</p>

      <!-- Order meta -->
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;margin:20px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:${TEXT_MID};width:50%;vertical-align:top;">
              <span style="font-weight:700;color:${TEXT_DARK};display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order Number</span>
              <span style="font-size:16px;font-weight:800;color:${BRAND_ACCENT};">${order.order_number}</span>
            </td>
            <td style="padding:4px 0;font-size:13px;color:${TEXT_MID};vertical-align:top;">
              <span style="font-weight:700;color:${TEXT_DARK};display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order Date</span>
              <span style="font-size:14px;font-weight:600;color:${TEXT_DARK};">${orderDate}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0 4px;font-size:13px;color:${TEXT_MID};vertical-align:top;">
              <span style="font-weight:700;color:${TEXT_DARK};display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Payment</span>
              <span style="font-size:14px;font-weight:600;color:${TEXT_DARK};">${pmLabel}</span>
            </td>
            <td style="padding:10px 0 4px;font-size:13px;color:${TEXT_MID};vertical-align:top;">
              <span style="font-weight:700;color:${TEXT_DARK};display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Status</span>
              ${badge(isCOD ? 'Pending COD' : 'Paid', isCOD ? BRAND_GOLD : '#16a34a')}
            </td>
          </tr>
        </table>
      </div>

      <!-- Items -->
      <h3 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TEXT_MID};margin:28px 0 0;">Your Items</h3>
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemsHtml}
      </table>

      <!-- Totals -->
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;margin:20px 0;">
        ${orderTotalsTable(order)}
      </div>

      <!-- Shipping address -->
      <h3 style="font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TEXT_MID};margin:28px 0 12px;">Shipping To</h3>
      <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;">
        ${shippingAddressBlock(shippingAddr)}
      </div>

      ${btn(`${SITE_URL}/#/user/orders`, 'Track My Order')}

      ${isCOD ? infoBox(`<strong>COD Reminder:</strong> Please keep the exact amount of ₹${parseFloat(order.total || 0).toFixed(2)} ready at the time of delivery.`, BRAND_GOLD) : ''}

      ${divider()}
      <p style="font-size:14px;color:${TEXT_MID};">We'll send you a shipping confirmation once your order is dispatched. Thank you for choosing NEFOL! 🌿</p>
    `

    const adminBody = `
      <p>New order received on NEFOL.</p>
      ${infoBox(`
        <p style="margin:0 0 6px;font-size:14px;"><strong>Order:</strong> ${order.order_number}</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Customer:</strong> ${order.customer_name} (${order.customer_email})</p>
        <p style="margin:0 0 6px;font-size:14px;"><strong>Payment:</strong> ${pmLabel}</p>
        <p style="margin:0;font-size:14px;"><strong>Total:</strong> ₹${parseFloat(order.total || 0).toFixed(2)}</p>
      `)}
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemsHtml}
      </table>
      ${btn(`${SITE_URL}/loginasadmin/orders`, 'View in Admin Panel', BRAND_DARK)}
    `

    const recipient = sendToAdmin ? getAdminEmail() : order.customer_email
    const subject = sendToAdmin
      ? `[New Order] ${order.order_number} — ${order.customer_name} (₹${parseFloat(order.total || 0).toFixed(2)})`
      : `Order Confirmed ✅ — ${order.order_number}`

    const html = shell(
      sendToAdmin ? `New order ${order.order_number} from ${order.customer_name}` : `Your NEFOL order ${order.order_number} is confirmed!`,
      heroBanner(
        isCOD ? `linear-gradient(135deg, ${BRAND_GOLD} 0%, #d97706 100%)` : `linear-gradient(135deg, #16a34a 0%, #15803d 100%)`,
        isCOD ? '📦' : '✅',
        sendToAdmin ? 'New Order Received' : (isCOD ? 'Order Placed!' : 'Order Confirmed!'),
        sendToAdmin ? `Order #${order.order_number}` : (isCOD ? 'Your order is being prepared.' : 'Payment received. We\'re on it!')
      ),
      sendToAdmin ? adminBody : customerBody
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: recipient,
      subject,
      html
    })
    console.log(`✅ Order confirmation email sent to: ${recipient}`)
  } catch (err) {
    console.error('❌ Order confirmation email error:', err)
  }
}

// ─── 8. Payment Failed ────────────────────────────────────────────────────────

export async function sendPaymentFailedEmail(
  userEmail: string,
  userName: string,
  orderNumber: string,
  errorMessage?: string
): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      `Payment failed for order ${orderNumber}`,
      heroBanner('#dc2626', '❌', 'Payment Failed', `We couldn't process your payment for order ${orderNumber}`),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p>Unfortunately we couldn't process your payment. Don't worry — your cart items are still saved.</p>

       ${errorMessage ? infoBox(`<strong>Reason:</strong> ${errorMessage}`, '#dc2626') : ''}

       <p style="font-size:14px;color:${TEXT_MID};">Common reasons payments fail:</p>
       <ul style="font-size:14px;color:${TEXT_MID};line-height:2;padding-left:20px;">
         <li>Insufficient balance in the account</li>
         <li>Bank declined the transaction</li>
         <li>Incorrect card/UPI details entered</li>
         <li>Session timed out before payment</li>
       </ul>

       ${btn(`${SITE_URL}/#/user/orders`, 'Retry Payment')}
       ${divider()}
       <p style="font-size:14px;color:${TEXT_MID};">If the issue persists, please contact your bank or reach us at <a href="mailto:${getAdminEmail()}" style="color:${BRAND_ACCENT};">${getAdminEmail()}</a>.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Payment failed — Order ${orderNumber}`,
      html
    })
    console.log(`✅ Payment failed email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Payment failed email error:', err)
  }
}

// ─── 9. Order Status Update (Shipped / Out for Delivery / Delivered) ─────────

export async function sendOrderStatusUpdateEmail(order: any): Promise<void> {
  try {
    const status = (order.status || '').toLowerCase()

    const statusConfig: Record<string, { emoji: string; title: string; sub: string; bg: string; body: string }> = {
      shipped: {
        emoji: '🚚',
        title: 'Your Order Has Shipped!',
        sub: `Order ${order.order_number} is on its way`,
        bg: `linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)`,
        body: `<p>Great news! Your NEFOL order has been dispatched and is headed your way.</p>`
      },
      out_for_delivery: {
        emoji: '🛵',
        title: 'Out for Delivery!',
        sub: 'Expect it today',
        bg: `linear-gradient(135deg, ${BRAND_GOLD} 0%, #d97706 100%)`,
        body: `<p>Your NEFOL order is <strong>out for delivery</strong> and should reach you today. Please keep your phone handy!</p>`
      },
      delivered: {
        emoji: '🎉',
        title: 'Order Delivered!',
        sub: 'Enjoy your NEFOL products',
        bg: `linear-gradient(135deg, #16a34a 0%, #15803d 100%)`,
        body: `<p>Your order has been delivered! We hope you love your new NEFOL products. 🌿</p>
               <p style="font-size:14px;color:${TEXT_MID};">Share your experience — leave a review and help others discover what works for them.</p>
               ${btn(`${SITE_URL}/#/products`, 'Leave a Review', '#16a34a')}`
      }
    }

    const cfg = statusConfig[status] || {
      emoji: '📦',
      title: 'Order Update',
      sub: `Status: ${order.status}`,
      bg: `linear-gradient(135deg, ${BRAND_ACCENT} 0%, #4f46e5 100%)`,
      body: `<p>Your order status has been updated to <strong>${order.status}</strong>.</p>`
    }

    const trackingBlock = (order.tracking || order.tracking_number)
      ? infoBox(`
          <p style="margin:0 0 8px;font-size:14px;"><strong>Tracking Number:</strong> ${order.tracking || order.tracking_number}</p>
          <p style="margin:0 0 8px;font-size:14px;"><strong>Courier:</strong> ${order.courier_name || order.courier || 'Partner Courier'}</p>
          ${order.tracking_url ? `<p style="margin:0;font-size:14px;"><a href="${order.tracking_url}" style="color:${BRAND_ACCENT};font-weight:700;">Track Live →</a></p>` : ''}
        `, '#0ea5e9')
      : ''

    const items: any[] = Array.isArray(order.items) ? order.items : (() => {
      try { return JSON.parse(order.items || '[]') } catch { return [] }
    })()

    const html = shell(
      cfg.title,
      heroBanner(cfg.bg, cfg.emoji, cfg.title, cfg.sub),
      `<p>Hi <strong>${(order.customer_name || 'there').split(' ')[0]}</strong>,</p>
       ${cfg.body}

       ${infoBox(`<p style="margin:0 0 6px;font-size:14px;"><strong>Order:</strong> ${order.order_number}</p>
                  <p style="margin:0;font-size:14px;"><strong>Status:</strong> ${order.status}</p>`)}

       ${trackingBlock}

       ${items.length > 0 ? `
         <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TEXT_MID};margin:24px 0 0;">Items in This Order</h3>
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           ${items.map(orderItemRow).join('')}
         </table>` : ''}

       ${btn(`${SITE_URL}/#/user/orders`, 'View Order Details')}
       <p style="font-size:14px;color:${TEXT_MID};">Thank you for shopping with NEFOL! 🌿</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `${cfg.emoji} ${cfg.title} — Order ${order.order_number}`,
      html
    })
    console.log(`✅ Order status email sent: ${order.customer_email}`)
  } catch (err) {
    console.error('❌ Order status email error:', err)
  }
}

// Wrappers kept for backward compat
export async function sendOrderShippedEmail(order: any): Promise<void> {
  await sendOrderStatusUpdateEmail({ ...order, status: order.status || 'shipped' })
}
export async function sendOrderDeliveredEmail(order: any): Promise<void> {
  await sendOrderStatusUpdateEmail({ ...order, status: order.status || 'delivered' })
}

// ─── 10. Cart Added Reminder ──────────────────────────────────────────────────

export async function sendCartAddedEmail(
  userEmail: string,
  userName: string,
  productName: string,
  productPrice: number
): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      `${productName} is waiting in your cart`,
      heroBanner(`linear-gradient(135deg, ${BRAND_ACCENT} 0%, #4f46e5 100%)`, '🛒', 'Item in Your Cart', productName),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p><strong>${productName}</strong> is sitting in your cart, waiting for you!</p>

       ${infoBox(`
         <p style="margin:0 0 6px;font-size:15px;font-weight:700;">${productName}</p>
         <p style="margin:0;font-size:17px;font-weight:800;color:${BRAND_ACCENT};">₹${productPrice.toFixed(2)}</p>
       `)}

       ${btn(`${SITE_URL}/#/user/checkout`, 'Complete My Purchase')}
       <p style="font-size:13px;color:${TEXT_LIGHT};text-align:center;margin-top:-12px;">Stock is limited — grab yours before it's gone!</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `You left ${productName} in your cart 🛒`,
      html
    })
    console.log(`✅ Cart reminder email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Cart reminder email error:', err)
  }
}

// ─── 11. Cart Abandonment ─────────────────────────────────────────────────────

export async function sendCartAbandonmentEmail(userEmail: string, userName: string, cartItems: any[]): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const total = cartItems.reduce((s, i) => s + ((i.product?.price || i.price || 0) * (i.quantity || 1)), 0)

    const itemsHtml = cartItems.map(i => orderItemRow({
      title: i.product?.title || i.title,
      price: i.product?.price || i.price || 0,
      quantity: i.quantity || 1,
      listImage: i.product?.listImage || i.listImage || i.image || '',
      slug: i.product?.slug || i.slug || ''
    })).join('')

    const html = shell(
      `You left ${cartItems.length} item(s) in your NEFOL cart`,
      heroBanner(`linear-gradient(135deg, ${BRAND_GOLD} 0%, #d97706 100%)`, '⏰', 'Still Thinking?', 'Your cart is waiting for you'),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p>You left some great products in your cart. Complete your order before they sell out!</p>

       <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TEXT_MID};margin:24px 0 0;">Your Cart</h3>
       <table width="100%" cellpadding="0" cellspacing="0" border="0">
         ${itemsHtml}
       </table>

       <div style="text-align:right;padding:12px 0;">
         <span style="font-size:13px;color:${TEXT_MID};">Cart Total: </span>
         <span style="font-size:18px;font-weight:800;color:${BRAND_ACCENT};">₹${total.toFixed(2)}</span>
       </div>

       ${btn(`${SITE_URL}/#/user/checkout`, 'Complete My Purchase', BRAND_GOLD)}
       <p style="font-size:13px;color:${TEXT_LIGHT};text-align:center;margin-top:-12px;">Stock is limited — don't miss out!</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `⏰ Still thinking? Your NEFOL cart is waiting`,
      html
    })
    console.log(`✅ Cart abandonment email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Cart abandonment email error:', err)
  }
}

// ─── 12. Subscription Activated ───────────────────────────────────────────────

export async function sendSubscriptionActivatedEmail(
  userEmail: string,
  plan: { name?: string; price?: number; interval?: string } | any
): Promise<void> {
  try {
    const planName = plan?.name || 'your plan'
    const priceText = typeof plan?.price === 'number' ? `₹${plan.price.toFixed(2)}` : ''
    const intervalText = plan?.interval ? ` / ${plan.interval}` : ''

    const html = shell(
      `Your NEFOL subscription is active`,
      heroBanner(`linear-gradient(135deg, #16a34a 0%, #15803d 100%)`, '✅', 'Subscription Active!', `Welcome to ${planName}`),
      `<p>Your <strong>${planName}</strong> subscription is now active. Here's what you get:</p>

       ${priceText ? infoBox(`
         <p style="margin:0 0 4px;font-size:14px;"><strong>Plan:</strong> ${planName}</p>
         <p style="margin:0;font-size:16px;font-weight:800;color:${BRAND_ACCENT};">${priceText}${intervalText}</p>
       `, '#16a34a') : ''}

       ${btn(`${SITE_URL}/#/user/subscriptions`, 'Manage My Subscription', '#16a34a')}
       <p style="font-size:13px;color:${TEXT_MID};">You can cancel or change your plan at any time from your account.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Your ${planName} subscription is active ✅`,
      html
    })
    console.log(`✅ Subscription activated email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Subscription activated email error:', err)
  }
}

// ─── 13. Subscription Expiring / Cancelled ────────────────────────────────────

export async function sendSubscriptionReminderOrCancelledEmail(
  userEmail: string,
  plan: { name?: string } | any,
  type: 'expiring' | 'cancelled' | string
): Promise<void> {
  try {
    const planName = plan?.name || 'your subscription'
    const isExpiring = type === 'expiring'

    const html = shell(
      isExpiring ? `Your NEFOL subscription is ending soon` : `Your NEFOL subscription was cancelled`,
      heroBanner(
        isExpiring ? `linear-gradient(135deg,${BRAND_GOLD},#d97706)` : `linear-gradient(135deg,#64748b,#475569)`,
        isExpiring ? '⚠️' : '🔕',
        isExpiring ? 'Subscription Ending Soon' : 'Subscription Cancelled',
        planName
      ),
      `<p>${isExpiring
        ? `Your <strong>${planName}</strong> is ending soon. Renew now to keep your benefits uninterrupted.`
        : `Your <strong>${planName}</strong> has been cancelled. You'll retain access until the end of the current billing period.`
      }</p>
      ${btn(`${SITE_URL}/#/user/subscriptions`, isExpiring ? 'Renew Now' : 'View Plans', isExpiring ? BRAND_GOLD : BRAND_ACCENT)}`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: isExpiring ? `Your ${planName} ends soon — renew now` : `Your ${planName} has been cancelled`,
      html
    })
    console.log(`✅ Subscription ${type} email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Subscription reminder/cancelled email error:', err)
  }
}

// ─── 14. Affiliate Application Submitted ──────────────────────────────────────

export async function sendAffiliateApplicationSubmittedEmail(
  userEmail: string,
  userName: string
): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      `We received your NEFOL affiliate application`,
      heroBanner(
        `linear-gradient(135deg, ${BRAND_ACCENT} 0%, #4f46e5 100%)`,
        '📩',
        'Application Received!',
        'Thank you for your interest in NEFOL Affiliates'
      ),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p>Thank you for applying to the <strong>NEFOL Affiliate Program</strong>! We've received your application and our team will review it shortly.</p>

       <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:12px;padding:22px 26px;margin:24px 0;">
         <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:${BRAND_ACCENT};">What happens next?</p>
         <table cellpadding="0" cellspacing="0" border="0" width="100%">
           ${['Our team reviews your application (24–48 hrs)',
              'You receive an approval email with your verification code',
              'Start sharing your unique link and earning commissions',
              'Track earnings in your affiliate dashboard'].map((s, i) => `
           <tr>
             <td style="width:32px;vertical-align:top;padding:4px 12px 4px 0;">
               <div style="width:24px;height:24px;border-radius:50%;background:${BRAND_ACCENT};color:#fff;font-size:12px;font-weight:800;text-align:center;line-height:24px;">${i + 1}</div>
             </td>
             <td style="font-size:14px;color:${TEXT_DARK};padding:4px 0;">${s}</td>
           </tr>`).join('')}
         </table>
       </div>

       <p style="font-size:14px;color:${TEXT_MID};">Please check your inbox (and spam folder) for our decision email. We typically respond within 24–48 hours.</p>
       <p style="font-size:14px;color:${TEXT_DARK};">Excited to potentially have you on board!<br><strong>Team NEFOL 🌿</strong></p>`
    )
    await transporter.sendMail({
      from: `"NEFOL Affiliates" <${getAdminEmail()}>`,
      to: userEmail,
      subject: '📩 Your NEFOL affiliate application has been received',
      html
    })
    console.log(`✅ Affiliate application email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Affiliate application email error:', err)
  }
}

// ─── 15. Affiliate Approved — One-Time Code ───────────────────────────────────

export async function sendAffiliateCodeEmail(
  userEmail: string,
  userName: string,
  verificationCode: string
): Promise<void> {
  try {
    const firstName = (userName || 'there').split(' ')[0]
    const html = shell(
      `Congratulations ${firstName}! You're approved as a NEFOL Affiliate`,
      heroBanner(
        `linear-gradient(135deg, #16a34a 0%, #15803d 100%)`,
        '🎉',
        `Congratulations, ${firstName}!`,
        'Your NEFOL Affiliate account is approved'
      ),
      `<p>Hi <strong>${firstName}</strong>,</p>
       <p>Welcome to the <strong>NEFOL Affiliate Program</strong>! Your application has been approved — here's your one-time verification code to activate your dashboard.</p>

       <!-- Code block -->
       <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #16a34a;border-radius:14px;padding:28px;text-align:center;margin:28px 0;">
         <p style="margin:0 0 10px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#15803d;">Your Verification Code</p>
         <div style="font-size:40px;font-weight:900;letter-spacing:12px;color:#16a34a;font-family:'Courier New',Courier,monospace;line-height:1.1;">${verificationCode}</div>
         <p style="margin:12px 0 0;font-size:13px;color:#15803d;">Enter this code in your affiliate dashboard to verify your account.</p>
       </div>

       <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:12px;padding:20px 24px;margin:20px 0;">
         <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${TEXT_DARK};">🚀 Getting started</p>
         <table cellpadding="0" cellspacing="0" border="0" width="100%">
           ${[
             ['🔗', 'Verify your account using the code above'],
             ['🌐', 'Get your unique affiliate referral link'],
             ['📢', 'Share it with your audience'],
             ['💰', 'Earn commissions on every successful referral'],
             ['📊', 'Track all earnings in your dashboard'],
           ].map(([icon, text]) => `
           <tr>
             <td style="width:28px;font-size:18px;padding:4px 10px 4px 0;vertical-align:top;">${icon}</td>
             <td style="font-size:14px;color:${TEXT_DARK};padding:4px 0;">${text}</td>
           </tr>`).join('')}
         </table>
       </div>

       ${btn(`${SITE_URL}/#/user/affiliate`, 'Go to Affiliate Dashboard', '#16a34a')}

       ${infoBox(`<strong>⚠️ Keep this code private.</strong> This one-time code is linked to your account. Never share it publicly.`, '#dc2626')}

       <p style="font-size:14px;color:${TEXT_DARK};">Welcome to the family! 🌿<br><strong>Team NEFOL</strong></p>`
    )
    await transporter.sendMail({
      from: `"NEFOL Affiliates" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `🎉 You're approved! Your NEFOL affiliate verification code`,
      html
    })
    console.log(`✅ Affiliate approval email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Affiliate approval email error:', err)
  }
}

// ─── 16. Invoice PDF Email ────────────────────────────────────────────────────

export async function sendInvoicePDFEmail(
  pool: Pool,
  order: any,
  baseUrl = SITE_URL
): Promise<void> {
  try {
    const pdfBuffer = await generateInvoicePDF(pool, order, baseUrl)
    const invoiceFileName = `Invoice-${order.invoice_number || order.order_number || order.id}.pdf`

    const items: any[] = Array.isArray(order.items) ? order.items : (() => {
      try { return JSON.parse(order.items || '[]') } catch { return [] }
    })()

    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const html = shell(
      `Your NEFOL invoice for order ${order.order_number}`,
      heroBanner(BRAND_DARK, '🧾', 'Your Invoice', `Order ${order.order_number}`),
      `<p>Hi <strong>${(order.customer_name || 'there').split(' ')[0]}</strong>,</p>
       <p>Thank you for your order! Your invoice is attached as a PDF. Here's a summary:</p>

       <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;margin:20px 0;">
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           <tr>
             <td style="font-size:13px;color:${TEXT_MID};width:50%;vertical-align:top;padding:4px 0;">
               <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order Number</span>
               <span style="font-size:15px;font-weight:800;color:${BRAND_ACCENT};">${order.order_number}</span>
             </td>
             <td style="font-size:13px;color:${TEXT_MID};vertical-align:top;padding:4px 0;">
               <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Invoice Number</span>
               <span style="font-size:15px;font-weight:700;color:${TEXT_DARK};">${order.invoice_number || '—'}</span>
             </td>
           </tr>
           <tr>
             <td style="font-size:13px;color:${TEXT_MID};vertical-align:top;padding:12px 0 4px;">
               <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Order Date</span>
               <span style="font-size:14px;font-weight:600;color:${TEXT_DARK};">${orderDate}</span>
             </td>
             <td style="font-size:13px;color:${TEXT_MID};vertical-align:top;padding:12px 0 4px;">
               <span style="display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Amount Paid</span>
               <span style="font-size:18px;font-weight:900;color:${BRAND_ACCENT};">₹${parseFloat(order.total || 0).toFixed(2)}</span>
             </td>
           </tr>
         </table>
       </div>

       ${items.length > 0 ? `
         <h3 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${TEXT_MID};margin:24px 0 0;">Items</h3>
         <table width="100%" cellpadding="0" cellspacing="0" border="0">
           ${items.map(orderItemRow).join('')}
         </table>
         <div style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;margin:16px 0;">
           ${orderTotalsTable(order)}
         </div>` : ''}

       ${btn(`${SITE_URL}/#/user/orders`, 'View Order Details')}
       <p style="font-size:14px;color:${TEXT_MID};">Your invoice PDF is attached. Keep it for your records. 🌿</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `🧾 Invoice — Order ${order.order_number}`,
      html,
      attachments: [{ filename: invoiceFileName, content: pdfBuffer, contentType: 'application/pdf' }]
    })
    console.log(`✅ Invoice PDF email sent: ${order.customer_email}`)
  } catch (err: any) {
    const msg = err?.message || String(err)
    console.error('❌ Invoice PDF email error:', msg)
    if (msg.includes('Failed to launch') || msg.includes('libatk') || msg.includes('shared libraries')) {
      console.error('⚠️ Puppeteer dependencies missing — PDF generation skipped.')
    }
  }
}

// ─── 17. Staff Admin Invitation ───────────────────────────────────────────────

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
    const html = shell(
      `You're invited to join the NEFOL admin panel`,
      heroBanner(BRAND_DARK, '🔐', "You're Invited!", 'Join the NEFOL Admin Team'),
      `<p>You've been invited to join the <strong>NEFOL Admin Panel</strong> as a staff member.</p>
       <p>Click the button below to complete your onboarding — confirm your details, accept the staff agreement, and set your password.</p>

       ${btn(inviteUrl, 'Complete My Onboarding')}

       ${infoBox(`
         <p style="margin:0 0 10px;font-size:14px;font-weight:700;">After onboarding you will:</p>
         <ul style="margin:0;padding-left:18px;font-size:14px;color:${TEXT_MID};line-height:2;">
           <li>Receive your role and permissions from an administrator</li>
           <li>Be able to log in to the admin panel immediately</li>
           <li>Have access to features set by your admin</li>
         </ul>
       `)}

       <p style="font-size:13px;color:${TEXT_LIGHT};">This invitation expires in <strong>${expiresInHours} hours</strong>. If you weren't expecting this email, you can safely ignore it.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to,
      subject: "You're invited — complete your NEFOL admin onboarding",
      html
    })
    console.log(`✅ Staff invitation email sent: ${to}`)
  } catch (err) {
    console.error('❌ Staff invitation email error:', err)
    throw err
  }
}
