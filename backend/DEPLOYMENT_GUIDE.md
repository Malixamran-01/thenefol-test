# Backend Deployment Guide

## Recommended Platforms

### 🥇 Option 1: Railway (Recommended)
**Best for**: Easy setup, WebSocket support, good for Express + Socket.IO

**Pros:**
- ✅ Very easy setup (GitHub integration)
- ✅ Supports WebSockets (Socket.IO works)
- ✅ Free tier available ($5 credit/month)
- ✅ Automatic HTTPS
- ✅ Environment variables management
- ✅ Good for Node.js/Express

**Pricing**: Free tier → $5/month for small apps

**Setup Time**: ~5 minutes

---

### 🥈 Option 2: Render
**Best for**: Free tier, simple deployment

**Pros:**
- ✅ Free tier (with limitations)
- ✅ Easy GitHub integration
- ✅ Supports WebSockets
- ✅ Automatic HTTPS
- ✅ Good documentation

**Cons:**
- ⚠️ Free tier spins down after inactivity (15 min)
- ⚠️ Slower cold starts

**Pricing**: Free tier → $7/month for always-on

**Setup Time**: ~10 minutes

---

### 🥉 Option 3: Fly.io
**Best for**: Global deployment, Docker support

**Pros:**
- ✅ Global edge deployment
- ✅ Good WebSocket support
- ✅ Free tier available
- ✅ Docker-based

**Cons:**
- ⚠️ Requires Dockerfile
- ⚠️ Slightly more complex setup

**Pricing**: Free tier → Pay as you go

---

## Quick Comparison

| Platform | Free Tier | WebSocket | Setup | Best For |
|----------|-----------|-----------|-------|----------|
| **Railway** | ✅ ($5 credit) | ✅ | ⭐⭐⭐⭐⭐ | Quick deployment |
| **Render** | ✅ (limited) | ✅ | ⭐⭐⭐⭐ | Free hosting |
| **Fly.io** | ✅ | ✅ | ⭐⭐⭐ | Global scale |
| **Vercel** | ✅ | ⚠️ (serverless) | ⭐⭐⭐⭐ | Serverless (needs adjustments) |

---

## Recommended: Railway

### Why Railway?
1. **Easiest setup** - Just connect GitHub
2. **WebSocket support** - Socket.IO works out of the box
3. **Good free tier** - $5 credit/month
4. **Fast deployment** - Auto-deploy from Git
5. **Environment variables** - Easy to manage

### Railway Setup Steps

#### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"

#### Step 2: Deploy from GitHub
1. Select "Deploy from GitHub repo"
2. Choose your repository: `thenefol`
3. Select the `backend` folder as root directory

#### Step 3: Configure Build Settings
Railway will auto-detect, but verify:
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Port**: `2000` (or set via `PORT` env var)

#### Step 4: Set Environment Variables
In Railway dashboard → Variables, add:

```
DATABASE_URL=postgresql://postgres.gtrthvbtphivkflkhrmc:DMTNmA3kRZuBdFI6@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
PORT=2000
HOST=0.0.0.0
NODE_ENV=production

# Add other credentials (test versions)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_xxxxx
# ... etc
```

#### Step 5: Deploy
Railway will automatically:
- Install dependencies
- Build TypeScript
- Start the server
- Provide a URL (e.g., `https://your-app.railway.app`)

---

## Alternative: Render Setup

### Render Setup Steps

#### Step 1: Create Account
1. Go to https://render.com
2. Sign up with GitHub

#### Step 2: New Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repo
3. Configure:
   - **Name**: `nefol-backend-test`
   - **Environment**: `Node`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

#### Step 3: Environment Variables
Add all your environment variables in Render dashboard.

#### Step 4: Deploy
Click "Create Web Service" and wait for deployment.

---

## Deployment Checklist

### Before Deploying

- [ ] **Build works locally**: `npm run build`
- [ ] **Start works**: `npm start` (test locally)
- [ ] **Environment variables ready** (test versions)
- [ ] **Database connection tested** (Supabase working)
- [ ] **Port configuration**: Backend uses `PORT` env var

### Environment Variables Needed

```env
# Database
DATABASE_URL=postgresql://postgres.gtrthvbtphivkflkhrmc:DMTNmA3kRZuBdFI6@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# Server
PORT=2000
HOST=0.0.0.0
NODE_ENV=production

# API Keys (test versions)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_xxxxx

# Other services (test credentials)
WHATSAPP_TOKEN=test_token
SHIPROCKET_EMAIL=test@example.com
SHIPROCKET_PASSWORD=test_password

# Security
JWT_SECRET=your_test_jwt_secret
ENCRYPTION_KEY=your_test_encryption_key
```

### After Deploying

- [ ] Test API endpoint: `https://your-app.railway.app/api/health`
- [ ] Test database connection
- [ ] Verify Socket.IO works (if using)
- [ ] Check logs for errors
- [ ] Update frontend `VITE_API_URL` to point to deployed backend

---

## Quick Start: Railway (5 minutes)

```bash
# 1. Push code to GitHub (if not already)
git add .
git commit -m "Ready for deployment"
git push

# 2. Go to Railway
# https://railway.app → New Project → Deploy from GitHub

# 3. Select your repo and backend folder

# 4. Add environment variables in Railway dashboard

# 5. Deploy! (automatic)
```

---

## Troubleshooting

### Build Fails
- Check build logs in Railway/Render
- Verify `npm run build` works locally
- Check TypeScript errors

### Server Won't Start
- Check start command: `npm start`
- Verify `dist/index.js` exists after build
- Check PORT environment variable

### Database Connection Fails
- Verify `DATABASE_URL` is set correctly
- Check Supabase project is active
- Test connection locally first

### Socket.IO Not Working
- Verify WebSocket support on platform
- Check CORS settings
- Verify Socket.IO server is running

---

## Next Steps After Deployment

1. **Get Backend URL**: `https://your-app.railway.app`
2. **Update Frontend**: Set `VITE_API_URL` in frontend deployment
3. **Test API**: `curl https://your-app.railway.app/api/health`
4. **Monitor Logs**: Check Railway/Render logs for errors

---

## Recommendation

**Start with Railway** - It's the easiest and works best with your setup (Express + Socket.IO + Supabase).

Ready to deploy? Follow the Railway setup steps above!

