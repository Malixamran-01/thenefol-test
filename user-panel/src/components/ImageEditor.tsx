import React, { useState } from 'react'
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

  // Add custom CSS to fix input field styling issues - Proper isolation approach
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* 🔒 Isolate Filerobot editor from app styles (Tailwind/global CSS) */
      
      /* Reset box-sizing to content-box (Filerobot's expectation) */
      .filerobot-scope *,
      .filerobot-scope *::before,
      .filerobot-scope *::after {
        box-sizing: content-box !important;
      }
      
      /* Reset form elements inside editor to browser defaults */
      .filerobot-scope input,
      .filerobot-scope select,
      .filerobot-scope button,
      .filerobot-scope textarea {
        all: revert !important;
        box-sizing: content-box !important;
      }
      
      /* Specific resets for inputs */
      .filerobot-scope input,
      .filerobot-scope select,
      .filerobot-scope textarea {
        width: auto !important;
        min-width: 0 !important;
        padding: initial !important;
        margin: initial !important;
        line-height: normal !important;
        font-size: initial !important;
        border: initial !important;
        background: initial !important;
        color: initial !important;
      }
      
      /* Fix modal and canvas containers to use border-box */
      .filerobot-scope .FIE_root,
      .filerobot-scope .FIE_canvas-container,
      .filerobot-scope [class*="Modal"],
      .filerobot-scope [class*="modal"] {
        box-sizing: border-box !important;
      }
      
      /* Ensure buttons work properly */
      .filerobot-scope button {
        cursor: pointer !important;
      }
      
      /* Fix any Tailwind preflight overrides */
      .filerobot-scope input,
      .filerobot-scope select,
      .filerobot-scope button {
        font-family: inherit !important;
        line-height: inherit !important;
      }
    `
    document.head.appendChild(style)
    
    return () => {
      document.head.removeChild(style)
    }
  }, [])

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
      <div className="filerobot-scope">
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
      </div>
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
          <div className="bg-white w-[90vw] h-[90vh] rounded overflow-hidden filerobot-scope">
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
