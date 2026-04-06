import { useId } from 'react'

interface VerifiedBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  /** Accessible name; shown as native tooltip on hover */
  title?: string
}

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
          <radialGradient id={gradId} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#8AD4FF" />
            <stop offset="55%" stopColor="#3BAAF5" />
            <stop offset="100%" stopColor="#1E88E5" />
          </radialGradient>
        </defs>
        {/* Base star */}
        <path
          d="M12 2L14.9 8.3L22 9.2L17 14L18.2 21L12 17.8L5.8 21L7 14L2 9.2L9.1 8.3L12 2Z"
          fill="#3BAAF5"
        />
        {/* Gloss / depth */}
        <path
          d="M12 2L14.9 8.3L22 9.2L17 14L18.2 21L12 17.8L5.8 21L7 14L2 9.2L9.1 8.3L12 2Z"
          fill={`url(#${gradId})`}
          opacity={0.75}
        />
        {/* Head (reference: person + check) */}
        <circle cx="12" cy="9.2" r="1.85" fill="white" />
        {/* Check */}
        <path
          d="M8.2 13.2L11 15.6L16.2 10.4"
          stroke="white"
          strokeWidth="1.85"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}
