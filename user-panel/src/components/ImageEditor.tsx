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

  // Add custom CSS to fix input field styling issues
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* Fix Filerobot Image Editor input field styling - More specific targeting */
      
      /* Reset all input positioning and transforms */
      .FIE_root input[type="text"],
      .FIE_root input[type="number"],
      .FIE_root input {
        position: relative !important;
        transform: none !important;
        padding: 8px 12px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        background: white !important;
        color: #1f2937 !important;
        margin: 0 !important;
        left: 0 !important;
        top: 0 !important;
        text-overflow: ellipsis !important;
        overflow: hidden !important;
        white-space: nowrap !important;
      }
      
      .FIE_root input:focus {
        outline: none !important;
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
      }
      
      /* Fix input containers and wrappers */
      .FIE_root .SfxInput-root,
      .FIE_root .SfxInput-wrapper,
      .FIE_root [class*="Input-root"],
      .FIE_root [class*="Input-wrapper"],
      .FIE_root [class*="input-wrapper"],
      .FIE_root [class*="InputWrapper"] {
        position: relative !important;
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        display: block !important;
      }
      
      /* Fix modal input fields specifically */
      .FIE_root .SfxModal-root input,
      .FIE_root [class*="Modal"] input {
        padding: 10px 12px !important;
        margin: 0 !important;
        position: relative !important;
        transform: none !important;
      }
      
      /* Fix any absolutely positioned inputs */
      .FIE_root input[style*="position: absolute"],
      .FIE_root input[style*="transform"] {
        position: relative !important;
        transform: none !important;
      }
      
      /* Fix select dropdowns */
      .FIE_root select {
        padding: 8px 12px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        background: white !important;
        width: 100% !important;
        box-sizing: border-box !important;
        position: relative !important;
        transform: none !important;
      }
      
      /* Fix number input spinners */
      .FIE_root input[type="number"] {
        -moz-appearance: textfield !important;
      }
      
      .FIE_root input[type="number"]::-webkit-inner-spin-button,
      .FIE_root input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none !important;
        margin: 0 !important;
      }
      
      /* Fix any transform or translate on inputs */
      .FIE_root input {
        translate: none !important;
      }
      
      /* Fix field containers in modals */
      .FIE_root [class*="field"],
      .FIE_root [class*="Field"] {
        position: relative !important;
        overflow: visible !important;
      }
      
      /* Ensure parent containers don't cause overflow */
      .FIE_root [class*="control"],
      .FIE_root [class*="Control"] {
        position: relative !important;
        overflow: hidden !important;
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
