# Discount Features Update - Files Changed

## Summary
This document lists all files modified to implement the new discount features:
1. Fixed "Create Discount" button
2. Added usage limit per user
3. Added fixed-price coupon feature

---

## Files Modified

### Frontend (Admin Panel)

1. **`admin-panel/src/pages/discounts/Discounts.tsx`**
   - Fixed "Create Discount" button to switch to 'create' tab
   - Added `usage_limit_per_user` field to form state and UI
   - Added fixed-price coupon generator section with:
     - Product dropdown selector
     - Fixed price input
     - Code generation functionality
     - Copy to clipboard feature
   - Updated Discount type to include `fixed_price` type
   - Added product loading functionality
   - Enhanced form handlers to support new fields

### Backend

2. **`backend/src/utils/schema.ts`**
   - Added migration for `usage_limit_per_user` column
   - Added migration for `product_id` column (for product-specific discounts)
   - Added migration for `is_one_time_use` column
   - Updated discount type constraint to include `'fixed_price'`
   - All migrations are in a DO block that runs automatically on backend start

3. **`backend/src/index.ts`**
   - Enhanced `/api/discounts/apply` endpoint to:
     - Accept `customer_email` and `product_id` parameters
     - Check per-user usage limits
     - Validate product-specific discounts
     - Handle `fixed_price` discount type calculations
     - Enforce one-time use restrictions
   - Updated discount application logic to return `finalPrice` for fixed-price coupons

---

## Database Schema Changes

The following columns were added to the `discounts` table:

1. **`usage_limit_per_user`** (integer, nullable)
   - Maximum number of times a single user can use the discount code
   - If null, no per-user limit is enforced

2. **`product_id`** (integer, nullable, foreign key to products)
   - Links discount to a specific product
   - If null, discount applies to all products
   - Used for fixed-price coupons

3. **`is_one_time_use`** (boolean, default false)
   - Marks discount as one-time use only
   - Automatically set to true for fixed-price coupons

4. **Updated `type` constraint**
   - Now allows: `'percentage'`, `'fixed'`, `'free_shipping'`, `'fixed_price'`

---

## Migration Status

✅ **Automatic Migration**: The schema changes are included in `backend/src/utils/schema.ts` and will run automatically when the backend starts via the `ensureSchema()` function.

✅ **Manual Migration**: A standalone migration script is available at `backend/migrate-discount-features.js` for immediate application.

---

## How to Apply Database Changes

### Option 1: Automatic (Recommended)
The migrations will run automatically when you start the backend server. The `ensureSchema()` function checks for existing columns and only adds them if they don't exist.

### Option 2: Manual Migration Script
Run the migration script manually:
```bash
cd backend
node migrate-discount-features.js
```

---

## Testing Checklist

- [ ] "Create Discount" button switches to create tab
- [ ] Usage limit per user field appears in form
- [ ] Fixed-price coupon generator section is visible
- [ ] Product dropdown loads products correctly
- [ ] Fixed-price code generation works
- [ ] Copy to clipboard functionality works
- [ ] Per-user usage limits are enforced
- [ ] Product-specific discounts work correctly
- [ ] One-time use discounts are enforced
- [ ] Fixed-price discounts calculate correctly

---

## Notes

- All existing discounts will continue to work
- New fields are nullable, so existing data is safe
- The migration is idempotent (safe to run multiple times)
- Fixed-price coupons automatically set `is_one_time_use` to true
