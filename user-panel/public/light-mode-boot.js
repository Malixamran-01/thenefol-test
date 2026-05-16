/** Classic script (ES5) — no import syntax. Runs before the Vite module bundle. */
(function () {
  if (typeof document === 'undefined') return
  try {
    document.documentElement.classList.remove('dark')
    document.documentElement.style.colorScheme = 'light'
    document.documentElement.setAttribute('data-color-scheme', 'light')
  } catch (e) {
    /* ignore */
  }
})()
