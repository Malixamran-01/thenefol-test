# WhatsApp OTP Setup for Your Number

## 📱 Your Phone Number

**Number:** `7355384939`  
**Country:** India (+91)  
**Formatted for WhatsApp API:** `917355384939`

## ✅ Test Results

See the test output above to verify if the OTP was sent successfully.

## 🔧 Setup Steps

### Step 1: Add to Meta Test List (IMPORTANT for Development)

If you're in **development mode**, you MUST add your number to the test list:

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Select your WhatsApp app
3. Navigate to **WhatsApp** → **API Setup**
4. Scroll down to the **"To"** section
5. Click **"Manage phone number list"** or **"Add phone number"**
6. Add your number in this format: `917355384939` (no `+`, no spaces)
7. Wait 2-3 minutes for activation

### Step 2: Verify Number Format

Your number should be formatted as:
- ✅ **Correct:** `917355384939` (country code + number, no `+`)
- ❌ **Wrong:** `+917355384939` (has `+`)
- ❌ **Wrong:** `7355384939` (missing country code)

### Step 3: Test OTP Sending

Run this command to test:
```bash
cd backend
node test-whatsapp-otp.js 917355384939
```

### Step 4: Test from Frontend

1. Go to your login page
2. Click "WhatsApp Login" toggle
3. Enter your phone number: `7355384939`
4. Select country code: `+91` (should be default)
5. Click "Send OTP via WhatsApp"
6. Check your WhatsApp for the OTP

## 🐛 Troubleshooting

### If OTP Not Received:

1. **Check if number is in test list** (for development)
   - Must be added in Meta Developer Console
   - Format: `917355384939`

2. **Check backend logs** when you try to send:
   ```
   📱 Login OTP Request received: { phone: '917355384939' }
   📱 Normalized phone: 917355384939
   ✅ Login OTP sent successfully to: 917355384939
   ```

3. **Check for errors**:
   - Look for `❌ WhatsApp API error` in backend console
   - Check error code and message

4. **Verify WhatsApp is installed**:
   - Phone number must have WhatsApp installed
   - Must be an active WhatsApp account

### Common Errors:

- **Error 131047**: Phone number not registered on WhatsApp
- **Error 2494012**: Phone number not in test list (add it!)
- **Error 100**: Invalid phone number format
- **Error 190**: Access token expired

## 📝 Quick Reference

- **Your Number:** `7355384939`
- **Country Code:** `+91` (India)
- **API Format:** `917355384939`
- **Test Command:** `node test-whatsapp-otp.js 917355384939`

## ✅ Next Steps

1. Add `917355384939` to Meta test list (if in development)
2. Wait 2-3 minutes
3. Test using the command above
4. Try from frontend
5. Check WhatsApp for OTP

---

**Note:** Make sure your phone has WhatsApp installed and is active!

