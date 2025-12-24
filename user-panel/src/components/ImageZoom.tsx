import React, { useState, useEffect, useRef } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageZoomProps {
  images: string[]
  currentIndex: number
  onClose: () => void
  onIndexChange?: (index: number) => void
}

export default function ImageZoom({ 
  images, 
  currentIndex, 
  onClose,
  onIndexChange 
}: ImageZoomProps) {
  const [activeIndex, setActiveIndex] = useState(currentIndex)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isZooming, setIsZooming] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [thumbnailScrollIndex, setThumbnailScrollIndex] = useState(0)
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setActiveIndex(currentIndex)
    // Update thumbnail scroll to show current image
    if (images.length > 3) {
      const imagesToShow = 3
      const maxScrollIndex = Math.max(0, images.length - imagesToShow)
      let newScrollIndex = currentIndex
      if (currentIndex > maxScrollIndex) {
        newScrollIndex = maxScrollIndex
      } else if (currentIndex < thumbnailScrollIndex) {
        newScrollIndex = Math.max(0, currentIndex)
      } else if (currentIndex >= thumbnailScrollIndex + imagesToShow) {
        newScrollIndex = currentIndex - imagesToShow + 1
      }
      setThumbnailScrollIndex(newScrollIndex)
    }
  }, [currentIndex, images.length])

  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(activeIndex)
    }
  }, [activeIndex, onIndexChange])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevious()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [])

  const handlePrevious = () => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
    setZoomLevel(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleImageZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomLevel === 1) {
      setZoomLevel(2.5)
      setIsZooming(true)
    } else {
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
      setIsZooming(false)
    }
  }

  const handleImageMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoomLevel > 1 && imageRef.current && containerRef.current) {
      const rect = imageRef.current.getBoundingClientRect()
      const containerRect = containerRef.current.getBoundingClientRect()
      
      // Calculate mouse position relative to image
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Calculate percentage position (0 to 1)
      const percentX = mouseX / rect.width
      const percentY = mouseY / rect.height
      
      // Calculate zoomed image dimensions
      const zoomedWidth = rect.width * zoomLevel
      const zoomedHeight = rect.height * zoomLevel
      
      // Calculate offset to center the zoomed area under cursor
      const offsetX = (percentX - 0.5) * (zoomedWidth - rect.width)
      const offsetY = (percentY - 0.5) * (zoomedHeight - rect.height)
      
      // Clamp to boundaries
      const maxOffsetX = (zoomedWidth - rect.width) / 2
      const maxOffsetY = (zoomedHeight - rect.height) / 2
      
      setPosition({ 
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, offsetX)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, offsetY))
      })
    }
  }

  const handleMouseLeave = () => {
    if (zoomLevel > 1) {
      setZoomLevel(1)
      setPosition({ x: 0, y: 0 })
      setIsZooming(false)
    }
  }

  if (!images || images.length === 0) return null

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrevious}
            className="absolute left-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Image */}
        <div 
          ref={containerRef}
          className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden"
          onMouseLeave={handleMouseLeave}
        >
          <img
            ref={imageRef}
            src={images[activeIndex]}
            alt={`Product image ${activeIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain cursor-zoom-in select-none"
            style={{
              transform: `scale(${zoomLevel}) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'center center',
              transition: zoomLevel === 1 ? 'transform 0.2s ease-out' : 'none',
              willChange: zoomLevel > 1 ? 'transform' : 'auto'
            }}
            onClick={handleImageZoom}
            onMouseMove={handleImageMove}
            draggable={false}
          />
          {isZooming && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm">
              Click to zoom out
            </div>
          )}
        </div>

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-4 z-50 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
            aria-label="Next image"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}

        {/* Thumbnails - 1x3 Carousel Style */}
        {images.length > 1 && (() => {
          const imagesToShow = 3
          const thumbnailSize = 100
          const thumbnailGap = 12
          const containerWidth = (thumbnailSize * imagesToShow) + (thumbnailGap * (imagesToShow - 1))
          const maxScrollIndex = Math.max(0, images.length - imagesToShow)
          const canScrollLeft = thumbnailScrollIndex > 0
          const canScrollRight = thumbnailScrollIndex < maxScrollIndex

          const handleThumbnailScroll = (direction: 'left' | 'right') => {
            if (direction === 'left' && canScrollLeft) {
              const newIndex = Math.max(0, thumbnailScrollIndex - 1)
              setThumbnailScrollIndex(newIndex)
              if (thumbnailContainerRef.current) {
                const container = thumbnailContainerRef.current
                const scrollPosition = newIndex * (thumbnailSize + thumbnailGap)
                container.scrollTo({
                  left: scrollPosition,
                  behavior: 'smooth'
                })
              }
            } else if (direction === 'right' && canScrollRight) {
              const newIndex = Math.min(maxScrollIndex, thumbnailScrollIndex + 1)
              setThumbnailScrollIndex(newIndex)
              if (thumbnailContainerRef.current) {
                const container = thumbnailContainerRef.current
                const scrollPosition = newIndex * (thumbnailSize + thumbnailGap)
                container.scrollTo({
                  left: scrollPosition,
                  behavior: 'smooth'
                })
              }
            }
          }

          return (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-full max-w-md px-4">
              <div className="relative">
                {/* Left Arrow */}
                {images.length > imagesToShow && canScrollLeft && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleThumbnailScroll('left')
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-all"
                    aria-label="Previous thumbnails"
                  >
                    <ChevronLeft className="w-4 h-4" style={{color: 'rgb(75,151,201)'}} />
                  </button>
                )}

                {/* Thumbnail Container */}
                <div
                  ref={thumbnailContainerRef}
                  className="overflow-hidden mx-auto"
                  style={{ 
                    width: `${containerWidth}px`,
                    maxWidth: '100%'
                  }}
                >
                  <div
                    className="flex gap-3 transition-transform duration-300"
                    style={{
                      transform: `translateX(-${thumbnailScrollIndex * (thumbnailSize + thumbnailGap)}px)`,
                      width: `${images.length * (thumbnailSize + thumbnailGap) - thumbnailGap}px`
                    }}
                  >
                    {images.map((img, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveIndex(index)
                          setZoomLevel(1)
                          setPosition({ x: 0, y: 0 })
                          if (onIndexChange) {
                            onIndexChange(index)
                          }
                        }}
                        className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                          activeIndex === index 
                            ? 'border-white scale-110 shadow-lg' 
                            : 'border-white/30 opacity-70 hover:opacity-100 hover:border-white/60'
                        }`}
                        style={{
                          width: `${thumbnailSize}px`,
                          height: `${thumbnailSize}px`
                        }}
                      >
                        <img
                          src={img}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Arrow */}
                {images.length > imagesToShow && canScrollRight && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleThumbnailScroll('right')
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-lg transition-all"
                    aria-label="Next thumbnails"
                  >
                    <ChevronRight className="w-4 h-4" style={{color: 'rgb(75,151,201)'}} />
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white bg-black/50 rounded-full px-4 py-2 text-sm">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>
    </div>
  )
}

