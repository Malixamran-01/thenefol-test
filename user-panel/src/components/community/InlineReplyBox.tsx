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
    <div className="mt-3 animate-[fadeIn_200ms_ease-out] rounded-xl border border-[#d0e8f5] bg-[#f8fbfd] p-3">
      <p className="mb-2 text-[11px] font-semibold tracking-wide text-[#4B97C9]">
        Replying to @{replyingToName}
      </p>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        rows={3}
        placeholder="Write your reply…"
        className="mb-3 w-full min-h-[80px] resize-none rounded-lg border border-[#d0e8f5] bg-white px-3 py-2.5 text-[16px] leading-relaxed text-[#374151] outline-none transition-shadow duration-150 focus:border-[#4B97C9] focus:ring-[3px] focus:ring-[rgba(75,151,201,0.15)] sm:text-[14px]"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[44px] rounded-lg px-4 text-[13px] font-semibold text-[#64748b] transition-colors hover:text-[#1B4965]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || !value.trim()}
          onClick={onSubmit}
          className="min-h-[44px] rounded-lg bg-[#1B4965] px-5 text-[13px] font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-[#163d52] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {submitting ? 'Posting…' : 'Submit'}
        </button>
      </div>
    </div>
  )
}
