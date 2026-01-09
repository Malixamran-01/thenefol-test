# Railway Environment Variables Setup

## ⚠️ Critical: Database Connection Error

The server is crashing because `DATABASE_URL` is not set in Railway, so it's trying to connect to `localhost:5432` instead of Supabase.

## Quick Fix

### Step 1: Add DATABASE_URL in Railway

1. Go to your Railway project dashboard
2. Click on your backend service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:

```
Name: DATABASE_URL
Value: postgresql://postgres.gtrthvbtphivkflkhrmc:DMTNmA3kRZuBdFI6@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
```

6. Click **Add**

### Step 2: Add Other Required Environment Variables

Add these variables in Railway:

```env
# Database
DATABASE_URL=postgresql://postgres.gtrthvbtphivkflkhrmc:DMTNmA3kRZuBdFI6@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# Server
PORT=2000
HOST=0.0.0.0
NODE_ENV=production

# API Keys (use test/production keys as needed)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Other services
WHATSAPP_TOKEN=your_whatsapp_token
SHIPROCKET_EMAIL=your_shiprocket_email
SHIPROCKET_PASSWORD=your_shiprocket_password

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# Supabase
SUPABASE_SERVICE_ROLE_KEY=sb_secret_1BRN5Zwr1d3kpkAmUfWgDQ_Zr2Dw7Ls
```

### Step 3: Redeploy

After adding variables:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy
3. Check logs - should connect to Supabase successfully

## Verification

After redeploy, check logs for:
- ✅ `Database connection established`
- ✅ `🚀 Nefol API running on http://0.0.0.0:2000`
- ❌ No `ECONNREFUSED` errors

## Important Notes

- **Never commit `.env` files** - Use Railway Variables instead
- **Use production credentials** for production deployment
- **Test credentials** are fine for test environment
- **Rotate credentials** if they were exposed in Git history

