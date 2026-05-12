/**
 * Runs before the heavy app graph loads. Captures early errors in sessionStorage
 * so iOS Safari can surface them in the HTML boot watchdog.
 */
export {}

declare global {
  interface Window {
    __NEFOL_BOOT__?: Record<string, unknown>
    __SAFARI_DEBUG__?: Array<Record<string, unknown>>
  }
}

if (typeof window !== 'undefined') {
  try {
    const prev =
      window.__NEFOL_BOOT__ && typeof window.__NEFOL_BOOT__ === 'object' ? window.__NEFOL_BOOT__ : {}
    window.__NEFOL_BOOT__ = { ...prev, tsEntryAt: Date.now() }
  } catch {
    window.__NEFOL_BOOT__ = { tsEntryAt: Date.now() }
  }

  const log: Array<Record<string, unknown>> = window.__SAFARI_DEBUG__ || []
  window.__SAFARI_DEBUG__ = log

  const persist = () => {
    try {
      sessionStorage.setItem('__nefol_crash', JSON.stringify(log.slice(-12)))
    } catch {
      /* private mode / blocked storage */
    }
  }

  window.addEventListener('error', (ev) => {
    log.push({
      t: Date.now(),
      type: 'error',
      message: ev.message,
      filename: (ev as ErrorEvent).filename,
      lineno: (ev as ErrorEvent).lineno,
      colno: (ev as ErrorEvent).colno,
      err: String((ev as ErrorEvent).error),
    })
    persist()
  })

  window.addEventListener('unhandledrejection', (ev) => {
    log.push({ t: Date.now(), type: 'rejection', reason: String(ev.reason) })
    persist()
  })

  // Drop stale service workers as early as possible (avoids mixed chunk maps on Safari).
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => {
        void r.unregister()
      })
    })
  }
}
