# Set VITE_API_URL in Vercel

## ✅ Your Backend URL

```
https://nefolbackend-production.up.railway.app
```

This is your Railway backend domain! Use this in Vercel.

---

## 📝 Steps to Set in Vercel

### For User Panel:

1. Go to **Vercel Dashboard**
2. Click your **User Panel** project
3. Go to **Settings** → **Environment Variables**
4. Click **"+ Add New"**
5. Add:
   ```
   Name: VITE_API_URL
   Value: https://nefolbackend-production.up.railway.app
   ```
6. **Important:** Select all environments:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
7. Click **"Save"**

### For Admin Panel:

1. Go to **Vercel Dashboard**
2. Click your **Admin Panel** project
3. Go to **Settings** → **Environment Variables**
4. Click **"+ Add New"**
5. Add:
   ```
   Name: VITE_API_URL
   Value: https://nefolbackend-production.up.railway.app
   ```
6. Select all environments (Production, Preview, Development)
7. Click **"Save"**

---

## 🔄 Redeploy Frontend (REQUIRED!)

**Important:** Environment variables are only available at build time for Vite.

After setting `VITE_API_URL`:

1. Go to **Deployments** tab in Vercel
2. Click **"..."** (three dots) on latest deployment
3. Click **"Redeploy"**
   OR
4. Push a new commit to trigger automatic redeploy

---

## ✅ Verify It's Working

After redeploy:

1. Open your deployed frontend
2. Press **F12** (Developer Tools)
3. Go to **Console** tab
4. Look for: `🌐 [API] Using VITE_API_URL: https://nefolbackend-production.up.railway.app`

If you see this message, it's using the correct backend!

---

## 🧪 Test Backend Connection

Test your backend directly:

```bash
# In browser or terminal:
curl https://nefolbackend-production.up.railway.app/api/products
```

**Expected:** Returns JSON with products (or empty array)

Or test in browser:
```
https://nefolbackend-production.up.railway.app/api/products
```

---

## ✅ Final Checklist

- [ ] `VITE_API_URL` set in Vercel (User Panel)
- [ ] `VITE_API_URL` set in Vercel (Admin Panel)
- [ ] Frontend redeployed (both)
- [ ] Browser console shows correct backend URL
- [ ] Test order goes to test database (not production)

---

## 🎯 Summary

**Your Backend URL:**
```
https://nefolbackend-production.up.railway.app
```

**Set in Vercel as:**
```
VITE_API_URL = https://nefolbackend-production.up.railway.app
```

**Then redeploy!** 🚀

After this, your test frontend will connect to your test backend, and orders will go to your test database!

