import { useEffect, useRef, useState } from 'react'

export const VIDEO_URL_RE = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i
export const isVideoUrl = (url?: string | null) => !!url && VIDEO_URL_RE.test(url)

/** Users on Data Saver / 2G don't get autoplay or eager buffering. */
function prefersLightweightVideo(): boolean {
  if (typeof window === 'undefined') return true
  const conn = (navigator as any).connection
  if (conn?.saveData) return true
  return !!(conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType))
}

type Props = {
  src: string
  poster?: string | null
  title?: string
  className?: string
  /** Autoplay muted while on screen (ignored on Data Saver). */
  autoPlay?: boolean
  /** In a carousel: only the slide being shown plays; the others stay paused. */
  active?: boolean
  onError?: () => void
}

/**
 * PDP video: shows the poster instantly, buffers only metadata until it's
 * needed, autoplays muted inline while its slide is shown and on screen, and
 * pauses when swiped or scrolled away. A video the shopper paused stays paused
 * until they leave the slide and come back.
 */
export default function ProductVideo({ src, poster, title, className = '', autoPlay = true, active = true, onError }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  const [lightweight] = useState(prefersLightweightVideo)
  const [onScreen, setOnScreen] = useState(false)
  const userPaused = useRef(false)
  const pausingForUs = useRef(false)
  const shouldAutoPlay = autoPlay && !lightweight

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setOnScreen(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5] }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [src])

  // Coming back to the slide counts as a fresh visit: autoplay again
  useEffect(() => {
    if (!active) userPaused.current = false
  }, [active])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active && onScreen) {
      if (!shouldAutoPlay || userPaused.current || !el.paused) return
      el.play().catch(() => {
        // Browsers only allow autoplay without sound: if the shopper had unmuted, retry muted
        if (el.muted) return
        el.muted = true
        el.play().catch(() => { /* autoplay blocked; controls remain */ })
      })
    } else if (!el.paused) {
      pausingForUs.current = true
      el.pause()
    }
  }, [active, onScreen, shouldAutoPlay, src])

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
      onPlay={() => { userPaused.current = false }}
      onPause={() => {
        if (pausingForUs.current) pausingForUs.current = false
        else userPaused.current = true
      }}
      onError={onError}
    />
  )
}
