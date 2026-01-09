# Verify VITE_API_URL is Set in Vercel

## 🚨 CRITICAL: Your test admin panel is still connecting to production!

The issue is that `VITE_API_URL` is **NOT set** in your Vercel deployment, so it's falling back to production.

## How to Fix

### Step 1: Check Current Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your **admin-panel** project
3. Go to **Settings** → **Environment Variables**
4. Check if `VITE_API_URL` exists

### Step 2: Add VITE_API_URL (if missing)

1. Click **Add New**
2. **Key**: `VITE_API_URL`
3. **Value**: `https://nefolbackend-production.up.railway.app/api`
   - Replace with your actual Railway backend URL
4. **Environment**: Select **Production**, **Preview**, and **Development** (or just **Preview** for test)
5. Click **Save**

### Step 3: Redeploy

**IMPORTANT**: After adding the environment variable, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **3 dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger a new deployment

### Step 4: Verify It's Working

After redeploying, open your test admin panel and:

1. Open browser **Developer Console** (F12)
2. Look for log messages starting with `🌐 [API]`
3. You should see: `🌐 [API] Using VITE_API_URL from environment: https://nefolbackend-production.up.railway.app/api`

If you see `⚠️ [API] VITE_API_URL not set!`, the environment variable wasn't set correctly.

## Why This Happens

- Vite replaces `import.meta.env.VITE_API_URL` at **BUILD TIME**
- If the variable isn't set during the Vercel build, it becomes `undefined`
- The code then falls back to production URL
- **You must redeploy after adding environment variables!**

## Quick Test

After redeploying, try deleting a test product and check:
- Browser console should show the Railway URL
- Product should be deleted from test database only
- Production products should remain untouched

## Same Steps for User Panel

Repeat the same steps for your **user-panel** project in Vercel.
