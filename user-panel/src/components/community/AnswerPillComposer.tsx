import { useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'

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
    <div className="mb-6">
      <label htmlFor={id} className="mb-2.5 block text-[13px] font-bold uppercase tracking-wider text-[#1B4965]">
        {label}
      </label>
      <form
        onSubmit={onSubmit}
        className={`group/composer flex items-end gap-2 border-2 bg-white px-2 py-2 shadow-[0_1px_3px_rgba(27,73,101,0.06)] transition-all duration-200 ${
          expanded ? 'rounded-[28px]' : 'rounded-full'
        } ${
          focused
            ? 'border-[#4B97C9] ring-[3px] ring-[rgba(75,151,201,0.12)]'
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
          className="min-h-[44px] max-h-[160px] flex-1 resize-none bg-transparent py-2.5 pl-3 pr-1 text-[16px] leading-relaxed text-[#374151] outline-none placeholder:text-[#94a3b8] disabled:cursor-not-allowed disabled:opacity-60 sm:text-[15px]"
          style={{ height: expanded ? undefined : '44px' }}
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label="Post answer"
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-[#1B4965] px-4 text-[14px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#163d52] hover:shadow-md active:scale-[0.97] disabled:opacity-40 disabled:hover:shadow-sm sm:px-5"
        >
          <Send className="h-4 w-4 sm:hidden" strokeWidth={2.5} />
          <span className="hidden sm:inline">{submitting ? 'Posting…' : 'Post'}</span>
          <span className="sm:hidden">{submitting ? '…' : 'Post'}</span>
        </button>
      </form>
      {error && <p className="mt-2 px-1 text-[13px] text-red-600">{error}</p>}
      <p className="mt-1.5 px-1 text-[11px] text-[#94a3b8]">
        Press Enter to post · Shift+Enter for new line
      </p>
    </div>
  )
}
