import React from 'react'

type Props = {
  open: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({ open, title = 'Are you sure?', description, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (<p className="text-sm text-gray-600 mb-4">{description}</p>)}
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm border rounded">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose() }} className="px-3 py-2 text-sm rounded bg-red-600 text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  )
}


