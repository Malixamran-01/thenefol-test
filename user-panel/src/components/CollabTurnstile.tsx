import React, { useEffect, useRef, useCallback, useState } from 'react'
import { Shield, AlertCircle } from 'lucide-react'

const SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function waitForTurnstileApi(maxMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const id = window.setInterval(() => {
      if (window.turnstile) {
        window.clearInterval(id)
        resolve()
        return
      }
      if (Date.now() - start > maxMs) {
        window.clearInterval(id)
        reject(new Error('Turnstile API did not become available'))
      }
    }, 50)
  })
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()

  if (!scriptPromise) {
    scriptPromise = (async () => {
      const selector = 'script[src*="challenges.cloudflare.com/turnstile/v0/api.js"]'
      let el = document.querySelector(selector) as HTMLScriptElement | null

      if (!el) {
        el = document.createElement('script')
        el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        el.async = true
        el.defer = true
        document.head.appendChild(el)
        await new Promise<void>((resolve, reject) => {
          el!.addEventListener('load', () => resolve())
          el!.addEventListener('error', () => reject(new Error('Turnstile script failed to load')))
        })
      }

      // Wait for window.turnstile (handles script already in DOM from SPA nav, or slow init)
      await waitForTurnstileApi(15000)
    })()
  }
  return scriptPromise
}

type Props = {
  onToken: (token: string | null) => void
}

/**
 * Cloudflare Turnstile widget for Creator Collab apply form.
 * Set VITE_TURNSTILE_SITE_KEY in user-panel .env (rebuild after changing).
 */
export default function CollabTurnstile({ onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken
  const [loadError, setLoadError] = useState<string | null>(null)

  const cleanup = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetIdRef.current)
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!SITE_KEY) {
      onTokenRef.current(null)
      return
    }

    let cancelled = false
    setLoadError(null)

    const run = async () => {
      try {
        await loadTurnstileScript()
        if (cancelled || !containerRef.current) return
        if (!window.turnstile) {
          setLoadError('Security widget unavailable. Disable ad blockers for this site or try again.')
          return
        }
        cleanup()
        const id = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          size: 'normal',
          appearance: 'always',
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => {
            onTokenRef.current(null)
            setLoadError('Captcha could not load. Refresh the page or check your domain is allowed in Cloudflare Turnstile.')
          },
        })
        widgetIdRef.current = id
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : 'Could not load security verification. Check network and try again.'
          )
          onTokenRef.current(null)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [cleanup])

  if (!SITE_KEY) {
    if (import.meta.env.DEV) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Dev:</span> Set{' '}
          <code className="rounded bg-gray-100 px-1">VITE_TURNSTILE_SITE_KEY</code> in{' '}
          <code className="rounded bg-gray-100 px-1">user-panel/.env</code> and restart{' '}
          <code className="rounded bg-gray-100 px-1">npm run dev</code> (Vite only reads env at startup).
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <Shield className="h-3.5 w-3.5" style={{ color: 'var(--arctic-blue-primary, #4B97C9)' }} aria-hidden />
        Security verification
      </div>
      {loadError && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden />
          <span>{loadError}</span>
        </div>
      )}
      <div ref={containerRef} className="min-h-[68px] w-full flex items-center justify-center sm:justify-start" />
    </div>
  )
}

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY)
}
