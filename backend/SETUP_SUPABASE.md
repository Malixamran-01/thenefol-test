# Supabase Test Database Setup

## Your Connection String
```
postgresql://postgres:[YOUR-PASSWORD]@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres
```

## Quick Setup Steps

### Step 1: Get Your Password
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **Database**
4. Find **Connection string** section
5. Copy the password (or reset it if needed)

### Step 2: Test Connection
```bash
cd backend
node test-db-connection-supabase.js
```

Or set password in `.env`:
```env
SUPABASE_PASSWORD=your_actual_password
```

### Step 3: Create nefol Database
The script will automatically create the `nefol` database if it doesn't exist.

### Step 4: Run Migrations
```bash
# Set DATABASE_URL to your Supabase connection string
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol"

# Run migrations
node migrate.js
```

### Step 5: Use in Deployment
When deploying to Railway/Render/Vercel, set this environment variable:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol
```

## Security Notes
- ⚠️ **Never commit the password to Git**
- ✅ Use environment variables in deployment platforms
- ✅ Keep production database credentials separate
- ✅ This is for TEST environment only

## Connection String Format
```
postgresql://postgres:PASSWORD@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol
```

Replace:
- `PASSWORD` → Your actual Supabase password
- `nefol` → Database name (will be created automatically)

## Troubleshooting

### Password Authentication Failed
- Check password in Supabase dashboard
- Make sure password doesn't have special characters that need URL encoding
- Try resetting password in Supabase

### Database Doesn't Exist
- The script will create it automatically
- Or create manually: `CREATE DATABASE nefol;`

### Connection Timeout
- Check Supabase project is active
- Verify connection string is correct
- Check if IP restrictions are enabled (disable for testing)


