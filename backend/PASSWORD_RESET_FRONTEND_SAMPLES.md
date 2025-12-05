# Password Reset System - Frontend Integration Guide

This document provides frontend code samples for integrating the password reset system.

## Base URL

```javascript
const API_BASE_URL = 'https://thenefol.com/api'
```

## 1. Forgot Password

Request a password reset link via email.

### Endpoint
```
POST /api/auth/forgot-password
```

### Request Body
```json
{
  "email": "user@example.com"
}
```

### Frontend Code (JavaScript/React)

```javascript
// Using fetch
async function forgotPassword(email) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Password reset email sent:', data.data.message)
      return data
    } else {
      throw new Error(data.error || 'Failed to send password reset email')
    }
  } catch (error) {
    console.error('Error requesting password reset:', error)
    throw error
  }
}

// Usage
forgotPassword('user@example.com')
  .then(result => {
    alert('If an account with that email exists, a password reset link has been sent.')
  })
  .catch(error => {
    alert('Error: ' + error.message)
  })
```

### React Component Example

```javascript
import { useState } from 'react'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.data.message || 'Password reset link sent!')
      } else {
        setError(data.error || 'Failed to send reset link')
      }
    } catch (err) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Forgot Password</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

## 2. Reset Password

Reset password using the token from the email link.

### Endpoint
```
POST /api/auth/reset-password
```

### Request Body
```json
{
  "email": "user@example.com",
  "token": "raw_token_from_email_link",
  "newPassword": "NewSecurePass123"
}
```

### Frontend Code

```javascript
// Using fetch
async function resetPassword(email, token, newPassword) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        token: token,
        newPassword: newPassword
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      console.log('Password reset successful:', data.data.message)
      return data
    } else {
      throw new Error(data.error || 'Failed to reset password')
    }
  } catch (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

// Usage
resetPassword('user@example.com', 'token_from_url', 'NewSecurePass123')
  .then(result => {
    alert('Password reset successful! You can now login.')
    // Redirect to login page
    window.location.href = '/login'
  })
  .catch(error => {
    alert('Password reset failed: ' + error.message)
  })
```

### React Component Example (Reset Password Page)

```javascript
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Extract token and email from URL query parameters
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')

    if (!tokenParam || !emailParam) {
      setError('Invalid reset link. Missing token or email.')
      return
    }

    setToken(tokenParam)
    setEmail(decodeURIComponent(emailParam))
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          token,
          newPassword: password
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/login')
        }, 3000)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch (err) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div>
        <h2>Password Reset Successful!</h2>
        <p>Your password has been reset. Redirecting to login...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Your Password</h2>
      <input
        type="email"
        value={email}
        disabled
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New Password"
        required
        minLength={8}
        disabled={loading}
      />
      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm New Password"
        required
        minLength={8}
        disabled={loading}
      />
      <button type="submit" disabled={loading || !token}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  )
}
```

### React Router Setup

```javascript
// In your router configuration
import { Route } from 'react-router-dom'
import ResetPasswordPage from './pages/ResetPasswordPage'

<Route path="/reset-password" element={<ResetPasswordPage />} />
```

## 3. Complete Flow Example

```javascript
// Complete password reset flow
async function handlePasswordResetFlow(email) {
  try {
    // Step 1: Request password reset
    const resetRequest = await forgotPassword(email)
    console.log('Reset request sent:', resetRequest.data.message)
    
    // Step 2: User clicks link in email
    // Step 3: Extract token from URL (handled in ResetPasswordPage component)
    // Step 4: User submits new password
    // Step 5: Call resetPassword(email, token, newPassword)
    
  } catch (error) {
    console.error('Password reset flow error:', error)
  }
}
```

## Password Requirements

- Minimum 8 characters
- Maximum 128 characters
- Must contain at least one letter
- Must contain at least one number

## Security Notes

1. **Token Expiry**: Reset tokens expire after 15 minutes
2. **One-Time Use**: Tokens can only be used once
3. **Email Enumeration Protection**: The API always returns success for forgot-password requests, even if the email doesn't exist
4. **Token Format**: Tokens are 64-character hex strings (32 bytes)
5. **Password Hashing**: All passwords are hashed using bcrypt with 10 salt rounds

## Error Handling

### Common Errors

- **400 Bad Request**: Invalid email format, missing fields, or invalid token format
- **400 Bad Request**: "Invalid or expired reset token" - Token doesn't match or has expired
- **400 Bad Request**: "Password must be at least 8 characters long" - Password doesn't meet requirements
- **500 Internal Server Error**: Server error during processing

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
```

## Testing

### Test Forgot Password

```bash
curl -X POST https://thenefol.com/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'
```

### Test Reset Password

```bash
curl -X POST https://thenefol.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "token":"your_token_here",
    "newPassword":"NewSecurePass123"
  }'
```

## Notes

1. **Email Delivery**: Ensure your SMTP configuration is correct for emails to be sent
2. **Frontend URL**: Update `USER_PANEL_URL` or `CLIENT_ORIGIN` in `.env` to match your frontend domain
3. **Token Extraction**: Always extract token and email from URL query parameters on the reset password page
4. **Password Validation**: Validate password strength on frontend before submitting
5. **User Experience**: Show clear success/error messages and redirect to login after successful reset

