interface VerifiedBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function VerifiedBadge({ className = '', size = 'md' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`} title="Verified Purchase">
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Blue circle background */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="#0095F6"
        />
        {/* White checkmark */}
        <path
          d="M8 12L10.5 14.5L16 9"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </span>
  )
}

