# WhatsApp Template for Affiliate Code Automation

## 📋 Template Specification

### Template Name
**`nefol_affiliate`**

### Category
**`AUTHENTICATION`** ⚠️ **REQUIRED** - This is a verification code template

### Language
**`English (US)`** - `en_US` or `en`

---

## 📝 Template Content

### Template Body
```
This OTP code is for {{1}} your {{2}} account and linking it to {{3}}.

OTP: {{4}}

Do not share it with anyone, even to {{5}}, or they'll be able to access your account.
```

**Variables Required:**
- `{{1}}` (text): "creating" - Action description
- `{{2}}` (text): "NEFOL" - Brand name
- `{{3}}` (text): "affiliate" - Account/service name
- `{{4}}` (number): OTP code (20-digit)
- `{{5}}` (text): "NEFOL" - Brand name (for security warning)

**Example Output:**
```
This OTP code is for creating your NEFOL account and linking it to affiliate.

OTP: 12345678901234567890

Do not share it with anyone, even to NEFOL, or they'll be able to access your account.
```

**Component Structure:**
- **Type**: `BODY`
- **Parameters**: 5 parameters
  - Parameter 1 (text): "creating"
  - Parameter 2 (text): "NEFOL"
  - Parameter 3 (text): "affiliate"
  - Parameter 4 (number): OTP code (sent as text in API)
  - Parameter 5 (text): "NEFOL"

---

## 🚀 Step-by-Step Creation Guide

### Step 1: Access Meta Business Manager
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Select your WhatsApp Business Account
3. Navigate to **WhatsApp Manager** → **Message Templates**

### Step 2: Create New Template
1. Click **"Create Template"** button
2. Select **"Start from scratch"**

### Step 3: Fill Template Details

**Basic Information:**
- **Template Name**: `nefol_affiliate`
  - ⚠️ **Important**: Use lowercase with underscores, no spaces
- **Category**: Select **`AUTHENTICATION`** ⚠️ **REQUIRED**
  - ⚠️ **Meta will recommend this category** because you're sending a verification code
  - `AUTHENTICATION` = For verification codes, OTPs, and account verification
  - This category is specifically designed for codes that verify transactions or logins
- **Language**: **`English (US)`** (code: `en_US` or `en`)

### Step 4: Add Message Content

**Header** (Optional):
- Leave empty

**Body** (Required):
```
This OTP code is for {{1}} your {{2}} account and linking it to {{3}}.

OTP: {{4}}

Do not share it with anyone, even to {{5}}, or they'll be able to access your account.
```

**Add Variables:**
1. Click on the text where you want to add a variable
2. Click **"Add Variable"** button
3. For `{{1}}` → Place it after "for " (for "creating")
4. For `{{2}}` → Place it after "your " (for "NEFOL")
5. For `{{3}}` → Place it after "linking it to " (for "affiliate")
6. For `{{4}}` → Place it after "OTP: " (for OTP code) - **Set as NUMBER type**
7. For `{{5}}` → Place it after "even to " (for "NEFOL")

**Variable Types in Meta Business Manager:**
- `{{1}}`, `{{2}}`, `{{3}}`, `{{5}}`: TEXT type
- `{{4}}`: NUMBER type (for the OTP code)

**Footer** (Optional):
- Add: "NEFOL - Natural Beauty Products"

**Buttons** (Optional):
- Not required for AUTHENTICATION category templates

### Step 5: Submit for Approval
1. Review your template
2. Click **"Submit"**
3. Wait for approval (usually 1-24 hours for AUTHENTICATION templates)

---

## 📊 Template Structure (JSON Format)

```json
{
  "name": "nefol_affiliate",
  "category": "AUTHENTICATION",
  "language": {
    "code": "en_US"
  },
  "components": [
    {
      "type": "BODY",
      "text": "This OTP code is for {{1}} your {{2}} account and linking it to {{3}}.\n\nOTP: {{4}}\n\nDo not share it with anyone, even to {{5}}, or they'll be able to access your account.",
      "parameters": [
        {
          "type": "text",
          "text": "{{1}}"
        },
        {
          "type": "text",
          "text": "{{2}}"
        },
        {
          "type": "text",
          "text": "{{3}}"
        },
        {
          "type": "text",
          "text": "{{4}}"
        },
        {
          "type": "text",
          "text": "{{5}}"
        }
      ]
    }
  ]
}
```

**Note**: In the API request, all parameters are sent as `text` type, but parameter `{{4}}` is defined as `number` type in the template itself, which WhatsApp will format appropriately.

---

## 🔧 Code Integration

The code is already integrated in `backend/src/services/whatsappService.ts`:

```typescript
/**
 * Send affiliate verification code via WhatsApp using nefol_affiliate template
 * Template: nefol_affiliate
 * Variables: [creating, NEFOL, affiliate, verificationCode, NEFOL]
 * 
 * @param {string} phone - Recipient phone number
 * @param {string} name - Affiliate partner name (kept for backward compatibility)
 * @param {string} verificationCode - 20-digit affiliate verification code
 * @returns {Promise<{ok: boolean, providerId?: string, fallbackUsed?: boolean, error?: any}>}
 */
async sendAffiliateCodeWhatsApp(phone: string, name: string, verificationCode: string): Promise<{ ok: boolean; providerId?: string; fallbackUsed?: boolean; error?: any }> {
  // Template variables:
  const variables: TemplateVariable[] = [
    { type: 'text', text: 'creating' },        // {{1}} - "creating"
    { type: 'text', text: 'NEFOL' },          // {{2}} - "NEFOL"
    { type: 'text', text: 'affiliate' },      // {{3}} - "affiliate"
    { type: 'text', text: verificationCode },  // {{4}} - OTP code
    { type: 'text', text: 'NEFOL' }           // {{5}} - "NEFOL"
  ]
  
  const result = await sendWhatsAppTemplate(phone, 'nefol_affiliate', variables, 'en')
  // ...
}
```

---

## ⚠️ Important Notes for AUTHENTICATION Category

1. **Stricter Approval**: Authentication templates require more detailed review
2. **No Fallback**: Authentication templates should NOT fall back to plain text (unlike other categories) - but code includes fallback for development
3. **Language Restriction**: Must use `en` or `en_US` (English) language code
4. **Code Focus**: The template must clearly indicate it's a verification code
5. **Security Message**: Must include a security warning about not sharing the code (included in template)
6. **Number Type**: The OTP code parameter `{{4}}` should be defined as NUMBER type in Meta Business Manager for proper formatting

## ✅ Benefits of Using Template

1. **24-Hour Window Bypass**: Templates can be sent anytime, not just within 24 hours
2. **Professional Appearance**: Consistent formatting and branding
3. **Better Delivery Rates**: Higher delivery success compared to plain text
4. **Compliance**: Follows WhatsApp Business API best practices
5. **Analytics**: Better tracking and analytics in Meta Business Manager
6. **Security**: AUTHENTICATION category provides better security messaging

## 📝 Template Example in Meta Business Manager UI

**Template Name**: `nefol_affiliate`  
**Category**: `AUTHENTICATION`  
**Language**: `English (US)`

**Body Text**:
```
This OTP code is for creating your NEFOL account and linking it to NEFOL.

OTP: 123456

Do not share it with anyone, even to NEFOL, or they'll be able to access your account.
```

With variables replaced in Meta UI, it shows:
- `{{1}}` = "creating"
- `{{2}}` = "NEFOL"
- `{{3}}` = "affiliate"
- `{{4}}` = 123456 (as NUMBER type)
- `{{5}}` = "NEFOL"
