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

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file)
    setSelectedImage(url)
    setCurrentFile(file)
    setEditorOpen(true)
  }

  const handleSave = async (editedImageObject: any) => {
    if (onSave) {
      // If onSave prop is provided, use it (for blog request form)
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
        showBackButton={false}
        closeAfterSave={true}
        defaultSavedImageName="edited-image"
        defaultSavedImageType="png"
        forceToPngInEllipticalCrop={false}
        useBackendToSave={false}
        showCanvasOnly={false}
        observePluginContainerSize={true}
        showSaveButton={true}
        saveButtonProps={{
          label: 'Done'
        }}
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
              showBackButton={false}
              closeAfterSave={true}
              defaultSavedImageName="edited-image"
              defaultSavedImageType="png"
              forceToPngInEllipticalCrop={false}
              useBackendToSave={false}
              showCanvasOnly={false}
              observePluginContainerSize={true}
              showSaveButton={true}
              saveButtonProps={{
                label: 'Done'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
