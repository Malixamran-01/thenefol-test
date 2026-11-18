// Seller tax invoice, laid out as a 4 × 6 inch label for thermal label printers
import { getStateCode, numberToWords } from './invoiceUtils'
import { DEFAULT_GST_RATE, gstFromInclusive, parseGstRate, splitSlabs, type GstSlab } from '../services/gstCalc'

/**
 * GST rate of an order line. Orders placed since per-product GST store the rate in force at
 * order time on each item (gst_rate), so the invoice stays correct after a rate changes.
 * Older orders fall back to the CSV 'GST %' they were placed with, then the invoice setting.
 */
export function invoiceItemGstRate(item: any, taxSettings: any): number {
  return (
    parseGstRate(item?.gst_rate) ??
    parseGstRate(item?.csvProduct?.['GST %']) ??
    parseGstRate(taxSettings?.rate) ??
    DEFAULT_GST_RATE
  )
}

/** Taxable value + GST of an order line (prices are GST-inclusive). */
export function invoiceItemGst(item: any, taxSettings: any): { rate: number; taxable: number; gst: number } {
  const rate = invoiceItemGstRate(item, taxSettings)
  const storedTaxable = Number(item?.taxable_value)
  const storedGst = Number(item?.gst_amount)
  if (item?.gst_rate != null && Number.isFinite(storedTaxable) && Number.isFinite(storedGst)) {
    return { rate, taxable: storedTaxable, gst: storedGst }
  }
  const unitPrice = parseFloat(item?.price || item?.unitPrice || item?.mrp || 0) || 0
  const quantity = parseInt(item?.quantity || 1) || 1
  return { rate, ...gstFromInclusive(unitPrice * quantity, rate) }
}

/** Escape text placed into the invoice HTML (product names, addresses, settings). */
function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export function generateAmazonInvoiceHTML(
  order: any,
  companyDetails: any,
  taxSettings: any,
  terms: string,
  signature: string,
  currency: string,
  logoUrl: string | null = null,
  signatoryPhotoUrl: string | null = null,
  shipmentInfo: any = null
): string {
  try {
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]')
    
    // Calculate totals
    let totalNetAmount = 0
    let totalTaxAmount = 0
    let totalAmount = 0
    let totalDiscount = 0
    const isCGST = taxSettings.type === 'CGST+SGST'
    const slabs = new Map<number, GstSlab>()
    const addToSlab = (rate: number, taxable: number, gst: number) => {
      const slab = slabs.get(rate) || { rate, taxable: 0, gst: 0 }
      slab.taxable += taxable
      slab.gst += gst
      slabs.set(rate, slab)
    }
    
    const money = (n: number) => `${currency}${(Number(n) || 0).toFixed(2)}`
    const fmtRate = (r: number) => `${Number.isInteger(r) ? r : r.toFixed(2)}%`

    // Build itemized table rows (compact: the CGST/SGST or IGST split is in the GST summary below)
    const invoiceItems = items.map((item: any, index: number) => {
      const unitPrice = parseFloat(item.price || item.unitPrice || item.mrp || 0)
      const quantity = parseInt(item.quantity || 1)
      const discount = parseFloat(item.discount || 0)
      // MRP is tax-inclusive: back GST out at this item's own rate
      const line = invoiceItemGst(item, taxSettings)
      const taxRatePercent = line.rate
      const netAmount = line.taxable
      const itemTax = line.gst
      const itemTotal = unitPrice * quantity
      addToSlab(taxRatePercent, netAmount, itemTax)
      const itemDiscount = discount
      const itemTotalAfterDiscount = itemTotal - itemDiscount

      totalNetAmount += netAmount
      totalTaxAmount += itemTax
      totalAmount += itemTotalAfterDiscount
      totalDiscount += itemDiscount

      const hsnCode = item.csvProduct?.['HSN Code'] || item.hsn || ''
      const sku = item.csvProduct?.['SKU'] || item.code || item.sku || ''
      const productName = item.name || item.productName || item.title || 'Product'
      const sub = [sku && esc(sku), hsnCode && `HSN ${esc(hsnCode)}`].filter(Boolean).join(' · ')

      return `
        <tr class="item">
          <td class="text-center">${index + 1}</td>
          <td>
            <div class="item-name">${esc(productName)}</div>
            ${sub ? `<div class="sub">${sub}</div>` : ''}
            ${itemDiscount > 0 ? `<div class="sub">Discount −${money(itemDiscount)}</div>` : ''}
          </td>
          <td class="text-center">${quantity}</td>
          <td class="text-right">${money(netAmount)}</td>
          <td class="text-right">${fmtRate(taxRatePercent)}<div class="sub">${money(itemTax)}</div></td>
          <td class="text-right strong">${money(itemTotalAfterDiscount)}</td>
        </tr>`
    }).join('')

    // Calculate shipping tax if applicable
    const shippingCharges = parseFloat(order.shipping || 0)
    let shippingTax = 0
    if (shippingCharges > 0) {
      // Shipping is GST-inclusive at the invoice-settings rate
      const shippingRate = parseGstRate(taxSettings.rate) ?? DEFAULT_GST_RATE
      const s = gstFromInclusive(shippingCharges, shippingRate)
      shippingTax = s.gst
      totalTaxAmount += shippingTax
      addToSlab(shippingRate, s.taxable, s.gst)
    }

    // GST summary by rate (taxable value + GST per slab, split CGST/SGST or IGST)
    const slabRows = splitSlabs(
      [...slabs.values()]
        .map((s) => ({ rate: s.rate, taxable: Math.round(s.taxable * 100) / 100, gst: Math.round(s.gst * 100) / 100 }))
        .sort((a, b) => a.rate - b.rate),
      isCGST
    )
    const slabTotals = slabRows.reduce(
      (t, s) => ({ taxable: t.taxable + s.taxable, cgst: t.cgst + s.cgst, sgst: t.sgst + s.sgst, igst: t.igst + s.igst, gst: t.gst + s.gst }),
      { taxable: 0, cgst: 0, sgst: 0, igst: 0, gst: 0 }
    )
    const gstSummaryHtml = `
    <table class="gst-summary">
      <thead>
        <tr>
          <th class="text-left">GST Rate</th>
          <th class="text-right">Taxable</th>
          ${isCGST ? '<th class="text-right">CGST</th><th class="text-right">SGST</th>' : '<th class="text-right">IGST</th>'}
          <th class="text-right">Total GST</th>
        </tr>
      </thead>
      <tbody>
        ${slabRows.map((s) => `
        <tr>
          <td class="text-left">${fmtRate(s.rate)}${isCGST ? ` (${fmtRate(s.rate / 2)} + ${fmtRate(s.rate / 2)})` : ''}</td>
          <td class="text-right">${money(s.taxable)}</td>
          ${isCGST ? `<td class="text-right">${money(s.cgst)}</td><td class="text-right">${money(s.sgst)}</td>` : `<td class="text-right">${money(s.igst)}</td>`}
          <td class="text-right">${money(s.gst)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td class="text-left">TOTAL</td>
          <td class="text-right">${money(slabTotals.taxable)}</td>
          ${isCGST ? `<td class="text-right">${money(slabTotals.cgst)}</td><td class="text-right">${money(slabTotals.sgst)}</td>` : `<td class="text-right">${money(slabTotals.igst)}</td>`}
          <td class="text-right">${money(slabTotals.gst)}</td>
        </tr>
      </tfoot>
    </table>`

    // Get order-level discounts (coupon codes and coins)
    const orderDiscountAmount = parseFloat(order.discount_amount || 0)
    const orderDiscountCode = order.discount_code || null
    const coinsUsed = parseFloat(order.coins_used || 0)
    const coinsDiscount = coinsUsed / 10 // 1 rupee = 10 coins

    // Calculate final total after order-level discounts
    const subtotalBeforeDiscounts = totalAmount + shippingCharges
    const finalTotal = Math.max(0, subtotalBeforeDiscounts - orderDiscountAmount - coinsDiscount)
    const amountInWords = numberToWords(Math.round(finalTotal))

    const formatDate = (date: string) => {
      const d = new Date(date)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    }

    const parseAddr = (a: any) => {
      if (!a) return null
      if (typeof a === 'string') {
        try { return JSON.parse(a) } catch { return a }
      }
      return a
    }

    // Compact address block for the label
    const formatAddress = (addr: any) => {
      if (!addr) return 'N/A'
      if (typeof addr === 'string') return esc(addr)
      const name = `${addr.firstName || addr.first_name || order.customer_name || ''} ${addr.lastName || addr.last_name || ''}`.trim()
      const state = addr.state || ''
      const stateCode = getStateCode(state)
      const lines = [
        name && `<strong>${esc(name)}</strong>`,
        addr.company && esc(addr.company),
        [addr.address || addr.street, addr.apartment].filter(Boolean).map(esc).join(', '),
        [addr.city, state].filter(Boolean).map(esc).join(', ') + (addr.zip || addr.pincode ? ` – ${esc(addr.zip || addr.pincode)}` : ''),
        [stateCode && `State code ${esc(stateCode)}`, addr.phone && `Ph ${esc(addr.phone)}`].filter(Boolean).join(' · '),
      ]
      return lines.filter(Boolean).join('<br/>')
    }

    const shippingAddr = parseAddr(order.shipping_address)
    const billingAddr = parseAddr(order.billing_address) || shippingAddr
    const sameAddress = !order.billing_address || JSON.stringify(billingAddr) === JSON.stringify(shippingAddr)
    const shippingState = shippingAddr?.state || ''
    const billingState = billingAddr?.state || ''
    const placeOfSupply = shippingState || billingState
    const placeOfSupplyCode = getStateCode(placeOfSupply)

    // Invoice number
    const invoiceNumber = order.invoice_number || order.order_number
    const invoiceDate = formatDate(order.created_at)
    const orderDate = formatDate(order.created_at)

    // Seller information from company details
    const sellerName = companyDetails.companyName || 'Nefol'
    const sellerAddress = companyDetails.companyAddress || ''
    const sellerPhone = companyDetails.companyPhone || ''
    const sellerEmail = companyDetails.companyEmail || ''
    const sellerGST = companyDetails.gstNumber || ''
    const sellerPAN = companyDetails.panNumber || ''

    const meta: [string, string][] = [
      ['Invoice No', esc(invoiceNumber || 'N/A')],
      ['Invoice Date', invoiceDate],
      ['Order No', esc(order.order_number || 'N/A')],
      ['Order Date', orderDate],
      ['Place of Supply', placeOfSupply ? `${esc(placeOfSupply)}${placeOfSupplyCode ? ` (${esc(placeOfSupplyCode)})` : ''}` : 'N/A'],
      ['Payment', esc(order.payment_method === 'cod' || order.cod ? 'Cash on Delivery' : order.payment_method ? 'Prepaid' : '—')],
    ]

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${esc(invoiceNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    /* 4 × 6 inch label (standard thermal label printers), portrait.
       Colours: the storefront's Midnight Gold theme (common/src/theme.ts), same as the order emails. */
    @page { size: 4in 6in; margin: 0; }
    :root {
      --midnight: #111827;     /* header band, grand total */
      --gold: #B08D57;         /* wordmark, rules */
      --gold-deep: #7A5E36;    /* gold for small text on white (readable) */
      --ink: #111827;
      --ink-mid: #4B5563;
      --rule: #B08D57;
      --rule-soft: #ECE4D6;
      --wash: #FAF6EF;
      --band-text: #E5E7EB;
      --page-bg: #F5F1EA;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: var(--page-bg); }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 7pt; line-height: 1.25; color: var(--ink); padding: 24px 0; }
    .label { width: 4in; min-height: 6in; margin: 0 auto; background: #fff; padding: 0.1in 0.12in 0.08in; box-shadow: 0 4px 18px rgba(17,24,39,0.16); }

    .print-button {
      position: fixed; bottom: 16px; right: 16px; z-index: 1000;
      background: var(--midnight); color: var(--gold); border: 1px solid var(--gold); border-radius: 6px;
      padding: 10px 18px; font: 600 13px Arial, sans-serif; cursor: pointer; letter-spacing: 0.03em;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .print-button:hover { background: #1F2937; }

    /* Brand band — midnight with the gold NEFöL wordmark, as on the storefront and emails */
    .brand-band { display: flex; align-items: center; justify-content: space-between; background: var(--midnight); color: #fff; border-radius: 4px; border-bottom: 2px solid var(--gold); padding: 5px 9px; }
    .wordmark { display: inline-flex; flex-direction: column; align-items: center; line-height: 1; font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif; font-size: 19pt; }
    .wordmark .mark { font-weight: 500; letter-spacing: 0.03em; color: var(--gold); white-space: nowrap; }
    .wordmark .mark .o { letter-spacing: 0.01em; }
    .wordmark .tagline { margin-top: 0.22em; font-size: 0.255em; font-weight: 700; letter-spacing: 0.02em; text-transform: uppercase; color: var(--band-text); white-space: nowrap; }
    .doc-title { text-align: right; }
    .doc-title .t { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; font-size: 10pt; font-weight: 700; letter-spacing: 0.06em; color: #fff; }
    .doc-title .s { font-size: 6pt; color: var(--gold); margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase; }

    .meta { display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 3px 8px; margin: 4px 0 0; padding: 4px 0; border-bottom: 1px solid var(--rule); }
    .meta .k { font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold-deep); }
    .meta .v { font-weight: 700; font-size: 7pt; word-break: break-word; }
    .meta .wide { grid-column: 1 / -1; display: flex; align-items: baseline; gap: 6px; }

    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 4px 0; border-bottom: 1px solid var(--rule); }
    .parties.three { grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .party h4 { font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 2px; color: var(--gold-deep); }
    .party p { font-size: 6.3pt; line-height: 1.3; word-break: break-word; }

    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th { font-size: 5.5pt; text-transform: uppercase; letter-spacing: 0.04em; padding: 2px; border-bottom: 1px solid var(--rule); text-align: left; color: var(--midnight); }
    td { font-size: 6.6pt; padding: 2px; vertical-align: top; }
    .items { margin-top: 2px; }
    .items tr.item td { border-bottom: 0.5px solid var(--rule-soft); }
    .item-name { font-weight: 700; }
    .sub { font-size: 5.6pt; color: var(--ink-mid); font-weight: 400; }
    .text-left { text-align: left; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .strong { font-weight: 700; }

    .section-title { font-size: 5.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; margin: 4px 0 0; color: var(--gold-deep); }
    .gst-summary { background: var(--wash); }
    .gst-summary th, .gst-summary td { font-size: 6pt; padding: 1.5px 3px; }
    .gst-summary tbody td { border-bottom: 0.5px solid var(--rule-soft); }
    .gst-summary tfoot td { font-weight: 700; border-top: 1px solid var(--rule); }

    .summary { display: flex; gap: 8px; align-items: flex-end; margin-top: 4px; }
    .words { flex: 1; font-size: 6pt; line-height: 1.3; }
    .words strong { color: var(--gold-deep); }
    .totals { width: 56%; }
    .totals .row { display: flex; justify-content: space-between; padding: 1px 0; font-size: 6.6pt; }
    .grand { display: flex; justify-content: space-between; align-items: center; background: var(--midnight); color: #fff; padding: 4px 7px; margin-top: 2px; border-radius: 3px; border-left: 3px solid var(--gold); font-size: 9pt; font-weight: 700; }
    .grand .amt { color: var(--gold); }

    .footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: 5px; padding-top: 4px; border-top: 1px solid var(--rule); }
    .footer .notes { font-size: 5.6pt; line-height: 1.3; color: var(--ink-mid); flex: 1; }
    .sign { text-align: right; font-size: 6pt; min-width: 1.3in; }
    .sign img { max-width: 1in; max-height: 0.32in; display: block; margin: 2px 0 2px auto; }
    .sign .line { margin-top: 0.2in; font-weight: 700; font-family: 'Playfair Display', Georgia, serif; }
    .sign img + .line { margin-top: 0; }

    @media print {
      html, body { background: #fff; padding: 0; }
      .print-button { display: none; }
      .label { margin: 0; box-shadow: none; min-height: auto; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      /* Thermal label printers print black only: gold would come out as grainy dots, so the
         label prints black-and-white. The PDF (html.color-print) keeps the Midnight Gold colours. */
      html:not(.color-print) {
        --midnight: #000; --gold: #fff; --gold-deep: #000; --ink: #000; --ink-mid: #222;
        --rule: #000; --rule-soft: #999; --wash: #fff; --band-text: #fff;
      }
      html:not(.color-print) .brand-band { border-bottom-color: #000; }
      html:not(.color-print) .grand { border-left-color: #000; }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">🖨️ Print 4×6 label</button>
  <div class="label">
    <div class="brand-band">
      <div class="wordmark" aria-label="NEFOL">
        <span class="mark">NEF<span class="o">ö</span>L</span>
        <span class="tagline">Natural as the morning dew</span>
      </div>
      <div class="doc-title">
        <div class="t">TAX INVOICE</div>
        <div class="s">Original for Recipient</div>
      </div>
    </div>

    <div class="meta">
      ${meta.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
      ${shipmentInfo?.awb_code ? `<div class="wide"><span class="k">AWB</span><span class="v">${esc(shipmentInfo.awb_code)}</span></div>` : ''}
    </div>

    <div class="parties${sameAddress ? '' : ' three'}">
      <div class="party">
        <h4>Sold by</h4>
        <p>
          <strong>${esc(sellerName)}</strong>
          ${sellerAddress ? `<br/>${esc(sellerAddress)}` : ''}
          ${sellerGST || sellerPAN ? `<br/>${[sellerGST && `GSTIN <strong>${esc(sellerGST)}</strong>`, sellerPAN && `PAN ${esc(sellerPAN)}`].filter(Boolean).join(' · ')}` : ''}
          ${sellerPhone || sellerEmail ? `<br/>${[sellerPhone, sellerEmail].filter(Boolean).map(esc).join(' · ')}` : ''}
        </p>
      </div>
      ${sameAddress ? `
      <div class="party">
        <h4>Bill &amp; Ship to</h4>
        <p>${formatAddress(shippingAddr)}</p>
      </div>` : `
      <div class="party">
        <h4>Bill to</h4>
        <p>${formatAddress(billingAddr)}</p>
      </div>
      <div class="party">
        <h4>Ship to</h4>
        <p>${formatAddress(shippingAddr)}</p>
      </div>`}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th class="text-center" style="width: 6%">#</th>
          <th>Item</th>
          <th class="text-center" style="width: 8%">Qty</th>
          <th class="text-right" style="width: 17%">Taxable</th>
          <th class="text-right" style="width: 14%">GST</th>
          <th class="text-right" style="width: 18%">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceItems}
        ${shippingCharges > 0 ? `
        <tr class="item">
          <td></td>
          <td><div class="item-name">Shipping</div></td>
          <td></td>
          <td class="text-right">${money(shippingCharges - shippingTax)}</td>
          <td class="text-right"><div class="sub">${money(shippingTax)}</div></td>
          <td class="text-right strong">${money(shippingCharges)}</td>
        </tr>` : ''}
      </tbody>
    </table>

    <div class="section-title">GST Summary by Rate</div>
    ${gstSummaryHtml}

    <div class="summary">
    <div class="words"><strong>Amount in words:</strong><br/>${esc(amountInWords)}</div>
    <div class="totals">
      <div class="row"><span>Subtotal (incl. GST)</span><span>${money(subtotalBeforeDiscounts)}</span></div>
      ${orderDiscountCode && orderDiscountAmount > 0 ? `<div class="row"><span>Coupon (${esc(orderDiscountCode)})</span><span>−${money(orderDiscountAmount)}</span></div>` : ''}
      ${!orderDiscountCode && orderDiscountAmount > 0 ? `<div class="row"><span>Discount</span><span>−${money(orderDiscountAmount)}</span></div>` : ''}
      ${coinsUsed > 0 ? `<div class="row"><span>Nefol Coins (${coinsUsed})</span><span>−${money(coinsDiscount)}</span></div>` : ''}
      <div class="grand"><span>Grand Total</span><span class="amt">${money(finalTotal)}</span></div>
    </div>
    </div>

    <div class="footer">
      <div class="notes">
        Tax payable under reverse charge: No<br/>
        ${esc(terms || 'Thank you for shopping with NEFOL.')}
      </div>
      <div class="sign">
        For ${esc(sellerName)}
        ${signatoryPhotoUrl ? `<img src="${esc(signatoryPhotoUrl)}" alt="Signature" />` : ''}
        <div class="line">${esc(signature || 'Authorised Signatory')}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `
  } catch (error: any) {
    return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Invoice Generation Error</h1><p>${error.message || 'Failed to generate invoice'}</p></body></html>`
  }
}

