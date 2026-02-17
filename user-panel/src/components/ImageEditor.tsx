import React, { useState, useEffect, useRef } from 'react'

const FILEROBOT_SCRIPT = '/filerobot-editor/filerobot-image-editor.min.js'

interface Props {
  images: File[]
  setImages: React.Dispatch<React.SetStateAction<File[]>>
  source?: string
  onSave?: (editedImageObject: any) => void
  onClose?: () => void
}

export default function ImageEditor({ images, setImages, source, onSave, onClose }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(source || null)
  const [editorOpen, setEditorOpen] = useState(!!source)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    setSelectedImage(url)
    setCurrentFile(file)
    setEditorOpen(true)
  }

  const handleSave = async (editedImageObject: any) => {
    if (onSave) {
      onSave(editedImageObject)
    } else {
      const base64 = editedImageObject.imageBase64
      const blob = await fetch(base64).then(r => r.blob())
      const editedFile = new File([blob], currentFile?.name || 'edited.png', { type: blob.type })
      setImages(prev => [...prev, editedFile])
    }
    setEditorOpen(false)
  }

  const handleClose = () => {
    if (editorRef.current) {
      try {
        editorRef.current.terminate()
      } catch (_) {}
      editorRef.current = null
    }
    if (onClose) onClose()
    setEditorOpen(false)
  }

  // Load Filerobot script when editor will be shown
  useEffect(() => {
    if (!editorOpen || (!source && !selectedImage)) return
    const imgSrc = source || selectedImage
    if (!imgSrc) return

    const loadScript = () => {
      if ((window as any).FilerobotImageEditor) {
        setScriptLoaded(true)
        return
      }
      const script = document.createElement('script')
      script.src = FILEROBOT_SCRIPT
      script.async = true
      script.onload = () => setScriptLoaded(true)
      script.onerror = () => {
        console.error('Failed to load Filerobot Image Editor')
        setEditorOpen(false)
      }
      document.head.appendChild(script)
    }
    loadScript()
  }, [editorOpen, source, selectedImage])

  // Initialize editor when script is loaded and container is ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current) return
    const imgSrc = source || selectedImage
    if (!imgSrc) return

    const FilerobotImageEditor = (window as any).FilerobotImageEditor
    if (!FilerobotImageEditor) return

    const { TABS, TOOLS } = FilerobotImageEditor
    const config = {
      source: imgSrc,
      tabsIds: [TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS],
      defaultTabId: TABS.ADJUST,
      defaultToolId: TOOLS.CROP,
      Text: { text: 'NEFOL' },
      savingPixelRatio: 1,
      previewPixelRatio: 1,
      observePluginContainerSize: true,
      onSave: (imageInfo: any) => handleSave(imageInfo),
      onClose: () => handleClose(),
    }

    const editor = new FilerobotImageEditor(containerRef.current, config)
    editorRef.current = editor
    editor.render()

    return () => {
      try {
        editor.terminate()
      } catch (_) {}
      editorRef.current = null
    }
  }, [scriptLoaded, source, selectedImage])

  // If source is provided, show editor directly (full screen)
  if (source && editorOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#1a1a1a]" style={{ width: '100%', height: '100vh' }}>
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          files.forEach(file => handleFileSelect(file))
        }}
      />
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, i) => (
          <img key={i} src={URL.createObjectURL(img)} className="h-32 w-full object-cover rounded" alt="" />
        ))}
      </div>
      {editorOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-[90vw] h-[90vh] rounded overflow-hidden">
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
