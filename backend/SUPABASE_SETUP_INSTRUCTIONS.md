# Supabase Database Setup Instructions

## Your Connection Details
- **Host**: `db.hlfycrtaeaexydwaevrb.supabase.co`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `UvI09HmgBBon89zk`
- **Default Database**: `postgres`

## Connection String Format
```
postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/postgres
```

## Setup Steps

### Step 1: Verify Connection String
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** > **Database**
4. Copy the **Connection string** (URI format)
5. Verify it matches the format above

### Step 2: Test Connection Locally
```bash
cd backend
node setup-supabase-db.js
```

If connection fails:
- Check internet connection
- Verify Supabase project is active (not paused)
- Try the connection string from Supabase dashboard directly

### Step 3: Create nefol Database
The script will automatically create the `nefol` database. Or manually:

```sql
-- Connect to postgres database first
CREATE DATABASE nefol;
```

### Step 4: Run Migrations
```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol"

# Run migrations
cd backend
node migrate.js
```

### Step 5: Use in Deployment
When deploying to Railway/Render/Vercel, set this environment variable:

```
DATABASE_URL=postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol
```

## Important Notes

### SSL Required
Supabase requires SSL connections. Make sure your connection includes:
```javascript
ssl: { rejectUnauthorized: false }
```

### Security
- ⚠️ **Never commit passwords to Git**
- ✅ Use environment variables in deployment platforms
- ✅ Keep this password secure
- ✅ This is for TEST environment only

### Connection String for nefol Database
```
postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol
```

## Troubleshooting

### ENOTFOUND Error
- Check internet connection
- Verify Supabase project is active
- Try pinging: `ping db.hlfycrtaeaexydwaevrb.supabase.co`
- Check if project is paused in Supabase dashboard

### Authentication Failed
- Verify password is correct
- Check if password has special characters that need URL encoding
- Try resetting password in Supabase dashboard

### SSL Error
- Make sure `ssl: { rejectUnauthorized: false }` is set
- Supabase requires SSL connections

## Alternative: Use Supabase Connection Pooler
Supabase also provides a connection pooler on port 6543:
```
postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:6543/postgres?pgbouncer=true
```

## Next Steps
1. Verify connection works
2. Create nefol database
3. Run migrations
4. Set up deployment with this connection string
5. Test your application


