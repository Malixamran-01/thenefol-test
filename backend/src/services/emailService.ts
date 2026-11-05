// Email Service — All Email Automation Events
//
// Design notes (email-client safe):
// - Table layout + inline styles; bulletproof buttons that render in Outlook.
// - No CSS gradients, emoji heroes or white-on-colour headlines: Gmail's dark mode inverts those
//   unpredictably. Content sits on a white card with dark text, which inverts cleanly.
// - Midnight Gold theme (common/src/theme.ts): midnight header band with the NEFöL text wordmark,
//   gold accents, midnight buttons. The wordmark is live text, so it shows even with images off.
// - Product photos are converted to cached JPEG thumbnails (Outlook can't show WebP).
import { transporter, getAdminEmail } from '../utils/email'
import { Pool } from 'pg'
import { generateInvoicePDF } from '../utils/pdfGenerator'
import { toEmailImage } from '../utils/ogImage'

const SITE_URL   = 'https://thenefol.com'
const MEDIA_BASE = (process.env.PUBLIC_MEDIA_URL || SITE_URL).replace(/\/$/, '')
const COMPANY    = 'Nefol Aesthetics Private Limited'
const INSTAGRAM  = 'https://www.instagram.com/nefol_official'

// Palette — the storefront's Midnight Gold theme (common/src/theme.ts)
const MIDNIGHT     = '#111827'   // header band, buttons, headings
const GOLD         = '#B08D57'   // wordmark, rules, dots (decorative: 3:1 on white)
const GOLD_DEEP    = '#7A5E36'   // gold for text on white: links, labels, prices (AA)
const ACCENT       = GOLD_DEEP
const WARN         = '#b45309'   // amber, AA contrast with white text
const DANGER       = '#b91c1c'
const INFO         = MIDNIGHT    // neutral status labels ("Shipped") stay on-theme
const TEXT_DARK    = '#111827'
const TEXT_MID     = '#4b5563'
const TEXT_LIGHT   = '#6b7280'
const BG_PAGE      = '#F5F1EA'
const BG_CARD      = '#ffffff'
const BG_SUBTLE    = '#FAF6EF'
const BORDER       = '#ECE4D6'
const FONT         = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif`
const HEADING_FONT = `'Playfair Display',Georgia,'Times New Roman',serif`
const BRAND_FONT   = `'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif`

type Tone = 'gold' | 'amber' | 'red' | 'blue' | 'slate'
const TONE: Record<Tone, string> = {
  gold: GOLD_DEEP,
  amber: WARN,
  red: DANGER,
  blue: INFO,
  slate: TEXT_MID,
}

const URLS = {
  home: SITE_URL,
  shop: `${SITE_URL}/#/user/shop`,
  cart: `${SITE_URL}/#/user/cart`,
  checkout: `${SITE_URL}/#/user/checkout`,
  orders: `${SITE_URL}/#/user/orders`,
  account: `${SITE_URL}/#/user/account`,
  login: `${SITE_URL}/#/user/login`,
  contact: `${SITE_URL}/#/user/contact`,
  privacy: `${SITE_URL}/#/user/privacy-policy`,
  affiliate: `${SITE_URL}/#/user/affiliate`,
  product: (slug: string) => `${SITE_URL}/product/${encodeURIComponent(slug)}`,
}

// ─── Small utils ─────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const toNum = (v: any) => { const n = parseFloat(String(v ?? 0)); return isNaN(n) ? 0 : n }
const inr = (v: any) => `₹${toNum(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const firstNameOf = (name: unknown) => esc(String(name || 'there').trim().split(/\s+/)[0] || 'there')

// ─── Layout ──────────────────────────────────────────────────────────────────

/** NEFöL text logo with its tagline, as in the storefront header (BrandWordmark.tsx). */
function wordmark(size: number, color: string, taglineColor: string, tagline = true): string {
  return `<a href="${URLS.home}" style="text-decoration:none;display:inline-block;">
    <span style="display:block;font-family:${BRAND_FONT};font-size:${size}px;font-weight:500;line-height:1;letter-spacing:0.03em;color:${color};white-space:nowrap;">NEF&ouml;L</span>
    ${tagline ? `<span style="display:block;margin-top:${Math.round(size * 0.22)}px;font-family:${BRAND_FONT};font-size:${Math.max(8, Math.round(size * 0.255))}px;font-weight:700;line-height:1.2;letter-spacing:0.02em;text-transform:uppercase;color:${taglineColor};white-space:nowrap;">Natural as the morning dew</span>` : ''}
  </a>`
}

type ShellOptions = {
  /** Small print under the footer, e.g. why the reader got this email. */
  reason?: string
}

function shell(preheader: string, headerHtml: string, bodyHtml: string, footerExtra = '', opts: ShellOptions = {}): string {
  const year = new Date().getFullYear()
  const support = getAdminEmail()
  const reason = opts.reason ?? "You're receiving this email because of activity on your NEFOL account."
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>NEFOL</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Playfair+Display:wght@600&display=swap" rel="stylesheet">
  <!--<![endif]-->
  <style>
    body { margin:0 !important; padding:0 !important; width:100% !important; -webkit-text-size-adjust:100%; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { color:${ACCENT}; }
    @media only screen and (max-width:620px) {
      .em-px { padding-left:22px !important; padding-right:22px !important; }
      .em-h1 { font-size:24px !important; }
      .em-stack { display:block !important; width:100% !important; padding:6px 0 !important; }
      .em-thumb, .em-thumb img { width:64px !important; height:64px !important; }
    }
    @media (prefers-color-scheme: dark) {
      .em-page { background:#0b0f17 !important; }
      .em-card { background:#161c28 !important; border-color:#273041 !important; }
      .em-subtle { background:#1d2431 !important; border-color:#273041 !important; }
      .em-text { color:#ece7dd !important; }
      .em-muted { color:#b5ad9f !important; }
      .em-head { background:#111827 !important; }
      .em-btn { background:${GOLD} !important; }
      .em-btn a { color:#111827 !important; }
    }
  </style>
</head>
<body class="em-page" style="margin:0;padding:0;background:${BG_PAGE};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${BG_PAGE};">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" class="em-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BG_PAGE}" style="background:${BG_PAGE};">
    <tr><td align="center" style="padding:28px 12px 40px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
        <tr><td class="em-card" bgcolor="${BG_CARD}" style="background:${BG_CARD};border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <!-- Header: NEFöL wordmark on midnight, as in the storefront header -->
            <tr>
              <td class="em-head" align="center" bgcolor="${MIDNIGHT}" style="padding:30px 24px 26px;background:${MIDNIGHT};">
                ${wordmark(40, GOLD, '#FFFFFF')}
              </td>
            </tr>
            <tr><td height="3" bgcolor="${GOLD}" style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

            <!-- Hero -->
            ${headerHtml}

            <!-- Body -->
            <tr>
              <td class="em-px em-text" style="padding:8px 40px 36px;color:${TEXT_DARK};font-family:${FONT};font-size:15px;line-height:1.7;">
                ${bodyHtml}
              </td>
            </tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding:28px 24px 0;font-family:${FONT};">
            ${footerExtra ? `<div class="em-muted" style="margin:0 0 16px;font-size:13px;color:${TEXT_MID};">${footerExtra}</div>` : ''}
            <div style="margin:0 0 16px;">${wordmark(22, GOLD_DEEP, TEXT_MID)}</div>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.8;">
              <a href="${URLS.shop}" style="color:${TEXT_MID};text-decoration:none;font-weight:600;">Shop</a>
              <span class="em-muted" style="color:${TEXT_LIGHT};">&nbsp;&middot;&nbsp;</span>
              <a href="${URLS.orders}" style="color:${TEXT_MID};text-decoration:none;font-weight:600;">My orders</a>
              <span class="em-muted" style="color:${TEXT_LIGHT};">&nbsp;&middot;&nbsp;</span>
              <a href="${URLS.contact}" style="color:${TEXT_MID};text-decoration:none;font-weight:600;">Help</a>
              <span class="em-muted" style="color:${TEXT_LIGHT};">&nbsp;&middot;&nbsp;</span>
              <a href="${INSTAGRAM}" style="color:${TEXT_MID};text-decoration:none;font-weight:600;">Instagram</a>
            </p>
            <p class="em-muted" style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${TEXT_LIGHT};">
              Questions? Reply to this email or write to <a href="mailto:${support}" style="color:${ACCENT};text-decoration:none;">${support}</a>
            </p>
            ${reason ? `<p class="em-muted" style="margin:0 0 6px;font-size:12px;line-height:1.6;color:${TEXT_LIGHT};">${reason}</p>` : ''}
            <p class="em-muted" style="margin:0;font-size:11px;line-height:1.6;color:${TEXT_LIGHT};">
              &copy; ${year} ${COMPANY} &nbsp;&middot;&nbsp; <a href="${URLS.privacy}" style="color:${TEXT_LIGHT};">Privacy policy</a>
            </p>
          </td>
        </tr>
      </table>

    </td></tr>
  </table>
</body>
</html>`
}

/** Title block under the logo: small coloured label, headline, optional supporting line. */
function hero(tone: Tone, eyebrow: string, title: string, subtitle = ''): string {
  return `<tr>
    <td class="em-px" style="padding:28px 40px 8px;font-family:${FONT};">
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${TONE[tone]};">${eyebrow}</p>
      <h1 class="em-h1 em-text" style="margin:0 0 10px;font-family:${HEADING_FONT};font-size:30px;line-height:1.25;font-weight:600;letter-spacing:0;color:${TEXT_DARK};">${title}</h1>
      ${subtitle ? `<p class="em-muted" style="margin:0;font-size:16px;line-height:1.55;color:${TEXT_MID};">${subtitle}</p>` : ''}
    </td>
  </tr>`
}

/** Bulletproof button (renders in Outlook, survives image blocking). */
function btn(href: string, label: string, bg = MIDNIGHT): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
    <tr>
      <td class="${bg === MIDNIGHT ? 'em-btn' : ''}" align="center" bgcolor="${bg}" style="background:${bg};border-radius:8px;">
        <a href="${href}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${FONT};font-size:14px;font-weight:600;line-height:1;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`
}

/** Secondary text link under a button. */
function textLink(href: string, label: string): string {
  return `<p style="margin:12px 0 0;font-size:14px;"><a href="${href}" style="color:${ACCENT};font-weight:600;text-decoration:none;">${label} &rarr;</a></p>`
}

function infoBox(html: string, accent = GOLD): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;">
    <tr>
      <td class="em-subtle em-text" bgcolor="${BG_SUBTLE}" style="background:${BG_SUBTLE};border-left:3px solid ${accent};border-radius:0 8px 8px 0;padding:16px 20px;font-size:14px;line-height:1.65;color:${TEXT_DARK};">${html}</td>
    </tr>
  </table>`
}

function panel(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td class="em-subtle" bgcolor="${BG_SUBTLE}" style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:10px;padding:18px 22px;">${html}</td>
    </tr>
  </table>`
}

function sectionTitle(text: string, top = 28): string {
  return `<p class="em-muted" style="margin:${top}px 0 4px;font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${TEXT_MID};">${text}</p>`
}

function divider(): string {
  return `<div style="border-top:1px solid ${BORDER};margin:28px 0;font-size:0;line-height:0;">&nbsp;</div>`
}

function badge(text: string, bg = ACCENT): string {
  return `<span style="display:inline-block;background:${bg};color:#ffffff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:50px;letter-spacing:0.6px;text-transform:uppercase;">${text}</span>`
}

/** Two-column label/value grid inside a panel. */
function metaGrid(cells: Array<[string, string]>): string {
  const cell = ([label, value]: [string, string]) => `
    <td class="em-stack" width="50%" style="width:50%;vertical-align:top;padding:6px 8px 6px 0;">
      <p class="em-muted" style="margin:0 0 3px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${TEXT_LIGHT};">${label}</p>
      <p class="em-text" style="margin:0;font-size:15px;font-weight:600;color:${TEXT_DARK};">${value}</p>
    </td>`
  const rows: string[] = []
  for (let i = 0; i < cells.length; i += 2) {
    rows.push(`<tr>${cell(cells[i])}${cells[i + 1] ? cell(cells[i + 1]) : '<td class="em-stack"></td>'}</tr>`)
  }
  return panel(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join('')}</table>`)
}

/** Large one-time code. */
function codeBlock(label: string, code: string, note = '', tone: Tone = 'gold'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0;">
    <tr>
      <td class="em-subtle" align="center" bgcolor="${BG_SUBTLE}" style="background:${BG_SUBTLE};border:1px solid ${BORDER};border-radius:12px;padding:26px 20px;">
        <p class="em-muted" style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${TEXT_LIGHT};">${label}</p>
        <p style="margin:0;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:${TONE[tone]};line-height:1.2;">${esc(code)}</p>
        ${note ? `<p class="em-muted" style="margin:12px 0 0;font-size:13px;color:${TEXT_MID};">${note}</p>` : ''}
      </td>
    </tr>
  </table>`
}

/** Numbered list of next steps. */
function steps(items: string[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
    ${items.map((s, i) => `<tr>
      <td style="width:34px;vertical-align:top;padding:6px 12px 6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="${ACCENT}" style="width:24px;height:24px;border-radius:12px;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:700;line-height:24px;">${i + 1}</td>
        </tr></table>
      </td>
      <td class="em-text" style="vertical-align:top;padding:7px 0;font-size:14px;line-height:1.55;color:${TEXT_DARK};">${s}</td>
    </tr>`).join('')}
  </table>`
}

/** Three short reassurance points (cart / welcome emails). */
function perks(items: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 4px;">
    <tr>
      ${items.map(([title, text]) => `<td class="em-stack" width="${Math.floor(100 / items.length)}%" style="vertical-align:top;padding:0 10px 0 0;">
        <p class="em-text" style="margin:0 0 2px;font-size:13px;font-weight:700;color:${TEXT_DARK};"><span style="color:${GOLD};">&#9679;</span>&nbsp; ${title}</p>
        <p class="em-muted" style="margin:0;padding-left:16px;font-size:12px;line-height:1.5;color:${TEXT_MID};">${text}</p>
      </td>`).join('')}
    </tr>
  </table>`
}

// ─── Product images ──────────────────────────────────────────────────────────

const rawItemImage = (item: any): string =>
  item?.listImage || item?.list_image || item?.image || item?.product?.listImage || item?.product?.list_image || ''

/** Fill in missing product images from the DB (by slug, then product id). */
async function enrichItemImages(pool: Pool, items: any[]): Promise<any[]> {
  if (!items.length) return items
  const missing = items.filter((i) => !rawItemImage(i))
  if (!missing.length) return items
  const slugs = missing.map((i: any) => i.slug || i.product?.slug).filter(Boolean)
  const ids = missing.map((i: any) => Number(i.product_id ?? i.productId ?? i.product?.id)).filter((n) => Number.isFinite(n) && n > 0)
  if (!slugs.length && !ids.length) return items
  try {
    const { rows } = await pool.query(
      'SELECT id, slug, list_image FROM products WHERE slug = ANY($1::text[]) OR id = ANY($2::int[])',
      [slugs, ids]
    )
    const bySlug: Record<string, any> = {}
    const byId: Record<number, any> = {}
    for (const row of rows) {
      if (row.slug) bySlug[row.slug] = row
      byId[Number(row.id)] = row
    }
    return items.map((item: any) => {
      if (rawItemImage(item)) return item
      const hit = bySlug[item.slug || item.product?.slug] || byId[Number(item.product_id ?? item.productId ?? item.product?.id)]
      return hit?.list_image ? { ...item, image: hit.list_image, slug: item.slug || hit.slug } : item
    })
  } catch {
    return items
  }
}

/** Resolve every item's image to an email-safe absolute JPEG URL (stored on `_emailImage`). */
async function prepareEmailItems(items: any[], pool?: Pool): Promise<any[]> {
  const list = pool ? await enrichItemImages(pool, items) : items
  return Promise.all(
    list.map(async (item) => {
      let img = ''
      try {
        img = await toEmailImage(rawItemImage(item), MEDIA_BASE)
      } catch {
        img = ''
      }
      return { ...item, _emailImage: img }
    })
  )
}

function parseItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(String(raw || '[]')) } catch { return [] }
}

// ─── Order item rows ─────────────────────────────────────────────────────────

function orderItemRow(item: any): string {
  const price = toNum(item.price)
  const qty   = toNum(item.quantity) || 1
  const name  = esc(item.title || item.name || item.product?.title || 'Product')
  const img   = item._emailImage || ''
  const slug  = item.slug || item.product?.slug || ''
  const productUrl = slug ? URLS.product(slug) : URLS.shop

  const thumb = img
    ? `<img src="${esc(img)}" width="80" height="80" alt="${name}" style="display:block;width:80px;height:80px;border:0;border-radius:8px;object-fit:cover;background:#ffffff;">`
    : `<table role="presentation" width="80" height="80" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" valign="middle" bgcolor="${BG_SUBTLE}" style="width:80px;height:80px;border-radius:8px;background:${BG_SUBTLE};border:1px solid ${BORDER};font-family:${HEADING_FONT};font-size:30px;line-height:80px;color:${GOLD};">${esc(String(item?.title || item?.name || 'N').trim().charAt(0).toUpperCase() || 'N')}</td></tr></table>`

  return `<tr>
    <td style="padding:16px 0;border-bottom:1px solid ${BORDER};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td class="em-thumb" width="80" style="width:80px;vertical-align:top;">
            <a href="${productUrl}" style="text-decoration:none;display:block;border:1px solid ${BORDER};border-radius:9px;">${thumb}</a>
          </td>
          <td style="vertical-align:top;padding:2px 12px 0 16px;">
            <a class="em-text" href="${productUrl}" style="display:block;margin:0 0 4px;font-size:15px;font-weight:600;line-height:1.4;color:${TEXT_DARK};text-decoration:none;">${name}</a>
            ${item.variant ? `<p class="em-muted" style="margin:0 0 4px;font-size:13px;color:${TEXT_MID};">${esc(item.variant)}</p>` : ''}
            <p class="em-muted" style="margin:0;font-size:13px;color:${TEXT_MID};">Qty ${qty} &nbsp;&middot;&nbsp; ${inr(price)} each</p>
          </td>
          <td align="right" style="vertical-align:top;padding-top:2px;white-space:nowrap;">
            <span class="em-text" style="font-size:15px;font-weight:700;color:${TEXT_DARK};">${inr(price * qty)}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`
}

function itemsTable(items: any[]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items.map(orderItemRow).join('')}</table>`
}

function orderTotalsTable(order: any): string {
  const subtotal  = toNum(order.subtotal)
  const shipping  = toNum(order.shipping)
  const discount  = toNum(order.discount_amount)
  const segDisc   = toNum(order.segment_discount)
  const coinsUsed = toNum(order.coins_used)
  const total     = toNum(order.total)
  const isCOD     = order.payment_method === 'cod'

  const row = (label: string, value: string, color = TEXT_DARK) =>
    `<tr>
      <td class="em-muted" style="padding:5px 0;font-size:14px;color:${TEXT_MID};">${label}</td>
      <td class="em-text" align="right" style="padding:5px 0;font-size:14px;color:${color};">${value}</td>
    </tr>`

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('Subtotal', inr(subtotal))}
    ${row('Shipping', shipping > 0 ? inr(shipping) : `<span style="color:${ACCENT};font-weight:600;">Free</span>`)}
    ${discount  > 0 ? row('Coupon discount', `&minus;${inr(discount)}`, ACCENT) : ''}
    ${segDisc   > 0 ? row('Member discount', `&minus;${inr(segDisc)}`, ACCENT) : ''}
    ${coinsUsed > 0 ? row(`NEFOL Coins (${coinsUsed})`, `&minus;${inr(coinsUsed / 10)}`, ACCENT) : ''}
    <tr><td colspan="2" style="padding:8px 0 0;"><div style="border-top:1px solid ${BORDER};font-size:0;line-height:0;">&nbsp;</div></td></tr>
    <tr>
      <td class="em-text" style="padding:10px 0 0;font-size:16px;font-weight:700;color:${TEXT_DARK};">${isCOD ? 'Total to pay' : 'Total paid'}</td>
      <td class="em-text" align="right" style="padding:10px 0 0;font-size:18px;font-weight:700;color:${TEXT_DARK};">${inr(total)}</td>
    </tr>
  </table>`
}

function shippingAddressBlock(addr: any): string {
  if (!addr) return ''
  const a = typeof addr === 'string' ? (() => { try { return JSON.parse(addr) } catch { return {} } })() : addr
  const name     = a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim()
  const street   = [a.address || a.street, a.apartment || a.area].filter(Boolean).join(', ')
  const cityLine = [a.city, a.state, a.zip || a.pincode].filter(Boolean).join(', ')
  const phone    = a.phone || ''

  return `<p class="em-text" style="margin:0;font-size:14px;line-height:1.75;color:${TEXT_DARK};">
    ${name     ? `<strong>${esc(name)}</strong><br>` : ''}
    ${street   ? `${esc(street)}<br>` : ''}
    ${cityLine ? `${esc(cityLine)}<br>` : ''}
    ${esc(a.country || 'India')}${phone ? `<br>Phone: ${esc(phone)}` : ''}
  </p>`
}

/** Order progress tracker for status emails. */
function orderProgress(status: string): string {
  const stages = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
  ]
  const current = Math.max(0, stages.findIndex((s) => s.key === status))
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr>
      ${stages.map((s, i) => {
        const done = i <= current
        const color = done ? GOLD : '#E5DDCF'
        return `<td width="25%" align="center" style="width:25%;vertical-align:top;padding:0 2px;">
          <div style="height:4px;border-radius:2px;background:${color};font-size:0;line-height:0;">&nbsp;</div>
          <p class="${done ? 'em-text' : 'em-muted'}" style="margin:8px 0 0;font-size:12px;font-weight:${i === current ? 700 : 500};color:${done ? TEXT_DARK : TEXT_LIGHT};">${s.label}</p>
        </td>`
      }).join('')}
    </tr>
  </table>`
}

function signOff(team = 'Team NEFOL'): string {
  return `<p class="em-text" style="margin:24px 0 0;font-size:15px;color:${TEXT_DARK};">Warm regards,<br><strong>${team}</strong></p>`
}

// ─── OTP (shared with routes/otp.ts) ─────────────────────────────────────────

/** Branded OTP email. `minutes` is how long the code stays valid. */
export function buildOtpEmailHtml(userName: string | null | undefined, otp: string, minutes: number): string {
  return shell(
    `Your NEFOL verification code is ${otp}`,
    hero('gold', 'Verification', 'Your verification code', 'Enter this code to continue.'),
    `<p style="margin-top:0;">Hi <strong>${firstNameOf(userName)}</strong>,</p>
     <p>Use the code below to verify your NEFOL account. It expires in <strong>${minutes} minute${minutes === 1 ? '' : 's'}</strong>.</p>
     ${codeBlock('Verification code', otp)}
     ${infoBox('<strong>Keep this code private.</strong> NEFOL will never ask you for this code by phone, chat or email.', WARN)}
     <p class="em-muted" style="font-size:13px;color:${TEXT_LIGHT};">If you didn't request this code, you can safely ignore this email.</p>`
  )
}

// ─── 1. Welcome / Sign-up ────────────────────────────────────────────────────

export async function sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
  try {
    const firstName = firstNameOf(userName)
    const html = shell(
      `Welcome to NEFOL, ${firstName}. Your account is ready.`,
      hero('gold', 'Welcome', `Welcome to NEFOL, ${firstName}`, 'Your account is ready. Here is what you can do next.'),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>Thank you for joining NEFOL. We make skincare, haircare and body care with ingredients you can recognise, and we're glad to have you with us.</p>

       ${perks([
         ['Shop the range', 'Face, hair and body care made with natural ingredients.'],
         ['Earn NEFOL Coins', 'Get coins back on every order and use them at checkout.'],
         ['Refer friends', 'Share NEFOL and earn rewards when they shop.'],
       ])}

       ${btn(URLS.shop, 'Start shopping')}

       ${infoBox(`Use code <strong>WELCOME10</strong> on your first order.`)}

       <p class="em-muted" style="font-size:14px;color:${TEXT_MID};">Need help choosing products? Just reply to this email and our team will get back to you.</p>
       ${signOff()}`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Welcome to NEFOL, ${firstName} — your account is ready`,
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
      hero('gold', 'Verify your email', 'Confirm your email address', 'One quick step to secure your account.'),
      `<p style="margin-top:0;">Use the code below to verify your NEFOL account. This code expires in <strong>10 minutes</strong>.</p>
       ${codeBlock('Verification code', otp)}
       ${infoBox('<strong>Keep this code private.</strong> NEFOL will never ask you for this code by phone, chat or email.', WARN)}
       <p class="em-muted" style="font-size:13px;color:${TEXT_LIGHT};">If you didn't create a NEFOL account, you can safely ignore this email.</p>`
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
    const firstName = firstNameOf(userName)
    const html = shell(
      'Reset your NEFOL password',
      hero('slate', 'Account', 'Reset your password', 'We received a request to reset the password for your account.'),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>Click the button below to choose a new password. The link is valid for <strong>15 minutes</strong> and can be used once.</p>

       ${btn(resetLink, 'Reset password')}

       <p class="em-muted" style="margin:18px 0 6px;font-size:13px;color:${TEXT_MID};">If the button doesn't work, copy this link into your browser:</p>
       <p class="em-subtle" style="margin:0;font-size:12px;line-height:1.5;color:${TEXT_MID};word-break:break-all;background:${BG_SUBTLE};padding:12px 14px;border-radius:6px;border:1px solid ${BORDER};">${esc(resetLink)}</p>

       ${infoBox(`<strong>Didn't ask for this?</strong> Your password hasn't changed and you can ignore this email. If you're worried about your account, <a href="${URLS.contact}" style="color:${ACCENT};font-weight:600;">contact our support team</a>.`, WARN)}`
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
      hero('gold', 'Security', 'Your password was changed', 'Your account password was updated successfully.'),
      `<p style="margin-top:0;">This confirms that the password for your NEFOL account was just changed. If you made this change, there's nothing else to do.</p>

       ${btn(URLS.login, 'Sign in to NEFOL')}

       ${infoBox(`<strong>Didn't change your password?</strong> Someone else may have access to your account. Reset your password from the <a href="${URLS.login}" style="color:${DANGER};font-weight:600;">sign-in page</a> right away and let us know at ${getAdminEmail()}.`, DANGER)}`
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
    const when = `${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
    const html = shell(
      'New sign-in to your NEFOL account',
      hero('blue', 'Security', 'New sign-in to your account', 'We noticed a new sign-in to your NEFOL account.'),
      `${metaGrid([
         ['Time', esc(when)],
         ['Device', esc(deviceInfo || 'Unknown device')],
         ['IP address', esc(ipAddress || 'Unknown')],
       ])}

       <p>If this was you, you're all set. If you don't recognise this sign-in, secure your account now.</p>

       ${btn(URLS.account, 'Review account activity', DANGER)}`
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
      hero('red', 'Security alert', 'A change was made to your account', 'Please review the details below.'),
      `<p style="margin-top:0;">The following change was made to your NEFOL account:</p>
       ${infoBox(`<p style="margin:0;font-size:15px;font-weight:600;">${esc(action || 'Account security change')}</p>`, DANGER)}
       <p>If this was you, no action is needed. If not, secure your account immediately.</p>
       ${btn(URLS.account, 'Secure my account', DANGER)}
       <p class="em-muted" style="font-size:13px;color:${TEXT_LIGHT};">For urgent help, email us at ${getAdminEmail()}.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL Security" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'Security alert on your NEFOL account',
      html
    })
    console.log(`✅ Security alert email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Security alert email error:', err)
  }
}

// ─── 7. Order Confirmation ────────────────────────────────────────────────────

export async function sendOrderConfirmationEmail(order: any, sendToAdmin = false, pool?: Pool): Promise<void> {
  try {
    const items = await prepareEmailItems(parseItems(order.items), pool)

    const shippingAddr = (() => {
      try {
        return typeof order.shipping_address === 'string'
          ? JSON.parse(order.shipping_address)
          : (order.shipping_address || {})
      } catch { return {} }
    })()

    const paymentLabel: Record<string, string> = {
      razorpay: 'Online payment',
      'coins+razorpay': 'NEFOL Coins + online payment',
      cod: 'Cash on delivery',
      coins: 'NEFOL Coins',
    }
    const pmLabel = paymentLabel[order.payment_method] || order.payment_method || 'Online payment'

    const isCOD = order.payment_method === 'cod'
    const orderNo = esc(order.order_number)
    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const customerBody = `
      <p style="margin-top:0;">Hi <strong>${firstNameOf(order.customer_name)}</strong>,</p>
      <p>${isCOD
        ? "We've received your order and it's being prepared. You'll pay when it arrives."
        : "We've received your payment and your order is being prepared."} We'll email you again as soon as it ships.</p>

      ${metaGrid([
        ['Order number', `<span style="color:${ACCENT};">${orderNo}</span>`],
        ['Order date', esc(orderDate)],
        ['Payment', esc(pmLabel)],
        ['Status', badge(isCOD ? 'Pay on delivery' : 'Paid', isCOD ? WARN : ACCENT)],
      ])}

      ${sectionTitle('Your items')}
      ${itemsTable(items)}

      ${panel(orderTotalsTable(order))}

      ${sectionTitle('Shipping to', 8)}
      ${panel(shippingAddressBlock(shippingAddr))}

      ${isCOD ? infoBox(`Please keep <strong>${inr(order.total)}</strong> ready at the time of delivery.`, WARN) : ''}

      ${btn(URLS.orders, 'Track my order')}
      ${signOff()}
    `

    const adminBody = `
      <p style="margin-top:0;">A new order was placed on thenefol.com.</p>
      ${metaGrid([
        ['Order', orderNo],
        ['Total', inr(order.total)],
        ['Customer', `${esc(order.customer_name)}<br><span style="font-weight:400;font-size:13px;color:${TEXT_MID};">${esc(order.customer_email)}</span>`],
        ['Payment', esc(pmLabel)],
      ])}
      ${sectionTitle('Items')}
      ${itemsTable(items)}
      ${btn(`${SITE_URL}/loginasadmin/orders`, 'Open in admin panel', MIDNIGHT)}
    `

    const recipient = sendToAdmin ? getAdminEmail() : order.customer_email
    const subject = sendToAdmin
      ? `[New Order] ${order.order_number} — ${order.customer_name} (₹${toNum(order.total).toFixed(2)})`
      : `Your NEFOL order ${order.order_number} is confirmed`

    const html = shell(
      sendToAdmin
        ? `New order ${order.order_number} from ${order.customer_name}`
        : `Thank you for your order. Order ${order.order_number} is confirmed.`,
      sendToAdmin
        ? hero('slate', 'New order', `Order ${orderNo}`, `${esc(order.customer_name)} · ${inr(order.total)}`)
        : hero(isCOD ? 'amber' : 'gold', isCOD ? 'Order placed' : 'Order confirmed', 'Thank you for your order', `Order ${orderNo} · ${esc(orderDate)}`),
      sendToAdmin ? adminBody : customerBody,
      '',
      sendToAdmin ? { reason: 'Internal notification for NEFOL staff.' } : {}
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
    const firstName = firstNameOf(userName)
    const html = shell(
      `Payment for order ${orderNumber} didn't go through`,
      hero('red', 'Payment unsuccessful', "We couldn't complete your payment", `Order ${esc(orderNumber)}`),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>Your payment didn't go through, so this order hasn't been completed yet. Your items are still saved and you can try again.</p>

       ${errorMessage ? infoBox(`<strong>Reason:</strong> ${esc(errorMessage)}`, DANGER) : ''}

       ${sectionTitle('Common reasons', 18)}
       <ul class="em-muted" style="margin:6px 0 0;padding-left:20px;font-size:14px;line-height:1.9;color:${TEXT_MID};">
         <li>Insufficient balance or a daily limit was reached</li>
         <li>The bank declined the transaction</li>
         <li>Card or UPI details were entered incorrectly</li>
         <li>The payment session timed out</li>
       </ul>

       ${btn(URLS.orders, 'Try payment again')}
       <p class="em-muted" style="font-size:14px;color:${TEXT_MID};">If money was deducted for a failed payment, it is normally reversed to your account automatically. Still need help? Write to <a href="mailto:${getAdminEmail()}" style="color:${ACCENT};">${getAdminEmail()}</a>.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Payment unsuccessful — Order ${orderNumber}`,
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
    const orderNo = esc(order.order_number)

    const statusConfig: Record<string, { tone: Tone; eyebrow: string; title: string; sub: string; body: string; subject: string }> = {
      shipped: {
        tone: 'blue',
        eyebrow: 'Shipped',
        title: 'Your order is on its way',
        sub: `Order ${orderNo} has left our warehouse.`,
        body: `<p>Good news — your NEFOL order has been handed to our delivery partner.</p>`,
        subject: 'Your order has shipped',
      },
      out_for_delivery: {
        tone: 'amber',
        eyebrow: 'Out for delivery',
        title: 'Arriving today',
        sub: `Order ${orderNo} is out for delivery.`,
        body: `<p>Your order is out for delivery and should reach you today. Please keep your phone nearby so the courier can reach you.</p>`,
        subject: 'Your order is out for delivery',
      },
      delivered: {
        tone: 'gold',
        eyebrow: 'Delivered',
        title: 'Your order has arrived',
        sub: `Order ${orderNo} was delivered.`,
        body: `<p>Your order has been delivered. We hope you love your new NEFOL products.</p>
               <p class="em-muted" style="color:${TEXT_MID};">Once you've tried them, a quick review helps other customers choose what's right for them.</p>`,
        subject: 'Your order has been delivered',
      },
    }

    const cfg = statusConfig[status] || {
      tone: 'slate' as Tone,
      eyebrow: 'Order update',
      title: 'Your order has been updated',
      sub: `Order ${orderNo}`,
      body: `<p>The status of your order is now <strong>${esc(order.status)}</strong>.</p>`,
      subject: 'Order update',
    }

    const tracking = order.tracking || order.tracking_number
    const trackingBlock = tracking
      ? metaGrid([
          ['Tracking number', esc(tracking)],
          ['Courier', esc(order.courier_name || order.courier || 'Delivery partner')],
        ]) + (order.tracking_url ? textLink(order.tracking_url, 'Track your parcel live') : '')
      : ''

    const items = await prepareEmailItems(parseItems(order.items))
    const showProgress = ['shipped', 'out_for_delivery', 'delivered'].includes(status)

    const html = shell(
      `${cfg.title} — order ${order.order_number}`,
      hero(cfg.tone, cfg.eyebrow, cfg.title, cfg.sub),
      `<p style="margin-top:0;">Hi <strong>${firstNameOf(order.customer_name)}</strong>,</p>
       ${cfg.body}
       ${showProgress ? orderProgress(status) : ''}
       ${trackingBlock}

       ${items.length > 0 ? `${sectionTitle('In this order')}${itemsTable(items)}` : ''}

       ${status === 'delivered' ? btn(URLS.orders, 'Review your products') : btn(URLS.orders, 'View order details')}
       ${signOff()}`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `${cfg.subject} — Order ${order.order_number}`,
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
  productPrice: number,
  product?: { slug?: string | null; image?: string | null; quantity?: number }
): Promise<void> {
  try {
    const firstName = firstNameOf(userName)
    const [item] = await prepareEmailItems([{
      title: productName,
      price: productPrice,
      quantity: product?.quantity || 1,
      image: product?.image || '',
      slug: product?.slug || '',
    }])
    const html = shell(
      `${productName} is still in your cart`,
      hero('gold', 'Saved in your cart', `${esc(productName)} is waiting for you`, 'Pick up right where you left off.'),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>You added this to your cart on NEFOL. It's saved and ready whenever you are.</p>

       ${itemsTable([item])}

       ${btn(URLS.cart, 'Go to my cart')}

       ${perks([
         ['Secure payments', 'UPI, cards and net banking.'],
         ['Cash on delivery', 'Pay when your order arrives.'],
         ['NEFOL Coins', 'Earn coins on every order.'],
       ])}`,
      '',
      { reason: "You're receiving this because you added an item to your cart on thenefol.com." }
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `${productName} is still in your cart`,
      html
    })
    console.log(`✅ Cart reminder email sent: ${userEmail}`)
  } catch (err) {
    console.error('❌ Cart reminder email error:', err)
  }
}

// ─── 11. Cart Abandonment ─────────────────────────────────────────────────────

export async function sendCartAbandonmentEmail(userEmail: string, userName: string, cartItems: any[], pool?: Pool): Promise<void> {
  try {
    const firstName = firstNameOf(userName)
    const mapped = cartItems.map((i) => ({
      title: i.product?.title || i.title,
      price: i.product?.price || i.price || 0,
      quantity: i.quantity || 1,
      listImage: i.product?.listImage || i.product?.list_image || i.listImage || i.list_image || i.image || '',
      slug: i.product?.slug || i.slug || '',
      product_id: i.product?.id ?? i.product_id,
      variant: i.variant_name || i.variant || undefined,
    }))
    const items = await prepareEmailItems(mapped, pool)
    const count = items.reduce((s, i) => s + (toNum(i.quantity) || 1), 0)
    const total = items.reduce((s, i) => s + toNum(i.price) * (toNum(i.quantity) || 1), 0)

    const html = shell(
      `Your NEFOL cart is saved — ${count} item${count === 1 ? '' : 's'} waiting for you.`,
      hero('gold', 'Your cart', 'You left something behind', "We've saved your items so you can finish your order anytime."),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>The products you picked are still in your cart. Whenever you're ready, you can check out in a few taps.</p>

       ${sectionTitle(`In your cart (${count})`)}
       ${itemsTable(items)}

       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
         <tr>
           <td class="em-muted" style="font-size:14px;color:${TEXT_MID};">Subtotal</td>
           <td class="em-text" align="right" style="font-size:18px;font-weight:700;color:${TEXT_DARK};">${inr(total)}</td>
         </tr>
         <tr>
           <td colspan="2" class="em-muted" style="padding-top:4px;font-size:12px;color:${TEXT_LIGHT};">Shipping, coupons and NEFOL Coins are applied at checkout.</td>
         </tr>
       </table>

       ${btn(URLS.cart, 'Return to my cart')}

       ${perks([
         ['Secure payments', 'UPI, cards and net banking.'],
         ['Cash on delivery', 'Pay when your order arrives.'],
         ['NEFOL Coins', 'Earn coins on every order.'],
       ])}

       <p class="em-muted" style="margin-top:26px;font-size:14px;color:${TEXT_MID};">Not sure which product suits you? Reply to this email and our team will help you choose.</p>`,
      '',
      { reason: "You're receiving this because you left items in your cart on thenefol.com." }
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `${firstName}, your NEFOL cart is saved`,
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
    const planName = esc(plan?.name || 'your plan')
    const priceText = typeof plan?.price === 'number' ? inr(plan.price) : ''
    const intervalText = plan?.interval ? ` / ${esc(plan.interval)}` : ''

    const html = shell(
      `Your NEFOL subscription is active`,
      hero('gold', 'Subscription', 'Your subscription is active', `Welcome to ${planName}.`),
      `<p style="margin-top:0;">Your <strong>${planName}</strong> subscription is now active.</p>

       ${priceText ? metaGrid([['Plan', planName], ['Price', `${priceText}${intervalText}`]]) : ''}

       ${btn(URLS.account, 'Manage subscription')}
       <p class="em-muted" style="font-size:13px;color:${TEXT_MID};">You can change or cancel your plan at any time from your account.</p>`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `Your ${plan?.name || 'NEFOL'} subscription is active`,
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
    const rawName = plan?.name || 'your subscription'
    const planName = esc(rawName)
    const isExpiring = type === 'expiring'

    const html = shell(
      isExpiring ? `Your NEFOL subscription ends soon` : `Your NEFOL subscription was cancelled`,
      hero(
        isExpiring ? 'amber' : 'slate',
        'Subscription',
        isExpiring ? 'Your subscription ends soon' : 'Your subscription was cancelled',
        planName
      ),
      `<p style="margin-top:0;">${isExpiring
        ? `Your <strong>${planName}</strong> is ending soon. Renew now to keep your benefits without a break.`
        : `Your <strong>${planName}</strong> has been cancelled. You'll keep access until the end of the current billing period.`
      }</p>
      ${btn(URLS.account, isExpiring ? 'Renew now' : 'View plans', isExpiring ? WARN : ACCENT)}`
    )
    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: userEmail,
      subject: isExpiring ? `Your ${rawName} ends soon — renew now` : `Your ${rawName} has been cancelled`,
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
    const firstName = firstNameOf(userName)
    const html = shell(
      `We received your NEFOL affiliate application`,
      hero('gold', 'Affiliate program', 'Application received', 'Thank you for your interest in partnering with NEFOL.'),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>Thank you for applying to the <strong>NEFOL Affiliate Program</strong>. We've received your application and our team will review it shortly.</p>

       ${sectionTitle('What happens next', 22)}
       ${steps([
         'Our team reviews your application (usually within 24–48 hours).',
         'If approved, you receive an email with your verification code.',
         'Verify your account and get your unique referral link.',
         'Share your link and track your earnings in the affiliate dashboard.',
       ])}

       <p class="em-muted" style="margin-top:22px;font-size:14px;color:${TEXT_MID};">Keep an eye on your inbox (and spam folder) for our decision.</p>
       ${signOff('Team NEFOL Affiliates')}`
    )
    await transporter.sendMail({
      from: `"NEFOL Affiliates" <${getAdminEmail()}>`,
      to: userEmail,
      subject: 'We received your NEFOL affiliate application',
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
    const firstName = firstNameOf(userName)
    const html = shell(
      `You're approved as a NEFOL affiliate`,
      hero('gold', 'Affiliate program', `You're approved, ${firstName}`, 'Your NEFOL affiliate account is ready to activate.'),
      `<p style="margin-top:0;">Hi <strong>${firstName}</strong>,</p>
       <p>Welcome to the <strong>NEFOL Affiliate Program</strong>. Use the one-time code below to activate your affiliate dashboard.</p>

       ${codeBlock('Your verification code', verificationCode, 'Enter this code in your affiliate dashboard.')}

       ${sectionTitle('Getting started', 8)}
       ${steps([
         'Verify your account with the code above.',
         'Copy your unique referral link from the dashboard.',
         'Share it with your audience.',
         'Earn commission on every successful referral and track it in real time.',
       ])}

       ${btn(URLS.affiliate, 'Open affiliate dashboard')}

       ${infoBox('<strong>Keep this code private.</strong> It is linked to your account and can only be used once.', WARN)}
       ${signOff('Team NEFOL Affiliates')}`
    )
    await transporter.sendMail({
      from: `"NEFOL Affiliates" <${getAdminEmail()}>`,
      to: userEmail,
      subject: `You're approved — your NEFOL affiliate verification code`,
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

    const items = await prepareEmailItems(parseItems(order.items), pool)

    const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

    const html = shell(
      `Your NEFOL invoice for order ${order.order_number}`,
      hero('slate', 'Invoice', 'Your invoice is attached', `Order ${esc(order.order_number)}`),
      `<p style="margin-top:0;">Hi <strong>${firstNameOf(order.customer_name)}</strong>,</p>
       <p>Thank you for your order. Your invoice is attached to this email as a PDF. Here's a summary:</p>

       ${metaGrid([
         ['Order number', `<span style="color:${ACCENT};">${esc(order.order_number)}</span>`],
         ['Invoice number', esc(order.invoice_number || '—')],
         ['Order date', esc(orderDate)],
         ['Amount', inr(order.total)],
       ])}

       ${items.length > 0 ? `
         ${sectionTitle('Items')}
         ${itemsTable(items)}
         ${panel(orderTotalsTable(order))}` : ''}

       ${btn(URLS.orders, 'View order details')}
       <p class="em-muted" style="font-size:14px;color:${TEXT_MID};">Please keep the attached invoice for your records.</p>`
    )

    await transporter.sendMail({
      from: `"NEFOL" <${getAdminEmail()}>`,
      to: order.customer_email,
      subject: `Your invoice — Order ${order.order_number}`,
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
      hero('slate', 'Team invitation', "You're invited to the NEFOL admin panel", 'Complete your onboarding to get started.'),
      `<p style="margin-top:0;">You've been invited to join the <strong>NEFOL admin panel</strong> as a staff member.</p>
       <p>Use the button below to confirm your details, accept the staff agreement and set your password.</p>

       ${btn(inviteUrl, 'Complete onboarding', MIDNIGHT)}

       ${sectionTitle('After onboarding', 22)}
       ${steps([
         'An administrator assigns your role and permissions.',
         'You can sign in to the admin panel straight away.',
         'You see the tools your role gives you access to.',
       ])}

       <p class="em-muted" style="margin-top:22px;font-size:13px;color:${TEXT_LIGHT};">This invitation expires in <strong>${expiresInHours} hours</strong>. If you weren't expecting it, you can safely ignore this email.</p>`,
      '',
      { reason: 'You received this because a NEFOL administrator invited this email address.' }
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
