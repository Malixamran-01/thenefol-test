import React, { useState, useEffect } from 'react'
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor'

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

  // Add body class when editor is open so we can target Filerobot save modal with CSS
  const editorVisible = !!(source && editorOpen) || !!(editorOpen && selectedImage)
  useEffect(() => {
    if (editorVisible) {
      document.body.classList.add('filerobot-editor-open')
    }
    return () => {
      document.body.classList.remove('filerobot-editor-open')
    }
  }, [editorVisible])

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    setSelectedImage(url)
    setCurrentFile(file)
    setEditorOpen(true)
  }

  const handleSave = async (editedImageObject: any, designState: any) => {
    console.log('ImageEditor handleSave called:', editedImageObject, designState)
    
    if (onSave) {
      // If onSave prop is provided, use it (for blog request form)
      // Pass the editedImageObject directly - it should contain imageBase64
      onSave(editedImageObject)
    } else {
      // Default behavior for image manager
      const base64 = editedImageObject.imageBase64
      const blob = await fetch(base64).then(r => r.blob())
      const editedFile = new File([blob], currentFile?.name || 'edited.png', { type: blob.type })

      setImages(prev => [...prev, editedFile])
    }
    setEditorOpen(false)
  }

  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setEditorOpen(false)
    }
  }

  // If source is provided, show editor directly
  if (source && editorOpen) {
    return (
      <FilerobotImageEditor
        source={source}
        onSave={handleSave}
        onClose={handleClose}
        tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS]}
        defaultTabId={TABS.ADJUST}
        defaultToolId={TOOLS.CROP}
        Text={{ text: 'NEFOL' }}
        savingPixelRatio={1}
        previewPixelRatio={1}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload */}
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          files.forEach(file => handleFileSelect(file))
        }}
      />

      {/* Preview */}
      <div className="grid grid-cols-3 gap-3">
        {images.map((img, i) => (
          <img
            key={i}
            src={URL.createObjectURL(img)}
            className="h-32 w-full object-cover rounded"
          />
        ))}
      </div>

      {/* Editor */}
      {editorOpen && selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-[90vw] h-[90vh] rounded overflow-hidden">
            <FilerobotImageEditor
              source={selectedImage}
              onSave={handleSave}
              onClose={handleClose}
              tabsIds={[TABS.ADJUST, TABS.ANNOTATE, TABS.WATERMARK, TABS.FILTERS]}
              defaultTabId={TABS.ADJUST}
              defaultToolId={TOOLS.CROP}
              Text={{ text: 'NEFOL' }}
              savingPixelRatio={1}
              previewPixelRatio={1}
            />
          </div>
        </div>
      )}
    </div>
  )
}
