import { useEffect, useRef } from 'react'

interface InlineReplyBoxProps {
  replyingToName: string
  value: string
  onChange: (v: string) => void
  onCancel: () => void
  onSubmit: () => void
  submitting?: boolean
  maxLength?: number
}

export default function InlineReplyBox({
  replyingToName,
  value,
  onChange,
  onCancel,
  onSubmit,
  submitting = false,
  maxLength = 2000,
}: InlineReplyBoxProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div
      className="mt-2 animate-[fadeIn_200ms_ease-in]"
      style={{
        background: '#f8fbfd',
        border: '1px solid #d0e8f5',
        borderRadius: 10,
        padding: 12,
      }}
    >
      <p
        className="mb-2 font-semibold"
        style={{ fontSize: 11, color: '#4B97C9' }}
      >
        Replying to @{replyingToName}
      </p>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={3}
        placeholder="Write your reply…"
        className="mb-2 w-full resize-none outline-none"
        style={{
          minHeight: 80,
          fontSize: 13,
          border: '1px solid #d0e8f5',
          borderRadius: 8,
          padding: '8px 10px',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#4B97C9'
          e.target.style.boxShadow = '0 0 0 2px rgba(75,151,201,0.15)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#d0e8f5'
          e.target.style.boxShadow = 'none'
        }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold transition-colors hover:text-[#374151]"
          style={{ color: '#94a3b8' }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !value.trim()}
          onClick={onSubmit}
          className="font-semibold text-white disabled:opacity-50"
          style={{
            background: '#1B4965',
            borderRadius: 8,
            padding: '6px 16px',
            fontSize: 12,
          }}
        >
          {submitting ? 'Posting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
