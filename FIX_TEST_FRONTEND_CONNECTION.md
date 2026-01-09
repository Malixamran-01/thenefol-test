# Fix: Test Frontend Connecting to Production Backend

## 🔴 Problem

Your test frontend (deployed on Vercel) is connecting to **production backend** (`thenefol.com`) instead of your **test backend** (Railway).

**Evidence:**
- Order placed on test frontend → Shows in production database
- Order doesn't show in test backend/database
- This means frontend is using production API URL

## ✅ Solution

### Step 1: Set VITE_API_URL in Vercel

**For User Panel:**
1. Go to **Vercel Dashboard**
2. Click your **User Panel** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   Name: VITE_API_URL
   Value: https://your-railway-backend.railway.app
   ```
   ⚠️ **Replace with your actual Railway backend URL**

5. **Important:** Select **Production, Preview, and Development** environments
6. Click **Save**

**For Admin Panel:**
1. Go to **Vercel Dashboard**
2. Click your **Admin Panel** project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   ```
   Name: VITE_API_URL
   Value: https://your-railway-backend.railway.app
   ```
5. Select **Production, Preview, and Development** environments
6. Click **Save**

### Step 2: Redeploy Frontend

**After setting environment variables:**

1. Go to **Deployments** tab in Vercel
2. Click **"..."** (three dots) on the latest deployment
3. Click **"Redeploy"**
4. Or push a new commit to trigger automatic redeploy

**Why redeploy?**
- Environment variables are only available at build time for Vite
- Frontend needs to be rebuilt to use the new `VITE_API_URL`

### Step 3: Verify Connection

**Test in Browser:**
1. Open your deployed test frontend
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Look for: `🌐 [API] Using VITE_API_URL: https://your-railway-backend.railway.app`
5. If you see this, it's using the correct backend!

**Test API Call:**
```javascript
// In browser console:
fetch('https://your-railway-backend.railway.app/api/products')
  .then(r => r.json())
  .then(console.log)
```

**Test Order:**
1. Place a test order on the frontend
2. Check Railway backend logs
3. Check Supabase test database
4. Order should appear in test database, NOT production

---

## 🔍 How to Find Your Railway Backend URL

1. Go to **Railway Dashboard**
2. Click your backend service
3. Go to **Settings** tab
4. Look for **"Public Domain"** or **"Custom Domain"**
5. Or check **Deployments** tab for the URL
6. Example: `https://nefol-backend-production.up.railway.app`

---

## ✅ Verification Checklist

After fixing:

- [ ] `VITE_API_URL` is set in Vercel (both frontends)
- [ ] Frontend is redeployed
- [ ] Browser console shows: `Using VITE_API_URL: https://your-railway-backend.railway.app`
- [ ] Test order placed → Shows in Railway backend logs
- [ ] Test order → Shows in Supabase test database
- [ ] Test order → Does NOT show in production database

---

## 🐛 If Still Connecting to Production

### Check 1: Environment Variable Not Set
- Verify `VITE_API_URL` exists in Vercel
- Check it's set for the correct environment (Production/Preview)

### Check 2: Frontend Not Redeployed
- Environment variables only work after redeploy
- Make sure you redeployed after setting the variable

### Check 3: Wrong URL Format
- Should be: `https://your-backend.railway.app` (no trailing slash)
- Should NOT be: `https://your-backend.railway.app/api` (code adds `/api` automatically)

### Check 4: Browser Cache
- Clear browser cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or test in incognito/private window

---

## 📝 Code Changes Made

I've updated the frontend code to:
1. **Priority 1:** Use `VITE_API_URL` if set (your test backend)
2. **Priority 2:** Use `thenefol.com` if on production domain
3. **Priority 3:** Fallback to `thenefol.com` for other domains

This means:
- ✅ If `VITE_API_URL` is set → Uses your Railway backend
- ✅ If not set → Uses production (thenefol.com)

---

## 🎯 Quick Fix Summary

1. **Set `VITE_API_URL` in Vercel** = Your Railway backend URL
2. **Redeploy frontend** (required!)
3. **Test order** → Should appear in test database
4. **Verify** → Check browser console for API URL

---

## ⚠️ Important Notes

- **Environment variables are build-time** for Vite
- **Must redeploy** after setting/changing environment variables
- **Test in browser console** to verify which backend is being used
- **Clear cache** if you see old behavior

Once fixed, your test frontend will connect to your test backend, and orders will go to your test database! 🎉

