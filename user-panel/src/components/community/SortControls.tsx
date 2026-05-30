import type { AnswerSort } from '../../types/community'

interface SortControlsProps {
  value: AnswerSort
  onChange: (sort: AnswerSort) => void
  className?: string
}

const OPTIONS: { id: AnswerSort; label: string }[] = [
  { id: 'top', label: 'Best' },
  { id: 'new', label: 'New' },
  { id: 'old', label: 'Old' },
]

export default function SortControls({ value, onChange, className = '' }: SortControlsProps) {
  return (
    <div
      className={`inline-flex rounded-full border border-[#e8eef4] bg-[#f0f5f9] p-1 ${className}`}
      role="tablist"
      aria-label="Sort answers"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-4 py-1.5 text-[12px] font-semibold transition-all duration-150 ease-out min-h-[36px] min-w-[56px] ${
              active
                ? 'bg-white text-[#1B4965] shadow-sm'
                : 'text-[#64748b] hover:text-[#1B4965]'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
