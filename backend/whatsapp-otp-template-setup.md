# WhatsApp OTP Template Setup Guide

## 🔍 Problem Identified

Your OTP messages are being sent as **text messages**, but WhatsApp Business API has a **24-hour session window** rule:
- ✅ **Template Messages**: Can be sent anytime (need approval)
- ❌ **Text Messages**: Can only be sent if user messaged you in last 24 hours

Since users haven't messaged you first, the text messages are accepted but not delivered.

## ✅ Solution: Use WhatsApp Message Template

We need to create and use a WhatsApp message template for OTP.

### Step 1: Create OTP Template in Meta

1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp Manager** → **Message Templates**
3. Click **"Create Template"**
4. Fill in:
   - **Name**: `otp_verification` (or `nefol_otp`)
   - **Category**: `AUTHENTICATION` (required for OTP)
   - **Language**: `English`
5. **Template Content**:
   ```
   Your NEFÖL verification code is: {{1}}
   
   This code will expire in 10 minutes.
   
   Do not share this code with anyone.
   ```
6. Add **Variable**: `{{1}}` for the OTP code
7. Submit for approval (usually takes a few hours to 1 day)

### Step 2: Update Code to Use Template

Once approved, we'll update the code to use the template instead of plain text.

### Step 3: Alternative - Quick Test Template

For immediate testing, you can use Meta's default test template if available, or create a simple template.

## 📝 Template Format Example

```json
{
  "messaging_product": "whatsapp",
  "to": "917355384939",
  "type": "template",
  "template": {
    "name": "otp_verification",
    "language": {
      "code": "en_US"
    },
    "components": [
      {
        "type": "body",
        "parameters": [
          {
            "type": "text",
            "text": "123456"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Quick Fix: Use Template for OTP

I'll update the code to support templates. For now, you have two options:

### Option 1: Create Template (Recommended)
1. Create template in Meta Business Manager
2. Wait for approval
3. Update code to use template name

### Option 2: Test with Session Message
1. Send a message TO your WhatsApp Business number first
2. Then try OTP (will work for 24 hours)

## ⚠️ Important Notes

- **Template Approval**: Takes 1-24 hours typically
- **Template Name**: Must match exactly what's in Meta
- **Category**: Must be `AUTHENTICATION` for OTP codes
- **Variables**: OTP code goes in `{{1}}` variable

---

**Next Step**: I'll update the code to support both template and text messages, with template as preferred method.

