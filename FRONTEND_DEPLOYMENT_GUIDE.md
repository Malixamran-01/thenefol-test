# Frontend Deployment Guide

## Recommended Platform: Vercel

**Best for:** React/Vite applications (your frontends)
- ✅ Free tier with generous limits
- ✅ Automatic deployments from GitHub
- ✅ Built-in CDN and edge network
- ✅ Easy environment variable management
- ✅ Automatic HTTPS
- ✅ Perfect for Vite/React apps

## Deployment Options

You have **2 frontend applications**:
1. **User Panel** (`user-panel/`) - Customer-facing storefront
2. **Admin Panel** (`admin-panel/`) - Admin dashboard

You can deploy both to Vercel as separate projects.

---

## Quick Start: Deploy to Vercel

### Step 1: Prepare Your Code

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for frontend deployment"
   git push
   ```

### Step 2: Deploy User Panel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with GitHub
3. Click **"Add New Project"**
4. Import your repository: `thenefol`
5. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `user-panel`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

6. **Environment Variables:**
   - Click **"Environment Variables"**
   - Add:
     ```
     VITE_API_URL=https://your-railway-backend.railway.app
     ```
   - Replace `your-railway-backend.railway.app` with your actual Railway backend URL

7. Click **"Deploy"**

### Step 3: Deploy Admin Panel

1. In Vercel, click **"Add New Project"** again
2. Import the same repository: `thenefol`
3. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `admin-panel`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

4. **Environment Variables:**
   - Add:
     ```
     VITE_API_URL=https://your-railway-backend.railway.app
     ```

5. Click **"Deploy"**

---

## Alternative: Netlify

If you prefer Netlify:

1. Go to [netlify.com](https://netlify.com)
2. Sign up with GitHub
3. Click **"Add new site"** → **"Import an existing project"**
4. Select your repository
5. Configure:
   - **Base directory:** `user-panel` (or `admin-panel`)
   - **Build command:** `npm run build`
   - **Publish directory:** `user-panel/dist` (or `admin-panel/dist`)

6. Add environment variable:
   - **Site settings** → **Environment variables**
   - Add `VITE_API_URL` = `https://your-railway-backend.railway.app`

---

## Environment Variables Needed

### User Panel
```env
VITE_API_URL=https://your-railway-backend.railway.app
```

### Admin Panel
```env
VITE_API_URL=https://your-railway-backend.railway.app
```

**Important:** Replace `your-railway-backend.railway.app` with your actual Railway backend URL.

To find your Railway URL:
1. Go to Railway Dashboard
2. Click your backend service
3. Click **"Settings"** tab
4. Find **"Public Domain"** or check the **"Deployments"** tab for the URL

---

## Deployment Checklist

### Before Deploying
- [ ] Code pushed to GitHub
- [ ] Railway backend is running and accessible
- [ ] Railway backend URL noted
- [ ] Environment variables ready

### After Deploying
- [ ] Test User Panel URL
- [ ] Test Admin Panel URL
- [ ] Verify API connection (check browser console)
- [ ] Test login functionality
- [ ] Check if API calls work

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel/Netlify
- Verify `npm run build` works locally
- Check for TypeScript errors

### API Connection Fails
- Verify `VITE_API_URL` is set correctly
- Check Railway backend is running
- Check CORS settings in backend
- Check browser console for errors

### 404 Errors
- Verify `Output Directory` is set to `dist`
- Check if `vite.config.ts` has correct build settings

---

## Recommended Setup

**User Panel:**
- Platform: Vercel
- URL: `https://nefol-store.vercel.app` (or custom domain)
- Environment: `VITE_API_URL=https://your-backend.railway.app`

**Admin Panel:**
- Platform: Vercel
- URL: `https://nefol-admin.vercel.app` (or custom domain)
- Environment: `VITE_API_URL=https://your-backend.railway.app`

**Backend:**
- Platform: Railway
- URL: `https://your-backend.railway.app`

---

## Next Steps After Deployment

1. **Get your Vercel URLs** for both frontends
2. **Update CORS** in backend if needed (should already allow all origins)
3. **Test the full flow:**
   - User Panel → Browse products → Add to cart → Checkout
   - Admin Panel → Login → Manage products/orders
4. **Set up custom domains** (optional):
   - `store.thenefol.com` for user panel
   - `admin.thenefol.com` for admin panel

---

## Quick Deploy Commands (Vercel CLI)

If you prefer CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy User Panel
cd user-panel
vercel

# Deploy Admin Panel
cd ../admin-panel
vercel
```

---

## Summary

✅ **Best Platform:** Vercel (free, fast, perfect for Vite)
✅ **Deploy Both:** User Panel + Admin Panel as separate projects
✅ **Set VITE_API_URL:** Point to your Railway backend
✅ **Automatic Deployments:** Every push to GitHub

Your frontends will be live in minutes! 🚀

