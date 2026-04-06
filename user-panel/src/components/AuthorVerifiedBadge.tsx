import VerifiedBadge from './VerifiedBadge'

/** NEFOL Social: same star badge as storefront `VerifiedBadge`, for verified author profiles. */
export function AuthorVerifiedBadge({ className = '' }: { className?: string }) {
  return (
    <VerifiedBadge className={`align-middle ${className}`} size="sm" title="Verified author" />
  )
}
