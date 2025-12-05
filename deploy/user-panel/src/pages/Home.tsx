import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Star, ShoppingCart, ChevronLeft, ChevronRight, Eye, Heart } from 'lucide-react'
import { api, reviewsAPI } from '../services/api'
import SubscriptionModal from '../components/SubscriptionModal'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../hooks/useProducts'
import PricingDisplay from '../components/PricingDisplay'
import { getProductRating, getProductReviewCount, hasVerifiedReviews } from '../utils/product_reviews'
import { useProductReviewStats } from '../hooks/useProductReviewStats'
import VerifiedBadge from '../components/VerifiedBadge'
import { getSessionId } from '../utils/session'
import { getApiBase } from '../utils/apiBase'

// Social Media Videos Component with auto-slide in horizontal line
const SocialMediaVideos: React.FC<{ videos: any[], scrollerRef: React.RefObject<HTMLDivElement> }> = ({ videos, scrollerRef }) => {
  const { user } = useAuth()
  const localVideos: string[] = []
  
  // Map videos with their data and URLs
  const apiVideos = (videos || []).map((v: any) => ({
    ...v,
    videoUrl: v.video_type === 'local' ? (() => {
      const apiBase = getApiBase()
      return `${apiBase.replace('/api', '')}/uploads/${v.video_url}`
    })() : v.video_url
  }))
  
  const allVideos = [...apiVideos]
  const [videoStats, setVideoStats] = useState<Record<number, { views: number, likes: number, liked: boolean }>>({})
  
  const [currentIndex, setCurrentIndex] = useState(0)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [videoWidth, setVideoWidth] = useState(0)
  const [carouselSettings, setCarouselSettings] = useState({
    autoAdvanceInterval: 3000,
    videoPlayDuration: 3000,
    animationDuration: 700,
    animationEasing: 'ease-in-out',
    autoPlay: true,
    radius: 500,
    blurAmount: 12,
    minOpacity: 0.6,
    minScale: 0.85
  })

  // Load carousel settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const apiBase = getApiBase()
        
        const response = await fetch(`${apiBase}/api/carousel-settings`)
        if (response.ok) {
          const data = await response.json()
          if (data && data.length > 0 && data[0].settings) {
            setCarouselSettings(data[0].settings)
          }
        }
      } catch (error) {
        console.error('Failed to load carousel settings:', error)
        // Fallback to localStorage
        const saved = localStorage.getItem('carousel-settings')
        if (saved) {
          try {
            setCarouselSettings(JSON.parse(saved))
          } catch (e) {
            console.error('Failed to parse saved settings:', e)
          }
        }
      }
    }
    loadSettings()
  }, [])

  // Calculate video width on mount and resize
  useEffect(() => {
    if (allVideos.length === 0) return
    
    const updateDimensions = () => {
      if (videoContainerRef.current) {
        const container = videoContainerRef.current
        const firstVideo = container.querySelector('.video-item') as HTMLElement
        if (firstVideo) {
          const width = firstVideo.offsetWidth
          setVideoWidth(width)
        }
      }
    }
    
    // Wait for videos to render
    const timeoutId = setTimeout(updateDimensions, 100)
    window.addEventListener('resize', updateDimensions)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [allVideos.length])

  // Auto-advance based on settings - use videoPlayDuration for timing
  useEffect(() => {
    if (allVideos.length === 0) return
    if (!carouselSettings.autoPlay) return
    
    const playDuration = carouselSettings.videoPlayDuration || carouselSettings.autoAdvanceInterval || 3000
    
    const intervalId = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const nextIndex = prevIndex + 1
        // Loop back to start when reaching the end
        return nextIndex >= allVideos.length ? 0 : nextIndex
      })
    }, playDuration)

    return () => {
      clearInterval(intervalId)
    }
  }, [allVideos.length, carouselSettings.autoPlay, carouselSettings.videoPlayDuration, carouselSettings.autoAdvanceInterval])

  // Load video stats
  useEffect(() => {
    if (allVideos.length === 0) return
    
    const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]')
    const stats: Record<number, { views: number, likes: number, liked: boolean }> = {}
    allVideos.forEach((video: any) => {
      if (video.id) {
        stats[video.id] = {
          views: video.views || 0,
          likes: video.likes || 0,
          liked: likedVideos.includes(video.id)
        }
      }
    })
    setVideoStats(stats)
  }, [allVideos.length])

  // Track video view when it becomes center - one view per user
  useEffect(() => {
    if (allVideos.length === 0) return
    
    const currentVideo = allVideos[currentIndex]
    if (!currentVideo || !currentVideo.id) return
    
    // Track view only once when video becomes center
    trackVideoView(currentVideo.id)
  }, [currentIndex, allVideos.length])

  const trackVideoView = async (videoId: number) => {
    try {
      const apiBase = getApiBase()
      
      const sessionId = getSessionId()
      const userId = user?.id || null
      
      const response = await fetch(`${apiBase}/api/videos/${videoId}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update stats with the actual view count from server
        // Only update if this was a new view (not already_viewed)
        if (!data.already_viewed) {
          setVideoStats(prev => ({
            ...prev,
            [videoId]: {
              ...prev[videoId] || { views: 0, likes: 0, liked: false },
              views: data.views || (prev[videoId]?.views || 0)
            }
          }))
        } else {
          // View was already recorded, just update with current count
          setVideoStats(prev => ({
            ...prev,
            [videoId]: {
              ...prev[videoId] || { views: 0, likes: 0, liked: false },
              views: data.views || (prev[videoId]?.views || 0)
            }
          }))
        }
      }
    } catch (error) {
      console.error('Failed to track video view:', error)
      // Don't increment locally on error - let backend handle tracking
      // Just ensure stats object exists for this video
      setVideoStats(prev => ({
        ...prev,
        [videoId]: {
          ...prev[videoId] || { views: 0, likes: 0, liked: false }
        }
      }))
    }
  }

  const handleLike = async (videoId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Just toggle liked status - likes are always 30% of views, so no need to update like count
    const isLiked = videoStats[videoId]?.liked || false
    
    setVideoStats(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId] || { views: 0, likes: 0, liked: false },
        liked: !isLiked
      }
    }))
    
    // Save liked status to localStorage per video
    const likedVideos = JSON.parse(localStorage.getItem('liked-videos') || '[]')
    if (!isLiked) {
      localStorage.setItem('liked-videos', JSON.stringify([...likedVideos, videoId]))
    } else {
      localStorage.setItem('liked-videos', JSON.stringify(likedVideos.filter((id: number) => id !== videoId)))
    }
  }

  const handleVideoClick = (video: any) => {
    if (video.redirect_url) {
      window.open(video.redirect_url, '_blank')
    }
  }

  // Play/pause videos based on center position
  useEffect(() => {
    if (allVideos.length === 0) return
    
    const videoElements = document.querySelectorAll('.video-item video') as NodeListOf<HTMLVideoElement>
    
    videoElements.forEach((video, idx) => {
      if (idx === currentIndex) {
        // Play center video
        video.play().catch((err) => {
          console.log('Video play error:', err)
        })
      } else {
        // Pause and reset other videos
        video.pause()
        video.currentTime = 0
      }
    })
  }, [currentIndex, allVideos.length])

  // Don't render if no videos
  if (allVideos.length === 0) {
    return null
  }

  return (
    <>
      <style>{`
        .video-carousel-container {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .video-carousel-container::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="relative w-full overflow-visible py-8 flex items-center justify-center" style={{ perspective: '1500px', perspectiveOrigin: 'center center' }}>
        <div 
          className="relative overflow-visible"
          style={{
            width: '100%',
            maxWidth: '100vw',
            height: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible'
          }}
        >
          <div
            ref={videoContainerRef}
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transform: `rotateY(${-currentIndex * (360 / allVideos.length)}deg)`,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `transform ${carouselSettings.animationDuration || 700}ms ${carouselSettings.animationEasing || 'ease-in-out'}`
            }}
          >
            {allVideos.map((video: any, idx) => {
              const src = video.videoUrl || video
              const videoId = video.id
              const stats = videoId ? videoStats[videoId] : null
              const angle = (360 / allVideos.length) * idx
              const isCenter = idx === currentIndex
              const distanceFromCenter = Math.abs(idx - currentIndex)
              const minDistance = Math.min(distanceFromCenter, allVideos.length - distanceFromCenter)
              const blurAmount = isCenter ? 0 : Math.min(minDistance * ((carouselSettings.blurAmount || 12) / 2), carouselSettings.blurAmount || 12)
              const opacity = isCenter ? 1 : Math.max(1 - minDistance * 0.15, carouselSettings.minOpacity || 0.6)
              const scale = isCenter ? 1 : Math.max(1 - minDistance * 0.05, carouselSettings.minScale || 0.85)
              
              const videoWidthValue = videoWidth > 0 ? videoWidth : 350
              
              return (
                <div
                  key={idx}
                  className="video-item absolute bg-white overflow-hidden rounded-xl shadow-lg transition-all duration-300 cursor-pointer"
                  style={{ 
                    width: `${videoWidthValue}px`,
                    aspectRatio: '9/16',
                    left: '50%',
                    top: '50%',
                    marginLeft: `-${videoWidthValue / 2}px`,
                    marginTop: `-${(videoWidthValue * (16 / 9)) / 2}px`,
                    transform: `
                      rotateY(${angle}deg) 
                      translateZ(${carouselSettings.radius || 500}px)
                      scale(${scale})
                    `,
                    filter: `blur(${blurAmount}px)`,
                    opacity: opacity,
                    zIndex: isCenter ? 10 : 5 - minDistance,
                    backfaceVisibility: 'visible',
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'auto'
                  }}
                  onClick={() => handleVideoClick(video)}
                >
                  <video
                    src={src}
                    className="block w-full h-full rounded-xl"
                    autoPlay={isCenter}
                    loop
                    muted
                    playsInline
                    controls={false}
                    onPlay={(e) => {
                      // Ensure video plays when it becomes center
                      const video = e.target as HTMLVideoElement
                      if (isCenter) {
                        video.play().catch(() => {})
                      }
                    }}
                    onPause={(e) => {
                      // Resume if it's the center video
                      const video = e.target as HTMLVideoElement
                      if (isCenter && carouselSettings.autoPlay) {
                        video.play().catch(() => {})
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      pointerEvents: 'none'
                    }}
                  />
                  
                  {/* Video Stats Overlay */}
                  {isCenter && videoId && (
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white z-20 pointer-events-none">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1 bg-black/50 px-3 py-1.5 rounded-full backdrop-blur-sm">
                          <Eye className="h-4 w-4 text-white" />
                          <span className="text-sm font-semibold text-white">{stats?.views || video.views || 0}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLike(videoId, e)
                          }}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-sm transition-all pointer-events-auto ${
                            stats?.liked ? 'bg-red-500/80' : 'bg-black/50'
                          } hover:bg-red-500/80`}
                        >
                          <Heart className={`h-4 w-4 ${stats?.liked ? 'fill-white text-white' : 'text-white'}`} />
                          <span className="text-sm font-semibold text-white">
                            {Math.round((stats?.views || video.views || 0) * 0.3)}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default function Home() {
  const { items: products, loading: productsLoading } = useProducts()
  const { addItem } = useCart()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [videos, setVideos] = useState<any[]>([])
  const videoScrollerRef = useRef<HTMLDivElement>(null)
  const [justLandedIndex, setJustLandedIndex] = useState(0)
  
  // Get all product slugs for batch fetching review stats
  const productSlugs = useMemo(() => {
    return products.map(p => p.slug || '').filter(slug => slug)
  }, [products])
  
  // Fetch review stats for all products
  const { stats: reviewStats } = useProductReviewStats(productSlugs)

  // CMS Sections State
  const [scrollingText, setScrollingText] = useState<string>('')
  const [topMediaImages, setTopMediaImages] = useState<string[]>([])
  const [topMediaSettings, setTopMediaSettings] = useState<any>({
    animationType: 'fade',
    transitionDuration: 1000,
    autoPlay: true,
    autoPlayDelay: 7000,
    designStyle: 'modern',
    showDots: true,
    showArrows: true,
    loop: true
  })
  const [topMediaIndex, setTopMediaIndex] = useState(0)

  const [heroImages, setHeroImages] = useState<string[]>([
    '/IMAGES/BANNER (1).webp',
    '/IMAGES/BANNER (2).webp',
    '/IMAGES/BANNER (3).webp'
  ])
  const [heroSettings, setHeroSettings] = useState<any>({
    animationType: 'fade',
    transitionDuration: 1000,
    autoPlay: true,
    autoPlayDelay: 7000,
    designStyle: 'modern',
    showDots: true,
    showArrows: true,
    loop: true
  })
  const [heroIndex, setHeroIndex] = useState(0)

  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({
    'Body': '/IMAGES/body.webp',
    'Face': '/IMAGES/face.webp',
    'Hair': '/IMAGES/hair.webp',
    'Combos': '/IMAGES/combo.webp'
  })
  const [commitmentImages, setCommitmentImages] = useState<string[]>([])
  const [completeKitImage, setCompleteKitImage] = useState<string>('')
  const [marketplaceLogos, setMarketplaceLogos] = useState<string[]>([])
  const [nefolCollection, setNefolCollection] = useState<any>({
    image: '',
    title: 'NEFOL COLLECTION',
    subtitle: 'ELEVATE YOUR SKINCARE WITH',
    description: 'Our premium collection combines the best of nature and science to deliver exceptional results for your skin.',
    buttonText: 'SHOP NOW',
    buttonLink: '/shop'
  })
  const [whatsappSubscription, setWhatsappSubscription] = useState({
    image: '/IMAGES/BANNER (1).webp',
    logo: '',
    heading: 'Join The Nefol Circle',
    description: 'Stay ahead with exclusive style drops, member-only offers, and insider fashion updates.',
    footer: 'By subscribing, you agree to receive WhatsApp messages from Nefol.',
    logoName: 'NEFÖL'
  })
  const [foreverFavorites, setForeverFavorites] = useState<any>({
    title: 'FOREVER FAVORITES',
    description: 'Discover our most loved products that have become staples in skincare routines worldwide.',
    luxurySkincare: {
      image: '',
      title: 'LUXURY SKINCARE',
      buttonText: 'SHOP NOW'
    },
    naturalBeauty: {
      image: '',
      title: 'NATURAL BEAUTY',
      buttonText: 'SHOP NOW'
    }
  })
  const [naturalBeauty, setNaturalBeauty] = useState<any>({
    image: '',
    title: 'NATURAL BEAUTY',
    subtitle: 'ELEVATE YOUR SKIN WITH',
    description: 'infused with premium natural ingredients',
    buttonText: 'SHOP NOW',
    buttonLink: '/shop'
  })


  // Helper function to normalize URLs
  const normalizeUrl = (url: string) => {
    if (!url) return ''
    const normalizedInput = url.trim()

    if (/^https?:\/\//i.test(normalizedInput)) {
      return normalizedInput
    }

    // Serve local static assets (like /IMAGES) directly without rewriting extensions
    if (normalizedInput.startsWith('/IMAGES/') || normalizedInput.startsWith('/favicon') || normalizedInput.startsWith('/sw.js')) {
      return normalizedInput
    }
    
    const apiBase = getApiBase()
    if (normalizedInput.startsWith('/')) {
      return `${apiBase}${normalizedInput}`
    }
    return `${apiBase}/${normalizedInput}`
  }

  const getCmsApiBase = () => {
    const apiBase = getApiBase().replace(/\/$/, '')
    const normalized = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`
    return `${normalized}/cms`
  }

  // Fetch Top Media Carousel from CMS
  const fetchTopMediaCarousel = async () => {
    try {
      const cmsBase = getCmsApiBase()
      const response = await fetch(`${cmsBase}/sections/home`)
      if (response.ok) {
        const sections = await response.json()
        const topMediaSection = sections.find((s: any) => s.section_type === 'top_media_carousel')
        
        if (topMediaSection && topMediaSection.content) {
          const content = topMediaSection.content
          let mediaArray: string[] = []
          
          if (content.media && Array.isArray(content.media)) {
            mediaArray = content.media.map((item: any) => normalizeUrl(typeof item === 'string' ? item : item.url))
          } else if (content.images && Array.isArray(content.images) && content.images.length > 0) {
            mediaArray = content.images.map(normalizeUrl)
          }
          
          if (mediaArray.length > 0) {
            setTopMediaImages(mediaArray)
          }
          
          if (content.settings) {
            setTopMediaSettings(content.settings)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch top media carousel from CMS:', error)
    }
  }

  // Fetch Hero Banner from CMS
  const fetchHeroBanner = async () => {
    try {
      const cmsBase = getCmsApiBase()
      const response = await fetch(`${cmsBase}/sections/home`)
      if (response.ok) {
        const sections = await response.json()
        const heroSection = sections.find((s: any) => s.section_type === 'hero_banner')
        
        if (heroSection && heroSection.content) {
          const content = heroSection.content
          
          if (content.images && Array.isArray(content.images) && content.images.length > 0) {
            const normalizedImages = content.images.map(normalizeUrl)
            setHeroImages(normalizedImages)
          }
          
          if (content.settings) {
            setHeroSettings(content.settings)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch hero banner from CMS:', error)
    }
  }

  // Fetch all CMS sections
  const fetchCMSSections = async () => {
    try {
      const cmsBase = getCmsApiBase()
      const response = await fetch(`${cmsBase}/sections/home`)
      if (response.ok) {
        const sections = await response.json()
        
        // Extract category images from shop_categories section
        const categorySection = sections.find((s: any) => s.section_type === 'shop_categories')
        if (categorySection && categorySection.content && categorySection.content.categories) {
          const newCategoryImages: Record<string, string> = {}
          categorySection.content.categories.forEach((cat: any) => {
            if (cat.image) {
              newCategoryImages[cat.name] = normalizeUrl(cat.image)
            }
          })
          if (Object.keys(newCategoryImages).length > 0) {
            setCategoryImages(prev => ({ ...prev, ...newCategoryImages }))
          }
        }
        
        // Extract commitment images from commitments section
        const commitmentSection = sections.find((s: any) => s.section_type === 'commitments')
        if (commitmentSection && commitmentSection.content && commitmentSection.content.images) {
          const images = Array.isArray(commitmentSection.content.images) 
            ? commitmentSection.content.images.map(normalizeUrl)
            : []
          if (images.length > 0) {
            setCommitmentImages(images)
          }
        }
        
        // Extract complete kit image from complete_kit section
        const completeKitSection = sections.find((s: any) => s.section_type === 'complete_kit')
        if (completeKitSection && completeKitSection.content && completeKitSection.content.image) {
          setCompleteKitImage(normalizeUrl(completeKitSection.content.image))
        }
        
        // Extract marketplace logos from marketplace_logos section
        const marketplaceSection = sections.find((s: any) => s.section_type === 'marketplace_logos')
        if (marketplaceSection && marketplaceSection.content && marketplaceSection.content.logos) {
          const logos = Array.isArray(marketplaceSection.content.logos)
            ? marketplaceSection.content.logos.map(normalizeUrl)
            : []
          if (logos.length > 0) {
            setMarketplaceLogos(logos)
          }
        }
        
        // Extract Nefol Collection from nefol_collection section
        const nefolCollectionSection = sections.find((s: any) => s.section_type === 'nefol_collection')
        if (nefolCollectionSection && nefolCollectionSection.content) {
          setNefolCollection({
            image: nefolCollectionSection.content.image ? normalizeUrl(nefolCollectionSection.content.image) : '',
            title: nefolCollectionSection.content.title || 'NEFOL COLLECTION',
            subtitle: nefolCollectionSection.content.subtitle || 'ELEVATE YOUR SKINCARE WITH',
            description: nefolCollectionSection.content.description || 'Our premium collection combines the best of nature and science to deliver exceptional results for your skin.',
            buttonText: nefolCollectionSection.content.buttonText || 'SHOP NOW',
            buttonLink: nefolCollectionSection.content.buttonLink || '/shop'
          })
        }
        
        // Extract Forever Favorites from forever_favorites section
        const foreverFavoritesSection = sections.find((s: any) => s.section_type === 'forever_favorites')
        if (foreverFavoritesSection && foreverFavoritesSection.content) {
          const imagesArray = foreverFavoritesSection.content.images || []
          const luxuryImg = foreverFavoritesSection.content.luxurySkincare?.image
          const naturalImg = foreverFavoritesSection.content.naturalBeauty?.image
          
          const luxuryImage = luxuryImg ? normalizeUrl(luxuryImg) : (imagesArray[0] ? normalizeUrl(imagesArray[0]) : '')
          const naturalImage = naturalImg ? normalizeUrl(naturalImg) : (imagesArray[1] ? normalizeUrl(imagesArray[1]) : '')
          
          setForeverFavorites({
            title: foreverFavoritesSection.content.title || 'FOREVER FAVORITES',
            description: foreverFavoritesSection.content.description || 'Discover our most loved products that have become staples in skincare routines worldwide.',
            luxurySkincare: {
              image: luxuryImage,
              title: foreverFavoritesSection.content.luxurySkincare?.title || 'LUXURY SKINCARE',
              buttonText: foreverFavoritesSection.content.luxurySkincare?.buttonText || 'SHOP NOW'
            },
            naturalBeauty: {
              image: naturalImage,
              title: foreverFavoritesSection.content.naturalBeauty?.title || 'NATURAL BEAUTY',
              buttonText: foreverFavoritesSection.content.naturalBeauty?.buttonText || 'SHOP NOW'
            }
          })
        }
        
        // Extract Natural Beauty from natural_beauty section
        const naturalBeautySection = sections.find((s: any) => s.section_type === 'natural_beauty')
        if (naturalBeautySection && naturalBeautySection.content) {
          setNaturalBeauty({
            image: naturalBeautySection.content.image ? normalizeUrl(naturalBeautySection.content.image) : '',
            title: naturalBeautySection.content.title || 'NATURAL BEAUTY',
            subtitle: naturalBeautySection.content.subtitle || 'ELEVATE YOUR SKIN WITH',
            description: naturalBeautySection.content.description || 'infused with premium natural ingredients',
            buttonText: naturalBeautySection.content.buttonText || 'SHOP NOW',
            buttonLink: naturalBeautySection.content.buttonLink || '/shop'
          })
        }
        
        // Extract Scrolling Text Banner from scrolling_text_banner section
        const scrollingTextSection = sections.find((s: any) => s.section_type === 'scrolling_text_banner')
        if (scrollingTextSection && scrollingTextSection.content && scrollingTextSection.content.text) {
          setScrollingText(scrollingTextSection.content.text)
        }
        
        // Extract WhatsApp Subscription from whatsappsubscription section
        const whatsappSection = sections.find((s: any) => s.section_type === 'whatsappsubscription')
        if (whatsappSection && whatsappSection.content) {
          setWhatsappSubscription({
            image: whatsappSection.content.image ? normalizeUrl(whatsappSection.content.image) : '/IMAGES/BANNER (1).webp',
            logo: whatsappSection.content.logo ? normalizeUrl(whatsappSection.content.logo) : '',
            heading: whatsappSection.content.heading || 'Join The Nefol Circle',
            description: whatsappSection.content.description || 'Stay ahead with exclusive style drops, member-only offers, and insider fashion updates.',
            footer: whatsappSection.content.footer || 'By subscribing, you agree to receive WhatsApp messages from Nefol.',
            logoName: whatsappSection.content.logoName || 'NEFÖL'
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch CMS sections:', error)
    }
  }

  // Fetch videos
  const fetchVideos = async () => {
    try {
      const data = await api.videos.getAll()
      setVideos(data)
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }

  // Fetch all data on mount
  useEffect(() => {
    Promise.allSettled([
      fetchTopMediaCarousel(),
      fetchHeroBanner(),
      fetchCMSSections(),
      fetchVideos()
    ])
  }, [])

  // Auto-rotate top media carousel
  useEffect(() => {
    if (topMediaImages.length === 0) return
    if (!topMediaSettings.autoPlay) return
    
    const id = window.setInterval(() => {
      setTopMediaIndex((prev) => {
        if (topMediaSettings.loop) {
          return (prev + 1) % topMediaImages.length
        } else {
          return prev < topMediaImages.length - 1 ? prev + 1 : prev
        }
      })
    }, topMediaSettings.autoPlayDelay || 7000)
    
    return () => window.clearInterval(id)
  }, [topMediaImages.length, topMediaSettings.autoPlay, topMediaSettings.autoPlayDelay, topMediaSettings.loop])

  // Auto-rotate hero images
  useEffect(() => {
    if (heroImages.length === 0) return
    if (!heroSettings.autoPlay) return
    
    const id = window.setInterval(() => {
      setHeroIndex((prev) => {
        if (heroSettings.loop) {
          return (prev + 1) % heroImages.length
        } else {
          return prev < heroImages.length - 1 ? prev + 1 : prev
        }
      })
    }, heroSettings.autoPlayDelay || 7000)
    
    return () => window.clearInterval(id)
  }, [heroImages.length, heroSettings.autoPlay, heroSettings.autoPlayDelay, heroSettings.loop])

  // Subscription modal (appears 5s after landing, only if not dismissed before)
  useEffect(() => {
    const hasDismissedSubscription = localStorage.getItem('nefol-subscription-dismissed')
    if (!hasDismissedSubscription) {
      const id = window.setTimeout(() => setShowSubscriptionModal(true), 5000)
      return () => window.clearTimeout(id)
    }
  }, [])

  const handleCloseSubscriptionModal = () => {
    setShowSubscriptionModal(false)
    localStorage.setItem('nefol-subscription-dismissed', 'true')
  }

  // Get featured products (all products excluding COMBO category)
  const allFeaturedProducts = products.filter(product => {
    const category = (product.category || '').toLowerCase()
    return category !== 'combo' && category !== 'combo pack' && !category.includes('combo')
  })
  
  // Get 4 products to display based on current index
  const productsPerPage = 4
  const maxIndex = Math.max(0, Math.ceil(allFeaturedProducts.length / productsPerPage) - 1)
  const currentIndex = Math.min(justLandedIndex, maxIndex)
  const featuredProducts = allFeaturedProducts.slice(
    currentIndex * productsPerPage,
    (currentIndex + 1) * productsPerPage
  )
  
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < maxIndex
  
  const handlePrevious = () => {
    setJustLandedIndex(prev => Math.max(0, prev - 1))
  }
  
  const handleNext = () => {
    setJustLandedIndex(prev => Math.min(maxIndex, prev + 1))
  }

  return (
    <main className="min-h-screen bg-white overflow-x-hidden" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <style>{`
        :root {
          --arctic-blue-primary: #7DD3D3;
          --arctic-blue-primary-hover: #5EC4C4;
          --arctic-blue-primary-dark: #4A9FAF;
          --arctic-blue-light: #E0F5F5;
          --arctic-blue-lighter: #F0F9F9;
          --arctic-blue-background: #F4F9F9;
        }
      `}</style>
      {/* Scrolling Text Banner - Between Navbar and Top Media Carousel */}
      {scrollingText && (
        <section className="relative py-2 overflow-hidden mt-0 sm:mt-2 md:mt-4" style={{ backgroundColor: 'var(--arctic-blue-primary)' }}>
          <div className="scrolling-text-wrapper">
            <div className="scrolling-text-content">
              <span className="scrolling-text-item">{scrollingText}</span>
              <span className="scrolling-text-separator"> • </span>
              <span className="scrolling-text-item">{scrollingText}</span>
              <span className="scrolling-text-separator"> • </span>
              <span className="scrolling-text-item">{scrollingText}</span>
              <span className="scrolling-text-separator"> • </span>
              <span className="scrolling-text-item">{scrollingText}</span>
              <span className="scrolling-text-separator"> • </span>
              <span className="scrolling-text-item">{scrollingText}</span>
              <span className="scrolling-text-separator"> • </span>
              <span className="scrolling-text-item">{scrollingText}</span>
            </div>
          </div>
          <style>{`
            .scrolling-text-wrapper {
              width: 100%;
              overflow: hidden;
              white-space: nowrap;
              position: relative;
            }
            .scrolling-text-content {
              display: inline-flex;
              align-items: center;
              will-change: transform;
              animation: scroll-left-to-right 40s linear infinite;
              font-weight: 600;
              font-size: 0.875rem;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .scrolling-text-item {
              display: inline-block;
              padding: 0 2rem;
              white-space: nowrap;
              flex-shrink: 0;
            }
            .scrolling-text-separator {
              display: inline-block;
              padding: 0 1rem;
              flex-shrink: 0;
            }
            @keyframes scroll-left-to-right {
              0% {
                transform: translateX(0);
              }
              100% {
                transform: translateX(calc(-50%));
              }
            }
            @media (max-width: 640px) {
              .scrolling-text-content {
                font-size: 0.75rem;
              }
              .scrolling-text-item {
                padding: 0 1rem;
              }
            }
            @media (min-width: 641px) and (max-width: 1024px) {
              .scrolling-text-content {
                font-size: 0.875rem;
              }
              .scrolling-text-item {
                padding: 0 1.5rem;
              }
            }
          `}</style>
        </section>
      )}
      {/* Top Media Carousel Section - Above Hero Banner */}
      {topMediaImages.length > 0 && (
        <section className="relative bg-white w-full mt-2 sm:mt-4 md:mt-6" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
          <div className="mx-auto w-full py-0 sm:py-2 md:py-4">
            <div className="relative top-media-carousel-container">
              {topMediaImages[topMediaIndex] && (
                <>
                  {/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(topMediaImages[topMediaIndex]) ? (
                    <video
                      src={topMediaImages[topMediaIndex]}
                      className="absolute inset-0 w-full h-full object-cover bg-black rounded-xl"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      key={topMediaIndex}
                      style={{ objectFit: 'cover', width: '100%', height: '100%', minWidth: '100%', minHeight: '100%' }}
                    />
                  ) : (
                    <img 
                      src={topMediaImages[topMediaIndex]} 
                      alt="Top Media Carousel"
                      className="absolute inset-0 w-full h-full object-cover rounded-xl"
                      style={{ objectFit: 'cover', width: '100%', height: '100%', minWidth: '100%', minHeight: '100%' }}
                      key={topMediaIndex}
                      loading="lazy"
                    />
                  )}
                </>
              )}
            </div>
          </div>
          <style>{`
            .top-media-carousel-container {
              aspect-ratio: 16/9;
              width: 100%;
              position: relative;
              display: block;
              max-width: 100%;
            }
          `}</style>
        </section>
      )}

      {/* Social Media Videos Section - Between Top Media and Hero */}
      {videos.length > 0 && (
        <section className="py-8 sm:py-12 md:py-16 bg-white">
          <div className="w-full max-w-full">
            <div className="text-center mb-8 sm:mb-12 px-4">
              <h2 
                className="text-xl sm:text-2xl md:text-3xl font-light mb-4 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Social Media
              </h2>
              <p className="text-xs sm:text-sm font-light tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>Watch our latest posts and reels</p>
            </div>
            <div className="w-full">
              <SocialMediaVideos videos={videos} scrollerRef={videoScrollerRef} />
            </div>
          </div>
        </section>
      )}

      {/* Hero Banner Section */}
      {heroImages.length > 0 && (
        <section className="relative w-full bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:py-6 md:py-8">
            <div className="relative w-full" style={{ 
              aspectRatio: '16/9',
              maxHeight: '80vh',
              minHeight: '300px'
            }}>
              {heroImages[heroIndex] && (
                <>
                  {/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(heroImages[heroIndex]) ? (
                    <video
                      src={heroImages[heroIndex]}
                      className="absolute inset-0 w-full h-full object-cover bg-black rounded-xl"
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="auto"
                      key={heroIndex}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <img 
                      src={heroImages[heroIndex]} 
                      alt="Hero Banner"
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out rounded-xl"
                      style={{ 
                        objectFit: 'cover',
                        opacity: 1,
                        transition: `opacity ${heroSettings.transitionDuration || 1000}ms ease-in-out`,
                      }}
                      key={heroIndex}
                      loading="lazy"
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* What's Just Landed Section - neudeskin.com style */}
      <section className="py-8 sm:py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-12 sm:mb-16 text-center tracking-[0.15em]" 
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            What's Just Landed
          </h2>
          
          {productsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Loading products...</p>
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="relative">
              {/* Navigation Buttons */}
              {allFeaturedProducts.length > productsPerPage && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={handlePrevious}
                    disabled={!canGoPrevious}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 sm:-translate-x-8 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      canGoPrevious 
                        ? 'bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer' 
                        : 'bg-gray-200 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      backgroundColor: canGoPrevious ? '#fff' : '#e5e7eb',
                      color: canGoPrevious ? '#1a1a1a' : '#9ca3af'
                    }}
                    aria-label="Previous products"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  
                  {/* Next Button */}
                  <button
                    onClick={handleNext}
                    disabled={!canGoNext}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 sm:translate-x-8 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                      canGoNext 
                        ? 'bg-white shadow-lg hover:shadow-xl hover:scale-110 cursor-pointer' 
                        : 'bg-gray-200 cursor-not-allowed opacity-50'
                    }`}
                    style={{
                      backgroundColor: canGoNext ? '#fff' : '#e5e7eb',
                      color: canGoNext ? '#1a1a1a' : '#9ca3af'
                    }}
                    aria-label="Next products"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
                {featuredProducts.map((product, index) => {
                const slug = product.slug || ''
                // Use database stats if available, otherwise fallback to static
                const dbStats = reviewStats[slug]
                const rating = dbStats?.average_rating > 0 ? dbStats.average_rating : getProductRating(slug)
                const reviewCount = dbStats?.review_count > 0 ? dbStats.review_count : getProductReviewCount(slug)
                const hasVerified = dbStats?.verified_count > 0 || hasVerifiedReviews(slug)
                // Calculate global index in the full product list
                const globalIndex = currentIndex * productsPerPage + index
                const isBestSeller = globalIndex < 4 // Only first 4 products overall are best sellers
                const isSoldOut = false // You can add logic to check stock
                
                return (
                  <div
                    key={product.slug || index}
                    className="group relative bg-white"
                  >
                    {/* Product Image - Clickable Link */}
                    <a href={`#/user/product/${product.slug}`} className="block">
                      <div className="relative overflow-hidden mb-4 rounded-xl" style={{ aspectRatio: '1 / 1' }}>
                        {product.listImage ? (
                          <img
                            src={product.listImage}
                            alt={product.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 rounded-xl"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400">No Image</span>
                          </div>
                        )}
                        
                        {/* Best Seller Badge */}
                        {isBestSeller && (
                          <div 
                            className="absolute top-2 left-2 text-white text-xs font-medium px-2 py-1"
                            style={{ backgroundColor: 'var(--arctic-blue-primary-dark)' }}
                          >
                            Best Seller
                          </div>
                        )}
                        
                        {/* Sold Out Badge */}
                        {isSoldOut && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-white text-black px-4 py-2 text-sm font-medium">
                              Sold out
                            </span>
                          </div>
                        )}
                      </div>
                    </a>
                    
                    {/* Product Info */}
                    <div className="space-y-2">
                      {/* Product Title - Clickable Link */}
                      <a href={`#/user/product/${product.slug}`}>
                        <h3 className="text-lg sm:text-xl font-semibold line-clamp-2 overflow-hidden tracking-wide hover:opacity-70 transition-opacity mb-1" style={{color: '#1a1a1a', letterSpacing: '0.05em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', maxHeight: '3.5rem'}}>
                          {product.title}
                        </h3>
                      </a>
                      
                      {/* Rating */}
                      {rating > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => {
                              const filled = i < Math.round(rating)
                              return (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                />
                              )
                            })}
                          </div>
                          <span className="text-sm text-gray-600 ml-1">
                            {rating.toFixed(2)} ({reviewCount})
                          </span>
                          {hasVerifiedReviews(product.slug || '') && (
                            <VerifiedBadge size="sm" className="ml-1.5" />
                          )}
                        </div>
                      )}
                      
                      {/* Price */}
                      <div className="flex items-center gap-2 mb-2">
                        <PricingDisplay product={product} />
                      </div>
                      
                      {/* Add to Cart Button - Outside link */}
                      {!isSoldOut && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (addItem) {
                              try {
                                addItem(product)
                                // Show success feedback
                                const button = e.currentTarget
                                const originalText = button.innerHTML
                                button.innerHTML = '<span>✓ Added</span>'
                                button.style.backgroundColor = 'var(--arctic-blue-primary-dark)'
                                setTimeout(() => {
                                  button.innerHTML = originalText
                                  button.style.backgroundColor = 'var(--arctic-blue-primary)'
                                }, 2000)
                              } catch (error) {
                                console.error('Error adding to cart:', error)
                                alert('Please login to add items to cart')
                              }
                            } else {
                              console.error('addItem function is not available')
                            }
                          }}
                          className="w-full mt-4 py-3 px-4 text-xs font-light transition-all duration-300 tracking-[0.15em] uppercase flex items-center justify-center gap-2 rounded-xl"
                          style={{ 
                            backgroundColor: 'var(--arctic-blue-primary)',
                            color: '#fff',
                            letterSpacing: '0.15em'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                          }}
                          onMouseLeave={(e) => {
                            if (!e.currentTarget.innerHTML.includes('Added')) {
                              e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                            }
                          }}
                        >
                          <ShoppingCart className="w-4 h-4" />
                          Add to cart
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No products available</p>
            </div>
          )}
        </div>
      </section>

      {/* Shop by Category Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-white relative overflow-hidden">
        {/* Curve Effect at top */}
        <div 
          className="absolute top-0 left-0 w-full h-12 sm:h-16 md:h-20"
          style={{
            background: 'linear-gradient(to bottom, var(--arctic-blue-background) 0%, var(--arctic-blue-background) 50%, white 100%)',
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            transform: 'scaleY(-1)'
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 
            className="text-2xl sm:text-3xl md:text-4xl font-light mb-12 sm:mb-16 text-center tracking-[0.15em]" 
            style={{
              color: '#1a1a1a',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {/* Body */}
            <div 
              className="text-center group cursor-pointer transform transition-all duration-300 hover:scale-105" 
              onClick={() => window.location.hash = '#/user/body'}
            >
              <div
                className="mx-auto mb-3 sm:mb-4 flex items-center justify-center w-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] aspect-square overflow-hidden rounded-2xl"
                style={{
                  WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                  maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)'
                }}
              >
                <img
                  src={categoryImages['Body'] || '/IMAGES/body.webp'}
                  alt="Body"
                  className="block w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))' }}
                  onError={(e) => {
                    e.currentTarget.src = '/IMAGES/body.webp'
                  }}
                />
              </div>
              <h3 className="text-sm sm:text-base font-light tracking-wide" style={{color: '#1a1a1a', letterSpacing: '0.05em'}}>Body</h3>
            </div>

            {/* Face */}
            <div 
              className="text-center group cursor-pointer transform transition-all duration-300 hover:scale-105" 
              onClick={() => window.location.hash = '#/user/face'}
            >
              <div
                className="mx-auto mb-3 sm:mb-4 flex items-center justify-center w-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] aspect-square overflow-hidden rounded-2xl"
                style={{
                  WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                  maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)'
                }}
              >
                <img
                  src={categoryImages['Face'] || '/IMAGES/face.webp'}
                  alt="Face"
                  className="block w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))' }}
                  onError={(e) => {
                    e.currentTarget.src = '/IMAGES/face.webp'
                  }}
                />
              </div>
              <h3 className="text-sm sm:text-base font-light tracking-wide" style={{color: '#1a1a1a', letterSpacing: '0.05em'}}>Face</h3>
            </div>

            {/* Hair */}
            <div 
              className="text-center group cursor-pointer transform transition-all duration-300 hover:scale-105" 
              onClick={() => window.location.hash = '#/user/hair'}
            >
              <div
                className="mx-auto mb-3 sm:mb-4 flex items-center justify-center w-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] aspect-square overflow-hidden rounded-2xl"
                style={{
                  WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                  maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)'
                }}
              >
                <img
                  src={categoryImages['Hair'] || '/IMAGES/hair.webp'}
                  alt="Hair"
                  className="block w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))' }}
                  onError={(e) => {
                    e.currentTarget.src = '/IMAGES/hair.webp'
                  }}
                />
              </div>
              <h3 className="text-sm sm:text-base font-light tracking-wide" style={{color: '#1a1a1a', letterSpacing: '0.05em'}}>Hair</h3>
            </div>

            {/* Combos */}
            <div 
              className="text-center group cursor-pointer transform transition-all duration-300 hover:scale-105" 
              onClick={() => window.location.hash = '#/user/combos'}
            >
              <div
                className="mx-auto mb-3 sm:mb-4 flex items-center justify-center w-full max-w-[180px] sm:max-w-[220px] md:max-w-[280px] aspect-square overflow-hidden rounded-2xl"
                style={{
                  WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)',
                  maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 62%, rgba(0,0,0,0) 100%)'
                }}
              >
                <img
                  src={categoryImages['Combos'] || '/IMAGES/combo.webp'}
                  alt="Combos"
                  className="block w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 24px 30px rgba(0,0,0,0.28))' }}
                  onError={(e) => {
                    e.currentTarget.src = '/IMAGES/combo.webp'
                  }}
                />
              </div>
              <h3 className="text-sm sm:text-base font-light tracking-wide" style={{color: '#1a1a1a', letterSpacing: '0.05em'}}>Combos</h3>
            </div>
          </div>
        </div>
        
        {/* Curve Effect at bottom */}
        <div 
          className="absolute bottom-0 left-0 w-full h-12 sm:h-16 md:h-20"
          style={{
            background: 'linear-gradient(to top, white 0%, white 50%, var(--arctic-blue-background) 100%)',
            clipPath: 'ellipse(100% 100% at 50% 100%)'
          }}
        />
      </section>

      {/* Complete Kit Banner Section */}
      {completeKitImage && (
        <section className="py-8 sm:py-12 md:py-16 lg:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden complete-kit-container rounded-xl">
              <img 
                src={completeKitImage} 
                alt="Complete Kit" 
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                <div className="text-center px-4">
                  <h2 
                    className="complete-kit-title font-light mb-4 sm:mb-6 text-white tracking-[0.15em]" 
                    style={{
                      fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                      letterSpacing: '0.15em'
                    }}
                  >
                    THE COMPLETE KIT
                  </h2>
                  <p className="complete-kit-description text-white/90 mb-6 sm:mb-8 font-light tracking-wide" style={{letterSpacing: '0.05em'}}>Get the full Nefol experience in one curated bundle</p>
                  <button
                    onClick={() => window.location.hash = '#/user/combos'}
                    className="complete-kit-button px-4 sm:px-6 md:px-8 py-2 sm:py-3 text-white font-medium tracking-wide uppercase transition-colors duration-200 rounded-xl"
                    style={{ backgroundColor: 'var(--arctic-blue-primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }}
                  >
                    View Kit
                  </button>
                </div>
              </div>
            </div>
          </div>
          <style>{`
            .complete-kit-container {
              width: 100%;
            }
            
            /* Mobile - Smaller height */
            @media (max-width: 640px) {
              .complete-kit-container {
                height: 250px;
                min-height: 250px;
              }
              
              .complete-kit-title {
                font-size: 1.25rem;
                margin-bottom: 0.75rem;
              }
              
              .complete-kit-description {
                font-size: 0.75rem;
                margin-bottom: 1rem;
              }
              
              .complete-kit-button {
                font-size: 0.625rem;
                padding: 0.5rem 1rem;
              }
            }
            
            /* Tablet - Medium height */
            @media (min-width: 641px) and (max-width: 1024px) {
              .complete-kit-container {
                height: 350px;
                min-height: 350px;
              }
              
              .complete-kit-title {
                font-size: 1.75rem;
                margin-bottom: 1rem;
              }
              
              .complete-kit-description {
                font-size: 0.875rem;
                margin-bottom: 1.5rem;
              }
              
              .complete-kit-button {
                font-size: 0.75rem;
                padding: 0.625rem 1.25rem;
              }
            }
            
            /* Desktop - Full size */
            @media (min-width: 1025px) {
              .complete-kit-container {
                height: 500px;
                min-height: 500px;
              }
              
              .complete-kit-title {
                font-size: 2.25rem;
                margin-bottom: 1.5rem;
              }
              
              .complete-kit-description {
                font-size: 1rem;
                margin-bottom: 2rem;
              }
              
              .complete-kit-button {
                font-size: 0.875rem;
                padding: 0.75rem 2rem;
              }
            }
          `}</style>
        </section>
      )}

      {/* Marketplace Logos Section */}
      {marketplaceLogos.length > 0 && (
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-light mb-6 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                Also Available On
              </h2>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 md:gap-16">
              {marketplaceLogos.map((logo, idx) => (
                <img 
                  key={idx} 
                  src={logo} 
                  alt={`Marketplace ${idx + 1}`}
                  className="h-10 sm:h-12 md:h-14 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Nefol Collection Section */}
      {nefolCollection.image && (
        <section className="py-12 sm:py-16 md:py-20 bg-white relative overflow-hidden">
          {/* Curve Effect at top */}
          <div 
            className="absolute top-0 left-0 w-full h-12 sm:h-16 md:h-20"
            style={{
              background: 'linear-gradient(to bottom, var(--arctic-blue-background) 0%, var(--arctic-blue-background) 50%, white 100%)',
              clipPath: 'ellipse(100% 100% at 50% 0%)',
              transform: 'scaleY(-1)'
            }}
          />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
              <div className="relative rounded-xl" style={{ width: '200%' }}>
                <img 
                  src={nefolCollection.image}
                  alt="Nefol Collection"
                  className="w-full h-auto rounded-xl"
                  style={{ 
                    display: 'block',
                    objectFit: 'contain',
                    objectPosition: 'left center'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
              <div className="text-left">
                <h2 
                  className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 sm:mb-6 tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                    letterSpacing: '0.15em'
                  }}
                >
                  {nefolCollection.title}
                </h2>
                <h3 className="text-base sm:text-lg font-light mb-4 sm:mb-6 tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>
                  {nefolCollection.subtitle}
                </h3>
                <p className="text-sm sm:text-base font-light mb-8 sm:mb-10 leading-relaxed" style={{color: '#666', letterSpacing: '0.02em'}}>
                  {nefolCollection.description}
                </p>
                  <button 
                    onClick={() => window.location.hash = `#/user${nefolCollection.buttonLink || '/shop'}`}
                    className="px-6 sm:px-8 py-3 text-white font-medium transition-all duration-300 text-xs sm:text-sm tracking-wide uppercase rounded-xl"
                    style={{ backgroundColor: 'var(--arctic-blue-primary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }}
                  >
                    {nefolCollection.buttonText}
                  </button>
              </div>
            </div>
          </div>
          
          {/* Curve Effect at bottom */}
          <div 
            className="absolute bottom-0 left-0 w-full h-12 sm:h-16 md:h-20"
            style={{
              background: 'linear-gradient(to top, white 0%, white 50%, var(--arctic-blue-background) 100%)',
              clipPath: 'ellipse(100% 100% at 50% 100%)'
            }}
          />
        </section>
      )}

      {/* Forever Favorites Section */}
      {(foreverFavorites.luxurySkincare.image || foreverFavorites.naturalBeauty.image) && (
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 sm:mb-16">
              <h2 
                className="text-2xl sm:text-3xl md:text-4xl font-light mb-6 tracking-[0.15em]" 
                style={{
                  color: '#1a1a1a',
                  fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                  letterSpacing: '0.15em'
                }}
              >
                {foreverFavorites.title}
              </h2>
              <p className="text-sm sm:text-base font-light max-w-2xl mx-auto tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>
                {foreverFavorites.description}
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              {foreverFavorites.luxurySkincare.image && (
                <div className="relative group cursor-pointer" onClick={() => window.location.hash = '#/user/shop'}>
                  <img 
                    src={foreverFavorites.luxurySkincare.image}
                    alt="Luxury Skincare"
                    className="w-full h-64 sm:h-80 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 
                      className="text-white text-lg sm:text-xl font-light tracking-[0.15em]" 
                      style={{
                        fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      {foreverFavorites.luxurySkincare.title}
                    </h3>
                  </div>
                </div>
              )}
              {foreverFavorites.naturalBeauty.image && (
                <div className="relative group cursor-pointer" onClick={() => window.location.hash = '#/user/shop'}>
                  <img 
                    src={foreverFavorites.naturalBeauty.image}
                    alt="Natural Beauty"
                    className="w-full h-64 sm:h-80 object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <h3 
                      className="text-white text-lg sm:text-xl font-light tracking-[0.15em]" 
                      style={{
                        fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                        letterSpacing: '0.15em'
                      }}
                    >
                      {foreverFavorites.naturalBeauty.title}
                    </h3>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Natural Beauty Section */}
      {naturalBeauty.image && (
        <section className="py-12 sm:py-16 md:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center">
              <div className="text-left">
                <h2 
                  className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 sm:mb-6 tracking-[0.15em]" 
                  style={{
                    color: '#1a1a1a',
                    fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                    letterSpacing: '0.15em'
                  }}
                >
                  {naturalBeauty.title}
                </h2>
                <h3 className="text-base sm:text-lg font-light mb-4 sm:mb-6 tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>
                  {naturalBeauty.subtitle}
                </h3>
                <p className="text-sm sm:text-base font-light mb-8 sm:mb-10 leading-relaxed" style={{color: '#666', letterSpacing: '0.02em'}}>
                  {naturalBeauty.description}
                </p>
                <button 
                  onClick={() => window.location.hash = `#/user${naturalBeauty.buttonLink || '/shop'}`}
                  className="px-6 sm:px-8 py-3 text-white font-medium transition-all duration-300 text-xs sm:text-sm tracking-wide uppercase rounded-xl"
                  style={{ backgroundColor: '#7DD3D3' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5EC4C4'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#7DD3D3'
                  }}
                >
                  {naturalBeauty.buttonText}
                </button>
              </div>
              <div className="relative lg:order-2 rounded-xl ml-auto" style={{ width: '200%' }}>
                <img 
                  src={naturalBeauty.image}
                  alt="Natural Beauty"
                  className="w-full h-auto rounded-xl"
                  style={{ 
                    display: 'block',
                    objectFit: 'contain',
                    objectPosition: 'right center'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Ingredients Section - Blue Pea Featured (like neudeskin's milk) */}
      <section className="py-12 sm:py-16 md:py-20 relative overflow-hidden" style={{ backgroundColor: 'var(--arctic-blue-background)' }}>
        {/* Curve Effect at top */}
        <div 
          className="absolute top-0 left-0 w-full h-16 sm:h-24 md:h-32"
          style={{
            background: 'linear-gradient(to bottom, white 0%, white 50%, var(--arctic-blue-background) 100%)',
            clipPath: 'ellipse(100% 100% at 50% 0%)',
            transform: 'scaleY(-1)'
          }}
        />
        
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12 sm:mb-16">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl font-light mb-6 tracking-[0.15em]" 
              style={{
                color: '#1a1a1a',
                fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                letterSpacing: '0.15em'
              }}
            >
              Our Star Ingredient
            </h2>
            <p className="text-sm sm:text-base font-light max-w-2xl mx-auto tracking-wide" style={{color: '#666', letterSpacing: '0.05em'}}>
              Discover the power of nature's finest ingredients
            </p>
          </div>
          
          {/* Blue Pea - Featured Ingredient */}
          <div className="max-w-4xl mx-auto">
            <div 
              className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group"
              onClick={() => window.location.hash = '#/user/ingredients'}
                    style={{ 
                      border: '1px solid rgba(125, 211, 211, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Image Section */}
                <div className="relative overflow-hidden" style={{ aspectRatio: '1 / 1', minHeight: '300px' }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                      style={{
                        WebkitMaskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                        maskImage: 'radial-gradient(circle at center, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)',
                        backgroundColor: 'var(--arctic-blue-light)'
                      }}
                  >
                    <img
                      src="/IMAGES/blue pea.webp"
                      alt="Blue Pea (Aprajita)"
                      className="w-full h-full object-contain transform transition-transform duration-500 group-hover:scale-110 rounded-xl"
                      style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}
                      onError={(e) => {
                        e.currentTarget.src = '/IMAGES/blue pea.webp'
                      }}
                    />
                  </div>
                  {/* Arctic Blue accent */}
                  <div 
                    className="absolute bottom-0 left-0 right-0 h-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ backgroundColor: 'var(--arctic-blue-primary)' }}
                  />
                </div>
                
                {/* Content Section */}
                <div className="p-6 sm:p-8 md:p-10 flex flex-col justify-center">
                  <div className="mb-4">
                    <span 
                      className="inline-block px-3 py-1 text-xs sm:text-sm font-medium rounded-full mb-3"
                      style={{ 
                        backgroundColor: 'var(--arctic-blue-light)',
                        color: 'var(--arctic-blue-primary-dark)'
                      }}
                    >
                      STAR INGREDIENT
                    </span>
                    <h3 
                      className="text-2xl sm:text-3xl md:text-4xl font-light mb-4 sm:mb-6 tracking-[0.1em]" 
                      style={{
                        color: '#1a1a1a',
                        fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
                        letterSpacing: '0.1em'
                      }}
                    >
                      Blue Pea
                    </h3>
                    <p className="text-xs sm:text-sm italic mb-6 font-light tracking-wide" style={{color: '#999', letterSpacing: '0.05em'}}>
                      Aprajita • Shankhpushpi
                    </p>
                  </div>
                  
                  <p className="text-sm sm:text-base font-light leading-relaxed mb-8 tracking-wide" style={{color: '#666', letterSpacing: '0.02em'}}>
                    Rich in powerful antioxidants such as anthocyanins, flavonoids, and polyphenols, Blue Pea is celebrated for its skin-brightening, anti-inflammatory, and soothing properties. This vibrant flower helps neutralize free radicals and protect the skin from oxidative stress.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--arctic-blue-lighter)', color: 'var(--arctic-blue-primary-dark)' }}>Antioxidant</span>
                    <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--arctic-blue-lighter)', color: 'var(--arctic-blue-primary-dark)' }}>Brightening</span>
                    <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--arctic-blue-lighter)', color: 'var(--arctic-blue-primary-dark)' }}>Anti-Inflammatory</span>
                    <span className="px-3 py-1 text-xs rounded-full" style={{ backgroundColor: 'var(--arctic-blue-lighter)', color: 'var(--arctic-blue-primary-dark)' }}>Soothing</span>
                  </div>
                  
                  <button
                    className="self-start px-6 sm:px-8 py-3 text-sm sm:text-base font-medium transition-all duration-300 uppercase tracking-wide rounded-xl"
                    style={{ 
                      backgroundColor: 'var(--arctic-blue-primary)',
                      color: '#fff',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary-hover)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--arctic-blue-primary)'
                    }}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Curve Effect at bottom */}
        <div 
          className="absolute bottom-0 left-0 w-full h-16 sm:h-24 md:h-32"
          style={{
            background: 'linear-gradient(to top, white 0%, white 50%, var(--arctic-blue-background) 100%)',
            clipPath: 'ellipse(100% 100% at 50% 100%)'
          }}
        />
      </section>

      {/* Subscription Modal */}
      <SubscriptionModal 
        isOpen={showSubscriptionModal}
        onClose={handleCloseSubscriptionModal}
        image={whatsappSubscription.image}
        logo={whatsappSubscription.logo}
        logoName={whatsappSubscription.logoName}
        heading={whatsappSubscription.heading}
        description={whatsappSubscription.description}
        footer={whatsappSubscription.footer}
      />
    </main>
  )
}
