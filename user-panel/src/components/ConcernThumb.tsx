import type { Concern } from '../hooks/useConcerns'

/** Round concern image, or the concern's initial on a soft brand circle until an image is uploaded. */
export default function ConcernThumb({ concern, className = 'h-10 w-10', textClass = 'text-base' }: {
  concern: Pick<Concern, 'name' | 'image_url'>
  className?: string
  textClass?: string
}) {
  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`}
      style={{ backgroundColor: 'var(--nf-primary-lighter)' }}
      aria-hidden="true"
    >
      {concern.image_url ? (
        <img src={concern.image_url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <span className={`font-light ${textClass}`} style={{ color: 'var(--nf-primary)', fontFamily: 'var(--font-heading-family)' }}>
          {concern.name.charAt(0)}
        </span>
      )}
    </span>
  )
}
