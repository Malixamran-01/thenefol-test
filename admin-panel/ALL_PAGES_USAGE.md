# Admin Panel - Complete Pages Usage Documentation

## Overview
This comprehensive document lists all TSX page files in the admin panel, their routes, sidebar visibility, and detailed usage descriptions explaining what each page does and how it's used.

---

## Pages in Sidebar Navigation (68 pages)

### 1. Dashboard Section (10 pages)

#### 🏠 Dashboard (`Dashboard.tsx`)
- **Route**: `/admin/dashboard`
- **Usage**: Main admin dashboard showing key metrics and KPIs including:
  - Live visitor monitoring
  - Total sales, orders, sessions, conversion rates
  - Real-time analytics overview
  - Quick action items
  - Performance metrics with trend indicators
- **Purpose**: Central hub for admins to get an overview of business performance at a glance

#### 🏪 Online Store (`sales/OnlineStore.tsx`)
- **Route**: `/admin/store`
- **Usage**: Manage online store settings and configuration:
  - Store appearance and branding
  - Store settings and preferences
  - Domain and URL configuration
  - Store status and visibility controls
- **Purpose**: Configure and manage the main online storefront

#### 🏠 Homepage Layout (`HomepageLayoutManager.tsx`)
- **Route**: `/admin/homepage-layout`
- **Usage**: Design and customize the homepage layout:
  - Drag-and-drop layout builder
  - Section management (hero, features, products, etc.)
  - Content blocks arrangement
  - Homepage preview and publishing
- **Purpose**: Visual editor for customizing the store homepage structure and content

#### 🎁 Product Collections (`content/ProductCollections.tsx`)
- **Route**: `/admin/product-collections`
- **Usage**: Create and manage product collections/groupings:
  - Create themed collections (e.g., "Summer Sale", "Best Sellers")
  - Add/remove products from collections
  - Collection display settings
  - Featured collections management
- **Purpose**: Organize products into curated collections for better merchandising

#### 🌐 Marketplaces (`MarketplaceIntegrations.tsx`)
- **Route**: `/admin/marketplaces`
- **Usage**: Integrate with external marketplaces:
  - Connect to Amazon, Flipkart, etc.
  - Sync products to marketplaces
  - Manage marketplace listings
  - Order synchronization
- **Purpose**: Multi-channel selling by managing product listings across different marketplaces

#### 🛒 FB Shop Integration (`FBShopIntegration.tsx`)
- **Route**: `/admin/fb-shop`
- **Usage**: Integrate Facebook Shop:
  - Connect Facebook Shop account
  - Sync products to Facebook
  - Manage Facebook catalog
  - Track Facebook Shop orders
- **Purpose**: Enable selling directly through Facebook Shop

#### 📘 Meta Ads (`marketing/MetaAds.tsx`)
- **Route**: `/admin/meta-ads`
- **Usage**: Manage Meta (Facebook/Instagram) advertising:
  - Create and manage ad campaigns
  - Set ad budgets and targeting
  - Track ad performance
  - Manage ad creatives
- **Purpose**: Centralized management of Facebook and Instagram advertising campaigns

#### 🔍 Google & YouTube (`apps/GoogleYouTube.tsx`)
- **Route**: `/admin/google`
- **Usage**: Integrate Google services:
  - Google Shopping integration
  - YouTube channel management
  - Google Ads campaigns
  - Google Analytics integration
- **Purpose**: Manage Google ecosystem integrations for marketing and sales

#### 📘 Facebook & Instagram (`sales/FacebookInstagram.tsx`)
- **Route**: `/admin/facebook`
- **Usage**: Manage Facebook and Instagram sales:
  - View sales from social platforms
  - Manage social media product listings
  - Track social commerce performance
  - Social media order management
- **Purpose**: Monitor and manage sales originating from Facebook and Instagram

#### ⭐ Loyalty Program (`components/LoyaltyProgram.tsx`)
- **Route**: `/admin/loyalty-program`
- **Usage**: Configure customer loyalty program:
  - Set up points system
  - Define reward tiers
  - Configure earning and redemption rules
  - Track loyalty program performance
- **Purpose**: Build customer retention through rewards and points system

#### 💰 Cashback System (`components/CashbackSystem.tsx`)
- **Route**: `/admin/cashback`
- **Usage**: Manage cashback offers and campaigns:
  - Create cashback rules
  - Set cashback percentages
  - Track cashback redemptions
  - Manage cashback campaigns
- **Purpose**: Incentivize purchases through cashback rewards

---

### 2. Products & Catalog Section (5 pages)

#### 📦 Products (`catalog/Products.tsx`)
- **Route**: `/admin/products`
- **Usage**: Complete product management system:
  - Create, edit, delete products
  - Bulk import/export products (CSV/Excel)
  - Manage product details (title, description, price, SKU, HSN)
  - Upload product images (main image, PDP images, banner images)
  - Set product categories and tags
  - Manage product variants
  - Product SEO settings
  - Inventory tracking per product
  - Product status (active/inactive)
- **Purpose**: Central hub for managing the entire product catalog

#### 📁 Categories (`catalog/Categories.tsx`)
- **Route**: `/admin/categories`
- **Usage**: Organize products into categories:
  - Create hierarchical category structure
  - Assign products to categories
  - Category images and descriptions
  - Category SEO settings
  - Category display order
- **Purpose**: Organize products for better navigation and discoverability

#### 🔄 Product Variants (`ProductVariants.tsx`)
- **Route**: `/admin/product-variants`
- **Usage**: Manage product variations (size, color, etc.):
  - Create variant attributes (Size: S/M/L, Color: Red/Blue)
  - Set variant-specific pricing
  - Manage variant inventory
  - Variant images
  - Variant SKUs
- **Purpose**: Handle products with multiple options (e.g., T-shirt in different sizes and colors)

#### 📊 Inventory (`InventoryManagement.tsx`)
- **Route**: `/admin/inventory`
- **Usage**: Comprehensive inventory management:
  - View all products with stock levels
  - Track available vs reserved stock
  - Set low stock alerts and thresholds
  - Update stock quantities
  - Filter by low stock items
  - Search products by name/SKU
  - Expandable view showing all variants per product
- **Purpose**: Monitor and manage inventory levels across all products and variants

#### 🏭 Warehouses (`Warehouses.tsx`)
- **Route**: `/admin/warehouses`
- **Usage**: Manage warehouse locations:
  - Create multiple warehouse locations
  - Assign inventory to warehouses
  - Track stock per warehouse
  - Warehouse address and contact info
  - Transfer stock between warehouses
- **Purpose**: Multi-location inventory management for businesses with multiple warehouses

---

### 3. Sales & Orders Section (4 pages)

#### 📋 Orders (`sales/Orders.tsx`)
- **Route**: `/admin/orders`
- **Usage**: Complete order management system:
  - View all orders with filters (status, date range, payment status, COD)
  - Search orders by customer name or order number
  - Update order status (pending, paid, shipped, cancelled)
  - View order details (click to see full order)
  - Bulk order operations
  - Export orders
  - Real-time order updates via WebSocket
- **Purpose**: Manage all customer orders from placement to fulfillment

#### 🚚 Shipments (`sales/Shipments.tsx`)
- **Route**: `/admin/shipments`
- **Usage**: Manage order shipments:
  - Track shipment status
  - Assign tracking numbers
  - Update delivery status
  - Manage shipping carriers
  - Bulk shipment updates
  - Shipping label generation
- **Purpose**: Track and manage order deliveries

#### ↩️ Returns (`returns/Returns.tsx`)
- **Route**: `/admin/returns`
- **Usage**: Handle product returns and refunds:
  - Process return requests
  - Approve/reject returns
  - Manage refunds
  - Return reason tracking
  - Return status updates
- **Purpose**: Streamline the returns and refunds process

#### 💳 POS System (`POSSystem.tsx`)
- **Route**: `/admin/pos`
- **Usage**: Point of Sale system for physical stores:
  - Process in-store sales
  - Scan barcodes
  - Accept payments (cash, card, digital)
  - Print receipts
  - Manage store inventory
  - Sales reporting per location
- **Purpose**: Enable in-store sales processing alongside online orders

---

### 4. Content & CMS Section (5 pages)

#### 📄 CMS (`cms/CMSManagement.tsx`)
- **Route**: `/admin/cms`
- **Usage**: Content Management System with three tabs:
  - **Pages**: Create/edit CMS pages (About, Terms, Privacy, etc.)
  - **Sections**: Manage reusable content sections
  - **Settings**: Configure CMS preferences
  - Real-time updates via WebSocket
  - Toggle page visibility (published/draft)
- **Purpose**: Manage all website content pages and sections

#### 📝 Blog Requests (`blog/BlogRequestManagement.tsx`)
- **Route**: `/admin/blog-requests`
- **Usage**: Manage blog post requests:
  - Review blog post submissions
  - Approve/reject blog requests
  - Edit blog content before publishing
  - Schedule blog posts
  - Manage blog categories
- **Purpose**: Content moderation and blog management

#### 🎬 Video Manager (`components/VideoManager.tsx`)
- **Route**: `/admin/video-manager`
- **Usage**: Manage video content:
  - Upload and organize videos
  - Embed videos in products/pages
  - Video metadata and descriptions
  - Video categories and tags
  - Video analytics
- **Purpose**: Centralized video content management

#### 📃 Static Pages (`content/StaticPagesManagement.tsx`)
- **Route**: `/admin/static-pages`
- **Usage**: Manage static website pages:
  - Create/edit static pages (About Us, Contact, FAQ, etc.)
  - Page content editor
  - SEO settings per page
  - Page visibility controls
  - Custom page templates
- **Purpose**: Create and manage informational pages

#### 👥 Community Management (`content/CommunityManagement.tsx`)
- **Route**: `/admin/community-management`
- **Usage**: Manage community features:
  - User-generated content moderation
  - Reviews and ratings management
  - Community posts and discussions
  - User engagement tracking
  - Community guidelines
- **Purpose**: Foster and moderate community engagement

---

### 5. Customer & CRM Section (13 pages)

#### 👥 Customers (`crm/Customers.tsx`)
- **Route**: `/admin/customers`
- **Usage**: Customer relationship management:
  - View all customers
  - Customer profiles and details
  - Purchase history
  - Customer segmentation
  - Communication history
  - Customer lifetime value
- **Purpose**: Manage customer relationships and data

#### 👤 Users (`Users.tsx`)
- **Route**: `/admin/users`
- **Usage**: Manage user accounts:
  - View all registered users
  - User account details
  - Account status (active/suspended)
  - User roles and permissions
  - User activity tracking
- **Purpose**: Administer user accounts and access

#### 👤 User Profiles (`users/UserProfiles.tsx`)
- **Route**: `/admin/user-profiles`
- **Usage**: Detailed user profile management:
  - Extended user information
  - Profile completion tracking
  - User preferences
  - Social media connections
  - Profile verification
- **Purpose**: Comprehensive user profile administration

#### 🔔 User Notifications (`users/UserNotifications.tsx`)
- **Route**: `/admin/user-notifications`
- **Usage**: Manage user notifications:
  - Send notifications to users
  - Notification templates
  - Notification history
  - Notification preferences per user
  - Push notification management
- **Purpose**: Communicate with users through notifications

#### 🎯 Customer Segmentation (`components/CustomerSegmentation.tsx`)
- **Route**: `/admin/customer-segmentation`
- **Usage**: Create and manage customer segments:
  - Define segmentation rules (purchase history, demographics, behavior)
  - Create custom segments
  - Segment analytics
  - Targeted marketing per segment
  - Segment performance tracking
- **Purpose**: Group customers for targeted marketing campaigns

#### 👥 Custom Audience (`components/CustomAudience.tsx`)
- **Route**: `/admin/custom-audience`
- **Usage**: Create custom audiences for advertising:
  - Build audiences from customer data
  - Export audiences to ad platforms
  - Audience size and demographics
  - Lookalike audience creation
  - Audience performance tracking
- **Purpose**: Create targeted ad audiences from customer data

#### 📱 WhatsApp Subscriptions (`marketing/WhatsAppSubscriptions.tsx`)
- **Route**: `/admin/whatsapp-subscriptions`
- **Usage**: Manage WhatsApp opt-ins:
  - View all WhatsApp subscribers
  - Subscription status
  - Opt-in/opt-out management
  - Subscription analytics
  - Compliance tracking
- **Purpose**: Manage customer WhatsApp communication preferences

#### 💬 WhatsApp Chat (`components/WhatsAppChat.tsx`)
- **Route**: `/admin/whatsapp-chat`
- **Usage**: WhatsApp messaging interface:
  - Chat with customers via WhatsApp
  - Message history
  - Quick replies and templates
  - File sharing
  - Chat analytics
- **Purpose**: Direct customer communication through WhatsApp

#### 📱 WhatsApp Management (`whatsapp/WhatsAppManagement.tsx`)
- **Route**: `/admin/whatsapp-management`
- **Usage**: Comprehensive WhatsApp business management:
  - **Templates**: Create and manage message templates, sync with Meta
  - **Automations**: Set up automated WhatsApp flows and triggers
  - **Settings**: Configure WhatsApp Business API, webhook settings
  - Template approval status tracking
  - Automation performance analytics
- **Purpose**: Complete WhatsApp Business integration and automation

#### 📲 WhatsApp Notifications (`notifications/WhatsAppNotifications.tsx`)
- **Route**: `/admin/whatsapp-notifications`
- **Usage**: Send WhatsApp notifications:
  - Create notification campaigns
  - Schedule WhatsApp messages
  - Notification templates
  - Delivery status tracking
  - Notification analytics
- **Purpose**: Automated WhatsApp messaging campaigns

#### 🔄 Journey Funnel (`components/JourneyFunnel.tsx`)
- **Route**: `/admin/journey-funnel`
- **Usage**: Visualize customer journey funnel:
  - Funnel stages (Awareness → Consideration → Purchase)
  - Conversion rates at each stage
  - Drop-off analysis
  - Funnel optimization insights
- **Purpose**: Understand customer conversion journey

#### 🗺️ Journey Tracking (`components/CustomerJourneyTracking.tsx`)
- **Route**: `/admin/journey-tracking`
- **Usage**: Track individual customer journeys:
  - Customer touchpoints
  - Journey timeline
  - Interaction history
  - Journey analytics
  - Personalized journey insights
- **Purpose**: Track and analyze individual customer paths

#### 🎧 Live Chat (`components/LiveChat.tsx`)
- **Route**: `/admin/live-chat`
- **Usage**: Real-time customer support:
  - Live chat interface
  - Chat with website visitors
  - Chat history and transcripts
  - Canned responses
  - Chat analytics
- **Purpose**: Provide instant customer support via live chat

---

### 6. Finance & Payments Section (5 pages)

#### 📄 Invoices (`invoice/Invoice.tsx`)
- **Route**: `/admin/invoices`
- **Usage**: Invoice management:
  - Generate invoices for orders
  - View all invoices
  - Download/print invoices
  - Invoice status tracking
  - Invoice search and filters
- **Purpose**: Generate and manage customer invoices

#### ⚙️ Invoice Settings (`invoice/InvoiceSettings.tsx`)
- **Route**: `/admin/invoice-settings`
- **Usage**: Configure invoice settings:
  - Company details on invoices
  - Invoice numbering format
  - Tax information
  - Invoice templates
  - Payment terms
- **Purpose**: Customize invoice appearance and settings

#### 💳 Payment (`payment/Payment.tsx`)
- **Route**: `/admin/payment`
- **Usage**: Payment management:
  - View payment transactions
  - Payment status tracking
  - Refund processing
  - Payment gateway logs
  - Payment reconciliation
- **Purpose**: Monitor and manage all payment transactions

#### 💳 Payment Options (`components/PaymentOptions.tsx`)
- **Route**: `/admin/payment-options`
- **Usage**: Configure payment methods:
  - Enable/disable payment gateways
  - Configure payment methods (Credit Card, UPI, COD, etc.)
  - Payment gateway settings
  - Transaction fees configuration
  - Payment method display order
- **Purpose**: Manage available payment options for customers

#### 💰 Tax (`tax/Tax.tsx`)
- **Route**: `/admin/tax`
- **Usage**: Tax management:
  - Configure tax rates
  - Tax rules by location
  - GST/VAT settings
  - Tax exemptions
  - Tax reporting
- **Purpose**: Manage tax calculations and compliance

---

### 7. Marketing Section (2 pages)

#### 📢 Marketing (`marketing/Marketing.tsx`)
- **Route**: `/admin/marketing`
- **Usage**: Comprehensive marketing dashboard:
  - Email marketing campaigns
  - SMS marketing
  - Web push notifications
  - Marketing campaign performance
  - Campaign analytics
  - Marketing automation
- **Purpose**: Central hub for all marketing activities

#### 🏷️ Discounts (`discounts/Discounts.tsx`)
- **Route**: `/admin/discounts`
- **Usage**: Manage discount codes and offers:
  - Create discount codes
  - Set discount rules (percentage, fixed amount)
  - Discount validity periods
  - Usage limits
  - Minimum order requirements
  - Discount analytics
- **Purpose**: Create and manage promotional discounts

---

### 8. Affiliate & Monetization Section (4 pages)

#### 🤝 Affiliate Program (`AffiliateManagement.tsx`)
- **Route**: `/admin/affiliate-program`
- **Usage**: Manage affiliate program:
  - View all affiliates
  - Affiliate performance tracking
  - Commission settings
  - Affiliate payouts
  - Affiliate dashboard access
  - Program rules and terms
- **Purpose**: Run and manage referral/affiliate marketing program

#### 📋 Affiliate Requests (`AffiliateRequests.tsx`)
- **Route**: `/admin/affiliate-requests`
- **Usage**: Process affiliate applications:
  - Review affiliate applications
  - Approve/reject requests
  - Set commission rates per affiliate
  - Affiliate onboarding
- **Purpose**: Manage affiliate program enrollment

#### 💸 Coin Withdrawals (`CoinWithdrawals.tsx`)
- **Route**: `/admin/coin-withdrawals`
- **Usage**: Process coin/points withdrawals:
  - View withdrawal requests
  - Approve/reject withdrawals
  - Process payouts
  - Withdrawal history
  - Payment method verification
- **Purpose**: Handle customer coin/points redemption requests

#### ⭐ Loyalty Program Management (`users/LoyaltyProgramManagement.tsx`)
- **Route**: `/admin/loyalty-program-management`
- **Usage**: Advanced loyalty program management:
  - Configure loyalty tiers
  - Points earning rules
  - Redemption options
  - Member management
  - Program analytics
  - Special promotions
- **Purpose**: Detailed management of loyalty program operations

---

### 9. Analytics & Insights Section (4 pages)

#### 📊 Analytics (`analytics/Analytics.tsx`)
- **Route**: `/admin/analytics`
- **Usage**: Main analytics dashboard:
  - Sessions, page views, bounce rate
  - Conversion rate tracking
  - Revenue and orders analytics
  - Customer metrics
  - Time range selection (7d, 30d, 90d, custom)
  - Chart visualizations
  - Top pages analysis
- **Purpose**: Comprehensive business analytics and reporting

#### 📈 Advanced Analytics (`components/AdvancedAnalytics.tsx`)
- **Route**: `/admin/advanced-analytics`
- **Usage**: Deep-dive analytics:
  - Cohort analysis
  - Funnel analysis
  - Customer lifetime value
  - Retention analysis
  - Advanced segmentation
  - Predictive analytics
- **Purpose**: Advanced data analysis for strategic decisions

#### 📈 Actionable Analytics (`components/ActionableAnalytics.tsx`)
- **Route**: `/admin/actionable-analytics`
- **Usage**: Insights with recommended actions:
  - AI-powered insights
  - Action recommendations
  - Performance alerts
  - Optimization suggestions
  - Trend predictions
- **Purpose**: Get actionable insights from analytics data

#### 📜 Audit Logs (`system/AuditLogs.tsx`)
- **Route**: `/admin/system/audit-logs`
- **Usage**: Track all system activities:
  - User actions log
  - Data changes history
  - Login/logout tracking
  - Permission changes
  - System events
  - Search and filter logs
- **Purpose**: Security and compliance tracking

---

### 10. E-Commerce Section (1 page)

#### 🛒 Cart & Checkout (`ecommerce/CartCheckoutManagement.tsx`)
- **Route**: `/admin/cart-checkout`
- **Usage**: Manage cart and checkout process:
  - Cart abandonment tracking
  - Checkout optimization
  - Shipping options configuration
  - Checkout field customization
  - Cart recovery campaigns
  - Checkout analytics
- **Purpose**: Optimize the shopping cart and checkout experience

---

### 13. Forms & Communication Section (5 pages)

#### 📋 Forms (`apps/Forms.tsx`)
- **Route**: `/admin/forms`
- **Usage**: Manage custom forms:
  - View all forms
  - Form templates
  - Form settings
  - Form analytics
- **Purpose**: Manage custom form collection

#### 📋 Form Builder (`components/FormBuilder.tsx`)
- **Route**: `/admin/form-builder`
- **Usage**: Visual form builder:
  - Drag-and-drop form creation
  - Add form fields (text, email, dropdown, etc.)
  - Form validation rules
  - Form styling
  - Conditional logic
- **Purpose**: Create custom forms without coding

#### 📝 Form Submissions (`FormSubmissions.tsx`)
- **Route**: `/admin/form-submissions`
- **Usage**: View and manage form submissions:
  - All form entries
  - Export submissions
  - Filter and search
  - Submission details
  - Response management
- **Purpose**: Collect and manage data from custom forms

#### 📧 Contact Messages (`ContactMessages.tsx`)
- **Route**: `/admin/contact-messages`
- **Usage**: Manage contact form messages:
  - View customer inquiries
  - Reply to messages
  - Mark as read/unread
  - Assign to team members
  - Message search
- **Purpose**: Handle customer inquiries and support requests

#### 🔔 Alert Settings (`system/AlertSettings.tsx`)
- **Route**: `/admin/system/alerts`
- **Usage**: Configure system alerts:
  - Email notification settings
  - Alert triggers (low stock, new orders, etc.)
  - Alert recipients
  - Alert frequency
  - Alert channels (email, SMS, push)
- **Purpose**: Configure automated alerts and notifications

---

### 14. Team & Access Section (4 pages)

#### 🧑‍💼 Staff Accounts (`system/Staff.tsx`)
- **Route**: `/admin/system/staff`
- **Usage**: Manage staff/admin accounts:
  - Create staff accounts
  - Assign roles and permissions
  - Staff activity tracking
  - Account status management
  - Staff performance
- **Purpose**: Manage team member access and permissions

#### 👨‍💼 Admin Management (`system/AdminManagement.tsx`)
- **Route**: `/admin/system/admin-management`
- **Usage**: Manage admin users:
  - Create/edit admin accounts
  - Admin roles and permissions
  - Admin activity logs
  - Access control
  - Admin hierarchy
- **Purpose**: Control admin-level access and permissions

#### 🗂️ Roles & Permissions (`system/RolesPermissions.tsx`)
- **Route**: `/admin/system/roles`
- **Usage**: Define roles and permissions:
  - Create custom roles
  - Assign permissions to roles
  - Permission groups
  - Role hierarchy
  - Permission testing
- **Purpose**: Fine-grained access control system

#### 🔐 Account Security (`account/AccountSecurity.tsx`)
- **Route**: `/admin/account-security`
- **Usage**: Account security settings:
  - Change password
  - Two-factor authentication
  - Login history
  - Active sessions
  - Security alerts
- **Purpose**: Manage personal account security settings

---

### 15. Settings (1 page)

#### ⚙️ Settings (`system/Settings.tsx`)
- **Route**: `/admin/settings`
- **Usage**: General system settings:
  - Store information
  - General preferences
  - Email settings
  - Currency and locale
  - Maintenance mode
  - System configuration
- **Purpose**: Configure overall system and store settings

---

## Pages NOT in Sidebar (3 pages)

### Detail/Dynamic Pages (2 pages)

#### 📋 Order Details (`sales/OrderDetails.tsx`)
- **Route**: `/admin/orders/:orderNumber`
- **Usage**: Detailed view of a specific order:
  - Complete order information
  - Customer details
  - Order items and quantities
  - Payment information
  - Shipping details
  - Order status history
  - Update order status
  - Print invoice
- **Purpose**: View and manage individual order details
- **Access**: Click on any order from the Orders list page

#### 👤 User Detail (`users/UserDetail.tsx`)
- **Route**: `/admin/users/:id`
- **Usage**: Detailed view of a specific user:
  - Complete user profile
  - Order history
  - Account activity
  - Preferences
  - Communication history
  - Account actions
- **Purpose**: View and manage individual user accounts
- **Access**: Click on any user from the Users list page

### Authentication Page (1 page)

#### 🔐 Login (`Login.tsx`)
- **Route**: `/admin/login`
- **Usage**: Admin authentication:
  - Staff/admin login
  - Email and password authentication
  - Session management
  - Redirect to dashboard after login
- **Purpose**: Secure access to admin panel
- **Access**: Public route (outside main layout)

---

## Summary Statistics

- **Total TSX Page Files**: 54
- **Pages in Sidebar**: 68 (includes component-based pages)
- **Pages NOT in Sidebar**: 3
  - 2 Dynamic/Detail pages (OrderDetails, UserDetail)
  - 1 Authentication page (Login - outside layout)
- **Total Routes**: 70
- **Sidebar Navigation Sections**: 15

---

## Usage Categories

### Product Management (5 pages)
Products, Categories, Product Variants, Inventory, Warehouses

### Sales & Fulfillment (4 pages)
Orders, Shipments, Returns, POS System

### Customer Management (13 pages)
Customers, Users, User Profiles, User Notifications, Segmentation, Custom Audience, WhatsApp features, Journey tracking, Live Chat

### Content Management (5 pages)
CMS, Blog Requests, Video Manager, Static Pages, Community Management

### Marketing & Growth (6 pages)
Marketing, Discounts, Meta Ads, Affiliate Program, Loyalty Program, Cashback

### Analytics & Insights (4 pages)
Analytics, Advanced Analytics, Actionable Analytics, Audit Logs

### Finance & Payments (5 pages)
Invoices, Invoice Settings, Payment, Payment Options, Tax

### Automation & AI (0 pages)

### System & Settings (6 pages)
Settings, Staff, Admin Management, Roles & Permissions, Account Security, Alert Settings

### E-Commerce & Forms (4 pages)
Cart & Checkout, Forms, Form Builder, Form Submissions

### Integrations (4 pages)
Marketplaces, FB Shop, Google & YouTube, Facebook & Instagram

---

## Notes

1. **Component-based Pages**: Some pages are implemented as components in `src/components/` but have dedicated routes and appear in the sidebar (e.g., `LoyaltyProgram`, `CashbackSystem`, `WhatsAppChat`, etc.)

2. **Dynamic Routes**: OrderDetails and UserDetail are detail pages that don't need direct sidebar links as they're accessed by clicking items from their respective list pages.

3. **Permission Protection**: Some routes are protected by role/permission checks:
   - Admin-only: `/admin/system/*`, `/admin/marketplaces`
   - Permission-based: `/admin/pos` (requires `pos:read` or `pos:update`)

4. **All Main Pages Are Accessible**: Every main feature page has a corresponding sidebar navigation item, making all functionality easily accessible.

5. **Real-time Updates**: Many pages use WebSocket connections for real-time data updates (Orders, Products, CMS, etc.)

---

## File Locations

- **Page Components**: `admin-panel/src/pages/`
- **Component Pages**: `admin-panel/src/components/`
- **Routes**: `admin-panel/src/App.tsx`
- **Sidebar Navigation**: `admin-panel/src/layouts/Layout.tsx`

---

## Quick Reference by Function

**Want to manage products?** → Products, Categories, Product Variants, Inventory, Warehouses

**Want to handle orders?** → Orders, Shipments, Returns, POS System

**Want to analyze performance?** → Analytics, Advanced Analytics, Actionable Analytics

**Want to market?** → Marketing, Discounts, Meta Ads, Affiliate Program

**Want to manage customers?** → Customers, Users, User Profiles, Customer Segmentation

**Want to configure?** → Settings, Roles & Permissions, Staff, Admin Management

**Want to automate?** → (coming soon)

**Want to integrate?** → Marketplaces, FB Shop, Google & YouTube
