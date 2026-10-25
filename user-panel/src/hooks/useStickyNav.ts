import { useEffect, useState } from 'react'

const COMPACT_AFTER_PX = 24
/** Mobile only: start hiding the bar once the user is this far down the page. */
const HIDE_AFTER_PX = 160
/** Ignore tiny scroll jitters (momentum scrolling, address-bar resize). */
const DIRECTION_THRESHOLD_PX = 8

/**
 * Scroll state for the fixed site header:
 *  - `compact`: scrolled past the top → shorter bar + shadow
 *  - `hidden`:  scrolling down past HIDE_AFTER_PX → slide away (applied on mobile only by the caller);
 *               any upward scroll brings it back.
 */
export function useStickyNav() {
  const [compact, setCompact] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const update = () => {
      ticking = false
      const y = Math.max(0, window.scrollY)
      setCompact((prev) => (prev === y > COMPACT_AFTER_PX ? prev : y > COMPACT_AFTER_PX))
      const delta = y - lastY
      if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return
      const nextHidden = delta > 0 && y > HIDE_AFTER_PX
      setHidden((prev) => (prev === nextHidden ? prev : nextHidden))
      lastY = y
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return { compact, hidden }
}
