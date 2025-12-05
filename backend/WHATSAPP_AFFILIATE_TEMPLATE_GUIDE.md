# WhatsApp Template for Affiliate Code Automation

## 📋 Template Specification

### Template Name
**`nefol_affiliate_approved`**

### Category
**`AUTHENTICATION`** ⚠️ **REQUIRED** - This is a verification code template

### Language
**`English (en)`**

---

## 📝 Template Content

### Option 1: Simple Version (Recommended for AUTHENTICATION Category)
```
🎉 Congratulations {{1}}!

Your affiliate application has been approved!

Your Affiliate Verification Code:
*{{2}}*

Please use this code to verify your affiliate account and start earning commissions.

⚠️ For your security, do not share this code with anyone.

Welcome to the Nefol Affiliate Program! 💙

For any queries, contact us at support@thenefol.com
```

**Note**: Added security warning for AUTHENTICATION category compliance

**Variables Required:**
- `{{1}}` = Affiliate Partner Name
- `{{2}}` = 20-digit Verification Code

**Component Structure:**
- **Type**: `BODY`
- **Parameters**: 2 text parameters
  - Parameter 1: Name
  - Parameter 2: Verification Code

---

### Option 2: With Button (Advanced)
```
🎉 Congratulations {{1}}!

Your affiliate application has been approved!

Your Affiliate Verification Code:
*{{2}}*

Please use this code to verify your affiliate account and start earning commissions.

Welcome to the Nefol Affiliate Program! 💙
```

**Variables Required:**
- `{{1}}` = Affiliate Partner Name
- `{{2}}` = 20-digit Verification Code

**Component Structure:**
- **Type**: `BODY`
  - Parameter 1: Name
  - Parameter 2: Verification Code
- **Type**: `BUTTON`
  - **Sub-type**: `URL`
  - **Button Text**: "Access Dashboard"
  - **URL**: `https://thenefol.com/#/user/affiliate`

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
- **Template Name**: `nefol_affiliate_approved`
  - ⚠️ **Important**: Use lowercase with underscores, no spaces
- **Category**: Select **`AUTHENTICATION`** ⚠️ **REQUIRED**
  - ⚠️ **Meta will recommend this category** because you're sending a verification code
  - `AUTHENTICATION` = For verification codes, OTPs, and account verification
  - This category is specifically designed for codes that verify transactions or logins
- **Language**: **`English`** (code: `en`)

### Step 4: Add Message Content

**Header** (Optional):
- Leave empty or add a simple text header like "Affiliate Program"

**Body** (Required):
```
🎉 Congratulations {{1}}!

Your affiliate application has been approved!

Your Affiliate Verification Code:
*{{2}}*

Please use this code to verify your affiliate account and start earning commissions.

Welcome to the Nefol Affiliate Program! 💙

For any queries, contact us at support@thenefol.com
```

**Add Variables:**
1. Click on the text where you want to add a variable
2. Click **"Add Variable"** button
3. For `{{1}}` → Place it after "Congratulations " (for Name)
4. For `{{2}}` → Place it after "*" (for Verification Code)

**Footer** (Optional):
- Add: "Nefol - Natural Beauty Products"

**Buttons** (Optional):
- If using Option 2, add a URL button:
  - **Button Text**: "Access Dashboard"
  - **URL**: `https://thenefol.com/#/user/affiliate`

### Step 5: Submit for Approval
1. Review your template
2. Click **"Submit"**
3. Wait for approval (usually 1-24 hours)

---

## 📊 Template Structure (JSON Format)

```json
{
  "name": "nefol_affiliate_approved",
  "category": "AUTHENTICATION",
  "language": "en",
  "components": [
    {
      "type": "BODY",
      "text": "🎉 Congratulations {{1}}!\n\nYour affiliate application has been approved!\n\nYour Affiliate Verification Code:\n*{{2}}*\n\nPlease use this code to verify your affiliate account and start earning commissions.\n\nWelcome to the Nefol Affiliate Program! 💙\n\nFor any queries, contact us at support@thenefol.com",
      "parameters": [
        {
          "type": "text",
          "text": "{{1}}"
        },
        {
          "type": "text",
          "text": "{{2}}"
        }
      ]
    }
  ]
}
```

---

## 🔧 Code Integration

Once the template is approved, update the code:

**File**: `backend/src/services/whatsappService.ts`

```typescript
/**
 * Send affiliate verification code via WhatsApp using nefol_affiliate_approved template
 * Template: nefol_affiliate_approved
 * Variables: [name, verificationCode] - Requires 2 parameters: {{1}} = Name, {{2}} = Verification Code
 * 
 * @param {string} phone - Recipient phone number
 * @param {string} name - Affiliate partner name
 * @param {string} verificationCode - 20-digit affiliate verification code
 * @returns {Promise<{ok: boolean, providerId?: string, error?: any}>}
 */
async sendAffiliateCodeWhatsApp(phone: string, name: string, verificationCode: string): Promise<{ ok: boolean; providerId?: string; error?: any }> {
  try {
    if (!phone) {
      return { ok: false, error: { message: 'Phone number not provided' } }
    }

    // Template expects 2 parameters: name and verification code
    const variables: TemplateVariable[] = [
      { type: 'text', text: name },
      { type: 'text', text: verificationCode }
    ]
    
    const result = await sendWhatsAppTemplate(phone, 'nefol_affiliate_approved', variables, 'en')
    
    if (result.ok) {
      console.log(`✅ Affiliate code WhatsApp sent to: ${phone}`)
      return { ok: true, providerId: result.providerId }
    }
    
    // Fallback to plain text if template fails
    console.warn('⚠️ Template failed, falling back to plain text')
    const fallbackResult = await this.sendText(phone, `🎉 Congratulations ${name}!\n\nYour affiliate application has been approved!\n\nYour Affiliate Verification Code:\n*${verificationCode}*\n\nPlease use this code to verify your affiliate account.`)
    return {
      ok: fallbackResult.success,
      providerId: fallbackResult.data?.messages?.[0]?.id,
      fallbackUsed: true
    }
  } catch (error: any) {
    console.error('❌ Error in sendAffiliateCodeWhatsApp:', error)
    return { ok: false, error: { message: error.message } }
  }
}
```

---

## ⚠️ Important Notes for AUTHENTICATION Category

1. **Stricter Approval**: Authentication templates require more detailed review
2. **No Fallback**: Authentication templates should NOT fall back to plain text (unlike other categories)
3. **Language Restriction**: Must use `en` (English) language code
4. **Code Focus**: The template must clearly indicate it's a verification code
5. **Security Message**: Should include a security warning about not sharing the code

## ✅ Benefits of Using Template

1. **24-Hour Window Bypass**: Templates can be sent anytime, not just within 24 hours
2. **Professional Appearance**: Consistent formatting and branding
3. **Better Delivery Rates**: Higher delivery success compared to plain text
4. **Compliance**: Follows WhatsApp Business API best practices
5. **Analytics**: Better tracking and analytics in Meta Business Manager
6. **Security**: Authentication category ensures proper handling of verification codes

---

## 📋 Template Approval Checklist

Before submitting, ensure:
- ✅ Template name follows naming convention (lowercase, underscores)
- ✅ **Category is set to AUTHENTICATION** (Meta will recommend this)
- ✅ All variables are properly placed (2 variables: Name and Code)
- ✅ No spelling or grammar errors
- ✅ Content complies with WhatsApp policies
- ✅ **Security message included** (about not sharing the code)
- ✅ **Code is clearly highlighted** (using *bold* or similar formatting)
- ✅ Contact information is accurate
- ✅ Language is set to English (en)

---

## 🚨 Common Issues & Solutions

### Issue 1: Template Rejected - Wrong Category
**Reason**: Meta recommends AUTHENTICATION but you selected UTILITY
**Solution**: **Select AUTHENTICATION category** - This is required for verification codes

### Issue 2: Template Rejected - Content Issues
**Reason**: Content doesn't comply with WhatsApp policies for AUTHENTICATION category
**Solution**: 
- Ensure the code is clearly a verification code
- Add security message about not sharing
- Remove excessive promotional language
- Focus on the verification aspect

### Issue 3: Variable Mismatch
**Reason**: Number of parameters doesn't match
**Solution**: Ensure exactly 2 parameters: Name ({{1}}) and Verification Code ({{2}})

### Issue 4: Template Not Found
**Reason**: Template name mismatch or not approved
**Solution**: Double-check template name in Meta Business Manager matches `nefol_affiliate_approved`

---

## 📞 Support

If you encounter issues:
1. Check template status in Meta Business Manager
2. Review WhatsApp Business API documentation
3. Contact Meta Support if template is stuck in review

---

## 🎯 Next Steps

1. ✅ Create template in Meta Business Manager
2. ✅ Wait for approval (1-24 hours)
3. ✅ Update code to use template (code provided above)
4. ✅ Test with a real phone number
5. ✅ Monitor delivery rates

---

**Last Updated**: 2025-01-15
**Template Version**: 1.0

