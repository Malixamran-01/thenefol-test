# Quick Fix: Supabase Connection Issue

## Problem

```
❌ Error: getaddrinfo ENOTFOUND db.hlfycrtaeaexydwaevrb.supabase.co
```

## Immediate Solution

### Option 1: Restore Paused Project (90% of cases)

1. **Go to Supabase Dashboard**

   - https://app.supabase.com
   - Login to your account

2. **Check Project Status**

   - Look for your project
   - If it shows "Paused" or grayed out → Click **"Restore"** or **"Resume"**

3. **Wait 2-3 Minutes**

   - DNS needs time to update
   - Project needs to fully activate

4. **Test Again**
   ```bash
   node troubleshoot-supabase.js
   ```

### Option 2: Get Correct Connection String

1. **Supabase Dashboard** → Your Project → **Settings** → **Database**

2. **Copy Connection String**

   - Look for "Connection string" section
   - Copy the **URI format** (not the individual parameters)
   - It might look different than what we have

3. **Update .env.test**

   ```bash
   # Replace DATABASE_URL in .env.test with the one from dashboard
   ```

4. **Switch to Test Env**
   ```bash
   npm run env:test
   ```

### Option 3: Use Connection Pooler

Supabase provides a connection pooler (better for serverless):

1. **Supabase Dashboard** → **Settings** → **Database**

2. **Find "Connection Pooling" Section**

   - Look for "Connection string" with port **6543**
   - Format: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres`

3. **Use Pooler Connection String**
   - Update `.env.test` with pooler URL
   - Port 6543 instead of 5432
   - Usually more reliable

### Option 4: Create Database via SQL Editor

If connection from local machine fails:

1. **Supabase Dashboard** → **SQL Editor**

2. **Run SQL:**

   ```sql
   CREATE DATABASE nefol;
   ```

3. **Get Connection String**
   - Settings > Database
   - Use connection string for `nefol` database

## Verification Steps

After fixing, verify:

```bash
# 1. Test connection
node troubleshoot-supabase.js

# 2. Create nefol database (if needed)
node setup-supabase-db.js

# 3. Run migrations
npm run env:test
node migrate.js
```

## Still Not Working?

1. **Check Supabase Status**: https://status.supabase.com
2. **Verify Project is Active** in dashboard
3. **Try Different Network** (mobile hotspot, etc.)
4. **Contact Supabase Support** if project won't restore

## Most Likely Issue

**Your Supabase project is PAUSED** (free tier auto-pauses after inactivity).

**Fix**: Restore it in the dashboard, wait 2-3 minutes, then try again.

