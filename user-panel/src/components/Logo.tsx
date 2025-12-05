import React from 'react'

interface LogoProps {
  className?: string
  href?: string
}

export default function Logo({ className = "font-semibold text-xl hover:text-blue-600 transition-colors", href = "#/" }: LogoProps) {
  return (
    <a href={href} className={`${className} block max-w-full overflow-hidden`}>
      <img 
        src="/IMAGES/light theme logo.webp" 
        alt="Nefol" 
        className="h-8 sm:h-10 md:h-12 lg:h-14 w-auto max-w-[120px] sm:max-w-[140px] md:max-w-[160px] lg:max-w-[180px] transition-opacity duration-300 hover:opacity-80 object-contain"
        style={{ maxHeight: '56px' }}
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = '<span style="font-family: var(--font-heading-family); font-size: 1.5rem; letter-spacing: 0.1em; font-weight: 600;">NEFOL</span>'
          }
        }}
      />
    </a>
  )
}
