import { useMemo, useState } from 'react'
import { GripVertical, Save, RefreshCw, Plus, X } from 'lucide-react'
import type { CatalogProductRow } from '../utils/justLandedProducts'
import { filterCatalogForJustLanded } from '../utils/justLandedProducts'

type Props = {
  catalog: CatalogProductRow[]
  orderedSlugs: string[]
  onChange: (slugs: string[]) => void
  onSave: () => Promise<void>
  saving?: boolean
}

export default function JustLandedOrderEditor({
  catalog,
  orderedSlugs,
  onChange,
  onSave,
  saving = false,
}: Props) {
  const [draggedSlug, setDraggedSlug] = useState<string | null>(null)
  const [dragOverSlug, setDragOverSlug] = useState<string | null>(null)

  const eligible = useMemo(() => filterCatalogForJustLanded(catalog), [catalog])
  const bySlug = useMemo(() => new Map(eligible.map((p) => [p.slug, p])), [eligible])

  const orderedProducts = useMemo(
    () =>
      orderedSlugs
        .map((slug) => bySlug.get(slug))
        .filter((p): p is CatalogProductRow => Boolean(p)),
    [orderedSlugs, bySlug]
  )

  const notInList = useMemo(
    () => eligible.filter((p) => !orderedSlugs.includes(p.slug)),
    [eligible, orderedSlugs]
  )

  const moveSlug = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    const next = [...orderedSlugs]
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    onChange(next)
  }

  const removeSlug = (slug: string) => {
    onChange(orderedSlugs.filter((s) => s !== slug))
  }

  const addSlug = (slug: string) => {
    if (!slug || orderedSlugs.includes(slug)) return
    onChange([...orderedSlugs, slug])
  }

  const resetToCatalog = () => {
    onChange(eligible.map((p) => p.slug))
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Drag products to set the order on the homepage <strong>What&apos;s Just Landed</strong> carousel.
        First item = leftmost on desktop. Combo products are excluded.
      </p>

      {orderedProducts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
          No products in the list yet. Add products below or reset to include all catalog items.
        </p>
      ) : (
        <ul className="space-y-2">
          {orderedProducts.map((product, index) => {
            const isDragging = draggedSlug === product.slug
            const isOver = dragOverSlug === product.slug && draggedSlug !== product.slug
            return (
              <li
                key={product.slug}
                draggable
                onDragStart={() => setDraggedSlug(product.slug)}
                onDragEnd={() => {
                  setDraggedSlug(null)
                  setDragOverSlug(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverSlug(product.slug)
                }}
                onDragLeave={() => setDragOverSlug(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  if (!draggedSlug || draggedSlug === product.slug) return
                  const fromIndex = orderedSlugs.indexOf(draggedSlug)
                  const toIndex = index
                  if (fromIndex >= 0) moveSlug(fromIndex, toIndex)
                  setDraggedSlug(null)
                  setDragOverSlug(null)
                }}
                className={`flex items-center gap-3 rounded-lg border bg-white p-2 shadow-sm transition-all ${
                  isDragging ? 'opacity-50' : ''
                } ${isOver ? 'border-teal-500 ring-2 ring-teal-200' : 'border-gray-200'}`}
              >
                <span className="cursor-grab text-gray-400 active:cursor-grabbing" title="Drag to reorder">
                  <GripVertical className="h-5 w-5" />
                </span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-800">
                  {index + 1}
                </span>
                {product.list_image ? (
                  <img
                    src={product.list_image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded object-cover bg-gray-100"
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-400">
                    —
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{product.title}</p>
                  <p className="truncate text-xs text-gray-500">{product.slug}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSlug(product.slug)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Remove from list"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {notInList.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Add to carousel</p>
          <div className="flex flex-wrap gap-2">
            {notInList.map((p) => (
              <button
                key={p.slug}
                type="button"
                onClick={() => addSlug(p.slug)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:border-teal-500 hover:text-teal-700"
              >
                <Plus className="h-3 w-3" />
                {p.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save product order'}
        </button>
        <button
          type="button"
          onClick={resetToCatalog}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Reset to full catalog
        </button>
        <span className="self-center text-xs text-gray-500">{orderedSlugs.length} product(s) in order</span>
      </div>
    </div>
  )
}
