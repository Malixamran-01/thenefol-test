import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import ErrorBoundary from './components/ErrorBoundary'
import { SAFARI_HUNT_DISABLE_BATCH } from './safariHuntBatches'
import { ROUTE_SHELL_ISOLATION, APPCONTENT_STUB } from './routeShellIsolation'

function isIOSSafariUA(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(ua) && /WebKit/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
}

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
      window.addEventListener('load', enforceLightChrome, { once: true })
      const onVisibility = () => {
        if (document.visibilityState === 'visible') enforceLightChrome()
      }
      document.addEventListener('visibilitychange', onVisibility)
    }

    if (!skipBatch(2)) {
      try {
        await import('aos/dist/aos.css')
        const { default: AOS } = await import('aos')
        AOS.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
          offset: 100,
          delay: 0,
          disable: isIOSSafariUA() ? 'mobile' : false,
        })
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('AOS init failed:', e)
      }
    }

    if (!skipBatch(4) && 'serviceWorker' in navigator) {
      window.addEventListener(
        'load',
        () => {
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
        },
        { once: true }
      )
    }

    const rootEl = document.getElementById('root')
    if (!rootEl) {
      throw new Error('Root container #root not found')
    }

    mergeBoot({ reactCreateRootAt: Date.now() })

    const { default: App } = await import('./App')
    const blogNavListenerModule = !skipBatch(6) && !ROUTE_SHELL_ISOLATION && !APPCONTENT_STUB
      ? await import('./components/BlogNavListener')
      : null
    const BlogNavListener = blogNavListenerModule?.BlogNavListener ?? null

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
          {BlogNavListener ? <BlogNavListener /> : null}
        </Provider>
      </ErrorBoundary>
    )

    mergeBoot({ renderCalledAt: Date.now() })

    if (!skipBatch(3)) {
      const runMetaPixel = () => {
        void import('./utils/metaPixel')
          .then(({ initMetaPixel }) => {
            initMetaPixel()
          })
          .catch((e: unknown) => {
            mergeBoot({ metaPixelInitFailed: String(e) })
            // eslint-disable-next-line no-console
            console.warn('MetaPixel init failed:', e)
          })
      }
      if (isIOSSafariUA()) {
        queueMicrotask(runMetaPixel)
      } else {
        runMetaPixel()
      }
    }

    if (import.meta.env.DEV) {
      void import('./utils/safariDiagnostics').then(({ runSafariChecks }) => {
        runSafariChecks()
      })
    }

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
