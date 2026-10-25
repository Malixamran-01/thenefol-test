import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from '../../components/ToastProvider'
import { socketService } from '../../services/socket'
import { getApiBaseUrl } from '../../utils/apiUrl'

type ReviewStatus = 'pending' | 'approved' | 'rejected'

type Review = {
  id: number
  product_id: number
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
}

const TABS: Array<{ key: ReviewStatus | 'all'; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
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
  const [tab, setTab] = useState<ReviewStatus | 'all'>('pending')
  const [query, setQuery] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [counts, setCounts] = useState<Record<ReviewStatus, number>>({ pending: 0, approved: 0, rejected: 0 })
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
      if (data?.counts) setCounts(data.counts)
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
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist">
          {TABS.map((t) => {
            const count = t.key === 'all' ? counts.pending + counts.approved + counts.rejected : counts[t.key]
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
                <span className={`ml-2 rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : t.key === 'pending' && count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
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

      {loading && reviews.length === 0 ? (
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
