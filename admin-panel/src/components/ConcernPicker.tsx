import { useEffect, useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { getApiBaseUrl } from '../utils/apiUrl'

export type ConcernOption = { id: number; slug: string; name: string; is_active?: boolean; product_count?: number }

let cache: Promise<ConcernOption[]> | null = null
/** Admin concern list, shared by every picker on the page. Call with `refresh` after creating one. */
export function loadConcernOptions(refresh = false): Promise<ConcernOption[]> {
  if (!cache || refresh) {
    cache = fetch(`${getApiBaseUrl()}/admin/concerns`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => (Array.isArray(rows) ? rows : []))
      .catch(() => [])
  }
  return cache
}

/**
 * Multi-select for Shop by Concern. Value is a list of concern names; names that don't exist yet are
 * created by the backend when the product is saved (same as the CSV "Concern" column).
 */
export default function ConcernPicker({ value, onChange, dark = false }: { value: string[]; onChange: (next: string[]) => void; dark?: boolean }) {
  const [options, setOptions] = useState<ConcernOption[]>([])
  const [draft, setDraft] = useState('')

  useEffect(() => {
    let alive = true
    loadConcernOptions().then((rows) => alive && setOptions(rows))
    return () => { alive = false }
  }, [])

  const selectedKeys = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])
  const toggle = (name: string) => {
    if (selectedKeys.has(name.toLowerCase())) onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()))
    else onChange([...value, name])
  }
  const addDraft = () => {
    const names = draft.split(/[,;|]+/).map((s) => s.trim()).filter(Boolean)
    const next = [...value]
    for (const n of names) if (!next.some((v) => v.toLowerCase() === n.toLowerCase())) next.push(n)
    onChange(next)
    setDraft('')
  }
  const known = new Set(options.map((o) => o.name.toLowerCase()))
  const custom = value.filter((v) => !known.has(v.toLowerCase()))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.filter((o) => o.is_active !== false || selectedKeys.has(o.name.toLowerCase())).map((o) => {
          const on = selectedKeys.has(o.name.toLowerCase())
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.name)}
              aria-pressed={on}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                on
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : dark
                    ? 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {o.name}
            </button>
          )
        })}
        {custom.map((name) => (
          <span key={name} className="inline-flex items-center gap-1 rounded-full border border-teal-600 bg-teal-600 px-3 py-1 text-xs text-white" title="New concern — created when you save">
            {name} (new)
            <button type="button" onClick={() => toggle(name)} aria-label={`Remove ${name}`}><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft() } }}
          placeholder="Add another concern (e.g. Dark circles)"
          className={`flex-1 rounded border px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
            dark ? 'border-white/20 bg-white/10 text-white placeholder-white/50' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
          }`}
        />
        <button type="button" onClick={addDraft} disabled={!draft.trim()} className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
    </div>
  )
}
