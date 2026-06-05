/**
 * Runs before the Vite bundle. Hash routes (#/user/...) are invisible to WhatsApp/Facebook
 * crawlers — they only fetch the path before '#'. Ensures /blog/:id loads the SPA hash route
 * when nginx accidentally serves index.html instead of the backend meta page.
 */
(function () {
  if (typeof window === 'undefined' || typeof location === 'undefined') return

  var pathMatch = location.pathname.match(/^\/blog\/(\d+)\/?$/)
  if (!pathMatch) return

  var id = pathMatch[1]
  var hash = location.hash || ''
  var expected = '#/user/blog/' + id

  if (hash.indexOf(expected) === -1) {
    location.replace(location.origin + '/blog/' + id + expected)
  }
})()
