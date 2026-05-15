import React, { useEffect } from 'react'
import {
  safeElementScrollIntoView,
  safeWindowScrollTo,
} from '../utils/safeScroll'

interface SmoothScrollProps {
  children: React.ReactNode
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest('a[href^="#"]') as HTMLAnchorElement

      if (anchor) {
        const href = anchor.getAttribute('href')
        if (href && href.startsWith('#') && !href.startsWith('#/')) {
          e.preventDefault()
          const targetId = href.substring(1)
          const targetElement = document.getElementById(targetId)

          if (targetElement) {
            safeElementScrollIntoView(targetElement, {
              behavior: 'smooth',
              block: 'start',
            })
          }
        }
      }
    }

    document.addEventListener('click', handleAnchorClick)

    return () => {
      document.removeEventListener('click', handleAnchorClick)
    }
  }, [])

  return <div className="contents">{children}</div>
}

export function smoothScrollTo(elementId: string, offset: number = 0) {
  const element = document.getElementById(elementId)
  if (element) {
    const elementPosition = element.getBoundingClientRect().top
    const offsetPosition = elementPosition + window.pageYOffset - offset

    safeWindowScrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    })
  }
}
