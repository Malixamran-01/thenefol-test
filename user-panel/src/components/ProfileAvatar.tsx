import React from 'react'

interface ProfileAvatarProps {
  profilePhoto?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
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
  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-12 w-12 text-lg',
    lg: 'h-16 w-16 text-xl',
    xl: 'h-20 w-20 text-2xl'
  }

  const iconSize = sizeClasses[size]
  const clickableClasses = clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        className={`relative rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center overflow-hidden ${iconSize} ${clickableClasses}`}
        onClick={onClick}
      >
        {profilePhoto ? (
          <img 
            src={profilePhoto} 
            alt={name || "Profile"} 
            className="w-full h-full object-contain"
          />
        ) : (
          <img 
            src="/IMAGES/profile icon.svg" 
            alt="Profile" 
            className="w-6 h-6"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
              const parent = target.parentElement
              if (parent) {
                parent.innerHTML = '<span>👤</span>'
              }
            }}
          />
        )}
      </div>
      {showName && name && (
        <div>
          <p className="font-semibold dark:text-slate-100">{name}</p>
        </div>
      )}
    </div>
  )
}
