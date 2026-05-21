/** Scroll step for horizontal carousels (slide width + flex gap). */
export function getCarouselScrollStep(container: HTMLElement): number {
  const slide = container.children[0] as HTMLElement | undefined
  if (!slide) return 0
  const gapValue = getComputedStyle(container).gap || '0'
  const gap = parseFloat(gapValue) || 0
  return slide.offsetWidth + gap
}

export function getCarouselActiveIndex(container: HTMLElement): number {
  const step = getCarouselScrollStep(container)
  if (step <= 0) return 0
  return Math.min(
    Math.max(0, Math.round(container.scrollLeft / step)),
    container.children.length - 1
  )
}

export function scrollCarouselToIndex(container: HTMLElement, index: number): void {
  const step = getCarouselScrollStep(container)
  if (step <= 0) return
  container.scrollTo({ left: index * step, behavior: 'smooth' })
}
