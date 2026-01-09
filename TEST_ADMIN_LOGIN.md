# Test Admin Login - Troubleshooting Guide

## Problem
Admin user exists in database, but can't login from Vercel admin panel.

## Step 1: Verify VITE_API_URL in Vercel

1. Go to **Vercel Dashboard**
2. Click your **Admin Panel** project
3. Go to **Settings** → **Environment Variables**
4. Check if `VITE_API_URL` is set to:
   ```
   https://nefolbackend-production.up.railway.app
   ```
5. If not set or wrong, add/update it
6. **Redeploy** the admin panel (required!)

## Step 2: Test Login API Directly

Test if the login endpoint works on Railway backend:

### Option A: Via Browser Console

1. Open your deployed admin panel
2. Press **F12** → **Console** tab
3. Run this:
   ```javascript
   fetch('https://nefolbackend-production.up.railway.app/api/staff/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: 'admin@thenefol.com',
       password: 'admin123'
     })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error)
   ```

### Option B: Via curl (if you have it)

```bash
curl -X POST https://nefolbackend-production.up.railway.app/api/staff/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thenefol.com","password":"admin123"}'
```

### Expected Response (Success):
```json
{
  "user": {
    "id": 1,
    "email": "admin@thenefol.com",
    "name": "Admin User",
    "role": "admin",
    ...
  },
  "token": "..."
}
```

### Expected Response (Error):
```json
{
  "error": "Invalid credentials"
}
```

## Step 3: Check Browser Console

When you try to login:

1. Open **Developer Tools** (F12)
2. Go to **Console** tab
3. Look for:
   - `🌐 [API] Using VITE_API_URL: https://nefolbackend-production.up.railway.app`
   - Any error messages
   - Network requests to `/staff/auth/login`

4. Go to **Network** tab
5. Try logging in
6. Look for the login request:
   - **URL**: Should be `https://nefolbackend-production.up.railway.app/api/staff/auth/login`
   - **Status**: Should be 200 (success) or 401/400 (error)
   - **Response**: Check the response body

## Step 4: Check Railway Backend Logs

1. Go to **Railway Dashboard**
2. Click your **Backend Service**
3. Go to **Logs** tab
4. Try logging in from frontend
5. Look for:
   - Login requests
   - Database queries
   - Any errors

## Step 5: Verify Password Hashing

The password might be hashed differently. Let's reset it:

### Via Railway CLI:
```bash
cd backend
railway run --env ADMIN_EMAIL=admin@thenefol.com --env ADMIN_PASSWORD=admin123 node setup-supabase-db.js
```

This will update the password hash to match what the backend expects.

## Common Issues

### Issue 1: VITE_API_URL not set in Vercel
- **Symptom**: Frontend connects to production backend
- **Fix**: Set `VITE_API_URL` in Vercel and redeploy

### Issue 2: Frontend not redeployed
- **Symptom**: Old build still using production URL
- **Fix**: Redeploy admin panel after setting VITE_API_URL

### Issue 3: Password hash mismatch
- **Symptom**: API returns "Invalid credentials"
- **Fix**: Reset password using setup script

### Issue 4: CORS error
- **Symptom**: Browser console shows CORS error
- **Fix**: Check Railway backend CORS settings

---

## Quick Debug Checklist

- [ ] `VITE_API_URL` set in Vercel admin panel
- [ ] Admin panel redeployed after setting VITE_API_URL
- [ ] Browser console shows correct backend URL
- [ ] Login API returns success (test via browser console)
- [ ] Railway backend logs show login requests
- [ ] Password reset if needed

---

## Test Login API Script

Save this as `test-login.js` and run it:

```javascript
const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('https://nefolbackend-production.up.railway.app/api/staff/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@thenefol.com',
        password: 'admin123'
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
```

Run: `node test-login.js`
