import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Package, Sparkles } from 'lucide-react'
import { communityAPI, type CommunityQuestion } from '../services/communityAPI'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'
import CommentTree from '../components/community/CommentTree'
import { formatCommunityTime } from '../utils/communityTime'

function productThumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

function ThreadSkeleton() {
  return (
    <div className="min-h-full bg-[#F4F9F9] px-4 pb-32 pt-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="h-5 w-32 animate-pulse rounded bg-[#d0e8f5]" />
        <div className="animate-pulse rounded-2xl border border-[#e8eef4] bg-white p-6 shadow-sm">
          <div className="mb-4 h-4 w-24 rounded bg-[#e8eef4]" />
          <div className="mb-2 h-7 w-3/4 rounded bg-[#e8eef4]" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[#e8eef4]" />
            <div className="h-3 w-5/6 rounded bg-[#e8eef4]" />
          </div>
        </div>
        <div className="animate-pulse rounded-2xl border border-[#e8eef4] bg-white p-6">
          <div className="h-4 w-28 rounded bg-[#e8eef4]" />
        </div>
      </div>
    </div>
  )
}

export default function AskCommunityThreadPage({ questionId }: { questionId: number }) {
  const { isAuthenticated, user } = useAuth()
  const [question, setQuestion] = useState<CommunityQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [treeRefresh, setTreeRefresh] = useState(0)

  const loadQuestion = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await communityAPI.getQuestion(questionId)
      setQuestion(data.question)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [questionId])

  useEffect(() => {
    loadQuestion()
  }, [loadQuestion])

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true
    sessionStorage.setItem('post_login_redirect', window.location.hash)
    window.location.hash = '#/user/login'
    return false
  }

  const currentUser = user ? { id: user.id, name: user.name } : null

  const postTopLevelAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireAuth()) return
    const text = answerText.trim()
    if (text.length < 2 || text.length > 2000) return

    setSubmitting(true)
    setError(null)

    try {
      await communityAPI.createAnswer({
        question_id: questionId,
        content: text,
      })
      setAnswerText('')
      setQuestion((q) => (q ? { ...q, answer_count: q.answer_count + 1 } : q))
      setTreeRefresh((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post answer')
      setAnswerText(text)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <ThreadSkeleton />

  if (error && !question) {
    return (
      <div className="min-h-full bg-[#F4F9F9] px-4 py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-[15px] text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/user/blog/ask-community'
            }}
            className="mt-4 inline-flex min-h-[44px] items-center gap-1 text-[14px] font-semibold text-[#1B4965] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Ask Community
          </button>
        </div>
      </div>
    )
  }

  if (!question) return null

  const isProduct = question.topic_type === 'product'

  return (
    <div className="min-h-full bg-[#F4F9F9] pb-36 pt-4 sm:pb-20 sm:pt-6">
      <div className="mx-auto max-w-2xl px-4">
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/user/blog/ask-community'
          }}
          className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 text-[14px] font-semibold text-[#1B4965] transition-colors hover:text-[#4B97C9]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Ask Community
        </button>

        <article className="mb-6 overflow-hidden rounded-2xl border border-[#e8eef4] bg-white shadow-[0_1px_3px_rgba(27,73,101,0.06),0_8px_24px_rgba(27,73,101,0.06)]">
          <div className="h-1 bg-gradient-to-r from-[#4B97C9] via-[#1B4965] to-[#4B97C9]" />

          <div className="p-5 sm:p-6">
            {isProduct && (question.product_list_image || question.product_slug) && (
              <div className="mb-4 flex gap-3 rounded-xl border border-[#e8eef4] bg-[#fafcfd] p-3">
                {question.product_list_image && (
                  <img
                    src={productThumb(question.product_list_image)}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-[#e8eef4]"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    <Package className="h-3 w-3" />
                    Product
                  </span>
                  {question.product_slug ? (
                    <a
                      href={`#/user/product/${question.product_slug}`}
                      className="mt-1 block text-[13px] font-medium leading-snug text-[#4B97C9] hover:underline"
                    >
                      {question.product_title || question.product_name}
                    </a>
                  ) : (
                    <p className="mt-1 text-[13px] font-medium text-[#64748b]">
                      {question.product_title || question.product_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!isProduct && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                <Sparkles className="h-3 w-3" />
                Brand
              </span>
            )}

            <h1 className="text-[22px] font-bold leading-tight tracking-tight text-[#1a1a1a] sm:text-2xl">
              {question.title}
            </h1>

            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[#374151]">
              {question.body}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#e8eef4] pt-4 text-[13px] text-[#64748b]">
              <span>
                Asked by{' '}
                <span className="font-semibold text-[#1B4965]">{question.author_name}</span>
                {question.author_is_verified && (
                  <AuthorVerifiedBadge className="ml-0.5 inline h-3.5 w-3.5 align-text-bottom" />
                )}
              </span>
              <span className="text-[#cbd5e1]" aria-hidden>
                ·
              </span>
              <time dateTime={question.created_at}>{formatCommunityTime(question.created_at)}</time>
            </div>
          </div>
        </article>

        <div className="mb-6">
          <CommentTree
            questionId={questionId}
            answerCount={question.answer_count}
            currentUser={currentUser}
            onRequireAuth={requireAuth}
            onError={setError}
            refreshKey={treeRefresh}
          />
        </div>

        {/* Desktop inline composer */}
        <form
          onSubmit={postTopLevelAnswer}
          className="hidden rounded-2xl border border-[#e8eef4] bg-white p-5 shadow-[0_1px_3px_rgba(27,73,101,0.06)] sm:block"
        >
          <label htmlFor="thread-answer" className="mb-3 block text-[15px] font-semibold text-[#1B4965]">
            Your answer
          </label>
          <textarea
            id="thread-answer"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            placeholder={isAuthenticated ? 'Share what you know…' : 'Sign in to answer'}
            disabled={!isAuthenticated}
            className="mb-3 w-full resize-none rounded-xl border border-[#e8eef4] bg-white px-4 py-3 text-[16px] leading-relaxed text-[#374151] outline-none transition-shadow duration-150 placeholder:text-[#94a3b8] focus:border-[#4B97C9] focus:ring-[3px] focus:ring-[rgba(75,151,201,0.15)] disabled:cursor-not-allowed disabled:bg-[#f8fafc] sm:text-[15px]"
          />
          {error && <p className="mb-3 text-[14px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !isAuthenticated || answerText.trim().length < 2}
            className="min-h-[44px] rounded-full bg-[#1B4965] px-6 text-[14px] font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-px hover:bg-[#163d52] hover:shadow-md active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {submitting ? 'Posting…' : 'Post answer'}
          </button>
        </form>
      </div>

      {/* Mobile sticky composer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e8eef4] bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(27,73,101,0.08)] backdrop-blur-md sm:hidden">
        <form onSubmit={postTopLevelAnswer}>
          <label htmlFor="thread-answer-mobile" className="sr-only">
            Your answer
          </label>
          <textarea
            id="thread-answer-mobile"
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value.slice(0, 2000))}
            rows={2}
            maxLength={2000}
            placeholder={isAuthenticated ? 'Share what you know…' : 'Sign in to answer'}
            disabled={!isAuthenticated}
            className="mb-2 w-full resize-none rounded-xl border border-[#e8eef4] bg-[#fafcfd] px-3 py-2.5 text-[16px] leading-relaxed outline-none focus:border-[#4B97C9] focus:ring-[3px] focus:ring-[rgba(75,151,201,0.15)] disabled:bg-[#f1f5f9]"
          />
          {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !isAuthenticated || answerText.trim().length < 2}
            className="w-full min-h-[44px] rounded-xl bg-[#1B4965] text-[14px] font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Posting…' : 'Post answer'}
          </button>
        </form>
      </div>
    </div>
  )
}
