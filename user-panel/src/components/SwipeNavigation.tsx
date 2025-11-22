import React, { useEffect, useRef } from 'react'

interface SwipeNavigationProps {
  enabled?: boolean
  threshold?: number
  minSwipeDistance?: number
}

export default function SwipeNavigation({ 
  enabled = true, 
  threshold = 50,
  minSwipeDistance = 100 
}: SwipeNavigationProps) {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const touchEndY = useRef<number | null>(null)
  const isSwipeActive = useRef(false)
  const navigationHistory = useRef<string[]>([])
  const historyIndex = useRef<number>(-1)
  const isNavigatingProgrammatically = useRef(false)

  // Track navigation history
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash || '#/user/'
      
      // Skip tracking if we're navigating programmatically (swipe navigation)
      if (isNavigatingProgrammatically.current) {
        isNavigatingProgrammatically.current = false
        return
      }
      
      // Only track if it's a new hash (not from back/forward)
      const lastHash = navigationHistory.current[historyIndex.current]
      if (newHash !== lastHash) {
        // Remove any forward history if we navigated to a new page
        if (historyIndex.current < navigationHistory.current.length - 1) {
          navigationHistory.current = navigationHistory.current.slice(0, historyIndex.current + 1)
        }
        
        // Add new hash to history
        navigationHistory.current.push(newHash)
        historyIndex.current = navigationHistory.current.length - 1
        
        // Limit history size to prevent memory issues
        if (navigationHistory.current.length > 50) {
          navigationHistory.current = navigationHistory.current.slice(-50)
          historyIndex.current = navigationHistory.current.length - 1
        }
      }
    }

    // Initialize history
    const initialHash = window.location.hash || '#/user/'
    navigationHistory.current = [initialHash]
    historyIndex.current = 0

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    // Only enable on mobile/tablet devices (screens <= 1024px)
    const isMobileOrTablet = () => {
      return window.innerWidth <= 1024
    }

    if (!enabled || !isMobileOrTablet()) {
      return
    }

    const handleTouchStart = (e: TouchEvent) => {
      // Don't interfere with scrolling or other interactions
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('.swipe-disabled')
      ) {
        return
      }

      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
      isSwipeActive.current = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwipeActive.current || touchStartX.current === null) return

      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const deltaX = Math.abs(currentX - (touchStartX.current || 0))
      const deltaY = Math.abs(currentY - (touchStartY.current || 0))

      // If vertical scroll is more than horizontal, it's a scroll, not a swipe
      if (deltaY > deltaX) {
        isSwipeActive.current = false
        return
      }

      // Prevent default scrolling if it's a horizontal swipe
      if (deltaX > threshold) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwipeActive.current || touchStartX.current === null || touchStartY.current === null) {
        return
      }

      touchEndX.current = e.changedTouches[0].clientX
      touchEndY.current = e.changedTouches[0].clientY

      const deltaX = touchEndX.current - touchStartX.current
      const deltaY = Math.abs(touchEndY.current - touchStartY.current)

      // Reset
      isSwipeActive.current = false

      // Check if it's a horizontal swipe (not vertical scroll)
      if (Math.abs(deltaX) < deltaY) {
        return
      }

      // Check if swipe distance is sufficient
      if (Math.abs(deltaX) < minSwipeDistance) {
        return
      }

      // Swipe right (back) - negative deltaX
      if (deltaX < 0 && Math.abs(deltaX) >= minSwipeDistance) {
        // Navigate back in our tracked history
        if (historyIndex.current > 0) {
          historyIndex.current--
          const previousHash = navigationHistory.current[historyIndex.current]
          if (previousHash) {
            isNavigatingProgrammatically.current = true
            window.location.hash = previousHash
          }
        } else {
          // Fallback to browser history if our tracked history is empty
          if (window.history.length > 1) {
            window.history.back()
          }
        }
      }
      // Swipe left (forward) - positive deltaX
      else if (deltaX > 0 && deltaX >= minSwipeDistance) {
        // Navigate forward in our tracked history
        if (historyIndex.current < navigationHistory.current.length - 1) {
          historyIndex.current++
          const nextHash = navigationHistory.current[historyIndex.current]
          if (nextHash) {
            isNavigatingProgrammatically.current = true
            window.location.hash = nextHash
          }
        } else {
          // Fallback to browser history
          window.history.forward()
        }
      }

      // Reset touch positions
      touchStartX.current = null
      touchStartY.current = null
      touchEndX.current = null
      touchEndY.current = null
    }

    // Add event listeners with passive: false for preventDefault to work
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, threshold, minSwipeDistance])

  // This component doesn't render anything
  return null
}

