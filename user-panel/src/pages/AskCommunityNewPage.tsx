import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Package, Search, Sparkles } from 'lucide-react'
import { productsAPI, type Product } from '../services/api'
import { communityAPI, type CommunityTopicType } from '../services/communityAPI'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'

function productThumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

export default function AskCommunityNewPage() {
  const [step, setStep] = useState<'topic' | 'form'>('topic')
  const [topicType, setTopicType] = useState<CommunityTopicType | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select product if navigated from PDP with ?product_id=X
  useEffect(() => {
    const match = window.location.hash.match(/[?&]product_id=(\d+)/)
    if (match) {
      const pid = Number(match[1])
      if (Number.isFinite(pid)) {
        setTopicType('product')
        setStep('form')
      }
    }
  }, [])

  useEffect(() => {
    if (topicType !== 'product' || step !== 'form') return
    let cancelled = false
    setProductsLoading(true)
    const pidMatch = window.location.hash.match(/[?&]product_id=(\d+)/)
    const preselectedId = pidMatch ? Number(pidMatch[1]) : null
    productsAPI
      .getAll()
      .then((list) => {
        if (!cancelled) {
          const arr = Array.isArray(list) ? list : []
          setProducts(arr)
          if (preselectedId) {
            const found = arr.find((p: { id: number }) => p.id === preselectedId)
            if (found) setSelectedProduct(found)
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load products')
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [topicType, step])

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    )
  }, [products, productSearch])

  const pickTopic = (type: CommunityTopicType) => {
    setTopicType(type)
    setStep('form')
    setError(null)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicType) return
    if (topicType === 'product' && !selectedProduct) {
      setError('Please select a product')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const created = await communityAPI.createQuestion({
        topic_type: topicType,
        product_id: topicType === 'product' ? selectedProduct!.id : undefined,
        title: title.trim(),
        body: body.trim(),
      })
      window.location.hash = `#/user/blog/ask-community/${created.id}`
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post question')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <button
        type="button"
        onClick={() => {
          if (step === 'form') {
            setStep('topic')
            setTopicType(null)
            setSelectedProduct(null)
          } else {
            window.location.hash = '#/user/blog/ask-community'
          }
        }}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[#4B97C9] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="mb-2 text-2xl font-bold text-[#1B4965]">Ask a question</h1>
      <p className="mb-6 text-sm text-gray-600">
        Your question goes live immediately. The community can reply in the thread.
      </p>

      {step === 'topic' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => pickTopic('product')}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 text-left shadow-sm transition hover:border-[#4B97C9] hover:shadow-md"
          >
            <div className="rounded-xl bg-amber-50 p-3 text-amber-800">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">About a product</p>
              <p className="mt-1 text-sm text-gray-500">
                Pick from our catalog — ingredients, usage, sizing, and more.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => pickTopic('brand')}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 text-left shadow-sm transition hover:border-[#4B97C9] hover:shadow-md"
          >
            <div className="rounded-xl bg-violet-50 p-3 text-violet-800">
              <Sparkles className="h-7 w-7" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">About NEFOL / brand</p>
              <p className="mt-1 text-sm text-gray-500">
                Shipping, sustainability, policies, or anything about us.
              </p>
            </div>
          </button>
        </div>
      )}

      {step === 'form' && topicType && (
        <form onSubmit={submit} className="space-y-5">
          {topicType === 'product' && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">Select product</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#4B97C9]"
                />
              </div>
              {selectedProduct && (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-[#4B97C9] bg-[#4B97C9]/5 p-3">
                  {selectedProduct.list_image && (
                    <img
                      src={productThumb(selectedProduct.list_image)}
                      alt=""
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm">{selectedProduct.title}</p>
                    <button
                      type="button"
                      className="text-xs text-[#4B97C9] hover:underline"
                      onClick={() => setSelectedProduct(null)}
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
              {!selectedProduct && (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                  {productsLoading && (
                    <p className="p-4 text-center text-sm text-gray-500">Loading products…</p>
                  )}
                  {!productsLoading && filteredProducts.length === 0 && (
                    <p className="p-4 text-center text-sm text-gray-500">No products found</p>
                  )}
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProduct(p)}
                      className="flex w-full items-center gap-3 border-b border-gray-50 px-3 py-2.5 text-left last:border-0 hover:bg-gray-50"
                    >
                      {p.list_image ? (
                        <img
                          src={productThumb(p.list_image)}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-lg object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="h-11 w-11 shrink-0 rounded-lg bg-gray-100" />
                      )}
                      <span className="truncate text-sm font-medium text-gray-900">{p.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label htmlFor="cq-title" className="mb-1 block text-sm font-semibold text-gray-800">
              Title
            </label>
            <input
              id="cq-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="Summarize your question in one line"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#4B97C9]"
            />
          </div>

          <div>
            <label htmlFor="cq-body" className="mb-1 block text-sm font-semibold text-gray-800">
              Details
            </label>
            <textarea
              id="cq-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              placeholder="Add context so others can help you better…"
              className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#4B97C9]"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#1B4965] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Posting…' : 'Post question'}
          </button>
        </form>
      )}
    </div>
  )
}
