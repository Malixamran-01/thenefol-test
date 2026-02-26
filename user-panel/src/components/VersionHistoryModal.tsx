import React from 'react'
import { X, FileText, Question } from '@phosphor-icons/react'

export interface DraftVersion {
  id: number
  title: string
  content: string
  excerpt: string
  status: string
  version: number
  createdAt: string
  updatedAt: string
  authorName: string
  snapshotReason?: string
}

interface VersionHistoryModalProps {
  open: boolean
  onClose: () => void
  draftVersions: DraftVersion[]
  selectedVersionId: number | null
  onSelectVersion: (id: number) => void
  onRestore: (versionId: number) => Promise<void>
}

export default function VersionHistoryModal({
  open,
  onClose,
  draftVersions,
  selectedVersionId,
  onSelectVersion,
  onRestore,
}: VersionHistoryModalProps) {
  if (!open) return null

  const handleRestore = async () => {
    if (!selectedVersionId) return
    await onRestore(selectedVersionId)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[75] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-6xl animate-modal-in"
        style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex-shrink-0 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Version history</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full border-2 transition-colors"
            style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: two independent scroll panels */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Left: Content Preview */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', borderRight: '1px solid #e5e7eb' }}>
            {selectedVersionId ? (
              (() => {
                const v = draftVersions.find(x => x.id === selectedVersionId)
                const text = v ? (v.content || '').replace(/<[^>]*>/g, ' ').trim() : ''
                return text ? (
                  <div className="prose prose-sm max-w-none break-words">
                    <p className="whitespace-pre-wrap break-words text-gray-800">
                      {text.slice(0, 2000)}{text.length > 2000 ? '...' : ''}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <FileText size={48} className="mb-3 text-gray-300" />
                    <p className="font-semibold text-gray-700">This version is empty</p>
                    <p className="text-sm text-gray-500 mt-1">Please select another version</p>
                  </div>
                )
              })()
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <FileText size={48} className="mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">This version is empty</p>
                <p className="text-sm text-gray-500 mt-1">Please select another version</p>
              </div>
            )}
          </div>

          {/* Right: Version List */}
          <div style={{ width: '280px', flexShrink: 0, overflowY: 'auto', padding: '24px 16px' }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">From this week</p>
            <div className="space-y-1">
              {draftVersions.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No versions yet</p>
              ) : (
                draftVersions.map((v, i) => {
                  const d = new Date(v.updatedAt || v.createdAt)
                  const isCurrent = i === 0
                  const isManual = v.snapshotReason === 'MANUAL_SAVE'
                  const versionType = isManual ? 'Manual'
                    : v.snapshotReason === 'PUBLISH' ? 'Publish'
                    : v.snapshotReason === 'RESTORE' ? 'Restored'
                    : 'Auto'
                  const dateStr = d.toLocaleDateString('en-GB').replace(/\//g, '/')
                  const timeStr = d.toLocaleString()
                  const isSelected = selectedVersionId === v.id

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onSelectVersion(v.id)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        borderLeft: isSelected ? '3px solid rgb(75,151,201)' : '3px solid transparent',
                        backgroundColor: isSelected ? 'rgba(75,151,201,0.08)' : 'transparent',
                        transition: 'all 0.15s',
                        cursor: 'pointer',
                        border: 'none',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = '#f9fafb' }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-bold text-gray-900">{dateStr}</span>
                        {isCurrent && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                            Current version
                          </span>
                        )}
                      </div>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-1 ${
                          isManual
                            ? 'bg-emerald-100 text-emerald-700'
                            : v.snapshotReason === 'RESTORE'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {versionType}
                      </span>
                      <p className="text-xs text-gray-500">{timeStr}</p>
                      <p className="text-xs text-gray-700 mt-0.5">{v.authorName || 'Unknown'}</p>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 px-6 py-4 flex items-center justify-between bg-gray-50">
          <button type="button" className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors" title="Help">
            <Question size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              disabled={!selectedVersionId}
              onClick={handleRestore}
              className="px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgb(75,151,201)', color: 'white' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'rgb(60,120,160)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgb(75,151,201)' }}
            >
              Restore draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
