import { SITE_BRANDING_DEFAULTS } from './siteBranding'

/** Brand suffix + homepage title/description; updated from CMS settings (see applySiteBranding). */
const brand = {
  name: SITE_BRANDING_DEFAULTS.site_brand_name as string,
  homeTitle: SITE_BRANDING_DEFAULTS.site_browser_title as string,
  homeDescription: SITE_BRANDING_DEFAULTS.site_meta_description as string,
}

export function setBrandDefaults(next: { name?: string; homeTitle?: string; homeDescription?: string }) {
  if (next.name) brand.name = next.name
  if (next.homeTitle) brand.homeTitle = next.homeTitle
  if (next.homeDescription) brand.homeDescription = next.homeDescription
}

function setMetaTag(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

/**
 * Browser tab title + description for the current page.
 * `title` omitted → homepage title from CMS. Otherwise "<title> | NEFOL".
 */
export function setPageMeta(title?: string | null, description?: string | null) {
  if (typeof document === 'undefined') return
  const fullTitle = title ? `${title} | ${brand.name}` : brand.homeTitle
  if (document.title !== fullTitle) document.title = fullTitle
  const desc = (description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) || brand.homeDescription
  setMetaTag('meta[name="description"]', 'name', 'description', desc)
}

/** rel=canonical for pages with a clean URL (products). Pass null to remove it. */
export function setCanonical(url: string | null) {
  if (typeof document === 'undefined') return
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
  if (!url) {
    link?.remove()
    return
  }
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

const ROUTE_TITLES: Record<string, string> = {
  '/user/shop': 'Shop All Products',
  '/user/skincare': 'Skincare',
  '/user/face': 'Face Care',
  '/user/body': 'Body Care',
  '/user/hair': 'Hair Care',
  '/user/combos': 'Combos & Kits',
  '/user/gifting': 'Gifting',
  '/user/offers': 'Offers',
  '/user/new-arrivals': 'New Arrivals',
  '/user/best-sellers': 'Best Sellers',
  '/user/ingredients': 'Our Ingredients',
  '/user/blue-tea-benefits': 'Blue Tea Benefits',
  '/user/search': 'Search',
  '/user/wishlist': 'Wishlist',
  '/user/checkout': 'Checkout',
  '/user/login': 'Login',
  '/user/signup': 'Create Account',
  '/user/reset-password': 'Reset Password',
  '/user/profile': 'My Profile',
  '/user/account': 'My Account',
  '/user/orders': 'My Orders',
  '/user/user-orders': 'My Orders',
  '/user/track-order': 'Track Order',
  '/user/manage-address': 'Saved Addresses',
  '/user/saved-cards': 'Saved Cards',
  '/user/payment-methods': 'Payment Methods',
  '/user/nefol-coins': 'Nefol Coins',
  '/user/coin-withdrawal': 'Withdraw Coins',
  '/user/loyalty-rewards': 'Loyalty Rewards',
  '/user/notifications': 'Notifications',
  '/user/privacy-security': 'Privacy & Security',
  '/user/about': 'About Us',
  '/user/contact': 'Contact Us',
  '/user/faq': 'FAQs',
  '/user/usp': 'Why NEFOL',
  '/user/privacy-policy': 'Privacy Policy',
  '/user/refund-policy': 'Refund Policy',
  '/user/shipping-policy': 'Shipping Policy',
  '/user/terms-of-service': 'Terms of Service',
  '/user/creator-agreement': 'Creator Agreement',
  '/user/store-locator': 'Store Locator',
  '/user/skin-quiz': 'Skin Quiz',
  '/user/shade-finder': 'Shade Finder',
  '/user/sustainability': 'Sustainability',
  '/user/press': 'Press & Media',
  '/user/community': 'Community',
  '/user/blog': 'Nefol Social',
  '/user/blog/explore': 'Explore | Nefol Social',
  '/user/blog/ask-community': 'Ask the Community',
  '/user/blog/ask-community/new': 'Ask a Question',
  '/user/blog/activity': 'Activity | Nefol Social',
  '/user/blog/dashboard': 'Creator Dashboard',
  '/user/blog/my-blogs': 'My Blogs',
  '/user/blog/settings': 'Settings | Nefol Social',
  '/user/blog/request': 'Write a Blog',
  '/user/blog/edit-image': 'Image Editor',
  '/user/author/onboarding': 'Become an Author',
  '/user/collab': 'Collab Program',
  '/user/affiliate': 'Affiliate Program',
}

/**
 * Title for a route, or `undefined` when the page sets its own title once its data loads
 * (product, blog post, author). `null` = homepage.
 */
export function titleForRoute(path: string, cartCount: number): string | null | undefined {
  const p = path.split('?')[0].replace(/\/+$/, '') || '/user'
  if (p === '/user' || p === '/user/product' || p === '/') return null
  if (/^\/user\/blog\/ask-community\/\d+/.test(p)) return 'Community Question'
  if (
    p.startsWith('/user/product/') ||
    p.startsWith('/p/') ||
    // Shop by Concern pages set their title once the concern loads
    p === '/user/concerns' ||
    p.startsWith('/user/concern/') ||
    (p.startsWith('/user/author/') && p !== '/user/author/onboarding') ||
    // blog posts and their comment threads (BlogDetail sets the post title)
    (p.startsWith('/user/blog/') && !(p in ROUTE_TITLES))
  ) {
    return undefined
  }
  const fromSlug = (prefix: string) => {
    let slug = p.slice(prefix.length).split('/')[0] || ''
    try { slug = decodeURIComponent(slug) } catch { /* keep raw */ }
    return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
  }
  if (p.startsWith('/user/category/')) return fromSlug('/user/category/') || 'Shop'
  if (p.startsWith('/user/ingredients/')) return `${fromSlug('/user/ingredients/')} | Ingredients`
  if (p === '/user/cart') return cartCount > 0 ? `Cart (${cartCount})` : 'Cart'
  if (p.startsWith('/user/order/')) return 'Order Details'
  if (p.startsWith('/user/confirmation')) return 'Order Confirmed'
  if (p.startsWith('/user/cancel-order/')) return 'Cancel Order'
  return ROUTE_TITLES[p] ?? null
}
