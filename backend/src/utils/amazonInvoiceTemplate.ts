// Amazon-style invoice template generator
import { getStateCode, numberToWords } from './invoiceUtils'

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
    
    // Build itemized table rows
    const invoiceItems = items.map((item: any, index: number) => {
      const unitPrice = parseFloat(item.price || item.unitPrice || item.mrp || 0)
      const quantity = parseInt(item.quantity || 1)
      const discount = parseFloat(item.discount || 0)
      const gstFromCSV = item.csvProduct?.['GST %']
      const taxRatePercent = gstFromCSV ? parseFloat(gstFromCSV) : parseFloat(taxSettings.rate || 18)
      const taxRate = taxRatePercent / 100
      
      // MRP is tax-inclusive, so extract base price and tax
      const basePricePerUnit = unitPrice / (1 + taxRate)
      const taxPerUnit = unitPrice - basePricePerUnit
      
      const netAmount = basePricePerUnit * quantity
      const itemTax = taxPerUnit * quantity
      const itemTotal = unitPrice * quantity
      const itemDiscount = discount
      const itemTotalAfterDiscount = itemTotal - itemDiscount
      
      totalNetAmount += netAmount
      totalTaxAmount += itemTax
      totalAmount += itemTotalAfterDiscount
      totalDiscount += itemDiscount
      
      const hsnCode = item.csvProduct?.['HSN Code'] || item.hsn || '-'
      const sku = item.csvProduct?.['SKU'] || item.code || item.sku || item.id || 'N/A'
      const productName = item.name || item.productName || item.title || 'Product'
      const brand = item.csvProduct?.['Brand Name'] || 'NEFOL'
      
      // Determine tax type (CGST+SGST or IGST)
      const isCGST = taxSettings.type === 'CGST+SGST'
      const cgstRate = isCGST ? taxRatePercent / 2 : 0
      const sgstRate = isCGST ? taxRatePercent / 2 : 0
      const igstRate = !isCGST ? taxRatePercent : 0
      const cgstAmount = isCGST ? itemTax / 2 : 0
      const sgstAmount = isCGST ? itemTax / 2 : 0
      const igstAmount = !isCGST ? itemTax : 0
      
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${productName}</div>
            <div style="font-size: 11px; color: #666;">${sku}${brand !== 'NEFOL' ? ` | ${brand}` : ''}</div>
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px;">${currency}${basePricePerUnit.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${quantity}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px;">${currency}${netAmount.toFixed(2)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">${taxRatePercent.toFixed(2)}%</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-size: 12px;">
            ${isCGST ? `CGST ${cgstRate.toFixed(2)}%<br/>SGST ${sgstRate.toFixed(2)}%` : `IGST ${igstRate.toFixed(2)}%`}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px;">
            ${isCGST ? `${currency}${cgstAmount.toFixed(2)}<br/>${currency}${sgstAmount.toFixed(2)}` : `${currency}${igstAmount.toFixed(2)}`}
          </td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 12px; font-weight: bold;">${currency}${itemTotalAfterDiscount.toFixed(2)}</td>
        </tr>
      `
    }).join('')
    
    // Calculate shipping tax if applicable
    const shippingCharges = parseFloat(order.shipping || 0)
    let shippingTax = 0
    if (shippingCharges > 0) {
      const shippingTaxRate = parseFloat(taxSettings.rate || 18) / 100
      const shippingBase = shippingCharges / (1 + shippingTaxRate)
      shippingTax = shippingCharges - shippingBase
      totalTaxAmount += shippingTax
    }
    
    // Get order-level discounts (coupon codes and coins)
    const orderDiscountAmount = parseFloat(order.discount_amount || 0)
    const orderDiscountCode = order.discount_code || null
    const coinsUsed = parseFloat(order.coins_used || 0)
    const coinsDiscount = coinsUsed / 10 // 1 rupee = 10 coins
    
    // Calculate final total after order-level discounts
    const subtotalBeforeDiscounts = totalAmount + shippingCharges
    const finalTotal = Math.max(0, subtotalBeforeDiscounts - orderDiscountAmount - coinsDiscount)
    const amountInWords = numberToWords(Math.round(finalTotal))
    
    // Format dates
    const formatDate = (date: string) => {
      const d = new Date(date)
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    
    // Format addresses with state codes
    const formatAddress = (addr: any, isBilling: boolean = false) => {
      if (!addr) return 'N/A'
      if (typeof addr === 'string') return addr
      
      const name = `${addr.firstName || addr.first_name || order.customer_name || ''} ${addr.lastName || addr.last_name || ''}`.trim()
      const company = addr.company || ''
      const address = addr.address || addr.street || ''
      const apartment = addr.apartment || ''
      const city = addr.city || ''
      const state = addr.state || ''
      const zip = addr.zip || ''
      const country = addr.country || 'India'
      const stateCode = getStateCode(state)
      
      let formatted = name
      if (company) formatted += `<br/>${company}`
      if (address) formatted += `<br/>${address}`
      if (apartment) formatted += `<br/>${apartment}`
      formatted += `<br/>${city}, ${state} ${zip}`
      formatted += `<br/>${country}`
      if (stateCode) formatted += `<br/>State/UT Code: ${stateCode}`
      
      return formatted
    }
    
    const shippingAddr = order.shipping_address
    const billingAddr = order.billing_address || order.shipping_address
    const shippingState = shippingAddr?.state || ''
    const billingState = billingAddr?.state || ''
    const placeOfSupply = shippingState || billingState
    const placeOfDelivery = shippingState || billingState
    
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
    const sellerBank = companyDetails.bankName || ''
    const sellerAccount = companyDetails.accountNumber || ''
    const sellerIFSC = companyDetails.ifscCode || ''
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tax Invoice - ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; font-size: 11px; }
    .invoice-container { max-width: 210mm; margin: 0 auto; background: white; padding: 10mm; min-height: 297mm; max-height: 297mm; overflow: hidden; }
    .print-button { 
      position: fixed; 
      top: 20px; 
      right: 20px; 
      background: #232f3e; 
      color: white; 
      padding: 12px 24px; 
      border: none; 
      border-radius: 4px; 
      cursor: pointer; 
      font-size: 14px; 
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .print-button:hover { background: #37475a; }
    @media print {
      body { background: white; padding: 0; }
      .print-button { display: none; }
      .invoice-container { 
        max-width: 210mm; 
        margin: 0; 
        padding: 10mm; 
        box-shadow: none;
        page-break-after: avoid;
      }
      @page { 
        size: A4; 
        margin: 0;
        size: 210mm 297mm;
      }
      .invoice-container { 
        max-width: 210mm; 
        margin: 0; 
        padding: 10mm; 
        box-shadow: none;
        page-break-after: avoid;
        page-break-inside: avoid;
        height: 277mm;
        overflow: hidden;
      }
      * { 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 2px solid #333; padding-bottom: 10px; }
    .logo-section { flex: 1; }
    .logo { ${logoUrl ? `background: url('${logoUrl}') center/contain no-repeat;` : 'background: #232f3e; color: white;'} width: 120px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; }
    .invoice-title { flex: 1; text-align: right; font-size: 12px; font-weight: bold; color: #333; }
    .seller-section { margin-bottom: 12px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
    .seller-title { font-weight: bold; font-size: 11px; margin-bottom: 6px; color: #333; }
    .seller-info { font-size: 10px; line-height: 1.5; color: #333; }
    .address-section { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .address-box { padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
    .address-title { font-weight: bold; font-size: 11px; margin-bottom: 6px; color: #333; }
    .address-content { font-size: 10px; line-height: 1.6; color: #333; }
    .order-info { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
    .info-item { font-size: 10px; }
    .info-label { font-weight: bold; color: #333; }
    .info-value { color: #333; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; }
    th { background: #232f3e; color: white; padding: 6px 4px; text-align: left; font-weight: bold; border: 1px solid #ddd; font-size: 9px; }
    td { padding: 5px 4px; border: 1px solid #ddd; color: #333; font-size: 9px; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .summary-section { margin-top: 12px; padding: 10px; background: #f9f9f9; border: 1px solid #ddd; }
    .summary-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #ddd; font-size: 10px; }
    .summary-label { font-weight: 500; color: #333; }
    .summary-value { font-weight: bold; color: #333; }
    .grand-total { background: #232f3e; color: white; padding: 10px; margin-top: 10px; display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; }
    .amount-words { margin-top: 10px; padding: 8px; background: #fff; border: 1px solid #ddd; font-size: 10px; font-weight: bold; color: #333; }
    .footer { margin-top: 15px; padding-top: 12px; border-top: 2px solid #333; }
    .signature-section { margin-top: 15px; }
    .signature-box { text-align: right; }
    .signature-photo { max-width: 120px; max-height: 60px; border: 1px solid #ddd; margin-bottom: 6px; }
    .signature-text { font-weight: bold; font-size: 10px; color: #333; }
    .reverse-charge { margin-top: 12px; font-size: 10px; color: #333; }
    .footer-note { margin-top: 12px; font-size: 9px; color: #666; line-height: 1.5; }
    .page-number { text-align: right; margin-top: 12px; font-size: 9px; color: #666; }
  </style>
  <script>
    function printInvoice() {
      window.print();
    }
    // Auto-print on load (optional - can be removed if not desired)
    // window.addEventListener('load', function() {
    //   setTimeout(function() {
    //     window.print();
    //   }, 500);
    // });
  </script>
</head>
<body>
  <button class="print-button" onclick="printInvoice()">🖨️ Print Invoice</button>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        <div class="logo">${logoUrl ? '' : companyDetails.companyName || 'NEFOL'}</div>
      </div>
      <div class="invoice-title">
        Tax Invoice/Bill of Supply/Cash Memo<br/>
        (Original for Recipient)
      </div>
    </div>
    
    <!-- Seller Information -->
    <div class="seller-section">
      <div class="seller-title">Sold By:</div>
      <div class="seller-info">
        <strong>${sellerName}</strong><br/>
        ${sellerAddress ? `${sellerAddress}<br/>` : ''}
        ${sellerPhone ? `Phone: ${sellerPhone}<br/>` : ''}
        ${sellerEmail ? `Email: ${sellerEmail}<br/>` : ''}
        ${sellerPAN ? `PAN No: ${sellerPAN}<br/>` : ''}
        ${sellerGST ? `GST Registration No: ${sellerGST}` : ''}
      </div>
    </div>
    
    <!-- Addresses -->
    <div class="address-section">
      <div class="address-box">
        <div class="address-title">Billing Address:</div>
        <div class="address-content">${formatAddress(billingAddr, true)}</div>
      </div>
      <div class="address-box">
        <div class="address-title">Shipping Address:</div>
        <div class="address-content">${formatAddress(shippingAddr, false)}</div>
      </div>
    </div>
    
    <!-- Order Information -->
    <div class="order-info">
      <div class="info-item">
        <div class="info-label">Order Number:</div>
        <div class="info-value">${order.order_number || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Order Date:</div>
        <div class="info-value">${orderDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Invoice Number:</div>
        <div class="info-value">${invoiceNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Invoice Date:</div>
        <div class="info-value">${invoiceDate}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Place of Supply:</div>
        <div class="info-value">${placeOfSupply || 'N/A'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Place of Delivery:</div>
        <div class="info-value">${placeOfDelivery || 'N/A'}</div>
      </div>
    </div>
    
    <!-- Itemized Table -->
    <table>
      <thead>
        <tr>
          <th class="text-center">Sl. No</th>
          <th>Description</th>
          <th class="text-right">Unit Price</th>
          <th class="text-center">Qty</th>
          <th class="text-right">Net Amount</th>
          <th class="text-center">Tax Rate</th>
          <th class="text-center">Tax Type</th>
          <th class="text-right">Tax Amount</th>
          <th class="text-right">Total Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoiceItems}
      </tbody>
      <tfoot>
        <tr style="background: #f0f0f0; font-weight: bold;">
          <td colspan="4" class="text-right" style="padding: 10px;">SUBTOTAL</td>
          <td class="text-right" style="padding: 10px;">${currency}${totalNetAmount.toFixed(2)}</td>
          <td></td>
          <td></td>
          <td class="text-right" style="padding: 10px;">${currency}${totalTaxAmount.toFixed(2)}</td>
          <td class="text-right" style="padding: 10px;">${currency}${(totalAmount + shippingCharges).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    
    <!-- Summary -->
    <div class="summary-section">
      <div class="summary-row">
        <div class="summary-label">Subtotal (Items + Shipping):</div>
        <div class="summary-value">${currency}${(totalAmount + shippingCharges).toFixed(2)}</div>
      </div>
      ${orderDiscountCode && orderDiscountAmount > 0 ? `
      <div class="summary-row" style="color: #dc2626;">
        <div class="summary-label">Coupon Discount (${orderDiscountCode}):</div>
        <div class="summary-value" style="color: #dc2626;">-${currency}${orderDiscountAmount.toFixed(2)}</div>
      </div>
      ` : ''}
      ${coinsUsed > 0 ? `
      <div class="summary-row" style="color: #dc2626;">
        <div class="summary-label">Nefol Coins Discount (${coinsUsed} coins):</div>
        <div class="summary-value" style="color: #dc2626;">-${currency}${coinsDiscount.toFixed(2)}</div>
      </div>
      ` : ''}
      <div class="summary-row" style="border-top: 2px solid #333; margin-top: 8px; padding-top: 8px; font-weight: bold; font-size: 12px;">
        <div class="summary-label">Grand Total:</div>
        <div class="summary-value">${currency}${finalTotal.toFixed(2)}</div>
      </div>
      <div class="summary-row" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #ddd;">
        <div class="summary-label">Amount in Words:</div>
        <div class="summary-value">${amountInWords}</div>
      </div>
      ${shipmentInfo?.awb_code ? `
      <div class="summary-row" style="border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px;">
        <div class="summary-label">AWB Code:</div>
        <div class="summary-value"><strong>${shipmentInfo.awb_code}</strong></div>
      </div>
      ` : ''}
      ${shipmentInfo?.tracking_url ? `
      <div class="summary-row">
        <div class="summary-label">Tracking:</div>
        <div class="summary-value"><a href="${shipmentInfo.tracking_url}" target="_blank" style="color: #0066cc; text-decoration: none;">Track Shipment →</a></div>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="signature-section">
        <div class="signature-box">
          ${signatoryPhotoUrl ? `<img src="${signatoryPhotoUrl}" alt="Signature" class="signature-photo" />` : ''}
          <div class="signature-text">For ${sellerName}:</div>
          <div class="signature-text" style="margin-top: 40px;">${signature || 'Authorized Signatory'}</div>
        </div>
      </div>
      <div class="reverse-charge">
        <strong>Whether tax is payable under reverse charge - No</strong>
      </div>
      <div class="footer-note">
        ${terms || 'Thank you for doing business with us.'}
      </div>
      <div class="page-number">Page 1 of 1</div>
    </div>
  </div>
</body>
</html>
    `
  } catch (error: any) {
    return `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Invoice Generation Error</h1><p>${error.message || 'Failed to generate invoice'}</p></body></html>`
  }
}

