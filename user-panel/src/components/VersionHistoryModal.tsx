import React, { useState } from 'react'
import { X, FileText, Question, CaretLeft } from '@phosphor-icons/react'

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
  // On mobile, we show either the list or the preview (not both at once)
  const [mobileView, setMobileView] = useState<'list' | 'preview'>('list')

  if (!open) return null

  const handleRestore = async () => {
    if (!selectedVersionId) return
    await onRestore(selectedVersionId)
    onClose()
  }

  const handleSelectVersion = (id: number) => {
    onSelectVersion(id)
    // On mobile, switch to preview after selecting
    setMobileView('preview')
  }

  const selectedVersion = draftVersions.find(x => x.id === selectedVersionId)
  const previewText = selectedVersion
    ? (selectedVersion.content || '').replace(/<[^>]*>/g, ' ').trim()
    : ''

  const VersionList = () => (
    <div style={{ width: '100%', height: '100%', overflowY: 'auto', padding: '16px' }}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-2">
        From this week
      </p>
      <div className="space-y-1">
        {draftVersions.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 px-2">No versions yet</p>
        ) : (
          draftVersions.map((v, i) => {
            const d = new Date(v.updatedAt || v.createdAt)
            const isCurrent = i === 0
            const isManual = v.snapshotReason === 'MANUAL_SAVE'
            const versionType = isManual
              ? 'Manual'
              : v.snapshotReason === 'PUBLISH'
              ? 'Publish'
              : v.snapshotReason === 'RESTORE'
              ? 'Restored'
              : 'Auto'
            const dateStr = d.toLocaleDateString('en-GB')
            const timeStr = d.toLocaleString()
            const isSelected = selectedVersionId === v.id

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelectVersion(v.id)}
                style={{
                  width: '100%',
                  textAlign: 'left' as const,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  borderLeft: isSelected
                    ? '3px solid rgb(75,151,201)'
                    : '3px solid transparent',
                  backgroundColor: isSelected
                    ? 'rgba(75,151,201,0.08)'
                    : 'transparent',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                  display: 'block',
                }}
                onMouseEnter={e => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                }}
                onMouseLeave={e => {
                  if (!isSelected)
                    e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {/* Date + Current badge */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-bold text-gray-900">{dateStr}</span>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-600">
                      Current version
                    </span>
                  )}
                </div>
                {/* Type badge */}
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
                <p className="text-xs text-gray-700 mt-0.5">
                  {v.authorName || 'Unknown'}
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const ContentPreview = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
      {selectedVersionId && previewText ? (
        <div className="prose prose-sm max-w-none break-words">
          <p className="whitespace-pre-wrap break-words text-gray-800">
            {previewText.slice(0, 2000)}
            {previewText.length > 2000 ? '...' : ''}
          </p>
        </div>
      ) : (
        <div
          style={{ height: '100%', minHeight: '200px' }}
          className="flex flex-col items-center justify-center text-gray-400"
        >
          <FileText size={48} className="mb-3 text-gray-300" />
          <p className="font-semibold text-gray-700">This version is empty</p>
          <p className="text-sm text-gray-500 mt-1">Please select another version</p>
        </div>
      )}
    </div>
  )

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[75] sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:rounded-xl shadow-2xl animate-modal-in"
        style={{
          // Full screen on mobile, constrained on desktop
          height: '95dvh',
          maxHeight: '95dvh',
          display: 'flex',
          flexDirection: 'column',
          // On sm+ screens, limit width
          maxWidth: '72rem',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          {/* Mobile: back button when in preview */}
          <div className="flex items-center gap-2">
            {mobileView === 'preview' && (
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors mr-1"
                aria-label="Back to list"
              >
                <CaretLeft size={18} />
              </button>
            )}
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Version history
            </h3>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full border-2 transition-colors flex-shrink-0"
            style={{ borderColor: 'rgb(75,151,201)', color: 'rgb(75,151,201)' }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* MOBILE: single panel (list OR preview) */}
          <div className="sm:hidden w-full flex flex-col" style={{ overflow: 'hidden' }}>
            {mobileView === 'list' ? (
              <VersionList />
            ) : (
              <ContentPreview />
            )}
          </div>

          {/* DESKTOP: side-by-side panels */}
          <div
            className="hidden sm:flex w-full"
            style={{ overflow: 'hidden', flex: 1 }}
          >
            {/* Left: Content Preview */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                borderRight: '1px solid #e5e7eb',
              }}
            >
              <ContentPreview />
            </div>

            {/* Right: Version List */}
            <div
              style={{
                width: '280px',
                flexShrink: 0,
                overflowY: 'auto',
                padding: '24px 16px',
              }}
            >
              <VersionList />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between bg-gray-50">
          <button
            type="button"
            className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
            title="Help"
          >
            <Question size={18} />
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!selectedVersionId}
              onClick={handleRestore}
              className="px-4 sm:px-5 py-2 sm:py-2.5 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'rgb(75,151,201)', color: 'white' }}
              onMouseEnter={e => {
                if (!e.currentTarget.disabled)
                  e.currentTarget.style.backgroundColor = 'rgb(60,120,160)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'rgb(75,151,201)'
              }}
            >
              Restore draft
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}