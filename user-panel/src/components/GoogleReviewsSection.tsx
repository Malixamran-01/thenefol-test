import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'

type GoogleReview = {
  id: number
  name: string
  photo: string | null
  rating: number
  comment: string | null
  date: string | null
  featured: boolean
}

type Payload = {
  rating: number | null
  total: number
  mapsUrl: string | null
  writeReviewUrl: string | null
  reviews: GoogleReview[]
}

const LONG_REVIEW = 220
const headingFont = { fontFamily: 'var(--font-heading-family)' }

/** Google's "G" mark, used to attribute the reviews. */
function GoogleG({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  )
}

/** Five stars filled to `value` (supports fractions, e.g. 4.7). */
function StarRow({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <span className="relative inline-flex !flex-nowrap" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      <span className="inline-flex !flex-nowrap gap-0.5" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={size} style={{ color: 'var(--nf-border)', fill: 'var(--nf-border)' }} />)}
      </span>
      <span className="absolute inset-y-0 left-0 inline-flex !flex-nowrap gap-0.5 overflow-hidden" style={{ width: `${(Math.max(0, Math.min(5, value)) / 5) * 100}%` }} aria-hidden="true">
        {[0, 1, 2, 3, 4].map((i) => <Star key={i} className={`${size} flex-shrink-0`} style={{ color: 'var(--nf-rating-star)', fill: 'var(--nf-rating-star)' }} />)}
      </span>
    </span>
  )
}

function timeAgo(date: string | null): string {
  if (!date) return ''
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (!Number.isFinite(days) || days < 0) return ''
  if (days < 1) return 'Today'
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`
  return `${Math.floor(days / 365)} year${days < 730 ? '' : 's'} ago`
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  const [failed, setFailed] = useState(false)
  if (photo && !failed) {
    return <img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} className="h-10 w-10 flex-shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium" style={{ backgroundColor: 'var(--nf-primary-lighter)', color: 'var(--nf-primary)' }} aria-hidden="true">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const [open, setOpen] = useState(false)
  const text = review.comment || ''
  const long = text.length > LONG_REVIEW
  return (
    <article
      className="flex h-full flex-col rounded-2xl border p-5 sm:p-6"
      style={{ backgroundColor: 'var(--nf-card-bg)', borderColor: 'var(--nf-border)' }}
    >
      <div className="flex !flex-nowrap items-center justify-between">
        <StarRow value={review.rating} />
        <GoogleG className="h-5 w-5" />
      </div>
      <p className={`mt-4 flex-1 whitespace-pre-line text-sm leading-relaxed ${long && !open ? 'line-clamp-6' : ''}`} style={{ color: 'var(--nf-text)' }}>
        {text}
      </p>
      {long && (
        <button onClick={() => setOpen((v) => !v)} className="mt-2 self-start text-xs font-medium hover:underline" style={{ color: 'var(--nf-primary)' }}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
      <div className="mt-5 flex !flex-nowrap items-center gap-3 border-t pt-4" style={{ borderColor: 'var(--nf-border)' }}>
        <Avatar name={review.name} photo={review.photo} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium" style={{ color: 'var(--nf-heading)' }}>{review.name}</div>
          <div className="text-xs" style={{ color: 'var(--nf-text-muted)' }}>{timeAgo(review.date)}</div>
        </div>
      </div>
    </article>
  )
}

/** Homepage "Happy customers" section: Google rating + reviews chosen in Admin → Google reviews. */
export default function GoogleReviewsSection() {
  const [data, setData] = useState<Payload | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  useEffect(() => {
    let alive = true
    fetch(`${getApiBase()}/api/google-reviews`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Payload | null) => { if (alive && d && Array.isArray(d.reviews)) setData(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const updateEdges = () => {
    const el = trackRef.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [data])

  const scrollBy = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    const card = el.querySelector<HTMLElement>('[data-review-card]')
    el.scrollBy({ left: dir * ((card?.offsetWidth || el.clientWidth) + 20), behavior: 'smooth' })
  }

  if (!data || data.reviews.length === 0) return null

  return (
    <section className="py-12 sm:py-16 md:py-20" style={{ backgroundColor: 'var(--nf-page-bg)' }} aria-labelledby="happy-customers-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--nf-primary)' }}>Happy customers</p>
          <h2 id="happy-customers-title" className="mt-3 text-2xl font-light tracking-[0.15em] sm:text-3xl md:text-4xl" style={{ color: 'var(--nf-text)', ...headingFont }}>
            Loved by our customers
          </h2>
          {data.rating != null && (
            <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-full border px-5 py-2.5" style={{ borderColor: 'var(--nf-border)', backgroundColor: 'var(--nf-card-bg)' }}>
              <GoogleG className="h-5 w-5" />
              <span className="text-lg font-semibold" style={{ color: 'var(--nf-heading)' }}>{data.rating.toFixed(1)}</span>
              <StarRow value={data.rating} />
              <span className="text-sm" style={{ color: 'var(--nf-text-muted)' }}>
                {data.total > 0 ? `${data.total.toLocaleString('en-IN')} Google review${data.total === 1 ? '' : 's'}` : 'Google reviews'}
              </span>
            </div>
          )}
        </div>

        <div className="relative mt-10">
          <div
            ref={trackRef}
            onScroll={updateEdges}
            className="-mx-4 flex !flex-nowrap snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 sm:scroll-px-0 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {data.reviews.map((r) => (
              <div key={r.id} data-review-card className="w-[85%] flex-shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]">
                <ReviewCard review={r} />
              </div>
            ))}
          </div>
          {data.reviews.length > 1 && (
            <>
              <button
                onClick={() => scrollBy(-1)}
                disabled={edges.start}
                className="absolute -left-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0 md:flex"
                style={{ backgroundColor: 'var(--nf-card-bg)', borderColor: 'var(--nf-border)', color: 'var(--nf-heading)' }}
                aria-label="Previous reviews"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => scrollBy(1)}
                disabled={edges.end}
                className="absolute -right-5 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-opacity disabled:pointer-events-none disabled:opacity-0 md:flex"
                style={{ backgroundColor: 'var(--nf-card-bg)', borderColor: 'var(--nf-border)', color: 'var(--nf-heading)' }}
                aria-label="More reviews"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {(data.mapsUrl || data.writeReviewUrl) && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {data.mapsUrl && (
              <a
                href={data.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors hover:opacity-80"
                style={{ borderColor: 'var(--nf-button-secondary-border)', color: 'var(--nf-button-secondary-text)' }}
              >
                See all reviews on Google
              </a>
            )}
            {data.writeReviewUrl && (
              <a
                href={data.writeReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--nf-button-primary-bg)', color: 'var(--nf-button-primary-text)' }}
              >
                Write a review
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
