# WhatsApp Business Cloud API Integration - Complete Changelog

## 📋 OVERVIEW

This document summarizes all changes made to integrate WhatsApp Business Cloud API (Meta) with 11 message templates for authentication, utility, and marketing purposes.

---

## ✅ FILES CREATED

### 1. `backend/src/utils/whatsappTemplateHelper.ts` (NEW)
**Purpose**: Low-level WhatsApp template sending helper with retry logic
- `sendWhatsAppTemplate()`: Core function to send templates with retry (1 retry for 5xx errors)
- `normalizePhoneNumber()`: Converts phone numbers to E.164 format
- Handles template rejection errors (code 132018) and returns structured errors
- Validates phone numbers (10-15 digits)
- Logs provider message IDs

### 2. `backend/src/services/otpService.ts` (NEW)
**Purpose**: OTP generation, storage, and verification service
- `generateOTP()`: Creates numeric OTP (configurable length, default 6)
- `hashOTP()`: SHA256 hashing for secure storage
- `maskOTP()`: Masks OTP for logging (shows only last 2 digits)
- `generateAndSendOtp()`: Generates, stores (hashed), and sends OTP via WhatsApp/Email
- `verifyOtp()`: Validates OTP hash, expiry, and attempts
- Uses PostgreSQL `otps` table (auto-created if missing)
- Supports both phone and email OTPs

---

## 📝 FILES UPDATED

### 1. `backend/env.example`
**Changes**:
- Added `META_WA_TOKEN`, `META_WA_NUMBER_ID`, `META_WA_PHONE_NUMBER`, `META_WA_API_URL`, `META_WA_VERIFY_TOKEN` (empty placeholders)
- Added `FRONTEND_URL=https://thenefol.com`
- Added `OTP_TTL_SECONDS=300`, `OTP_MAX_ATTEMPTS=5`, `OTP_LENGTH=6`, `RATE_LIMIT_OTP_PER_HOUR=5`
- **Note**: Existing values preserved, only missing keys appended

### 2. `backend/src/config/whatsapp.ts`
**Changes**:
- Updated `getAccessToken()` to support `META_WA_TOKEN` (with fallback to `WHATSAPP_TOKEN`, `WHATSAPP_ACCESS_TOKEN`)
- Updated `getWhatsAppApiUrl()` to support `META_WA_API_URL`
- Added `getPhoneNumberIdFromEnv()` to support `META_WA_NUMBER_ID`

### 3. `backend/src/services/whatsappService.ts`
**Changes**:
- Added import for `whatsappTemplateHelper`
- **New Methods** (all 11 template functions):
  - `sendOTPWhatsApp(phone, otp, name)`: Uses `nefol_otp_auth` template
  - `sendResetPasswordWhatsApp(phone, code, name)`: Uses `nefol_reset_password` template
  - `sendSignupWhatsApp(user)`: Uses `nefol_signup_success` template
  - `sendLoginAlertWhatsApp(user, deviceInfo)`: Uses `nefol_login_alert` template
  - `sendCartRecoveryWhatsApp(user, cartUrl)`: Uses `nefol_cart_recover` template
  - `sendOrderShippedWhatsApp(user, orderId, tracking)`: Uses `nefol_order_shipped` template
  - `sendOrderDeliveredWhatsApp(user, orderId)`: Uses `nefol_order_delivered` template
  - `sendRefundWhatsApp(user, orderId, amount)`: Uses `nefol_refund_1` template
  - `sendCODVerifyWhatsApp(user, orderId)`: Uses `nefol_cod_verify` template
  - `sendGreetingWhatsApp(user)`: Uses `nefol_greet_1` template
  - `sendWelcomeWhatsApp(user)`: Uses `nefol_welcome_1` template
- All methods return `{ok, providerId?, fallbackUsed?, error?}` structure
- All methods fallback to plain text if template error (code 132018) or template not approved

### 4. `backend/src/routes/otp.ts`
**Changes**:
- Updated `sendOTP()` to use new `otpService.generateAndSendOtp()`
- Updated `verifyOTP()` to use new `otpService.verifyOtp()`
- Now supports both phone and email OTPs
- Uses WhatsApp template `nefol_otp_auth` (primary), email fallback
- Routes: `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` (also `/api/otp/send`, `/api/otp/verify` for backward compatibility)

### 5. `backend/src/routes/auth.ts`
**Changes**:
- Updated `forgotPassword()` to support both phone and email:
  - **Phone**: Generates 6-digit OTP, sends via `nefol_reset_password` template
  - **Email**: Generates secure token, sends reset link via email
- Updated `resetPassword()` to handle both OTP (phone) and token (email) flows
- Updated bcrypt saltRounds from 10 to 12 (as per requirements)
- Route: `POST /api/auth/request-reset` (also `/api/auth/forgot-password` for backward compatibility)

### 6. `backend/src/routes/cart.ts`
**Changes**:
- Added `WhatsAppService` import
- **Signup hook**: After user registration, calls `sendSignupWhatsApp()` and `sendWelcomeWhatsApp()`
- **Login hook**: After successful login, calls `sendLoginAlertWhatsApp()` with device info

### 7. `backend/src/index.ts`
**Changes**:
- Added `express-rate-limit` import
- Added rate limiting middleware for OTP and password reset endpoints:
  - `otpRateLimit`: Max 5 requests per hour per IP (configurable via `RATE_LIMIT_OTP_PER_HOUR`)
- **Order status update hook**: When order status changes to `shipped`/`out_for_delivery`/`delivered`, sends WhatsApp notifications:
  - `shipped`/`out_for_delivery` → `sendOrderShippedWhatsApp()`
  - `delivered` → `sendOrderDeliveredWhatsApp()`
- Updated route registrations for OTP and password reset with rate limiting

### 8. `backend/src/utils/whatsappUtils.ts`
**Changes**:
- Updated `processIncomingMessage()` to handle COD confirmation:
  - Detects "YES"/"NO" replies
  - Finds pending COD order for the phone number
  - Updates order status: `YES` → `confirmed`, `NO` → `cancelled`
  - Sends confirmation/cancellation message back to user

### 9. `backend/src/cron/cartAbandonment.ts`
**Changes**:
- Updated cron schedule from every hour to every 10 minutes (as per requirements)
- Added `WhatsAppService` import
- Updated to send WhatsApp cart recovery (primary) using `nefol_cart_recover` template
- Email remains as fallback
- Now checks both phone and email for abandoned carts

### 10. `backend/src/routes/cancellations.ts`
**Changes**:
- Added `WhatsAppService` import
- **Refund notification**: When refund is processed (Razorpay or COD), sends `sendRefundWhatsApp()` using `nefol_refund_1` template

### 11. `backend/package.json`
**Changes**:
- Added `express-rate-limit` dependency

---

## 🔄 HOW IT WORKS

### OTP Flow
1. **Generate**: `POST /api/auth/send-otp` with `{phone}` or `{email}`
   - Generates 6-digit OTP (configurable via `OTP_LENGTH`)
   - Hashes OTP with SHA256
   - Stores in `otps` table with expiry (default 300 seconds)
   - Sends via WhatsApp template `nefol_otp_auth` (primary) or email (fallback)
2. **Verify**: `POST /api/auth/verify-otp` with `{phone/email, otp}`
   - Hashes provided OTP
   - Compares with stored hash (constant-time comparison)
   - Checks expiry and attempts (max 5 attempts)
   - Marks OTP as used on success
   - Returns `userId` if user exists

### Password Reset Flow
1. **Request Reset**: `POST /api/auth/request-reset` with `{phone}` or `{email}`
   - **Phone**: Generates 6-digit OTP, sends via `nefol_reset_password` template
   - **Email**: Generates 32-byte token, hashes with SHA256, stores in `users.reset_password_token`, sends reset link
   - Always returns success (prevents enumeration)
2. **Reset Password**: `POST /api/auth/reset-password` with `{email, token, newPassword}` or `{phone, otp, newPassword}`
   - Validates token/OTP and expiry
   - Hashes new password with bcrypt (saltRounds=12)
   - Updates password and clears reset fields

### Order Event Flow
1. **Order Shipped**: When admin updates order status to `shipped` or `out_for_delivery`
   - Calls `sendOrderShippedWhatsApp()` with `nefol_order_shipped` template
   - Includes tracking URL if available
2. **Order Delivered**: When order status changes to `delivered`
   - Calls `sendOrderDeliveredWhatsApp()` with `nefol_order_delivered` template
3. **Refund Processed**: When cancellation is approved and refund initiated
   - Calls `sendRefundWhatsApp()` with `nefol_refund_1` template
   - Includes order ID and refund amount

### COD Verification Flow
1. **Send COD Verification**: When COD order is created, system can call `sendCODVerifyWhatsApp()`
2. **User Reply**: User replies "YES" or "NO" via WhatsApp
3. **Webhook Processing**: `processIncomingMessage()` detects reply, updates order status accordingly

### Cart Abandonment Flow
1. **Cron Job**: Runs every 10 minutes
2. **Check**: Finds carts older than 1 hour where user hasn't placed order
3. **Send**: Sends `nefol_cart_recover` template via WhatsApp (primary) or email (fallback)
4. **Prevent Duplicates**: Max 1 reminder per 24 hours per user

---

## 🧪 EXAMPLE cURL COMMANDS

### 1. Send OTP
```bash
curl -X POST https://thenefol.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "919876543210"
  }'
```

### 2. Verify OTP
```bash
curl -X POST https://thenefol.com/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "919876543210",
    "otp": "123456"
  }'
```

### 3. Request Password Reset (Phone)
```bash
curl -X POST https://thenefol.com/api/auth/request-reset \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "919876543210"
  }'
```

### 4. Request Password Reset (Email)
```bash
curl -X POST https://thenefol.com/api/auth/request-reset \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com"
  }'
```

### 5. Reset Password
```bash
curl -X POST https://thenefol.com/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "raw_token_from_email",
    "newPassword": "NewSecurePass123"
  }'
```

### 6. Send Order Notification (Sample)
```bash
curl -X POST https://thenefol.com/api/notifications/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "phone": "919876543210",
    "name": "Rahul",
    "orderId": "NF12345",
    "total": 899,
    "items": ["Item 1", "Item 2"]
  }'
```

---

## 📦 POSTMAN COLLECTION

See `backend/WHATSAPP_POSTMAN_COLLECTION.json` for complete Postman collection with all endpoints and sample payloads.

---

## 🔒 SECURITY FEATURES

1. **OTP Security**:
   - OTPs stored as SHA256 hashes (never plain text)
   - Max 5 attempts before blocking
   - 5-minute expiry (configurable)
   - Masked logging (only last 2 digits shown)

2. **Password Reset Security**:
   - Tokens: 32-byte random, SHA256 hashed before storage
   - 15-minute expiry
   - One-time use (cleared after successful reset)
   - bcrypt password hashing (saltRounds=12)

3. **Rate Limiting**:
   - OTP endpoints: 5 requests per hour per IP
   - Password reset: 5 requests per hour per IP
   - Configurable via `RATE_LIMIT_OTP_PER_HOUR`

4. **Webhook Security**:
   - Signature verification using `WHATSAPP_APP_SECRET`
   - Challenge token verification for GET requests

---

## ⚠️ NOTES & WARNINGS

1. **Template Names**: All 11 templates must be approved in Meta Business Manager before use
2. **Fallback Behavior**: If template fails (error 132018 or not approved), system automatically falls back to plain text
3. **Phone Number Format**: System accepts various formats but normalizes to E.164 (e.g., `919876543210`)
4. **Database**: OTPs stored in PostgreSQL `otps` table (auto-created if missing)
5. **Backward Compatibility**: All existing routes preserved, new routes added alongside

---

## 🚀 DEPLOYMENT CHECKLIST

1. ✅ Update `.env` with new META_WA_* variables (or use existing WHATSAPP_* variables)
2. ✅ Ensure all 11 templates are approved in Meta Business Manager
3. ✅ Run `npm install` to install `express-rate-limit`
4. ✅ Build: `npm run build`
5. ✅ Restart PM2: `pm2 restart nefol-backend --update-env`
6. ✅ Test webhook verification: `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123`
7. ✅ Test OTP send: `POST /api/auth/send-otp` with phone number

---

## 📊 TEMPLATE VARIABLE MAPPING

| Template Name | Variables (in order) |
|--------------|---------------------|
| `nefol_otp_auth` | [otp, expiryMinutes] |
| `nefol_reset_password` | [resetCode, expiryMinutes] |
| `nefol_signup_success` | [name] |
| `nefol_login_alert` | [name, deviceInfo, timestamp] |
| `nefol_cart_recover` | [name, cartUrl] |
| `nefol_order_shipped` | [name, orderId, trackingUrl] |
| `nefol_order_delivered` | [name, orderId] |
| `nefol_refund_1` | [name, orderId, amount] |
| `nefol_cod_verify` | [name, orderId, amount] |
| `nefol_greet_1` | [name] |
| `nefol_welcome_1` | [name] |

---

**Implementation Date**: 2025-11-28
**Status**: ✅ Complete - All 11 templates integrated, OTP system functional, password reset supports phone/email, order events integrated, COD confirmation working, rate limiting active

