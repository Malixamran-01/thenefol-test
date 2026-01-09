# Setup Admin User on Railway Backend

## Problem
`DATABASE_URL` is set correctly in Railway, but admin login still doesn't work. The admin user was created locally, but Railway backend might need to create it in its own database connection.

## Solution: Run Setup Script on Railway

Since `DATABASE_URL` is already set in Railway, we can run the setup script directly on Railway to create the admin user.

### Option 1: Via Railway CLI (Recommended)

1. **Install Railway CLI** (if not installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Link to your project**:
   ```bash
   railway link
   ```
   (Select your backend service)

4. **Run the setup script on Railway**:
   ```bash
   cd backend
   railway run npm run setup-db
   ```

   This will run the script with Railway's environment variables (including DATABASE_URL).

### Option 2: Check Railway Logs First

Before running the setup, check if the backend is connecting:

1. Go to Railway Dashboard
2. Click your Backend Service
3. Go to **Logs** tab
4. Look for:
   - `✅ Database connection established`
   - Any database errors

### Option 3: Redeploy Backend

Sometimes the backend needs a fresh restart:

1. Go to Railway → Your Backend Service
2. Go to **Deployments** tab
3. Click **"..."** on latest deployment
4. Click **"Redeploy"**

This will restart the backend with the current `DATABASE_URL`.

---

## Verify Admin User Exists

After running the setup script, verify the admin user was created:

### Via Railway CLI:
```bash
railway run psql $DATABASE_URL -c "SELECT id, email, name FROM staff_users;"
```

This should show your admin user.

---

## Test Admin Login

After setup:

1. Go to your deployed admin panel
2. Try logging in with:
   - Email: `admin@thenefol.com`
   - Password: `admin123`

---

## Custom Admin Credentials

To use custom credentials, set them in Railway Variables:

1. Go to Railway → Variables
2. Add:
   ```
   ADMIN_EMAIL=your@email.com
   ADMIN_PASSWORD=yourpassword
   ```
3. Then run: `railway run npm run setup-db`

---

## Summary

1. ✅ `DATABASE_URL` is already set in Railway
2. ⏭️ Run `railway run npm run setup-db` to create admin user
3. ✅ Verify in logs/admin panel

The setup script will use Railway's `DATABASE_URL` and create the admin user in the same database your backend uses!
