import { useRef, useState, type FormEvent } from 'react'

interface AnswerPillComposerProps {
  id: string
  value: string
  onChange: (v: string) => void
  onSubmit: (e: FormEvent) => void
  submitting?: boolean
  disabled?: boolean
  placeholder?: string
  error?: string | null
  label?: string
}

export default function AnswerPillComposer({
  id,
  value,
  onChange,
  onSubmit,
  submitting = false,
  disabled = false,
  placeholder = 'Share what you know…',
  error,
  label = 'Your answer',
}: AnswerPillComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [focused, setFocused] = useState(false)
  const expanded = focused || value.includes('\n') || value.length > 80

  const autoResize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const canSubmit = !disabled && !submitting && value.trim().length >= 2

  return (
    <div className="mb-4">
      <label htmlFor={id} className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
        {label}
      </label>
      <form
        onSubmit={onSubmit}
        className={`group/composer flex items-end gap-2 border bg-[#fafcfd] px-2 py-1.5 transition-all duration-200 ${
          expanded ? 'rounded-2xl' : 'rounded-full'
        } ${
          focused
            ? 'border-[#4B97C9] bg-white ring-[3px] ring-[rgba(75,151,201,0.1)]'
            : 'border-[#e8eef4] hover:border-[#d0e8f5]'
        }`}
      >
        <textarea
          ref={ref}
          id={id}
          value={value}
          rows={1}
          maxLength={2000}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => {
            onChange(e.target.value.slice(0, 2000))
            requestAnimationFrame(autoResize)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSubmit) {
                ref.current?.form?.requestSubmit()
              }
            }
          }}
          className="min-h-[40px] max-h-[160px] flex-1 resize-none bg-transparent py-2 pl-3 pr-1 text-[15px] leading-relaxed text-[#374151] outline-none placeholder:text-[#94a3b8] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[14px]"
          style={{ height: expanded ? undefined : '40px' }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Post answer"
          className="flex h-9 shrink-0 items-center rounded-full bg-[#1B4965] px-4 text-[13px] font-semibold text-white transition-all duration-150 hover:bg-[#163d52] active:scale-[0.97] disabled:opacity-40 sm:px-5"
        >
          {submitting ? '…' : 'Post'}
        </button>
      </form>
      {error && <p className="mt-2 px-1 text-[13px] text-red-600">{error}</p>}
      <p className="mt-1.5 px-1 text-[11px] text-[#94a3b8]">
        Press Enter to post · Shift+Enter for new line
      </p>
    </div>
  )
}
