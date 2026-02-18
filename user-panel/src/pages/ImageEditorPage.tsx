import React, { useEffect, useState } from 'react'
import ImageEditor from '../components/ImageEditor'

const STORAGE_KEY = 'blog_edit_image_ctx'
const RESULT_KEY = 'blog_edit_image_result'

interface EditContext {
  source: string
  editingImageId: string | null
  editingImageName: string
}

export default function ImageEditorPage() {
  const [ctx, setCtx] = useState<EditContext | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) {
        window.location.hash = '#/user/blog/request'
        return
      }
      const parsed = JSON.parse(raw) as EditContext
      if (!parsed?.source) {
        sessionStorage.removeItem(STORAGE_KEY)
        window.location.hash = '#/user/blog/request'
        return
      }
      setCtx(parsed)
    } catch {
      setError('Invalid editor context')
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const handleSave = (editedImageObject: any) => {
    try {
      sessionStorage.setItem(RESULT_KEY, JSON.stringify({
        editedImageObject,
        editingImageId: ctx?.editingImageId ?? null,
        editingImageName: ctx?.editingImageName || 'edited.png',
      }))
      sessionStorage.removeItem(STORAGE_KEY)
      window.location.hash = '#/user/blog/request'
    } catch (e) {
      console.error('Failed to save editor result:', e)
      sessionStorage.removeItem(STORAGE_KEY)
      window.location.hash = '#/user/blog/request'
    }
  }

  const handleClose = () => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(RESULT_KEY)
    window.location.hash = '#/user/blog/request'
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center p-6">
          <p className="mb-4">{error}</p>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded bg-white/20 hover:bg-white/30"
          >
            Back to form
          </button>
        </div>
      </div>
    )
  }

  if (!ctx) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white">
        <div className="animate-pulse">Loading editor...</div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden bg-slate-900"
      style={{
        width: '100vw',
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
        boxSizing: 'border-box',
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap"
        rel="stylesheet"
      />
      <ImageEditor
        images={[]}
        setImages={() => {}}
        source={ctx.source}
        onSave={handleSave}
        onClose={handleClose}
        fullPage
      />
    </div>
  )
}
