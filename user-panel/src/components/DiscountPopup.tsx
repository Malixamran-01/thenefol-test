import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { getApiBase, resolveMediaUrl } from '../utils/apiBase'
import {
  DISCOUNT_POPUP_SECTION,
  POPUP_COUPON_KEY,
  isPopupLive,
  normalizeDiscountPopup,
  popupAllowedOnRoute,
  popupDueForVisitor,
  toPopupHref,
  type DiscountPopupContent,
  type PopupSeen,
} from '../../../common/src/discountPopup'

const SEEN_KEY = 'nf_discount_popup_seen'
const SESSION_KEY = 'nf_discount_popup_session'

function readSeen(): PopupSeen | null {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || 'null')
    return v && typeof v.version === 'string' && typeof v.at === 'number' ? v : null
  } catch {
    return null
  }
}

function seenThisSession(version: string): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === version
  } catch {
    return false
  }
}

function markSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ version, at: Date.now() }))
    sessionStorage.setItem(SESSION_KEY, version)
  } catch {
    /* storage blocked: the popup may show again, which is harmless */
  }
}

function rememberCoupon(code: string) {
  try {
    sessionStorage.setItem(POPUP_COUPON_KEY, code)
  } catch {
    /* ignore */
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the older method */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

/**
 * The offer modal admins set up in Admin → Store & homepage → Discount popup.
 * Loads once per page load, waits for the configured delay, and never opens on checkout or cart.
 */
export default function DiscountPopup() {
  const [popup, setPopup] = useState<DiscountPopupContent | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let pending: DiscountPopupContent | null = null

    // Navigating to checkout or cart while the delay runs cancels the popup for this page load
    const onHashChange = () => {
      if (pending && !popupAllowedOnRoute(pending, window.location.hash)) {
        clearTimeout(timer)
        pending = null
      }
    }

    fetch(`${getApiBase()}/cms/sections/home?active=true`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : []))
      .then((sections: Array<{ section_type?: string; content?: unknown; is_active?: boolean }>) => {
        const section = Array.isArray(sections) ? sections.find((s) => s.section_type === DISCOUNT_POPUP_SECTION) : undefined
        if (!section || section.is_active === false) return
        const p = normalizeDiscountPopup(section.content)
        if (!isPopupLive(p)) return
        if (!popupAllowedOnRoute(p, window.location.hash)) return
        if (!popupDueForVisitor(p, readSeen(), seenThisSession(p.version))) return
        pending = p
        window.addEventListener('hashchange', onHashChange)
        timer = setTimeout(() => {
          if (!pending || !popupAllowedOnRoute(pending, window.location.hash)) return
          setPopup(pending)
          setOpen(true)
          markSeen(pending.version)
        }, p.delaySeconds * 1000)
      })
      .catch(() => {
        /* no popup when the CMS can't be reached */
      })

    return () => {
      controller.abort()
      clearTimeout(timer)
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  if (!popup || !open) return null
  return <DiscountPopupModal popup={popup} onClose={() => setOpen(false)} />
}

/** The modal: image, text, coupon code with Copy, and the button. */
export function DiscountPopupModal({ popup, onClose }: { popup: DiscountPopupContent; onClose: () => void }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [visible, setVisible] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closingRef = useRef(false)

  const close = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(onClose, reduce ? 0 : 200)
  }, [onClose])

  // Enter animation, scroll lock, focus, Escape and Tab trapping
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const raf = requestAnimationFrame(() => setVisible(true))
    dialogRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', close)

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', close)
      previouslyFocused?.focus?.()
    }
  }, [close])

  const onCopy = async () => {
    const ok = await copyText(popup.couponCode)
    if (ok) rememberCoupon(popup.couponCode)
    setCopied(ok ? 'copied' : 'failed')
    window.setTimeout(() => setCopied('idle'), 2500)
  }

  const href = popup.ctaLabel ? toPopupHref(popup.ctaLink) : null
  const external = !!href && /^https?:/i.test(href)
  const image = popup.image ? resolveMediaUrl(popup.image) : ''
  const side = popup.layout === 'side' && !!image

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-6 transition-opacity duration-200 motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(10, 10, 12, 0.55)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={popup.heading ? 'nf-popup-heading' : undefined}
        aria-label={popup.heading ? undefined : 'Special offer'}
        tabIndex={-1}
        className={`relative w-full overflow-hidden rounded-t-3xl shadow-2xl outline-none sm:rounded-3xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 sm:scale-100' : 'translate-y-8 sm:translate-y-0 sm:scale-95'
        } ${side ? 'sm:max-w-[780px]' : 'sm:max-w-[440px]'}`}
        style={{
          backgroundColor: 'var(--nf-surface, #fff)',
          color: 'var(--nf-text, #111)',
          maxHeight: 'min(92vh, 92dvh)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close offer"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-sm ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className={`flex max-h-[inherit] flex-col overflow-y-auto ${side ? 'sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:overflow-hidden' : ''}`}>
          {image && (
            <div className={`nf-popup-media relative shrink-0 overflow-hidden ${side ? 'nf-popup-media--side' : ''}`}
              style={{ backgroundColor: 'var(--nf-primary-lighter, #f3f0ea)' }}
            >
              <img src={image} alt={popup.imageAlt} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}

          <div className={`flex flex-col justify-center px-6 pb-6 pt-7 sm:px-9 sm:pb-9 sm:pt-10 ${side ? 'sm:overflow-y-auto' : ''} ${image ? '' : 'pt-12'}`}>
            {popup.eyebrow && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--nf-primary)' }}>
                {popup.eyebrow}
              </p>
            )}
            {popup.heading && (
              <h2
                id="nf-popup-heading"
                className="pr-8 text-[1.65rem] leading-tight sm:text-[2rem]"
                style={{ fontFamily: 'var(--font-heading-family)', fontWeight: 600, color: 'var(--nf-heading, inherit)' }}
              >
                {popup.heading}
              </h2>
            )}
            {popup.body && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--nf-text-muted, #555)' }}>
                {popup.body}
              </p>
            )}

            {popup.couponCode && (
              <div className="mt-6">
                <div
                  className="flex items-stretch overflow-hidden rounded-xl border-2 border-dashed"
                  style={{ borderColor: 'var(--nf-primary)', backgroundColor: 'var(--nf-primary-lighter, transparent)' }}
                >
                  <span className="flex min-w-0 flex-1 items-center px-4 py-3 font-mono text-lg font-bold tracking-[0.18em] sm:text-xl" aria-label={`Coupon code ${popup.couponCode}`}>
                    <span className="truncate">{popup.couponCode}</span>
                  </span>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="flex shrink-0 items-center gap-1.5 px-4 text-sm font-semibold transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4"
                    style={{ backgroundColor: 'var(--nf-primary)', color: 'var(--nf-on-primary, #fff)' }}
                  >
                    {copied === 'copied' ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                    {copied === 'copied' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-2 min-h-[1.25rem] text-xs" style={{ color: 'var(--nf-text-muted, #666)' }} role="status" aria-live="polite">
                  {copied === 'copied'
                    ? 'Code copied. We’ll fill it in for you at checkout.'
                    : copied === 'failed'
                      ? 'Couldn’t copy. Note the code down and enter it at checkout.'
                      : popup.couponNote}
                </p>
              </div>
            )}

            {(href || popup.dismissLabel) && (
              <div className={`flex flex-col gap-2 ${popup.couponCode ? 'mt-3' : 'mt-6'}`}>
                {href && (
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    onClick={() => {
                      if (popup.couponCode) rememberCoupon(popup.couponCode)
                      if (external) close()
                    }}
                    className="flex h-12 items-center justify-center rounded-full px-6 text-sm font-semibold uppercase tracking-[0.12em] transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ backgroundColor: 'var(--nf-primary)', color: 'var(--nf-on-primary, #fff)' }}
                  >
                    {popup.ctaLabel}
                  </a>
                )}
                {popup.dismissLabel && (
                  <button
                    type="button"
                    onClick={close}
                    className="h-10 text-sm underline-offset-4 transition hover:underline focus-visible:outline focus-visible:outline-2"
                    style={{ color: 'var(--nf-text-muted, #666)' }}
                  >
                    {popup.dismissLabel}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
