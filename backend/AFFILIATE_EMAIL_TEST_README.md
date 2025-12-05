# Affiliate Email Automation Test Script

## 📋 Overview

This test script verifies that both affiliate email notifications are working correctly:
1. **Application Submission Email** - Sent when user applies for affiliate program
2. **Approval Email with Verification Code** - Sent when admin approves the application

## 🚀 How to Run

### Prerequisites

1. **Build the project first:**
   ```bash
   cd backend
   npm run build
   ```

2. **Set up environment variables** in `.env` file:
   ```env
   EMAIL_USER=support@thenefol.com
   EMAIL_PASS=your_password_here
   ```

### Run the Test

```bash
cd backend
node test-affiliate-emails.js
```

## 📧 Test Details

### Test Email
- **Email**: `rahulseth3988@gmail.com`
- **Name**: `Rahul Seth`
- **Verification Code**: `AFF1234567890123456` (20 characters)

### What Gets Tested

1. **Application Submission Email**
   - Function: `sendAffiliateApplicationSubmittedEmail()`
   - Subject: "Your Affiliate Application Has Been Received"
   - Content: Confirmation that application was received, next steps, timeline

2. **Approval Email with Verification Code**
   - Function: `sendAffiliateCodeEmail()`
   - Subject: "Your Affiliate Application Has Been Approved - Verification Code"
   - Content: Congratulations, 20-digit verification code, instructions, dashboard link

## ✅ Expected Output

```
🧪 Testing Affiliate Email Automation
======================================================================
📧 Test Email: rahulseth3988@gmail.com
👤 Test Name: Rahul Seth
🔑 Test Verification Code: AFF1234567890123456
======================================================================

📧 Test 1/2: Application Submission Confirmation Email
----------------------------------------------------------------------
✅ PASSED: Application submission email sent successfully!
   → Sent to: rahulseth3988@gmail.com
   → Subject: "Your Affiliate Application Has Been Received"

⏳ Waiting 3 seconds before next test...

📧 Test 2/2: Approval Email with Verification Code
----------------------------------------------------------------------
✅ PASSED: Approval email with verification code sent successfully!
   → Sent to: rahulseth3988@gmail.com
   → Subject: "Your Affiliate Application Has Been Approved - Verification Code"
   → Verification Code: AFF1234567890123456

======================================================================
📊 Test Summary
======================================================================
Total Tests: 2
✅ Passed: 2
❌ Failed: 0

🎉 All affiliate email tests passed!
```

## 🔍 Verification Steps

After running the test:

1. **Check your inbox** at `rahulseth3988@gmail.com`
2. **Look for two emails:**
   - "Your Affiliate Application Has Been Received"
   - "Your Affiliate Application Has Been Approved - Verification Code"
3. **Check spam/junk folder** if emails are not in inbox
4. **Verify email content:**
   - Application email should have confirmation and next steps
   - Approval email should have the 20-digit verification code highlighted

## ❌ Troubleshooting

### Error: "Missing credentials for PLAIN"

**Solution**: Set EMAIL_USER and EMAIL_PASS in `.env` file
```env
EMAIL_USER=support@thenefol.com
EMAIL_PASS=your_actual_password
```

### Error: "Cannot find module './dist/services/emailService'"

**Solution**: Build the project first
```bash
npm run build
```

### Emails Not Received

1. Check spam/junk folder
2. Verify SMTP credentials are correct
3. Check email server logs
4. Ensure Hostinger SMTP is accessible
5. Verify firewall/network settings

### SMTP Connection Issues

- **Host**: `smtp.hostinger.com`
- **Port**: `465`
- **Secure**: `true`
- **Auth**: Required (EMAIL_USER and EMAIL_PASS)

## 📝 Test Script Location

- **File**: `backend/test-affiliate-emails.js`
- **Usage**: `node test-affiliate-emails.js`

## 🎯 Integration Points

The emails are automatically sent at these points:

1. **Application Submission** → `backend/src/routes/affiliate.ts`
   - Function: `submitAffiliateApplication()`
   - Calls: `sendAffiliateApplicationSubmittedEmail()`

2. **Application Approval** → `backend/src/routes/affiliate.ts`
   - Function: `approveAffiliateApplication()`
   - Calls: `sendAffiliateCodeEmail()`

## ✅ Success Criteria

- ✅ Both emails send without errors
- ✅ Emails arrive in inbox (not spam)
- ✅ Email content is properly formatted
- ✅ Verification code is clearly visible in approval email
- ✅ Links and buttons work correctly
- ✅ Branding (logo, colors) displays correctly

---

**Last Updated**: 2025-01-15

