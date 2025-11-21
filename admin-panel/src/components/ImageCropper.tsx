import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

interface ImageCropperProps {
  imageUrl: string
  aspectRatio: number // e.g., 5/4 = 1.25
  onCrop: (croppedImageBlob: Blob) => void
  onCancel: () => void
}

export default function ImageCropper({ imageUrl, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const img = new Image()
    // Set crossOrigin for CORS
    img.crossOrigin = 'anonymous'
    
    img.onerror = (error) => {
      console.error('Error loading image:', error)
      // Try without crossOrigin if CORS fails
      const imgRetry = new Image()
      imgRetry.onload = () => {
        setImageSize({ width: imgRetry.width, height: imgRetry.height })
        
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 40
          const containerHeight = containerRef.current.clientHeight - 40
          
          const scaleX = containerWidth / imgRetry.width
          const scaleY = containerHeight / imgRetry.height
          const scale = Math.min(scaleX, scaleY, 1) // Don't scale up
          
          setDisplaySize({
            width: imgRetry.width * scale,
            height: imgRetry.height * scale
          })
          
          // Calculate initial crop to match aspect ratio (centered)
          const cropWidth = Math.min(imgRetry.width, imgRetry.height * aspectRatio)
          const cropHeight = cropWidth / aspectRatio
          
          setCrop({
            x: (imgRetry.width - cropWidth) / 2,
            y: (imgRetry.height - cropHeight) / 2,
            width: cropWidth,
            height: cropHeight
          })
        }
      }
      imgRetry.onerror = () => {
        console.error('Failed to load image even without CORS')
      }
      imgRetry.src = imageUrl
    }
    
    img.onload = () => {
      setImageSize({ width: img.width, height: img.height })
      
      // Calculate display size to fit in container
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40
        const containerHeight = containerRef.current.clientHeight - 40
        
        const scaleX = containerWidth / img.width
        const scaleY = containerHeight / img.height
        const scale = Math.min(scaleX, scaleY, 1) // Don't scale up
        
        setDisplaySize({
          width: img.width * scale,
          height: img.height * scale
        })
        
        // Calculate initial crop to match aspect ratio (centered)
        const cropWidth = Math.min(img.width, img.height * aspectRatio)
        const cropHeight = cropWidth / aspectRatio
        
        setCrop({
          x: (img.width - cropWidth) / 2,
          y: (img.height - cropHeight) / 2,
          width: cropWidth,
          height: cropHeight
        })
      }
    }
    img.src = imageUrl
  }, [imageUrl, aspectRatio])

  const getDisplayCrop = () => {
    if (!imageSize.width || !displaySize.width) return { x: 0, y: 0, width: 0, height: 0 }
    const scale = displaySize.width / imageSize.width
    return {
      x: crop.x * scale,
      y: crop.y * scale,
      width: crop.width * scale,
      height: crop.height * scale
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    const target = e.target as HTMLElement
    if (target.classList.contains('resize-handle')) {
      const handle = target.getAttribute('data-handle')
      if (handle) {
        setResizeHandle(handle)
        setIsDragging(true)
        const rect = containerRef.current.getBoundingClientRect()
        const scale = displaySize.width / imageSize.width
        const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
        const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
        setDragStart({ x, y })
      }
      return
    }
    
    const rect = containerRef.current.getBoundingClientRect()
    const displayCrop = getDisplayCrop()
    const scale = displaySize.width / imageSize.width
    
    const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
    const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
    
    // Check if click is inside crop area
    if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
      setIsDragging(true)
      setDragStart({ x: x - crop.x, y: y - crop.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const scale = displaySize.width / imageSize.width
    const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
    const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
    
    if (resizeHandle) {
      // Handle resize while maintaining aspect ratio
      let newCrop = { ...crop }
      
      if (resizeHandle === 'se') {
        const width = x - crop.x
        const height = width / aspectRatio
        newCrop = {
          x: crop.x,
          y: crop.y,
          width: Math.min(width, imageSize.width - crop.x),
          height: Math.min(height, imageSize.height - crop.y)
        }
        if (newCrop.y + newCrop.height > imageSize.height) {
          newCrop.height = imageSize.height - newCrop.y
          newCrop.width = newCrop.height * aspectRatio
        }
        if (newCrop.x + newCrop.width > imageSize.width) {
          newCrop.width = imageSize.width - newCrop.x
          newCrop.height = newCrop.width / aspectRatio
        }
      } else if (resizeHandle === 'sw') {
        const width = (crop.x + crop.width) - x
        const height = width / aspectRatio
        newCrop = {
          x: Math.max(0, x),
          y: crop.y,
          width: Math.min(width, crop.x + crop.width),
          height: Math.min(height, imageSize.height - crop.y)
        }
        if (newCrop.y + newCrop.height > imageSize.height) {
          newCrop.height = imageSize.height - newCrop.y
          newCrop.width = newCrop.height * aspectRatio
          newCrop.x = (crop.x + crop.width) - newCrop.width
        }
      } else if (resizeHandle === 'ne') {
        const width = x - crop.x
        const height = width / aspectRatio
        newCrop = {
          x: crop.x,
          y: Math.max(0, (crop.y + crop.height) - height),
          width: Math.min(width, imageSize.width - crop.x),
          height: Math.min(height, crop.y + crop.height)
        }
        if (newCrop.y < 0) {
          newCrop.y = 0
          newCrop.height = crop.y + crop.height
          newCrop.width = newCrop.height * aspectRatio
        }
      } else if (resizeHandle === 'nw') {
        const width = (crop.x + crop.width) - x
        const height = width / aspectRatio
        newCrop = {
          x: Math.max(0, x),
          y: Math.max(0, (crop.y + crop.height) - height),
          width: Math.min(width, crop.x + crop.width),
          height: Math.min(height, crop.y + crop.height)
        }
        if (newCrop.y < 0) {
          newCrop.y = 0
          newCrop.height = crop.y + crop.height
          newCrop.width = newCrop.height * aspectRatio
          newCrop.x = (crop.x + crop.width) - newCrop.width
        }
        if (newCrop.x < 0) {
          newCrop.x = 0
          newCrop.width = crop.x + crop.width
          newCrop.height = newCrop.width / aspectRatio
          newCrop.y = (crop.y + crop.height) - newCrop.height
        }
      }
      
      setCrop(newCrop)
    } else {
      // Handle drag
      const newX = Math.max(0, Math.min(x - dragStart.x, imageSize.width - crop.width))
      const newY = Math.max(0, Math.min(y - dragStart.y, imageSize.height - crop.height))
      
      setCrop(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setResizeHandle(null)
  }

  const handleCrop = () => {
    // Validate crop dimensions
    if (!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0) {
      console.error('Invalid crop dimensions:', crop)
      alert('Please wait for the image to load completely before cropping.')
      return
    }
    
    if (!imageSize.width || !imageSize.height) {
      console.error('Image size not loaded yet')
      alert('Please wait for the image to load completely before cropping.')
      return
    }
    
    const img = new Image()
    // Set crossOrigin for CORS
    img.crossOrigin = 'anonymous'
    
    img.onerror = (error) => {
      console.error('Error loading image for cropping:', error)
      // Try without crossOrigin if CORS fails
      const imgRetry = new Image()
      imgRetry.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            console.error('Failed to get canvas context')
            return
          }
          
          canvas.width = crop.width
          canvas.height = crop.height
          
          ctx.drawImage(
            imgRetry,
            crop.x, crop.y, crop.width, crop.height,
            0, 0, crop.width, crop.height
          )
          
          canvas.toBlob((blob) => {
            if (blob) {
              onCrop(blob)
            } else {
              console.error('Failed to create blob from canvas')
              alert('Failed to crop image. Please try again.')
            }
          }, 'image/jpeg', 0.95)
        } catch (err) {
          console.error('Error during crop:', err)
          alert('Failed to crop image. Please try again.')
        }
      }
      imgRetry.onerror = () => {
        console.error('Failed to load image even without CORS')
        alert('Failed to load image for cropping. Please try again.')
      }
      imgRetry.src = imageUrl
    }
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          console.error('Failed to get canvas context')
          return
        }
        
        // Set canvas to exact crop size
        canvas.width = crop.width
        canvas.height = crop.height
        
        // Draw cropped portion
        ctx.drawImage(
          img,
          crop.x, crop.y, crop.width, crop.height,
          0, 0, crop.width, crop.height
        )
        
        canvas.toBlob((blob) => {
          if (blob) {
            onCrop(blob)
          } else {
            console.error('Failed to create blob from canvas')
            alert('Failed to crop image. Please try again.')
          }
        }, 'image/jpeg', 0.95)
      } catch (err) {
        console.error('Error during crop:', err)
        alert('Failed to crop image. Please try again.')
      }
    }
    img.src = imageUrl
  }

  const displayCrop = getDisplayCrop()
  const containerWidth = containerRef.current?.clientWidth || 800
  const containerHeight = containerRef.current?.clientHeight || 600
  const offsetX = (containerWidth - displaySize.width) / 2
  const offsetY = (containerHeight - displaySize.height) / 2

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Crop Image ({aspectRatio === 1 ? '1:1' : aspectRatio === 16/9 ? '16:9' : aspectRatio === 4/5 ? '4:5' : aspectRatio === 5/4 ? '5:4' : aspectRatio === 4/3 ? '4:3' : aspectRatio.toFixed(2) + ':1'} Aspect Ratio)</h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div 
          ref={containerRef}
          className="relative flex-1 overflow-hidden bg-gray-100 flex items-center justify-center"
          style={{ minHeight: '400px', maxHeight: '70vh' }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop"
            className="max-w-full max-h-full"
            style={{ 
              width: `${displaySize.width}px`,
              height: `${displaySize.height}px`,
              objectFit: 'contain'
            }}
            draggable={false}
          />
          
          {/* Crop Overlay */}
          {displayCrop.width > 0 && (
            <>
              <div
                className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move"
                style={{
                  left: `${offsetX + displayCrop.x}px`,
                  top: `${offsetY + displayCrop.y}px`,
                  width: `${displayCrop.width}px`,
                  height: `${displayCrop.height}px`,
                }}
                onMouseDown={handleMouseDown}
              >
                {/* Corner Handles */}
                <div 
                  className="absolute -top-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-nw-resize resize-handle" 
                  data-handle="nw"
                />
                <div 
                  className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-ne-resize resize-handle" 
                  data-handle="ne"
                />
                <div 
                  className="absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-sw-resize resize-handle" 
                  data-handle="sw"
                />
                <div 
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded cursor-se-resize resize-handle" 
                  data-handle="se"
                />
              </div>
              
              {/* Dark Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <mask id="crop-mask">
                      <rect width="100%" height="100%" fill="black" />
                      <rect
                        x={offsetX + displayCrop.x}
                        y={offsetY + displayCrop.y}
                        width={displayCrop.width}
                        height={displayCrop.height}
                        fill="white"
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="black" fillOpacity="0.5" mask="url(#crop-mask)" />
                </svg>
              </div>
            </>
          )}
        </div>
        
        <div className="p-4 border-t flex items-center justify-between relative z-10 bg-white">
          <div className="text-sm text-gray-600">
            Drag to move • Aspect ratio locked to {aspectRatio === 1 ? '1:1' : aspectRatio === 16/9 ? '16:9' : aspectRatio === 4/5 ? '4:5' : aspectRatio === 5/4 ? '5:4' : aspectRatio === 4/3 ? '4:3' : aspectRatio.toFixed(2) + ':1'}
          </div>
          <div className="flex gap-2 relative z-10">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onCancel()
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleCrop()
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 cursor-pointer"
              type="button"
              disabled={!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0}
            >
              <Check className="w-4 h-4" />
              Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

