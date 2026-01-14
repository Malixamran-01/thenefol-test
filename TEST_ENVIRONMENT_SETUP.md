# Test Environment Setup Guide

## Overview
This is a **test copy** of the production project. It's used for:
- Testing new features before deploying to production
- Manual testing on a deployed environment
- Development without affecting the live system

## Key Principles
1. **Never change production credentials** in this repo
2. **Use separate test credentials** for test deployments
3. **Keep code changes** that can be copied back to production
4. **Isolate test data** from production data

---

## Environment Configuration Strategy

### Current Setup
- **Production**: Uses credentials from `.env` (DO NOT MODIFY)
- **Test Environment**: Will use separate credentials via environment variables

### Recommended Approach

#### Option 1: Environment-Specific `.env` Files (Recommended)
```
backend/
  .env                    # Production credentials (DO NOT MODIFY)
  .env.test              # Test environment credentials
  .env.local             # Local development (gitignored)
```

#### Option 2: Environment Variables in Deployment Platforms
- Vercel/Netlify: Set environment variables in dashboard
- No `.env` files needed in repo
- Production `.env` stays untouched

---

## Deployment Strategy

### Frontend (Vercel/Netlify)
1. **Create separate project** for test environment
2. **Set environment variables** in platform dashboard:
   - `VITE_API_URL` → Test backend URL
   - Other frontend env vars as needed

### Backend (Vercel/Railway/Render)
1. **Create separate backend deployment**
2. **Set environment variables**:
   - `DATABASE_URL` → Test database connection
   - `RAZORPAY_KEY_ID` → Test Razorpay keys (if available)
   - `RAZORPAY_KEY_SECRET` → Test Razorpay secret
   - All other API keys → Test versions

### Database (Supabase/Neon/Railway)
1. **Create new test database**
2. **Use different connection string**
3. **Run migrations** on test database
4. **Keep production database untouched**

---

## Recommended Services

### Database Options
1. **Supabase** (PostgreSQL)
   - Free tier: 500MB database
   - Easy setup, good for testing
   - Connection string format: `postgresql://user:pass@host:5432/dbname`

2. **Neon** (Serverless PostgreSQL)
   - Free tier available
   - Auto-scaling
   - Good for test environments

3. **Railway** (PostgreSQL)
   - Simple setup
   - $5/month for small projects
   - Includes database + backend hosting

### Backend Hosting
1. **Railway**
   - Easy deployment
   - Can host both backend + database
   - Good for testing

2. **Render**
   - Free tier available
   - Auto-deploy from Git
   - PostgreSQL addon available

3. **Vercel** (for Node.js)
   - Good for API routes
   - Serverless functions

### Frontend Hosting
1. **Vercel** (Recommended)
   - Excellent for React/Vite
   - Auto-deploy from Git
   - Free tier
   - Easy environment variable management

2. **Netlify**
   - Good alternative
   - Free tier
   - Easy setup

---

## Step-by-Step Setup

### 1. Create Test Database
```bash
# Option A: Supabase
1. Go to supabase.com
2. Create new project
3. Copy connection string
4. Use in test environment

# Option B: Neon
1. Go to neon.tech
2. Create project
3. Copy connection string
```

### 2. Set Up Backend Deployment
```bash
# On Railway/Render:
1. Connect GitHub repo
2. Set build command: cd backend && npm install && npm run build
3. Set start command: cd backend && npm start
4. Add environment variables:
   - DATABASE_URL (test database)
   - PORT=2000
   - All other API keys (test versions)
```

### 3. Set Up Frontend Deployment
```bash
# On Vercel:
1. Import project
2. Set root directory: user-panel (or admin-panel)
3. Build command: npm run build
4. Output directory: dist
5. Add environment variables:
   - VITE_API_URL=https://your-test-backend.railway.app
```

### 4. Environment Variable Template
Create `.env.test.example`:
```env
# Test Environment Variables
# Copy this to your deployment platform

# Database
DATABASE_URL=postgresql://test_user:test_pass@test_host:5432/test_db

# API URLs
VITE_API_URL=https://test-backend.railway.app

# Razorpay (Test Keys)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_secret_xxxxx

# Other services (test credentials)
WHATSAPP_TOKEN=test_token
SHIPROCKET_EMAIL=test@example.com
SHIPROCKET_PASSWORD=test_password
```

---

## Workflow

### Development Flow
1. **Make changes** in this test repo
2. **Test locally** with test database
3. **Deploy to test environment** (Vercel/Netlify)
4. **Test manually** on deployed test site
5. **If working**: Copy code changes to production repo
6. **Never copy** environment variables to production

### Code Sync Strategy
```bash
# When ready to deploy to production:
1. Copy code changes (not .env files)
2. Apply to production repo
3. Production uses its own .env (unchanged)
```

---

## Important Notes

### ✅ DO:
- Use separate test database
- Use test API keys where available
- Deploy to separate test URLs
- Test features thoroughly before production

### ❌ DON'T:
- Modify production `.env` file
- Use production database for testing
- Deploy test code directly to production
- Share production credentials in test environment

---

## Quick Commands

### Create Test Database Connection
```bash
# Test connection
psql $TEST_DATABASE_URL

# Run migrations on test DB
DATABASE_URL=$TEST_DATABASE_URL node backend/migrate.js
```

### Deploy Test Environment
```bash
# Backend (Railway example)
railway up --service backend

# Frontend (Vercel example)
vercel --prod
```

---

## Environment Variable Checklist

### Backend (Test)
- [ ] DATABASE_URL (test database)
- [ ] PORT
- [ ] RAZORPAY_KEY_ID (test)
- [ ] RAZORPAY_KEY_SECRET (test)
- [ ] WHATSAPP_TOKEN (test)
- [ ] SHIPROCKET_EMAIL (test)
- [ ] SHIPROCKET_PASSWORD (test)
- [ ] All other service credentials (test)

### Frontend (Test)
- [ ] VITE_API_URL (test backend URL)
- [ ] Any other frontend env vars

---

## Next Steps

1. **Choose database provider** (Supabase/Neon recommended)
2. **Set up test database**
3. **Choose hosting** (Railway/Render for backend, Vercel for frontend)
4. **Deploy test environment**
5. **Test thoroughly**
6. **Copy working code to production** (when ready)

---

## Test Environment Changes Tracking

### Latest Changes: Discount Features Update

**Date:** Latest Update  
**Feature:** Enhanced Discount Management System

#### Files Modified:

**Frontend:**
- `admin-panel/src/pages/discounts/Discounts.tsx`
  - Fixed "Create Discount" button functionality
  - Added usage limit per user field
  - Added fixed-price coupon generator with product selection

**Backend:**
- `backend/src/utils/schema.ts`
  - Added database migrations for new discount columns
  - Updated discount type constraints

- `backend/src/index.ts`
  - Enhanced `/api/discounts/apply` endpoint
  - Added per-user usage limit checking
  - Added fixed-price discount support

**Migration Scripts:**
- `backend/migrate-discount-features.js` - Database migration script

**Documentation:**
- `DISCOUNT_FEATURES_CHANGES.md` - Complete change documentation

#### Database Changes:
- ✅ `usage_limit_per_user` column added
- ✅ `product_id` column added  
- ✅ `is_one_time_use` column added
- ✅ Discount type constraint updated

#### Migration Status:
- ✅ Migration script executed successfully
- ✅ All database changes applied

---

## Previous Changes

### Coin Exploit Prevention
- Backend validation updates
- Order processing security enhancements

### Order Cancellation Logic
- Cancellation deadline tracking
- Status management updates

### Admin Notifications
- Real-time notification system
- Notification tracking tables


