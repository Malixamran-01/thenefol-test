/**
 * When nginx serves index.html for crawlable share paths (/product/:slug, /blog/:id,
 * /author/:id), rewrite the address bar in place to the matching SPA hash route so the
 * correct page loads — no second page load, and query params (utm_*, etc.) are kept.
 * Runs before the app bundle; src/hooks/useHashRouter.ts handles any other clean path.
 */
(function () {
  if (typeof window === 'undefined' || typeof location === 'undefined') return

  var path = location.pathname || ''
  var hash = location.hash || ''
  if (hash.length > 1) return

  var route = null
  var blogMatch = path.match(/^\/blog\/(\d+)\/?$/)
  var productMatch = path.match(/^\/product\/([^/]+)\/?$/)
  var authorMatch = path.match(/^\/author\/([^/]+)\/?$/)

  function seg(raw) {
    try {
      return encodeURIComponent(decodeURIComponent(raw))
    } catch (e) {
      return encodeURIComponent(raw)
    }
  }

  if (blogMatch) route = '#/user/blog/' + blogMatch[1]
  else if (productMatch) route = '#/user/product/' + seg(productMatch[1])
  else if (authorMatch) route = '#/user/author/' + seg(authorMatch[1])
  if (!route) return

  var target = '/' + (location.search || '') + route
  try {
    history.replaceState(history.state, '', target)
  } catch (e) {
    location.replace(location.origin + target)
  }
})()
