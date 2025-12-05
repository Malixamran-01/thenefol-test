import React, { ReactNode } from 'react'
import { useScrollReveal } from '../hooks/useScrollReveal'

interface ScrollRevealProps {
  children: ReactNode
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  delay?: number
  className?: string
  animationType?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'fade' | 'zoom'
}

const animationClasses = {
  'fade-up': 'animate-fade-in-up',
  'fade-down': 'animate-fade-in-down',
  'fade-left': 'animate-fade-in-left',
  'fade-right': 'animate-fade-in-right',
  'fade': 'animate-fade-in',
  'zoom': 'animate-zoom-in'
}

export default function ScrollReveal({
  children,
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  delay = 0,
  className = '',
  animationType = 'fade-up'
}: ScrollRevealProps) {
  const { elementRef, isVisible } = useScrollReveal({
    threshold,
    rootMargin,
    triggerOnce,
    delay
  })

  const baseClasses = isVisible 
    ? animationClasses[animationType]
    : 'opacity-0'

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`transition-all duration-700 ease-out ${baseClasses} ${className}`}
    >
      {children}
    </div>
  )
}

