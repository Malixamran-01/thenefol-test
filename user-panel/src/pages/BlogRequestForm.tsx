import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, WarningCircle, TextB, TextItalic, TextUnderline, Link, ListBullets, ListNumbers, Palette, Image, YoutubeLogo, PencilSimple, FileText, Tag, Square, ArrowsOut, ArrowsIn, Trash, ArrowLeft, FloppyDisk, WifiSlash, ClockCounterClockwise, Info, Gear, ArrowUUpLeft, ArrowUUpRight, TextStrikethrough, Quotes, Question, Plus, DotsThree } from '@phosphor-icons/react'
import { getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import BlogPreview from '../components/BlogPreview'
import ImageEditor from '../components/ImageEditor'
import VersionHistoryModal from '../components/VersionHistoryModal'
import { getLocalDraft, saveLocalDraft, clearLocalDraft, getDraftAge, hasRealDraftContent, DEBOUNCE_MS, SERVER_SYNC_INTERVAL_MS, setActiveDraftTab, clearActiveDraftTab, isActiveDraftTab, getOrCreateDraftSessionId, clearDraftSessionId } from '../utils/blogDraft'
import { BLOG_CATEGORY_OPTIONS } from '../constants/blogCategories'

interface ImageEditorCtx {
  source: string
  editingImageId: string | null
  editingImageName: string
}

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
  const titleRef = useRef<HTMLDivElement>(null)
  const subtitleRef = useRef<HTMLDivElement>(null)
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
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const categoryPickerRef = useRef<HTMLDivElement>(null)
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
  const [toolbarExpanded, setToolbarExpanded] = useState(false)
  // Mobile: show extra toolbar items in overflow menu
  const [showToolbarOverflow, setShowToolbarOverflow] = useState(false)
  const toolbarOverflowRef = useRef<HTMLDivElement>(null)
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
  const [activeEditableType, setActiveEditableType] = useState<'title' | 'subtitle' | 'editor' | null>(null)
  const [imageEditorCtx, setImageEditorCtx] = useState<ImageEditorCtx | null>(null)

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
    const params = new URLSearchParams()
    params.set('session_id', sessionIdRef.current)
    if (draftIdRef.current != null) params.set('draft_id', String(draftIdRef.current))
    fetch(`${getApiBase()}/api/blog/drafts/versions?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setDraftVersions)
      .catch(() => setDraftVersions([]))
  }, [])

  useEffect(() => { formDataRef.current = formData }, [formData])

  useEffect(() => {
    const hash = window.location.hash || ''
    if (hash.includes('?new=1')) {
      clearDraftSessionId()
      sessionIdRef.current = getOrCreateDraftSessionId()
      window.location.hash = hash.replace(/\?new=1/, '') || '#/user/blog/request'
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) window.location.hash = '#/user/blog'
  }, [isAuthenticated])

  useEffect(() => {
    fetch(`${getApiBase()}/api/blog/tags`)
      .then(r => r.ok ? r.json() : [])
      .then(setExistingTags)
      .catch(() => setExistingTags([]))
  }, [])

  // Close toolbar overflow on outside click
  useEffect(() => {
    if (!showToolbarOverflow) return
    const handler = (e: MouseEvent) => {
      if (toolbarOverflowRef.current && !toolbarOverflowRef.current.contains(e.target as Node)) {
        setShowToolbarOverflow(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showToolbarOverflow])

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
      if (showImageMenu) { setShowImageMenu(false); setSelectedImage(null) }
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
      setFormData(prev => ({ ...prev, author_name: user.name || '', author_email: user.email || '' }))
    }
  }, [isAuthenticated, user])

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

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    const handleImageClickInEditor = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG') { e.stopPropagation(); handleImageClick(target as HTMLImageElement, e as MouseEvent) }
    }
    editor.addEventListener('click', handleImageClickInEditor)
    return () => editor.removeEventListener('click', handleImageClickInEditor)
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

  const isEditorContentEmpty = (content: string) => {
    const stripped = (content || '')
      .replace(/<p><br><\/p>/gi, '').replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/g, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return stripped.length === 0
  }

  const handleEditorInput = () => {
    if (editorRef.current) setFormData(prev => ({ ...prev, content: getEditorContentForSave() }))
  }

  const getActiveEditable = (): HTMLDivElement | null => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    const node = sel.anchorNode
    if (!node) return null
    const el = node.nodeType === Node.ELEMENT_NODE ? node as Element : node.parentElement
    if (!el) return null
    if (titleRef.current?.contains(el)) return titleRef.current
    if (subtitleRef.current?.contains(el)) return subtitleRef.current
    if (editorRef.current?.contains(el)) return editorRef.current
    return null
  }

  const syncActiveEditable = (el: HTMLDivElement | null) => {
    if (!el) return
    if (el === titleRef.current) setFormData(prev => ({ ...prev, title: el.innerHTML }))
    else if (el === subtitleRef.current) setFormData(prev => ({ ...prev, excerpt: el.innerHTML }))
    else if (el === editorRef.current) handleEditorInput()
  }

  const exec = (command: string, value?: string) => {
    const active = getActiveEditable()
    if (!active) return
    document.execCommand(command, false, value)
    syncActiveEditable(active)
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
      if (editorRef.current) setFormData(prev => ({ ...prev, content: getEditorContentForSave() }))
    }
  }, [])

  const updateToolbarState = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
      setToolbarState({ block: 'p', bold: false, italic: false, underline: false, strikethrough: false })
      setActiveEditableType(null)
      return
    }
    const node = sel.anchorNode
    const el = node?.nodeType === Node.ELEMENT_NODE ? node as Element : node?.parentElement
    if (!el) {
      setToolbarState({ block: 'p', bold: false, italic: false, underline: false, strikethrough: false })
      setActiveEditableType(null)
      return
    }
    const getBlockState = () => ({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikethrough: document.queryCommandState('strikeThrough')
    })
    if (titleRef.current?.contains(el)) {
      setActiveEditableType('title')
      const blockVal = (document.queryCommandValue('formatBlock') || 'h1').toLowerCase()
      const validBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote']
      setToolbarState({ block: validBlocks.includes(blockVal) ? (blockVal as any) : 'h1', ...getBlockState() })
      return
    }
    if (subtitleRef.current?.contains(el)) {
      setActiveEditableType('subtitle')
      const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
      const validBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote']
      setToolbarState({ block: validBlocks.includes(blockVal) ? (blockVal as any) : 'p', ...getBlockState() })
      return
    }
    if (editorRef.current?.contains(el)) {
      setActiveEditableType('editor')
      const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
      const validBlocks = ['p', 'h1', 'h2', 'h3', 'h4', 'blockquote']
      setToolbarState({ block: validBlocks.includes(blockVal) ? (blockVal as any) : 'p', ...getBlockState() })
      if (!validBlocks.includes(blockVal)) ensureParagraphFormat()
      return
    }
    setToolbarState({ block: 'p', bold: false, italic: false, underline: false, strikethrough: false })
    setActiveEditableType(null)
  }, [ensureParagraphFormat])

  useEffect(() => {
    const handler = () => updateToolbarState()
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [updateToolbarState])

  useEffect(() => {
    if (document.activeElement !== titleRef.current && titleRef.current) {
      if (formData.title !== titleRef.current.innerHTML) titleRef.current.innerHTML = formData.title
    }
    if (document.activeElement !== subtitleRef.current && subtitleRef.current) {
      if (formData.excerpt !== subtitleRef.current.innerHTML) subtitleRef.current.innerHTML = formData.excerpt
    }
  }, [formData.title, formData.excerpt])

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
    const current = toolbarState.block
    if (block === 'p') exec('formatBlock', 'p')
    else if (block === 'blockquote') {
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
    const blockVal = (document.queryCommandValue('formatBlock') || 'p').toLowerCase()
    if (blockVal === 'blockquote') exec('formatBlock', 'p')
    else exec('formatBlock', 'blockquote')
    setTimeout(updateToolbarState, 0)
  }

  const handleUndo = () => { editorRef.current?.focus(); exec('undo') }
  const handleRedo = () => { editorRef.current?.focus(); exec('redo') }
  const setHeading = (level: number) => setBlockFormat(`h${level}` as any)
  const setParagraph = () => setBlockFormat('p')

  const normalizeUrl = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  const insertLink = () => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    else savedSelectionRef.current = null
    setLinkData({ text: selection?.toString() || '', url: '' })
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
      exec('insertHTML', `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer" style="color: #4B97C9; text-decoration: underline;">${linkText}</a>`)
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
    for (const re of patterns) { const m = trimmed.match(re); if (m) return m[1] }
    return null
  }

  const insertYouTube = () => {
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
    else {
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
      if (range.startOffset > 0) nodeBefore = range.startContainer.childNodes[range.startOffset - 1]
      else nodeBefore = range.startContainer.previousSibling
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
    if (!videoId) { alert('Please enter a valid YouTube URL'); return }
    const embedUrl = `https://www.youtube.com/embed/${videoId}`
    const selection = window.getSelection()
    editorRef.current?.focus()
    if (selection && savedSelectionRef.current) { selection.removeAllRanges(); selection.addRange(savedSelectionRef.current) }
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
    removeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); removeYouTubeEmbed(wrapper) }
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
          if (editorRef.current.contains(parent)) { parent.parentNode?.insertBefore(wrapper, parent.nextSibling); parent.parentNode?.insertBefore(br, wrapper.nextSibling) }
          else { range.insertNode(wrapper); wrapper.parentNode?.insertBefore(br, wrapper.nextSibling) }
        } else { range.insertNode(wrapper); wrapper.parentNode?.insertBefore(br, wrapper.nextSibling) }
        range.setStartAfter(br); range.setEndAfter(br)
        selection.removeAllRanges(); selection.addRange(range)
      } catch { editorRef.current?.appendChild(wrapper); editorRef.current?.appendChild(br) }
    } else { editorRef.current?.appendChild(wrapper); editorRef.current?.appendChild(br) }
    handleEditorInput()
    setShowYouTubeModal(false)
    setYoutubeUrl('')
  }

  const applyColor = (color: string) => { setCurrentColor(color); exec('foreColor', color); setShowColorPicker(false) }

  const toggleColorPicker = () => {
    const button = colorButtonRef.current
    const container = scrollContainerRef.current
    if (!button || !container) { setShowColorPicker(prev => !prev); return }
    const rect = button.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    setColorPickerPos({ top: rect.bottom - containerRect.top + container.scrollTop + 8, left: rect.left - containerRect.left + container.scrollLeft })
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
      setColorPickerPos({ top: rect.bottom - containerRect.top + container.scrollTop + 8, left: rect.left - containerRect.left + container.scrollLeft })
    }
    window.addEventListener('resize', handleScrollOrResize)
    const scrollEl = scrollContainerRef.current
    scrollEl?.addEventListener('scroll', handleScrollOrResize)
    return () => { window.removeEventListener('resize', handleScrollOrResize); scrollEl?.removeEventListener('scroll', handleScrollOrResize) }
  }, [showColorPicker])

  const insertList = (ordered: boolean) => {
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return
    if (ordered) exec('insertOrderedList')
    else exec('insertUnorderedList')
    editorRef.current.focus()
  }

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFormData(prev => ({ ...prev, coverImage: file }))
  }
  const removeCoverImage = () => setFormData(prev => ({ ...prev, coverImage: null }))

  const handleDetailImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setFormData(prev => ({ ...prev, detailImage: file }))
  }
  const removeDetailImage = () => setFormData(prev => ({ ...prev, detailImage: null }))

  const handleOgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) setFormData(prev => ({ ...prev, ogImageFile: file, og_image: '' }))
  }
  const removeOgImage = () => setFormData(prev => ({ ...prev, ogImageFile: null }))
  const useCoverAsOg = () => setFormData(prev => ({ ...prev, ogImageFile: null, og_image: '' }))

  const createImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const insertImageIntoEditor = () => {
    if (!editorRef.current) return
    editorRef.current.focus()
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      if (editorRef.current.contains(range.commonAncestorContainer)) savedSelectionRef.current = range.cloneRange()
      else { const nr = document.createRange(); nr.selectNodeContents(editorRef.current); nr.collapse(false); savedSelectionRef.current = nr }
    } else { const nr = document.createRange(); nr.selectNodeContents(editorRef.current); nr.collapse(false); savedSelectionRef.current = nr }
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return }
      setImageEditorCtx({ source: URL.createObjectURL(file), editingImageId: null, editingImageName: file.name })
    }
    input.click()
  }

  const handleImageClick = (img: HTMLImageElement, e: MouseEvent) => {
    setSelectedImage(img)
    const scrollContainer = scrollContainerRef.current
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const menuTop = e.clientY - containerRect.top + scrollContainer.scrollTop
      const menuLeft = e.clientX - containerRect.left + scrollContainer.scrollLeft
      setImageMenuPos({ top: Math.min(menuTop, scrollContainer.scrollHeight - 300), left: Math.min(menuLeft, scrollContainer.clientWidth - 220) })
    } else setImageMenuPos({ top: e.clientY, left: e.clientX })
    setShowImageMenu(true)
    setImageCaption(img.getAttribute('data-caption') || '')
    setImageAltText(img.getAttribute('data-alt') || img.alt)
  }

  const deleteImage = () => {
    if (selectedImage && selectedImage.parentNode) {
      const imageId = selectedImage.getAttribute('data-image-id')
      if (imageId) setFormData(prev => ({ ...prev, images: prev.images.filter(item => item.id !== imageId) }))
      const caption = selectedImage.nextElementSibling
      if (caption?.classList?.contains('image-caption')) caption.parentNode?.removeChild(caption)
      selectedImage.parentNode.removeChild(selectedImage)
      setShowImageMenu(false)
      setSelectedImage(null)
      handleEditorInput()
    }
  }

  const setImageWidth = (width: 'normal' | 'wide' | 'full') => {
    if (!selectedImage) return
    const container = selectedImage.parentElement
    if (width === 'wide') { selectedImage.style.maxWidth = '50%'; selectedImage.style.width = '50%' }
    else if (width === 'full') { selectedImage.style.maxWidth = '100%'; selectedImage.style.width = '100%' }
    else { selectedImage.style.maxWidth = '100%'; selectedImage.style.width = 'auto' }
    selectedImage.style.marginLeft = 'auto'
    selectedImage.style.marginRight = 'auto'
    selectedImage.style.display = 'block'
    if (container) container.style.overflow = ''
    selectedImage.setAttribute('data-width-style', width)
    setShowImageMenu(false)
    handleEditorInput()
  }

  const openImageEditor = () => {
    if (!selectedImage) return
    setShowImageMenu(false)
    setImageEditorCtx({ source: selectedImage.src, editingImageId: selectedImage.getAttribute('data-image-id'), editingImageName: selectedImage.getAttribute('data-filename') || 'edited-image' })
  }

  const saveImageCaption = () => {
    if (selectedImage) {
      selectedImage.setAttribute('data-caption', imageCaption)
      let caption = selectedImage.nextElementSibling as HTMLParagraphElement | null
      if (!caption || !caption.classList.contains('image-caption')) {
        caption = document.createElement('p')
        caption.classList.add('image-caption')
        caption.style.cssText = 'font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center;'
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
      if (editedImageObject.imageBase64) base64 = editedImageObject.imageBase64
      else if (editedImageObject.editedImageObject?.imageBase64) base64 = editedImageObject.editedImageObject.imageBase64
      else if (typeof editedImageObject === 'string') base64 = editedImageObject
      else { console.error('Unexpected editedImageObject structure:', editedImageObject); return }
      if (editedImageObject.fullName) filename = editedImageObject.fullName
      else if (editedImageObject.name) filename = editedImageObject.name
      const blob = await fetch(base64).then(r => r.blob())
      const editedFile = new File([blob], filename, { type: blob.type })
      const imageUrl = URL.createObjectURL(blob)
      const imgToUpdate = targetImg ?? (targetImageId && editorRef.current ? editorRef.current.querySelector(`img[data-image-id="${targetImageId}"]`) as HTMLImageElement | null : null)
      if (targetImageId && imgToUpdate) {
        imgToUpdate.src = imageUrl
        imgToUpdate.alt = filename
        imgToUpdate.setAttribute('data-filename', filename)
        setFormData(prev => ({ ...prev, images: prev.images.map(img => img.id === targetImageId ? { ...img, file: editedFile } : img) }))
      } else {
        if (!editorRef.current) return
        editorRef.current.focus()
        const imageId = createImageId()
        const imageContainer = document.createElement('div')
        imageContainer.style.cssText = 'text-align: center; margin: 20px 0; display: block; width: 100%;'
        imageContainer.setAttribute('contenteditable', 'false')
        const img = document.createElement('img')
        img.src = imageUrl
        img.alt = filename
        img.style.cssText = 'max-width: 100%; height: auto; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; display: block; margin: 0 auto;'
        img.setAttribute('data-filename', filename)
        img.setAttribute('data-image-id', imageId)
        img.setAttribute('data-caption', '')
        img.setAttribute('data-alt', filename)
        img.setAttribute('data-width-style', 'normal')
        img.addEventListener('click', (e) => { e.stopPropagation(); handleImageClick(img, e as MouseEvent) })
        img.addEventListener('mouseenter', () => { img.style.borderColor = '#4B97C9' })
        img.addEventListener('mouseleave', () => { img.style.borderColor = 'transparent' })
        imageContainer.appendChild(img)
        const selection = window.getSelection()
        if (selection && savedSelectionRef.current && editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer)) {
          try {
            selection.removeAllRanges(); selection.addRange(savedSelectionRef.current)
            const range = selection.getRangeAt(0)
            const startContainer = range.startContainer
            if (startContainer.nodeType === Node.TEXT_NODE) {
              const parentElement = startContainer.parentElement
              if (parentElement && editorRef.current.contains(parentElement)) parentElement.parentNode?.insertBefore(imageContainer, parentElement.nextSibling)
              else editorRef.current.appendChild(imageContainer)
            } else range.insertNode(imageContainer)
            range.setStartAfter(imageContainer); range.setEndAfter(imageContainer)
            selection.removeAllRanges(); selection.addRange(range)
          } catch { editorRef.current.appendChild(imageContainer) }
        } else editorRef.current.appendChild(imageContainer)
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

  useEffect(() => {
    const hash = window.location.hash || ''
    const draftMatch = hash.match(/[?&]draft=(\d+)/)
    const explicitDraftId = draftMatch ? parseInt(draftMatch[1], 10) : null
    if (explicitDraftId && isAuthenticated) {
      hasCheckedDraftRef.current = true
      const token = localStorage.getItem('token')
      if (token) {
        fetch(`${getApiBase()}/api/blog/drafts/${explicitDraftId}`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => (r.ok ? r.json() : null))
          .then((draft: any) => {
            if (!draft || !hasRealDraftContent(draft)) return
            const arr = (v: any): string[] => Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
            const kw = draft.meta_keywords
            setFormData((prev) => ({ ...prev, title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', author_name: draft.author_name || prev.author_name, author_email: draft.author_email || prev.author_email, meta_title: draft.meta_title || '', meta_description: draft.meta_description || '', meta_keywords: typeof kw === 'string' ? kw : Array.isArray(kw) ? kw.join(', ') : '', og_title: draft.og_title || '', og_description: draft.og_description || '', og_image: draft.og_image || '', canonical_url: draft.canonical_url || '', categories: arr(draft.categories), allow_comments: draft.allow_comments ?? true }))
            if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
            draftIdRef.current = draft.id ?? null
            versionRef.current = draft.version ?? 0
            setLastSavedAt(new Date().toISOString())
            const cleanHash = hash.replace(/[?&]draft=\d+/, '').replace(/\?&/, '?').replace(/\?$/, '')
            window.location.hash = cleanHash || '#/user/blog/request'
          }).catch(() => {})
      }
      return
    }
    if (!hasCheckedDraftRef.current) {
      hasCheckedDraftRef.current = true
      const ONE_DAY_MS = 24 * 60 * 60 * 1000
      const isRecent = (ts: number) => Date.now() - ts < ONE_DAY_MS
      const localDraft = getLocalDraft()
      const localHasContent = hasRealDraftContent(localDraft)
      const localTs = localDraft?.updatedAt ? new Date(localDraft.updatedAt).getTime() : 0
      const localRecent = localHasContent && isRecent(localTs)
      if (localRecent && !isAuthenticated) { pendingDraftRestore.current = localDraft; setShowRestoreModal(true) }
      else if (isAuthenticated) {
        fetch(`${getApiBase()}/api/blog/drafts/latest?for_prompt=1&session_id=${encodeURIComponent(sessionIdRef.current)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } })
          .then(r => r.ok ? r.json() : null)
          .then((data: { auto?: any; manual?: any } | null) => {
            if (discardedDraftRef.current) return
            const serverAuto = data?.auto ?? null
            const serverTs = serverAuto?.updated_at ? new Date(serverAuto.updated_at).getTime() : serverAuto?.updatedAt ? new Date(serverAuto.updatedAt).getTime() : 0
            const serverHasContent = hasRealDraftContent(serverAuto)
            if (!localRecent && !serverHasContent) return
            if (serverAuto == null && localDraft?.draftId != null) { clearLocalDraft(); return }
            const best = localTs >= serverTs && localRecent ? localDraft : serverHasContent ? { ...serverAuto, updatedAt: serverAuto.updated_at || serverAuto.updatedAt } : localRecent ? localDraft : null
            if (best && hasRealDraftContent(best)) { pendingDraftRestore.current = best; setShowRestoreModal(true) }
          }).catch(() => { if (localRecent) { pendingDraftRestore.current = localDraft; setShowRestoreModal(true) } })
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline) }
  }, [])

  useEffect(() => {
    if (!showCategoryPicker) return
    const handler = (e: MouseEvent) => {
      if (categoryPickerRef.current && !categoryPickerRef.current.contains(e.target as Node)) setShowCategoryPicker(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showCategoryPicker])

  useEffect(() => {
    const payload: Record<string, unknown> = { title: formData.title, content: formData.content, excerpt: formData.excerpt, author_name: formData.author_name, author_email: formData.author_email, meta_title: formData.meta_title, meta_description: formData.meta_description, meta_keywords: formData.meta_keywords, og_title: formData.og_title, og_description: formData.og_description, og_image: formData.og_image, canonical_url: formData.canonical_url, categories: formData.categories, allow_comments: formData.allow_comments }
    if (draftIdRef.current != null) payload.draftId = draftIdRef.current
    if (versionRef.current) payload.version = versionRef.current
    const t = setTimeout(() => { const updated = saveLocalDraft(payload as any); if (updated) setLastSavedAt(updated) }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [formData.title, formData.content, formData.excerpt, formData.author_name, formData.author_email, formData.meta_title, formData.meta_description, formData.meta_keywords, formData.og_title, formData.og_description, formData.og_image, formData.canonical_url, formData.categories, formData.allow_comments])

  const syncToServer = useCallback((opts?: { keepalive?: boolean }) => {
    const fd = formDataRef.current
    if (!fd || !isAuthenticated || !user || isOffline) return
    const content = (editorRef.current?.innerHTML ?? fd.content) || ''
    const payload = { title: fd.title, content, excerpt: fd.excerpt, author_name: fd.author_name, author_email: fd.author_email, meta_title: fd.meta_title, meta_description: fd.meta_description, meta_keywords: fd.meta_keywords, og_title: fd.og_title, og_description: fd.og_description, og_image: fd.og_image, canonical_url: fd.canonical_url, categories: fd.categories, allow_comments: fd.allow_comments, draftId: draftIdRef.current, version: versionRef.current || undefined }
    if (!hasRealDraftContent(payload)) return
    const token = localStorage.getItem('token')
    if (!token) return
    const url = `${getApiBase()}/api/blog/drafts/auto`
    const body = JSON.stringify({ ...payload, session_id: sessionIdRef.current })
    if (opts?.keepalive) {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body, keepalive: true }).catch(() => {})
    } else {
      fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body })
        .then(async r => {
          if (r.ok) {
            const data = await r.json().catch(() => ({}))
            const sentDraftId = payload.draftId ?? draftIdRef.current
            if (data?.draftId != null && (sentDraftId == null || data.draftId === sentDraftId)) { draftIdRef.current = data.draftId; if (data?.version != null) versionRef.current = data.version }
            setLastSavedAt(new Date().toISOString())
          } else if (r.status === 409) setShowConflictBanner(true)
        }).catch(() => {})
    }
  }, [isAuthenticated, user, isOffline])

  useEffect(() => {
    if (!isAuthenticated || !user || isOffline) return
    const id = setInterval(() => syncToServer(), SERVER_SYNC_INTERVAL_MS)
    syncToServer()
    return () => clearInterval(id)
  }, [isAuthenticated, user, isOffline, syncToServer])

  useEffect(() => {
    const onBeforeUnload = () => syncToServer({ keepalive: true })
    const onPageHide = () => syncToServer({ keepalive: true })
    const onVisibilityChange = () => { if (document.visibilityState === 'hidden') syncToServer({ keepalive: true }) }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); window.removeEventListener('pagehide', onPageHide); document.removeEventListener('visibilitychange', onVisibilityChange) }
  }, [syncToServer])

  useEffect(() => {
    setActiveDraftTab()
    const unsub = isActiveDraftTab(active => setEditingInOtherTab(!active))
    return () => { unsub(); clearActiveDraftTab() }
  }, [])

  const handleRestoreDraft = () => {
    const draft = pendingDraftRestore.current
    if (draft) {
      const arr = (v: any): string[] => Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
      const kw = draft.meta_keywords
      setFormData(prev => ({ ...prev, title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', author_name: draft.author_name || prev.author_name, author_email: draft.author_email || prev.author_email, meta_title: draft.meta_title || '', meta_description: draft.meta_description || '', meta_keywords: typeof kw === 'string' ? kw : Array.isArray(kw) ? (kw as string[]).join(', ') : '', og_title: draft.og_title || '', og_description: draft.og_description || '', og_image: draft.og_image || '', canonical_url: draft.canonical_url || '', categories: arr(draft.categories), allow_comments: draft.allow_comments ?? true }))
      requestAnimationFrame(() => { if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content })
      const d = draft as any
      draftIdRef.current = d.id ?? d.draftId ?? null
      if (d.version != null) versionRef.current = d.version
    }
    pendingDraftRestore.current = null
    setShowRestoreModal(false)
  }

  const handleKeepForLater = () => { pendingDraftRestore.current = null; setShowRestoreModal(false) }

  const handleDiscardDraft = async () => {
    const token = localStorage.getItem('token')
    const draft = pendingDraftRestore.current as { id?: number; draftId?: number; post_id?: number } | null
    const draftId = draft?.id ?? draft?.draftId
    if (token) {
      try {
        await fetch(`${getApiBase()}/api/blog/drafts/discard-current`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ draft_id: draftId ?? undefined, session_id: sessionIdRef.current, post_id: draft?.post_id ?? null }) })
      } catch {}
    }
    discardedDraftRef.current = true
    draftIdRef.current = null
    versionRef.current = 0
    clearLocalDraft()
    clearDraftSessionId()
    sessionIdRef.current = getOrCreateDraftSessionId()
    pendingDraftRestore.current = null
    setShowRestoreModal(false)
    setFormData({ title: '', content: '', excerpt: '', author_name: user?.name ?? formData.author_name, author_email: user?.email ?? formData.author_email, coverImage: null, detailImage: null, ogImageFile: null, images: [], meta_title: '', meta_description: '', meta_keywords: '', og_title: '', og_description: '', og_image: '', canonical_url: '', categories: [], allow_comments: true })
    if (editorRef.current) editorRef.current.innerHTML = '<p><br></p>'
    if (titleRef.current) titleRef.current.innerHTML = ''
    if (subtitleRef.current) subtitleRef.current.innerHTML = ''
  }

  const handleLoadLatest = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch(`${getApiBase()}/api/blog/drafts/auto`, { headers: { Authorization: `Bearer ${token}` } })
      const draft = res.ok ? await res.json() : null
      if (draft && hasRealDraftContent(draft)) {
        const arr = (v: any): string[] => Array.isArray(v) ? v : typeof v === 'string' ? (() => { try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
        const kw = draft.meta_keywords
        setFormData(prev => ({ ...prev, title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', author_name: draft.author_name || prev.author_name, author_email: draft.author_email || prev.author_email, meta_title: draft.meta_title || '', meta_description: draft.meta_description || '', meta_keywords: typeof kw === 'string' ? kw : Array.isArray(kw) ? kw.join(', ') : '', og_title: draft.og_title || '', og_description: draft.og_description || '', og_image: draft.og_image || '', canonical_url: draft.canonical_url || '', categories: arr(draft.categories), allow_comments: draft.allow_comments ?? true }))
        if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
        setTimeout(() => { if (titleRef.current && draft.title) titleRef.current.innerHTML = draft.title; if (subtitleRef.current && draft.excerpt) subtitleRef.current.innerHTML = draft.excerpt }, 0)
        draftIdRef.current = draft.id
        versionRef.current = draft.version ?? 0
        setLastSavedAt(new Date().toISOString())
      }
    } catch {}
    setShowConflictBanner(false)
  }

  const handleDismissConflict = () => setShowConflictBanner(false)

  const handleSaveDraft = async () => {
    const content = (editorRef.current?.innerHTML ?? formData.content) || ''
    const payload = { title: formData.title, content, excerpt: formData.excerpt, author_name: formData.author_name, author_email: formData.author_email, meta_title: formData.meta_title, meta_description: formData.meta_description, meta_keywords: formData.meta_keywords, og_title: formData.og_title, og_description: formData.og_description, og_image: formData.og_image, canonical_url: formData.canonical_url, categories: formData.categories, allow_comments: formData.allow_comments }
    if (!hasRealDraftContent(payload)) { setErrorMessage('Add a title, excerpt, or content before saving a draft.'); return }
    saveLocalDraft(payload)
    setLastSavedAt(new Date().toISOString())
    setIsSavingDraft(true)
    setErrorMessage('')
    try {
      const token = localStorage.getItem('token')
      if (token && !isOffline) {
        const res = await fetch(`${getApiBase()}/api/blog/drafts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...payload, name: formData.title?.trim() || undefined, session_id: sessionIdRef.current }) })
        if (res.ok) { setShowDraftToast(true); setTimeout(() => setShowDraftToast(false), 3000) }
        else { const data = await res.json().catch(() => ({})); setErrorMessage(data.message || 'Failed to save draft') }
      } else { setShowDraftToast(true); setTimeout(() => setShowDraftToast(false), 3000) }
    } catch { setErrorMessage('Failed to save draft') }
    finally { setIsSavingDraft(false) }
  }

  const getTextFromHtml = (html: string) => { const tmp = document.createElement('div'); tmp.innerHTML = html; return (tmp.textContent || tmp.innerText || '').trim() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const titleText = getTextFromHtml(titleRef.current?.innerHTML ?? formData.title)
    const excerptText = getTextFromHtml(subtitleRef.current?.innerHTML ?? formData.excerpt)
    if (!titleText) { setSubmitStatus('error'); setErrorMessage('Please add a title.'); return }
    if (!excerptText) { setSubmitStatus('error'); setErrorMessage('Please add a subtitle.'); return }
    if (!agreedToTerms) { setSubmitStatus('error'); setErrorMessage('Please agree to the terms and conditions before submitting.'); return }
    if (!formData.coverImage) { setSubmitStatus('error'); setErrorMessage('Please upload a cover image for your blog post.'); return }
    setIsSubmitting(true); setSubmitStatus('idle'); setErrorMessage('')
    try {
      const apiBase = getApiBase()
      const formDataToSend = new FormData()
      formDataToSend.append('title', titleRef.current?.innerHTML ?? formData.title)
      formDataToSend.append('content', formData.content)
      formDataToSend.append('excerpt', subtitleRef.current?.innerHTML ?? formData.excerpt)
      formDataToSend.append('author_name', formData.author_name)
      formDataToSend.append('author_email', formData.author_email)
      formDataToSend.append('meta_title', formData.meta_title)
      formDataToSend.append('meta_description', formData.meta_description)
      formDataToSend.append('meta_keywords', formData.meta_keywords)
      formDataToSend.append('og_title', formData.og_title)
      formDataToSend.append('og_description', formData.og_description)
      if (formData.ogImageFile) formDataToSend.append('ogImage', formData.ogImageFile)
      else if (formData.og_image?.trim()) formDataToSend.append('og_image', formData.og_image.trim())
      formDataToSend.append('canonical_url', canonicalOverride ? formData.canonical_url : '')
      formDataToSend.append('categories', JSON.stringify(formData.categories))
      formDataToSend.append('allow_comments', String(formData.allow_comments))
      if (formData.coverImage) formDataToSend.append('coverImage', formData.coverImage)
      if (formData.detailImage) formDataToSend.append('detailImage', formData.detailImage)
      formData.images.forEach(image => formDataToSend.append('images', image.file))
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const response = await fetch(`${apiBase}/api/blog/request`, { method: 'POST', headers, body: formDataToSend })
      if (response.ok) {
        setSubmitStatus('success')
        draftIdRef.current = null; versionRef.current = 0; clearLocalDraft()
        const token = localStorage.getItem('token')
        if (token) { clearDraftSessionId(); fetch(`${apiBase}/api/blog/drafts/auto?session_id=${encodeURIComponent(sessionIdRef.current)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {}) }
        setTimeout(() => { window.location.hash = '#/user/blog' }, 2000)
      } else { const errorData = await response.json(); setSubmitStatus('error'); setErrorMessage(errorData.message || 'Failed to submit blog request') }
    } catch { setSubmitStatus('error'); setErrorMessage('Network error. Please try again.') }
    finally { setIsSubmitting(false) }
  }

  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 text-center">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Request Submitted!</h2>
          <p className="text-gray-600 mb-4">Your blog post request has been submitted successfully.</p>
          <button onClick={() => window.location.hash = '#/user/blog'} className="px-6 py-2 text-white rounded-lg transition-colors" style={{ backgroundColor: 'rgb(75,151,201)' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}>
            Go Back to Blog
          </button>
        </div>
      </div>
    )
  }

  const keepFocus = (e: React.MouseEvent) => e.preventDefault()
  const isEditorOnly = activeEditableType === 'editor'
  const btnActive = `p-2 rounded bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]`
  const btnInactive = `p-2 rounded text-gray-600 hover:bg-gray-200`
  const btnDisabled = `p-2 rounded text-gray-300 cursor-not-allowed`

  return (
    <>
      <style>{`
        [contenteditable][data-placeholder]:empty:before { content: attr(data-placeholder); color: #9ca3af; pointer-events: none; }
.editor-content { line-height: 1.8; color: #111827; word-break: break-word; overflow-wrap: break-word; overflow: hidden; }
.overflow-y-auto { scrollbar-width: thin; scrollbar-color: #cbd5e0 #f7fafc; }
.overflow-y-auto::-webkit-scrollbar { width: 6px; }
.overflow-y-auto::-webkit-scrollbar-track { background: #f7fafc; }
.overflow-y-auto::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }
.title-scroll-wrapper { -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; }
.editor-content h1 { font-size: 2em; font-weight: bold; margin: 0.5em 0; }
.editor-content h2 { font-size: 1.75em; font-weight: bold; margin: 0.5em 0; }
.editor-content h3 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
.editor-content h4 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
.editor-content p { margin: 0.5em 0; color: #111827; }
.editor-content blockquote { margin: 1em 0; padding-left: 1em; border-left: 4px solid #d1d5db; color: #6b7280; font-style: italic; }
.editor-content ul { list-style: disc; margin-left: 2em; padding-left: 0.5em; }
.editor-content ol { list-style: decimal; margin-left: 2em; padding-left: 0.5em; }
.editor-content li { margin: 0.25em 0; padding-left: 0.25em; }
.editor-content a { color: #4B97C9; text-decoration: underline; word-break: break-all; }
.editor-content img { max-width: 100%; height: auto; margin: 10px auto; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; display: block; }
.editor-content img:hover { border-color: #4B97C9; }
.editor-content div[contenteditable="false"] { text-align: center; margin: 20px 0; display: block; width: 100%; max-width: 100%; }
.editor-content .youtube-embed-wrapper { position: relative; display: flex; justify-content: center; align-items: center; margin: 20px auto; width: 100%; max-width: 100%; }
.editor-content .youtube-embed-wrapper iframe { max-width: 100%; width: 100%; height: auto; aspect-ratio: 16/9; border: 0; border-radius: 8px; }
.editor-content .youtube-embed-remove:hover { background: rgba(0,0,0,0.8) !important; }
.editor-content .image-caption { font-size: 0.875rem; color: #6b7280; font-style: italic; margin-top: 0.5rem; text-align: center; }
.editor-content pre, .editor-content code { white-space: pre-wrap; word-break: break-word; max-width: 100%; }
/* Contain everything inside viewport on mobile */
@media (max-width: 640px) {
  input, textarea, select, [contenteditable] { font-size: 16px !important; }
  .editor-content { max-width: 100vw; }
  .title-editable { white-space: pre-wrap !important; width: 100% !important; word-break: break-word !important; overflow-wrap: break-word !important; }
}
/* Toolbar expand/collapse transition */
.toolbar-expanded { max-height: 200px; opacity: 1; }
.toolbar-collapsed { max-height: 0; opacity: 0; overflow: hidden; }
.toolbar-transition { transition: max-height 0.2s ease, opacity 0.15s ease; }
      `}</style>

      <div className="fixed inset-0 flex flex-col bg-white">

        {/* ── Fixed Header ── */}
        <div className="flex-shrink-0 bg-white shadow-sm border-b">
          <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button onClick={() => window.location.hash = '#/user/blog'} className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Go back">
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              {/* Status badges — hide text label on very small screens */}
              <div className="flex items-center gap-1.5 min-w-0">
                {lastSavedAt && !isOffline && (
                  <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                    <span className="hidden sm:inline">Saved</span>
                  </span>
                )}
                {editingInOtherTab && (
                  <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                    <WarningCircle size={12} className="flex-shrink-0" />
                    <span className="hidden sm:inline">Editing in another tab</span>
                  </span>
                )}
                {isOffline && (
                  <span className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs">
                    <WifiSlash size={12} className="flex-shrink-0" />
                    <span className="hidden sm:inline">Offline</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button type="button" onClick={() => setShowPreview(true)} disabled={isSubmitting} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-colors">
                Preview
              </button>
              <button type="submit" form="blog-form" disabled={isSubmitting || !agreedToTerms} className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: 'rgb(75,151,201)' }} onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = 'rgb(60,120,160)')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgb(75,151,201)')}>
                Continue
              </button>
            </div>
          </div>
        </div>

        {/* ── Conflict Banner ── */}
        {showConflictBanner && (
          <div className="flex-shrink-0 px-3 sm:px-6 py-2 bg-amber-50 border-b border-amber-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <WarningCircle size={16} className="flex-shrink-0" />
                <span className="text-xs sm:text-sm">Draft updated in another tab.</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={handleDismissConflict} className="px-3 py-1.5 text-xs border border-amber-300 rounded-lg hover:bg-amber-100 text-amber-800">Keep editing</button>
                <button type="button" onClick={handleLoadLatest} className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700">Load latest</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toolbar ── */}
<div className="flex-shrink-0 bg-gray-50 border-b border-gray-200">
  {/* Toggle row — always visible */}
  <div className="flex items-center gap-0.5 px-2 sm:px-3 py-1 border-b border-gray-100">
    {/* Primary always-visible buttons */}
    <button type="button" onMouseDown={keepFocus} onClick={handleUndo} className={btnInactive} title="Undo"><ArrowUUpLeft size={15} /></button>
    <button type="button" onMouseDown={keepFocus} onClick={handleRedo} className={btnInactive} title="Redo"><ArrowUUpRight size={15} /></button>
    <span className="w-px h-4 bg-gray-300 mx-0.5 flex-shrink-0" />
    <button type="button" onMouseDown={keepFocus} onClick={() => toggleFormat('bold')} className={`flex-shrink-0 ${toolbarState.bold ? btnActive : btnInactive}`} title="Bold"><TextB size={15} /></button>
    <button type="button" onMouseDown={keepFocus} onClick={() => toggleFormat('italic')} className={`flex-shrink-0 ${toolbarState.italic ? btnActive : btnInactive}`} title="Italic"><TextItalic size={15} /></button>
    <button type="button" onMouseDown={keepFocus} onClick={() => toggleFormat('underline')} className={`flex-shrink-0 ${toolbarState.underline ? btnActive : btnInactive}`} title="Underline"><TextUnderline size={15} /></button>
    <span className="w-px h-4 bg-gray-300 mx-0.5 flex-shrink-0" />
    <button type="button" onClick={insertLink} disabled={!isEditorOnly} className={`flex-shrink-0 ${isEditorOnly ? btnInactive : btnDisabled}`} title="Link"><Link size={15} /></button>
    <button type="button" onClick={insertImageIntoEditor} disabled={!isEditorOnly} className={`flex-shrink-0 ${isEditorOnly ? btnInactive : btnDisabled}`} title="Image"><Image size={15} /></button>
    {/* Expand/collapse toggle — pushed to right */}
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={() => setToolbarExpanded(p => !p)}
      className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors flex-shrink-0"
      title={toolbarExpanded ? 'Collapse toolbar' : 'Expand toolbar'}
    >
      <span className="hidden sm:inline">{toolbarExpanded ? 'Less' : 'More'}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform duration-200 ${toolbarExpanded ? 'rotate-180' : ''}`}>
        <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  </div>

  {/* Expanded rows — all options */}
  <div className={`toolbar-transition ${toolbarExpanded ? 'toolbar-expanded' : 'toolbar-collapsed'}`}>
    <div className="px-2 sm:px-3 py-1.5 flex flex-wrap gap-0.5 sm:gap-1">
      {/* Block format */}
      <button type="button" onMouseDown={keepFocus} onClick={setParagraph} className={`px-1.5 sm:px-2 py-1.5 rounded text-xs font-medium flex-shrink-0 ${toolbarState.block === 'p' ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title="Paragraph">P</button>
      {[1, 2, 3, 4].map(h => (
        <button key={h} type="button" onMouseDown={keepFocus} onClick={() => setHeading(h)} className={`px-1.5 sm:px-2 py-1.5 rounded text-xs font-semibold flex-shrink-0 ${toolbarState.block === `h${h}` ? 'bg-[rgba(75,151,201,0.2)] text-[rgb(75,151,201)]' : 'text-gray-600 hover:bg-gray-200'}`} title={`Heading ${h}`}>H{h}</button>
      ))}
      <span className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0 self-center" />
      {/* Extra format */}
      <button type="button" onMouseDown={keepFocus} onClick={() => toggleFormat('strikeThrough')} className={`flex-shrink-0 ${toolbarState.strikethrough ? btnActive : btnInactive}`} title="Strikethrough"><TextStrikethrough size={15} /></button>
      <button type="button" onMouseDown={keepFocus} onClick={setBlockquote} className={`flex-shrink-0 ${toolbarState.block === 'blockquote' ? btnActive : btnInactive}`} title="Quote"><Quotes size={15} /></button>
      <span className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0 self-center" />
      {/* Insert */}
      <button type="button" onClick={insertYouTube} disabled={!isEditorOnly} className={`flex-shrink-0 ${isEditorOnly ? btnInactive : btnDisabled}`} title="YouTube"><YoutubeLogo size={15} /></button>
      <button type="button" onClick={() => insertList(false)} disabled={!isEditorOnly} className={`flex-shrink-0 ${isEditorOnly ? btnInactive : btnDisabled}`} title="Bullet List"><ListBullets size={15} /></button>
      <button type="button" onClick={() => insertList(true)} disabled={!isEditorOnly} className={`flex-shrink-0 ${isEditorOnly ? btnInactive : btnDisabled}`} title="Numbered List"><ListNumbers size={15} /></button>
      <span className="w-px h-5 bg-gray-300 mx-0.5 flex-shrink-0 self-center" />
      {/* Color picker */}
      <button type="button" onMouseDown={keepFocus} onClick={toggleColorPicker} className="flex flex-shrink-0 p-2 rounded hover:bg-gray-200 items-center gap-1 text-gray-600" ref={colorButtonRef} title="Text Color">
        <Palette size={15} />
        <div className="w-3 h-3 rounded border border-gray-400" style={{ backgroundColor: currentColor }} />
      </button>
    </div>
    {/* Inline color swatches when picker open */}
    {showColorPicker && (
      <div className="px-3 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {colors.map(color => (
            <button key={color} type="button" onClick={() => applyColor(color)} className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform flex-shrink-0" style={{ backgroundColor: color }} title={color} />
          ))}
        </div>
      </div>
    )}
  </div>
</div>
        {/* ── Scrollable Content ── */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <form id="blog-form" onSubmit={handleSubmit} className="min-h-full flex flex-col">
            <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 min-w-0">

              {/* Title */}
              <div className="title-scroll-wrapper overflow-x-auto overflow-y-hidden mb-2 -mx-4 px-4 sm:-mx-6 sm:px-6">
                <div ref={titleRef} contentEditable={!isSubmitting} onInput={() => titleRef.current && setFormData(prev => ({ ...prev, title: titleRef.current!.innerHTML }))} onFocus={updateToolbarState} onClick={updateToolbarState} onBlur={() => { const fd = formDataRef.current; if (fd && titleRef.current) { const payload = { ...fd, title: titleRef.current.innerHTML }; saveLocalDraft(payload); setLastSavedAt(new Date().toISOString()); syncToServer() } }} className="title-editable w-full min-w-full text-2xl sm:text-4xl font-bold text-gray-900 border-none focus:ring-0 focus:outline-none bg-transparent outline-none" style={{ width: 'max-content', minWidth: '100%' }} data-placeholder="Title" suppressContentEditableWarning />
              </div>

              {/* Subtitle */}
              <div ref={subtitleRef} contentEditable={!isSubmitting} onInput={() => subtitleRef.current && setFormData(prev => ({ ...prev, excerpt: subtitleRef.current!.innerHTML }))} onFocus={updateToolbarState} onClick={updateToolbarState} onBlur={() => { const fd = formDataRef.current; if (fd && subtitleRef.current) { const payload = { ...fd, excerpt: subtitleRef.current.innerHTML }; saveLocalDraft(payload); setLastSavedAt(new Date().toISOString()); syncToServer() } }} className="w-full text-base sm:text-lg text-gray-500 border-none focus:ring-0 focus:outline-none resize-none mb-4 bg-transparent outline-none min-h-[2.5rem] sm:min-h-[3.5rem]" data-placeholder="Add a subtitle..." suppressContentEditableWarning />

              {/* Categories */}
              <div ref={categoryPickerRef} className="relative flex flex-wrap items-center gap-1.5 sm:gap-2 mb-5 sm:mb-6">
                {formData.categories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gray-100 text-gray-700 text-xs sm:text-sm">
                    {cat}
                    <button type="button" onClick={() => toggleCategory(cat)} className="hover:text-red-600"><X size={12} /></button>
                  </span>
                ))}
                <button type="button" onClick={() => setShowCategoryPicker(prev => !prev)} className="inline-flex items-center gap-1 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-dashed border-gray-300 text-gray-500 text-xs sm:text-sm hover:border-[rgb(75,151,201)] hover:text-[rgb(75,151,201)] transition-colors">
                  <Plus size={12} weight="bold" />
                  Add category
                </button>
                {showCategoryPicker && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-[calc(100vw-2rem)] sm:min-w-[200px] sm:w-auto max-w-xs sm:max-w-sm p-3 bg-white rounded-lg shadow-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Select categories</p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {categoryOptions.map(c => (
                        <button key={c} type="button" onClick={() => toggleCategory(c)} className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium border transition-colors ${formData.categories.includes(c) ? 'text-white' : 'bg-white text-gray-700 border-gray-300 hover:border-[rgb(75,151,201)]'}`} style={formData.categories.includes(c) ? { backgroundColor: 'rgb(75,151,201)', borderColor: 'rgb(75,151,201)' } : undefined}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Editor */}
              <div className="relative">
                {isEditorContentEmpty(formData.content) && (
                  <span className="absolute top-0 left-0 pt-1 text-sm sm:text-base text-gray-400 pointer-events-none select-none">Start writing..</span>
                )}
                <div ref={editorRef} contentEditable onInput={handleEditorInput} onKeyDown={handleEditorKeyDown} onFocus={updateToolbarState} onBlur={() => { const fd = formDataRef.current; if (fd) { const content = (editorRef.current?.innerHTML ?? fd.content) || ''; const payload = { ...fd, content }; saveLocalDraft(payload); setLastSavedAt(new Date().toISOString()); syncToServer() } }} onClick={updateToolbarState} className="editor-content min-h-[40vh] sm:min-h-[500px] outline-none text-sm sm:text-base text-gray-800 w-full pt-1 pb-24 sm:pb-32" suppressContentEditableWarning />
              </div>
            </div>

            {/* ── Bottom Section ── */}
            <div className="border-t bg-gray-50">
              <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">

                {/* Cover & Detail Images */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Cover Image */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Cover Image * <span className="text-xs font-normal text-gray-500">800×420px</span>
                    </label>
                    {formData.coverImage ? (
                      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
                        <img src={URL.createObjectURL(formData.coverImage)} alt="Cover preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" id="cover-image-replace" disabled={isSubmitting} />
                          <label htmlFor="cover-image-replace" className="px-3 py-1.5 bg-white/90 text-gray-800 text-xs font-medium rounded cursor-pointer hover:bg-white">Replace</label>
                          <button type="button" onClick={removeCoverImage} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded hover:bg-red-500" disabled={isSubmitting}>Remove</button>
                        </div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{formData.coverImage.name}</p>
                      </div>
                    ) : (
                      <label htmlFor="cover-image-upload" className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)] hover:bg-[rgba(75,151,201,0.08)] transition-all group">
                        <input type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" id="cover-image-upload" disabled={isSubmitting} />
                        <Upload size={28} className="text-gray-400 group-hover:text-[rgb(75,151,201)]" />
                        <span className="text-sm text-gray-600 group-hover:text-[rgb(75,151,201)]">Choose cover image</span>
                        <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</span>
                      </label>
                    )}
                  </div>

                  {/* Detail Image */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Detail Image <span className="text-xs font-normal text-gray-500">Optional</span>
                    </label>
                    {formData.detailImage ? (
                      <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video">
                        <img src={URL.createObjectURL(formData.detailImage)} alt="Detail preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <input type="file" accept="image/*" onChange={handleDetailImageUpload} className="hidden" id="detail-image-replace" disabled={isSubmitting} />
                          <label htmlFor="detail-image-replace" className="px-3 py-1.5 bg-white/90 text-gray-800 text-xs font-medium rounded cursor-pointer hover:bg-white">Replace</label>
                          <button type="button" onClick={removeDetailImage} className="px-3 py-1.5 bg-red-500/90 text-white text-xs font-medium rounded hover:bg-red-500" disabled={isSubmitting}>Remove</button>
                        </div>
                        <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">{formData.detailImage.name}</p>
                      </div>
                    ) : (
                      <label htmlFor="detail-image-upload" className="flex flex-col items-center justify-center gap-2 py-5 px-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)] hover:bg-[rgba(75,151,201,0.08)] transition-all group">
                        <input type="file" accept="image/*" onChange={handleDetailImageUpload} className="hidden" id="detail-image-upload" disabled={isSubmitting} />
                        <Upload size={28} className="text-gray-400 group-hover:text-[rgb(75,151,201)]" />
                        <span className="text-sm text-gray-600 group-hover:text-[rgb(75,151,201)]">Choose detail image</span>
                        <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 5MB</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Author Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <input name="author_name" value={formData.author_name} onChange={handleInputChange} placeholder="Your name *" required disabled={isSubmitting || (isAuthenticated && !!user?.name)} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] focus:border-transparent bg-white text-sm sm:text-base" />
                  <input name="author_email" value={formData.author_email} onChange={handleInputChange} placeholder="Email *" required disabled={isSubmitting || (isAuthenticated && !!user?.email)} className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] focus:border-transparent bg-white text-sm sm:text-base" />
                </div>

                {/* Error */}
                {submitStatus === 'error' && (
                  <div className="flex items-start gap-3 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                    <WarningCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{errorMessage}</p>
                  </div>
                )}

                {/* Terms */}
                <div className="flex items-start gap-3 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg">
                  <input type="checkbox" id="terms" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded focus:ring-2 focus:ring-[rgb(75,151,201)] flex-shrink-0" style={{ accentColor: 'rgb(75,151,201)' }} />
                  <label htmlFor="terms" className="text-sm text-gray-700">
                    I agree to the{' '}
                    <button type="button" onClick={() => setShowTermsModal(true)} className="underline font-medium hover:text-[rgb(60,120,160)]" style={{ color: 'rgb(75,151,201)' }}>Terms & Conditions</button>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
                  {/* Icon buttons */}
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => { fetchDraftVersions(); setShowVersionHistoryModal(true) }} className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors" title="Version history"><ClockCounterClockwise size={20} /></button>
                    <button type="button" onClick={() => setShowContentInfoModal(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors" title="Post info"><Info size={20} /></button>
                  </div>
                  {/* Primary action buttons */}
                  <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3">
                    <button type="button" onClick={() => window.location.hash = '#/user/blog'} className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm" disabled={isSubmitting}>
                      Cancel
                    </button>
                    <button type="button" onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="px-4 py-2.5 border-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm" style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }} onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgba(75,151,201,0.08)' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '' }}>
                      {isSavingDraft ? <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgb(75,151,201)' }} />Saving...</> : <><FloppyDisk size={15} />Save Draft</>}
                    </button>
                    <button type="button" onClick={() => setShowSettingsModal(true)} className="col-span-2 sm:col-span-1 px-4 py-2.5 flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium text-gray-700 text-sm">
                      <Gear size={15} style={{ color: 'rgb(75,151,201)' }} />
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Color Picker (desktop)
      {showColorPicker && (
        <div className="absolute z-30 bg-white border border-gray-300 rounded-lg shadow-lg p-3" style={{ top: colorPickerPos.top, left: colorPickerPos.left }}>
          <div className="grid grid-cols-5 gap-2">
            {colors.map(color => (
              <button key={color} type="button" onClick={() => applyColor(color)} className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
            ))}
          </div>
        </div>
      )} */}

      {/* YouTube Modal */}
      {showYouTubeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Insert YouTube Video</h3>
            <label className="block text-sm font-medium text-gray-700 mb-2">YouTube URL</label>
            <input type="url" value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" />
            <p className="text-xs text-gray-500 mt-2">Paste a YouTube link to embed the video</p>
            <div className="flex gap-3 mt-5 justify-end">
              <button type="button" onClick={() => { setShowYouTubeModal(false); setYoutubeUrl('') }} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button type="button" onClick={confirmYouTube} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Insert Video</button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Insert Link</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Link Text</label>
                <input type="text" value={linkData.text} onChange={(e) => setLinkData(prev => ({ ...prev, text: e.target.value }))} placeholder="Enter link text..." className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL</label>
                <input type="url" value={linkData.url} onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))} placeholder="https://example.com" className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5 justify-end">
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={confirmLink} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Insert Link</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Context Menu */}
      {showImageMenu && (
        <>
          <div className="fixed inset-0 z-[50]" onClick={() => setShowImageMenu(false)} />
          <div ref={imageMenuRef} className="absolute z-[60] bg-white rounded-lg shadow-xl py-2 min-w-[180px] sm:min-w-[200px] border border-gray-200" style={{ top: imageMenuPos.top, left: imageMenuPos.left }}>
            {[
              { icon: <PencilSimple size={15} className="text-gray-700" />, label: 'Edit image', onClick: () => { setShowImageMenu(false); openImageEditor() } },
              { icon: <FileText size={15} className="text-gray-700" />, label: 'Edit caption', onClick: () => { setShowImageMenu(false); setShowCaptionModal(true) } },
              { icon: <Tag size={15} className="text-gray-700" />, label: 'Edit alt text', onClick: () => { setShowImageMenu(false); setShowAltTextModal(true) } },
            ].map(({ icon, label, onClick }) => (
              <button key={label} type="button" onClick={onClick} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800">{icon}{label}</button>
            ))}
            <div className="border-t border-gray-200 my-1" />
            {[
              { icon: <Square size={15} />, label: 'Normal width', onClick: () => setImageWidth('normal') },
              { icon: <ArrowsOut size={15} />, label: 'Half width', onClick: () => setImageWidth('wide') },
              { icon: <ArrowsIn size={15} />, label: 'Full width', onClick: () => setImageWidth('full') },
            ].map(({ icon, label, onClick }) => (
              <button key={label} type="button" onClick={onClick} className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-2 text-sm text-gray-800 text-gray-700">{icon}{label}</button>
            ))}
            <div className="border-t border-gray-200 my-1" />
            <button type="button" onClick={deleteImage} className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-2 text-sm text-red-600"><Trash size={15} className="text-red-600" />Delete image</button>
          </div>
        </>
      )}

      {/* Caption Modal */}
      {showCaptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Edit Image Caption</h3>
            <input type="text" value={imageCaption} onChange={(e) => setImageCaption(e.target.value)} placeholder="Enter caption..." className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" />
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setShowCaptionModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={saveImageCaption} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Alt Text Modal */}
      {showAltTextModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-md">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Edit Alt Text</h3>
            <input type="text" value={imageAltText} onChange={(e) => setImageAltText(e.target.value)} placeholder="Enter alt text..." className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" />
            <p className="text-xs text-gray-500 mt-2">Alt text helps screen readers and SEO</p>
            <div className="flex gap-3 mt-4 justify-end">
              <button onClick={() => setShowAltTextModal(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={saveImageAltText} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Restore Modal */}
      {showRestoreModal && pendingDraftRestore.current && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[80] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-sm shadow-xl">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Unsaved draft found</h3>
            <p className="text-sm text-gray-600 mb-5">We found an unsaved draft from {getDraftAge(pendingDraftRestore.current)}.</p>
            <div className="space-y-3">
              <button onClick={handleRestoreDraft} className="w-full px-4 py-3 text-white rounded-lg font-medium text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Restore draft</button>
              <div className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or</span><div className="flex-1 h-px bg-gray-200" /></div>
              <div className="flex gap-2">
                <button onClick={handleKeepForLater} className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700">Keep for later</button>
                <button onClick={handleDiscardDraft} className="flex-1 px-4 py-2.5 text-sm border border-red-200 rounded-lg hover:bg-red-50 text-red-600">Discard</button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Auto draft expires in 24 hours.</p>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Terms & Conditions</h3>
            <div className="prose prose-sm max-w-none text-sm">
              <p>By submitting a blog post request, you agree to the following terms:</p>
              <ul>
                <li>Your content must be original and not violate any copyrights</li>
                <li>We reserve the right to edit or reject submissions</li>
                <li>Published content may be used for promotional purposes</li>
                <li>You retain ownership of your original content</li>
              </ul>
            </div>
            <div className="flex justify-end mt-5">
              <button onClick={() => setShowTermsModal(false)} className="px-4 py-2 text-white rounded-lg text-sm" style={{ backgroundColor: 'rgb(75,151,201)' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Draft saved toast */}
      {showDraftToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 bg-slate-900/90 text-white rounded-lg shadow-lg flex items-center gap-2 whitespace-nowrap">
          <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
          <span className="text-sm font-medium">Draft saved</span>
        </div>
      )}

      {/* Blog Preview */}
      {showPreview && (
        <BlogPreview title={formData.title} excerpt={formData.excerpt} content={formData.content} authorName={formData.author_name} authorEmail={formData.author_email} coverImage={formData.coverImage} detailImage={formData.detailImage} categories={formData.categories} onClose={() => setShowPreview(false)} />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[75] p-0 sm:p-4" onClick={() => setShowSettingsModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Settings — SEO & Sharing</h3>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input name="meta_title" value={formData.meta_title} onChange={handleInputChange} className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm ${formData.meta_title.length > 65 ? 'border-amber-500' : 'border-gray-300'}`} placeholder="Auto-filled from title" maxLength={65} />
                  <p className="text-xs mt-1 text-gray-500">{formData.meta_title.length}/65</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Canonical URL</label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={canonicalOverride} onChange={e => setCanonicalOverride(e.target.checked)} className="rounded" />Override
                    </label>
                  </div>
                  <input name="canonical_url" value={canonicalOverride ? formData.canonical_url : `${getApiBase().replace(/\/$/, '')}/blog/[slug]`} onChange={handleInputChange} readOnly={!canonicalOverride} className={`w-full px-4 py-2.5 border rounded-lg text-sm ${!canonicalOverride ? 'bg-gray-100' : 'border-gray-300'}`} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                <textarea name="meta_description" value={formData.meta_description} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" rows={2} maxLength={160} placeholder="Auto-filled from excerpt" />
                <p className="text-xs mt-1 text-gray-500">{formData.meta_description.length}/160</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meta Tags</label>
                <input name="meta_keywords" value={formData.meta_keywords} onChange={handleInputChange} list="blog-tags" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(75,151,201)] text-sm" placeholder="skincare, routine, glowing skin" />
                <datalist id="blog-tags">{existingTags.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">Open Graph (Social Sharing)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Title</label>
                    <input name="og_title" value={formData.og_title} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" maxLength={70} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">OG Description</label>
                    <textarea name="og_description" value={formData.og_description} onChange={handleInputChange} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm" rows={2} maxLength={200} />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">OG Image</label>
                  <div className="flex gap-3 flex-wrap">
                    {formData.ogImageFile ? (
                      <div className="relative flex-shrink-0">
                        <img src={URL.createObjectURL(formData.ogImageFile)} alt="" className="h-20 w-32 object-cover rounded-lg border" />
                        <button type="button" onClick={removeOgImage} className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full"><X size={12} /></button>
                      </div>
                    ) : (
                      <label className="flex-shrink-0 flex flex-col items-center justify-center h-20 w-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[rgb(75,151,201)]">
                        <Upload size={20} className="text-gray-400" />
                        <span className="text-xs text-gray-500 mt-1">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleOgImageUpload} />
                      </label>
                    )}
                    <input name="og_image" value={formData.og_image} onChange={handleInputChange} className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg text-sm" placeholder="Or paste URL" disabled={!!formData.ogImageFile} />
                  </div>
                  {formData.coverImage && <button type="button" onClick={useCoverAsOg} className="text-xs hover:underline mt-2" style={{ color: 'rgb(75,151,201)' }}>Use cover image</button>}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Allow Comments</p>
                  <p className="text-xs text-gray-500">Readers can comment on this post</p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.allow_comments} onChange={e => setFormData(prev => ({ ...prev, allow_comments: e.target.checked }))} className="rounded" />
                  <span className="text-sm">{formData.allow_comments ? 'On' : 'Off'}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      <VersionHistoryModal
        open={showVersionHistoryModal}
        onClose={() => setShowVersionHistoryModal(false)}
        draftVersions={draftVersions}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        onRestore={async (versionId) => {
          const token = localStorage.getItem('token')
          if (!token) return
          const res = await fetch(`${getApiBase()}/api/blog/drafts/restore/${versionId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ session_id: sessionIdRef.current }) })
          const draft = res.ok ? await res.json() : null
          if (draft) {
            const arr = (x: any): string[] => Array.isArray(x) ? x : typeof x === 'string' ? (() => { try { const p = JSON.parse(x); return Array.isArray(p) ? p : [] } catch { return [] } })() : []
            const kw = draft.meta_keywords
            setFormData(prev => ({ ...prev, title: draft.title || '', content: draft.content || '', excerpt: draft.excerpt || '', meta_title: draft.meta_title || '', meta_description: draft.meta_description || '', meta_keywords: typeof kw === 'string' ? kw : Array.isArray(kw) ? kw.join(', ') : '', og_title: draft.og_title || '', og_description: draft.og_description || '', og_image: draft.og_image || '', canonical_url: draft.canonical_url || '', categories: arr(draft.categories), allow_comments: draft.allow_comments ?? true }))
            if (editorRef.current && draft.content) editorRef.current.innerHTML = draft.content
            if (titleRef.current && draft.title) titleRef.current.innerHTML = draft.title
            if (subtitleRef.current && draft.excerpt) subtitleRef.current.innerHTML = draft.excerpt
            draftIdRef.current = draft.id
            versionRef.current = draft.version ?? 0
          }
        }}
      />

      {/* Content Info Modal */}
      {showContentInfoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[75] p-0 sm:p-4" onClick={() => setShowContentInfoModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl p-5 sm:p-6 w-full sm:max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Post info</h3>
            {(() => {
              const s = getContentStats()
              return (
                <div className="space-y-2">
                  {[['Characters', s.chars], ['Words', s.words], ['Sentences', s.sentences], ['Reading time', `${s.readingTime} min`], ['Speaking time', `${s.speakingTime} min`]].map(([label, value]) => (
                    <div key={label as string} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Image Editor */}
      {imageEditorCtx && (
        <div className="fixed inset-0 overflow-hidden bg-slate-900" style={{ zIndex: 9999, width: '100vw', height: '100dvh', minHeight: '-webkit-fill-available', padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)', boxSizing: 'border-box' }}>
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
          <ImageEditor images={[]} setImages={() => {}} source={imageEditorCtx.source} onSave={(editedImageObject) => { const ctx = imageEditorCtx; setImageEditorCtx(null); setTimeout(() => { applyEditedImage(editedImageObject, ctx.editingImageId, ctx.editingImageName) }, 0) }} onClose={() => setImageEditorCtx(null)} fullPage />
        </div>
      )}
    </>
  )
}