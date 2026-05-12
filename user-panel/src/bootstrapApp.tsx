import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import { BlogNavListener } from './components/BlogNavListener'
import ErrorBoundary from './components/ErrorBoundary'
import './styles.css'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { initMetaPixel } from './utils/metaPixel'

function mergeBoot(patch: Record<string, unknown>) {
  try {
    const w = window as unknown as { __NEFOL_BOOT__?: Record<string, unknown> }
    const prev = w.__NEFOL_BOOT__ && typeof w.__NEFOL_BOOT__ === 'object' ? w.__NEFOL_BOOT__ : {}
    w.__NEFOL_BOOT__ = { ...prev, ...patch }
  } catch {
    /* ignore */
  }
}

export function mountApp() {
  mergeBoot({ bootstrapStartedAt: Date.now() })

  /** Deepest isolation: no Redux, no ErrorBoundary, no App, no AOS/MetaPixel (set `VITE_BOOT_SAFARI_STUB=1`). */
  const bootMinimal =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_BOOT_SAFARI_STUB === '1'
  if (bootMinimal) {
    const rootEl = document.getElementById('root')
    if (!rootEl) {
      throw new Error('Root container #root not found')
    }
    mergeBoot({ reactCreateRootAt: Date.now(), bootMinimalStub: true })
    const root = ReactDOM.createRoot(rootEl, {
      onRecoverableError(error) {
        mergeBoot({ recoverableError: String(error) })
        // eslint-disable-next-line no-console
        console.error('React recoverable error:', error)
      },
    })
    root.render(<div>Hello Safari</div>)
    mergeBoot({ renderCalledAt: Date.now() })
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            const el = document.getElementById('root')
            mergeBoot({
              mountedAt: Date.now(),
              rootChildCount: el?.children.length ?? 0,
            })
          } catch {
            /* ignore */
          }
        })
      })
    })
    return
  }

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
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
    const isIOSSafari =
      /iPhone|iPad|iPod/i.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
    AOS.init({
      duration: 800,
      easing: 'ease-out',
      once: true,
      offset: 100,
      delay: 0,
      disable: isIOSSafari ? 'mobile' : false,
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

  // Service Worker is temporarily disabled due to iOS Safari stale-cache boot loops.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
        .then(() => {
          // eslint-disable-next-line no-console
          console.log('🧹 Service workers unregistered for stability')
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.warn('Service worker cleanup failed:', error)
        })
    })
  }

  const rootEl = document.getElementById('root')
  if (!rootEl) {
    throw new Error('Root container #root not found')
  }

  mergeBoot({ reactCreateRootAt: Date.now() })

  const root = ReactDOM.createRoot(rootEl, {
    onRecoverableError(error) {
      mergeBoot({ recoverableError: String(error) })
      // eslint-disable-next-line no-console
      console.error('React recoverable error:', error)
    },
  })

  root.render(
    <ErrorBoundary name="RootApp">
      <Provider store={store}>
        <App />
        <BlogNavListener />
      </Provider>
    </ErrorBoundary>
  )

  mergeBoot({ renderCalledAt: Date.now() })

  // React 18 commits asynchronously; mark "mounted" after the first paint when #root has children.
  const markMounted = () => {
    try {
      const el = document.getElementById('root')
      mergeBoot({
        mountedAt: Date.now(),
        rootChildCount: el?.children.length ?? 0,
      })
    } catch {
      /* ignore */
    }
  }
  queueMicrotask(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(markMounted)
    })
  })
}
