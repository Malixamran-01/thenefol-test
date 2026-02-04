import React, { useState, useEffect, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Palette, Image as ImageIcon, MoreVertical, Edit3, FileText, Tag, Droplet, Maximize2, Maximize, Trash2, RotateCcw, RotateCw, FlipHorizontal, Crop as CropIcon, Filter as FilterIcon, Sliders, Type, Smile, Square } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'

interface BlogRequestFormProps {
  onClose: () => void
  onSubmitSuccess?: () => void
}

interface BlogRequest {
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  coverImage: File | null
  detailImage: File | null
  images: ContentImageItem[]
  meta_title: string
  meta_description: string
  meta_keywords: string
  og_title: string
  og_description: string
  og_image: string
  canonical_url: string
  categories: string[]
  allow_comments: boolean
}

interface LinkModalData {
  text: string
  url: string
}

interface ContentImageItem {
  id: string
  file: File
}

export default function BlogRequestForm({ onClose, onSubmitSuccess }: BlogRequestFormProps) {
  const { user, isAuthenticated } = useAuth()
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorCanvasRef = useRef<HTMLCanvasElement>(null)
  const editorImageRef = useRef<HTMLImageElement | null>(null)

  const [formData, setFormData] = useState<BlogRequest>({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    coverImage: null,
    detailImage: null,
    images: [],
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    categories: [],
    allow_comments: true
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkData, setLinkData] = useState<LinkModalData>({ text: '', url: '' })
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const [imageMenuPos, setImageMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [showImageEditor, setShowImageEditor] = useState(false)
  const [imageToEdit, setImageToEdit] = useState<string | null>(null)
  const [imageCaption, setImageCaption] = useState('')
  const [imageAltText, setImageAltText] = useState('')
  const [showCaptionModal, setShowCaptionModal] = useState(false)
  const [showAltTextModal, setShowAltTextModal] = useState(false)
  const [activeEditorTool, setActiveEditorTool] = useState<'crop' | 'filter' | 'adjust' | 'text' | 'sticker'>('crop')
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editingImageName, setEditingImageName] = useState<string>('')
  const [editorImageSize, setEditorImageSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 })
  const [editorState, setEditorState] = useState({
    rotation: 0,
    flipH: false,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    filter: 'none',
    crop: { x: 0, y: 0, width: 100, height: 100 },
    text: { value: '', size: 32, color: '#ffffff' },
    sticker: { value: '✨', size: 48 }
  })

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ]

  const categoryOptions = BLOG_CATEGORY_OPTIONS

  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        author_name: user.name || '',
        author_email: user.email || ''
      }))
    }
  }, [isAuthenticated, user])

  // Attach click handlers to all images in editor
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const handleImageClickInEditor = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') {
        e.stopPropagation()
        handleImageClick(target as HTMLImageElement, e as MouseEvent)
      }
    }

    editor.addEventListener('click', handleImageClickInEditor)
    return () => {
      editor.removeEventListener('click', handleImageClickInEditor)
    }
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(item => item !== category)
        : [...prev.categories, category]
    }))
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        content: editorRef.current!.innerHTML
      }))
    }
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleEditorInput()
  }

  const setHeading = (level: number) => {
    exec('formatBlock', `h${level}`)
  }

  const setParagraph = () => {
    exec('formatBlock', 'p')
  }

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const insertLink = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    } else {
      savedSelectionRef.current = null
    }
    const selectedText = selection?.toString() || ''
    setLinkData({ text: selectedText, url: '' })
    setShowLinkModal(true)
  }

  const confirmLink = () => {
    const normalizedUrl = normalizeUrl(linkData.url)
    if (!normalizedUrl) return

    const selection = window.getSelection()
    editorRef.current?.focus()

    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }

    const linkText = linkData.text?.trim() || normalizedUrl
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null

    if (range) {
      range.deleteContents()
      const anchor = document.createElement('a')
      anchor.href = normalizedUrl
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
      anchor.textContent = linkText
      anchor.style.color = '#4B97C9'
      anchor.style.textDecoration = 'underline'
      range.insertNode(anchor)
      range.setStartAfter(anchor)
      range.setEndAfter(anchor)
      selection?.removeAllRanges()
      selection?.addRange(range)
      handleEditorInput()
    } else {
      const html = `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer" style="color: #4B97C9; text-decoration: underline;">${linkText}</a>`
      exec('insertHTML', html)
    }

    savedSelectionRef.current = null
    setShowLinkModal(false)
    setLinkData({ text: '', url: '' })
  }

  const applyColor = (color: string) => {
    setCurrentColor(color)
    exec('foreColor', color)
    setShowColorPicker(false)
  }

  const toggleColorPicker = () => {
    const button = colorButtonRef.current
    const container = scrollContainerRef.current
    if (!button || !container) {
      setShowColorPicker(prev => !prev)
      return
    }
    const rect = button.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setColorPickerPos({
      top: rect.bottom - containerRect.top + container.scrollTop + 8,
      left: rect.left - containerRect.left + container.scrollLeft
    })
    setShowColorPicker(prev => !prev)
  }

  useEffect(() => {
    if (!showColorPicker) return

    const handleScrollOrResize = () => {
      const button = colorButtonRef.current
      const container = scrollContainerRef.current
      if (!button || !container) return
      const rect = button.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      setColorPickerPos({
        top: rect.bottom - containerRect.top + container.scrollTop + 8,
        left: rect.left - containerRect.left + container.scrollLeft
      })
    }

    window.addEventListener('resize', handleScrollOrResize)
    const scrollEl = scrollContainerRef.current
    scrollEl?.addEventListener('scroll', handleScrollOrResize)

    return () => {
      window.removeEventListener('resize', handleScrollOrResize)
      scrollEl?.removeEventListener('scroll', handleScrollOrResize)
    }
  }, [showColorPicker])

  const insertList = (ordered: boolean) => {
    // Get the current selection
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return

    // Save the selection range
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null
    
    if (ordered) {
      exec('insertOrderedList')
    } else {
      exec('insertUnorderedList')
    }

    // Restore focus
    editorRef.current.focus()
  }

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, coverImage: file }))
    }
  }

  const removeCoverImage = () => {
    setFormData(prev => ({ ...prev, coverImage: null }))
  }

  const handleDetailImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, detailImage: file }))
    }
  }

  const removeDetailImage = () => {
    setFormData(prev => ({ ...prev, detailImage: null }))
  }

  const createImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const insertImageIntoEditor = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file)
      
      // Save the selection before inserting
      const selection = window.getSelection()
      editorRef.current?.focus()
      
      const imageId = createImageId()

      // Insert image at cursor position
      const img = document.createElement('img')
      img.src = imageUrl
      img.alt = file.name
      img.style.maxWidth = '100%'
      img.style.height = 'auto'
      img.style.margin = '10px 0'
      img.style.cursor = 'pointer'
      img.style.border = '2px solid transparent'
      img.style.transition = 'all 0.2s'
      img.setAttribute('data-filename', file.name)
      img.setAttribute('data-image-id', imageId)
      img.setAttribute('data-caption', '')
      img.setAttribute('data-alt', file.name)
      img.setAttribute('data-width-style', 'normal')
      
      // Add click handler to show context menu
      img.addEventListener('click', (e) => {
        e.stopPropagation()
        handleImageClick(img, e as MouseEvent)
      })
      
      // Add hover effect
      img.addEventListener('mouseenter', () => {
        img.style.borderColor = '#4B97C9'
      })
      img.addEventListener('mouseleave', () => {
        img.style.borderColor = 'transparent'
      })
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        range.insertNode(img)
        
        // Move cursor after the image
        range.setStartAfter(img)
        range.setEndAfter(img)
        selection.removeAllRanges()
        selection.addRange(range)
      } else {
        editorRef.current?.appendChild(img)
      }
      
      // Store the file reference for later upload
      const currentImages = formData.images || []
      setFormData(prev => ({ 
        ...prev, 
        images: [...currentImages, { id: imageId, file }] 
      }))
      
      // Update content
      handleEditorInput()
    }
    
    input.click()
  }

  const handleImageClick = (img: HTMLImageElement, e: MouseEvent) => {
    setSelectedImage(img)
    setImageMenuPos({ top: e.clientY, left: e.clientX })
    setShowImageMenu(true)
    setImageCaption(img.getAttribute('data-caption') || '')
    setImageAltText(img.getAttribute('data-alt') || img.alt)
  }

  const deleteImage = () => {
    if (selectedImage && selectedImage.parentNode) {
      const imageId = selectedImage.getAttribute('data-image-id')
      if (imageId) {
        setFormData(prev => ({
          ...prev,
          images: prev.images.filter(item => item.id !== imageId)
        }))
      }
      selectedImage.parentNode.removeChild(selectedImage)
      setShowImageMenu(false)
      setSelectedImage(null)
      handleEditorInput()
    }
  }

  const setImageWidth = (width: 'normal' | 'wide' | 'full') => {
    if (!selectedImage) return
    
    switch (width) {
      case 'wide':
        selectedImage.style.maxWidth = '120%'
        selectedImage.style.marginLeft = '-10%'
        break
      case 'full':
        selectedImage.style.maxWidth = '100vw'
        selectedImage.style.marginLeft = 'calc(-50vw + 50%)'
        break
      default:
        selectedImage.style.maxWidth = '100%'
        selectedImage.style.marginLeft = '0'
    }
    selectedImage.setAttribute('data-width-style', width)
    setShowImageMenu(false)
    handleEditorInput()
  }

  const openImageEditor = () => {
    if (selectedImage) {
      setImageToEdit(selectedImage.src)
      setEditingImageId(selectedImage.getAttribute('data-image-id'))
      setEditingImageName(selectedImage.getAttribute('data-filename') || 'edited-image')
      setEditorState({
        rotation: 0,
        flipH: false,
        brightness: 100,
        contrast: 100,
        saturation: 100,
        filter: 'none',
        crop: { x: 0, y: 0, width: 100, height: 100 },
        text: { value: '', size: 32, color: '#ffffff' },
        sticker: { value: '✨', size: 48 }
      })
      setActiveEditorTool('crop')
      setShowImageEditor(true)
      setShowImageMenu(false)
    }
  }

  const saveImageCaption = () => {
    if (selectedImage) {
      selectedImage.setAttribute('data-caption', imageCaption)
      // Add caption below image if it doesn't exist
      let caption = selectedImage.nextElementSibling as HTMLParagraphElement | null
      if (!caption || !caption.classList.contains('image-caption')) {
        caption = document.createElement('p')
        caption.classList.add('image-caption')
        caption.style.fontSize = '0.875rem'
        caption.style.color = '#6b7280'
        caption.style.fontStyle = 'italic'
        caption.style.marginTop = '0.5rem'
        caption.style.textAlign = 'center'
        selectedImage.parentNode?.insertBefore(caption, selectedImage.nextSibling)
      }
      caption.textContent = imageCaption
      setShowCaptionModal(false)
      handleEditorInput()
    }
  }

  const saveImageAltText = () => {
    if (selectedImage) {
      selectedImage.setAttribute('data-alt', imageAltText)
      selectedImage.alt = imageAltText
      setShowAltTextModal(false)
      handleEditorInput()
    }
  }

  const buildFilterString = () => {
    const { brightness, contrast, saturation, filter } = editorState
    const base = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    switch (filter) {
      case 'grayscale':
        return `grayscale(1) ${base}`
      case 'sepia':
        return `sepia(1) ${base}`
      case 'vivid':
        return `saturate(1.6) contrast(1.1) ${base}`
      case 'warm':
        return `sepia(0.4) saturate(1.2) ${base}`
      case 'cool':
        return `hue-rotate(200deg) saturate(1.2) ${base}`
      default:
        return base
    }
  }

  const renderEditorCanvas = () => {
    const canvas = editorCanvasRef.current
    const img = editorImageRef.current
    if (!canvas || !img) return

    const crop = editorState.crop
    const cropX = Math.max(0, Math.min(100, crop.x))
    const cropY = Math.max(0, Math.min(100, crop.y))
    const cropW = Math.max(10, Math.min(100 - cropX, crop.width))
    const cropH = Math.max(10, Math.min(100 - cropY, crop.height))

    const srcX = (cropX / 100) * img.width
    const srcY = (cropY / 100) * img.height
    const srcW = (cropW / 100) * img.width
    const srcH = (cropH / 100) * img.height

    const temp = document.createElement('canvas')
    temp.width = Math.round(srcW)
    temp.height = Math.round(srcH)
    const tctx = temp.getContext('2d')
    if (!tctx) return
    tctx.filter = buildFilterString()
    tctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, temp.width, temp.height)

    const rotate = editorState.rotation % 360
    const swapSize = rotate === 90 || rotate === 270
    canvas.width = swapSize ? temp.height : temp.width
    canvas.height = swapSize ? temp.width : temp.height

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    const scaleX = editorState.flipH ? -1 : 1
    ctx.scale(scaleX, 1)
    ctx.rotate((rotate * Math.PI) / 180)
    ctx.drawImage(temp, -temp.width / 2, -temp.height / 2)
    ctx.restore()

    if (editorState.text.value.trim()) {
      ctx.save()
      ctx.fillStyle = editorState.text.color
      ctx.font = `${editorState.text.size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(editorState.text.value, canvas.width / 2, canvas.height / 2)
      ctx.restore()
    }

    if (editorState.sticker.value.trim()) {
      ctx.save()
      ctx.font = `${editorState.sticker.size}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(editorState.sticker.value, canvas.width / 2, canvas.height / 2 + 60)
      ctx.restore()
    }
  }

  useEffect(() => {
    if (!showImageEditor || !imageToEdit) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      editorImageRef.current = img
      setEditorImageSize({ width: img.width, height: img.height })
      renderEditorCanvas()
    }
    img.src = imageToEdit
  }, [showImageEditor, imageToEdit])

  useEffect(() => {
    if (!showImageEditor) return
    renderEditorCanvas()
  }, [editorState, showImageEditor])

  const saveEditedImage = () => {
    const canvas = editorCanvasRef.current
    if (!canvas || !selectedImage) {
      setShowImageEditor(false)
      return
    }
    canvas.toBlob((blob) => {
      if (!blob) return
      const filename = editingImageName || 'edited-image.png'
      const editedFile = new File([blob], filename, { type: blob.type })
      const imageUrl = URL.createObjectURL(blob)

      selectedImage.src = imageUrl
      selectedImage.setAttribute('data-filename', filename)

      if (editingImageId) {
        setFormData(prev => ({
          ...prev,
          images: prev.images.map(item => (item.id === editingImageId ? { ...item, file: editedFile } : item))
        }))
      }

      handleEditorInput()
      setShowImageEditor(false)
    }, 'image/png', 0.95)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreedToTerms) {
      setSubmitStatus('error')
      setErrorMessage('Please agree to the terms and conditions before submitting.')
      return
    }

    if (!formData.coverImage) {
      setSubmitStatus('error')
      setErrorMessage('Please upload a cover image for your blog post.')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const apiBase = getApiBase()
      const formDataToSend = new FormData()

      formDataToSend.append('title', formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('excerpt', formData.excerpt)
      formDataToSend.append('author_name', formData.author_name)
      formDataToSend.append('author_email', formData.author_email)
      formDataToSend.append('meta_title', formData.meta_title)
      formDataToSend.append('meta_description', formData.meta_description)
      formDataToSend.append('meta_keywords', formData.meta_keywords)
      formDataToSend.append('og_title', formData.og_title)
      formDataToSend.append('og_description', formData.og_description)
      formDataToSend.append('og_image', formData.og_image)
      formDataToSend.append('canonical_url', formData.canonical_url)
      formDataToSend.append('categories', JSON.stringify(formData.categories))
      formDataToSend.append('allow_comments', String(formData.allow_comments))

      if (formData.coverImage) {
        formDataToSend.append('coverImage', formData.coverImage)
      }

      if (formData.detailImage) {
        formDataToSend.append('detailImage', formData.detailImage)
      }

      formData.images.forEach(image => {
        formDataToSend.append('images', image.file)
      })

      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const response = await fetch(`${apiBase}/api/blog/request`, {
        method: 'POST',
        headers,
        body: formDataToSend
      })

      if (response.ok) {
        setSubmitStatus('success')
        setTimeout(() => {
          onSubmitSuccess?.()
          onClose()
        }, 2000)
      } else {
        const errorData = await response.json()
        setSubmitStatus('error')
        setErrorMessage(errorData.message || 'Failed to submit blog request')
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitStatus === 'success') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center relative">
          <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your blog post request has been submitted successfully.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .editor-content {
          line-height: 1.8;
        }
        .editor-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h4 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        .editor-content p { margin: 0.5em 0; }
        .editor-content ul { list-style: disc; margin-left: 2em; padding-left: 0.5em; }
        .editor-content ol { list-style: decimal; margin-left: 2em; padding-left: 0.5em; }
        .editor-content li { margin: 0.25em 0; padding-left: 0.25em; }
        .editor-content a { color: #4B97C9; text-decoration: underline; }
        .editor-content img { max-width: 100%; height: auto; margin: 10px 0; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
        .editor-content img:hover { border-color: #4B97C9; }
        .editor-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
      `}</style>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-none sm:rounded-xl shadow-xl w-full max-w-3xl h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[95vh] flex flex-col overflow-hidden mx-auto relative">
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 sm:top-3 sm:right-3 p-2 hover:bg-gray-100 rounded-full transition-colors z-20"
            aria-label="Close"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
          </button>

          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:p-6 pt-12 sm:pt-14 relative">
            <form onSubmit={handleSubmit} className="space-y-6 w-full">
              {/* Title as heading */}
              <div className="mb-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Submit Blog Post Request</h2>
                <p className="text-sm text-gray-600 mt-1">Share your story with our community</p>
              </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
              <input 
                name="author_name" 
                value={formData.author_name} 
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Enter your full name" 
                required 
                disabled={isSubmitting || (isAuthenticated && !!user?.name)}
              />
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
              <input 
                name="author_email" 
                value={formData.author_email} 
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="your.email@domain.com" 
                required 
                disabled={isSubmitting || (isAuthenticated && !!user?.email)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Blog Title *</label>
            <input 
              name="title" 
              value={formData.title} 
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter an engaging title for your blog post" 
              required 
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Short Excerpt *</label>
            <textarea 
              name="excerpt" 
              value={formData.excerpt} 
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3} 
              placeholder="Write a brief summary (2-3 sentences)" 
              required 
              disabled={isSubmitting}
            />
          </div>

          {/* SEO & Categories */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 sm:p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">SEO & Social Sharing</h3>
              <p className="text-xs text-gray-600 mt-1">
                These fields improve how your blog appears in search results and social previews.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title(For search engines)</label>
                <input
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Custom title for search engines"
                  maxLength={60}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Canonical URL(For search engines)</label>
                <input
                  name="canonical_url"
                  value={formData.canonical_url}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://www.thenefol.com/blog/your-post"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description(For search engines)</label>
              <textarea
                name="meta_description"
                value={formData.meta_description}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                maxLength={160}
                placeholder="Short description for search engines (up to 160 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Keywords / Tags(For search engine visibility</label>
              <input
                name="meta_keywords"
                value={formData.meta_keywords}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. skincare, routine, glowing skin"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated keywords.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">OG Title(For social sharing preview)</label>
                <input
                  name="og_title"
                  value={formData.og_title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Title for social preview"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">OG Image URL(For social sharing preview)</label>
                <input
                  name="og_image"
                  value={formData.og_image}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://.../image.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">OG Description(For social sharing preview)</label>
              <textarea
                name="og_description"
                value={formData.og_description}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                maxLength={200}
                placeholder="Description for social preview"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category Tags(For blog categorization)</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(category => {
                  const active = formData.categories.includes(category)
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                      }`}
                    >
                      {category}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Allow Comments</p>
                <p className="text-xs text-gray-500">Toggle whether readers can comment on this post.</p>
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.allow_comments}
                  onChange={(e) => setFormData(prev => ({ ...prev, allow_comments: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  {formData.allow_comments ? 'On' : 'Off'}
                </span>
              </label>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">Blog Content *</label>
            <div className="border-2 border-gray-300 rounded-lg overflow-visible focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 w-full relative">
              {/* Enhanced Toolbar */}
              <div className="bg-gray-50 border-b border-gray-300 p-2 sm:p-3 overflow-x-auto relative z-20">
                <div className="flex flex-wrap gap-1 sm:gap-2 items-center min-w-max text-gray-700">
                  {/* Text Format Group */}
                  <div className="flex gap-1 border-r border-gray-300 pr-1 sm:pr-2 flex-shrink-0">
                    <button 
                      type="button" 
                      onClick={setParagraph} 
                      className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-200 rounded transition-colors text-xs sm:text-sm font-medium text-gray-700"
                      title="Paragraph"
                    >
                      P
                    </button>
                    {[1, 2, 3, 4].map(h => (
                      <button 
                        key={h} 
                        type="button" 
                        onClick={() => setHeading(h)} 
                        className="px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-200 rounded transition-colors text-xs sm:text-sm font-semibold text-gray-700"
                        title={`Heading ${h}`}
                      >
                        H{h}
                      </button>
                    ))}
                  </div>

                  {/* Style Group */}
                  <div className="flex gap-1 border-r border-gray-300 pr-1 sm:pr-2 flex-shrink-0">
                    <button 
                      type="button" 
                      onClick={() => exec('bold')} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Bold"
                    >
                      <Bold size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => exec('italic')} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Italic"
                    >
                      <Italic size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => exec('underline')} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Underline"
                    >
                      <Underline size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Color Picker */}
                  <div className="border-r border-gray-300 pr-1 sm:pr-2 flex-shrink-0">
                    <button 
                      type="button" 
                      onClick={toggleColorPicker}
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors flex items-center gap-1 text-gray-700"
                      title="Text Color"
                      ref={colorButtonRef}
                    >
                      <Palette size={18} className="sm:w-5 sm:h-5" />
                      <div 
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-gray-400 flex-shrink-0" 
                        style={{ backgroundColor: currentColor }}
                      />
                    </button>
                  </div>

                  {/* Link, Image & Lists Group */}
                  <div className="flex gap-1 flex-shrink-0">
                    <button 
                      type="button" 
                      onClick={insertLink} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Insert Link"
                    >
                      <LinkIcon size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={insertImageIntoEditor} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Insert Image"
                    >
                      <ImageIcon size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList(false)} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Bullet List"
                    >
                      <List size={18} className="sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => insertList(true)} 
                      className="p-1.5 sm:p-2 hover:bg-gray-200 rounded transition-colors text-gray-700"
                      title="Numbered List"
                    >
                      <ListOrdered size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor Area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={handleEditorInput}
                className="editor-content h-[320px] sm:h-[380px] overflow-y-auto p-4 sm:p-6 outline-none text-sm sm:text-base bg-white w-full relative z-10"
                data-placeholder="Start writing your blog post here... Use the toolbar above to format your text, add links, and create lists."
                suppressContentEditableWarning
              />
            </div>
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Image * <span className="text-xs text-gray-500">(Required - Recommended: 800x420px or 16:9 ratio)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                Upload your blog cover image (will be displayed as card background)
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverImageUpload}
                className="hidden"
                id="cover-image-upload"
                disabled={isSubmitting}
              />
              <label
                htmlFor="cover-image-upload"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Choose Cover Image
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, WebP. Max 5MB. Best size: 800x420px (16:9 ratio)
              </p>
            </div>

            {/* Display uploaded cover image */}
            {formData.coverImage && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cover Image Preview:</h4>
                <div className="relative group w-full max-w-md">
                  <img
                    src={URL.createObjectURL(formData.coverImage)}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeCoverImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">{formData.coverImage.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Detail Page Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detail Page Image <span className="text-xs text-gray-500">(Optional - Appears below title on detail page)</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-3">
                Upload an image to display below the blog title on the detail page
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleDetailImageUpload}
                className="hidden"
                id="detail-image-upload"
                disabled={isSubmitting}
              />
              <label
                htmlFor="detail-image-upload"
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
              >
                Choose Detail Image
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: JPG, PNG, WebP. Max 5MB.
              </p>
            </div>

            {/* Display uploaded detail image */}
            {formData.detailImage && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Detail Image Preview:</h4>
                <div className="relative group w-full max-w-md">
                  <img
                    src={URL.createObjectURL(formData.detailImage)}
                    alt="Detail preview"
                    className="w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={removeDetailImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <p className="text-xs text-gray-500 mt-1 truncate">{formData.detailImage.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
            <input 
              type="checkbox" 
              id="terms"
              checked={agreedToTerms} 
              onChange={e => setAgreedToTerms(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <label htmlFor="terms" className="text-sm text-gray-700">
              I agree to the{' '}
              <button 
                type="button" 
                onClick={() => setShowTermsModal(true)} 
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                Terms & Conditions
              </button>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t w-full">
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting || !agreedToTerms}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </button>
          </div>

        </form>

        {/* Color Picker Overlay (scrolls with container) */}
        {showColorPicker && (
          <div
            className="absolute bg-white border-2 border-gray-300 rounded-lg shadow-lg p-2 sm:p-3 z-[100]"
            style={{ top: colorPickerPos.top, left: colorPickerPos.left }}
          >
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-40 sm:w-48">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => applyColor(color)}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded border-2 hover:scale-110 transition-transform"
                  style={{ 
                    backgroundColor: color,
                    borderColor: currentColor === color ? '#4B97C9' : '#D1D5DB'
                  }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 mx-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Insert Link</h3>
              <button 
                onClick={() => {
                  setShowLinkModal(false)
                  setLinkData({ text: '', url: '' })
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Text (What the link should say)
                </label>
                <input
                  type="text"
                  value={linkData.text}
                  onChange={e => setLinkData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="e.g., Click here to learn more"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use the URL as display text</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL (Link destination) *
                </label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={e => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowLinkModal(false)
                    setLinkData({ text: '', url: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLink}
                  disabled={!linkData.url}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Insert Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[80vh] flex flex-col overflow-hidden mx-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg">Terms & Conditions</h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-sm text-gray-700 leading-relaxed space-y-3">
              <p className="font-medium">By submitting your blog post, you agree to the following:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>No NSFW (Not Safe For Work) content</li>
                <li>No plagiarism - all content must be original or properly attributed</li>
                <li>Content must be respectful and appropriate for all audiences</li>
                <li>NEFOL® reserves the right to review, edit, or reject any submission</li>
                <li>You retain ownership of your content but grant NEFOL® the right to publish it</li>
              </ul>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button 
                onClick={() => { 
                  setAgreedToTerms(true)
                  setShowTermsModal(false) 
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                I Agree
              </button>
              <button 
                onClick={() => setShowTermsModal(false)} 
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Context Menu */}
      {showImageMenu && (
        <>
          <div 
            className="fixed inset-0 z-[50]" 
            onClick={() => setShowImageMenu(false)}
          />
          <div
            className="fixed z-[60] bg-white rounded-lg shadow-xl py-2 min-w-[200px]"
            style={{ top: imageMenuPos.top, left: imageMenuPos.left }}
          >
            <button
              onClick={openImageEditor}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Edit3 className="w-4 h-4" />
              Edit image
            </button>
            <button
              onClick={() => {
                setShowImageMenu(false)
                setShowCaptionModal(true)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              Edit caption
            </button>
            <button
              onClick={() => {
                setShowImageMenu(false)
                setShowAltTextModal(true)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Tag className="w-4 h-4" />
              Edit alt text
            </button>
            <div className="border-t my-2" />
            <button
              onClick={() => setImageWidth('wide')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              Wide width
            </button>
            <button
              onClick={() => setImageWidth('full')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm"
            >
              <Maximize className="w-4 h-4" />
              Full width
            </button>
            <div className="border-t my-2" />
            <button
              onClick={deleteImage}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Delete image
            </button>
          </div>
        </>
      )}

      {/* Caption Modal */}
      {showCaptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Image Caption</h3>
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Enter caption..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setShowCaptionModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveImageCaption}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alt Text Modal */}
      {showAltTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Edit Alt Text</h3>
            <input
              type="text"
              value={imageAltText}
              onChange={(e) => setImageAltText(e.target.value)}
              placeholder="Enter alt text..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">Alt text helps screen readers and SEO</p>
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setShowAltTextModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveImageAltText}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {showImageEditor && imageToEdit && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4">
          <div className="bg-gray-900 rounded-lg w-[1100px] max-w-[95vw] h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-white font-semibold">Edit Image</h3>
              <button
                onClick={() => setShowImageEditor(false)}
                className="p-2 hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 flex min-h-0">
              <div className="w-20 bg-gray-800 p-2 flex flex-col gap-2">
                <button
                  onClick={() => setActiveEditorTool('crop')}
                  className={`p-3 rounded text-white flex flex-col items-center gap-1 ${activeEditorTool === 'crop' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <CropIcon className="w-5 h-5" />
                  <span className="text-xs">Crop</span>
                </button>
                <button
                  onClick={() => setActiveEditorTool('filter')}
                  className={`p-3 rounded text-white flex flex-col items-center gap-1 ${activeEditorTool === 'filter' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <FilterIcon className="w-5 h-5" />
                  <span className="text-xs">Filter</span>
                </button>
                <button
                  onClick={() => setActiveEditorTool('adjust')}
                  className={`p-3 rounded text-white flex flex-col items-center gap-1 ${activeEditorTool === 'adjust' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="text-xs">Adjust</span>
                </button>
                <button
                  onClick={() => setActiveEditorTool('text')}
                  className={`p-3 rounded text-white flex flex-col items-center gap-1 ${activeEditorTool === 'text' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-xs">Text</span>
                </button>
                <button
                  onClick={() => setActiveEditorTool('sticker')}
                  className={`p-3 rounded text-white flex flex-col items-center gap-1 ${activeEditorTool === 'sticker' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <Smile className="w-5 h-5" />
                  <span className="text-xs">Sticker</span>
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-6 min-h-0">
                <div className="w-[720px] h-[420px] max-w-full max-h-full bg-gray-800 rounded shadow-lg overflow-hidden flex items-center justify-center">
                  <canvas
                    ref={editorCanvasRef}
                    className="w-full h-full"
                  />
                </div>
              </div>
              <div className="w-72 shrink-0 bg-gray-800 p-4 text-white overflow-y-auto">
                {activeEditorTool === 'crop' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Crop</h4>
                    <div>
                      <label className="text-xs text-gray-300">X ({editorState.crop.x}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={editorState.crop.x}
                        onChange={(e) => setEditorState(prev => ({ ...prev, crop: { ...prev.crop, x: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Y ({editorState.crop.y}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={editorState.crop.y}
                        onChange={(e) => setEditorState(prev => ({ ...prev, crop: { ...prev.crop, y: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Width ({editorState.crop.width}%)</label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={editorState.crop.width}
                        onChange={(e) => setEditorState(prev => ({ ...prev, crop: { ...prev.crop, width: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Height ({editorState.crop.height}%)</label>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={editorState.crop.height}
                        onChange={(e) => setEditorState(prev => ({ ...prev, crop: { ...prev.crop, height: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                    <p className="text-xs text-gray-400">Image size: {editorImageSize.width}×{editorImageSize.height}</p>
                  </div>
                )}

                {activeEditorTool === 'filter' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Filters</h4>
                    <select
                      value={editorState.filter}
                      onChange={(e) => setEditorState(prev => ({ ...prev, filter: e.target.value }))}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                      <option value="none">None</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="sepia">Sepia</option>
                      <option value="vivid">Vivid</option>
                      <option value="warm">Warm</option>
                      <option value="cool">Cool</option>
                    </select>
                  </div>
                )}

                {activeEditorTool === 'adjust' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Adjust</h4>
                    <div>
                      <label className="text-xs text-gray-300">Brightness ({editorState.brightness}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={editorState.brightness}
                        onChange={(e) => setEditorState(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Contrast ({editorState.contrast}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={editorState.contrast}
                        onChange={(e) => setEditorState(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Saturation ({editorState.saturation}%)</label>
                      <input
                        type="range"
                        min={0}
                        max={200}
                        value={editorState.saturation}
                        onChange={(e) => setEditorState(prev => ({ ...prev, saturation: Number(e.target.value) }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {activeEditorTool === 'text' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Text</h4>
                    <input
                      type="text"
                      value={editorState.text.value}
                      onChange={(e) => setEditorState(prev => ({ ...prev, text: { ...prev.text, value: e.target.value } }))}
                      placeholder="Type text..."
                      className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    />
                    <div>
                      <label className="text-xs text-gray-300">Size ({editorState.text.size}px)</label>
                      <input
                        type="range"
                        min={12}
                        max={96}
                        value={editorState.text.size}
                        onChange={(e) => setEditorState(prev => ({ ...prev, text: { ...prev.text, size: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Color</label>
                      <input
                        type="color"
                        value={editorState.text.color}
                        onChange={(e) => setEditorState(prev => ({ ...prev, text: { ...prev.text, color: e.target.value } }))}
                        className="w-full h-10 rounded"
                      />
                    </div>
                  </div>
                )}

                {activeEditorTool === 'sticker' && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Sticker</h4>
                    <div className="flex flex-wrap gap-2">
                      {['✨', '⭐', '❤️', '🔥', '🌿', '💧', '🌸', '✅'].map(sticker => (
                        <button
                          key={sticker}
                          onClick={() => setEditorState(prev => ({ ...prev, sticker: { ...prev.sticker, value: sticker } }))}
                          className={`p-2 rounded ${editorState.sticker.value === sticker ? 'bg-gray-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                        >
                          {sticker}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-gray-300">Size ({editorState.sticker.size}px)</label>
                      <input
                        type="range"
                        min={16}
                        max={120}
                        value={editorState.sticker.size}
                        onChange={(e) => setEditorState(prev => ({ ...prev, sticker: { ...prev.sticker, size: Number(e.target.value) } }))}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  className="p-2 hover:bg-gray-800 rounded text-white"
                  title="Rotate Left"
                  onClick={() => setEditorState(prev => ({ ...prev, rotation: (prev.rotation - 90 + 360) % 360 }))}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  className="p-2 hover:bg-gray-800 rounded text-white"
                  title="Rotate Right"
                  onClick={() => setEditorState(prev => ({ ...prev, rotation: (prev.rotation + 90) % 360 }))}
                >
                  <RotateCw className="w-5 h-5" />
                </button>
                <button
                  className="p-2 hover:bg-gray-800 rounded text-white"
                  title="Flip Horizontal"
                  onClick={() => setEditorState(prev => ({ ...prev, flipH: !prev.flipH }))}
                >
                  <FlipHorizontal className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={saveEditedImage}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </>
  )
}
