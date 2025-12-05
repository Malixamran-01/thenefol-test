# Admin Panel Routing Structure

## Overview
All admin panel routes are organized under `/admin` prefix with proper authentication and authorization.

## Route Organization

### Authentication
- `/admin/login` - Login page (public)

### Protected Routes (require authentication)
All routes below require authentication via `ProtectedRoute` component.

---

### Dashboard
- `/admin/dashboard` - Main dashboard (default redirect from `/admin`)

---

### Products & Catalog
- `/admin/products` - Products management
- `/admin/product-variants` - Product variants management
- `/admin/categories` - Categories management
- `/admin/product-collections` - Product collections management

---

### Inventory & Warehouses
- `/admin/inventory` - Inventory management
- `/admin/warehouses` - Warehouses management

---

### Sales & Orders
- `/admin/orders` - Orders list
- `/admin/orders/:orderNumber` - Order details (dynamic route)
- `/admin/shipments` - Shipments management
- `/admin/returns` - Returns management

---

### Customers & Users
- `/admin/customers` - Customers list
- `/admin/users` - Users management
- `/admin/users/:id` - User detail page (dynamic route)
- `/admin/user-profiles` - User profiles management
- `/admin/user-notifications` - User notifications
- `/admin/contact-messages` - Contact messages

---

### Finance & Payments
- `/admin/invoices` - Invoices list
- `/admin/invoice-settings` - Invoice settings
- `/admin/tax` - Tax management
- `/admin/payment` - Payment management
- `/admin/payment-options` - Payment options configuration
- `/admin/coin-withdrawals` - Coin withdrawals

---

### Marketing & Communications
- `/admin/marketing` - Marketing dashboard
- `/admin/meta-ads` - Meta Ads management
- `/admin/discounts` - Discounts management
- `/admin/whatsapp-subscriptions` - WhatsApp subscriptions
- `/admin/whatsapp-notifications` - WhatsApp notifications
- `/admin/whatsapp-chat` - WhatsApp chat interface
- `/admin/whatsapp-management` - WhatsApp management

---

### Analytics & Reporting
- `/admin/analytics` - Main analytics dashboard
- `/admin/advanced-analytics` - Advanced analytics
- `/admin/actionable-analytics` - Actionable analytics
- `/admin/journey-tracking` - Customer journey tracking
- `/admin/journey-funnel` - Journey funnel analysis

---

### Customer Engagement
- `/admin/loyalty-program` - Loyalty program
- `/admin/loyalty-program-management` - Loyalty program management
- `/admin/affiliate-program` - Affiliate program
- `/admin/affiliate-requests` - Affiliate requests
- `/admin/cashback` - Cashback system
- `/admin/live-chat` - Live chat interface
- `/admin/customer-segmentation` - Customer segmentation

---

### AI & Personalization
- `/admin/ai-box` - AI Box
- `/admin/ai-personalization` - AI personalization
- `/admin/custom-audience` - Custom audience management

---

### Content Management
- `/admin/cms` - CMS management
- `/admin/static-pages` - Static pages management
- `/admin/community-management` - Community management
- `/admin/homepage-layout` - Homepage layout manager
- `/admin/blog-requests` - Blog requests management
- `/admin/video-manager` - Video manager

---

### E-commerce & Forms
- `/admin/cart-checkout` - Cart & checkout management
- `/admin/forms` - Forms list
- `/admin/form-builder` - Form builder
- `/admin/form-submissions` - Form submissions
- `/admin/workflow-automation` - Workflow automation

---

### Integrations & Channels
- `/admin/omni-channel` - Omni-channel management
- `/admin/api-manager` - API manager
- `/admin/marketplaces` - Marketplace integrations (Admin only)
- `/admin/facebook` - Facebook/Instagram integration
- `/admin/fb-shop` - Facebook Shop integration
- `/admin/store` - Online store management
- `/admin/google` - Google/YouTube integration

---

### POS System
- `/admin/pos` - POS system (requires `pos:read` or `pos:update` permission)

---

### System & Settings
- `/admin/settings` - General settings
- `/admin/system/alerts` - Alert settings (Admin only)
- `/admin/system/staff` - Staff management (Admin only)
- `/admin/system/roles` - Roles & permissions (Admin only)
- `/admin/system/audit-logs` - Audit logs (Admin only)

---

## Route Protection

### Authentication
- All routes except `/admin/login` are protected by `ProtectedRoute` component
- Unauthenticated users are redirected to `/admin/login`

### Authorization
- **Admin-only routes**: Protected by `<Can role="admin">` component
  - `/admin/system/*` routes
  - `/admin/marketplaces`
  
- **Permission-based routes**: Protected by `<Can anyOf={[...]}>` component
  - `/admin/pos` - Requires `pos:read` or `pos:update` permission

---

## Dynamic Routes

1. **Order Details**: `/admin/orders/:orderNumber`
   - Parameter: `orderNumber` (string)
   - Example: `/admin/orders/ORD-12345`

2. **User Detail**: `/admin/users/:id`
   - Parameter: `id` (string/number)
   - Example: `/admin/users/123`

---

## Default Routes

- `/admin` → Redirects to `/admin/dashboard`
- `*` (catch-all) → Redirects to `/admin/dashboard`

---

## Route Structure in Code

Routes are organized in `admin-panel/src/App.tsx` with clear section comments:
- Each section is grouped by functionality
- Routes are ordered logically within each section
- Comments make it easy to find and maintain routes

---

## Notes

- **CMS.tsx**: Exists in codebase but not routed (CMSManagement is used instead)
- **System/Login.tsx**: Exists but not used (Login.tsx is the active login page)
- All routes use kebab-case for consistency
- Dynamic routes use colon notation (`:paramName`)

---

## Total Routes

- **Total unique routes**: 70
- **Dynamic routes**: 2
- **Admin-only routes**: 5
- **Permission-based routes**: 1
- **Public routes**: 1 (login)

