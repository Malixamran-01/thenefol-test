/** Classic script (ES5) — boot watchdog; must not use import/export or optional chaining. */
(function () {
  window.__NEFOL_BOOT__ = Object.assign({}, window.__NEFOL_BOOT__ || {}, { htmlInlineAt: Date.now() })
  window.__SAFARI_DEBUG__ = window.__SAFARI_DEBUG__ || []

  function show(details) {
    var box = document.getElementById('boot-watchdog')
    var pre = document.getElementById('boot-watchdog-details')
    if (!box || !pre) return
    pre.textContent = details
    box.style.display = 'block'
  }

  window.addEventListener('error', function (e) {
    var msg = e && e.message ? e.message : String(e)
    var file = e && e.filename ? e.filename + ':' + e.lineno + ':' + e.colno : ''
    if (/Cannot use import statement outside a module/i.test(msg)) {
      show(
        'Module script error: ' +
          msg +
          '\n' +
          file +
          '\n\nLikely cause: a .js bundle was loaded without type="module", or /src/main.tsx was served without Vite. ' +
          'Redeploy from `user-panel/dist`, clear Service Worker, and hard-refresh.'
      )
      return
    }
    show('window.error: ' + msg + '\n' + file)
  })

  window.addEventListener(
    'error',
    function (e) {
      var t = e && e.target
      if (!t || !t.tagName) return
      var tag = String(t.tagName || '').toUpperCase()
      var isScript = tag === 'SCRIPT'
      var isStylesheet = tag === 'LINK' && String(t.rel || '').toLowerCase() === 'stylesheet'
      if (!isScript && !isStylesheet) return
      var src = t.src || t.href || '(inline)'
      if (/connect\.facebook\.net|facebook\.com\/tr\?|googletagmanager\.com|google-analytics\.com|doubleclick\.net/i.test(src)) {
        return
      }
      show('resource.error: ' + tag + ' -> ' + src)
    },
    true
  )

  window.addEventListener('unhandledrejection', function (e) {
    show('unhandledrejection: ' + (e && e.reason ? String(e.reason) : 'unknown'))
  })

  var isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '')
  var waitMs = isIOS ? 10000 : 5000
  setTimeout(function () {
    var boot = window.__NEFOL_BOOT__
    var root = document.getElementById('root')
    var mounted = boot && boot.mountedAt
    var hasDom = root && root.children && root.children.length > 0
    var crash = ''
    try {
      crash = sessionStorage.getItem('__nefol_crash') || ''
    } catch (err) {
      /* ignore */
    }
    if (!mounted || !hasDom) {
      show(
        'Boot state: ' +
          JSON.stringify(boot || {}) +
          '\nRoot children: ' +
          (hasDom ? 'yes' : 'no') +
          (crash ? '\n\n__nefol_crash (last captured):\n' + crash : '') +
          '\nUserAgent: ' +
          navigator.userAgent
      )
    }
  }, waitMs)
})()
