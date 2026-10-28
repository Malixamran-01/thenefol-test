import { useEffect, useRef, useState } from 'react'
import { isVideoUrl } from './ProductVideo'

/**
 * Second image for a product card: the first PDP image (skipping videos and the listing image itself).
 * `pdpImages` may be strings or `{ url }` objects; `toAbs` resolves relative upload paths.
 */
export function hoverImageOf(product: any, mainImage?: string | null, toAbs?: (u: string) => string): string | null {
  const list: unknown[] = product?.pdpImages || product?.pdp_images || []
  for (const item of list) {
    const raw = typeof item === 'string' ? item : (item as { url?: string } | null)?.url
    if (!raw || isVideoUrl(raw)) continue
    const url = toAbs ? toAbs(raw) : raw
    if (url && url !== mainImage) return url
  }
  return null
}

/**
 * Drop inside a product card's positioned image box. On devices with a mouse, hovering the card
 * (its closest <article>) fades this image in over the listing image. It is only downloaded on the
 * first hover, so listing pages don't load twice the images.
 */
export default function CardHoverImage({ src, className = 'object-cover' }: { src?: string | null; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    const marker = ref.current
    if (!src || !marker || typeof window === 'undefined') return
    if (!window.matchMedia?.('(hover: hover)').matches) return
    const host = (marker.closest('article, [data-hover-card]') as HTMLElement | null) || marker.parentElement
    if (!host) return
    host.classList.add('nf-hover-card')
    const arm = () => setArmed(true)
    host.addEventListener('pointerenter', arm, { once: true })
    return () => host.removeEventListener('pointerenter', arm)
  }, [src])

  return (
    <span ref={ref} className="contents" aria-hidden="true">
      {armed && src && (
        <img src={src} alt="" decoding="async" className={`nf-card-alt pointer-events-none absolute inset-0 h-full w-full ${className}`} />
      )}
    </span>
  )
}
