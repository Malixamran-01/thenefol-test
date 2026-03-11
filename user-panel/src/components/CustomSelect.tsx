import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  className?: string
  align?: 'left' | 'right'
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  className = '',
  align = 'right'
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:shadow focus:outline-none"
        style={{ minWidth: '90px' }}
      >
        <span className="flex-1 text-left truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[140px] rounded-xl border border-gray-100 bg-white py-1 shadow-xl ring-1 ring-black/5 ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {options.map(option => {
            const isActive = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false) }}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-[#EAF3F8] text-[#1B4965] font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{option.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#1B4965' }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
