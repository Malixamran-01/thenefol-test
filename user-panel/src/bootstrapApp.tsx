import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import App from './App'
import { BlogNavListener } from './components/BlogNavListener'
import ErrorBoundary from './components/ErrorBoundary'
import { SAFARI_HUNT_DISABLE_BATCH } from './safariHuntBatches'
import { ROUTE_SHELL_ISOLATION, APPCONTENT_STUB } from './routeShellIsolation'

function skipBatch(id: 1 | 2 | 3 | 4 | 5 | 6 | 7) {
  return SAFARI_HUNT_DISABLE_BATCH === id
}

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
  mergeBoot({ bootstrapStartedAt: Date.now(), safariHuntBatch: SAFARI_HUNT_DISABLE_BATCH })

  void (async () => {
    if (!skipBatch(7)) {
      try {
        await import('./styles.css')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('styles.css import failed:', e)
      }
    }

    // Force Light Mode - Prevent Dark Mode on iOS/Android
    // NOTE: Do NOT use MutationObserver on <html> while mutating class/style — on Safari that
    // re-enters the observer synchronously and causes "Maximum call stack size exceeded".
    if (!skipBatch(1) && typeof document !== 'undefined') {
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

    if (!skipBatch(2)) {
      try {
        await import('aos/dist/aos.css')
        const { default: AOS } = await import('aos')
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
    }

    if (!skipBatch(3)) {
      try {
        const { initMetaPixel } = await import('./utils/metaPixel')
        initMetaPixel()
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('MetaPixel init failed:', e)
      }
    }

    if (!skipBatch(4) && 'serviceWorker' in navigator) {
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
          {!skipBatch(6) && !ROUTE_SHELL_ISOLATION && !APPCONTENT_STUB ? <BlogNavListener /> : null}
        </Provider>
      </ErrorBoundary>
    )

    mergeBoot({ renderCalledAt: Date.now() })

    if (!skipBatch(5)) {
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
  })().catch((err: unknown) => {
    mergeBoot({ mountAppAsyncFailed: String(err) })
    // eslint-disable-next-line no-console
    console.error('mountApp async boot failed:', err)
  })
}
