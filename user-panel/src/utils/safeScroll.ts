/**
 * Safari-safe scroll helpers — smooth behavior can throw on some WebKit builds.
 */

export function safeWindowScrollTo(options: ScrollToOptions): void {
  try {
    window.scrollTo(options)
    return
  } catch {
    /* fall through */
  }
  try {
    const left = options.left ?? 0
    const top = options.top ?? 0
    window.scrollTo(left, top)
  } catch {
    /* ignore */
  }
}

export function safeWindowScrollToTop(smooth = false): void {
  safeWindowScrollTo({ top: 0, left: 0, behavior: smooth ? 'smooth' : 'auto' })
}

export function safeElementScrollIntoView(
  element: Element,
  options?: ScrollIntoViewOptions
): void {
  try {
    element.scrollIntoView(options)
    return
  } catch {
    /* fall through */
  }
  try {
    element.scrollIntoView()
  } catch {
    /* ignore */
  }
}

export function safeElementScrollTo(element: Element, options: ScrollToOptions): void {
  const el = element as HTMLElement & { scrollTo?: (opts: ScrollToOptions) => void }
  try {
    if (typeof el.scrollTo === 'function') {
      el.scrollTo(options)
      return
    }
  } catch {
    /* fall through */
  }
  try {
    if (options.left != null) el.scrollLeft = options.left
    if (options.top != null) el.scrollTop = options.top
  } catch {
    /* ignore */
  }
}
