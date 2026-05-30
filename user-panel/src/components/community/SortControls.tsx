import type { AnswerSort } from '../../types/community'

interface SortControlsProps {
  value: AnswerSort
  onChange: (sort: AnswerSort) => void
}

const OPTIONS: { id: AnswerSort; label: string }[] = [
  { id: 'top', label: 'Best' },
  { id: 'new', label: 'New' },
  { id: 'old', label: 'Old' },
]

export default function SortControls({ value, onChange }: SortControlsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className="rounded-full px-3.5 py-1 text-xs font-semibold transition-colors"
          style={
            value === opt.id
              ? { background: '#1B4965', color: '#fff' }
              : {
                  background: '#fff',
                  border: '1px solid #e8eef4',
                  color: '#64748b',
                }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
