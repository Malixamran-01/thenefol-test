import React, { useState, useEffect, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Palette, Image as ImageIcon, MoreVertical, Edit3, FileText, Tag, Maximize2, Maximize, Trash2, ArrowLeft, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import ImageEditor from '../components/ImageEditor'
import BlogPreview from '../components/BlogPreview'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'

interface BlogRequest {
  title: string
  content: string
  excerpt: string
  author_name: string
  author_email: string
  coverImage: File | null
  detailImage: File | null
  ogImageFile: File | null
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

export default function BlogRequestForm() {
  const { user, isAuthenticated } = useAuth()
  const editorRef = useRef<HTMLDivElement>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [formData, setFormData] = useState<BlogRequest>({
    title: '',
    content: '',
    excerpt: '',
    author_name: '',
    author_email: '',
    coverImage: null,
    detailImage: null,
    ogImageFile: null,
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
  const [editingImageId, setEditingImageId] = useState<string | null>(null)
  const [editingImageName, setEditingImageName] = useState<string>('')
  const [showPreview, setShowPreview] = useState(false)
  const [showSeoPreview, setShowSeoPreview] = useState(false)
  const [canonicalOverride, setCanonicalOverride] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ]

  const categoryOptions = BLOG_CATEGORY_OPTIONS

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.hash = '#/user/blog'
    }
  }, [isAuthenticated])

  // Fetch existing tags for autocomplete
  useEffect(() => {
    fetch(`${getApiBase()}/api/blog/tags`)
      .then(r => r.ok ? r.json() : [])
      .then(setExistingTags)
      .catch(() => setExistingTags([]))
  }, [])

  // Close image menu when clicking outside or scrolling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showImageMenu && selectedImage && !selectedImage.contains(event.target as Node)) {
        setShowImageMenu(false)
        setSelectedImage(null)
      }
    }

    const handleScroll = () => {
      if (showImageMenu) {
        setShowImageMenu(false)
        setSelectedImage(null)
      }
    }

    if (showImageMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      scrollContainerRef.current?.addEventListener('scroll', handleScroll)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      scrollContainerRef.current?.removeEventListener('scroll', handleScroll)
    }
  }, [showImageMenu, selectedImage]) 
 useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        author_name: user.name || '',
        author_email: user.email || ''
      }))
    }
  }, [isAuthenticated, user])

  // Auto-fill OG and meta fields from title/excerpt/content when empty
  const stripForMeta = (text: string, maxLen: number) =>
    text.replace(/<[^>]*>/g, ' ').replace(/[#*_~`\[\]()]/g, '').replace(/\s+/g, ' ').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().slice(0, maxLen)
  const truncateTitle = (s: string, max = 65) => s.length <= max ? s : s.slice(0, max - 3).replace(/\s+\S*$/, '') + '...'
  useEffect(() => {
    setFormData(prev => {
      const updates: Partial<BlogRequest> = {}
      if (prev.title) {
        if (!prev.meta_title) updates.meta_title = truncateTitle(prev.title, 60)
        if (!prev.og_title) updates.og_title = prev.title
      }
      if (prev.excerpt && !prev.meta_description) updates.meta_description = stripForMeta(prev.excerpt, 155)
      if (prev.excerpt && !prev.og_description) updates.og_description = stripForMeta(prev.excerpt, 200)
      if (!prev.meta_description && prev.content) {
        const firstP = prev.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
        if (firstP) updates.meta_description = stripForMeta(firstP, 155)
      }
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [formData.title, formData.excerpt, formData.content])

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
  const  normalizeUrl = (url: string) => {
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
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return

    if (ordered) {
      exec('insertOrderedList')
    } else {
      exec('insertUnorderedList')
    }

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

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setFormData(prev => ({ ...prev, ogImageFile: file, og_image: '' }))
    }
  }

  const removeOgImage = () => {
    setFormData(prev => ({ ...prev, ogImageFile: null }))
  }

  const useCoverAsOg = () => {
    setFormData(prev => ({ ...prev, ogImageFile: null, og_image: '' }))
  }  
  const createImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const insertImageIntoEditor = () => {
    if (!editorRef.current) {
      console.error('Editor not available')
      return
    }
    
    editorRef.current.focus()
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange()
      } else {
        const newRange = document.createRange()
        newRange.selectNodeContents(editorRef.current)
        newRange.collapse(false)
        savedSelectionRef.current = newRange
      }
    } else {
      const newRange = document.createRange()
      newRange.selectNodeContents(editorRef.current)
      newRange.collapse(false)
      savedSelectionRef.current = newRange
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      setImageToEdit(URL.createObjectURL(file))
      setEditingImageName(file.name)
      setShowImageEditor(true)
    }
    
    input.click()
  }

  const handleImageClick = (img: HTMLImageElement, e: MouseEvent) => {
    setSelectedImage(img)
    
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const scrollTop = scrollContainer.scrollTop
      const scrollLeft = scrollContainer.scrollLeft
      
      const menuTop = e.clientY - containerRect.top + scrollTop
      const menuLeft = e.clientX - containerRect.left + scrollLeft
      
      const maxTop = scrollContainer.scrollHeight - 300
      const maxLeft = scrollContainer.clientWidth - 220
      
      setImageMenuPos({ 
        top: Math.min(menuTop, maxTop), 
        left: Math.min(menuLeft, maxLeft) 
      })
    } else {
      setImageMenuPos({ top: e.clientY, left: e.clientX })
    }
    
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
      setShowImageEditor(true)
      setShowImageMenu(false)
    }
  }

  const saveImageCaption = () => {
    if (selectedImage) {
      selectedImage.setAttribute('data-caption', imageCaption)
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
const handleImageEditorSave = async (editedImageObject: any) => {
    console.log('handleImageEditorSave called with:', editedImageObject)
    
    try {
      let base64: string
      let filename = editingImageName || 'edited.png'
      
      if (editedImageObject.imageBase64) {
        base64 = editedImageObject.imageBase64
      } else if (editedImageObject.editedImageObject?.imageBase64) {
        base64 = editedImageObject.editedImageObject.imageBase64
      } else if (typeof editedImageObject === 'string') {
        base64 = editedImageObject
      } else {
        console.error('Unexpected editedImageObject structure:', editedImageObject)
        return
      }
      
      if (editedImageObject.fullName) {
        filename = editedImageObject.fullName
      } else if (editedImageObject.name) {
        filename = editedImageObject.name
      }
      
      const blob = await fetch(base64).then(r => r.blob())
      const editedFile = new File([blob], filename, { type: blob.type })
      
      console.log('Created file:', editedFile)
      
      const imageUrl = URL.createObjectURL(blob)
      
      if (editingImageId && selectedImage) {
        console.log('Editing existing image with ID:', editingImageId)
        
        selectedImage.src = imageUrl
        selectedImage.alt = filename
        selectedImage.setAttribute('data-filename', filename)
        
        setFormData(prev => ({
          ...prev,
          images: prev.images.map(img => 
            img.id === editingImageId 
              ? { ...img, file: editedFile }
              : img
          )
        }))
        
        console.log('Existing image updated')
      } else {
        console.log('Inserting new image')
        
        if (!editorRef.current) {
          console.error('Editor ref not available')
          return
        }
        
        editorRef.current.focus()
        
        const imageId = createImageId()

        const imageContainer = document.createElement('div')
        imageContainer.style.textAlign = 'center'
        imageContainer.style.margin = '20px 0'
        imageContainer.style.display = 'block'
        imageContainer.style.width = '100%'
        imageContainer.setAttribute('contenteditable', 'false')
        
        const img = document.createElement('img')
        img.src = imageUrl
        img.alt = filename
        img.style.maxWidth = '100%'
        img.style.height = 'auto'
        img.style.cursor = 'pointer'
        img.style.border = '2px solid transparent'
        img.style.transition = 'all 0.2s'
        img.style.display = 'block'
        img.style.margin = '0 auto'
        img.setAttribute('data-filename', filename)
        img.setAttribute('data-image-id', imageId)
        img.setAttribute('data-caption', '')
        img.setAttribute('data-alt', filename)
        img.setAttribute('data-width-style', 'normal')
        
        img.addEventListener('click', (e) => {
          e.stopPropagation()
          handleImageClick(img, e as MouseEvent)
        })
        
        img.addEventListener('mouseenter', () => {
          img.style.borderColor = '#4B97C9'
        })
        img.addEventListener('mouseleave', () => {
          img.style.borderColor = 'transparent'
        })
        
        imageContainer.appendChild(img)
        
        const selection = window.getSelection()
        
        if (selection && savedSelectionRef.current && editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
          console.log('Using saved cursor position within editor')
          try {
            selection.removeAllRanges()
            selection.addRange(savedSelectionRef.current)
            
            const range = selection.getRangeAt(0)
            
            const startContainer = range.startContainer
            if (startContainer.nodeType === Node.TEXT_NODE) {
              const parentElement = startContainer.parentElement
              if (parentElement && editorRef.current.contains(parentElement)) {
                parentElement.parentNode?.insertBefore(imageContainer, parentElement.nextSibling)
              } else {
                editorRef.current.appendChild(imageContainer)
              }
            } else {
              range.insertNode(imageContainer)
            }
            
            range.setStartAfter(imageContainer)
            range.setEndAfter(imageContainer)
            selection.removeAllRanges()
            selection.addRange(range)
          } catch (selectionError) {
            console.error('Error with cursor position, appending to end:', selectionError)
            editorRef.current.appendChild(imageContainer)
          }
        } else {
          console.log('No valid saved cursor position, appending to end of editor')
          editorRef.current.appendChild(imageContainer)
        }
        
        const lineBreak = document.createElement('br')
        imageContainer.parentNode?.insertBefore(lineBreak, imageContainer.nextSibling)
        
        const currentImages = formData.images || []
        setFormData(prev => ({ 
          ...prev, 
          images: [...currentImages, { id: imageId, file: editedFile }] 
        }))
        
        console.log('New image added to formData.images, total images:', currentImages.length + 1)
      }
      
      savedSelectionRef.current = null
      handleEditorInput()
      setShowImageEditor(false)
      setImageToEdit(null)
      setEditingImageId(null)
      setEditingImageName('')
      
      console.log('Image editor closed successfully')
    } catch (error) {
      console.error('Error in handleImageEditorSave:', error)
      alert('Failed to save image. Please try again.')
    }
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
      if (formData.ogImageFile) {
        formDataToSend.append('ogImage', formData.ogImageFile)
      } else if (formData.og_image?.trim()) {
        formDataToSend.append('og_image', formData.og_image.trim())
      }
      formDataToSend.append('canonical_url', canonicalOverride ? formData.canonical_url : '')
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
          window.location.hash = '#/user/blog'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your blog post request has been submitted successfully.
          </p>
          <button 
            onClick={() => window.location.hash = '#/user/blog'} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Blog
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
        .editor-content img { max-width: 100%; height: auto; margin: 10px auto; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; display: block; }
        .editor-content img:hover { border-color: #4B97C9; }
        .editor-content div[contenteditable="false"] { text-align: center; margin: 20px 0; display: block; width: 100%; }
        .editor-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.location.hash = '#/user/blog'} 
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Submit Blog Post Request</h1>
                <p className="text-sm text-gray-600">Share your story with our community</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div ref={scrollContainerRef} className="bg-white rounded-lg shadow-sm border relative">
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Author Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
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
                <div>
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

              {/* Blog Title */}
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

              {/* Short Excerpt */}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                    <input
                      name="meta_title"
                      value={formData.meta_title}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        formData.meta_title.length > 65 ? 'border-amber-500' : formData.meta_title.length > 60 ? 'border-amber-300' : 'border-gray-300'
                      }`}
                      placeholder="Auto-filled from blog title"
                      maxLength={65}
                    />
                    <p className={`text-xs mt-1 ${formData.meta_title.length > 65 ? 'text-amber-600' : formData.meta_title.length > 60 ? 'text-amber-600' : 'text-gray-500'}`}>
                      {formData.meta_title.length}/65 {formData.meta_title.length > 60 && formData.meta_title.length <= 65 && '(may be truncated in search)'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Canonical URL</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={canonicalOverride}
                          onChange={e => setCanonicalOverride(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Advanced: Override canonical URL
                      </label>
                      <input
                        name="canonical_url"
                        value={canonicalOverride ? formData.canonical_url : `${getApiBase().replace(/\/$/, '')}/blog/[assigned-after-approval]`}
                        onChange={handleInputChange}
                        readOnly={!canonicalOverride}
                        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${!canonicalOverride ? 'bg-gray-100 text-gray-600' : ''}`}
                        placeholder="https://www.thenefol.com/blog/your-post"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    name="meta_description"
                    value={formData.meta_description}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formData.meta_description.length > 160 ? 'border-amber-500' : formData.meta_description.length > 155 ? 'border-amber-300' : 'border-gray-300'
                    }`}
                    rows={2}
                    maxLength={160}
                    placeholder="Auto-filled from excerpt or first paragraph. Google may rewrite this."
                  />
                  <p className={`text-xs mt-1 ${formData.meta_description.length > 155 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {formData.meta_description.length}/160 (ideal 140–155)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Tags</label>
                  <input
                    name="meta_keywords"
                    value={formData.meta_keywords}
                    onChange={handleInputChange}
                    list="blog-tags"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. skincare, routine, glowing skin"
                  />
                  <datalist id="blog-tags">
                    {existingTags.map(t => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                  <p className="text-xs text-gray-500 mt-1">
                    Used for categorization, related posts, and internal discovery. Max 5–8 tags, comma-separated.
                  </p>
                </div>

                {/* SEO Preview (collapsed) */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowSeoPreview(!showSeoPreview)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left text-sm font-medium text-gray-700"
                  >
                    SEO Preview (Google-style)
                    {showSeoPreview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {showSeoPreview && (
                    <div className="p-4 bg-white border-t border-gray-200 space-y-1">
                      <p className="text-blue-700 text-lg hover:underline cursor-default truncate">
                        {formData.meta_title || formData.title || 'Post title'}
                      </p>
                      <p className="text-green-700 text-sm truncate">
                        {getApiBase().replace(/\/$/, '')}/blog/...
                      </p>
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {formData.meta_description || formData.excerpt || 'Post description'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-800 mb-3">Open Graph (Social Sharing Preview)</h4>
                  <p className="text-xs text-gray-600 mb-3">
                    How your post appears when shared on Facebook, LinkedIn, Twitter, etc. Auto-filled from title and excerpt.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
                      <input
                        name="og_title"
                        value={formData.og_title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-filled from blog title"
                        maxLength={70}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                      <textarea
                        name="og_description"
                        value={formData.og_description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        maxLength={200}
                        placeholder="Auto-filled from excerpt"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Image (1200×630px recommended)</label>
                    <p className="text-xs text-gray-500 mb-2">Falls back to cover image if not provided</p>
                    <div className="flex flex-wrap gap-3 items-start">
                      <div className="flex flex-col gap-2">
                        {formData.ogImageFile ? (
                          <div className="relative inline-block">
                            <img
                              src={URL.createObjectURL(formData.ogImageFile)}
                              alt="OG preview"
                              className="h-24 w-40 object-cover rounded-lg border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={removeOgImage}
                              className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-24 w-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                            <Upload className="w-6 h-6 text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">Upload image</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleOgImageUpload}
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <input
                          name="og_image"
                          value={formData.og_image}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Or paste image URL"
                          disabled={!!formData.ogImageFile}
                        />
                        <div className="flex gap-2 mt-2">
                          {formData.coverImage && (
                            <button
                              type="button"
                              onClick={useCoverAsOg}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Use cover image instead
                            </button>
                          )}
                          {!formData.ogImageFile && !formData.og_image && formData.coverImage && (
                            <span className="text-xs text-gray-500">Cover image will be used if left empty</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Live social preview */}
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Preview (Facebook/LinkedIn)</p>
                    <div className="bg-white rounded-lg border border-gray-300 overflow-hidden max-w-md shadow-sm">
                      {(formData.ogImageFile || formData.og_image || formData.coverImage) && (
                        <div className="aspect-[1.91/1] bg-gray-200 overflow-hidden">
                          {formData.ogImageFile ? (
                            <img src={URL.createObjectURL(formData.ogImageFile)} alt="" className="w-full h-full object-cover" />
                          ) : formData.og_image ? (
                            <img src={formData.og_image} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          ) : formData.coverImage ? (
                            <img src={URL.createObjectURL(formData.coverImage)} alt="" className="w-full h-full object-cover" />
                          ) : null}
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">thenefol.com</p>
                        <p className="font-semibold text-gray-900 line-clamp-2 text-sm">
                          {formData.og_title || formData.meta_title || formData.title || 'Post title'}
                        </p>
                        <p className="text-gray-600 text-xs line-clamp-2 mt-0.5">
                          {formData.og_description || formData.meta_description || formData.excerpt || 'Post description'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Tags (For blog categorization)</label>
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
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setShowPreview(true)} 
                  className="w-full sm:w-auto px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <button 
                    type="button" 
                    onClick={() => window.location.hash = '#/user/blog'} 
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
                      'Submit Blog Request'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>   
   {/* Color Picker */}
      {showColorPicker && (
        <div
          className="absolute z-30 bg-white border border-gray-300 rounded-lg shadow-lg p-3"
          style={{ top: colorPickerPos.top, left: colorPickerPos.left }}
        >
          <div className="grid grid-cols-5 gap-2">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => applyColor(color)}
                className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link Text</label>
                <input
                  type="text"
                  value={linkData.text}
                  onChange={(e) => setLinkData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Enter link text..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Insert Link
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
            className="absolute z-[60] bg-white rounded-lg shadow-xl py-2 min-w-[200px] border border-gray-200"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-[90vw] h-[90vh] rounded overflow-hidden">
            <ImageEditor
              images={[]}
              setImages={() => {}}
              source={imageToEdit}
              onSave={handleImageEditorSave}
              onClose={() => {
                setShowImageEditor(false)
                setImageToEdit(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Terms & Conditions</h3>
            <div className="prose prose-sm max-w-none">
              <p>By submitting a blog post request, you agree to the following terms:</p>
              <ul>
                <li>Your content must be original and not violate any copyrights</li>
                <li>We reserve the right to edit or reject submissions</li>
                <li>Published content may be used for promotional purposes</li>
                <li>You retain ownership of your original content</li>
              </ul>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blog Preview Modal */}
      {showPreview && (
        <BlogPreview
          title={formData.title}
          excerpt={formData.excerpt}
          content={formData.content}
          authorName={formData.author_name}
          authorEmail={formData.author_email}
          coverImage={formData.coverImage}
          detailImage={formData.detailImage}
          categories={formData.categories}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}