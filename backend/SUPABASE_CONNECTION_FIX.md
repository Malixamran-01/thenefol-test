# Supabase Connection Fix

## Problem
DNS resolution error: `getaddrinfo ENOTFOUND db.hlfycrtaeaexydwaevrb.supabase.co`

## Common Causes

### 1. Supabase Project is Paused (Most Common)
Free tier Supabase projects pause after 1 week of inactivity.

**Solution:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Check if your project shows "Paused" status
3. Click "Restore" or "Resume" to activate the project
4. Wait 1-2 minutes for DNS to update
5. Try connection again

### 2. Incorrect Hostname
The hostname might have changed or be incorrect.

**Solution:**
1. Go to Supabase Dashboard > Your Project
2. Go to **Settings** > **Database**
3. Copy the **Connection string** (URI format)
4. Verify the hostname matches: `db.hlfycrtaeaexydwaevrb.supabase.co`
5. Update `.env.test` if different

### 3. Network/Firewall Issues
Your network might be blocking the connection.

**Solution:**
- Try from a different network
- Check if port 5432 is blocked
- Try using Supabase connection pooler (port 6543)

## Quick Fix Steps

### Step 1: Verify Project Status
```bash
# Check Supabase dashboard
# If paused, click "Restore"
```

### Step 2: Get Correct Connection String
1. Supabase Dashboard > Settings > Database
2. Copy the **Connection string** (URI)
3. It should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   OR
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 3: Update .env.test
Replace the DATABASE_URL in `.env.test` with the correct one from Supabase dashboard.

### Step 4: Test Connection
```bash
cd backend
node troubleshoot-supabase.js
```

### Step 5: Run Migrations
```bash
npm run env:test  # Switch to test env
node migrate.js   # Run migrations
```

## Alternative: Use Connection Pooler

Supabase provides a connection pooler that might work better:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

Port 6543 uses the connection pooler (better for serverless).

## Updated Migration Script

The migration script has been updated to:
- ✅ Automatically detect Supabase connections
- ✅ Enable SSL for Supabase (required)
- ✅ Handle connection timeouts better

## Next Steps

1. **Check Supabase Dashboard** - Is project active?
2. **Get correct connection string** from dashboard
3. **Update `.env.test`** with correct connection string
4. **Test connection**: `node troubleshoot-supabase.js`
5. **Run migrations**: `node migrate.js`

## Still Having Issues?

If DNS still fails after restoring the project:
- Wait 2-3 minutes for DNS propagation
- Try using the connection pooler URL (port 6543)
- Check Supabase status page: https://status.supabase.com
- Contact Supabase support if project won't restore


