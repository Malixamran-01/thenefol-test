import { useId } from 'react'

interface VerifiedBadgeProps {
  className?: string
  /** Visual scale — balanced next to body text / display names */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Accessible name; shown as native tooltip on hover */
  title?: string
}

/** Rounded 5-point star (smooth curves), 24×24 viewBox */
const STAR_PATH =
  'M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.007z'

export default function VerifiedBadge({
  className = '',
  size = 'md',
  title = 'Verified',
}: VerifiedBadgeProps) {
  const rawId = useId()
  const gradId = `vstar-g-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`

  const sizeClasses = {
    sm: 'h-4 w-4 min-h-4 min-w-4',
    md: 'h-5 w-5 min-h-5 min-w-5',
    lg: 'h-6 w-6 min-h-6 min-w-6',
    xl: 'h-8 w-8 min-h-8 min-w-8',
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      title={title}
    >
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        <defs>
          <radialGradient id={gradId} cx="50%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#0c5078" />
            <stop offset="55%" stopColor="#1568a1" />
            <stop offset="100%" stopColor="#1c5e99" />
          </radialGradient>
        </defs>
        <path
          d={STAR_PATH}
          fill="#3BAAF5"
          fillRule="evenodd"
          clipRule="evenodd"
        />
        <path
          d={STAR_PATH}
          fill={`url(#${gradId})`}
          fillRule="evenodd"
          clipRule="evenodd"
          opacity={0.78}
        />
        <path
          d="M9.55 13.5 L10.95 14.85 L15.45 10.85"
          stroke="white"
          strokeWidth="1.28"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}
