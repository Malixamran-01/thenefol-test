import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Bold, Italic, Underline, Link as LinkIcon, List, ListOrdered, Palette, Image as ImageIcon, Youtube, MoreVertical, Edit3, FileText, Tag, Square, Maximize2, Maximize, Trash2, ArrowLeft, Eye, ChevronDown, ChevronUp, Save, WifiOff, RotateCcw, Info, Settings, Undo2, Redo2, Strikethrough, Quote } from 'lucide-react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import BlogPreview from '../components/BlogPreview'
import { getLocalDraft, saveLocalDraft, clearLocalDraft, getDraftAge, hasRealDraftContent, DEBOUNCE_MS, SERVER_SYNC_INTERVAL_MS, setActiveDraftTab, clearActiveDraftTab, isActiveDraftTab, getOrCreateDraftSessionId, clearDraftSessionId } from '../utils/blogDraft'

const EDIT_IMAGE_CTX_KEY = 'blog_edit_image_ctx'
const EDIT_IMAGE_RESULT_KEY = 'blog_edit_image_result'
const BLOG_FORM_STATE_KEY = 'blog_form_state'

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl?.includes(',') ? dataUrl.split(',')[1] ?? '' : ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function base64ToFile(base64: string, name: string, type: string): File {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], name, { type })
}

async function serializeFormDataForStorage(data: BlogRequest): Promise<string> {
  const cover = data.coverImage ? { name: data.coverImage.name, type: data.coverImage.type, base64: await fileToBase64(data.coverImage) } : null
  const detail = data.detailImage ? { name: data.detailImage.name, type: data.detailImage.type, base64: await fileToBase64(data.detailImage) } : null
  const og = data.ogImageFile ? { name: data.ogImageFile.name, type: data.ogImageFile.type, base64: await fileToBase64(data.ogImageFile) } : null
  const imgs = await Promise.all(data.images.map(async (i) => ({ id: i.id, name: i.file.name, type: i.file.type, base64: await fileToBase64(i.file) })))
  return JSON.stringify({
    ...data,
    coverImage: cover,
    detailImage: detail,
    ogImageFile: og,
    images: imgs,
  })
}

function deserializeFormDataFromStorage(json: string): BlogRequest {
  const raw = JSON.parse(json)
  const cover = raw.coverImage ? base64ToFile(raw.coverImage.base64, raw.coverImage.name, raw.coverImage.type) : null
  const detail = raw.detailImage ? base64ToFile(raw.detailImage.base64, raw.detailImage.name, raw.detailImage.type) : null
  const og = raw.ogImageFile ? base64ToFile(raw.ogImageFile.base64, raw.ogImageFile.name, raw.ogImageFile.type) : null
  const imgs = (raw.images || []).map((i: { id: string; name: string; type: string; base64: string }) => ({
    id: i.id,
    file: base64ToFile(i.base64, i.name, i.type),
  }))
  return {
    ...raw,
    coverImage: cover,
    detailImage: detail,
    ogImageFile: og,
    images: imgs,
  }
}
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
  const formDataRef = useRef<BlogRequest | null>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const colorButtonRef = useRef<HTMLButtonElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const imageMenuRef = useRef<HTMLDivElement>(null)

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
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null)
  const [imageMenuPos, setImageMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [showImageMenu, setShowImageMenu] = useState(false)
  const [imageCaption, setImageCaption] = useState('')
  const [imageAltText, setImageAltText] = useState('')
  const [showCaptionModal, setShowCaptionModal] = useState(false)
  const [showAltTextModal, setShowAltTextModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showSeoPreview, setShowSeoPreview] = useState(false)
  const [showSeoSection, setShowSeoSection] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showVersionHistoryModal, setShowVersionHistoryModal] = useState(false)
  const [showContentInfoModal, setShowContentInfoModal] = useState(false)
  const [draftVersions, setDraftVersions] = useState<Array<{ id: number; title: string; content: string; excerpt: string; status: string; version: number; createdAt: string; updatedAt: string; authorName: string; snapshotReason?: string }>>([])
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [showDraftToast, setShowDraftToast] = useState(false)
  const [showConflictBanner, setShowConflictBanner] = useState(false)
  const [editingInOtherTab, setEditingInOtherTab] = useState(false)
  const pendingDraftRestore = useRef<ReturnType<typeof getLocalDraft> | null>(null)
  const hasCheckedDraftRef = useRef(false)
  const discardedDraftRef = useRef(false)
  const draftIdRef = useRef<number | null>(null)
  const versionRef = useRef<number>(0)
  const sessionIdRef = useRef<string>(getOrCreateDraftSessionId())
  const [canonicalOverride, setCanonicalOverride] = useState(false)
  const [existingTags, setExistingTags] = useState<string[]>([])
  const [metaFieldsManuallyEdited, setMetaFieldsManuallyEdited] = useState({
    meta_title: false,
    meta_description: false,
    og_title: false,
    og_description: false
  })
  const [toolbarState, setToolbarState] = useState({
    block: 'p' as 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote',
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false
  })

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
    '#FFC0CB', '#A52A2A', '#808080', '#FFD700', '#4B0082'
  ]

  const categoryOptions = BLOG_CATEGORY_OPTIONS

  const getContentStats = useCallback(() => {
    const content = (editorRef.current?.innerHTML ?? formData.content) || ''
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const chars = text.length
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    const sentences = text ? (text.match(/[.!?]+/g)?.length ?? 1) : 0
    const readingTime = words > 0 ? Math.ceil(words / 200) : 0
    const speakingTime = words > 0 ? Math.ceil(words / 150) : 0
    return { chars, words, sentences, readingTime, speakingTime }
  }, [formData.content])

  const fetchDraftVersions = useCallback(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch(`${getApiBase()}/api/blog/drafts/versions?session_id=${encodeURIComponent(sessionIdRef.current)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setDraftVersions)
      .catch(() => setDraftVersions([]))
  }, [])

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // "New blog" intent: ?new=1 in URL means start fresh (clear session)
  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('?new=1')) {
      clearDraftSessionId()
      sessionIdRef.current = getOrCreateDraftSessionId()
      window.location.hash = hash.replace(/\?new=1/, '') || '#/user/blog/request'
    }
  }, [])

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
      const target = event.target as Node
      const clickedImage = selectedImage?.contains(target)
      const clickedMenu = imageMenuRef.current?.contains(target)
      if (showImageMenu && selectedImage && !clickedImage && !clickedMenu) {
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

  // Auto-fill OG and meta fields from title/excerpt/content in real time (unless user manually edited)
  const stripForMeta = (text: string, maxLen: number) =>
    text.replace(/<[^>]*>/g, ' ').replace(/[#*_~`\[\]()]/g, '').replace(/\s+/g, ' ').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim().slice(0, maxLen)
  const truncateTitle = (s: string, max = 65) => s.length <= max ? s : s.slice(0, max - 3).replace(/\s+\S*$/, '') + '...'
  useEffect(() => {
    setFormData(prev => {
      const updates: Partial<BlogRequest> = {}
      if (prev.title) {
        if (!metaFieldsManuallyEdited.meta_title) updates.meta_title = truncateTitle(prev.title, 60)
        if (!metaFieldsManuallyEdited.og_title) updates.og_title = prev.title
      }
      if (prev.excerpt) {
        if (!metaFieldsManuallyEdited.meta_description) updates.meta_description = stripForMeta(prev.excerpt, 155)
        if (!metaFieldsManuallyEdited.og_description) updates.og_description = stripForMeta(prev.excerpt, 200)
      }
      if (!metaFieldsManuallyEdited.meta_description && !prev.excerpt && prev.content) {
        const firstP = prev.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
        if (firstP) updates.meta_description = stripForMeta(firstP, 155)
      }
      return Object.keys(updates).length ? { ...prev, ...updates } : prev
    })
  }, [formData.title, formData.excerpt, formData.content, metaFieldsManuallyEdited])

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
    if (name === 'meta_title') setMetaFieldsManuallyEdited(prev => ({ ...prev, meta_title: value !== '' }))
    else if (name === 'meta_description') setMetaFieldsManuallyEdited(prev => ({ ...prev, meta_description: value !== '' }))
    else if (name === 'og_title') setMetaFieldsManuallyEdited(prev => ({ ...prev, og_title: value !== '' }))
    else if (name === 'og_description') setMetaFieldsManuallyEdited(prev => ({ ...prev, og_description: value !== '' }))
  }

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(item => item !== category)
        : [...prev.categories, category]
    }))
  }

  const getEditorContentForSave = () => {
    if (!editorRef.current) return ''
    const html = editorRef.current.innerHTML
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    tmp.querySelectorAll('.youtube-embed-remove').forEach((el) => el.remove())
    return tmp.innerHTML
  }

  const handleEditorInput = () => {
    if (editorRef.current) {
      setFormData(prev => ({
        ...prev,
        content: getEditorContentForSave()
      }))
    }
  }

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleEditorInput()
  }

  const ensureParagraphFormat = useCallback(() => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) return
    const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
    const validBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote']
    if (!validBlocks.includes(blockVal)) {
      document.execCommand('formatBlock', false, 'p')
      document.execCommand('foreColor', false, '#111827')
      if (editorRef.current) {
        setFormData(prev => ({ ...prev, content: getEditorContentForSave() }))
      }
    }
  }, [])

  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editorRef.current.contains(sel.anchorNode)) {
      setToolbarState({ block: 'p', bold: false, italic: false, underline: false, strikethrough: false })
      return
    }
    const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
    const validBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote']
    const block = validBlocks.includes(blockVal) ? (blockVal as 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote') : 'p'
    setToolbarState({
      block,
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough')
    })
    if (!validBlocks.includes(blockVal)) {
      ensureParagraphFormat()
    }
  }, [ensureParagraphFormat])

  useEffect(() => {
    const handler = () => updateToolbarState()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [updateToolbarState])

  // Ensure editor has a paragraph block when empty so typing starts in black
  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const html = editor.innerHTML.trim()
    if (!html || html === '<br>' || html === '<br/>') {
      editor.innerHTML = '<p><br></p>'
      const p = editor.querySelector('p')
      if (p) {
        const range = document.createRange()
        range.setStart(p, 0)
        range.collapse(true)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
    }
  }, [])

  const setBlockFormat = (block: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote') => {
    editorRef.current?.focus()
    const current = toolbarState.block
    if (block === 'p') {
      exec('formatBlock', 'p')
    } else if (block === 'blockquote') {
      if (current === 'blockquote') exec('formatBlock', 'p')
      else exec('formatBlock', 'blockquote')
    } else {
      if (current === block) exec('formatBlock', 'p')
      else exec('formatBlock', block)
    }
    setTimeout(updateToolbarState, 0)
  }

  const toggleFormat = (command: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    exec(command)
    setTimeout(updateToolbarState, 0)
  }

  const setBlockquote = () => {
    editorRef.current?.focus()
    const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
    if (blockVal === 'blockquote') {
      exec('formatBlock', 'p')
    } else {
      exec('formatBlock', 'blockquote')
    }
    setTimeout(updateToolbarState, 0)
  }

  const handleUndo = () => { editorRef.current?.focus(); exec('undo') }
  const handleRedo = () => { editorRef.current?.focus(); exec('redo') }

  const setHeading = (level: number) => {
    setBlockFormat(`h${level}` as 'h1' | 'h2' | 'h3' | 'h4')
  }

  const setParagraph = () => {
    setBlockFormat('p')
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

  const extractYouTubeVideoId = (url: string): string | null => {
    const trimmed = url.trim()
    if (!trimmed) return null
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ]
    for (const re of patterns) {
      const m = trimmed.match(re)
      if (m) return m[1]
    }
    return null
  }

  const insertYouTube = () => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    } else {
      const newRange = document.createRange()
      newRange.selectNodeContents(editorRef.current!)
      newRange.collapse(false)
      savedSelectionRef.current = newRange
    }
    setYoutubeUrl('')
    setShowYouTubeModal(true)
  }

  const removeYouTubeEmbed = (wrapper: HTMLElement) => {
    const br = wrapper.nextSibling
    if (br && br.nodeName === 'BR') br.remove()
    wrapper.remove()
    handleEditorInput()
  }

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Backspace' || !editorRef.current) return
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!editorRef.current.contains(range.startContainer)) return

    let nodeBefore: Node | null = null
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      if (range.startOffset > 0) return
      const parent = range.startContainer.parentNode
      if (!parent) return
      const idx = Array.from(parent.childNodes).indexOf(range.startContainer as ChildNode)
      nodeBefore = idx > 0 ? parent.childNodes[idx - 1] : parent.previousSibling
    } else {
      if (range.startOffset > 0) {
        nodeBefore = range.startContainer.childNodes[range.startOffset - 1]
      } else {
        nodeBefore = range.startContainer.previousSibling
      }
    }
    while (nodeBefore && nodeBefore.nodeType === Node.ELEMENT_NODE && (nodeBefore as Element).tagName === 'BR') {
      nodeBefore = nodeBefore.previousSibling
    }
    if (nodeBefore?.nodeType === Node.ELEMENT_NODE && (nodeBefore as HTMLElement).classList?.contains('youtube-embed-wrapper')) {
      removeYouTubeEmbed(nodeBefore as HTMLElement)
      e.preventDefault()
    }
  }

  const confirmYouTube = () => {
    const videoId = extractYouTubeVideoId(youtubeUrl)
    if (!videoId) {
      alert('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID)')
      return
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    const selection = window.getSelection()
    editorRef.current?.focus()

    if (selection && savedSelectionRef.current) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'youtube-embed-wrapper'
    wrapper.setAttribute('contenteditable', 'false')
    wrapper.setAttribute('data-youtube-embed', 'true')
    wrapper.style.cssText = 'position: relative; display: flex; justify-content: center; align-items: center; margin: 20px auto; width: 100%;'

    const inner = document.createElement('div')
    inner.style.cssText = 'display: flex; justify-content: center; width: 100%;'

    const iframe = document.createElement('iframe')
    iframe.src = embedUrl
    iframe.title = 'YouTube video'
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture')
    iframe.allowFullscreen = true
    iframe.style.cssText = 'max-width: 100%; width: 560px; height: 315px; border: 0; border-radius: 8px;'
    inner.appendChild(iframe)

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'youtube-embed-remove'
    removeBtn.innerHTML = '×'
    removeBtn.title = 'Remove video'
    removeBtn.style.cssText = 'position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; background: rgba(0,0,0,0.6); color: white; border: none; cursor: pointer; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; z-index: 10;'
    removeBtn.onclick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      removeYouTubeEmbed(wrapper)
    }
    wrapper.addEventListener('mouseenter', () => { removeBtn.style.opacity = '1' })
    wrapper.addEventListener('mouseleave', () => { removeBtn.style.opacity = '0' })
    wrapper.appendChild(inner)
    wrapper.appendChild(removeBtn)

    const br = document.createElement('br')

    if (selection && savedSelectionRef.current && editorRef.current?.contains(savedSelectionRef.current.commonAncestorContainer)) {
      try {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const startContainer = range.startContainer
        if (startContainer.nodeType === Node.TEXT_NODE && startContainer.parentElement) {
          const parent = startContainer.parentElement
          if (editorRef.current.contains(parent)) {
            parent.parentNode?.insertBefore(wrapper, parent.nextSibling)
            parent.parentNode?.insertBefore(br, wrapper.nextSibling)
          } else {
            range.insertNode(wrapper)
            wrapper.parentNode?.insertBefore(br, wrapper.nextSibling)
          }
        } else {
          range.insertNode(wrapper)
          wrapper.parentNode?.insertBefore(br, wrapper.nextSibling)
        }
        range.setStartAfter(br)
        range.setEndAfter(br)
        selection.removeAllRanges()
        selection.addRange(range)
      } catch {
        editorRef.current?.appendChild(wrapper)
        editorRef.current?.appendChild(br)
      }
    } else {
      editorRef.current?.appendChild(wrapper)
      editorRef.current?.appendChild(br)
    }

    handleEditorInput()
    setShowYouTubeModal(false)
    setYoutubeUrl('')
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
    
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB')
        return
      }
      
      const content = getEditorContentForSave()
      const dataToSave = { ...(formDataRef.current ?? formData), content }
      try {
        const serialized = await serializeFormDataForStorage(dataToSave)
        sessionStorage.setItem(BLOG_FORM_STATE_KEY, serialized)
        sessionStorage.setItem(EDIT_IMAGE_CTX_KEY, JSON.stringify({
          source: URL.createObjectURL(file),
          editingImageId: null,
          editingImageName: file.name,
        }))
        window.location.hash = '#/user/blog/edit-image'
      } catch (err) {
        console.error('Failed to save form state:', err)
        alert('Failed to save form. Please try again.')
      }
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
    const container = selectedImage.parentElement

    switch (width) {
      case 'wide': {
        selectedImage.style.maxWidth = '50%'
        selectedImage.style.width = '50%'
        selectedImage.style.marginLeft = 'auto'
        selectedImage.style.marginRight = 'auto'
        selectedImage.style.display = 'block'
        if (container) {
          container.style.overflow = ''
        }
        break
      }
      case 'full': {
        selectedImage.style.maxWidth = '100%'
        selectedImage.style.width = '100%'
        selectedImage.style.marginLeft = 'auto'
        selectedImage.style.marginRight = 'auto'
        selectedImage.style.display = 'block'
        if (container) {
          container.style.overflow = ''
        }
        break
      }
      default: {
        selectedImage.style.maxWidth = '100%'
        selectedImage.style.width = 'auto'
        selectedImage.style.marginLeft = 'auto'
        selectedImage.style.marginRight = 'auto'
        selectedImage.style.display = 'block'
        if (container) {
          container.style.overflow = ''
        }
        break
      }
    }
    selectedImage.setAttribute('data-width-style', width)
    setShowImageMenu(false)
    handleEditorInput()
  }

  const openImageEditor = async () => {
    if (!selectedImage) return
    const content = getEditorContentForSave()
    const dataToSave = { ...(formDataRef.current ?? formData), content }
    try {
      const serialized = await serializeFormDataForStorage(dataToSave)
      sessionStorage.setItem(BLOG_FORM_STATE_KEY, serialized)
      sessionStorage.setItem(EDIT_IMAGE_CTX_KEY, JSON.stringify({
        source: selectedImage.src,
        editingImageId: selectedImage.getAttribute('data-image-id'),
        editingImageName: selectedImage.getAttribute('data-filename') || 'edited-image',
      }))
      setShowImageMenu(false)
      window.location.hash = '#/user/blog/edit-image'
    } catch (err) {
      console.error('Failed to save form state:', err)
      alert('Failed to save form. Please try again.')
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
  const applyEditedImage = useCallback(async (
    editedImageObject: any,
    targetImageId: string | null,
    targetImageName: string,
    targetImg?: HTMLImageElement | null
  ) => {
    try {
      let base64: string
      let filename = targetImageName || 'edited.png'
      
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
      const imageUrl = URL.createObjectURL(blob)
      
      const imgToUpdate = targetImg ?? (targetImageId && editorRef.current
        ? editorRef.current.querySelector(`img[data-image-id="${targetImageId}"]`) as HTMLImageElement | null
        : null)
      
      if (targetImageId && imgToUpdate) {
        imgToUpdate.src = imageUrl
        imgToUpdate.alt = filename
        imgToUpdate.setAttribute('data-filename', filename)
        setFormData(prev => ({
          ...prev,
          images: prev.images.map(img => 
            img.id === targetImageId ? { ...img, file: editedFile } : img
          )
        }))
      } else {
        if (!editorRef.current) return
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
        img.addEventListener('mouseenter', () => { img.style.borderColor = '#4B97C9' })
        img.addEventListener('mouseleave', () => { img.style.borderColor = 'transparent' })
        
        imageContainer.appendChild(img)
        const selection = window.getSelection()
        
        if (selection && savedSelectionRef.current && editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
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
          } catch {
            editorRef.current.appendChild(imageContainer)
          }
        } else {
          editorRef.current.appendChild(imageContainer)
        }
        
        const lineBreak = document.createElement('br')
        imageContainer.parentNode?.insertBefore(lineBreak, imageContainer.nextSibling)
        setFormData(prev => ({ ...prev, images: [...(prev.images || []), { id: imageId, file: editedFile }] }))
      }
      
      savedSelectionRef.current = null
      handleEditorInput()
    } catch (error) {
      console.error('Error applying edited image:', error)
      alert('Failed to save image. Please try again.')
    }
  }, [handleImageClick, handleEditorInput])

  // Restore form state and process editor result when returning from full-page editor
  useEffect(() => {
    const formRaw = sessionStorage.getItem(BLOG_FORM_STATE_KEY)
    const resultRaw = sessionStorage.getItem(EDIT_IMAGE_RESULT_KEY)

    if (formRaw) {
      sessionStorage.removeItem(BLOG_FORM_STATE_KEY)
      try {
        const restored = deserializeFormDataFromStorage(formRaw)
        setFormData(restored)
        if (editorRef.current && restored.content) {
          editorRef.current.innerHTML = restored.content
        }
      } catch (e) {
        console.error('Failed to restore form state:', e)
      }
    }

    if (resultRaw) {
      sessionStorage.removeItem(EDIT_IMAGE_RESULT_KEY)
      const parsed = JSON.parse(resultRaw)
      setTimeout(() => {
        try {
          applyEditedImage(parsed.editedImageObject, parsed.editingImageId, parsed.editingImageName)
        } catch (e) {
          console.error('Failed to process editor result:', e)
        }
      }, 0)
    }

    // Check for explicit ?draft=id in URL (from Drafts modal "Edit")
    const hash = window.location.hash || ''
    const draftMatch = hash.match(/[?&]draft=(\d+)/)
    const explicitDraftId = draftMatch ? parseInt(draftMatch[1], 10) : null
    if (explicitDraftId && isAuthenticated && !formRaw) {
      hasCheckedDraftRef.current = true
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${getApiBase()}/api/blog/drafts/${explicitDraftId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((draft: any) => {
            if (!draft || !hasRealDraftContent(draft)) return
            const arr = (v: any): string[] =>
              Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
            const kw = draft.meta_keywords
            const metaKeywords = typeof kw === 'string' ? kw : Array.isArray(kw) ? (kw as string[]).join(', ') : ''
            setFormData((prev) => ({
              ...prev,
              title: draft.title || '',
              content: draft.content || '',
              excerpt: draft.excerpt || '',
              author_name: draft.author_name || prev.author_name,
              author_email: draft.author_email || prev.author_email,
              meta_title: draft.meta_title || '',
              meta_description: draft.meta_description || '',
              meta_keywords: metaKeywords,
              og_title: draft.og_title || '',
              og_description: draft.og_description || '',
              og_image: draft.og_image || '',
              canonical_url: draft.canonical_url || '',
              categories: arr(draft.categories),
              allow_comments: draft.allow_comments ?? true,
            }))
            if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
            draftIdRef.current = draft.status === 'auto' ? draft.id : null
            versionRef.current = draft.version ?? 0
            setLastSavedAt(new Date().toISOString())
            const cleanHash = hash.replace(/[?&]draft=\d+/, '').replace(/\?&/, '?').replace(/\?$/, '')
            window.location.hash = cleanHash || '#/user/blog/request'
          })
          .catch(() => {})
      }
      return
    }

    // Check for AUTO draft to restore (only once per mount). Prompt ONLY for recent auto (<24h). Never prompt for manual.
    if (!formRaw && !hasCheckedDraftRef.current) {
      hasCheckedDraftRef.current = true
      const ONE_DAY_MS = 24 * 60 * 60 * 1000
      const isRecent = (ts: number) => Date.now() - ts < ONE_DAY_MS

      const localDraft = getLocalDraft()
      const localHasContent = hasRealDraftContent(localDraft)
      const localTs = localDraft?.updatedAt ? new Date(localDraft.updatedAt).getTime() : 0
      const localRecent = localHasContent && isRecent(localTs)

      if (localRecent && !isAuthenticated) {
        pendingDraftRestore.current = localDraft
        setShowRestoreModal(true)
      } else if (isAuthenticated) {
        fetch(`${getApiBase()}/api/blog/drafts/latest?for_prompt=1&session_id=${encodeURIComponent(sessionIdRef.current)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        })
          .then(r => r.ok ? r.json() : null)
          .then((data: { auto?: any; manual?: any } | null) => {
            if (discardedDraftRef.current) return
            const serverAuto = data?.auto ?? null
            const serverTs = serverAuto?.updated_at
              ? new Date(serverAuto.updated_at).getTime()
              : serverAuto?.updatedAt
                ? new Date(serverAuto.updatedAt).getTime()
                : 0
            const serverHasContent = hasRealDraftContent(serverAuto)
            if (!localRecent && !serverHasContent) return
            if (serverAuto == null && localDraft?.draftId != null) {
              clearLocalDraft()
              return
            }
            const best = localTs >= serverTs && localRecent
              ? localDraft
              : serverHasContent
                ? { ...serverAuto, updatedAt: serverAuto.updated_at || serverAuto.updatedAt }
                : localRecent
                  ? localDraft
                  : null
            if (best && hasRealDraftContent(best)) {
              pendingDraftRestore.current = best
              setShowRestoreModal(true)
            }
          })
          .catch(() => {
            if (localRecent) {
              pendingDraftRestore.current = localDraft
              setShowRestoreModal(true)
            }
          })
      }
    }
  }, [applyEditedImage, isAuthenticated])

  // Offline detection
  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  // Local auto-save (debounced) - include draftId/version when we have them
  useEffect(() => {
    const payload: Record<string, unknown> = {
      title: formData.title,
      content: formData.content,
      excerpt: formData.excerpt,
      author_name: formData.author_name,
      author_email: formData.author_email,
      meta_title: formData.meta_title,
      meta_description: formData.meta_description,
      meta_keywords: formData.meta_keywords,
      og_title: formData.og_title,
      og_description: formData.og_description,
      og_image: formData.og_image,
      canonical_url: formData.canonical_url,
      categories: formData.categories,
      allow_comments: formData.allow_comments,
    }
    if (draftIdRef.current != null) payload.draftId = draftIdRef.current
    if (versionRef.current) payload.version = versionRef.current
    const t = setTimeout(() => {
      const updated = saveLocalDraft(payload as any)
      if (updated) setLastSavedAt(updated)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [formData.title, formData.content, formData.excerpt, formData.author_name, formData.author_email, formData.meta_title, formData.meta_description, formData.meta_keywords, formData.og_title, formData.og_description, formData.og_image, formData.canonical_url, formData.categories, formData.allow_comments])

  const syncToServer = useCallback((opts?: { keepalive?: boolean }) => {
    const fd = formDataRef.current
    if (!fd || !isAuthenticated || !user || isOffline) return
    const content = (editorRef.current?.innerHTML ?? fd.content) || ''
    const payload = {
      title: fd.title,
      content,
      excerpt: fd.excerpt,
      author_name: fd.author_name,
      author_email: fd.author_email,
      meta_title: fd.meta_title,
      meta_description: fd.meta_description,
      meta_keywords: fd.meta_keywords,
      og_title: fd.og_title,
      og_description: fd.og_description,
      og_image: fd.og_image,
      canonical_url: fd.canonical_url,
      categories: fd.categories,
      allow_comments: fd.allow_comments,
      draftId: draftIdRef.current,
      version: versionRef.current || undefined,
    }
    if (!hasRealDraftContent(payload)) return
    const token = localStorage.getItem('token')
    if (!token) return
    const url = `${getApiBase()}/api/blog/drafts/auto`
    const body = JSON.stringify({ ...payload, session_id: sessionIdRef.current })
    if (opts?.keepalive) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
        keepalive: true,
      }).catch(() => {})
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body,
      })
        .then(async r => {
          if (r.ok) {
            const data = await r.json().catch(() => ({}))
            if (data?.draftId) draftIdRef.current = data.draftId
            if (data?.version != null) versionRef.current = data.version
            setLastSavedAt(new Date().toISOString())
          } else if (r.status === 409) {
            const data = await r.json().catch(() => ({}))
            setShowConflictBanner(true)
          }
        })
        .catch(() => {})
    }
  }, [isAuthenticated, user, isOffline])

  // Server draft sync: 45s interval + forced on blur / tab close / visibility hidden
  useEffect(() => {
    if (!isAuthenticated || !user || isOffline) return
    const id = setInterval(() => syncToServer(), SERVER_SYNC_INTERVAL_MS)
    syncToServer()
    return () => clearInterval(id)
  }, [isAuthenticated, user, isOffline, syncToServer])

  // Forced save on tab close / navigation (best-effort)
  useEffect(() => {
    const onBeforeUnload = () => syncToServer({ keepalive: true })
    const onPageHide = () => syncToServer({ keepalive: true })
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') syncToServer({ keepalive: true })
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [syncToServer])

  // Tab lock: claim active tab on mount, clear on unmount, detect other tabs
  useEffect(() => {
    setActiveDraftTab()
    const unsub = isActiveDraftTab(active => setEditingInOtherTab(!active))
    return () => {
      unsub()
      clearActiveDraftTab()
    }
  }, [])

  const handleRestoreDraft = () => {
    const draft = pendingDraftRestore.current
    if (draft) {
      const arr = (v: any): string[] => (Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : [])
      const kw = draft.meta_keywords
      const metaKeywords = typeof kw === 'string' ? kw : (Array.isArray(kw) ? (kw as string[]).join(', ') : '')
      setFormData(prev => ({
        ...prev,
        title: draft.title || '',
        content: draft.content || '',
        excerpt: draft.excerpt || '',
        author_name: draft.author_name || prev.author_name,
        author_email: draft.author_email || prev.author_email,
        meta_title: draft.meta_title || '',
        meta_description: draft.meta_description || '',
        meta_keywords: metaKeywords,
        og_title: draft.og_title || '',
        og_description: draft.og_description || '',
        og_image: draft.og_image || '',
        canonical_url: draft.canonical_url || '',
        categories: arr(draft.categories),
        allow_comments: draft.allow_comments ?? true,
      }))
      requestAnimationFrame(() => {
        if (editorRef.current && draft.content) {
          editorRef.current.innerHTML = draft.content
        }
      })
      const d = draft as any
      draftIdRef.current = d.id ?? d.draftId ?? null
      if (d.version != null) versionRef.current = d.version
    }
    pendingDraftRestore.current = null
    setShowRestoreModal(false)
  }

  const handleKeepForLater = () => {
    pendingDraftRestore.current = null
    setShowRestoreModal(false)
  }

  const handleDiscardDraft = async () => {
    const token = localStorage.getItem('token')
    const draft = pendingDraftRestore.current as { id?: number; draftId?: number; post_id?: number } | null
    const draftId = draft?.id ?? draft?.draftId

    if (token) {
      try {
        await fetch(`${getApiBase()}/api/blog/drafts/discard-current`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            draft_id: draftId ?? undefined,
            session_id: sessionIdRef.current,
            post_id: draft?.post_id ?? null,
          }),
        })
      } catch {
        // fall back to local discard behavior
      }
    }

    discardedDraftRef.current = true
    draftIdRef.current = null
    versionRef.current = 0
    clearLocalDraft()
    clearDraftSessionId()
    sessionIdRef.current = getOrCreateDraftSessionId()
    pendingDraftRestore.current = null
    setShowRestoreModal(false)

    // Reset form to empty so user starts fresh
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      author_name: user?.name ?? formData.author_name,
      author_email: user?.email ?? formData.author_email,
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
      allow_comments: true,
    })
    if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>'
  }

  const handleLoadLatest = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${getApiBase()}/api/blog/drafts/auto`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const draft = res.ok ? await res.json() : null
      if (draft && hasRealDraftContent(draft)) {
        const arr = (v: any): string[] => (Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : [])
        const kw = draft.meta_keywords
        const metaKeywords = typeof kw === 'string' ? kw : (Array.isArray(kw) ? (kw as string[]).join(', ') : '')
        setFormData(prev => ({
          ...prev,
          title: draft.title || '',
          content: draft.content || '',
          excerpt: draft.excerpt || '',
          author_name: draft.author_name || prev.author_name,
          author_email: draft.author_email || prev.author_email,
          meta_title: draft.meta_title || '',
          meta_description: draft.meta_description || '',
          meta_keywords: metaKeywords,
          og_title: draft.og_title || '',
          og_description: draft.og_description || '',
          og_image: draft.og_image || '',
          canonical_url: draft.canonical_url || '',
          categories: arr(draft.categories),
          allow_comments: draft.allow_comments ?? true,
        }))
        if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
        draftIdRef.current = draft.id
        versionRef.current = draft.version ?? 0
        setLastSavedAt(new Date().toISOString())
      }
    } catch { /* ignore */ }
    setShowConflictBanner(false)
  }

  const handleDismissConflict = () => setShowConflictBanner(false)

  const handleSaveDraft = async () => {
    const content = (editorRef.current?.innerHTML ?? formData.content) || ''
    const payload = {
      title: formData.title,
      content,
      excerpt: formData.excerpt,
      author_name: formData.author_name,
      author_email: formData.author_email,
      meta_title: formData.meta_title,
      meta_description: formData.meta_description,
      meta_keywords: formData.meta_keywords,
      og_title: formData.og_title,
      og_description: formData.og_description,
      og_image: formData.og_image,
      canonical_url: formData.canonical_url,
      categories: formData.categories,
      allow_comments: formData.allow_comments,
    }
    if (!hasRealDraftContent(payload)) {
      setErrorMessage('Add a title, excerpt, or content before saving a draft.')
      return
    }
    saveLocalDraft(payload)
    setLastSavedAt(new Date().toISOString())
    setIsSavingDraft(true)
    setErrorMessage('')
    try {
      const token = localStorage.getItem('token')
      if (token && !isOffline) {
        const res = await fetch(`${getApiBase()}/api/blog/drafts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ...payload,
            name: formData.title?.trim() || undefined,
            session_id: sessionIdRef.current,
          }),
        })
        if (res.ok) {
          setShowDraftToast(true)
          setTimeout(() => setShowDraftToast(false), 3000)
        } else {
          const data = await res.json().catch(() => ({}))
          setErrorMessage(data.message || 'Failed to save draft')
        }
      } else {
        setShowDraftToast(true)
        setTimeout(() => setShowDraftToast(false), 3000)
      }
    } catch {
      setErrorMessage('Failed to save draft')
    } finally {
      setIsSavingDraft(false)
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
        draftIdRef.current = null
        versionRef.current = 0
        clearLocalDraft()
        const token = localStorage.getItem('token')
        if (token) {
          clearDraftSessionId()
          fetch(`${apiBase}/api/blog/drafts/auto?session_id=${encodeURIComponent(sessionIdRef.current)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
        }
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
            className="px-6 py-2 text-white rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(75,151,201)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
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
          color: #111827;
        }
        .editor-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
        .editor-content h4 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
        .editor-content p { margin: 0.5em 0; color: #111827; }
        .editor-content blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #d1d5db; color: #6b7280; font-style: italic; }
        .editor-content ul { list-style: disc; margin-left: 2em; padding-left: 0.5em; }
        .editor-content ol { list-style: decimal; margin-left: 2em; padding-left: 0.5em; }
        .editor-content li { margin: 0.25em 0; padding-left: 0.25em; }
        .editor-content a { color: #4B97C9; text-decoration: underline; }
        .editor-content img { max-width: 100%; height: auto; margin: 10px auto; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; display: block; }
        .editor-content img:hover { border-color: #4B97C9; }
        .editor-content div[contenteditable="false"] { text-align: center; margin: 20px 0; display: block; width: 100%; }
        .editor-content .youtube-embed-wrapper { position: relative; display: flex; justify-content: center; align-items: center; margin: 20px auto; width: 100%; }
        .editor-content .youtube-embed-wrapper iframe { max-width: 100%; width: 560px; height: 315px; border: 0; border-radius: 8px; }
        .editor-content .youtube-embed-remove:hover { background: rgba(0,0,0,0.8) !important; }
        .editor-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
      `}</style>
      
      <div className="min-h-screen bg-gray-50">
        {/* Header - clean minimal design */}
        <div className="bg-white shadow-sm border-b transition-all duration-300">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.location.hash = '#/user/blog'} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                {lastSavedAt && !isOffline && (
                  <span className="flex items-center gap-1.5 text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Saved
                  </span>
                )}
                {editingInOtherTab && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Editing in another tab
                  </span>
                )}
                {isOffline && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                type="submit"
                form="blog-form"
                disabled={isSubmitting || !agreedToTerms}
                className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Submit Blog Request
              </button>
            </div>
          </div>
        </div>

        {/* Conflict banner (non-blocking) */}
        {showConflictBanner && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">This draft was updated in another tab. Reload latest or continue here.</span>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleDismissConflict}
                  className="px-3 py-1.5 text-sm border border-amber-300 rounded-lg hover:bg-amber-100 text-amber-800"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={handleLoadLatest}
                  className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                >
                  Load latest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - whole-page notes app layout */}
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
          <div ref={scrollContainerRef} className="bg-white rounded-lg shadow-sm border relative">
            <form id="blog-form" onSubmit={handleSubmit} className="min-h-[70vh] flex flex-col">
              {/* Toolbar - above content */}
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex flex-wrap gap-1 items-center overflow-x-auto shrink-0">
                <button type="button" onClick={handleUndo} className="p-2 rounded hover:bg-gray-200 text-gray-600" title="Undo"><Undo2 className="w-4 h-4" /></button>
                <button type="button" onClick={handleRedo} className="p-2 rounded hover:bg-gray-200 text-gray-600" title="Redo"><Redo2 className="w-4 h-4" /></button>
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <div className="flex gap-0.5">
                  <button type="button" onClick={setParagraph} className={`px-2 py-1.5 rounded text-xs font-medium ${toolbarState.block === 'p' ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Paragraph">P</button>
                  {[1, 2, 3, 4].map(h => (
                    <button key={h} type="button" onClick={() => setHeading(h)} className={`px-2 py-1.5 rounded text-xs font-semibold ${toolbarState.block === `h${h}` ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title={`Heading ${h}`}>H{h}</button>
                  ))}
                </div>
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <button type="button" onClick={() => toggleFormat('bold')} className={`p-2 rounded ${toolbarState.bold ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Bold"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => toggleFormat('italic')} className={`p-2 rounded ${toolbarState.italic ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Italic"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={() => toggleFormat('underline')} className={`p-2 rounded ${toolbarState.underline ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Underline"><Underline className="w-4 h-4" /></button>
                <button type="button" onClick={() => toggleFormat('strikeThrough')} className={`p-2 rounded ${toolbarState.strikethrough ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Strikethrough"><Strikethrough className="w-4 h-4" /></button>
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <button type="button" onClick={insertLink} className="p-2 rounded text-gray-600 hover:bg-gray-200" title="Link"><LinkIcon className="w-4 h-4" /></button>
                <button type="button" onClick={insertImageIntoEditor} className="p-2 rounded text-gray-600 hover:bg-gray-200" title="Image"><ImageIcon className="w-4 h-4" /></button>
                <button type="button" onClick={insertYouTube} className="p-2 rounded text-gray-600 hover:bg-gray-200" title="YouTube"><Youtube className="w-4 h-4" /></button>
                <button type="button" onClick={setBlockquote} className={`p-2 rounded ${toolbarState.block === 'blockquote' ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Quote"><Quote className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertList(false)} className="p-2 rounded text-gray-600 hover:bg-gray-200" title="Bullet List"><List className="w-4 h-4" /></button>
                <button type="button" onClick={() => insertList(true)} className="p-2 rounded text-gray-600 hover:bg-gray-200" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                <span className="w-px h-5 bg-gray-300 mx-1" />
                <button type="button" onClick={toggleColorPicker} className="p-2 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-600" ref={colorButtonRef} title="Text Color">
                  <Palette className="w-4 h-4" />
                  <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: currentColor }} />
                </button>
              </div>

              {/* Content area - title, subtitle, categories, body - notes app flow */}
              <div className="flex-1 flex flex-col px-6 py-6 sm:px-8 sm:py-8">
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full text-2xl sm:text-3xl font-bold text-gray-900 placeholder-gray-400 border-none focus:ring-0 focus:outline-none py-1 mb-2"
                  placeholder="Title"
                  required
                  disabled={isSubmitting}
                />
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  className="w-full text-base text-gray-500 placeholder-gray-400 border-none focus:ring-0 focus:outline-none resize-none py-1 mb-3 min-h-[4rem]"
                  placeholder="Add a subtitle..."
                  required
                  disabled={isSubmitting}
                  rows={2}
                />
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {formData.categories.map(cat => (
                    <span key={cat} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
                      {cat}
                      <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ))}
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  onInput={handleEditorInput}
                  onKeyDown={handleEditorKeyDown}
                  onFocus={updateToolbarState}
                  onBlur={() => {
                    const fd = formDataRef.current
                    if (fd) {
                      const content = (editorRef.current?.innerHTML ?? fd.content) || ''
                      const payload = { ...fd, content }
                      saveLocalDraft(payload)
                      setLastSavedAt(new Date().toISOString())
                      syncToServer()
                    }
                  }}
                  onClick={updateToolbarState}
                  className="editor-content flex-1 min-h-[320px] overflow-y-auto outline-none text-base text-gray-800 w-full pt-1"
                  data-placeholder="Start writing..."
                  suppressContentEditableWarning
                />
              </div>

              {/* Author info - compact, at bottom of form area */}
              <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 rounded-b-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input name="author_name" value={formData.author_name} onChange={handleInputChange} placeholder="Your name *" required disabled={isSubmitting || (isAuthenticated && !!user?.name)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] focus:border-[rgb(75,151,201)]" />
                  <input name="author_email" value={formData.author_email} onChange={handleInputChange} placeholder="Email *" required disabled={isSubmitting || (isAuthenticated && !!user?.email)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] focus:border-[rgb(75,151,201)]" />
                </div>
              </div> 
             {/* Cover & Detail Image Uploads - compact side-by-side */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 px-6 pb-6 sm:px-8 sm:pb-8">
                {/* Cover Image */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Cover Image * <span className="text-xs font-normal text-gray-500">800×420px, 4:5 peferred</span>
                  </label>
                  {formData.coverImage ? (
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
                      <img
                        src={URL.createObjectURL(formData.coverImage)}
                        alt="Cover preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" id="cover-image-replace" disabled={isSubmitting} />
                        <label htmlFor="cover-image-replace" className="px-3 py-1.5 bg-white/90 text-gray-800 text-xs font-medium rounded cursor-pointer hover:bg-white">Replace</label>
                        <button type="button" onClick={removeCoverImage} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded hover:bg-red-500" disabled={isSubmitting}>
                          Remove
                        </button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{formData.coverImage.name}</p>
                    </div>
                  ) : (
                    <label
                      htmlFor="cover-image-upload"
                      className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)] hover:bg-[rgba(75,151,201,0.08)] transition-all group"
                    >
                      <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" id="cover-image-upload" disabled={isSubmitting} />
                      <Upload className="w-8 h-8 text-gray-400 transition-colors group-hover:text-[rgb(75,151,201)]" />
                      <span className="text-sm text-gray-600 group-hover:text-[rgb(75,151,201)]">Choose cover image</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</span>
                    </label>
                  )}
                </div>

                {/* Detail Page Image */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Detail Image <span className="text-xs font-normal text-gray-500">Optional · Below title</span>
                  </label>
                  {formData.detailImage ? (
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
                      <img
                        src={URL.createObjectURL(formData.detailImage)}
                        alt="Detail preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <input type="file" accept="image/*" onChange={handleDetailImageUpload} className="hidden" id="detail-image-replace" disabled={isSubmitting} />
                        <label htmlFor="detail-image-replace" className="px-3 py-1.5 bg-white/90 text-gray-800 text-xs font-medium rounded cursor-pointer hover:bg-white">Replace</label>
                        <button type="button" onClick={removeDetailImage} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded hover:bg-red-500" disabled={isSubmitting}>
                          Remove
                        </button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{formData.detailImage.name}</p>
                    </div>
                  ) : (
                    <label
                      htmlFor="detail-image-upload"
                      className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)] hover:bg-[rgba(75,151,201,0.08)] transition-all group"
                    >
                      <input type="file" accept="image/*" onChange={handleDetailImageUpload} className="hidden" id="detail-image-upload" disabled={isSubmitting} />
                      <Upload className="w-8 h-8 text-gray-400 transition-colors group-hover:text-[rgb(75,151,201)]" />
                      <span className="text-sm text-gray-600 group-hover:text-[rgb(75,151,201)]">Choose detail image</span>
                      <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</span>
                    </label>
                  )}
                </div>
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
                  className="mt-1 w-4 h-4 rounded focus:ring-2 focus:ring-[rgb(75,151,201)]"
                style={{ accentColor: 'rgb(75,151,201)' }}
                />
                <label htmlFor="terms" className="text-sm text-gray-700">
                  I agree to the{' '}
                  <button 
                    type="button" 
                    onClick={() => setShowTermsModal(true)} 
                    className="underline font-medium transition-colors hover:text-[rgb(60,120,160)]"
                    style={{ color: 'rgb(75,151,201)' }}
                  >
                    Terms & Conditions
                  </button>
                </label>
              </div>

              {/* Action Buttons: Version History, Content Info, Preview | Cancel, Save Draft, Settings */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => { fetchDraftVersions(); setShowVersionHistoryModal(true) }}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
                    title="Version history"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContentInfoModal(true)}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-all duration-200"
                    title="Post info"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowPreview(true)} 
                    className="px-4 py-2 border-2 rounded-lg transition-colors font-medium flex items-center gap-2"
                    style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(75,151,201,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                    disabled={isSubmitting}
                  >
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                </div>
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
                    type="button" 
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || isSavingDraft}
                    className="w-full sm:w-auto px-6 py-3 border-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
                    onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(75,151,201,0.08)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    {isSavingDraft ? (
                      <>
                        <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(75,151,201)' }} />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Draft
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettingsModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200"
                    title="SEO & Sharing"
                  >
                    <Settings className="w-4 h-4" />
                    Settings
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

      {/* YouTube Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Insert YouTube Video</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]"
              />
              <p className="text-xs text-gray-500 mt-2">Paste a YouTube link to embed the video (centered, like images)</p>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={() => { setShowYouTubeModal(false); setYoutubeUrl('') }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmYouTube}
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Insert Video
              </button>
            </div>
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
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL</label>
                <input
                  type="url"
                  value={linkData.url}
                  onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]"
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
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
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
            ref={imageMenuRef}
            className="absolute z-[60] bg-white rounded-lg shadow-xl py-2 min-w-[200px] border border-gray-200"
            style={{ top: imageMenuPos.top, left: imageMenuPos.left }}
          >
            <button
              type="button"
              onClick={() => { setShowImageMenu(false); openImageEditor() }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <Edit3 className="w-4 h-4 text-gray-700" />
              Edit image
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImageMenu(false)
                setShowCaptionModal(true)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <FileText className="w-4 h-4 text-gray-700" />
              Edit caption
            </button>
            <button
              type="button"
              onClick={() => {
                setShowImageMenu(false)
                setShowAltTextModal(true)
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <Tag className="w-4 h-4 text-gray-700" />
              Edit alt text
            </button>
            <div className="border-t border-gray-200 my-2" />
            <button
              type="button"
              onClick={() => setImageWidth('normal')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <Square className="w-4 h-4 text-gray-700" />
              Normal width
            </button>
            <button
              type="button"
              onClick={() => setImageWidth('wide')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <Maximize2 className="w-4 h-4 text-gray-700" />
              Half width
            </button>
            <button
              type="button"
              onClick={() => setImageWidth('full')}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800"
            >
              <Maximize className="w-4 h-4 text-gray-700" />
              Full width
            </button>
            <div className="border-t border-gray-200 my-2" />
            <button
              type="button"
              onClick={deleteImage}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]"
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
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
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
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]"
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
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Restore Modal */}
      {showRestoreModal && pendingDraftRestore.current && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Unsaved draft found</h3>
            <p className="text-sm text-gray-600 mb-6">
              We found an unsaved draft from {getDraftAge(pendingDraftRestore.current)}.
            </p>
            <div className="space-y-3">
              <button
                onClick={handleRestoreDraft}
                className="w-full px-4 py-3 text-white rounded-lg font-medium transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Restore draft
              </button>
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleKeepForLater}
                  className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors"
                >
                  Keep for later
                </button>
                <button
                  onClick={handleDiscardDraft}
                  className="flex-1 px-4 py-2.5 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                >
                  Discard permanently
                </button>
              </div>
            </div>
            {/* <p className="text-xs text-gray-400 mt-4 text-center">
              Keep for later keeps your draft. Discard removes it and its h
            </p> */}
            <p className="text-xs text-gray-400 mt-1 text-center">
              Auto draft expires in 24 hours.
            </p>
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
                className="px-4 py-2 text-white rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(75,151,201)' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft saved toast */}
      {showDraftToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-slate-900/90 text-white rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium">Draft saved</span>
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

      {/* Settings Modal - SEO & Sharing */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[75] p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-in" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Settings — SEO & Sharing</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input name="meta_title" value={formData.meta_title} onChange={handleInputChange} className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] ${formData.meta_title.length > 65 ? 'border-amber-500' : 'border-gray-300'}`} placeholder="Auto-filled from title" maxLength={65} />
                  <p className="text-xs mt-1 text-gray-500">{formData.meta_title.length}/65</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Canonical URL</label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={canonicalOverride} onChange={e => setCanonicalOverride(e.target.checked)} className="rounded" />
                      Override
                    </label>
                  </div>
                  <input name="canonical_url" value={canonicalOverride ? formData.canonical_url : `${getApiBase().replace(/\/$/, '')}/blog/[assigned-after-approval]`} onChange={handleInputChange} readOnly={!canonicalOverride} className={`w-full px-4 py-2.5 border rounded-lg ${!canonicalOverride ? 'bg-gray-100' : 'border-gray-300'}`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                <textarea name="meta_description" value={formData.meta_description} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]" rows={2} maxLength={160} placeholder="Auto-filled from excerpt" />
                <p className="text-xs mt-1 text-gray-500">{formData.meta_description.length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Tags</label>
                <input name="meta_keywords" value={formData.meta_keywords} onChange={handleInputChange} list="blog-tags" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)]" placeholder="skincare, routine, glowing skin" />
                <datalist id="blog-tags">{existingTags.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Open Graph (Social Sharing)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
                    <input name="og_title" value={formData.og_title} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" maxLength={70} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                    <textarea name="og_description" value={formData.og_description} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg" rows={2} maxLength={200} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">OG Image</label>
                  <div className="flex gap-3">
                    {formData.ogImageFile ? (
                      <div className="relative">
                        <img src={URL.createObjectURL(formData.ogImageFile)} alt="" className="h-24 w-40 object-cover rounded-lg border" />
                        <button type="button" onClick={removeOgImage} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-24 w-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)]">
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-xs text-gray-500">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleOgImageUpload} />
                      </label>
                    )}
                    <input name="og_image" value={formData.og_image} onChange={handleInputChange} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg" placeholder="Or paste URL" disabled={!!formData.ogImageFile} />
                  </div>
                  {formData.coverImage && (
                    <button type="button" onClick={useCoverAsOg} className="text-xs hover:underline mt-2 transition-colors" style={{ color: 'rgb(75,151,201)' }}>Use cover image</button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map(c => (
                    <button key={c} type="button" onClick={() => toggleCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.categories.includes(c) ? 'text-white' : 'bg-white text-gray-700 border-gray-300 hover:border-[rgb(75,151,201)]'}`} style={formData.categories.includes(c) ? { backgroundColor: 'rgb(75,151,201)', borderColor: 'rgb(75,151,201)' } : undefined}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Allow Comments</p>
                  <p className="text-xs text-gray-500">Readers can comment on this post</p>
                </div>
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={formData.allow_comments} onChange={e => setFormData(prev => ({ ...prev, allow_comments: e.target.checked }))} className="rounded" />
                  <span className="text-sm">{formData.allow_comments ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[75] p-4" onClick={() => setShowVersionHistoryModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-modal-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Version history</h3>
              <button onClick={() => setShowVersionHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 p-6 border-r overflow-y-auto">
                {selectedVersionId ? (
                  (() => {
                    const v = draftVersions.find(x => x.id === selectedVersionId)
                    const text = v ? (v.content || '').replace(/<[^>]*>/g, ' ').trim() : ''
                    return (
                      <div className="prose prose-sm max-w-none">
                        {text ? <p className="whitespace-pre-wrap">{text.slice(0, 2000)}{text.length > 2000 ? '...' : ''}</p> : (
                          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <FileText className="w-16 h-16 mb-4" />
                            <p className="font-medium text-gray-600">This version is empty</p>
                            <p className="text-sm">Please select another version</p>
                          </div>
                        )}
                      </div>
                    )
                  })()
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <FileText className="w-16 h-16 mb-4" />
                    <p className="font-medium text-gray-600">This version is empty</p>
                    <p className="text-sm">Please select another version</p>
                  </div>
                )}
              </div>
              <div className="w-72 flex-shrink-0 overflow-y-auto">
                <div className="p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">From database</p>
                  {draftVersions.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4">No versions yet</p>
                  ) : (
                    draftVersions.map((v, i) => {
                      const d = new Date(v.updatedAt || v.createdAt)
                      const isCurrent = i === 0
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedVersionId(v.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-all duration-200 ${selectedVersionId === v.id ? 'bg-[rgba(75,151,201,0.12)] ring-1 ring-[rgb(75,151,201)]' : 'hover:bg-gray-50'} ${isCurrent ? 'border-l-4 border-[rgb(75,151,201)]' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]">Latest</span>}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{d.toLocaleString()}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            {v.snapshotReason === 'MANUAL_SAVE' ? 'Manual save' : v.snapshotReason === 'PUBLISH' ? 'Before publish' : v.snapshotReason === 'RESTORE' ? 'Restored' : 'Auto snapshot'}
                          </p>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <span className="text-gray-500 text-sm">Select a version to preview or restore</span>
              <div className="flex gap-2">
                <button onClick={() => setShowVersionHistoryModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Cancel</button>
                <button
                  disabled={!selectedVersionId}
                  onClick={async () => {
                    if (!selectedVersionId) return
                    const token = localStorage.getItem('token')
                    if (!token) return
                    try {
                      const res = await fetch(`${getApiBase()}/api/blog/drafts/restore/${selectedVersionId}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ session_id: sessionIdRef.current })
                      })
                      const draft = res.ok ? await res.json() : null
                      if (draft) {
                        const arr = (x: any): string[] => (Array.isArray(x) ? x : typeof x === 'string' ? (() => { try { const p = JSON.parse(x); return Array.isArray(p) ? p : [] } catch { return [] } })() : [])
                        const kw = draft.meta_keywords
                        const metaKeywords = typeof kw === 'string' ? kw : (Array.isArray(kw) ? (kw as string[]).join(', ') : '')
                        setFormData(prev => ({ ...prev, title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', meta_title: draft.meta_title || '', meta_description: draft.meta_description || '', meta_keywords: metaKeywords, og_title: draft.og_title || '', og_description: draft.og_description || '', og_image: draft.og_image || '', canonical_url: draft.canonical_url || '', categories: arr(draft.categories), allow_comments: draft.allow_comments ?? true }))
                        if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
                        draftIdRef.current = draft.id
                        versionRef.current = draft.version ?? 0
                      }
                    } catch {}
                    setShowVersionHistoryModal(false)
                  }}
                  className="px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'rgb(75,151,201)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'; }}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}
                >
                  Restore draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Info Modal (Post info) */}
      {showContentInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[75] p-4" onClick={() => setShowContentInfoModal(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-modal-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Post info</h3>
            {(() => {
              const s = getContentStats()
              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Characters</span>
                    <span className="text-sm font-medium text-gray-900">{s.chars}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Words</span>
                    <span className="text-sm font-medium text-gray-900">{s.words}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Sentences</span>
                    <span className="text-sm font-medium text-gray-900">{s.sentences}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Reading time</span>
                    <span className="text-sm font-medium text-gray-900">{s.readingTime} min</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-600">Speaking time</span>
                    <span className="text-sm font-medium text-gray-900">{s.speakingTime} min</span>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </>
  )
}