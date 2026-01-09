# 🚨 URGENT: Check Why Test Admin Panel Connects to Production

## The Problem

When you delete products from test admin panel, they're deleted from production too. This means your test frontend is still connecting to production backend.

## Root Cause

`VITE_API_URL` is either:
1. **Not set** in Vercel environment variables
2. **Set but frontend not redeployed** (Vite env vars are replaced at BUILD TIME)

## Quick Check

### Step 1: Open Your Test Admin Panel

1. Open your test admin panel URL (from Vercel)
2. Press **F12** to open Developer Console
3. Go to **Console** tab
4. Look for messages starting with `🌐 [API]` or `⚠️ [API]`

### Step 2: What You Should See

**✅ CORRECT (if VITE_API_URL is set):**
```
🌐 [API] Using VITE_API_URL from environment: https://nefolbackend-production.up.railway.app/api
🌐 [API] Final API URL: https://nefolbackend-production.up.railway.app/api
```

**❌ WRONG (if VITE_API_URL is NOT set):**
```
⚠️ [API] VITE_API_URL not set! Test deployment should have VITE_API_URL set in Vercel.
⚠️ [API] Falling back to production URL. This may cause test actions to affect production!
⚠️ [API] Current hostname: [your-vercel-domain]
```

## Fix It Now

### Option A: Check Vercel Environment Variables

1. Go to **Vercel Dashboard**
2. Select **Admin Panel** project
3. Go to **Settings** → **Environment Variables**
4. Look for `VITE_API_URL`

**If it's missing or wrong:**
- Click **Add New** or **Edit**
- **Key**: `VITE_API_URL`
- **Value**: `https://nefolbackend-production.up.railway.app/api`
- **Environments**: Select **Preview** (or all)
- Click **Save**

### Option B: Redeploy (REQUIRED!)

**After setting/updating the variable, you MUST redeploy:**

1. Go to **Deployments** tab
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete

### Option C: Test After Redeploy

1. Open test admin panel
2. Open Console (F12)
3. Delete a test product
4. Check console - should show Railway URL
5. Check production - product should still exist

## Why This Happens

- Vite replaces `import.meta.env.VITE_API_URL` at **BUILD TIME**
- If variable isn't set during build → becomes `undefined`
- Code falls back to production URL
- **Solution**: Set variable + Redeploy

## Still Not Working?

If you still see production URL after redeploying:

1. **Double-check** the variable name is exactly `VITE_API_URL` (case-sensitive)
2. **Check** the value doesn't have trailing spaces
3. **Verify** you selected the correct environment (Preview/Production)
4. **Try** pushing a new commit to force a fresh build

## Quick Test Command

In browser console, run:
```javascript
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
```

**Expected:** Should show your Railway URL
**If undefined:** Variable not set or not redeployed
