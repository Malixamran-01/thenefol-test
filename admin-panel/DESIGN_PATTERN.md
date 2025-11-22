# Admin Panel Design Pattern - User Panel Home Page Style

This document outlines the design pattern to apply the user panel home page styling to all admin panel pages.

## Design System

### Colors (Arctic Blue Theme)
```css
--arctic-blue-primary: #7DD3D3;
--arctic-blue-primary-hover: #5EC4C4;
--arctic-blue-primary-dark: #4A9FAF;
--arctic-blue-light: #E0F5F5;
--arctic-blue-lighter: #F0F9F9;
--arctic-blue-background: #F4F9F9;
```

### Typography
- **Headings**: Cormorant Garamond, font-weight: 300, letter-spacing: 0.15em
- **Body**: Inter/Montserrat, font-weight: 400-500
- **Text Colors**: 
  - Primary: #1a1a1a
  - Secondary: #333743
  - Muted: #666

### Spacing
- Page container: `space-y-8` (32px between sections)
- Cards: `padding: 32px`, `border-radius: 16px`
- Buttons: `padding: 12px 32px`, `border-radius: 12px`

## Page Structure Pattern

### 1. Add Style Variables
At the top of each page component's return statement:

```tsx
<div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
  <style>{`
    :root {
      --arctic-blue-primary: #7DD3D3;
      --arctic-blue-primary-hover: #5EC4C4;
      --arctic-blue-primary-dark: #4A9FAF;
      --arctic-blue-light: #E0F5F5;
      --arctic-blue-lighter: #F0F9F9;
      --arctic-blue-background: #F4F9F9;
    }
  `}</style>
  {/* Rest of page content */}
</div>
```

### 2. Update Page Headers

**Before:**
```tsx
<h1 className="text-2xl font-bold text-gray-900">Page Title</h1>
<p className="text-gray-600">Description</p>
```

**After:**
```tsx
<h1 
  className="text-3xl font-light mb-2 tracking-[0.15em]" 
  style={{
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
    letterSpacing: '0.15em'
  }}
>
  Page Title
</h1>
<p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
  Description
</p>
```

### 3. Update Cards

**Before:**
```tsx
<div className="bg-white rounded-lg p-4 shadow-sm">
```

**After:**
```tsx
<div className="metric-card">
  {/* Content */}
</div>
```

### 4. Update Buttons

Buttons already use `.btn-primary` and `.btn-secondary` classes which have been updated in `styles.css`.

### 5. Update Input Fields

**Before:**
```tsx
<input className="input" />
```

**After:**
```tsx
<input 
  className="px-4 py-2 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
  style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
/>
```

### 6. Update Tables

**Table Headers:**
```tsx
<thead className="border-b text-xs uppercase" style={{ borderColor: 'var(--arctic-blue-light)', color: 'var(--text-muted)' }}>
```

**Table Rows:**
```tsx
<tr className="border-b transition-colors hover:bg-[var(--arctic-blue-lighter)]" style={{ borderColor: 'var(--arctic-blue-light)' }}>
```

### 7. Update Stats/Metrics

**Before:**
```tsx
<p className="text-2xl font-bold text-gray-900">{value}</p>
```

**After:**
```tsx
<p className="text-2xl font-light" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)' }}>
  {value}
</p>
```

## Files Updated

✅ Dashboard.tsx
✅ Orders.tsx
✅ Products.tsx
✅ Customers.tsx
✅ styles.css (global styles)

## Remaining Pages to Update

Apply the pattern above to all remaining pages in:
- Sales & Orders (Shipments, Returns, OrderDetails)
- Catalog Management (Categories, Inventory, ProductVariants)
- Customers & CRM (Customer Segmentation, Journey Tracking, Journey Funnel)
- Customer Engagement (all pages)
- Marketing (all pages)
- AI Features (all pages)
- Analytics (all pages)
- Finance (all pages)
- Content (all pages)
- Notifications (all pages)
- Automation (all pages)
- System (all pages)
- Sales Channels (all pages)
- Operations (all pages)

## Quick Checklist

For each page:
- [ ] Add style variables at top of return
- [ ] Update page header (h1 and description)
- [ ] Update all cards to use `metric-card` class
- [ ] Update input fields styling
- [ ] Update table styling
- [ ] Update button classes (already styled globally)
- [ ] Update stats/metrics typography
- [ ] Test responsive design

