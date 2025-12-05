import React, { useEffect } from 'react'

interface SmoothScrollProps {
  children: React.ReactNode
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    // Initialize smooth scroll for anchor links (only for page anchors, not routing)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement
      
      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href && href.startsWith('#') && !href.startsWith('#/')) {
          // Only handle page anchors (e.g., #section-id), not routing links (e.g., #/user/home)
          e.preventDefault()
          const targetId = href.substring(1)
          const targetElement = document.getElementById(targetId)
          
          if (targetElement) {
            targetElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            })
          }
        }
        // If it's a routing link (#/user/...), let it work normally
      }
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return <>{children}</>
}

export function smoothScrollTo(elementId: string, offset: number = 0) {
  const element = document.getElementById(elementId)
  if (element) {
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    })
  }
}

