# Fix All Hardcoded Production URLs

## Problem
Many admin-panel pages have inline `getApiBase()` functions that hardcode production URLs, causing test deployments to affect production.

## Solution
Replace all inline `getApiBase()` functions with the centralized `getApiBaseUrl()` from `utils/apiUrl.ts` which respects `VITE_API_URL`.

## Files to Fix

### Admin Panel Pages (29 files):
1. ✅ `pages/catalog/Products.tsx` - FIXED
2. ⏳ `pages/Dashboard.tsx` - FIXED
3. ⏳ `pages/sales/Orders.tsx` - FIXED
4. ⏳ `pages/sales/OrderDetails.tsx`
5. ⏳ `pages/sales/Shipments.tsx`
6. ⏳ `pages/sales/FacebookInstagram.tsx`
7. ⏳ `pages/returns/Returns.tsx` (5 instances)
8. ⏳ `pages/payment/Payment.tsx`
9. ⏳ `pages/tax/Tax.tsx`
10. ⏳ `pages/whatsapp/WhatsAppManagement.tsx`
11. ⏳ `pages/users/UserDetail.tsx` (4 instances)
12. ⏳ `pages/system/Staff.tsx`
13. ⏳ `pages/system/AdminManagement.tsx`
14. ⏳ `pages/system/AuditLogs.tsx`
15. ⏳ `pages/system/RolesPermissions.tsx`
16. ⏳ `pages/cms/CMSManagement.tsx`
17. ⏳ `pages/discounts/Discounts.tsx`
18. ⏳ `pages/content/ProductCollections.tsx` (3 instances)
19. ⏳ `pages/crm/Customers.tsx`
20. ⏳ `pages/invoice/Invoice.tsx` (3 instances)
21. ⏳ `pages/invoice/InvoiceSettings.tsx` (4 instances)
22. ⏳ `pages/marketing/Marketing.tsx`
23. ⏳ `pages/marketing/MetaAds.tsx`
24. ⏳ `pages/apps/GoogleYouTube.tsx`
25. ⏳ `pages/apps/Forms.tsx`
26. ⏳ `pages/CoinWithdrawals.tsx` (2 instances)
27. ⏳ `pages/FBShopIntegration.tsx`
28. ⏳ `pages/analytics/Analytics.tsx`
29. ⏳ `pages/InventoryManagement.tsx`

### Admin Panel Components:
30. ⏳ `components/WhatsAppChat.tsx` (3 instances)

## Pattern to Replace

### OLD (Hardcoded):
```typescript
const getApiBase = () => {
  // Always use production URL - no environment variables
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
      return `${window.location.protocol}//${window.location.host}/api`
    }
    // For any other domain, always use production URL
    return 'https://thenefol.com/api'
  }
  return 'https://thenefol.com/api'
}
const apiBase = getApiBase()
```

### NEW (Respects VITE_API_URL):
```typescript
import { getApiBaseUrl } from '../../utils/apiUrl'

// Then use:
const apiBase = getApiBaseUrl()
```

## Steps

1. Add import at top: `import { getApiBaseUrl } from '../../utils/apiUrl'`
2. Remove the entire `getApiBase()` function
3. Replace `const apiBase = getApiBase()` with `const apiBase = getApiBaseUrl()`

## Verification

After fixing, verify:
- All files import `getApiBaseUrl` from `utils/apiUrl`
- No hardcoded `'https://thenefol.com/api'` strings remain
- All API calls use the centralized utility
