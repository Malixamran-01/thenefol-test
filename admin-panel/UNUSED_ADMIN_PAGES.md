## Removed/Unused Admin Pages

These pages existed in `src/pages` but were not wired into routes or the sidebar layout. They have been removed from the codebase to keep the admin panel clean and maintainable.

- `CMS.tsx` (replaced by `cms/CMSManagement.tsx`)
- `system/Login.tsx` (old login page – `Login.tsx` is used instead)
- `system/Dashboard.tsx` (unused duplicate of main `Dashboard.tsx`)
- `finance/Invoice.tsx` (replaced by `invoice/Invoice.tsx`)
- `finance/Tax.tsx` (replaced by `tax/Tax.tsx`)
- `finance/Returns.tsx` (replaced by `returns/Returns.tsx`)
- `finance/Payment.tsx` (replaced by `payment/Payment.tsx`)

If you need any of these flows in the future, prefer re‑creating them based on the current, in‑use pages so they stay aligned with the latest design and logic.


