import React, { useState, useEffect, useRef } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showSkipButton, setShowSkipButton] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [isPortrait, setIsPortrait] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const splashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Detect orientation
  useEffect(() => {
    const checkOrientation = () => {
      const isPortraitMode = window.innerHeight > window.innerWidth
      setIsPortrait(isPortraitMode)
    }

    // Check initial orientation
    checkOrientation()

    // Listen for orientation changes
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  useEffect(() => {
    // Auto-complete splash screen after 1.8 seconds
    splashTimeoutRef.current = setTimeout(() => {
      onComplete()
    }, 1800)

    // Show skip button after 3 seconds
    const skipTimer = setTimeout(() => {
      setShowSkipButton(true)
    }, 3000)

    return () => {
      clearTimeout(skipTimer)
      if (splashTimeoutRef.current) {
        clearTimeout(splashTimeoutRef.current)
      }
    }
  }, [onComplete])

  const handleVideoEnded = () => {
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current)
    }
    onComplete()
  }

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true)
    setVideoError(false)
  }

  const handleVideoError = () => {
    setVideoError(true)
    setIsVideoLoaded(false)
    // Auto-complete after error
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current)
    }
    setTimeout(() => {
      onComplete()
    }, 2000)
  }

  const handleSkip = () => {
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current)
    }
    onComplete()
  }

  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
      } else {
        videoRef.current.pause()
      }
    }
  }

  // Get the appropriate video source based on orientation
  const getVideoSource = () => {
    if (isPortrait) {
      return '/IMAGES/SS LOGO PORTRAIT.mp4'
    }
    return '/IMAGES/SS LOGO.mp4'
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Full-screen video container with no margins */}
      <div className="absolute inset-0 w-full h-full">
        {!videoError ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover cursor-pointer"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onLoadedData={handleVideoLoaded}
            onError={handleVideoError}
            onClick={handleVideoClick}
          >
            <source src={getVideoSource()} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-center">
            <div>
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold mb-2">Video Loading Error</h2>
              <p className="text-lg opacity-80">Proceeding to website...</p>
            </div>
          </div>
        )}
        
        {/* Loading indicator */}
        {!isVideoLoaded && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-lg">Loading video...</p>
              <p className="text-sm opacity-70 mt-2">Click to play/pause</p>
              <p className="text-xs opacity-50 mt-1">
                {isPortrait ? 'Portrait Mode' : 'Landscape Mode'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Skip Button */}
      {showSkipButton && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors border border-white/30 z-10"
        >
          Skip
        </button>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <div className="bg-white/20 rounded-full h-1">
          <div className="bg-white h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
        </div>
      </div>

      {/* Video Controls Hint */}
      {isVideoLoaded && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 text-white/70 text-sm">
          Click video to play/pause
        </div>
      )}

      {/* Orientation Indicator (for debugging) */}
      <div className="absolute top-6 left-6 text-white/50 text-xs z-10">
        {isPortrait ? '📱 Portrait' : '🖥️ Landscape'}
      </div>
    </div>
  )
}
