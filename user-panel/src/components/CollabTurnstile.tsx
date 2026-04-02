import React, { useEffect, useRef, useCallback } from 'react'
import { Shield } from 'lucide-react'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || ''

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: Record<string, unknown>) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')))
      return
    }
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script failed'))
    document.head.appendChild(s)
  })
  return scriptPromise
}

type Props = {
  onToken: (token: string | null) => void
}

/**
 * Cloudflare Turnstile widget for Creator Collab apply form.
 * Set VITE_TURNSTILE_SITE_KEY in user-panel env (same site key as Cloudflare Turnstile dashboard).
 */
export default function CollabTurnstile({ onToken }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

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
      onToken(null)
      return
    }

    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        cleanup()
        const id = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          theme: 'light',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => onToken(null),
        })
        widgetIdRef.current = id
      })
      .catch(() => onToken(null))

    return () => {
      cancelled = true
      cleanup()
    }
  }, [cleanup, onToken])

  if (!SITE_KEY) {
    if (import.meta.env.DEV) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Dev:</span> Set{' '}
          <code className="rounded bg-gray-100 px-1">VITE_TURNSTILE_SITE_KEY</code> (and server{' '}
          <code className="rounded bg-gray-100 px-1">TURNSTILE_SECRET_KEY</code>) to enable captcha.
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
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center sm:justify-start" />
    </div>
  )
}

export function isTurnstileConfigured(): boolean {
  return Boolean(SITE_KEY)
}
