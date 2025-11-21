import React from 'react'
import { useTheme } from '../contexts/ThemeContext'

interface LogoProps {
  className?: string
  href?: string
}

export default function Logo({ className = "font-semibold text-xl hover:text-blue-600 transition-colors", href = "/admin" }: LogoProps) {
  const { theme } = useTheme()
  
  const logoSrc = theme === 'light' 
    ? '/IMAGES/light theme logo.png' 
    : '/IMAGES/dark theme logo.png'

  return (
    <a href={href} className={className}>
      <img 
        src={logoSrc} 
        alt="Nefol" 
        className="h-12 w-auto"
        onError={(e) => {
          // Fallback to text if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          const parent = target.parentElement
          if (parent) {
            parent.textContent = 'Nefol'
          }
        }}
      />
    </a>
  )
}
