# Setup Supabase Database

## Problem
Your Supabase database is empty - no products, no admin user, nothing showing in admin panel.

## Solution

The database schema should be created automatically when your backend starts, but the **admin staff user** and **products** need to be created manually.

---

## Step 1: Verify Backend is Running

Your backend should be running on Railway. Check:
1. Go to Railway dashboard
2. Check your backend service
3. Look at **Logs** - you should see: `✅ Phase 1-4 tables created successfully`
4. If you see errors, the schema might not have been created

---

## Step 2: Run Database Setup Script

You have two options:

### Option A: Run Locally (if you have DATABASE_URL set)

1. **Set your test DATABASE_URL:**
   ```bash
   # In PowerShell
   $env:DATABASE_URL="postgresql://postgres:UvI09HmgBBon89zk@db.hlfycrtaeaexydwaevrb.supabase.co:5432/nefol"
   ```

2. **Run the setup script:**
   ```bash
   cd backend
   npm run setup-db
   ```

### Option B: Run via Railway CLI (Recommended)

1. **Install Railway CLI** (if not installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Link to your project:**
   ```bash
   railway link
   ```

4. **Run the setup script:**
   ```bash
   cd backend
   railway run npm run setup-db
   ```

   This will run the script with your Railway environment variables (including DATABASE_URL).

---

## Step 3: Verify Setup

The script will:
- ✅ Check database connection
- ✅ Verify all tables exist
- ✅ Check if products exist
- ✅ Create admin staff user if it doesn't exist

### Default Admin Credentials:

If you don't set environment variables, it will create:
```
Email: admin@thenefol.com
Password: admin123
```

### Custom Admin Credentials:

To set custom credentials, use environment variables:

```bash
# For local run:
$env:ADMIN_EMAIL="your@email.com"
$env:ADMIN_PASSWORD="yourpassword"
npm run setup-db

# For Railway run:
railway run --env ADMIN_EMAIL=your@email.com --env ADMIN_PASSWORD=yourpassword npm run setup-db
```

---

## Step 4: Add Products

After the database is set up, you need to add products:

### Option A: Import via Admin Panel
1. Login to admin panel with your credentials
2. Go to Products section
3. Import products via CSV or add manually

### Option B: Import via API
Use your backend API to import products.

---

## Step 5: Set Admin Credentials in Railway (Optional)

If you want to set admin credentials permanently in Railway:

1. Go to Railway → Your Backend Service
2. Go to **Variables** tab
3. Add:
   ```
   ADMIN_EMAIL=your@email.com
   ADMIN_PASSWORD=yourpassword
   ```
4. Redeploy the backend (so these variables are available)

5. Run the setup script again:
   ```bash
   railway run npm run setup-db
   ```

---

## Troubleshooting

### Error: "DATABASE_URL not found"
- Make sure `DATABASE_URL` is set in Railway environment variables
- Check Railway → Your Backend Service → Variables

### Error: "relation 'staff_users' does not exist"
- The schema hasn't been created yet
- Make sure your backend has started and run `ensureSchema()`
- Check Railway logs for schema creation messages
- Restart your backend service if needed

### Error: "password authentication failed"
- Check your Supabase connection string
- Make sure the password is correct
- Verify SSL is enabled (should be automatic for Supabase)

### Admin Login Still Doesn't Work
- Make sure you're using the **staff_users** credentials (not users table)
- Check Railway logs to see if admin user was created
- Verify the email/password you used

---

## Quick Check Command

To quickly check if your database has data:

```bash
# Via Railway CLI:
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM products;"
railway run psql $DATABASE_URL -c "SELECT email, name FROM staff_users;"
```

---

## Summary

1. ✅ Verify backend is running (check Railway logs)
2. ✅ Run `npm run setup-db` (via Railway CLI recommended)
3. ✅ Login to admin panel with created credentials
4. ✅ Import products via admin panel or API

Once this is done, your database should have:
- ✅ All tables created
- ✅ Admin staff user created
- ✅ Admin can login to admin panel
- ✅ Ready to import products
