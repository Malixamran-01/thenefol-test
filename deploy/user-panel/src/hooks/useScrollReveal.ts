import { useEffect, useRef, useState } from 'react'

interface UseScrollRevealProps {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  delay?: number
}

export function useScrollReveal({
  threshold = 0.1,
  rootMargin = '0px',
  triggerOnce = true,
  delay = 0
}: UseScrollRevealProps = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsVisible(true)
              }, delay)
            } else {
              setIsVisible(true)
            }

            if (triggerOnce) {
              observer.disconnect()
            }
          } else if (!triggerOnce) {
            setIsVisible(false)
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, triggerOnce, delay])

  return {
    elementRef,
    isVisible,
    className: isVisible 
      ? 'animate-fade-in-up' 
      : 'opacity-0 translate-y-8'
  }
}

