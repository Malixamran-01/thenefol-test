# Email Marketing Setup Guide

This guide will help you set up email marketing with Gmail, GoDaddy, and Hostinger SMTP providers.

## Overview

The email marketing system supports:
- **Gmail** - Using Gmail SMTP with App Passwords
- **Hostinger** - Using Hostinger email accounts
- **GoDaddy** - Using GoDaddy email accounts
- **Custom SMTP** - Any other SMTP server

## Features

✅ Campaign Management - Create, schedule, and send email campaigns
✅ Email Templates - Create and reuse email templates
✅ Email Lists - Manage subscriber lists
✅ Bulk Sending - Send emails to multiple recipients with rate limiting
✅ Sending Logs - Track email delivery, opens, and clicks
✅ Provider Support - Gmail, GoDaddy, Hostinger, and custom SMTP

## Step 1: Configure Email Provider

### Option A: Gmail Setup

1. **Enable 2-Step Verification**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification if not already enabled

2. **Generate App Password**
   - Go to [App Passwords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and your device
   - Copy the generated 16-character password

3. **Configure in Admin Panel**
   - Go to **System Settings > Alert Settings**
   - Select **Gmail** as provider
   - Enter your Gmail address in "SMTP Username/Email"
   - Enter the App Password in "SMTP Password/App Password"
   - Enter your email in "From Email Address"
   - Click **Save Settings**

### Option B: Hostinger Setup

1. **Get Your Email Credentials**
   - Log in to your Hostinger control panel
   - Go to **Email** section
   - Note your email address and password

2. **Configure in Admin Panel**
   - Go to **System Settings > Alert Settings**
   - Select **Hostinger** as provider
   - SMTP Host: `smtp.hostinger.com` (auto-filled)
   - SMTP Port: `587` (auto-filled)
   - Enter your full email address in "SMTP Username/Email"
   - Enter your email password in "SMTP Password/App Password"
   - Enter your email in "From Email Address"
   - Click **Save Settings**

### Option C: GoDaddy Setup

1. **Get Your Email Credentials**
   - Log in to your GoDaddy account
   - Go to **Email & Office Dashboard**
   - Note your email address and password

2. **Configure in Admin Panel**
   - Go to **System Settings > Alert Settings**
   - Select **GoDaddy** as provider
   - SMTP Host: `smtpout.secureserver.net` (auto-filled)
   - SMTP Port: `587` (auto-filled)
   - Enter your full email address in "SMTP Username/Email"
   - Enter your email password in "SMTP Password/App Password"
   - Enter your email in "From Email Address"
   - Click **Save Settings**

### Option D: Custom SMTP Setup

1. **Get Your SMTP Details**
   - Contact your email provider for SMTP settings
   - Common ports: 587 (TLS) or 465 (SSL)

2. **Configure in Admin Panel**
   - Go to **System Settings > Alert Settings**
   - Select **Custom SMTP** as provider
   - Enter your SMTP hostname
   - Enter your SMTP port (587 or 465)
   - Enter your SMTP username
   - Enter your SMTP password
   - Enter your from email address
   - Click **Save Settings**

## Step 2: Test Email Configuration

1. In **Alert Settings**, scroll to the **Test Email** section
2. Enter a recipient email address
3. Enter a test subject and message
4. Click **Send Test Email**
5. Check the recipient's inbox to confirm delivery

## Step 3: Create Email Campaigns

### Via API

```javascript
// Create a campaign
POST /api/email-marketing/campaigns
{
  "name": "Summer Sale 2024",
  "subject": "50% Off All Products!",
  "content": "<h1>Summer Sale</h1><p>Get 50% off on all products!</p>",
  "audience": "all",
  "type": "promotional",
  "scheduled_date": "2024-06-01T10:00:00Z"
}

// Send campaign
POST /api/email-marketing/campaigns/send
{
  "campaign_id": 1,
  "recipient_emails": ["user1@example.com", "user2@example.com"]
  // OR
  "recipient_list_id": 1
}
```

### Via Admin Panel

1. Go to **Marketing > Email Marketing**
2. Click **Create Campaign**
3. Fill in campaign details:
   - Campaign Name
   - Email Subject
   - Email Content (HTML supported)
   - Campaign Type (Promotional, Newsletter, etc.)
   - Target Audience
4. Click **Create Campaign**
5. To send, click **Send Campaign** and select recipients

## Step 4: Manage Email Lists

### Create Email List

```javascript
POST /api/email-marketing/lists
{
  "name": "Newsletter Subscribers",
  "description": "Monthly newsletter subscribers"
}
```

### Add Subscribers

```javascript
POST /api/email-marketing/lists/subscribers
{
  "list_id": 1,
  "subscribers": [
    { "email": "user1@example.com", "name": "User One" },
    { "email": "user2@example.com", "name": "User Two" }
  ]
}
```

## Step 5: Create Email Templates

```javascript
POST /api/email-marketing/templates
{
  "name": "Welcome Email",
  "subject": "Welcome to Our Store!",
  "content": "<h1>Welcome!</h1><p>Thanks for joining us.</p>",
  "category": "welcome"
}
```

## API Endpoints

### Campaigns
- `GET /api/email-marketing/campaigns` - List all campaigns
- `POST /api/email-marketing/campaigns` - Create campaign
- `PUT /api/email-marketing/campaigns/:id` - Update campaign
- `DELETE /api/email-marketing/campaigns/:id` - Delete campaign
- `POST /api/email-marketing/campaigns/send` - Send campaign

### Templates
- `GET /api/email-marketing/templates` - List templates
- `POST /api/email-marketing/templates` - Create template
- `PUT /api/email-marketing/templates/:id` - Update template
- `DELETE /api/email-marketing/templates/:id` - Delete template

### Lists
- `GET /api/email-marketing/lists` - List all email lists
- `POST /api/email-marketing/lists` - Create list
- `POST /api/email-marketing/lists/subscribers` - Add subscribers

### Logs
- `GET /api/email-marketing/logs` - Get sending logs
- `GET /api/email-marketing/logs?campaign_id=1` - Get logs for specific campaign

## Rate Limiting

The system automatically implements rate limiting:
- Emails are sent in batches of 10
- 1 second delay between batches
- Prevents SMTP server overload
- Ensures reliable delivery

## Troubleshooting

### Gmail Issues

**Error: "Invalid login credentials"**
- Make sure you're using an App Password, not your regular password
- Verify 2-Step Verification is enabled

**Error: "Less secure app access"**
- Gmail no longer supports "less secure apps"
- You MUST use App Passwords

### Hostinger Issues

**Error: "Connection timeout"**
- Verify SMTP host: `smtp.hostinger.com`
- Check port: `587`
- Ensure your email account is active

### GoDaddy Issues

**Error: "Authentication failed"**
- Verify you're using the full email address as username
- Check that your email account is active
- Try port `465` with SSL if port `587` doesn't work

### General Issues

**Emails not sending**
1. Test your SMTP configuration in Alert Settings
2. Check sending logs: `/api/email-marketing/logs`
3. Verify recipient email addresses are valid
4. Check spam folder

**Emails going to spam**
- Use a proper "From" email address
- Include unsubscribe links
- Avoid spam trigger words
- Use proper HTML formatting

## Database Schema

The system uses the following tables:
- `email_campaigns` - Campaign data
- `email_templates` - Template storage
- `email_lists` - Subscriber lists
- `email_subscribers` - Individual subscribers
- `email_sending_logs` - Delivery tracking
- `notification_config` - SMTP configuration

## Security Notes

1. **Never commit SMTP passwords to version control**
2. **Use environment variables for sensitive data**
3. **Regularly rotate App Passwords**
4. **Monitor sending logs for suspicious activity**
5. **Implement unsubscribe functionality**

## Next Steps

1. ✅ Configure your email provider
2. ✅ Test email sending
3. ✅ Create your first campaign
4. ✅ Build your subscriber list
5. ✅ Create email templates
6. ✅ Start sending campaigns!

For more help, check the Admin Panel > Email Marketing section.

