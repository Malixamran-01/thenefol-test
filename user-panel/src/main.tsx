import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import { BlogNavListener } from './components/BlogNavListener'
import './styles.css'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { initMetaPixel } from './utils/metaPixel'

// Mark boot started as early as possible (helps debug iOS Safari blank screens)
;(window as any).__NEFOL_BOOT__ = { startedAt: Date.now() }

// Force Light Mode - Prevent Dark Mode on iOS/Android
// NOTE: Do NOT use MutationObserver on <html> while mutating class/style — on Safari that
// re-enters the observer synchronously and causes "Maximum call stack size exceeded".
if (typeof document !== 'undefined') {
  const enforceLightChrome = () => {
    try {
      document.documentElement.classList.remove('dark')
      document.documentElement.style.colorScheme = 'light'
      document.documentElement.setAttribute('data-color-scheme', 'light')
    } catch {
      // ignore
    }
  }
  enforceLightChrome()
  window.addEventListener('load', enforceLightChrome)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') enforceLightChrome()
  })
}

// Initialize AOS
try {
  AOS.init({
    duration: 800,
    easing: 'ease-out',
    once: true,
    offset: 100,
    delay: 0
  })
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('AOS init failed:', e)
}

// Initialize Meta Pixel
try {
  initMetaPixel()
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('MetaPixel init failed:', e)
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope)
        
        // Check for updates every hour
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
      })
      .catch((error) => {
        console.log('❌ Service Worker registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
    <BlogNavListener />
  </Provider>
)

// Mark boot finished (React mounted)
;(window as any).__NEFOL_BOOT__.mountedAt = Date.now()





