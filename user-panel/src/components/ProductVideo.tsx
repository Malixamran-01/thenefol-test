import { useEffect, useRef, useState } from 'react'

export const VIDEO_URL_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i
export const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_RE.test(url)

/** Users on Data Saver / 2G, or with reduced motion, don't get autoplay or eager buffering. */
function prefersLightweightVideo(): boolean {
  if (typeof window === 'undefined') return true
  const conn = (navigator as any).connection
  if (conn?.saveData) return true
  if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

type Props = {
  src: string
  poster?: string | null
  title?: string
  className?: string
  /** Autoplay muted while on screen (ignored on Data Saver / reduced motion). */
  autoPlay?: boolean
  onError?: () => void
}

/**
 * PDP video: shows the poster instantly, buffers only metadata until it's
 * visible, autoplays muted inline while on screen and pauses when scrolled away.
 */
export default function ProductVideo({ src, poster, title, className = '', autoPlay = true, onError }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [lightweight] = useState(prefersLightweightVideo)
  const shouldAutoPlay = autoPlay && !lightweight

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (shouldAutoPlay) el.play().catch(() => { /* autoplay blocked — controls remain */ })
        } else if (!el.paused) {
          el.pause()
        }
      },
      { threshold: [0, 0.5] }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [src, shouldAutoPlay])

  return (
    <video
      ref={ref}
      // Without a poster, "#t=0.1" makes browsers paint the first frame as a preview
      src={poster ? src : `${src}#t=0.1`}
      poster={poster || undefined}
      className={className}
      controls
      muted
      loop
      playsInline
      preload={lightweight ? 'none' : 'metadata'}
      aria-label={title ? `${title} video` : 'Product video'}
      controlsList="nodownload"
      disablePictureInPicture
      onError={onError}
    />
  )
}
