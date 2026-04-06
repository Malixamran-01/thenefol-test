import VerifiedBadge from './VerifiedBadge'

type BadgeSize = 'sm' | 'md' | 'lg' | 'xl'

/** NEFOL Social: star badge for verified authors (sizes match `VerifiedBadge`). */
export function AuthorVerifiedBadge({
  className = '',
  size = 'md',
}: {
  className?: string
  size?: BadgeSize
}) {
  return (
    <VerifiedBadge
      className={`align-middle ${className}`}
      size={size}
      title="Verified author"
    />
  )
}
