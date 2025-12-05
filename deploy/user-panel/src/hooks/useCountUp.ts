import { useState, useEffect, useRef } from 'react'

interface UseCountUpProps {
  end: number
  duration?: number
  startOnView?: boolean
  suffix?: string
  prefix?: string
  decimals?: number
}

export function useCountUp({ 
  end, 
  duration = 2000, 
  startOnView = true,
  suffix = '%',
  prefix = '',
  decimals = 0
}: UseCountUpProps) {
  const [count, setCount] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const countRef = useRef<number>(0)
  const animationFrameRef = useRef<number>()
  const elementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!startOnView) {
      // Start immediately
      animate()
    } else {
      // Start when element is in view
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !isAnimating) {
              animate()
              observer.disconnect()
            }
          })
        },
        { threshold: 0.5 }
      )

      if (elementRef.current) {
        observer.observe(elementRef.current)
      }

      return () => {
        observer.disconnect()
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
      }
    }
  }, [end, duration, startOnView])

  const animate = () => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = 0

    const updateCount = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function (ease-out)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)

      countRef.current = startValue + (end - startValue) * easeOutQuart
      setCount(countRef.current)

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(updateCount)
      } else {
        setCount(end)
        setIsAnimating(false)
      }
    }

    animationFrameRef.current = requestAnimationFrame(updateCount)
  }

  const formattedCount = () => {
    const rounded = decimals > 0 
      ? countRef.current.toFixed(decimals)
      : Math.floor(countRef.current).toString()
    return `${prefix}${rounded}${suffix}`
  }

  return {
    count: formattedCount(),
    isAnimating,
    elementRef
  }
}

