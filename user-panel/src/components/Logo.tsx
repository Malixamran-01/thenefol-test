import React from 'react'

interface LogoProps {
  className?: string
  href?: string
}

export default function Logo({ className = "font-semibold text-xl hover:text-blue-600 transition-colors", href = "#/" }: LogoProps) {
  return (
    <a href={href} className={`${className} block`}>
      <img 
        src="/IMAGES/light theme logo.webp" 
        alt="Nefol" 
        className="h-10 sm:h-12 md:h-14 w-auto transition-opacity duration-300 hover:opacity-80"
        style={{ maxHeight: '56px' }}
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.innerHTML = '<span style="font-family: \'Cormorant Garamond\', serif; font-size: 1.5rem; letter-spacing: 0.1em; font-weight: 400;">NEFOL</span>'
          }
        }}
      />
    </a>
  )
}
