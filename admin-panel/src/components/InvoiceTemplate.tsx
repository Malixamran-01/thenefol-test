import React from 'react'

interface InvoiceItem {
  id: string
  productName: string
  hsnSac: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoiceData {
  invoiceNumber: string
  date: string
  companyName: string
  companyPhone: string
  billTo: string
  bsn: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total: number
  received: number
  balance: number
  amountInWords: string
}

interface InvoiceTemplateProps {
  data: InvoiceData
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data }) => {
  return (
    <div className="invoice-template" id="invoice-print" style={{ 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '210mm',
      margin: '0 auto',
      padding: '20mm',
      backgroundColor: 'white',
      color: '#1a1a1a'
    }}>
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
          .invoice-template { 
            margin: 0; 
            padding: 0; 
            box-shadow: none;
          }
        }
        
        .invoice-template {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 2px;
          border-radius: 8px;
        }
        
        .invoice-content {
          background: white;
          border-radius: 6px;
          padding: 30px;
          height: 100%;
        }
      `}</style>

      <div className="invoice-content">
        {/* Header Section */}
        <div style={{ 
          marginBottom: '30px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Logo Box */}
          <div style={{
            backgroundColor: '#667eea',
            color: 'white',
            padding: '20px',
            width: '120px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '10px',
            borderRadius: '8px'
          }}>
            LOGO
          </div>

          {/* Company Info */}
          <div style={{ 
            fontSize: '14px',
            color: '#4a5568',
            fontWeight: '600',
            marginBottom: '5px'
          }}>
            {data.companyName || 'My Company'}
          </div>

          {/* Phone Bar */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '8px 15px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            width: 'fit-content',
            marginBottom: '20px'
          }}>
            📞 {data.companyPhone || '7355384939'}
          </div>

          {/* Tax Invoice Title */}
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#4a5568',
            marginBottom: '15px',
            marginTop: '20px'
          }}>
            Tax Invoice
          </div>

          {/* Invoice Details */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px'
          }}>
            <div style={{ color: '#4a5568' }}>
              <div style={{ marginBottom: '5px', fontSize: '14px' }}>
                Invoice No.: <strong>{data.invoiceNumber}</strong>
              </div>
              <div style={{ fontSize: '14px' }}>
                Date: <strong>{data.date}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '5px' }}>
            <strong>Bill To:</strong> {data.billTo}
          </div>
          <div style={{ fontSize: '14px', color: '#4a5568' }}>
            <strong>Bsn:</strong> {data.bsn}
          </div>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '30px' }}>
          <table style={{ 
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e2e8f0'
          }}>
            <thead>
              <tr style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: 'none' }}>#</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: 'none' }}>Item Name</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', border: 'none' }}>HSN/SAC</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', border: 'none' }}>Quantity</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', border: 'none' }}>Price/Unit</th>
                <th style={{ padding: '12px 8px', textAlign: 'right', border: 'none' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items && data.items.length > 0 ? (
                data.items.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 8px', color: '#4a5568' }}>{index + 1}</td>
                    <td style={{ padding: '10px 8px', color: '#4a5568' }}>{item.productName}</td>
                    <td style={{ padding: '10px 8px', color: '#4a5568' }}>{item.hsnSac}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#4a5568' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#4a5568' }}>₹{item.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#4a5568' }}>₹{item.total.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                // Empty rows for printing
                [...Array(5)].map((_, index) => (
                  <tr key={index}>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                    <td style={{ padding: '15px 8px', borderBottom: '1px solid #e2e8f0' }}></td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: 'bold'
              }}>
                <td colSpan={5} style={{ padding: '12px 8px', textAlign: 'right', border: 'none' }}>Total</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', border: 'none' }}>₹{data.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
          {/* Left: Words and Terms */}
          <div style={{ flex: '1' }}>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', color: '#4a5568', fontWeight: '600', marginBottom: '5px' }}>
                Invoice Amount In Words
              </div>
              <div style={{ fontSize: '14px', color: '#4a5568' }}>
                {data.amountInWords || 'Zero Rupees only'}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                fontSize: '16px', 
                color: '#667eea', 
                fontWeight: 'bold',
                marginBottom: '5px' 
              }}>
                Terms And Conditions
              </div>
              <div style={{ fontSize: '14px', color: '#4a5568' }}>
                Thank you for doing business with us.
              </div>
            </div>

            {/* Signature */}
            <div style={{ marginTop: '40px' }}>
              <div style={{ fontSize: '14px', color: '#4a5568', marginBottom: '30px' }}>
                For: {data.companyName || 'My Company'}
              </div>
              <div style={{ fontSize: '14px', color: '#4a5568' }}>
                Authorized Signatory
              </div>
            </div>
          </div>

          {/* Right: Financial Summary */}
          <div style={{ minWidth: '200px' }}>
            <div style={{ 
              padding: '15px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: '6px 6px 0 0',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Total
            </div>
            <div style={{
              padding: '15px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#4a5568',
              textAlign: 'center'
            }}>
              ₹{data.total.toFixed(2)}
            </div>

            <div style={{ 
              padding: '12px 15px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              fontSize: '14px',
              color: '#4a5568'
            }}>
              <strong>Received:</strong>
            </div>
            <div style={{
              padding: '12px 15px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              fontSize: '14px',
              color: '#4a5568',
              textAlign: 'right'
            }}>
              ₹{data.received.toFixed(2)}
            </div>

            <div style={{ 
              padding: '12px 15px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              fontSize: '14px',
              color: '#4a5568',
              borderBottomLeftRadius: '6px',
              borderBottomRightRadius: '6px'
            }}>
              <strong>Balance:</strong>
            </div>
            <div style={{
              padding: '12px 15px',
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderTop: 'none',
              fontSize: '14px',
              color: '#4a5568',
              textAlign: 'right',
              borderBottomLeftRadius: '6px',
              borderBottomRightRadius: '6px'
            }}>
              ₹{data.balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Utility function to convert number to words
export const numberToWords = (num: number): string => {
  // Simple implementation for demonstration
  // You might want to use a library for more complex scenarios
  if (num === 0) return 'Zero'
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  
  if (num < 10) return ones[num] + ' Rupees only'
  if (num < 20) return teens[num - 10] + ' Rupees only'
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '') + ' Rupees only'
  }
  
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' Hundred ' + (num % 100 > 0 ? numberToWords(num % 100) : 'Rupees only')
  }
  
  return 'Five Hundred Rupees only' // Default for now
}

export default InvoiceTemplate

