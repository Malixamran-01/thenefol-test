import React from 'react'

interface ProfileAvatarProps {
  profilePhoto?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '50px' | 'nav'
  className?: string
  showName?: boolean
  onClick?: () => void
  clickable?: boolean
}

export default function ProfileAvatar({
  profilePhoto,
  name,
  size = 'md',
  className = '',
  showName = false,
  onClick,
  clickable = false
}: ProfileAvatarProps) {
  const sizeMap: Record<string, { px: string; text: string; num: number }> = {
    nav:   { px: 'h-8 w-8',   text: 'text-sm',  num: 32  },
    sm:    { px: 'h-8 w-8',   text: 'text-sm',  num: 32  },
    md:    { px: 'h-12 w-12', text: 'text-lg',  num: 48  },
    lg:    { px: 'h-16 w-16', text: 'text-xl',  num: 64  },
    xl:    { px: 'h-20 w-20', text: 'text-2xl', num: 80  },
    '50px':{ px: 'h-24 w-24', text: 'text-xl',  num: 96  },
  }

  const { px: sizeClass, text: textSize, num: sizeNum } = sizeMap[size] ?? sizeMap.md
  const clickableClasses = clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div
        className={`relative flex-shrink-0 bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center overflow-hidden rounded-full ${sizeClass} ${clickableClasses}`}
        onClick={onClick}
        style={{ touchAction: 'manipulation' }}
      >
        {profilePhoto ? (
          <img
            src={profilePhoto}
            alt={name || 'Profile'}
            className="absolute inset-0 w-full h-full object-cover object-center"
            width={sizeNum}
            height={sizeNum}
          />
        ) : (
          <img
            src="/IMAGES/profile icon.svg"
            alt="Profile"
            className="absolute inset-0 w-full h-full object-cover object-center"
            width={sizeNum}
            height={sizeNum}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = '<span style="font-size:1.5rem">👤</span>'
              }
            }}
          />
        )}
      </div>
      {showName && name && (
        <p className={`mt-1 font-semibold dark:text-slate-100 ${textSize}`}>{name}</p>
      )}
    </div>
  )
}
