# WhatsApp Templates Testing Guide

## 📋 Overview

This guide provides complete documentation for testing all WhatsApp Business Cloud API templates on **https://thenefol.com/**

## 📦 Files Included

1. **`WHATSAPP_TEMPLATES_POSTMAN_COLLECTION.json`** - Complete Postman collection
2. **`test-whatsapp-templates-production.js`** - Automated test script
3. **`WHATSAPP_TEMPLATES_TESTING_GUIDE.md`** - This guide

## 🚀 Quick Start

### Option 1: Import Postman Collection

1. Open Postman
2. Click **Import** → **File**
3. Select `WHATSAPP_TEMPLATES_POSTMAN_COLLECTION.json`
4. Update collection variables:
   - `base_url`: `https://thenefol.com`
   - `test_phone`: Your test phone number (e.g., `919876543210`)
   - `admin_token`: Your admin JWT token (for order endpoints)
   - `order_id`: An existing order ID for testing

### Option 2: Run Automated Test Script

```bash
cd backend
node test-whatsapp-templates-production.js 919876543210
```

## 📱 All WhatsApp Templates

### 1. Authentication Templates (Language: `en`, No Fallback)

| Template Name | Variables | Function | Endpoint | Status |
|--------------|-----------|----------|----------|--------|
| `nefol_verify_code` | None (Meta auto-generates) | OTP Verification | `POST /api/auth/send-otp` | ⚠️ Needs template fix |
| `nefol_reset_password` | `[resetCode]` | Password Reset | `POST /api/auth/request-reset` | ✅ Working |
| `nefol_signup_success` | `[name]` | Signup Success | `POST /api/auth/register` | ✅ Auto-triggered |
| `nefol_login_alert` | `[name, deviceInfo, timestamp]` | Login Alert | `POST /api/auth/login` | ✅ Auto-triggered |
| `nefol_greet_1` | `[name]` | Greeting Message | Service method | ✅ Available |
| `nefol_welcome_1` | `[name]` | Welcome Message | Service method | ✅ Available |

### 2. Order & Transaction Templates (Has Fallback)

| Template Name | Variables | Function | Endpoint | Status |
|--------------|-----------|----------|----------|--------|
| `nefol_order_shipped` | `[name, orderId, trackingUrl]` | Order Shipped | `PUT /api/orders/:id` | ✅ Working |
| `nefol_order_delivered` | `[name, orderId]` | Order Delivered | `PUT /api/orders/:id` | ✅ Working |
| `nefol_refund_1` | `[name, orderId, amount]` | Refund Notification | Refund flow | ✅ Auto-triggered |
| `nefol_cod_verify` | `[name, orderId, amount]` | COD Verification | COD flow | ✅ Auto-triggered |

### 3. Marketing Templates

| Template Name | Variables | Function | Endpoint | Status |
|--------------|-----------|----------|----------|--------|
| `nefol_cart_recover` | `[name, cartUrl]` | Cart Abandonment | Cron job | ✅ Auto-triggered |

## 🧪 Testing Each Template

### 1.1 Send OTP (`nefol_verify_code`)

**Endpoint:** `POST https://thenefol.com/api/auth/send-otp`

**Request:**
```json
{
  "phone": "919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "OTP sent successfully to your WhatsApp",
    "method": "whatsapp",
    "expiresIn": 300
  }
}
```

**Note:** ⚠️ Currently failing with parameter mismatch error. Template needs to be reconfigured in Meta Business Manager as "Copy Code" format with zero variables.

---

### 1.2 Password Reset (`nefol_reset_password`)

**Endpoint:** `POST https://thenefol.com/api/auth/request-reset`

**Request:**
```json
{
  "phone": "919876543210"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "If an account exists, a reset code has been sent"
}
```

**Status:** ✅ **Working** (Tested successfully on production)

---

### 1.3 User Signup (`nefol_signup_success`)

**Endpoint:** `POST https://thenefol.com/api/auth/register`

**Request:**
```json
{
  "name": "Test User",
  "phone": "919876543210",
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

**Note:** Template is automatically sent after successful registration.

---

### 1.4 Login Alert (`nefol_login_alert`)

**Endpoint:** `POST https://thenefol.com/api/auth/login`

**Request:**
```json
{
  "phone": "919876543210",
  "password": "SecurePass123!"
}
```

**Note:** Template is automatically sent when login is from a new device/IP.

---

### 2.1 Order Shipped (`nefol_order_shipped`)

**Endpoint:** `PUT https://thenefol.com/api/orders/:id`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request:**
```json
{
  "status": "shipped",
  "tracking": "https://tracking.example.com/ABC123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "status": "shipped",
    "tracking": "https://tracking.example.com/ABC123"
  }
}
```

---

### 2.2 Order Delivered (`nefol_order_delivered`)

**Endpoint:** `PUT https://thenefol.com/api/orders/:id`

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json
```

**Request:**
```json
{
  "status": "delivered"
}
```

---

### 3.1 Cart Recovery (`nefol_cart_recover`)

**Note:** This is triggered automatically by the cron job (`cron/cartAbandonment.ts`) for carts that are:
- Older than 1 hour
- Not checked out
- Have items

**Manual Test:**
1. Add items to cart
2. Wait 1+ hour without checkout
3. Cron job will send the message automatically

---

### 4.1 Test WhatsApp (Plain Text)

**Endpoint:** `POST https://thenefol.com/api/alerts/test/whatsapp`

**Request:**
```json
{
  "phone_number": "919876543210",
  "message": "Test message from Postman"
}
```

**Note:** ⚠️ Requires WhatsApp configuration in database (`notification_config` table).

---

## 🔧 Postman Collection Variables

Update these in Postman:

| Variable | Default Value | Description |
|----------|--------------|-------------|
| `base_url` | `https://thenefol.com` | Production API base URL |
| `test_phone` | `919876543210` | Test phone number (with country code, no +) |
| `admin_token` | (empty) | Admin JWT token for authenticated endpoints |
| `order_id` | `1` | Order ID for testing order templates |
| `verify_token` | (empty) | WhatsApp webhook verify token |

## 📊 Test Results Summary

Based on production testing on **2025-11-29**:

| Template | Status | Notes |
|----------|--------|-------|
| `nefol_verify_code` | ❌ Failing | Parameter mismatch - template needs Meta reconfiguration |
| `nefol_reset_password` | ✅ Working | Successfully tested |
| `nefol_signup_success` | ✅ Available | Auto-triggered on signup |
| `nefol_login_alert` | ✅ Available | Auto-triggered on new device login |
| `nefol_order_shipped` | ✅ Available | Requires admin auth |
| `nefol_order_delivered` | ✅ Available | Requires admin auth |
| `nefol_cart_recover` | ✅ Available | Auto-triggered by cron |
| Test WhatsApp (Plain) | ⚠️ Config Missing | Requires WhatsApp config in DB |

## 🐛 Known Issues

1. **`nefol_verify_code` Parameter Mismatch**
   - **Error:** `(#132000) Number of parameters does not match the expected number of params`
   - **Cause:** Template in Meta Business Manager has parameters defined, but code sends zero parameters
   - **Fix:** Recreate template in Meta as "Copy Code" format with NO parameters

2. **Test WhatsApp Endpoint**
   - **Error:** `WhatsApp config missing`
   - **Cause:** `notification_config` table doesn't have WhatsApp credentials
   - **Fix:** Configure WhatsApp credentials in admin panel or database

## ✅ Testing Checklist

- [ ] Import Postman collection
- [ ] Update collection variables (phone, token, order_id)
- [ ] Test OTP endpoint (may fail due to template config)
- [ ] Test Password Reset endpoint
- [ ] Test Plain Text WhatsApp (if config exists)
- [ ] Test WhatsApp Subscribe/Unsubscribe
- [ ] Test Order Shipped (requires admin token)
- [ ] Test Order Delivered (requires admin token)
- [ ] Test User Signup (triggers template automatically)
- [ ] Test User Login from new device (triggers template automatically)

## 📞 Support

For issues or questions:
1. Check Meta Business Manager for template approval status
2. Verify WhatsApp API credentials in `.env`
3. Check server logs for detailed error messages
4. Ensure phone numbers are in correct format (country code, no +)

## 🔗 Related Files

- `backend/src/services/whatsappService.ts` - All template functions
- `backend/src/utils/whatsappTemplateHelper.ts` - Low-level template helper
- `backend/src/routes/otp.ts` - OTP sending endpoint
- `backend/src/routes/auth.ts` - Authentication endpoints
- `backend/src/cron/cartAbandonment.ts` - Cart abandonment cron

---

**Last Updated:** 2025-11-29  
**Production URL:** https://thenefol.com  
**API Base:** https://thenefol.com/api

