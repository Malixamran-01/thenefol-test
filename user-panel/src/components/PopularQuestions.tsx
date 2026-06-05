import { useEffect, useState } from 'react'
import { communityAPI } from '../services/communityAPI'
import type { CommunityQuestion } from '../types/community'
import { MessageCircle, ChevronRight, HelpCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

interface Props {
  productId: number
}

export default function PopularQuestions({ productId }: Props) {
  const { isAuthenticated } = useAuth()
  const [questions, setQuestions] = useState<CommunityQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    communityAPI
      .listQuestions({ product_id: productId, topic_type: 'product', sort: 'active', limit: 3 })
      .then((rows) => { if (!cancelled) setQuestions(rows) })
      .catch(() => { if (!cancelled) setQuestions([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [productId])

  if (loading || questions.length === 0) return null

  const goViewAll = () => {
    window.location.hash = `#/user/blog/ask-community?product_id=${productId}`
  }

  const goAsk = () => {
    if (!isAuthenticated) {
      sessionStorage.setItem('post_login_redirect', `#/user/blog/ask-community/new?product_id=${productId}`)
      window.location.hash = '#/user/login'
      return
    }
    window.location.hash = `#/user/blog/ask-community/new?product_id=${productId}`
  }

  const openThread = (id: number) => {
    window.location.hash = `#/user/blog/ask-community/${id}`
  }

  return (
    <section className="py-8 sm:py-10 md:py-12 bg-[#f7fbff] border-t border-gray-200 w-full">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1B4965]">
              <HelpCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                Popular Questions
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                What others are asking about this product
              </p>
            </div>
          </div>
          <button
            onClick={goViewAll}
            className="flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold text-[#1B4965] hover:text-[#4B97C9] transition-colors"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Question cards */}
        <div className="flex flex-col gap-3">
          {questions.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => openThread(q.id)}
              className="group w-full text-left rounded-2xl border border-gray-200 bg-white px-4 sm:px-5 py-4 shadow-sm hover:border-[#4B97C9] hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-gray-900 leading-snug group-hover:text-[#1B4965] transition-colors line-clamp-2">
                    {q.title}
                  </p>
                  {q.body && (
                    <p className="mt-1 text-xs sm:text-sm text-gray-500 line-clamp-1 leading-relaxed">
                      {q.body}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {q.answer_count === 0
                        ? 'No answers yet'
                        : q.answer_count === 1
                        ? '1 answer'
                        : `${q.answer_count} answers`}
                    </span>
                    {q.author_name && (
                      <span className="text-xs text-gray-400">by {q.author_name}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#4B97C9] flex-shrink-0 mt-0.5 transition-colors" />
              </div>
            </button>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={goViewAll}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border-2 border-[#1B4965] px-5 py-2.5 text-sm font-semibold text-[#1B4965] hover:bg-[#1B4965] hover:text-white transition-all duration-200"
          >
            <MessageCircle className="h-4 w-4" />
            View all questions
          </button>
          <button
            onClick={goAsk}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-[#1B4965] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#163d55] transition-colors"
          >
            <ArrowRight className="h-4 w-4" />
            Ask a question
          </button>
        </div>
      </div>
    </section>
  )
}
