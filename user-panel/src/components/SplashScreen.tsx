import React, { useState, useEffect, useRef } from 'react'
import { getApiBase } from '../utils/apiBase'

interface SplashScreenProps {
  onComplete: () => void
}

type VideoType = 'portrait' | 'tablet' | 'desktop'

const DEFAULT_SPLASH_VIDEOS = {
  desktop: '/IMAGES/SS LOGO.mp4',
  tablet: '/IMAGES/SS LOGO TAB.mp4',
  mobile: '/IMAGES/SS LOGO PORTRAIT.mp4'
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showSkipButton, setShowSkipButton] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoType, setVideoType] = useState<VideoType>('desktop')
  const [isPlaying, setIsPlaying] = useState(false)
  const [splashVideos, setSplashVideos] = useState(DEFAULT_SPLASH_VIDEOS)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasStartedPlayingRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const splashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const getCmsApiBase = () => {
    const apiBase = getApiBase().replace(/\/$/, '')
    const normalized = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`
    return `${normalized}/cms`
  }

  const normalizeVideoUrl = (url?: string) => {
    if (!url) return ''
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/')) {
      return `${getApiBase().replace(/\/$/, '')}${url}`
    }
    return `${getApiBase().replace(/\/$/, '')}/${url.replace(/^\/+/, '')}`
  }

  // Detect device type and aspect ratio
  useEffect(() => {
    const detectVideoType = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      // Portrait mode (9:16 ratio) - height > width
      if (height > width) {
        const portraitRatio = height / width
        // 9:16 in portrait = 16/9 = 1.778, allow some tolerance (1.5 to 2.5)
        if (portraitRatio >= 1.5) {
          setVideoType('portrait')
          return
        }
      }

      // Calculate landscape aspect ratio
      const aspectRatio = width / height

      // Tablet mode (4:3 = 1.333) - allow tolerance between 1.1 and 1.6
      if (aspectRatio >= 1.1 && aspectRatio <= 1.6) {
        setVideoType('tablet')
        return
      }

      // Desktop/Landscape mode (16:9 = 1.778) - wider screens
      // Default to desktop for aspect ratio > 1.6
      setVideoType('desktop')
    }

    // Check initial orientation
    detectVideoType()

    // Listen for orientation changes
    window.addEventListener('resize', detectVideoType)
    window.addEventListener('orientationchange', detectVideoType)

    return () => {
      window.removeEventListener('resize', detectVideoType)
      window.removeEventListener('orientationchange', detectVideoType)
    }
  }, [])

  useEffect(() => {
    const fetchSplashContent = async () => {
      try {
        const cmsBase = getCmsApiBase()
        const response = await fetch(`${cmsBase}/sections/home`)
        if (response.ok) {
          const sections = await response.json()
          const splashSection = sections.find((s: any) => s.section_type === 'splash_screen')
          if (splashSection?.content) {
            const desktopVideo = normalizeVideoUrl(splashSection.content.desktop?.video)
            const tabletVideo = normalizeVideoUrl(splashSection.content.tablet?.video)
            const mobileVideo = normalizeVideoUrl(splashSection.content.mobile?.video)
            setSplashVideos({
              desktop: desktopVideo || DEFAULT_SPLASH_VIDEOS.desktop,
              tablet: tabletVideo || DEFAULT_SPLASH_VIDEOS.tablet,
              mobile: mobileVideo || DEFAULT_SPLASH_VIDEOS.mobile
            })
          }
        }
      } catch (error) {
        console.error('Failed to load splash screen videos:', error)
      }
    }

    fetchSplashContent()
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

    // Fallback: If video doesn't start playing within 10 seconds, allow skip
    loadingTimeoutRef.current = setTimeout(() => {
      if (!isPlaying && !videoError) {
        console.log('Video loading timeout - allowing skip')
        setIsVideoLoaded(true) // Hide loading indicator
      }
    }, 10000)

    return () => {
      clearTimeout(skipTimer)
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
      if (splashTimeoutRef.current) {
        clearTimeout(splashTimeoutRef.current)
      }
    }
  }, [isPlaying, videoError, onComplete])

  const handleVideoEnded = () => {
    // Video finished, navigate to page
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current)
    }
    onComplete()
  }

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true)
    setVideoError(false)
    // Try to play video when loaded
    if (videoRef.current && !hasStartedPlayingRef.current) {
      hasStartedPlayingRef.current = true
      videoRef.current.play().catch((err) => {
        console.error('Error playing video on load:', err)
        // If autoplay fails, show instructions to user
        setIsVideoLoaded(true) // Hide loading so user can interact
      })
    }
  }

  const handleVideoPlaying = () => {
    setIsPlaying(true)
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current)
    }
  }

  const handleVideoPause = () => {
    setIsPlaying(false)
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
        videoRef.current.play().catch((err) => {
          console.error('Error playing video on click:', err)
        })
      } else {
        videoRef.current.pause()
      }
    }
  }

  const handleLoadingClick = () => {
    // Allow user to click during loading to start playback
    if (videoRef.current && !isPlaying) {
      videoRef.current.play().catch((err) => {
        console.error('Error playing video on loading click:', err)
      })
    }
  }

  // Get the appropriate video source based on device type
  const getVideoSource = () => {
    if (videoType === 'portrait') {
      return splashVideos.mobile || DEFAULT_SPLASH_VIDEOS.mobile
    }
    if (videoType === 'tablet') {
      return splashVideos.tablet || DEFAULT_SPLASH_VIDEOS.tablet
    }
    return splashVideos.desktop || DEFAULT_SPLASH_VIDEOS.desktop
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Full-screen video container */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {!videoError ? (
          <video
            ref={videoRef}
            className="w-full h-full object-contain cursor-pointer"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onLoadedData={handleVideoLoaded}
            onCanPlay={() => {
              // Ensure video plays only once when ready
              if (videoRef.current && !hasStartedPlayingRef.current && videoRef.current.paused) {
                hasStartedPlayingRef.current = true
                videoRef.current.play().catch((err) => {
                  console.error('Error playing video:', err)
                  // Autoplay blocked - user will need to click
                  setIsVideoLoaded(true) // Hide loading so user can interact
                })
              }
            }}
            onPlay={handleVideoPlaying}
            onPause={handleVideoPause}
            onPlaying={handleVideoPlaying}
            onError={handleVideoError}
            onClick={handleVideoClick}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          >
            <source src={getVideoSource()} type="video/mp4" />
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
      </div>

      {/* Skip Button */}
      {showSkipButton && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 active:bg-white/40 transition-colors border border-white/30 z-10"
        >
          Skip
        </button>
      )}
    </div>
  )
}
