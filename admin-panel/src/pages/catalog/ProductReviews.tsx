import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import { socketService } from '../../services/socket'
import { getApiBaseUrl } from '../../utils/apiUrl'

type ReviewStatus = 'pending' | 'approved' | 'rejected'
type TabKey = ReviewStatus | 'all' | 'unlinked'

type Review = {
  id: number
  /** null when the product was deleted; the review waits on the Unlinked tab */
  product_id: number | null
  order_id: number | null
  customer_name: string
  customer_email: string
  rating: number
  title: string | null
  review_text: string | null
  images: string[] | null
  is_verified: boolean
  is_featured: boolean
  status: ReviewStatus
  created_at: string
  product_title: string | null
  product_slug: string | null
  product_image: string | null
  product_sku: string | null
  unlinked_at: string | null
}

/** Unlinked reviews grouped by the product they were left behind by */
type UnlinkedGroup = {
  product_slug: string | null
  product_sku: string | null
  product_title: string | null
  review_count: number
  approved_count: number
  average_rating: number
  unlinked_at: string | null
  review_ids: number[]
  suggested_product_id: number | null
  suggested_product_title: string | null
  suggested_product_slug: string | null
  suggested_match: 'sku' | 'slug' | 'name' | null
}

type ProductOption = { id: number; title: string; slug: string; details?: { sku?: string } }

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
  { key: 'unlinked', label: 'Unlinked' },
]

const STATUS_STYLES: Record<ReviewStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-gray-100 text-gray-600 border-gray-200',
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`h-4 w-4 ${i <= value ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  )
}

export default function ProductReviews() {
  const { notify } = useToast()
  const apiBase = getApiBaseUrl()
  const [tab, setTab] = useState<TabKey>('pending')
  const [query, setQuery] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [counts, setCounts] = useState<Record<ReviewStatus | 'unlinked', number>>({ pending: 0, approved: 0, rejected: 0, unlinked: 0 })
  const [groups, setGroups] = useState<UnlinkedGroup[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)

  const headers = useMemo((): Record<string, string> => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = localStorage.getItem('auth_token')
    if (token) h.Authorization = `Bearer ${token}`
    const role = localStorage.getItem('role')
    if (role) h['x-user-role'] = role
    const permissions = localStorage.getItem('permissions')
    if (permissions) h['x-user-permissions'] = permissions
    return h
  }, [])

  const toAbs = (u?: string | null) => {
    if (!u) return ''
    if (/^https?:\/\//i.test(u)) return u
    return `${apiBase.replace(/\/api\/?$/, '')}${u.startsWith('/') ? '' : '/'}${u}`
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: tab, limit: '100' })
      if (query.trim()) params.set('q', query.trim())
      const res = await fetch(`${apiBase}/admin/product-reviews?${params}`, { headers })
      if (!res.ok) throw new Error(res.status === 401 ? 'Admin session required' : `HTTP ${res.status}`)
      const data = await res.json()
      setReviews(Array.isArray(data?.reviews) ? data.reviews : [])
      if (data?.counts) setCounts((prev) => ({ ...prev, ...data.counts }))
      if (tab === 'unlinked') {
        const g = await fetch(`${apiBase}/admin/product-reviews/unlinked-groups`, { headers })
        if (!g.ok) throw new Error(`HTTP ${g.status}`)
        const groupData = await g.json()
        setGroups(Array.isArray(groupData) ? groupData : [])
      }
    } catch (err) {
      notify('error', `Failed to load reviews: ${(err as Error).message}`)
    } finally {
      setLoading(false)
    }
  }, [apiBase, headers, tab, query, notify])

  useEffect(() => {
    const t = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, query])

  // Product list for the relink picker, loaded the first time the Unlinked tab opens
  useEffect(() => {
    if (tab !== 'unlinked' || products.length) return
    fetch(`${apiBase}/products?_=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => setProducts(Array.isArray(list) ? [...list].sort((a, b) => String(a.title).localeCompare(String(b.title))) : []))
      .catch(() => notify('error', 'Failed to load products'))
  }, [tab, products.length, apiBase, notify])

  const relink = async (reviewIds: number[], product: ProductOption) => {
    const res = await fetch(`${apiBase}/admin/product-reviews/relink`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ review_ids: reviewIds, product_id: product.id }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || err?.message || `HTTP ${res.status}`)
    }
    const data = await res.json()
    notify('success', `Moved ${data?.relinked ?? reviewIds.length} review(s) to "${product.title}"`)
    await load()
  }

  // New storefront reviews arrive in real time
  useEffect(() => {
    const unsubscribe = socketService.subscribe('product_reviews_created', () => load())
    return () => { if (unsubscribe) unsubscribe() }
  }, [load])

  const update = async (review: Review, patch: { status?: ReviewStatus; is_featured?: boolean }) => {
    setBusyId(review.id)
    try {
      const res = await fetch(`${apiBase}/admin/product-reviews/${review.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      if (patch.status) {
        notify('success', patch.status === 'approved' ? 'Review approved — now live on the product page' : `Review ${patch.status}`)
      }
      await load()
    } catch (err) {
      notify('error', `Update failed: ${(err as Error).message}`)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (review: Review) => {
    if (!confirm(`Delete this review by ${review.customer_name}? This cannot be undone.`)) return
    setBusyId(review.id)
    try {
      const res = await fetch(`${apiBase}/admin/product-reviews/${review.id}`, { method: 'DELETE', headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      notify('success', 'Review deleted')
      await load()
    } catch (err) {
      notify('error', `Delete failed: ${(err as Error).message}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-8" style={{ fontFamily: 'var(--font-body-family, Inter, sans-serif)' }}>
      <div className="admin-page-header">
        <div>
          <h1
            className="text-2xl sm:text-3xl font-light mb-2 tracking-[0.15em]"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading-family, "Cormorant Garamond", serif)', letterSpacing: '0.15em' }}
          >
            Product Reviews
          </h1>
          <p className="text-sm font-light tracking-wide" style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            New customer reviews wait here until you approve them. Only approved reviews appear on the storefront.
            Reviews of a deleted product are kept on the Unlinked tab and come back automatically when a product with the same SKU or slug is uploaded.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((t) => {
            const count = t.key === 'all' ? counts.pending + counts.approved + counts.rejected : counts[t.key]
            const highlight = (t.key === 'pending' || t.key === 'unlinked') && count > 0
            const active = tab === t.key
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${active ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {t.label}
                <span className={`ml-2 rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : highlight ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, product or text"
          className="w-full sm:w-72 rounded-xl border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
          style={{ borderColor: 'var(--arctic-blue-light)', backgroundColor: 'var(--arctic-blue-lighter)' }}
        />
      </div>

      {tab === 'unlinked' ? (
        loading && groups.length === 0 ? (
          <div className="metric-card text-sm text-gray-500">Loading unlinked reviews…</div>
        ) : groups.length === 0 ? (
          <div className="metric-card text-sm text-gray-500">No unlinked reviews. Every review belongs to a current product.</div>
        ) : (
          <div className="space-y-4">
            {groups
              .filter((g) => !query.trim() || g.review_ids.some((id) => reviews.some((r) => r.id === id)))
              .map((g) => (
                <UnlinkedGroupCard
                  key={g.review_ids.join(',')}
                  group={g}
                  reviews={reviews.filter((r) => g.review_ids.includes(r.id))}
                  products={products}
                  onRelink={relink}
                />
              ))}
          </div>
        )
      ) : loading && reviews.length === 0 ? (
        <div className="metric-card text-sm text-gray-500">Loading reviews…</div>
      ) : reviews.length === 0 ? (
        <div className="metric-card text-sm text-gray-500">
          {tab === 'pending' ? 'No reviews waiting for approval.' : 'No reviews found.'}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="metric-card">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex items-start gap-3 sm:w-56 sm:flex-shrink-0">
                  {r.product_image ? (
                    <img src={toAbs(r.product_image)} alt="" className="h-12 w-12 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-12 flex-shrink-0 rounded bg-gray-100" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-gray-900" title={r.product_title || ''}>{r.product_title || `Product #${r.product_id}`}</div>
                    <span className={`mt-1 inline-block rounded border px-2 py-0.5 text-xs capitalize ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    {r.product_id == null && (
                      <button onClick={() => setTab('unlinked')} className="mt-1 ml-1 inline-block rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100" title="The product was deleted. Open the Unlinked tab to move this review.">
                        Unlinked
                      </button>
                    )}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Stars value={r.rating} />
                    {r.title && <span className="font-medium text-gray-900">{r.title}</span>}
                  </div>
                  {r.review_text && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.review_text}</p>}
                  {Array.isArray(r.images) && r.images.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.images.map((src, i) => (
                        <a key={i} href={toAbs(src)} target="_blank" rel="noreferrer">
                          <img src={toAbs(src)} alt="" className="h-16 w-16 rounded object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{r.customer_name}</span>
                    <span>{r.customer_email}</span>
                    <span>{new Date(r.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {r.is_verified ? (
                      <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-700">Verified buyer</span>
                    ) : (
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">No matching order</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-row flex-wrap items-start gap-2 sm:w-40 sm:flex-col sm:items-stretch">
                  {r.status !== 'approved' && (
                    <button disabled={busyId === r.id} onClick={() => update(r, { status: 'approved' })} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                      Approve
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button disabled={busyId === r.id} onClick={() => update(r, { status: 'rejected' })} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      {r.status === 'approved' ? 'Unpublish' : 'Reject'}
                    </button>
                  )}
                  {r.status === 'approved' && (
                    <button disabled={busyId === r.id} onClick={() => update(r, { is_featured: !r.is_featured })} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      {r.is_featured ? 'Unpin' : 'Pin to top'}
                    </button>
                  )}
                  <button disabled={busyId === r.id} onClick={() => remove(r)} className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UnlinkedGroupCard({
  group,
  reviews,
  products,
  onRelink,
}: {
  group: UnlinkedGroup
  reviews: Review[]
  products: ProductOption[]
  onRelink: (reviewIds: number[], product: ProductOption) => Promise<void>
}) {
  const [productId, setProductId] = useState<string>(group.suggested_product_id ? String(group.suggested_product_id) : '')
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const options = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q
      ? products.filter((p) => [p.title, p.slug, p.details?.sku].some((v) => String(v || '').toLowerCase().includes(q)))
      : products
    // Keep the selected product in the list even when the filter hides it
    const selected = products.find((p) => String(p.id) === productId)
    return selected && !list.includes(selected) ? [selected, ...list] : list
  }, [products, filter, productId])

  const target = products.find((p) => String(p.id) === productId)
  const matchLabel = { sku: 'same SKU', slug: 'same slug', name: 'same product name' } as const

  const submit = async () => {
    if (!target) return
    setBusy(true)
    setError('')
    try {
      await onRelink(group.review_ids, target)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="metric-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-wide text-gray-500">Deleted product</div>
          <div className="truncate text-base font-medium text-gray-900" title={group.product_title || ''}>
            {group.product_title || group.product_slug || 'Unknown product'}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {group.product_slug && <span>Slug: <span className="text-gray-700">{group.product_slug}</span></span>}
            <span>SKU: <span className="text-gray-700">{group.product_sku || '—'}</span></span>
            {group.unlinked_at && <span>Deleted {new Date(group.unlinked_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <Stars value={Math.round(group.average_rating)} />
            <span>{Number(group.average_rating).toFixed(1)}</span>
            <span className="text-gray-400">·</span>
            <span>{group.review_count} review{group.review_count === 1 ? '' : 's'} ({group.approved_count} approved)</span>
          </div>
          {reviews.length > 0 && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-gray-600">Show reviews</summary>
              <ul className="mt-2 space-y-2">
                {reviews.map((r) => (
                  <li key={r.id} className="rounded border border-gray-100 p-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <Stars value={r.rating} />
                      <span className="text-gray-800">{r.customer_name}</span>
                      <span className={`rounded border px-1.5 py-0.5 capitalize ${STATUS_STYLES[r.status]}`}>{r.status}</span>
                    </div>
                    {r.title && <div className="mt-1 font-medium text-gray-900">{r.title}</div>}
                    {r.review_text && <p className="mt-0.5 line-clamp-3 text-gray-700">{r.review_text}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="w-full space-y-2 lg:w-80 lg:flex-shrink-0">
          <label className="block text-xs font-medium text-gray-600" htmlFor={`relink-${group.review_ids[0]}`}>Move these reviews to</label>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name, slug or SKU"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
          />
          <select
            id={`relink-${group.review_ids[0]}`}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--arctic-blue-primary)]"
          >
            <option value="">{products.length ? 'Choose a product…' : 'Loading products…'}</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}{p.details?.sku ? ` (${p.details.sku})` : ''}
              </option>
            ))}
          </select>
          {group.suggested_product_id != null && String(group.suggested_product_id) === productId && group.suggested_match && (
            <div className="text-xs text-blue-700">Suggested: {matchLabel[group.suggested_match]}</div>
          )}
          <button
            disabled={!target || busy}
            onClick={submit}
            className="w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {busy ? 'Moving…' : `Move ${group.review_count} review${group.review_count === 1 ? '' : 's'}`}
          </button>
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>
      </div>
    </div>
  )
}
