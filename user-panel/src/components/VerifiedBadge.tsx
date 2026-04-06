interface VerifiedBadgeProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function VerifiedBadge({ className = '', size = 'md' }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <span
      className={`inline-flex items-center justify-center ${className}`}
      title="Verified"
    >
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Star Shape */}
        <path
          d="M12 2L14.9 8.3L22 9.2L17 14L18.2 21L12 17.8L5.8 21L7 14L2 9.2L9.1 8.3L12 2Z"
          fill="#3BAAF5"
        />

        {/* Soft gradient glow (optional premium feel) */}
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6EC6FF" />
            <stop offset="100%" stopColor="#1E88E5" />
          </radialGradient>
        </defs>

        {/* Overlay gradient */}
        <path
          d="M12 2L14.9 8.3L22 9.2L17 14L18.2 21L12 17.8L5.8 21L7 14L2 9.2L9.1 8.3L12 2Z"
          fill="url(#starGlow)"
          opacity="0.6"
        />

        {/* Tick */}
        <path
          d="M8.5 12.5L11 15L16 10"
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