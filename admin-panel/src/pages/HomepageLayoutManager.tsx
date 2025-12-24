import { useState, useEffect, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Save, RefreshCw, Eye, Settings, Palette, Plus, Trash2, Crop, Clock } from 'lucide-react'
import { useToast } from '../components/ToastProvider'
import { uploadFile } from '../utils/upload'
import { configService } from '../services/config'
import ImageCropper from '../components/ImageCropper'
import VideoCropper from '../components/VideoCropper'

interface HeroBannerSettings {
  animationType: 'fade' | 'slide' | 'zoom' | 'cube' | 'flip' | 'coverflow' | 'cards'
  transitionDuration: number // in milliseconds
  autoPlay: boolean
  autoPlayDelay: number // in milliseconds
  designStyle: 'modern' | 'classic' | 'minimal' | 'gradient' | 'dark' | 'colorful'
  showDots: boolean
  showArrows: boolean
  loop: boolean
}

interface MediaItem {
  url: string
  type: 'image' | 'video'
  timing?: number // Display duration in milliseconds (for carousel)
  thumbnail?: string // Cropped thumbnail for videos
}

interface HomepageSection {
  id: string
  name: string
  type: 'hero' | 'category' | 'banner' | 'gallery' | 'certification' | 'custom'
  images: string[]
  mediaItems?: MediaItem[] // Enhanced media items with metadata (for top_media_carousel)
  description: string
  sectionType: string // CMS section type
  imageCount: number // How many images this section can hold
  settings?: HeroBannerSettings // Only for hero banner
  isCustom?: boolean // Flag for custom sections
  orderIndex?: number // Display order
}

const API_BASE = configService.getApiConfig().baseUrl

const normalizeMediaUrl = (url: string): string => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (typeof window !== 'undefined' && url.startsWith('/')) {
    return `${window.location.protocol}//${window.location.host}${url}`
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}/${url.replace(/^\/+/, '')}`
  }
  return url
}

const padArray = (arr: string[], length: number): string[] => {
  const copy = [...arr]
  while (copy.length < length) {
    copy.push('')
  }
  return copy.slice(0, length)
}

const SPLASH_DEVICE_CONFIGS = [
  {
    key: 'desktop',
    label: 'Desktop (16:9)',
    helper: 'Recommended 1920×1080 MP4/WebM for large screens.',
    index: 0,
  },
  {
    key: 'tablet',
    label: 'Tablet (4:3)',
    helper: 'Recommended 1536×1152 landscape video.',
    index: 1,
  },
  {
    key: 'mobile',
    label: 'Mobile Portrait (9:16)',
    helper: 'Recommended 1080×1920 portrait video for phones.',
    index: 2,
  },
]

export default function HomepageLayoutManager() {
  const { notify } = useToast()
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedImage, setDraggedImage] = useState<{ file: File; sectionId: string } | null>(null)
  const [draggedOverSection, setDraggedOverSection] = useState<string | null>(null)
  const [uploading, setUploading] = useState<Record<string, boolean>>({})
  const [previewMode, setPreviewMode] = useState(false)
  const [showHeroSettings, setShowHeroSettings] = useState(false)
  const [showTopMediaSettings, setShowTopMediaSettings] = useState(false)
  const [showCreateSection, setShowCreateSection] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [showVideoCropper, setShowVideoCropper] = useState(false)
  const [cropperImage, setCropperImage] = useState<string>('')
  const [cropperVideo, setCropperVideo] = useState<string>('')
  const [cropperSectionId, setCropperSectionId] = useState<string>('')
  const [cropperImageIndex, setCropperImageIndex] = useState<number | undefined>(undefined)
  const [cropperAspectRatio, setCropperAspectRatio] = useState<number>(1)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showSizeSelector, setShowSizeSelector] = useState(false)
  const [selectedSize, setSelectedSize] = useState<{ name: string; ratio: number } | null>(null)
  const [pendingUpload, setPendingUpload] = useState<{ file: File; sectionId: string; index?: number } | null>(null)
  const [editingTiming, setEditingTiming] = useState<{ sectionId: string; index: number } | null>(null)
  const [timingValue, setTimingValue] = useState<number>(7000)
  const [newSection, setNewSection] = useState({
    name: '',
    description: '',
    sectionType: '',
    imageCount: 5,
    type: 'gallery' as const
  })
  const [heroSettings, setHeroSettings] = useState<HeroBannerSettings>({
    animationType: 'fade',
    transitionDuration: 1000,
    autoPlay: true,
    autoPlayDelay: 7000,
    designStyle: 'modern',
    showDots: true,
    showArrows: true,
    loop: true
  })
  const [topMediaSettings, setTopMediaSettings] = useState<HeroBannerSettings>({
    animationType: 'fade',
    transitionDuration: 1000,
    autoPlay: true,
    autoPlayDelay: 7000,
    designStyle: 'modern',
    showDots: true,
    showArrows: true,
    loop: true
  })
  const [scrollingText, setScrollingText] = useState<string>('')
  const [whatsappSubscriptionText, setWhatsappSubscriptionText] = useState({
    heading: 'Join The NEFOL® Circle',
    description: 'Stay ahead with exclusive style drops, member-only offers, and insider fashion updates.',
    footer: 'By subscribing, you agree to receive WhatsApp messages from NEFOL®.',
    logoName: 'NEFÖL'
  })

  // Initialize homepage sections based on actual Home.tsx structure
  const initializeSections = useCallback(async () => {
    const defaultSections: HomepageSection[] = [
      {
        id: 'scrolling_text_banner',
        name: 'Scrolling Text Banner',
        type: 'banner',
        images: [],
        description: 'Continuous scrolling text line for offers and promotions (displays between navbar and top media carousel)',
        sectionType: 'scrolling_text_banner',
        imageCount: 0
      },
      {
        id: 'splash_screen',
        name: 'Splash Screen Videos',
        type: 'banner',
        images: ['', '', ''],
        description: 'Upload device-specific splash screen videos (Desktop 16:9, Tablet 4:3, Mobile 9:16)',
        sectionType: 'splash_screen',
        imageCount: 3
      },
      {
        id: 'top_media_carousel',
        name: 'Top Media Carousel (Above Hero)',
        type: 'hero',
        images: [],
        description: 'Media carousel displayed above Hero Banner - Images and videos with full aspect ratio (up to 30)',
        sectionType: 'top_media_carousel',
        imageCount: 30,
        settings: {
          animationType: 'fade',
          transitionDuration: 1000,
          autoPlay: true,
          autoPlayDelay: 7000,
          designStyle: 'modern',
          showDots: true,
          showArrows: true,
          loop: true
        }
      },
      {
        id: 'hero_banner',
        name: 'Hero Banner (Top Slider)',
        type: 'hero',
        images: [],
        description: 'Main banner at the top - Rotating hero images and videos (up to 30)',
        sectionType: 'hero_banner',
        imageCount: 30,
        settings: {
          animationType: 'fade',
          transitionDuration: 1000,
          autoPlay: true,
          autoPlayDelay: 7000,
          designStyle: 'modern',
          showDots: true,
          showArrows: true,
          loop: true
        }
      },
      {
        id: 'body_category',
        name: 'Body Category',
        type: 'category',
        images: [],
        description: 'Body products category image',
        sectionType: 'shop_categories',
        imageCount: 1
      },
      {
        id: 'face_category',
        name: 'Face Category',
        type: 'category',
        images: [],
        description: 'Face products category image',
        sectionType: 'shop_categories',
        imageCount: 1
      },
      {
        id: 'hair_category',
        name: 'Hair Category',
        type: 'category',
        images: [],
        description: 'Hair products category image',
        sectionType: 'shop_categories',
        imageCount: 1
      },
      {
        id: 'combos_category',
        name: 'Combos Category',
        type: 'category',
        images: [],
        description: 'Combos products category image',
        sectionType: 'shop_categories',
        imageCount: 1
      },
      {
        id: 'commitments',
        name: 'Certifications/Commitments',
        type: 'certification',
        images: [],
        description: 'Certification badges (Cruelty-Free, Paraben-Free, etc.)',
        sectionType: 'commitments',
        imageCount: 10
      },
      {
        id: 'complete_kit',
        name: 'Complete Kit Banner',
        type: 'banner',
        images: [],
        description: 'Large banner for complete kit section',
        sectionType: 'complete_kit',
        imageCount: 1
      },
      {
        id: 'marketplace_logos',
        name: 'Marketplace Logos',
        type: 'gallery',
        images: [],
        description: 'Available on (Amazon, Flipkart, Meesho) logos',
        sectionType: 'marketplace_logos',
        imageCount: 10
      },
      {
        id: 'nefol_collection',
        name: 'Nefol Collection',
        type: 'banner',
        images: [],
        description: 'NEFOL COLLECTION section with image, title, subtitle, description, and button',
        sectionType: 'nefol_collection',
        imageCount: 1
      },
      {
        id: 'forever_favorites',
        name: 'Forever Favorites',
        type: 'gallery',
        images: [],
        description: 'FOREVER FAVORITES section with two images (Luxury Skincare and Natural Beauty)',
        sectionType: 'forever_favorites',
        imageCount: 2
      },
      {
        id: 'natural_beauty',
        name: 'Natural Beauty',
        type: 'banner',
        images: [],
        description: 'NATURAL BEAUTY section with image, title, subtitle, description, and button',
        sectionType: 'natural_beauty',
        imageCount: 1
      },
      {
        id: 'whatsappsubscription',
        name: 'WhatsApp Subscription',
        type: 'banner',
        images: [],
        description: 'WhatsApp subscription modal with image, heading, description, footer text, logo, and logo name',
        sectionType: 'whatsappsubscription',
        imageCount: 2 // 0: product image, 1: logo
      }
    ]

    // Load existing images from CMS
    try {
      const response = await fetch(`${API_BASE}/cms/sections/home`)
      const cmsSections = await response.json()

      // Find custom sections (those not in default list)
      const defaultSectionTypes = defaultSections.map(s => s.sectionType)
      const customCMSections = cmsSections.filter((s: any) => 
        !defaultSectionTypes.includes(s.section_type) && 
        s.section_type.startsWith('custom_')
      ).map((cmsSection: any) => ({
        id: cmsSection.section_type,
        name: cmsSection.title || cmsSection.section_type.replace('custom_', '').replace(/_/g, ' '),
        type: 'custom' as const,
        images: cmsSection.content?.images || cmsSection.content?.image ? [cmsSection.content.image] : [],
        description: cmsSection.content?.description || '',
        sectionType: cmsSection.section_type,
        imageCount: Array.isArray(cmsSection.content?.images) ? cmsSection.content.images.length : (cmsSection.content?.image ? 1 : 5),
        isCustom: true,
        orderIndex: cmsSection.order_index || 999
      }))

      // Map CMS sections to our sections
      const updatedSections = defaultSections.map(section => {
        const cmsSection = cmsSections.find((s: any) => s.section_type === section.sectionType)
        
        if (cmsSection && cmsSection.content) {
          if (section.sectionType === 'splash_screen') {
            const desktopVideo = cmsSection.content.desktop?.video ? normalizeMediaUrl(cmsSection.content.desktop.video) : ''
            const tabletVideo = cmsSection.content.tablet?.video ? normalizeMediaUrl(cmsSection.content.tablet.video) : ''
            const mobileVideo = cmsSection.content.mobile?.video ? normalizeMediaUrl(cmsSection.content.mobile.video) : ''
            return {
              ...section,
              images: padArray([desktopVideo, tabletVideo, mobileVideo], section.imageCount)
            }
          }
          if ((section.sectionType === 'hero_banner' || section.sectionType === 'top_media_carousel') && cmsSection.content.images) {
            // Support both images and videos in hero banner and top media carousel
            const images = Array.isArray(cmsSection.content.images) ? cmsSection.content.images : []
            
            // For top_media_carousel, create mediaItems with metadata
            let mediaItems: MediaItem[] | undefined = undefined
            if (section.sectionType === 'top_media_carousel') {
              // Check if mediaItems exist in CMS, otherwise create from images array
              if (cmsSection.content.mediaItems && Array.isArray(cmsSection.content.mediaItems)) {
                mediaItems = cmsSection.content.mediaItems
              } else if (cmsSection.content.media && Array.isArray(cmsSection.content.media)) {
                // Convert media array to mediaItems
                mediaItems = cmsSection.content.media.map((m: any) => ({
                  url: m.url || m,
                  type: m.type || (/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(m.url || m) ? 'video' : 'image'),
                  timing: m.timing || topMediaSettings.autoPlayDelay,
                  thumbnail: m.thumbnail
                }))
              } else {
                // Create mediaItems from images array
                mediaItems = images.map((url: string) => ({
                  url: url,
                  type: /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url) ? 'video' : 'image',
                  timing: topMediaSettings.autoPlayDelay
                }))
              }
            }
            
            const updatedSection = { 
              ...section, 
              name: section.name, // Always use default name, don't override with CMS title
              images: images,
              mediaItems: mediaItems,
              settings: cmsSection.content.settings || section.settings
            }
            // Update settings state if found
            if (section.sectionType === 'hero_banner' && cmsSection.content.settings) {
              setHeroSettings(cmsSection.content.settings)
            }
            if (section.sectionType === 'top_media_carousel' && cmsSection.content.settings) {
              setTopMediaSettings(cmsSection.content.settings)
            }
            return updatedSection
          }
          if (section.sectionType === 'shop_categories' && cmsSection.content.categories) {
            // Map categories
            const categoryMap: Record<string, string> = {
              'Body': 'body_category',
              'Face': 'face_category',
              'Hair': 'hair_category',
              'Combos': 'combos_category'
            }
            const cat = cmsSection.content.categories.find((c: any) => 
              categoryMap[c.name] === section.id
            )
            if (cat && cat.image) {
              // Normalize the image URL for display
              const normalizeUrl = (url: string) => {
                if (!url) return ''
                // If it's already a full URL, return as is
                if (/^https?:\/\//i.test(url)) return url
                // If it's a relative path, make it absolute for display
                if (url.startsWith('/')) {
                  // In production, use current domain; in dev, use API URL or current domain
                  const hostname = window.location.hostname
                  if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
                    return `${window.location.protocol}//${window.location.host}${url}`
                  }
                  // Always use production URL - no environment variables
                  // For any non-production domain, use current domain
                  return `${window.location.protocol}//${window.location.host}${url}`
                }
                return url
              }
              return { ...section, images: [normalizeUrl(cat.image)] }
            }
          }
          if (section.sectionType === 'scrolling_text_banner' && cmsSection.content.text) {
            setScrollingText(cmsSection.content.text)
            return { ...section, description: cmsSection.content.text }
          }
          if (section.sectionType === 'commitments' && cmsSection.content.images) {
            return { ...section, images: cmsSection.content.images }
          }
          if (section.sectionType === 'complete_kit' && cmsSection.content.image) {
            return { ...section, images: [cmsSection.content.image] }
          }
          if (section.sectionType === 'marketplace_logos' && cmsSection.content.logos) {
            return { ...section, images: cmsSection.content.logos }
          }
          if (section.sectionType === 'nefol_collection' && cmsSection.content.image) {
            // Normalize the image URL for display
            const normalizeUrl = (url: string) => {
              if (!url) return ''
              // If it's already a full URL, return as is
              if (/^https?:\/\//i.test(url)) return url
              // If it's a relative path, make it absolute for display
              if (url.startsWith('/')) {
                // In production, use current domain; in dev, use API URL or current domain
                const hostname = window.location.hostname
                if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
                  return `${window.location.protocol}//${window.location.host}${url}`
                }
                // Always use production URL - no environment variables
                // For any non-production domain, use current domain
                return `${window.location.protocol}//${window.location.host}${url}`
              }
              return url
            }
            return { ...section, images: [normalizeUrl(cmsSection.content.image)] }
          }
          if (section.sectionType === 'forever_favorites' && cmsSection.content.images) {
            // Normalize image URLs for display
            const normalizeUrl = (url: string) => {
              if (!url) return ''
              if (/^https?:\/\//i.test(url)) return url
              if (url.startsWith('/')) {
                // In production, use current domain; in dev, use API URL or current domain
                const hostname = window.location.hostname
                if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
                  return `${window.location.protocol}//${window.location.host}${url}`
                }
                // Always use production URL - no environment variables
                // For any non-production domain, use current domain
                return `${window.location.protocol}//${window.location.host}${url}`
              }
              return url
            }
            const images = Array.isArray(cmsSection.content.images) ? cmsSection.content.images : []
            // Also check for images in luxurySkincare and naturalBeauty objects
            const luxuryImage = cmsSection.content.luxurySkincare?.image
            const naturalImage = cmsSection.content.naturalBeauty?.image
            const allImages = []
            if (luxuryImage) allImages.push(luxuryImage)
            if (naturalImage) allImages.push(naturalImage)
            // Use images array if available, otherwise use individual images
            const finalImages = images.length > 0 ? images : allImages
            return { ...section, images: finalImages.map(normalizeUrl) }
          }
          if (section.sectionType === 'natural_beauty' && cmsSection.content.image) {
            // Normalize the image URL for display
            const normalizeUrl = (url: string) => {
              if (!url) return ''
              // If it's already a full URL, return as is
              if (/^https?:\/\//i.test(url)) return url
              // If it's a relative path, make it absolute for display
              if (url.startsWith('/')) {
                // In production, use current domain; in dev, use API URL or current domain
                const hostname = window.location.hostname
                if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
                  return `${window.location.protocol}//${window.location.host}${url}`
                }
                // Always use production URL - no environment variables
                // For any non-production domain, use current domain
                return `${window.location.protocol}//${window.location.host}${url}`
              }
              return url
            }
            return { ...section, images: [normalizeUrl(cmsSection.content.image)] }
          }
          if (section.sectionType === 'whatsappsubscription' && cmsSection.content) {
            // Normalize the image URL for display
            const normalizeUrl = (url: string) => {
              if (!url) return ''
              // If it's already a full URL, return as is
              if (/^https?:\/\//i.test(url)) return url
              // If it's a relative path, make it absolute for display
              if (url.startsWith('/')) {
                // In production, use current domain; in dev, use API URL or current domain
                const hostname = window.location.hostname
                if (hostname === 'thenefol.com' || hostname === 'www.thenefol.com') {
                  return `${window.location.protocol}//${window.location.host}${url}`
                }
                // Always use production URL - no environment variables
                // For any non-production domain, use current domain
                return `${window.location.protocol}//${window.location.host}${url}`
              }
              return url
            }
            const image = cmsSection.content.image ? normalizeUrl(cmsSection.content.image) : ''
            const logo = cmsSection.content.logo ? normalizeUrl(cmsSection.content.logo) : ''
            const images = []
            if (image) images.push(image)
            if (logo) images.push(logo)
            
            if (cmsSection.content.heading || cmsSection.content.description || cmsSection.content.footer || cmsSection.content.logoName) {
              setWhatsappSubscriptionText({
                heading: cmsSection.content.heading || 'Join The NEFOL® Circle',
                description: cmsSection.content.description || 'Stay ahead with exclusive style drops, member-only offers, and insider fashion updates.',
                footer: cmsSection.content.footer || 'By subscribing, you agree to receive WhatsApp messages from NEFOL®.',
                logoName: cmsSection.content.logoName || 'NEFOL®'
              })
            }
            return { ...section, images: images }
          }
        }
        return section
      })

      // Merge default and custom sections, sort by orderIndex
      const allSections = [...updatedSections, ...customCMSections].sort((a, b) => 
        (a.orderIndex || 0) - (b.orderIndex || 0)
      )

      setSections(allSections)
    } catch (error) {
      console.error('Failed to load sections:', error)
      setSections(defaultSections)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    initializeSections()
  }, [initializeSections])

  // Check if file is video
  const isVideoFile = (file: File): boolean => {
    return file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(file.name)
  }

  // Handle file upload
  // Get aspect ratio for section
  const getSectionAspectRatio = (sectionId: string): number | null => {
    const aspectRatios: Record<string, number> = {
      'hero_banner': 5/4, // 1.25
      'nefol_collection': 16/9, // 1.78
      'natural_beauty': 16/9, // 1.78
      'forever_favorites': 4/3, // 1.33
      'complete_kit': 16/9, // 1.78
    }
    return aspectRatios[sectionId] || null
  }

  const handleUpload = async (file: File, sectionId: string, imageIndex?: number, skipSizeSelector?: boolean) => {
    const isVideo = isVideoFile(file)
    
    // For images, show size selector first (unless skipSizeSelector is true)
    if (!isVideo && file.type.startsWith('image/') && !skipSizeSelector) {
      setPendingUpload({ file, sectionId, index: imageIndex })
      setShowSizeSelector(true)
      return
    }
    
    // For videos or images without crop requirement, upload directly
    try {
      setUploading(prev => ({ ...prev, [sectionId]: true }))
      
      const url = await uploadFile(file, API_BASE)
      
      // Calculate new images array
      const section = sections.find(s => s.id === sectionId)
      if (!section) return
      
      let newImages = [...section.images]
      if (section.sectionType === 'splash_screen') {
        newImages = padArray(newImages, section.imageCount)
        let targetIndex = imageIndex
        if (targetIndex === undefined) {
          targetIndex = newImages.findIndex((value) => !value)
          if (targetIndex === -1) {
            targetIndex = section.imageCount - 1
          }
        }
        if (targetIndex >= 0) {
          if (targetIndex >= newImages.length) {
            newImages = padArray(newImages, targetIndex + 1)
          }
          newImages[targetIndex] = url
        }
      } else {
        if (imageIndex !== undefined && imageIndex < newImages.length) {
          newImages[imageIndex] = url
        } else {
          newImages.push(url)
        }
      }
      const finalImages = section.sectionType === 'splash_screen'
        ? padArray(newImages, section.imageCount)
        : newImages.slice(0, section.imageCount)
      
      // For top_media_carousel, update mediaItems
      let updatedMediaItems: MediaItem[] | undefined = undefined
      if (sectionId === 'top_media_carousel') {
        const existingMediaItems = section.mediaItems || []
        const mediaType = isVideo ? 'video' : 'image'
        const newMediaItem: MediaItem = {
          url: url,
          type: mediaType,
          timing: topMediaSettings.autoPlayDelay
        }
        
        if (imageIndex !== undefined && imageIndex < existingMediaItems.length) {
          updatedMediaItems = [...existingMediaItems]
          updatedMediaItems[imageIndex] = { ...existingMediaItems[imageIndex], ...newMediaItem }
        } else {
          updatedMediaItems = [...existingMediaItems, newMediaItem]
        }
        updatedMediaItems = updatedMediaItems.slice(0, section.imageCount)
      }
      
      // Update local state
      setSections(prev => prev.map(s => 
        s.id === sectionId ? { 
          ...s, 
          images: finalImages,
          mediaItems: updatedMediaItems || s.mediaItems
        } : s
      ))
      
      // Save to CMS with the new images
      await saveSectionToCMS(sectionId, url, imageIndex, finalImages, updatedMediaItems)
      
      notify('success', isVideo ? 'Video uploaded successfully' : 'Image uploaded successfully')
    } catch (error: any) {
      console.error('Upload failed:', error)
      const errorMessage = error?.message || (isVideoFile(file) ? 'Failed to upload video' : 'Failed to upload image')
      notify('error', errorMessage)
    } finally {
      setUploading(prev => ({ ...prev, [sectionId]: false }))
    }
  }

  // Handle cropped image
  const handleCropComplete = async (croppedImageBlob: Blob) => {
    try {
      setUploading(prev => ({ ...prev, [cropperSectionId]: true }))
      
      // Convert blob to File
      const fileName = pendingFile 
        ? pendingFile.name.replace(/\.[^/.]+$/, '.jpg')
        : `cropped-thumbnail-${Date.now()}.jpg`
      const croppedFile = new File([croppedImageBlob], fileName, { type: 'image/jpeg' })
      
      // Upload the cropped image
      const url = await uploadFile(croppedFile, API_BASE)
      
      // Calculate new images array
      const section = sections.find(s => s.id === cropperSectionId)
      if (!section) return
      
      // Check if we're cropping a video thumbnail (no pendingFile means it's a video frame crop)
      const isVideoThumbnailCrop = !pendingFile && cropperImageIndex !== undefined && 
        section.images[cropperImageIndex] && 
        /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(section.images[cropperImageIndex])
      
      const newImages = [...section.images]
      // Only update images array if it's not a video thumbnail crop
      if (!isVideoThumbnailCrop) {
        if (cropperImageIndex !== undefined && cropperImageIndex < newImages.length) {
          newImages[cropperImageIndex] = url
        } else {
          newImages.push(url)
        }
      }
      const finalImages = newImages.slice(0, section.imageCount)
      
      // For top_media_carousel, update mediaItems (use cropped image as thumbnail for videos)
      let updatedMediaItems: MediaItem[] | undefined = undefined
      if (cropperSectionId === 'top_media_carousel') {
        const existingMediaItems = section.mediaItems || []
        const isVideo = isVideoThumbnailCrop || (section.images[cropperImageIndex || 0] && /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(section.images[cropperImageIndex || 0]))
        
        if (cropperImageIndex !== undefined && cropperImageIndex < existingMediaItems.length) {
          updatedMediaItems = [...existingMediaItems]
          updatedMediaItems[cropperImageIndex] = {
            ...existingMediaItems[cropperImageIndex],
            url: isVideoThumbnailCrop ? existingMediaItems[cropperImageIndex].url : (isVideo ? existingMediaItems[cropperImageIndex].url : url), // Keep video URL for thumbnail crops, update image URL otherwise
            thumbnail: isVideoThumbnailCrop ? url : (isVideo ? url : undefined) // Use cropped image as thumbnail for videos
          }
        } else {
          updatedMediaItems = [...existingMediaItems]
          if (isVideo) {
            updatedMediaItems.push({
              url: section.images[cropperImageIndex || existingMediaItems.length] || url,
              type: 'video',
              timing: topMediaSettings.autoPlayDelay,
              thumbnail: isVideoThumbnailCrop ? url : undefined
            })
          } else {
            updatedMediaItems.push({
              url: url,
              type: 'image',
              timing: topMediaSettings.autoPlayDelay
            })
          }
        }
        updatedMediaItems = updatedMediaItems.slice(0, section.imageCount)
      }
      
      // Update local state
      setSections(prev => prev.map(s => 
        s.id === cropperSectionId ? { 
          ...s, 
          images: finalImages,
          mediaItems: updatedMediaItems || s.mediaItems
        } : s
      ))
      
      // Save to CMS with the new images
      await saveSectionToCMS(cropperSectionId, url, cropperImageIndex, finalImages, updatedMediaItems)
      
      notify('success', isVideoThumbnailCrop ? 'Video thumbnail cropped and uploaded successfully' : 'Image cropped and uploaded successfully')
      
      // Cleanup
      if (cropperImage.startsWith('blob:')) {
        URL.revokeObjectURL(cropperImage)
      }
      setShowCropper(false)
      setCropperImage('')
      setPendingFile(null)
    } catch (error: any) {
      console.error('Crop upload failed:', error)
      notify('error', 'Failed to upload cropped image')
    } finally {
      setUploading(prev => ({ ...prev, [cropperSectionId]: false }))
    }
  }

  const handleCropCancel = () => {
    if (cropperImage) {
      URL.revokeObjectURL(cropperImage)
    }
    setShowCropper(false)
    setCropperImage('')
    setCropperSectionId('')
    setCropperImageIndex(undefined)
    setCropperAspectRatio(1)
    setPendingFile(null)
  }

  const handleSizeSelect = async (size: { name: string; ratio: number } | null) => {
    setSelectedSize(size)
    setShowSizeSelector(false)
    
    if (pendingUpload) {
      const { file, sectionId, index } = pendingUpload
      
      // If "Free" (no crop) selected, upload directly
      if (!size) {
        try {
          setUploading(prev => ({ ...prev, [sectionId]: true }))
          
          const url = await uploadFile(file, API_BASE)
          
          // Calculate new images array
          const section = sections.find(s => s.id === sectionId)
          if (!section) return
          
          const newImages = [...section.images]
          if (index !== undefined && index < newImages.length) {
            newImages[index] = url
          } else {
            newImages.push(url)
          }
          const finalImages = newImages.slice(0, section.imageCount)
          
          // Update local state
          setSections(prev => prev.map(s => 
            s.id === sectionId ? { ...s, images: finalImages } : s
          ))
          
          // Save to CMS with the new images
          await saveSectionToCMS(sectionId, url, index, finalImages)
          
          notify('success', 'Image uploaded successfully')
        } catch (error: any) {
          console.error('Upload failed:', error)
          notify('error', error?.message || 'Failed to upload image')
        } finally {
          setUploading(prev => ({ ...prev, [sectionId]: false }))
        }
      } else {
        // Show cropper with selected aspect ratio
        const previewUrl = URL.createObjectURL(file)
        setCropperImage(previewUrl)
        setCropperSectionId(sectionId)
        setCropperImageIndex(index)
        setCropperAspectRatio(size.ratio)
        setPendingFile(file)
        setShowCropper(true)
      }
      setPendingUpload(null)
    }
  }

  // Save section to CMS
  const saveSectionToCMS = async (sectionId: string, imageUrl: string, imageIndex: number | undefined, updatedImages?: string[], updatedMediaItems?: MediaItem[]) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    try {
      // Helper to convert full URLs to relative paths for storage
      const toRelativePath = (url: string): string => {
        if (!url) return ''
        // If it's already a relative path, return as is
        if (url.startsWith('/')) return url
        // If it's a full URL, extract the path
        try {
          const urlObj = new URL(url)
          return urlObj.pathname
        } catch {
          return url
        }
      }
      
      // Use provided images or get from section, converting to relative paths
      let imagesSource = updatedImages || section.images
      if (section.sectionType === 'splash_screen') {
        imagesSource = padArray(imagesSource, section.imageCount)
      }
      const imagesToUse = imagesSource.map(toRelativePath)
      
      let content: any = {}
      
      if (section.sectionType === 'hero_banner') {
        const heroSection = sections.find(s => s.id === 'hero_banner')
        content = {
          title: 'Hero Banner',
          subtitle: 'NATURAL BEAUTY',
          description: 'infused with premium natural ingredients',
          buttonText: 'SHOP NOW',
          buttonLink: '/shop',
          images: imagesToUse, // Can contain both image and video URLs
          videos: imagesToUse.filter((url: string) => /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url)),
          settings: heroSection?.settings || heroSettings
        }
      } else if (section.sectionType === 'top_media_carousel') {
        const topMediaSection = sections.find(s => s.id === 'top_media_carousel')
        // Use updatedMediaItems if provided, otherwise use existing mediaItems, or create from images
        // Convert mediaItems URLs to relative paths
        const baseMediaItems = updatedMediaItems || topMediaSection?.mediaItems || imagesToUse.map((url: string) => ({
          url: url,
          type: /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url) ? 'video' : 'image' as const,
          timing: topMediaSettings.autoPlayDelay
        }))
        const mediaItems = baseMediaItems.map((item: MediaItem) => ({
          ...item,
          url: toRelativePath(item.url),
          thumbnail: item.thumbnail ? toRelativePath(item.thumbnail) : undefined
        }))
        
        // Separate videos and images for better handling
        const videoUrls = imagesToUse.filter((url: string) => /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url))
        const imageUrls = imagesToUse.filter((url: string) => !/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url))
        content = {
          title: 'Top Media Carousel',
          images: imagesToUse, // All media (images and videos) for backward compatibility
          videos: videoUrls, // Separate video array
          media: imagesToUse.map((url: string) => ({
            url: toRelativePath(url),
            type: /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(url) ? 'video' : 'image'
          })), // Enhanced media array with type information
          mediaItems: mediaItems, // Save mediaItems with timing and metadata
          settings: topMediaSection?.settings || topMediaSettings
        }
      } else if (section.sectionType === 'scrolling_text_banner') {
        content = {
          text: scrollingText || ''
        }
      } else if (section.sectionType === 'shop_categories') {
        // Need to fetch existing categories and update the specific one
        const cmsResponse = await fetch(`${API_BASE}/cms/sections/home`)
        const cmsSections = await cmsResponse.json()
        const categorySection = cmsSections.find((s: any) => s.section_type === 'shop_categories')
        
        const categoryNameMap: Record<string, string> = {
          'body_category': 'Body',
          'face_category': 'Face',
          'hair_category': 'Hair',
          'combos_category': 'Combos'
        }
        
        const categoryName = categoryNameMap[sectionId]
        
        // Normalize image URL to relative path for storage
        const normalizeImageUrl = (url: string): string => {
          if (!url) return url
          // If it's already a relative path, return as is
          if (url.startsWith('/')) return url
          // If it's an absolute URL from our API, extract the path
          if (url.includes('/uploads/')) {
            const pathMatch = url.match(/\/uploads\/[^?]+/)
            if (pathMatch) return pathMatch[0]
          }
          // If it's a full URL, try to extract path
          try {
            const urlObj = new URL(url)
            return urlObj.pathname
          } catch {
            return url
          }
        }
        
        const normalizedImageUrl = normalizeImageUrl(imageUrl)
        
        if (categorySection && categorySection.content && categorySection.content.categories) {
          const categories = categorySection.content.categories.map((cat: any) => 
            cat.name === categoryName ? { ...cat, image: normalizedImageUrl } : cat
          )
          content = {
            ...categorySection.content,
            categories
          }
        } else {
          const categoryMap: Record<string, string> = {
            'Body': '/body',
            'Face': '/face',
            'Hair': '/hair',
            'Combos': '/combos'
          }
          const defaultImages: Record<string, string> = {
            'Body': '/IMAGES/body.jpg',
            'Face': '/IMAGES/face.jpg',
            'Hair': '/IMAGES/hair.jpg',
            'Combos': '/IMAGES/combo.jpg'
          }
          content = {
            title: 'SHOP BY CATEGORY',
            categories: [
              { name: 'Body', image: sectionId === 'body_category' ? normalizedImageUrl : defaultImages['Body'], link: categoryMap['Body'] },
              { name: 'Face', image: sectionId === 'face_category' ? normalizedImageUrl : defaultImages['Face'], link: categoryMap['Face'] },
              { name: 'Hair', image: sectionId === 'hair_category' ? normalizedImageUrl : defaultImages['Hair'], link: categoryMap['Hair'] },
              { name: 'Combos', image: sectionId === 'combos_category' ? normalizedImageUrl : defaultImages['Combos'], link: categoryMap['Combos'] }
            ]
          }
        }
      } else if (section.sectionType === 'commitments') {
        content = {
          title: 'THOUGHTFUL COMMITMENTS',
          description: 'We are committed to providing you with the safest and most effective natural skincare products.',
          images: imagesToUse // Already converted to relative paths above
        }
      } else if (section.sectionType === 'complete_kit') {
        content = {
          title: 'THE COMPLETE KIT',
          description: 'Get the full NEFOL® experience in one curated bundle',
          buttonText: 'View Kit',
          buttonLink: '/combos',
          image: toRelativePath(imageUrl)
        }
      } else if (section.sectionType === 'marketplace_logos') {
        content = {
          title: 'AVAILABLE ON',
          logos: imagesToUse // Already converted to relative paths above
        }
      } else if (section.sectionType === 'nefol_collection') {
        // Normalize image URL
        const normalizeImageUrl = (url: string): string => {
          if (!url) return url
          if (url.startsWith('/')) return url
          if (url.includes('/uploads/')) {
            const pathMatch = url.match(/\/uploads\/[^?]+/)
            if (pathMatch) return pathMatch[0]
          }
          try {
            const urlObj = new URL(url)
            return urlObj.pathname
          } catch {
            return url
          }
        }
        const normalizedImageUrl = normalizeImageUrl(imageUrl)
        
        // Fetch existing content to preserve text fields and existing image if no new image uploaded
        const cmsResponse = await fetch(`${API_BASE}/cms/sections/home`)
        const cmsSections = await cmsResponse.json()
        const existingSection = cmsSections.find((s: any) => s.section_type === 'nefol_collection')
        
        // Use new image if provided, otherwise preserve existing image
        const finalImage = normalizedImageUrl || existingSection?.content?.image || ''
        
        content = {
          title: existingSection?.content?.title || 'NEFOL COLLECTION',
          subtitle: existingSection?.content?.subtitle || 'ELEVATE YOUR SKINCARE WITH',
          description: existingSection?.content?.description || 'Our premium collection combines the best of nature and science to deliver exceptional results for your skin.',
          buttonText: existingSection?.content?.buttonText || 'SHOP NOW',
          buttonLink: existingSection?.content?.buttonLink || '/shop',
          image: toRelativePath(finalImage)
        }
      } else if (section.sectionType === 'forever_favorites') {
        // Normalize image URLs
        const normalizeImageUrl = (url: string): string => {
          if (!url) return url
          if (url.startsWith('/')) return url
          if (url.includes('/uploads/')) {
            const pathMatch = url.match(/\/uploads\/[^?]+/)
            if (pathMatch) return pathMatch[0]
          }
          try {
            const urlObj = new URL(url)
            return urlObj.pathname
          } catch {
            return url
          }
        }
        
        // Fetch existing content to preserve text fields and existing images
        const cmsResponse = await fetch(`${API_BASE}/cms/sections/home`)
        const cmsSections = await cmsResponse.json()
        const existingSection = cmsSections.find((s: any) => s.section_type === 'forever_favorites')
        
        // Use new images if provided, otherwise preserve existing images
        let finalImages = imagesToUse.length > 0 ? imagesToUse.map(normalizeImageUrl) : []
        if (finalImages.length === 0 && existingSection?.content) {
          // Preserve existing images if no new ones uploaded
          const existingImages = existingSection.content.images || []
          const luxuryImg = existingSection.content.luxurySkincare?.image
          const naturalImg = existingSection.content.naturalBeauty?.image
          if (existingImages.length > 0) {
            finalImages = existingImages.map(normalizeImageUrl)
          } else if (luxuryImg || naturalImg) {
            finalImages = [luxuryImg, naturalImg].filter(Boolean).map(normalizeImageUrl)
          }
        }
        
        content = {
          title: existingSection?.content?.title || 'FOREVER FAVORITES',
          description: existingSection?.content?.description || 'Discover our most loved products that have become staples in skincare routines worldwide.',
          images: finalImages,
          luxurySkincare: {
            title: existingSection?.content?.luxurySkincare?.title || 'LUXURY SKINCARE',
            buttonText: existingSection?.content?.luxurySkincare?.buttonText || 'SHOP NOW',
            image: toRelativePath(finalImages[0] || existingSection?.content?.luxurySkincare?.image || '')
          },
          naturalBeauty: {
            title: existingSection?.content?.naturalBeauty?.title || 'NATURAL BEAUTY',
            buttonText: existingSection?.content?.naturalBeauty?.buttonText || 'SHOP NOW',
            image: toRelativePath(finalImages[1] || existingSection?.content?.naturalBeauty?.image || '')
          }
        }
      } else if (section.sectionType === 'natural_beauty') {
        // Normalize image URL
        const normalizeImageUrl = (url: string): string => {
          if (!url) return url
          if (url.startsWith('/')) return url
          if (url.includes('/uploads/')) {
            const pathMatch = url.match(/\/uploads\/[^?]+/)
            if (pathMatch) return pathMatch[0]
          }
          try {
            const urlObj = new URL(url)
            return urlObj.pathname
          } catch {
            return url
          }
        }
        const normalizedImageUrl = normalizeImageUrl(imageUrl)
        
        // Fetch existing content to preserve text fields and existing image if no new image uploaded
        const cmsResponse = await fetch(`${API_BASE}/cms/sections/home`)
        const cmsSections = await cmsResponse.json()
        const existingSection = cmsSections.find((s: any) => s.section_type === 'natural_beauty')
        
        // Use new image if provided, otherwise preserve existing image
        const finalImage = normalizedImageUrl || existingSection?.content?.image || ''
        
        content = {
          title: existingSection?.content?.title || 'NATURAL BEAUTY',
          subtitle: existingSection?.content?.subtitle || 'ELEVATE YOUR SKIN WITH',
          description: existingSection?.content?.description || 'infused with premium natural ingredients',
          buttonText: existingSection?.content?.buttonText || 'SHOP NOW',
          buttonLink: existingSection?.content?.buttonLink || '/shop',
          image: toRelativePath(finalImage)
        }
      } else if (section.sectionType === 'whatsappsubscription') {
        // Normalize image URL - convert absolute URLs to relative paths
        const normalizeImageUrl = (url: string): string => {
          if (!url) return ''
          // If it's already a relative path, return as is
          if (url.startsWith('/')) return url
          // If it includes /uploads/, extract the path
          if (url.includes('/uploads/')) {
            const pathMatch = url.match(/\/uploads\/[^?]+/)
            if (pathMatch) return pathMatch[0]
          }
          // If it's a full URL, extract the pathname
          try {
            const urlObj = new URL(url)
            return urlObj.pathname
          } catch {
            // If URL parsing fails, try to extract path manually
            if (url.includes('/uploads/')) {
              const pathMatch = url.match(/\/uploads\/[^?]+/)
              if (pathMatch) return pathMatch[0]
            }
            return url
          }
        }
        
        // Fetch existing content to preserve fields
        const cmsResponse = await fetch(`${API_BASE}/cms/sections/home`)
        const cmsSections = await cmsResponse.json()
        const existingSection = cmsSections.find((s: any) => s.section_type === 'whatsappsubscription')
        
        // Handle images: updatedImages[0] = product image, updatedImages[1] = logo
        let finalImage = existingSection?.content?.image || ''
        let finalLogo = existingSection?.content?.logo || ''
        
        if (updatedImages && updatedImages.length > 0) {
          // Determine which image was updated based on imageIndex
          if (imageIndex === 0 || (imageIndex === undefined && updatedImages.length >= 1)) {
            // Product image was updated
            finalImage = normalizeImageUrl(updatedImages[0])
            // Preserve logo if it exists
            if (updatedImages.length > 1) {
              finalLogo = normalizeImageUrl(updatedImages[1])
            } else if (existingSection?.content?.logo) {
              finalLogo = existingSection.content.logo
            }
          } else if (imageIndex === 1 || (imageIndex === undefined && updatedImages.length === 2)) {
            // Logo was updated
            finalLogo = normalizeImageUrl(updatedImages[1] || updatedImages[updatedImages.length - 1])
            // Preserve product image
            if (updatedImages.length > 0) {
              finalImage = normalizeImageUrl(updatedImages[0])
            } else if (existingSection?.content?.image) {
              finalImage = existingSection.content.image
            }
          } else {
            // Fallback: use first image as product, second as logo
            if (updatedImages[0]) finalImage = normalizeImageUrl(updatedImages[0])
            if (updatedImages[1]) finalLogo = normalizeImageUrl(updatedImages[1])
          }
        } else if (imageUrl) {
          // Single image URL provided (from direct upload)
          const normalized = normalizeImageUrl(imageUrl)
          if (imageIndex === 1) {
            // Logo was uploaded
            finalLogo = normalized
            finalImage = existingSection?.content?.image || ''
          } else {
            // Product image was uploaded
            finalImage = normalized
            finalLogo = existingSection?.content?.logo || ''
          }
        }
        
        content = {
          image: toRelativePath(finalImage),
          logo: toRelativePath(finalLogo),
          heading: whatsappSubscriptionText.heading,
          description: whatsappSubscriptionText.description,
          footer: whatsappSubscriptionText.footer,
          logoName: whatsappSubscriptionText.logoName
        }
      } else if (section.sectionType === 'splash_screen') {
        const paddedVideos = padArray(imagesToUse, 3)
        content = {
          desktop: { video: paddedVideos[0] || '' },
          tablet: { video: paddedVideos[1] || '' },
          mobile: { video: paddedVideos[2] || '' },
          updatedAt: new Date().toISOString()
        }
      } else if (section.sectionType.startsWith('custom_')) {
        // Custom section
        content = {
          title: section.name,
          description: section.description,
          images: imagesToUse
        }
      }

      // Map of section types to their correct display names
      const sectionNameMap: Record<string, string> = {
        'scrolling_text_banner': 'Scrolling Text Banner',
        'top_media_carousel': 'Top Media Carousel (Above Hero)',
        'hero_banner': 'Hero Banner (Top Slider)',
        'body_category': 'Body Category',
        'face_category': 'Face Category',
        'hair_category': 'Hair Category',
        'combos_category': 'Combos Category',
        'commitments': 'Certifications/Commitments',
        'complete_kit': 'Complete Kit Banner',
        'marketplace_logos': 'Marketplace Logos',
        'nefol_collection': 'Nefol Collection',
        'forever_favorites': 'Forever Favorites',
        'natural_beauty': 'Natural Beauty',
        'whatsappsubscription': 'WhatsApp Subscription',
        'splash_screen': 'Splash Screen Videos'
      }
      
      // Use the correct section name from our map, or fall back to section.name
      const sectionTitle = sectionNameMap[section.sectionType] || section.name
      
      const response = await fetch(`${API_BASE}/cms/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_slug: 'home',
          section_type: section.sectionType,
          title: sectionTitle,
          content,
          order_index: section.orderIndex || 0,
          is_active: true
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save to CMS')
      }
    } catch (error) {
      console.error('Failed to save section:', error)
      throw error
    }
  }

  // Save hero banner settings
  const saveHeroSettings = async () => {
    const heroSection = sections.find(s => s.id === 'hero_banner')
    if (!heroSection) return

    // Update local state
    setSections(prev => prev.map(s => 
      s.id === 'hero_banner' ? { ...s, settings: heroSettings } : s
    ))

    // Save to CMS
    try {
      await saveSectionToCMS('hero_banner', heroSection.images[0] || '', undefined, heroSection.images)
      notify('success', 'Hero settings saved successfully')
      setShowHeroSettings(false)
    } catch (error) {
      notify('error', 'Failed to save hero settings')
    }
  }

  // Remove image
  const removeImage = async (sectionId: string, imageIndex: number) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return

    let newImages: string[]
    if (section.sectionType === 'splash_screen') {
      newImages = padArray(section.images, section.imageCount)
      if (imageIndex !== undefined && imageIndex >= 0 && imageIndex < newImages.length) {
        newImages[imageIndex] = ''
      }
    } else {
      newImages = section.images.filter((_, i) => i !== imageIndex)
    }
    
    // For top_media_carousel, also update mediaItems
    let updatedMediaItems: MediaItem[] | undefined = undefined
    if (sectionId === 'top_media_carousel' && section.mediaItems) {
      updatedMediaItems = section.mediaItems.filter((_, i) => i !== imageIndex)
    }
    
    setSections(prev => prev.map(s => 
      s.id === sectionId ? { 
        ...s, 
        images: section.sectionType === 'splash_screen' ? padArray(newImages, section.imageCount) : newImages,
        mediaItems: updatedMediaItems || s.mediaItems
      } : s
    ))

    // Update CMS
    try {
      const imagesForSave = section.sectionType === 'splash_screen' ? padArray(newImages, section.imageCount) : newImages
      await saveSectionToCMS(sectionId, imagesForSave[0] || '', undefined, imagesForSave, updatedMediaItems)
      notify('success', 'Media removed')
    } catch (error) {
      notify('error', 'Failed to update CMS')
    }
  }

  // Update timing for a media item
  const updateMediaTiming = async (sectionId: string, mediaIndex: number, timing: number) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section || sectionId !== 'top_media_carousel' || !section.mediaItems) return

    const updatedMediaItems = [...section.mediaItems]
    if (mediaIndex < updatedMediaItems.length) {
      updatedMediaItems[mediaIndex] = {
        ...updatedMediaItems[mediaIndex],
        timing: timing
      }
    }

    setSections(prev => prev.map(s => 
      s.id === sectionId ? { ...s, mediaItems: updatedMediaItems } : s
    ))

    // Save to CMS
    try {
      await saveSectionToCMS(sectionId, section.images[0] || '', undefined, section.images, updatedMediaItems)
      notify('success', 'Timing updated successfully')
    } catch (error) {
      notify('error', 'Failed to update timing')
    }
  }

  // Extract first frame from video for cropping
  const extractVideoFrame = (videoUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.src = videoUrl
      video.currentTime = 0.1 // Get frame at 0.1 seconds
      
      video.onloadeddata = () => {
        video.onseeked = () => {
          const canvas = document.createElement('canvas')
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(video, 0, 0)
            const dataUrl = canvas.toDataURL('image/jpeg')
            resolve(dataUrl)
          } else {
            reject(new Error('Failed to get canvas context'))
          }
        }
        video.currentTime = 0.1
      }
      
      video.onerror = () => {
        reject(new Error('Failed to load video'))
      }
    })
  }

  // Handle video thumbnail crop
  const handleVideoThumbnailCrop = async (sectionId: string, videoIndex: number) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section || !section.images[videoIndex]) return

    const videoUrl = section.images[videoIndex]
    if (!/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(videoUrl)) {
      notify('error', 'Selected item is not a video')
      return
    }

    try {
      // Extract first frame
      const frameDataUrl = await extractVideoFrame(videoUrl)
      
      // Show cropper with the frame
      setCropperImage(frameDataUrl)
      setCropperSectionId(sectionId)
      setCropperImageIndex(videoIndex)
      setCropperAspectRatio(16/9) // Default aspect ratio for video thumbnails
      setPendingFile(null) // No file needed, we're cropping a frame
      setShowCropper(true)
    } catch (error: any) {
      console.error('Failed to extract video frame:', error)
      notify('error', 'Failed to extract video frame. Please try again.')
    }
  }

  // Handle video crop (actual video, not thumbnail)
  const handleVideoCrop = (sectionId: string, videoIndex: number) => {
    const section = sections.find(s => s.id === sectionId)
    if (!section || !section.images[videoIndex]) return

    const videoUrl = section.images[videoIndex]
    if (!/\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(videoUrl)) {
      notify('error', 'Selected item is not a video')
      return
    }

    setCropperVideo(videoUrl)
    setCropperSectionId(sectionId)
    setCropperImageIndex(videoIndex)
    setCropperAspectRatio(16/9) // Default aspect ratio
    setShowVideoCropper(true)
  }

  // Handle cropped video
  const handleVideoCropComplete = async (croppedVideoBlob: Blob) => {
    try {
      setUploading(prev => ({ ...prev, [cropperSectionId]: true }))
      
      // Convert blob to File
      const croppedFile = new File([croppedVideoBlob], `cropped-video-${Date.now()}.webm`, { type: 'video/webm' })
      
      // Upload the cropped video
      const url = await uploadFile(croppedFile, API_BASE)
      
      // Calculate new images array
      const section = sections.find(s => s.id === cropperSectionId)
      if (!section) return
      
      const newImages = [...section.images]
      if (cropperImageIndex !== undefined && cropperImageIndex < newImages.length) {
        newImages[cropperImageIndex] = url
      } else {
        newImages.push(url)
      }
      const finalImages = newImages.slice(0, section.imageCount)
      
      // For top_media_carousel, update mediaItems
      let updatedMediaItems: MediaItem[] | undefined = undefined
      if (cropperSectionId === 'top_media_carousel') {
        const existingMediaItems = section.mediaItems || []
        
        if (cropperImageIndex !== undefined && cropperImageIndex < existingMediaItems.length) {
          updatedMediaItems = [...existingMediaItems]
          updatedMediaItems[cropperImageIndex] = {
            ...existingMediaItems[cropperImageIndex],
            url: url,
            type: 'video'
          }
        } else {
          updatedMediaItems = [...existingMediaItems]
          updatedMediaItems.push({
            url: url,
            type: 'video',
            timing: topMediaSettings.autoPlayDelay
          })
        }
        updatedMediaItems = updatedMediaItems.slice(0, section.imageCount)
      }
      
      // Update local state
      setSections(prev => prev.map(s => 
        s.id === cropperSectionId ? { 
          ...s, 
          images: finalImages,
          mediaItems: updatedMediaItems || s.mediaItems
        } : s
      ))
      
      // Save to CMS with the new images
      await saveSectionToCMS(cropperSectionId, url, cropperImageIndex, finalImages, updatedMediaItems)
      
      notify('success', 'Video cropped and uploaded successfully')
      
      // Cleanup
      setShowVideoCropper(false)
      setCropperVideo('')
      setCropperSectionId('')
      setCropperImageIndex(undefined)
    } catch (error: any) {
      console.error('Video crop upload failed:', error)
      notify('error', 'Failed to upload cropped video')
    } finally {
      setUploading(prev => ({ ...prev, [cropperSectionId]: false }))
    }
  }

  const handleVideoCropCancel = () => {
    setShowVideoCropper(false)
    setCropperVideo('')
    setCropperSectionId('')
    setCropperImageIndex(undefined)
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverSection(sectionId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverSection(null)
  }

  const handleDrop = async (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggedOverSection(null)

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/') || 
      /\.(mp4|webm|ogg|mov|avi|jpg|jpeg|png|gif|webp)(\?|$)/i.test(file.name)
    )

    if (files.length === 0) {
      notify('error', 'Please drop image or video files only')
      return
    }

    for (const file of files) {
      const isVideo = isVideoFile(file)
      // Videos upload directly, images go through size selector
      if (isVideo) {
        await handleUpload(file, sectionId, undefined, true)
      } else {
        await handleUpload(file, sectionId)
      }
    }
  }

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const isVideo = isVideoFile(file)
      // Videos upload directly, images go through size selector
      if (isVideo) {
        handleUpload(file, sectionId, undefined, true)
      } else {
        handleUpload(file, sectionId)
      }
    })
    e.target.value = '' // Reset input
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading homepage layout...</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 
            className="text-3xl font-light mb-2 tracking-[0.15em]" 
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)',
              letterSpacing: '0.15em'
            }}
          >
            Homepage Layout Manager
          </h1>
          <p className="text-sm font-light tracking-wide mt-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Drag and drop images to different sections or click to upload
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateSection(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create New Section
          </button>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="btn-secondary flex items-center gap-2"
          >
            <Eye className="w-5 h-5" />
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
          <button
            onClick={initializeSections}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Blueprint View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {sections.map((section) => (
          <div
            key={section.id}
            onDragOver={(e) => handleDragOver(e, section.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, section.id)}
            className={`border-2 rounded-lg p-6 transition-all ${
              draggedOverSection === section.id
                ? 'border-blue-500 bg-blue-50 border-dashed'
                : 'border-gray-200 hover:border-gray-300'
            } ${uploading[section.id] ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">
                    {section.name}
                    {section.isCustom && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                        Custom
                      </span>
                    )}
                  </h3>
                  {(section.id === 'hero_banner' || section.id === 'top_media_carousel') && (
                    <button
                      onClick={() => {
                        if (section.id === 'hero_banner') {
                          setShowHeroSettings(!showHeroSettings)
                        } else {
                          setShowTopMediaSettings(!showTopMediaSettings)
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                      title="Animation & Design Settings"
                    >
                      <Settings className="w-4 h-4 text-blue-600" />
                    </button>
                  )}
                  {section.isCustom && (
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete "${section.name}"?`)) {
                          try {
                            const response = await fetch(`${API_BASE}/cms/sections/home`)
                            const cmsSections = await response.json()
                            const cmsSection = cmsSections.find((s: any) => s.section_type === section.sectionType)
                            
                            if (cmsSection) {
                              const deleteResponse = await fetch(`${API_BASE}/cms/sections/${cmsSection.id}`, {
                                method: 'DELETE'
                              })
                              
                              if (deleteResponse.ok) {
                                notify('success', 'Section deleted successfully')
                                await initializeSections()
                              } else {
                                throw new Error('Failed to delete')
                              }
                            }
                          } catch (error) {
                            console.error('Failed to delete section:', error)
                            notify('error', 'Failed to delete section')
                          }
                        }
                      }}
                      className="p-1.5 hover:bg-red-100 rounded transition-colors"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600">{section.description}</p>
                {section.id !== 'scrolling_text_banner' && section.id !== 'splash_screen' && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-gray-100 rounded">
                    Max {section.imageCount} image{section.imageCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {section.id !== 'scrolling_text_banner' && section.id !== 'splash_screen' && (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept={(section.id === 'hero_banner' || section.id === 'top_media_carousel') ? "image/*,video/*" : "image/*"}
                    multiple={section.imageCount > 1}
                    onChange={(e) => handleFileInput(e, section.id)}
                    className="hidden"
                    disabled={uploading[section.id]}
                  />
                  <div className="p-2 hover:bg-gray-100 rounded transition-colors">
                    <Upload className="w-5 h-5 text-gray-600" />
                  </div>
                </label>
              )}
            </div>

            {/* Scrolling Text Banner Input */}
            {section.id === 'scrolling_text_banner' && (
              <div className="mt-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scrolling Text (Offers, Promotions, etc.)
                </label>
                <textarea
                  value={scrollingText}
                  onChange={(e) => setScrollingText(e.target.value)}
                  placeholder="Enter text to display in the scrolling banner. You can add multiple items separated by commas or new lines. Example: 'Free Shipping on Orders Above ₹500', 'Buy 2 Get 1 Free', 'New Arrivals - Shop Now!'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 resize-y min-h-[100px]"
                  rows={4}
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    This text will scroll continuously 24/7 on the homepage
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const scrollingSection = sections.find(s => s.id === 'scrolling_text_banner')
                        if (!scrollingSection) return
                        await saveSectionToCMS('scrolling_text_banner', '', undefined, [])
                        notify('success', 'Scrolling text saved successfully')
                      } catch (error) {
                        notify('error', 'Failed to save scrolling text')
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Text
                  </button>
                </div>
              </div>
            )}

            {/* WhatsApp Subscription Input */}
            {section.id === 'whatsappsubscription' && (
              <div className="mt-4 p-4 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg border border-green-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  WhatsApp Subscription Modal Content
                </label>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Heading
                    </label>
                    <input
                      type="text"
                      value={whatsappSubscriptionText.heading}
                      onChange={(e) => setWhatsappSubscriptionText({ ...whatsappSubscriptionText, heading: e.target.value })}
                      placeholder="Join The NEFOL® Circle"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Description
                    </label>
                    <textarea
                      value={whatsappSubscriptionText.description}
                      onChange={(e) => setWhatsappSubscriptionText({ ...whatsappSubscriptionText, description: e.target.value })}
                      placeholder="Stay ahead with exclusive style drops, member-only offers, and insider fashion updates."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-y min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Footer Text
                    </label>
                    <input
                      type="text"
                      value={whatsappSubscriptionText.footer}
                      onChange={(e) => setWhatsappSubscriptionText({ ...whatsappSubscriptionText, footer: e.target.value })}
                      placeholder="By subscribing, you agree to receive WhatsApp messages from NEFOL®."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Logo Name
                    </label>
                    <input
                      type="text"
                      value={whatsappSubscriptionText.logoName}
                      onChange={(e) => setWhatsappSubscriptionText({ ...whatsappSubscriptionText, logoName: e.target.value })}
                      placeholder="NEFÖL"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Product Image
                      </label>
                      {section.images[0] ? (
                        <div className="relative">
                          <img src={section.images[0]} alt="Product" className="w-full h-32 object-contain rounded-lg border border-gray-200" />
                          <button
                            onClick={() => removeImage(section.id, 0)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(file, section.id, 0, true)
                            }}
                            className="hidden"
                          />
                          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-green-500 hover:bg-green-50 transition-colors">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                        </label>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-2">
                        Logo Image
                      </label>
                      {section.images[1] ? (
                        <div className="relative">
                          <img src={section.images[1]} alt="Logo" className="w-full h-32 object-contain rounded-lg border border-gray-200" />
                          <button
                            onClick={() => removeImage(section.id, 1)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleUpload(file, section.id, 1, true)
                            }}
                            className="hidden"
                          />
                          <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-green-500 hover:bg-green-50 transition-colors">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Edit the text content, upload product image and logo for the WhatsApp subscription modal
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        const whatsappSection = sections.find(s => s.id === 'whatsappsubscription')
                        if (!whatsappSection) return
                        await saveSectionToCMS('whatsappsubscription', whatsappSection.images[0] || '', undefined, whatsappSection.images)
                        notify('success', 'WhatsApp subscription content saved successfully')
                      } catch (error) {
                        notify('error', 'Failed to save WhatsApp subscription content')
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save Content
                  </button>
                </div>
              </div>
            )}

            {/* Splash Screen Manager */}
            {section.id === 'splash_screen' && (
              <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-base font-semibold text-purple-900">Splash Screen Videos</h4>
                    <p className="text-sm text-slate-600">
                      Upload device-specific videos (MP4/WebM) to personalize the opening animation for every visitor.
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">Auto-plays for desktop, tablet & mobile users.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SPLASH_DEVICE_CONFIGS.map(({ label, helper, index }) => {
                    const videoUrl = section.images[index]
                    return (
                      <div key={label} className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{label}</p>
                          <p className="text-xs text-slate-500">{helper}</p>
                        </div>
                        {videoUrl ? (
                          <div className="relative group border border-purple-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <video
                              src={videoUrl}
                              className="w-full h-48 object-cover bg-black"
                              controls
                              playsInline
                              muted
                              loop
                            />
                            {!previewMode && (
                              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        handleUpload(file, section.id, index, true)
                                      }
                                      e.currentTarget.value = ''
                                    }}
                                  />
                                  <div className="px-3 py-1 text-xs bg-white/80 text-purple-700 rounded-full shadow">
                                    Change
                                  </div>
                                </label>
                                <button
                                  onClick={() => removeImage(section.id, index)}
                                  className="px-3 py-1 text-xs bg-red-500 text-white rounded-full shadow hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleUpload(file, section.id, index, true)
                                }
                                e.currentTarget.value = ''
                              }}
                            />
                            <div className="w-full h-48 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center justify-center bg-white/70 hover:border-purple-400 hover:bg-purple-50 transition-colors">
                              <Upload className="w-6 h-6 text-purple-400 mb-2" />
                              <p className="text-sm text-purple-700 font-medium">Upload {label} Video</p>
                              <p className="text-xs text-purple-500 mt-1 text-center px-4">
                                MP4 / WebM • up to 30 MB
                              </p>
                            </div>
                          </label>
                        )}
                      </div>
                    )
                  })}
                </div>

                <p className="text-xs text-purple-600 mt-4">
                  Tip: Keep videos short (2-4s), muted, and optimized for fast autoplay. Splash screen automatically skips after 1.8 seconds if the video doesn&apos;t load.
                </p>
              </div>
            )}

            {/* Top Media Carousel Settings Panel */}
            {section.id === 'top_media_carousel' && showTopMediaSettings && (
              <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Animation & Design Settings</h4>
                  </div>
                  <button
                    onClick={() => setShowTopMediaSettings(false)}
                    className="p-1 hover:bg-blue-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Animation Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Animation Type
                    </label>
                    <select
                      value={topMediaSettings.animationType}
                      onChange={(e) => setTopMediaSettings({ ...topMediaSettings, animationType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                      <option value="cube">Cube 3D</option>
                      <option value="flip">Flip</option>
                      <option value="coverflow">Coverflow</option>
                      <option value="cards">Cards</option>
                    </select>
                  </div>

                  {/* Design Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Design Style
                    </label>
                    <select
                      value={topMediaSettings.designStyle}
                      onChange={(e) => setTopMediaSettings({ ...topMediaSettings, designStyle: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                      <option value="gradient">Gradient</option>
                      <option value="dark">Dark Theme</option>
                      <option value="colorful">Colorful</option>
                    </select>
                  </div>

                  {/* Transition Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transition Duration: {topMediaSettings.transitionDuration}ms
                    </label>
                    <input
                      type="range"
                      min="300"
                      max="3000"
                      step="100"
                      value={topMediaSettings.transitionDuration}
                      onChange={(e) => setTopMediaSettings({ ...topMediaSettings, transitionDuration: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Fast (300ms)</span>
                      <span>Slow (3000ms)</span>
                    </div>
                  </div>

                  {/* Auto-play Delay */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-play Delay: {topMediaSettings.autoPlayDelay / 1000}s
                    </label>
                    <input
                      type="range"
                      min="2000"
                      max="15000"
                      step="500"
                      value={topMediaSettings.autoPlayDelay}
                      onChange={(e) => setTopMediaSettings({ ...topMediaSettings, autoPlayDelay: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>2s</span>
                      <span>15s</span>
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={topMediaSettings.autoPlay}
                        onChange={(e) => setTopMediaSettings({ ...topMediaSettings, autoPlay: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Auto-play</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={topMediaSettings.showDots}
                        onChange={(e) => setTopMediaSettings({ ...topMediaSettings, showDots: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Navigation Dots</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={topMediaSettings.showArrows}
                        onChange={(e) => setTopMediaSettings({ ...topMediaSettings, showArrows: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Arrow Buttons</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={topMediaSettings.loop}
                        onChange={(e) => setTopMediaSettings({ ...topMediaSettings, loop: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Loop Slides</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const topMediaSection = sections.find(s => s.id === 'top_media_carousel')
                      if (topMediaSection?.settings) {
                        setTopMediaSettings(topMediaSection.settings)
                      }
                      setShowTopMediaSettings(false)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const topMediaSection = sections.find(s => s.id === 'top_media_carousel')
                      if (!topMediaSection) return

                      // Update local state
                      setSections(prev => prev.map(s => 
                        s.id === 'top_media_carousel' ? { ...s, settings: topMediaSettings } : s
                      ))

                      // Save to CMS
                      try {
                        await saveSectionToCMS('top_media_carousel', topMediaSection.images[0] || '', undefined, topMediaSection.images)
                        notify('success', 'Top Media Carousel settings saved successfully')
                        setShowTopMediaSettings(false)
                      } catch (error) {
                        notify('error', 'Failed to save top media carousel settings')
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* Hero Banner Settings Panel */}
            {section.id === 'hero_banner' && showHeroSettings && (
              <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-blue-600" />
                    <h4 className="font-semibold text-blue-900">Animation & Design Settings</h4>
                  </div>
                  <button
                    onClick={() => setShowHeroSettings(false)}
                    className="p-1 hover:bg-blue-200 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Animation Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Animation Type
                    </label>
                    <select
                      value={heroSettings.animationType}
                      onChange={(e) => setHeroSettings({ ...heroSettings, animationType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                      <option value="cube">Cube 3D</option>
                      <option value="flip">Flip</option>
                      <option value="coverflow">Coverflow</option>
                      <option value="cards">Cards</option>
                    </select>
                  </div>

                  {/* Design Style */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Design Style
                    </label>
                    <select
                      value={heroSettings.designStyle}
                      onChange={(e) => setHeroSettings({ ...heroSettings, designStyle: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                      <option value="gradient">Gradient</option>
                      <option value="dark">Dark Theme</option>
                      <option value="colorful">Colorful</option>
                    </select>
                  </div>

                  {/* Transition Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transition Duration: {heroSettings.transitionDuration}ms
                    </label>
                    <input
                      type="range"
                      min="300"
                      max="3000"
                      step="100"
                      value={heroSettings.transitionDuration}
                      onChange={(e) => setHeroSettings({ ...heroSettings, transitionDuration: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Fast (300ms)</span>
                      <span>Slow (3000ms)</span>
                    </div>
                  </div>

                  {/* Auto-play Delay */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-play Delay: {heroSettings.autoPlayDelay / 1000}s
                    </label>
                    <input
                      type="range"
                      min="2000"
                      max="15000"
                      step="500"
                      value={heroSettings.autoPlayDelay}
                      onChange={(e) => setHeroSettings({ ...heroSettings, autoPlayDelay: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>2s</span>
                      <span>15s</span>
                    </div>
                  </div>

                  {/* Toggle Options */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heroSettings.autoPlay}
                        onChange={(e) => setHeroSettings({ ...heroSettings, autoPlay: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Auto-play</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heroSettings.showDots}
                        onChange={(e) => setHeroSettings({ ...heroSettings, showDots: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Navigation Dots</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heroSettings.showArrows}
                        onChange={(e) => setHeroSettings({ ...heroSettings, showArrows: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Show Arrow Buttons</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={heroSettings.loop}
                        onChange={(e) => setHeroSettings({ ...heroSettings, loop: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Loop Slides</span>
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const heroSection = sections.find(s => s.id === 'hero_banner')
                      if (heroSection?.settings) {
                        setHeroSettings(heroSection.settings)
                      }
                      setShowHeroSettings(false)
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveHeroSettings}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Settings
                  </button>
                </div>
              </div>
            )}

            {/* Drop Zone */}
            {section.id !== 'splash_screen' && (
              section.images.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop {(section.id === 'hero_banner' || section.id === 'top_media_carousel') ? 'images or videos' : 'images'} here
                  </p>
                  <p className="text-xs text-gray-500">
                    or click the upload button above
                  </p>
                </div>
              ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.images.map((mediaUrl, index) => {
                  // Improved video detection - check URL extension and also check if it's from uploads without extension
                  const urlLower = mediaUrl.toLowerCase()
                  const hasVideoExt = /\.(mp4|webm|ogg|mov|avi)(\?|$)/i.test(mediaUrl)
                  const isFromUploads = mediaUrl.includes('/uploads/')
                  // If from uploads and no extension, we'll need to check the actual file or rely on MIME type
                  // For now, check if URL contains video-related keywords or check file extension
                  const isVideo = hasVideoExt || (isFromUploads && (
                    urlLower.includes('video') || 
                    urlLower.includes('mp4') || 
                    urlLower.includes('webm') ||
                    urlLower.includes('mov')
                  ))
                  
                  // Get media item metadata for top_media_carousel
                  const mediaItem = section.id === 'top_media_carousel' && section.mediaItems 
                    ? section.mediaItems[index] 
                    : null
                  const timing = mediaItem?.timing || (section.id === 'top_media_carousel' ? topMediaSettings.autoPlayDelay : undefined)
                  const isEditingThisTiming = editingTiming?.sectionId === section.id && editingTiming?.index === index
                  
                  return (
                    <div key={index} className="relative group">
                      {isVideo ? (
                        <video
                          src={mediaUrl}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          controls={false}
                          muted
                          playsInline
                          poster={mediaItem?.thumbnail}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt={`${section.name} ${index + 1}`}
                          className={`w-full object-cover rounded-lg border border-gray-200 ${
                            section.id === 'hero_banner' ? 'h-40' : 'h-32'
                          }`}
                          style={section.id === 'hero_banner' ? { aspectRatio: '5/4' } : {}}
                        />
                      )}
                      
                      {/* Video indicator badge */}
                      {isVideo && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-70 text-white text-xs rounded">
                          Video
                        </div>
                      )}
                      
                      {/* Timing display for top_media_carousel */}
                      {section.id === 'top_media_carousel' && timing && (
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-blue-600 bg-opacity-90 text-white text-xs rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timing / 1000}s
                        </div>
                      )}
                      
                      {!previewMode && (
                        <>
                          <button
                            onClick={() => removeImage(section.id, index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {/* Crop button for images and videos */}
                          <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            {isVideo ? (
                              <>
                                <button
                                  onClick={() => handleVideoCrop(section.id, index)}
                                  className="p-1 bg-green-500 text-white rounded-full"
                                  title="Crop Video"
                                >
                                  <Crop className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleVideoThumbnailCrop(section.id, index)}
                                  className="p-1 bg-blue-500 text-white rounded-full"
                                  title="Crop Video Thumbnail"
                                >
                                  <ImageIcon className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setCropperImage(mediaUrl)
                                  setCropperSectionId(section.id)
                                  setCropperImageIndex(index)
                                  const aspectRatio = getSectionAspectRatio(section.id) || 1
                                  setCropperAspectRatio(aspectRatio)
                                  setPendingFile(null)
                                  setShowCropper(true)
                                }}
                                className="p-1 bg-green-500 text-white rounded-full"
                                title="Crop Image"
                              >
                                <Crop className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {/* Timing button for top_media_carousel */}
                          {section.id === 'top_media_carousel' && (
                            <button
                              onClick={() => {
                                setEditingTiming({ sectionId: section.id, index })
                                setTimingValue(timing || topMediaSettings.autoPlayDelay)
                              }}
                              className="absolute bottom-2 left-2 p-1 bg-purple-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="Set Timing"
                            >
                              <Clock className="w-4 h-4" />
                            </button>
                          )}
                          {/* Upload button - positioned differently for top_media_carousel to avoid overlap */}
                          <label className={`absolute cursor-pointer ${section.id === 'top_media_carousel' ? 'bottom-2 right-2' : 'bottom-2 left-2'}`}>
                            <input
                              type="file"
                              accept={(section.id === 'hero_banner' || section.id === 'top_media_carousel') ? "image/*,video/*" : "image/*"}
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  const isVideo = isVideoFile(file)
                                  // Videos upload directly, images go through size selector
                                  if (isVideo) {
                                    handleUpload(file, section.id, index, true)
                                  } else {
                                    handleUpload(file, section.id, index)
                                  }
                                }
                              }}
                              className="hidden"
                            />
                            <div className="p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                              <Upload className="w-3 h-3" />
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  )
                })}
                
                {section.images.length < section.imageCount && !previewMode && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept={(section.id === 'hero_banner' || section.id === 'top_media_carousel') ? "image/*,video/*" : "image/*"}
                      multiple={section.id === 'hero_banner' || section.id === 'top_media_carousel'}
                      onChange={(e) => handleFileInput(e, section.id)}
                      className="hidden"
                    />
                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-colors">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                  </label>
                )}
              </div>
              )
            )}

            {uploading[section.id] && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center gap-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">How to use:</h3>
        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
          <li>Drag images or videos from your computer directly onto any section</li>
          <li>Or click the upload icon to browse and select files</li>
          <li>Top Media Carousel and Hero Banner support up to 30 images and videos</li>
          <li>Videos should be in MP4, WebM, OGG, MOV, or AVI format (max 100MB)</li>
          <li>Click "Create New Section" to add custom sections to your homepage</li>
          <li>Hover over media to replace or remove them</li>
          <li>Changes are saved automatically to the CMS</li>
          <li>Use Preview Mode to see how it looks without edit controls</li>
        </ul>
      </div>

      {/* Create Section Modal */}
      {showCreateSection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create New Section</h2>
              <button
                onClick={() => {
                  setShowCreateSection(false)
                  setNewSection({ name: '', description: '', sectionType: '', imageCount: 5, type: 'gallery' })
                }}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Featured Products, Special Offers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newSection.description}
                  onChange={(e) => setNewSection({ ...newSection, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Brief description of this section"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section Type (Unique ID) *
                </label>
                <input
                  type="text"
                  value={newSection.sectionType}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                    setNewSection({ ...newSection, sectionType: `custom_${value}` })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="featured-products (will become: custom_featured_products)"
                />
                <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and underscores</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Images/Videos
                </label>
                <input
                  type="number"
                  value={newSection.imageCount}
                  onChange={(e) => setNewSection({ ...newSection, imageCount: parseInt(e.target.value) || 5 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="50"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setShowCreateSection(false)
                    setNewSection({ name: '', description: '', sectionType: '', imageCount: 5, type: 'gallery' })
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newSection.name || !newSection.sectionType) {
                      notify('error', 'Please fill in all required fields')
                      return
                    }

                    try {
                      // Create section in CMS
                      const response = await fetch(`${API_BASE}/cms/sections`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          page_slug: 'home',
                          section_type: newSection.sectionType || `custom_${newSection.name.toLowerCase().replace(/\s+/g, '_')}`,
                          title: newSection.name,
                          content: {
                            title: newSection.name,
                            description: newSection.description,
                            images: []
                          },
                          order_index: sections.length,
                          is_active: true
                        })
                      })

                      if (response.ok) {
                        notify('success', 'Section created successfully')
                        setShowCreateSection(false)
                        setNewSection({ name: '', description: '', sectionType: '', imageCount: 5, type: 'gallery' })
                        await initializeSections()
                      } else {
                        throw new Error('Failed to create section')
                      }
                    } catch (error) {
                      console.error('Failed to create section:', error)
                      notify('error', 'Failed to create section')
                    }
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Create Section
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Size Selector Modal */}
      {showSizeSelector && pendingUpload && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Choose Image Size</h3>
                {(() => {
                  const section = sections.find(s => s.id === pendingUpload.sectionId)
                  const recommendedRatio = getSectionAspectRatio(pendingUpload.sectionId)
                  if (recommendedRatio) {
                    const ratioName = recommendedRatio === 5/4 ? '5:4' : recommendedRatio === 16/9 ? '16:9' : recommendedRatio === 4/3 ? '4:3' : recommendedRatio === 4/5 ? '4:5' : '1:1'
                    return <p className="text-sm text-gray-500 mt-1">Recommended for {section?.name}: {ratioName}</p>
                  }
                  return null
                })()}
              </div>
              <button
                onClick={() => {
                  setShowSizeSelector(false)
                  setPendingUpload(null)
                  setSelectedSize(null)
                }}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => handleSizeSelect(null)}
                className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
              >
                <div className="font-medium">Free (No Crop)</div>
                <div className="text-sm text-gray-500">Upload image as-is without cropping</div>
              </button>
              
              {(() => {
                const recommendedRatio = getSectionAspectRatio(pendingUpload.sectionId)
                const sizes = [
                  { name: 'Square (1:1)', ratio: 1, desc: 'Perfect for profile images and thumbnails' },
                  { name: 'Landscape (16:9)', ratio: 16/9, desc: 'Widescreen format for banners' },
                  { name: 'Portrait (4:5)', ratio: 4/5, desc: 'Vertical format for mobile' },
                  { name: 'Hero Banner (5:4)', ratio: 5/4, desc: 'Standard hero banner format' },
                  { name: 'Standard (4:3)', ratio: 4/3, desc: 'Classic photo format' },
                ]
                
                return sizes.map((size) => {
                  const isRecommended = recommendedRatio && Math.abs(size.ratio - recommendedRatio) < 0.01
                  return (
                    <button
                      key={size.name}
                      onClick={() => handleSizeSelect(size)}
                      className={`w-full px-4 py-3 text-left border rounded-lg transition-colors ${
                        isRecommended 
                          ? 'border-blue-500 bg-blue-50 hover:bg-blue-100' 
                          : 'border-gray-300 hover:bg-blue-50 hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{size.name}</span>
                        {isRecommended && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Recommended</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{size.desc}</div>
                    </button>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && cropperImage && (
        <ImageCropper
          imageUrl={cropperImage}
          aspectRatio={cropperAspectRatio}
          onCrop={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}

      {/* Video Cropper Modal */}
      {showVideoCropper && cropperVideo && (
        <VideoCropper
          videoUrl={cropperVideo}
          aspectRatio={cropperAspectRatio}
          onCrop={handleVideoCropComplete}
          onCancel={handleVideoCropCancel}
        />
      )}

      {/* Timing Editor Modal */}
      {editingTiming && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Set Media Timing</h3>
              <button
                onClick={() => {
                  setEditingTiming(null)
                  setTimingValue(7000)
                }}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Duration: {(timingValue / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min="1000"
                  max="30000"
                  step="500"
                  value={timingValue}
                  onChange={(e) => setTimingValue(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1s</span>
                  <span>30s</span>
                </div>
              </div>
              
              <div className="flex gap-2 justify-end pt-4">
                <button
                  onClick={() => {
                    setEditingTiming(null)
                    setTimingValue(7000)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (editingTiming) {
                      await updateMediaTiming(editingTiming.sectionId, editingTiming.index, timingValue)
                      setEditingTiming(null)
                      setTimingValue(7000)
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Timing
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

