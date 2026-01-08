# Test Environment Deployment Checklist

## 🎯 Goal
Deploy this test copy to Vercel/Netlify with separate test database, keeping production credentials untouched.

---

## ✅ Pre-Deployment Checklist

### 1. Database Setup
- [ ] Create test database account (Supabase/Neon/Railway)
- [ ] Get test database connection string
- [ ] Run migrations on test database: `DATABASE_URL=$TEST_DB node backend/migrate.js`
- [ ] Verify test database is empty/separate from production

### 2. Backend Deployment (Railway/Render/Vercel)
- [ ] Create new backend project
- [ ] Connect GitHub repo
- [ ] Set build command: `cd backend && npm install && npm run build`
- [ ] Set start command: `cd backend && npm start`
- [ ] Add environment variables:
  - [ ] `DATABASE_URL` → Test database connection
  - [ ] `PORT=2000`
  - [ ] `RAZORPAY_KEY_ID` → Test Razorpay key (rzp_test_*)
  - [ ] `RAZORPAY_KEY_SECRET` → Test Razorpay secret
  - [ ] `WHATSAPP_TOKEN` → Test token (or disable)
  - [ ] `SHIPROCKET_EMAIL` → Test email
  - [ ] `SHIPROCKET_PASSWORD` → Test password
  - [ ] All other service credentials → Test versions
- [ ] Deploy and get backend URL (e.g., `https://test-backend.railway.app`)

### 3. Frontend Deployment (Vercel)
- [ ] Create new Vercel project for user-panel
- [ ] Set root directory: `user-panel`
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variable: `VITE_API_URL` → Test backend URL
- [ ] Deploy and get frontend URL

### 4. Admin Panel Deployment (Vercel)
- [ ] Create new Vercel project for admin-panel
- [ ] Set root directory: `admin-panel`
- [ ] Set build command: `npm run build`
- [ ] Set output directory: `dist`
- [ ] Add environment variable: `VITE_API_URL` → Test backend URL
- [ ] Deploy and get admin URL

### 5. Verification
- [ ] Test backend API: `curl https://test-backend.railway.app/api/health`
- [ ] Test frontend loads correctly
- [ ] Test admin panel loads correctly
- [ ] Verify database connection works
- [ ] Test a simple feature (login, product list, etc.)

---

## 🔒 Security Checklist

- [ ] Production `.env` file is NOT modified
- [ ] Test credentials are different from production
- [ ] Test database is separate from production
- [ ] No production API keys in test environment
- [ ] Test URLs are different from production URLs

---

## 📝 Quick Reference

### Test Environment URLs
```
Backend:  https://test-backend.railway.app
Frontend: https://test-frontend.vercel.app
Admin:    https://test-admin.vercel.app
Database: (Your test database URL)
```

### Production URLs (DO NOT CHANGE)
```
Backend:  https://thenefol.com/api
Frontend: https://thenefol.com
Admin:    https://thenefol.com/admin
Database: (Production database - DO NOT TOUCH)
```

---

## 🚀 Deployment Commands

### Railway (Backend)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set DATABASE_URL=$TEST_DATABASE_URL
railway variables set PORT=2000
# ... add all other vars

# Deploy
railway up
```

### Vercel (Frontend)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd user-panel
vercel --prod

# Set environment variables in Vercel dashboard
# Settings > Environment Variables
```

---

## 🔄 Workflow

1. **Develop** → Make changes in this test repo
2. **Test Locally** → Test with test database
3. **Deploy to Test** → Deploy to test environment
4. **Manual Testing** → Test on deployed test site
5. **Copy to Production** → When ready, copy code (not env vars) to production repo

---

## ⚠️ Important Notes

- **NEVER** commit production credentials
- **NEVER** modify production `.env` in this repo
- **ALWAYS** use test credentials for test environment
- **ALWAYS** verify test database is separate
- **COPY** code changes to production, not environment variables


