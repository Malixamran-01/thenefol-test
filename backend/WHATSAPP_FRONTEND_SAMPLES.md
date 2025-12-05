# WhatsApp Business Cloud API - Frontend Sample Calls

This document provides frontend code samples for integrating with the WhatsApp Business Cloud API endpoints.

## Base URL

```javascript
const API_BASE_URL = 'https://thenefol.com/api'
```

## 1. Send OTP

Send OTP via WhatsApp (primary) and Email (secondary).

### Endpoint
```
POST /api/otp/send
```

### Request Body
```json
{
  "phone": "919876543210"
}
```

### Frontend Code (JavaScript/React)

```javascript
// Using fetch
async function sendOTP(phone) {
  try {
    const response = await fetch(`${API_BASE_URL}/otp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('OTP sent successfully:', data.data.message)
      console.log('Method:', data.data.method) // 'whatsapp' or 'email'
      console.log('Expires in:', data.data.expiresIn, 'seconds')
      return data
    } else {
      throw new Error(data.error || 'Failed to send OTP')
    }
  } catch (error) {
    console.error('Error sending OTP:', error)
    throw error
  }
}

// Usage
sendOTP('919876543210')
  .then(result => {
    alert(`OTP sent to your ${result.data.method === 'whatsapp' ? 'WhatsApp' : 'Email'}`)
  })
  .catch(error => {
    alert('Failed to send OTP: ' + error.message)
  })
```

### React Hook Example

```javascript
import { useState } from 'react'

function useOTP() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const sendOTP = async (phone) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`${API_BASE_URL}/otp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone })
      })
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send OTP')
      }
      
      return data.data
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { sendOTP, loading, error }
}

// Usage in component
function OTPForm() {
  const { sendOTP, loading, error } = useOTP()
  const [phone, setPhone] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const result = await sendOTP(phone)
      alert(`OTP sent to your ${result.method === 'whatsapp' ? 'WhatsApp' : 'Email'}`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="Enter phone number"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send OTP'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

## 2. Verify OTP

Verify the OTP code sent to the user.

### Endpoint
```
POST /api/otp/verify
```

### Request Body
```json
{
  "phone": "919876543210",
  "otp": "123456"
}
```

### Frontend Code

```javascript
async function verifyOTP(phone, otp) {
  try {
    const response = await fetch(`${API_BASE_URL}/otp/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        otp: otp
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('OTP verified successfully')
      return data
    } else {
      throw new Error(data.error || 'Invalid OTP')
    }
  } catch (error) {
    console.error('Error verifying OTP:', error)
    throw error
  }
}

// Usage
verifyOTP('919876543210', '123456')
  .then(result => {
    alert('OTP verified successfully!')
    // Proceed with login/signup
  })
  .catch(error => {
    alert('OTP verification failed: ' + error.message)
  })
```

### React Component Example

```javascript
function OTPVerification({ phone, onVerified }) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleVerify = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/otp/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone,
          otp: otp
        })
      })

      const data = await response.json()

      if (data.success) {
        onVerified()
      } else {
        setError(data.error || 'Invalid OTP')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleVerify}>
      <input
        type="text"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        placeholder="Enter 6-digit OTP"
        maxLength={6}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

## 3. Send Order Notification

Send order confirmation notification via WhatsApp.

### Endpoint
```
POST /api/notifications/order
```

### Request Body
```json
{
  "phone": "919876543210",
  "name": "Rahul",
  "orderId": "NF12345",
  "total": 899,
  "items": ["Item 1", "Item 2"]
}
```

### Frontend Code

```javascript
async function sendOrderNotification(orderData) {
  try {
    const response = await fetch(`${API_BASE_URL}/notifications/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: orderData.phone,
        name: orderData.customerName,
        orderId: orderData.orderNumber,
        total: orderData.total,
        items: orderData.items.map(item => item.name || item.title)
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Order notification sent successfully')
      return data
    } else {
      throw new Error(data.error || 'Failed to send order notification')
    }
  } catch (error) {
    console.error('Error sending order notification:', error)
    // Don't throw - notification failure shouldn't break order flow
    return { success: false, error: error.message }
  }
}

// Usage in checkout flow
async function handleOrderComplete(order) {
  // Create order first
  const orderResult = await createOrder(order)
  
  // Send notification (non-blocking)
  if (order.customerPhone) {
    sendOrderNotification({
      phone: order.customerPhone,
      customerName: order.customerName,
      orderNumber: orderResult.order_number,
      total: orderResult.total,
      items: orderResult.items
    }).catch(err => {
      console.error('Failed to send order notification:', err)
      // Log but don't fail the order
    })
  }
}
```

### React Hook Example

```javascript
function useOrderNotification() {
  const sendNotification = async (orderData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: orderData.phone,
          name: orderData.name,
          orderId: orderData.orderId,
          total: orderData.total,
          items: orderData.items
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send notification')
      }
      
      return data
    } catch (error) {
      console.error('Order notification error:', error)
      // Return success=false but don't throw
      return { success: false, error: error.message }
    }
  }

  return { sendNotification }
}

// Usage in checkout component
function CheckoutComplete({ order }) {
  const { sendNotification } = useOrderNotification()

  useEffect(() => {
    if (order && order.customerPhone) {
      sendNotification({
        phone: order.customerPhone,
        name: order.customerName,
        orderId: order.orderNumber,
        total: order.total,
        items: order.items.map(item => item.name)
      })
    }
  }, [order])

  return <div>Order placed successfully!</div>
}
```

## Error Handling

All endpoints return a consistent response format:

### Success Response
```json
{
  "success": true,
  "data": {
    "message": "Operation successful",
    // ... additional data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here"
}
```

### Error Handling Helper

```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options)
    const data = await response.json()
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }
    
    return data
  } catch (error) {
    console.error('API call failed:', error)
    throw error
  }
}

// Usage
try {
  const result = await apiCall(`${API_BASE_URL}/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '919876543210' })
  })
  console.log('Success:', result.data)
} catch (error) {
  alert('Error: ' + error.message)
}
```

## Notes

1. **Phone Number Format**: Always use international format without spaces or special characters (e.g., `919876543210` for India)

2. **OTP Expiration**: OTPs expire after 10 minutes

3. **Rate Limiting**: Be mindful of API rate limits when sending multiple requests

4. **Error Handling**: Always handle errors gracefully, especially for notifications which shouldn't break the main flow

5. **Security**: Never expose API tokens or secrets in frontend code

