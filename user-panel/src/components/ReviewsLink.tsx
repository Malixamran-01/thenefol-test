import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

/** Product page, scrolled to its Customer Reviews section. */
export const productReviewsHref = (slug: string) => `#/user/product/${slug}?section=reviews`

/**
 * Makes a card's rating (stars, score, review count) open the product's reviews.
 * Use `nested` when the rating already sits inside a link to the product (whole-card links):
 * a link can't contain another link, so it becomes a tappable span instead.
 */
export default function ReviewsLink({
  slug,
  children,
  className = '',
  nested = false,
  label,
}: {
  slug?: string | null
  children: ReactNode
  className?: string
  nested?: boolean
  /** Accessible name, e.g. "Rated 4.8 out of 5 from 20 reviews. See reviews" */
  label?: string
}) {
  if (!slug) return <span className={className}>{children}</span>
  const href = productReviewsHref(slug)
  const classes = `cursor-pointer rounded-md hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`

  if (nested) {
    const go = (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      window.location.hash = href
    }
    return (
      <span
        role="link"
        tabIndex={0}
        aria-label={label}
        className={classes}
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') go(e)
        }}
      >
        {children}
      </span>
    )
  }

  return (
    <a href={href} aria-label={label} className={classes} onClick={(e) => e.stopPropagation()}>
      {children}
    </a>
  )
}
