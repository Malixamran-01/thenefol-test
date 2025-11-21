import { useState, useRef, useEffect } from 'react'
import { X, Check, Play, Pause, RotateCcw } from 'lucide-react'

interface VideoCropperProps {
  videoUrl: string
  aspectRatio?: number
  onCrop: (croppedVideoBlob: Blob) => void
  onCancel: () => void
}

export default function VideoCropper({ videoUrl, aspectRatio = 16/9, onCrop, onCancel }: VideoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [videoSize, setVideoSize] = useState({ width: 0, height: 0 })
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 })
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setVideoSize({ width: video.videoWidth, height: video.videoHeight })
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40
        const containerHeight = containerRef.current.clientHeight - 40
        
        const scaleX = containerWidth / video.videoWidth
        const scaleY = containerHeight / video.videoHeight
        const scale = Math.min(scaleX, scaleY, 1)
        
        setDisplaySize({
          width: video.videoWidth * scale,
          height: video.videoHeight * scale
        })
        
        // Calculate initial crop to match aspect ratio (centered)
        const cropWidth = Math.min(video.videoWidth, video.videoHeight * aspectRatio)
        const cropHeight = cropWidth / aspectRatio
        
        setCrop({
          x: (video.videoWidth - cropWidth) / 2,
          y: (video.videoHeight - cropHeight) / 2,
          width: cropWidth,
          height: cropHeight
        })
      }
    }

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.load()

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [videoUrl, aspectRatio])

  const getDisplayCrop = () => {
    if (!videoSize.width || !displaySize.width) return { x: 0, y: 0, width: 0, height: 0 }
    const scale = displaySize.width / videoSize.width
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
        const scale = displaySize.width / videoSize.width
        const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
        const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
        setDragStart({ x, y })
      }
      return
    }
    
    const rect = containerRef.current.getBoundingClientRect()
    const displayCrop = getDisplayCrop()
    const scale = displaySize.width / videoSize.width
    
    const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
    const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
    
    if (x >= crop.x && x <= crop.x + crop.width && y >= crop.y && y <= crop.y + crop.height) {
      setIsDragging(true)
      setDragStart({ x: x - crop.x, y: y - crop.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const scale = displaySize.width / videoSize.width
    const x = (e.clientX - rect.left - (rect.width - displaySize.width) / 2) / scale
    const y = (e.clientY - rect.top - (rect.height - displaySize.height) / 2) / scale
    
    if (resizeHandle) {
      let newCrop = { ...crop }
      
      if (resizeHandle === 'se') {
        const width = x - crop.x
        const height = width / aspectRatio
        newCrop = {
          x: crop.x,
          y: crop.y,
          width: Math.min(width, videoSize.width - crop.x),
          height: Math.min(height, videoSize.height - crop.y)
        }
        if (newCrop.y + newCrop.height > videoSize.height) {
          newCrop.height = videoSize.height - newCrop.y
          newCrop.width = newCrop.height * aspectRatio
        }
        if (newCrop.x + newCrop.width > videoSize.width) {
          newCrop.width = videoSize.width - newCrop.x
          newCrop.height = newCrop.width / aspectRatio
        }
      } else if (resizeHandle === 'sw') {
        const width = (crop.x + crop.width) - x
        const height = width / aspectRatio
        newCrop = {
          x: Math.max(0, x),
          y: crop.y,
          width: Math.min(width, crop.x + crop.width),
          height: Math.min(height, videoSize.height - crop.y)
        }
        if (newCrop.y + newCrop.height > videoSize.height) {
          newCrop.height = videoSize.height - newCrop.y
          newCrop.width = newCrop.height * aspectRatio
          newCrop.x = (crop.x + crop.width) - newCrop.width
        }
      } else if (resizeHandle === 'ne') {
        const width = x - crop.x
        const height = width / aspectRatio
        newCrop = {
          x: crop.x,
          y: Math.max(0, (crop.y + crop.height) - height),
          width: Math.min(width, videoSize.width - crop.x),
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
      const newX = Math.max(0, Math.min(x - dragStart.x, videoSize.width - crop.width))
      const newY = Math.max(0, Math.min(y - dragStart.y, videoSize.height - crop.height))
      
      setCrop(prev => ({ ...prev, x: newX, y: newY }))
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setResizeHandle(null)
  }

  const togglePlayPause = () => {
    const video = videoRef.current
    if (!video) return
    
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handleCrop = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    if (!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0) {
      alert('Please wait for the video to load completely before cropping.')
      return
    }

    setIsProcessing(true)
    setProgress(0)

    try {
      // Set canvas size to crop dimensions
      canvas.width = crop.width
      canvas.height = crop.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      // Reset video to start
      video.currentTime = 0
      await new Promise(resolve => {
        video.onseeked = resolve
      })

      // Get video duration
      const duration = video.duration
      const fps = 30 // Target FPS
      const frameInterval = 1 / fps

      // Create MediaRecorder
      const stream = canvas.captureStream(fps)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      })

      chunksRef.current = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        onCrop(blob)
        setIsProcessing(false)
        setProgress(0)
      }

      // Start recording
      mediaRecorder.start()

      // Process video frame by frame
      let currentTime = 0
      const processFrame = async () => {
        if (currentTime >= duration) {
          mediaRecorder.stop()
          return
        }

        video.currentTime = currentTime
        await new Promise(resolve => {
          video.onseeked = resolve
        })

        // Draw cropped portion to canvas
        ctx.drawImage(
          video,
          crop.x, crop.y, crop.width, crop.height,
          0, 0, crop.width, crop.height
        )

        // Update progress
        const progressPercent = (currentTime / duration) * 100
        setProgress(progressPercent)

        currentTime += frameInterval
        requestAnimationFrame(processFrame)
      }

      await processFrame()
    } catch (error: any) {
      console.error('Error during video crop:', error)
      alert('Failed to crop video. Please try again.')
      setIsProcessing(false)
      setProgress(0)
    }
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
          <h3 className="text-lg font-semibold">
            Crop Video ({aspectRatio === 1 ? '1:1' : aspectRatio === 16/9 ? '16:9' : aspectRatio === 4/5 ? '4:5' : aspectRatio === 5/4 ? '5:4' : aspectRatio === 4/3 ? '4:3' : aspectRatio.toFixed(2) + ':1'} Aspect Ratio)
          </h3>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            disabled={isProcessing}
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
          onMouseDown={handleMouseDown}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full"
            style={{ 
              width: `${displaySize.width}px`,
              height: `${displaySize.height}px`,
              objectFit: 'contain'
            }}
            muted
            playsInline
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
                    <mask id="video-crop-mask">
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
                  <rect width="100%" height="100%" fill="black" fillOpacity="0.5" mask="url(#video-crop-mask)" />
                </svg>
              </div>
            </>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="p-4 border-t bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin">
                <RotateCcw className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm text-blue-600">Processing video... {Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="p-4 border-t flex items-center justify-between relative z-10 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-gray-100 rounded transition-colors"
              disabled={isProcessing}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <div className="text-sm text-gray-600">
              Drag to move • Aspect ratio locked to {aspectRatio === 1 ? '1:1' : aspectRatio === 16/9 ? '16:9' : aspectRatio === 4/5 ? '4:5' : aspectRatio === 5/4 ? '5:4' : aspectRatio === 4/3 ? '4:3' : aspectRatio.toFixed(2) + ':1'}
            </div>
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
              disabled={isProcessing}
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
              disabled={!crop.width || !crop.height || crop.width <= 0 || crop.height <= 0 || isProcessing}
            >
              <Check className="w-4 h-4" />
              {isProcessing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

