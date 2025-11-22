# WhatsApp OTP Troubleshooting Guide

## Common Issues & Solutions

### 1. ❌ OTP Not Received

#### Check Backend Logs First
Look for these messages in your backend console:

**Success:**
```
✅ OTP sent successfully to: 919876543210
   Message ID: wamid.xxxxx
```

**Error:**
```
❌ WhatsApp API error: {...}
   Phone: 919876543210
   Status: 400/401/403/etc
```

### 2. 🔍 Common Error Codes

#### Error Code 100 - Invalid Parameter
**Problem:** Phone number format is incorrect
**Solution:** 
- Use international format WITHOUT `+` sign
- ✅ Correct: `919876543210` (India)
- ✅ Correct: `1234567890` (US)
- ❌ Wrong: `+919876543210`
- ❌ Wrong: `9876543210` (missing country code)

#### Error Code 190 - Invalid Access Token
**Problem:** Access token expired or invalid
**Solution:**
1. Go to Meta Developer Console
2. Navigate to your app → WhatsApp → API Setup
3. Generate a new access token
4. Update `WHATSAPP_ACCESS_TOKEN` in `.env`
5. Restart backend server

#### Error Code 131047 - Phone Number Not Registered
**Problem:** Recipient phone number doesn't have WhatsApp
**Solution:**
- User must have WhatsApp installed and active
- Phone number must be a valid WhatsApp number

#### Error Code 131026 - Message Template Required
**Problem:** In production, you need approved templates
**Solution:**
- For development/test: Use test phone numbers
- For production: Create and get templates approved

#### Error Code 80007 - Rate Limit Exceeded
**Problem:** Too many messages sent too quickly
**Solution:**
- Wait a few minutes before retrying
- Check your WhatsApp Business API tier limits

#### Error Subcode 2494012 - Phone Not in Test List
**Problem:** Phone number not added to test numbers
**Solution:**
1. Go to Meta Developer Console
2. Navigate to your app → WhatsApp → API Setup
3. Scroll to "To" section
4. Click "Manage phone number list"
5. Add your test phone number
6. Wait a few minutes for it to activate

### 3. 🧪 Testing Steps

#### Step 1: Test Direct API Call
```bash
cd backend
node test-whatsapp-otp.js 919876543210
```

This will show you the exact error from WhatsApp API.

#### Step 2: Check Environment Variables
```bash
cd backend
node verify-whatsapp-config.js
```

#### Step 3: Check Backend Server Logs
When you try to send OTP from frontend, watch your backend console for:
- Request received
- Phone number normalization
- WhatsApp API response
- Any errors

### 4. 📋 Checklist

- [ ] Environment variables set in `backend/.env`
- [ ] Backend server restarted after setting env vars
- [ ] Phone number in international format (no `+`)
- [ ] Phone number added to test list (for development)
- [ ] Access token is valid and not expired
- [ ] Phone number has WhatsApp installed
- [ ] Not exceeding rate limits
- [ ] Backend server is running and accessible

### 5. 🔧 Quick Fixes

#### Fix 1: Add Phone to Test List
1. Go to https://developers.facebook.com/
2. Select your app
3. Go to WhatsApp → API Setup
4. Find "To" section
5. Click "Manage phone number list"
6. Add your phone number
7. Wait 2-3 minutes

#### Fix 2: Regenerate Access Token
1. Go to Meta Developer Console
2. Your app → WhatsApp → API Setup
3. Click "Generate" next to Access Token
4. Copy the token
5. Update `.env` file
6. Restart backend

#### Fix 3: Check Phone Format
Make sure phone number is:
- International format
- No spaces, dashes, or `+` sign
- Example: `919876543210` (not `+91 98765 43210`)

### 6. 🐛 Debug Mode

Enable detailed logging by checking backend console when:
1. User clicks "Send OTP"
2. Backend receives the request
3. WhatsApp API is called
4. Response is received

Look for these log messages:
```
🔍 User registration attempt: {...}
✅ OTP sent successfully to: ...
❌ WhatsApp API error: {...}
```

### 7. 📞 Test with Your Own Number

1. Add your phone number to test list
2. Use format: `919876543210` (no `+`)
3. Make sure WhatsApp is installed on that number
4. Try sending OTP
5. Check WhatsApp for the message

### 8. ⚠️ Important Notes

1. **Development Mode:** 
   - Only test numbers work
   - Must add numbers to test list
   - No template approval needed

2. **Production Mode:**
   - Any number works
   - Need approved message templates
   - Higher rate limits

3. **Phone Number Format:**
   - Always use international format
   - Remove all spaces, dashes, parentheses
   - Remove `+` sign
   - Example: `919876543210`

### 9. 🆘 Still Not Working?

1. **Check Backend Logs:**
   ```bash
   # Look for error messages in backend console
   # They will show the exact WhatsApp API error
   ```

2. **Test Direct API:**
   ```bash
   cd backend
   node test-whatsapp-otp.js YOUR_PHONE_NUMBER
   ```

3. **Verify Credentials:**
   ```bash
   cd backend
   node verify-whatsapp-config.js
   ```

4. **Check Meta Developer Console:**
   - Verify app is active
   - Check WhatsApp product is enabled
   - Verify phone number ID is correct
   - Check access token permissions

### 10. 📝 Example Error Response

If you see this in backend logs:
```json
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2494012
  }
}
```

This means: Phone number not in test list (error_subcode 2494012)

**Solution:** Add phone number to test list in Meta Developer Console.

---

## Quick Test Command

```bash
# Test OTP sending directly
cd backend
node test-whatsapp-otp.js 919876543210
```

Replace `919876543210` with your actual phone number (international format, no `+`).

