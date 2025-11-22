import React, { useState, useEffect } from 'react'
import ImageCropper from './ImageCropper'
import { Crop, Settings, Save } from 'lucide-react'

interface Video {
  id: number
  title: string
  description: string
  video_url: string
  redirect_url: string
  views: number
  likes: number
  price: string
  size: 'small' | 'medium' | 'large'
  thumbnail_url: string
  is_active: boolean
  video_type: 'local' | 'instagram' | 'facebook' | 'youtube' | 'url'
  created_at: string
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://thenefol.com/api'

const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showCropper, setShowCropper] = useState(false)
  const [croppingVideo, setCroppingVideo] = useState<Video | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [carouselSettings, setCarouselSettings] = useState({
    autoAdvanceInterval: 3000, // milliseconds - time between video changes
    videoPlayDuration: 3000, // milliseconds - how long each video plays
    animationDuration: 700, // milliseconds
    animationEasing: 'ease-in-out', // CSS easing
    autoPlay: true,
    radius: 500, // 3D circle radius
    blurAmount: 12, // max blur for side videos
    minOpacity: 0.6, // minimum opacity for side videos
    minScale: 0.85 // minimum scale for side videos
  })
  const [savingSettings, setSavingSettings] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    redirect_url: '',
    price: '',
    size: 'medium' as 'small' | 'medium' | 'large',
    thumbnail_url: '',
    is_active: true,
    video_type: 'local' as 'local' | 'instagram' | 'facebook' | 'youtube' | 'url'
  })

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null)

  const uploadFile = async (file: File, type: 'video' | 'thumbnail'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error('Upload failed')
    }

    const data = await response.json()
    return data.filename
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'thumbnail') => {
    const file = e.target.files?.[0]
    if (file) {
      if (type === 'video') {
        setSelectedFile(file)
        // Auto-generate thumbnail from video if no thumbnail selected
        if (!selectedThumbnail) {
          const video = document.createElement('video')
          video.src = URL.createObjectURL(file)
          video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas')
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (ctx) {
              ctx.drawImage(video, 0, 0)
              canvas.toBlob((blob) => {
                if (blob) {
                  const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
                  setSelectedThumbnail(thumbnailFile)
                }
              }, 'image/jpeg')
            }
          }
        }
      } else {
        setSelectedThumbnail(file)
      }
    }
  }

  const getVideoTypeFromUrl = (url: string): 'local' | 'instagram' | 'facebook' | 'youtube' | 'url' => {
    if (url.includes('instagram.com')) return 'instagram'
    if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook'
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube'
    if (url.startsWith('/') || url.includes('localhost')) return 'local'
    return 'url'
  }

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/videos`)
      if (response.ok) {
        const data = await response.json()
        setVideos(data)
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    }
  }

  useEffect(() => {
    fetchVideos()
    loadCarouselSettings()
  }, [])

  const loadCarouselSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/carousel-settings`)
      if (response.ok) {
        const data = await response.json()
        if (data && data.length > 0) {
          setCarouselSettings(data[0].settings || carouselSettings)
        }
      }
    } catch (error) {
      console.error('Failed to load carousel settings:', error)
      // Try loading from localStorage as fallback
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

  const saveCarouselSettings = async () => {
    setSavingSettings(true)
    try {
      // Save to database
      const response = await fetch(`${API_BASE}/api/carousel-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: carouselSettings })
      })

      if (response.ok) {
        // Also save to localStorage as backup
        localStorage.setItem('carousel-settings', JSON.stringify(carouselSettings))
        alert('Carousel settings saved successfully!')
        setShowSettings(false)
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      // Fallback to localStorage
      localStorage.setItem('carousel-settings', JSON.stringify(carouselSettings))
      alert('Settings saved to local storage!')
      setShowSettings(false)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.title.trim()) {
      alert('Please enter a title')
      return
    }
    if (!formData.description.trim()) {
      alert('Please enter a description')
      return
    }
    if (!formData.price.trim()) {
      alert('Please enter a price')
      return
    }
    if (!formData.redirect_url.trim()) {
      alert('Please enter a redirect URL')
      return
    }
    
    // Video URL validation based on type
    if (formData.video_type === 'local' && !selectedFile) {
      alert('Please select a video file for local upload')
      return
    }
    if (formData.video_type !== 'local' && !formData.video_url.trim()) {
      alert('Please enter a video URL')
      return
    }
    
    setLoading(true)
    setUploadingFile(true)

    try {
      let videoUrl = formData.video_url
      let thumbnailUrl = formData.thumbnail_url

      // Upload files if selected
      if (selectedFile) {
        videoUrl = await uploadFile(selectedFile, 'video')
      }
      if (selectedThumbnail) {
        thumbnailUrl = await uploadFile(selectedThumbnail, 'thumbnail')
      }

      // Ensure video_url is not null
      if (!videoUrl && formData.video_type === 'local') {
        videoUrl = 'local-upload-pending'
      }

      // Auto-detect video type if not local
      const videoType = selectedFile ? 'local' : getVideoTypeFromUrl(formData.video_url)

      const url = editingVideo 
        ? `${API_BASE}/api/videos/${editingVideo.id}`
        : `${API_BASE}/api/videos`
      
      const method = editingVideo ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          video_url: videoUrl || formData.video_url,
          thumbnail_url: thumbnailUrl || formData.thumbnail_url,
          video_type: videoType
        })
      })

      if (response.ok) {
        await fetchVideos()
        setShowAddModal(false)
        setEditingVideo(null)
        setSelectedFile(null)
        setSelectedThumbnail(null)
        setFormData({
          title: '',
          description: '',
          video_url: '',
          redirect_url: '',
          price: '',
          size: 'medium',
          thumbnail_url: '',
          is_active: true,
          video_type: 'local'
        })
      } else {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        alert(`Failed to save video: ${errorData.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to save video:', error)
      alert('Failed to save video. Please try again.')
    } finally {
      setLoading(false)
      setUploadingFile(false)
    }
  }

  const handleEdit = (video: Video) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description,
      video_url: video.video_url,
      redirect_url: video.redirect_url,
      price: video.price,
      size: video.size,
      thumbnail_url: video.thumbnail_url,
      is_active: video.is_active,
      video_type: video.video_type
    })
    setShowAddModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this video?')) return

    try {
      const response = await fetch(`${API_BASE}/api/videos/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchVideos()
      }
    } catch (error) {
      console.error('Failed to delete video:', error)
    }
  }

  const toggleActive = async (video: Video) => {
    try {
      const response = await fetch(`${API_BASE}/api/videos/${video.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !video.is_active })
      })

      if (response.ok) {
        await fetchVideos()
      } else {
        const errorText = await response.text()
        console.error('Failed to toggle video status:', errorText)
      }
    } catch (error) {
      console.error('Failed to toggle video status:', error)
    }
  }

  const handleCropThumbnail = (video: Video) => {
    if (!video.thumbnail_url) {
      alert('No thumbnail available to crop. Please upload a thumbnail first.')
      return
    }
    setCroppingVideo(video)
    setShowCropper(true)
  }

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    if (!croppingVideo) return

    try {
      // Upload cropped thumbnail
      const formData = new FormData()
      formData.append('file', croppedImageBlob, 'cropped-thumbnail.jpg')
      formData.append('type', 'thumbnail')

      const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Upload error:', errorText)
        throw new Error('Upload failed')
      }

      const uploadData = await uploadResponse.json()
      const newThumbnailUrl = uploadData.filename

      // Update video with new thumbnail - only send updatable fields
      const updateResponse = await fetch(`${API_BASE}/api/videos/${croppingVideo.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          thumbnail_url: newThumbnailUrl 
        })
      })

      if (updateResponse.ok) {
        await fetchVideos()
        setShowCropper(false)
        setCroppingVideo(null)
        alert('Thumbnail cropped and updated successfully!')
      } else {
        const errorText = await updateResponse.text()
        console.error('Update error:', errorText)
        throw new Error(`Failed to update video: ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to crop thumbnail:', error)
      alert('Failed to crop thumbnail. Please try again.')
    }
  }

  const getVideoUrl = (video: Video): string => {
    if (video.video_type === 'local') {
      const apiHost = import.meta.env.VITE_BACKEND_HOST || 'thenefol.com'
      const apiPort = import.meta.env.VITE_BACKEND_PORT || '2000'
      return `http://${apiHost}:${apiPort}/uploads/${video.video_url}`
    }
    return video.video_url
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Video Manager</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Carousel Settings
            </button>
            <button
              onClick={() => {
                setEditingVideo(null)
                setFormData({
                  title: '',
                  description: '',
                  video_url: '',
                  redirect_url: '',
                  price: '',
                  size: 'medium',
                  thumbnail_url: '',
                  is_active: true,
                  video_type: 'local'
                })
                setShowAddModal(true)
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              Add New Video
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Unlimited videos supported • Max file size: 500MB per video • Total videos: {videos.length}
        </p>
      </div>

      {/* Carousel Settings Panel */}
      {showSettings && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Carousel Animation Settings</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Auto-Advance Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Auto-Advance Interval (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={carouselSettings.autoAdvanceInterval}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, autoAdvanceInterval: parseInt(e.target.value) || 3000 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Time between video changes (1000-10000ms)
              </p>
            </div>

            {/* Video Play Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Video Play Duration (ms)
              </label>
              <input
                type="number"
                min="1000"
                max="30000"
                step="500"
                value={carouselSettings.videoPlayDuration}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, videoPlayDuration: parseInt(e.target.value) || 3000 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How long each video plays before next (1000-30000ms)
              </p>
            </div>

            {/* Animation Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Animation Duration (ms)
              </label>
              <input
                type="number"
                min="200"
                max="2000"
                step="100"
                value={carouselSettings.animationDuration}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, animationDuration: parseInt(e.target.value) || 700 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Transition speed (200-2000ms)
              </p>
            </div>

            {/* Animation Easing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Animation Easing
              </label>
              <select
                value={carouselSettings.animationEasing}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, animationEasing: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="linear">Linear</option>
                <option value="ease">Ease</option>
                <option value="ease-in">Ease In</option>
                <option value="ease-out">Ease Out</option>
                <option value="ease-in-out">Ease In Out</option>
                <option value="cubic-bezier(0.68, -0.55, 0.265, 1.55)">Bounce</option>
              </select>
            </div>

            {/* 3D Circle Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                3D Circle Radius (px)
              </label>
              <input
                type="number"
                min="300"
                max="1000"
                step="50"
                value={carouselSettings.radius}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, radius: parseInt(e.target.value) || 500 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Distance of videos from center (300-1000px)
              </p>
            </div>

            {/* Blur Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Side Video Blur (px)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                step="1"
                value={carouselSettings.blurAmount}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, blurAmount: parseInt(e.target.value) || 12 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Blur effect for side videos (0-30px)
              </p>
            </div>

            {/* Minimum Opacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Opacity
              </label>
              <input
                type="number"
                min="0.1"
                max="1"
                step="0.1"
                value={carouselSettings.minOpacity}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, minOpacity: parseFloat(e.target.value) || 0.6 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum opacity for side videos (0.1-1.0)
              </p>
            </div>

            {/* Minimum Scale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Scale
              </label>
              <input
                type="number"
                min="0.5"
                max="1"
                step="0.05"
                value={carouselSettings.minScale}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, minScale: parseFloat(e.target.value) || 0.85 })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Minimum scale for side videos (0.5-1.0)
              </p>
            </div>

            {/* Auto Play Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoPlay"
                checked={carouselSettings.autoPlay}
                onChange={(e) => setCarouselSettings({ ...carouselSettings, autoPlay: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="autoPlay" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Enable Auto-Play
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              onClick={saveCarouselSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={() => {
                setCarouselSettings({
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
              }}
              className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">No videos found. Add your first video!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
              <div className="relative group">
                {/* Video Preview */}
                {video.video_type === 'local' || video.video_url ? (
                  <video
                    src={getVideoUrl(video)}
                    className="w-full h-64 object-cover"
                    muted
                    playsInline
                    onMouseEnter={(e) => {
                      const target = e.target as HTMLVideoElement
                      target.play().catch(() => {})
                    }}
                    onMouseLeave={(e) => {
                      const target = e.target as HTMLVideoElement
                      target.pause()
                      target.currentTime = 0
                    }}
                  />
                ) : (
                  <img 
                    src={video.thumbnail_url || '/placeholder-video.jpg'} 
                    alt={video.title}
                    className="w-full h-64 object-cover"
                  />
                )}
                
                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    video.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {video.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {video.video_type?.toUpperCase() || 'URL'}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {video.size.toUpperCase()}
                  </span>
                </div>
              </div>
            
            <div className="p-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{video.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{video.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                <span>👁️ {video.views} views</span>
                <span>❤️ {video.likes} likes</span>
                <span className="font-bold text-green-600">{video.price}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEdit(video)}
                  className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleCropThumbnail(video)}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm text-white hover:bg-green-700 transition-colors flex items-center gap-1"
                  title="Crop Thumbnail"
                >
                  <Crop className="w-4 h-4" />
                  Crop
                </button>
                <button
                  onClick={() => toggleActive(video)}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm text-white transition-colors ${
                    video.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {video.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => handleDelete(video.id)}
                  className="rounded-lg bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && croppingVideo && croppingVideo.thumbnail_url && (
        <ImageCropper
          imageUrl={
            croppingVideo.thumbnail_url.startsWith('http') 
              ? croppingVideo.thumbnail_url 
              : `${API_BASE}/uploads/${croppingVideo.thumbnail_url}`
          }
          aspectRatio={9/16}
          onCrop={handleCropComplete}
          onCancel={() => {
            setShowCropper(false)
            setCroppingVideo(null)
          }}
        />
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingVideo ? 'Edit Video' : 'Add New Video'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="₹1899"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  required
                />
              </div>

              {/* Video Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Video Source Type
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {[
                    { value: 'local', label: 'Local Upload', icon: '📁' },
                    { value: 'instagram', label: 'Instagram', icon: '📷' },
                    { value: 'facebook', label: 'Facebook', icon: '👥' },
                    { value: 'youtube', label: 'YouTube', icon: '📺' },
                    { value: 'url', label: 'Direct URL', icon: '🔗' }
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, video_type: type.value as any })}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        formData.video_type === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-lg mb-1">{type.icon}</div>
                      <div>{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Input based on type */}
              {formData.video_type === 'local' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Upload Video File
                  </label>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileChange(e, 'video')}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required={!editingVideo}
                  />
                  {selectedFile && (
                    <div className="mt-2 text-sm text-green-600">
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  )}
                  {/* Hidden input to ensure video_url is set for local uploads */}
                  <input
                    type="hidden"
                    value={selectedFile ? 'local-upload' : ''}
                    onChange={() => {}}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video URL
                  </label>
                  <input
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder={
                      formData.video_type === 'instagram' ? 'https://www.instagram.com/p/...' :
                      formData.video_type === 'facebook' ? 'https://www.facebook.com/watch/?v=VIDEO_ID' :
                      formData.video_type === 'youtube' ? 'https://www.youtube.com/watch?v=VIDEO_ID' :
                      'https://your-domain.com/video.mp4'
                    }
                    required
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    {formData.video_type === 'instagram' && 'Paste Instagram post URL'}
                    {formData.video_type === 'facebook' && 'Paste Facebook video URL'}
                    {formData.video_type === 'youtube' && 'Paste YouTube video URL'}
                    {formData.video_type === 'url' && 'Paste direct video URL'}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Redirect URL
                </label>
                <input
                  type="url"
                  value={formData.redirect_url}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://your-domain.com/product"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thumbnail
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'thumbnail')}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {selectedThumbnail && (
                      <div className="text-sm text-green-600">
                        Selected: {selectedThumbnail.name}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Or enter URL manually below
                    </div>
                    <input
                      type="url"
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="https://your-domain.com/thumbnail.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Size
                  </label>
                  <select
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value as 'small' | 'medium' | 'large' })}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="small">Small (w-48 h-64)</option>
                    <option value="medium">Medium (w-56 h-72)</option>
                    <option value="large">Large (w-64 h-80)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading || uploadingFile}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loading || uploadingFile ? 'Saving...' : (editingVideo ? 'Update Video' : 'Add Video')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default VideoManager


