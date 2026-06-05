/**
 * Runs before the Vite bundle. When nginx serves index.html for /blog/:id (browser reload),
 * ensure the SPA hash route is set so BlogDetail loads.
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
