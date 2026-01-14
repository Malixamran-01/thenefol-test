# Project Context

## Project Status
This is a **TEST COPY** of the production project (`thenefol`).

## Purpose
- Test new features before deploying to production
- Manual testing on deployed environment
- Development without affecting live system
- Safe experimentation space

## Key Rules

### ✅ DO:
- Make code changes here
- Test features thoroughly
- Deploy to separate test environment
- Use test credentials for test deployments
- Copy working code to production when ready

### ❌ DON'T:
- Modify production `.env` file
- Use production database
- Use production API keys
- Deploy test code directly to production
- Share production credentials

## Environment Strategy

### Production (Original Deployed Project)
- **Database**: Production database (DO NOT TOUCH)
- **API Keys**: Production keys (DO NOT MODIFY)
- **URLs**: thenefol.com
- **Status**: Live, working, do not modify credentials

### Test Environment (This Copy)
- **Database**: Separate test database (Supabase/Neon/Railway)
- **API Keys**: Test keys (rzp_test_*, test tokens, etc.)
- **URLs**: Test deployment URLs (Vercel/Netlify)
- **Status**: For testing and development

## Deployment Plan

### Backend
- **Platform**: Railway/Render/Vercel
- **Database**: Separate test database
- **Credentials**: Test versions only

### Frontend
- **Platform**: Vercel/Netlify
- **API URL**: Points to test backend
- **Environment**: Test environment variables

### Admin Panel
- **Platform**: Vercel/Netlify
- **API URL**: Points to test backend
- **Environment**: Test environment variables

## Code Sync Strategy

When features are ready:
1. Copy code changes (not `.env` files)
2. Apply to production repo
3. Production uses its own `.env` (unchanged)
4. Deploy production with existing credentials

## Current Features Being Tested
- Coin exploit prevention system
- Order cancellation logic
- Admin notifications
- Real-time updates
- **Discount Features Update** (Latest)
  - Fixed "Create Discount" button
  - Added usage limit per user
  - Added fixed-price coupon feature

## Recent File Changes

### Discount Features Update (Latest Changes)

**Frontend Files:**
- `admin-panel/src/pages/discounts/Discounts.tsx` - Updated discount management page with new features

**Backend Files:**
- `backend/src/utils/schema.ts` - Added database schema migrations for new discount columns
- `backend/src/index.ts` - Enhanced discount apply endpoint with per-user limits and fixed-price support

**Migration & Documentation:**
- `backend/migrate-discount-features.js` - Standalone migration script for database changes
- `DISCOUNT_FEATURES_CHANGES.md` - Complete documentation of all changes

**Database Changes Applied:**
- Added `usage_limit_per_user` column to `discounts` table
- Added `product_id` column to `discounts` table
- Added `is_one_time_use` column to `discounts` table
- Updated discount type constraint to include `'fixed_price'`

## Notes
- Production credentials remain in `.env` (for reference only)
- Test credentials go in deployment platform environment variables
- Never commit actual credentials to Git
- Always use separate test database


