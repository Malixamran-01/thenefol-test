/**
 * When nginx serves index.html for crawlable share paths (browser reload),
 * set the SPA hash route so the correct page loads.
 */
(function () {
  if (typeof window === 'undefined' || typeof location === 'undefined') return

  var path = location.pathname || ''
  var hash = location.hash || ''

  var blogMatch = path.match(/^\/blog\/(\d+)\/?$/)
  if (blogMatch) {
    var blogId = blogMatch[1]
    var blogExpected = '#/user/blog/' + blogId
    if (hash.indexOf(blogExpected) === -1) {
      location.replace(location.origin + '/blog/' + blogId + blogExpected)
    }
    return
  }

  var productMatch = path.match(/^\/product\/([^/]+)\/?$/)
  if (productMatch) {
    var slug = decodeURIComponent(productMatch[1])
    var productPath = encodeURIComponent(slug)
    var productExpected = '#/user/product/' + productPath
    if (hash.indexOf('#/user/product/') === -1) {
      location.replace(location.origin + '/product/' + productPath + productExpected)
    }
    return
  }

  var authorMatch = path.match(/^\/author\/([^/]+)\/?$/)
  if (authorMatch) {
    var authorId = decodeURIComponent(authorMatch[1])
    var authorPath = encodeURIComponent(authorId)
    var authorExpected = '#/user/author/' + authorPath
    if (hash.indexOf('#/user/author/') === -1) {
      location.replace(location.origin + '/author/' + authorPath + authorExpected)
    }
  }
})()
