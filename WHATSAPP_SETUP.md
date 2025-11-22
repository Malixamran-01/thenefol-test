# WhatsApp Login & Signup Setup Guide

This guide will help you set up WhatsApp authentication for both login and signup functionality in your application.

## Overview

The application supports WhatsApp OTP (One-Time Password) authentication for:
- **Signup**: Users can create accounts using WhatsApp OTP verification
- **Login**: Existing users can log in using WhatsApp OTP verification

## Prerequisites

1. A Facebook Business Account
2. A Meta (Facebook) Developer Account
3. A WhatsApp Business Account (or test number)

## Step-by-Step Setup

### 1. Create a Meta App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Click **"My Apps"** → **"Create App"**
3. Select **"Business"** as the app type
4. Fill in your app details and create the app

### 2. Add WhatsApp Product

1. In your app dashboard, go to **"Add Products"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Follow the setup wizard

### 3. Get Your Credentials

1. In your app dashboard, go to **WhatsApp** → **API Setup**
2. You'll need:
   - **Phone Number ID**: Found in the API Setup page
   - **Access Token**: Click "Generate" to create a temporary token, or set up a System User for a permanent token

### 4. Configure Environment Variables

Add the following environment variables to your `.env` file in the `backend` directory:

```env
# WhatsApp Business API Configuration
WHATSAPP_ACCESS_TOKEN=your_access_token_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
```

### 5. Phone Number Format

The WhatsApp API requires phone numbers in international format without the `+` sign:
- ✅ Correct: `919876543210` (India: +91 9876543210)
- ❌ Incorrect: `+919876543210` or `9876543210`

The application automatically normalizes phone numbers, but ensure your WhatsApp Business number is verified.

### 6. Test Your Setup

1. Start your backend server
2. Try the WhatsApp login/signup flow in the frontend
3. Check the backend logs for any errors

## API Endpoints

### Signup Flow

1. **Send OTP for Signup**
   ```
   POST /api/auth/send-otp
   Body: { "phone": "919876543210" }
   ```

2. **Verify OTP and Create Account**
   ```
   POST /api/auth/verify-otp-signup
   Body: {
     "phone": "919876543210",
     "otp": "123456",
     "name": "John Doe",
     "email": "john@example.com" (optional),
     "address": {} (optional)
   }
   ```

### Login Flow

1. **Send OTP for Login**
   ```
   POST /api/auth/send-otp-login
   Body: { "phone": "919876543210" }
   ```

2. **Verify OTP and Login**
   ```
   POST /api/auth/verify-otp-login
   Body: {
     "phone": "919876543210",
     "otp": "123456"
   }
   ```

## Frontend Usage

### Login Page

Users can toggle between:
- **Email Login**: Traditional email/password authentication
- **WhatsApp Login**: OTP-based authentication via WhatsApp

### Signup Page

Users can toggle between:
- **Email Signup**: Traditional email/password registration
- **WhatsApp OTP**: OTP-based registration via WhatsApp

## Security Features

1. **OTP Expiration**: OTPs expire after 10 minutes
2. **Attempt Limiting**: Maximum 5 failed attempts per OTP
3. **One-Time Use**: Each OTP can only be used once
4. **Phone Normalization**: Phone numbers are normalized to prevent duplicates

## Troubleshooting

### OTP Not Received

1. Check that your WhatsApp Business number is verified
2. Verify the phone number format (should be international format without +)
3. Check backend logs for WhatsApp API errors
4. Ensure your access token is valid and not expired

### "WhatsApp service not configured" Error

1. Verify environment variables are set correctly
2. Restart your backend server after adding environment variables
3. Check that `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` are in your `.env` file

### API Rate Limits

WhatsApp Business API has rate limits. If you exceed them:
- Wait before sending more messages
- Consider implementing rate limiting on your backend
- Use WhatsApp templates for better deliverability

## Production Considerations

1. **Permanent Access Token**: Use a System User token instead of a temporary token
2. **Webhook Setup**: Set up webhooks to receive message status updates
3. **Template Messages**: For production, use approved message templates
4. **Error Handling**: Implement proper error handling and user feedback
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Additional Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Meta for Developers](https://developers.facebook.com/)
- [WhatsApp Business API Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify your WhatsApp Business API credentials
3. Ensure your phone number is in the correct format
4. Check Meta's API status page for service outages

