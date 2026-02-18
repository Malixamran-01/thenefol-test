import React, { useState, useRef, useEffect } from 'react'

const EDITOR_SCRIPT = '/vendor/nefol-editor-portable/filerobot-image-editor.min.js'
const EDITOR_VERSION = '1771394902797'

interface Props {
  images: File[]
  setImages: React.Dispatch<React.SetStateAction<File[]>>
  source?: string
  onSave?: (editedImageObject: any) => void
  onClose?: () => void
  /** When true, renders full viewport (for standalone editor page) */
  fullPage?: boolean
}

declare global {
  interface Window {
    FilerobotImageEditor?: {
      TABS: Record<string, string>
      TOOLS: Record<string, string>
      new (container: HTMLElement, config: Record<string, unknown>): {
        render: () => void
        terminate: () => void
      }
    }
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      if (window.FilerobotImageEditor) return resolve()
      const check = setInterval(() => {
        if (window.FilerobotImageEditor) {
          clearInterval(check)
          resolve()
        }
      }, 50)
      return
    }
    const script = document.createElement('script')
    script.src = `${src}?v=${EDITOR_VERSION}`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Filerobot Image Editor'))
    document.body.appendChild(script)
  })
}

export default function ImageEditor({ images, setImages, source, onSave, onClose, fullPage }: Props) {
  const [selectedImage, setSelectedImage] = useState<string | null>(source || null)
  const [editorOpen, setEditorOpen] = useState(!!source)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<{ terminate: () => void } | null>(null)

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
      const blob = await fetch(base64).then((r) => r.blob())
      const editedFile = new File([blob], currentFile?.name || 'edited.png', { type: blob.type })
      setImages((prev) => [...prev, editedFile])
    }
    setEditorOpen(false)
  }

  const handleClose = () => {
    if (onClose) onClose()
    setEditorOpen(false)
  }

  // Mount portable editor when container is ready and we have a source
  useEffect(() => {
    if (!editorOpen || !selectedImage || !containerRef.current) return

    const container = containerRef.current
    let mounted = true

    loadScript(EDITOR_SCRIPT)
      .then(() => {
        if (!mounted || !window.FilerobotImageEditor) return
        const { TABS } = window.FilerobotImageEditor

        const editor = new window.FilerobotImageEditor(container, {
          source: selectedImage,
          tabsIds: [TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS],
          defaultTabId: TABS.ADJUST,
          observePluginContainerSize: true,
          Text: { text: 'NEFOL' },
          savingPixelRatio: 1,
          previewPixelRatio: 1,
          onSave: (imageInfo: any) => {
            handleSave(imageInfo)
          },
          onClose: () => {
            editorRef.current?.terminate()
            editorRef.current = null
            handleClose()
          },
        })

        editorRef.current = editor
        editor.render()
      })
      .catch((err) => {
        console.error('ImageEditor load error:', err)
        handleClose()
      })

    return () => {
      mounted = false
      editorRef.current?.terminate()
      editorRef.current = null
    }
  }, [editorOpen, selectedImage])

  if (source && editorOpen) {
    return (
      <div
        className="w-full h-full"
        style={{
          width: '100%',
          height: fullPage ? '100%' : '100vh',
          minHeight: fullPage ? '100dvh' : undefined,
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '100%',
            minHeight: fullPage ? '100dvh' : '100vh',
          }}
        />
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
          files.forEach((file) => handleFileSelect(file))
        }}
      />

      <div className="grid grid-cols-3 gap-3">
        {images.map((img, i) => (
          <img
            key={i}
            src={URL.createObjectURL(img)}
            className="h-32 w-full object-cover rounded"
            alt=""
          />
        ))}
      </div>

      {editorOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-[90vw] h-[90vh] rounded overflow-hidden">
            <link
              href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap"
              rel="stylesheet"
            />
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  )
}
