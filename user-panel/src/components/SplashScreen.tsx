import React, { useState, useEffect, useRef, useMemo } from 'react'
import { encodeMediaUrl } from '../utils/apiBase'

interface SplashScreenProps {
  onComplete: () => void
}

type VideoType = 'portrait' | 'tablet' | 'desktop'

const DEFAULT_SPLASH_VIDEOS = {
  desktop: '/IMAGES/SS LOGO.mp4',
  tablet: '/IMAGES/SS LOGO TAB.mp4',
  mobile: '/IMAGES/SS LOGO PORTRAIT.mp4',
}

const CMS_SECTIONS_URL = '/api/cms/sections/home'

function encodeSplashVideos(videos: typeof DEFAULT_SPLASH_VIDEOS) {
  return {
    desktop: encodeMediaUrl(videos.desktop) || encodeMediaUrl(DEFAULT_SPLASH_VIDEOS.desktop),
    tablet: encodeMediaUrl(videos.tablet) || encodeMediaUrl(DEFAULT_SPLASH_VIDEOS.tablet),
    mobile: encodeMediaUrl(videos.mobile) || encodeMediaUrl(DEFAULT_SPLASH_VIDEOS.mobile),
  }
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showSkipButton, setShowSkipButton] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [videoType, setVideoType] = useState<VideoType>('desktop')
  const [isPlaying, setIsPlaying] = useState(false)
  const [splashVideos, setSplashVideos] = useState(() => encodeSplashVideos(DEFAULT_SPLASH_VIDEOS))
  const [sourcesReady, setSourcesReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const hasStartedPlayingRef = useRef(false)
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const splashTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const videoSrc = useMemo(() => {
    if (videoType === 'portrait') {
      return splashVideos.mobile
    }
    if (videoType === 'tablet') {
      return splashVideos.tablet
    }
    return splashVideos.desktop
  }, [videoType, splashVideos])

  // Detect device type and aspect ratio
  useEffect(() => {
    const detectVideoType = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      if (height > width) {
        const portraitRatio = height / width
        if (portraitRatio >= 1.5) {
          setVideoType('portrait')
          return
        }
      }

      const aspectRatio = width / height
      if (aspectRatio >= 1.1 && aspectRatio <= 1.6) {
        setVideoType('tablet')
        return
      }

      setVideoType('desktop')
    }

    detectVideoType()
    window.addEventListener('resize', detectVideoType)
    window.addEventListener('orientationchange', detectVideoType)

    return () => {
      window.removeEventListener('resize', detectVideoType)
      window.removeEventListener('orientationchange', detectVideoType)
    }
  }, [])

  // Load CMS splash URLs before mounting <video> (avoids failing on defaults then ignoring CMS)
  useEffect(() => {
    let cancelled = false

    const fetchSplashContent = async () => {
      let videos = { ...DEFAULT_SPLASH_VIDEOS }
      try {
        const response = await fetch(CMS_SECTIONS_URL)
        if (response.ok) {
          const sections = await response.json()
          const splashSection = sections.find((s: { section_type?: string }) => s.section_type === 'splash_screen')
          const content = splashSection?.content
          if (content) {
            videos = {
              desktop: content.desktop?.video || DEFAULT_SPLASH_VIDEOS.desktop,
              tablet: content.tablet?.video || DEFAULT_SPLASH_VIDEOS.tablet,
              mobile: content.mobile?.video || DEFAULT_SPLASH_VIDEOS.mobile,
            }
          }
        }
      } catch (error) {
        console.error('Failed to load splash screen videos:', error)
      }

      if (!cancelled) {
        setSplashVideos(encodeSplashVideos(videos))
        setSourcesReady(true)
      }
    }

    fetchSplashContent()
    return () => {
      cancelled = true
    }
  }, [])

  // Reset playback state when the resolved URL changes (CMS load or orientation)
  useEffect(() => {
    if (!sourcesReady) return
    setVideoError(false)
    setIsVideoLoaded(false)
    setIsPlaying(false)
    hasStartedPlayingRef.current = false
    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [videoSrc, sourcesReady])

  useEffect(() => {
    splashTimeoutRef.current = setTimeout(() => {
      onComplete()
    }, 1800)

    const skipTimer = setTimeout(() => {
      setShowSkipButton(true)
    }, 3000)

    loadingTimeoutRef.current = setTimeout(() => {
      if (!isPlaying && !videoError) {
        setIsVideoLoaded(true)
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
    if (splashTimeoutRef.current) {
      clearTimeout(splashTimeoutRef.current)
    }
    onComplete()
  }

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true)
    setVideoError(false)
    if (videoRef.current && !hasStartedPlayingRef.current) {
      hasStartedPlayingRef.current = true
      videoRef.current.play().catch((err) => {
        console.error('Error playing video on load:', err)
        setIsVideoLoaded(true)
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
    console.error('[splash] Video failed to load:', videoSrc)
    setVideoError(true)
    setIsVideoLoaded(false)
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

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {!sourcesReady ? (
          <div className="text-white text-sm opacity-70">Loading…</div>
        ) : !videoError ? (
          <video
            key={videoSrc}
            ref={videoRef}
            className="w-full h-full object-contain cursor-pointer"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleVideoEnded}
            onLoadedData={handleVideoLoaded}
            onCanPlay={() => {
              if (videoRef.current && !hasStartedPlayingRef.current && videoRef.current.paused) {
                hasStartedPlayingRef.current = true
                videoRef.current.play().catch((err) => {
                  console.error('Error playing video:', err)
                  setIsVideoLoaded(true)
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
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-center px-6">
            <div>
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold mb-2">Video Loading Error</h2>
              <p className="text-lg opacity-80 mb-2">Proceeding to website…</p>
              <p className="text-xs opacity-60 break-all max-w-md mx-auto">
                Check file exists at this URL (admin uploads → /uploads/, defaults → /IMAGES/):
                <br />
                {videoSrc}
              </p>
            </div>
          </div>
        )}
      </div>

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
