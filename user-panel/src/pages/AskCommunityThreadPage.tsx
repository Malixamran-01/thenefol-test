import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Package, Sparkles } from 'lucide-react'
import { communityAPI, type CommunityQuestion } from '../services/communityAPI'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'
import CommentTree from '../components/community/CommentTree'
import AnswerPillComposer from '../components/community/AnswerPillComposer'
import { formatCommunityTime } from '../utils/communityTime'

function productThumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

function ThreadSkeleton() {
  return (
    <div className="min-h-full bg-[#F4F9F9] px-4 pb-32 pt-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-4 w-28 animate-pulse rounded-full bg-[#d0e8f5]" />
        <div className="animate-pulse rounded-xl border border-[#e8eef4] bg-white p-5 shadow-sm">
          <div className="mb-3 h-3 w-20 rounded-full bg-[#e8eef4]" />
          <div className="mb-2 h-6 w-3/4 rounded bg-[#e8eef4]" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-[#e8eef4]" />
            <div className="h-3 w-5/6 rounded bg-[#e8eef4]" />
          </div>
        </div>
        <div className="animate-pulse rounded-xl border border-[#e8eef4] bg-white p-4">
          <div className="h-8 w-full rounded-lg bg-[#e8eef4]" />
        </div>
        <div className="animate-pulse rounded-xl border border-[#e8eef4] bg-white p-4">
          <div className="h-4 w-24 rounded bg-[#e8eef4]" />
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
      await communityAPI.createAnswer({ question_id: questionId, content: text })
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
        <div className="mx-auto max-w-2xl rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-[14px] text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => { window.location.hash = '#/user/blog/ask-community' }}
            className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 text-[13px] font-semibold text-[#1B4965] hover:underline"
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
    <div className="min-h-full bg-[#F4F9F9] pb-10 pt-4 sm:pt-6">
      <div className="mx-auto max-w-2xl px-4">

        {/* Back nav */}
        <button
          type="button"
          onClick={() => { window.location.hash = '#/user/blog/ask-community' }}
          className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-1 text-[13px] font-semibold text-[#64748b] transition-colors hover:text-[#1B4965]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
          Ask Community
        </button>

        {/* Question card */}
        <article className="mb-3 overflow-hidden rounded-xl border border-[#e8eef4] bg-white shadow-[0_1px_4px_rgba(27,73,101,0.07)]">
          {/* Accent bar */}
          <div className="h-[3px] bg-gradient-to-r from-[#4B97C9] via-[#1B4965] to-[#4B97C9]" />

          <div className="p-5">
            {/* Product chip */}
            {isProduct && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-100">
                <Package className="h-3 w-3" />
                Product
              </span>
            )}
            {!isProduct && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-800 border border-violet-100">
                <Sparkles className="h-3 w-3" />
                Brand
              </span>
            )}

            {/* Product ref block */}
            {isProduct && (question.product_list_image || question.product_slug) && (
              <div className="mb-4 flex gap-3 rounded-lg border border-[#e8eef4] bg-[#fafcfd] p-3">
                {question.product_list_image && (
                  <img
                    src={productThumb(question.product_list_image)}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-[#e8eef4]"
                  />
                )}
                <div className="min-w-0 flex-1 flex items-center">
                  {question.product_slug ? (
                    <a
                      href={`#/user/product/${question.product_slug}`}
                      className="text-[13px] font-medium leading-snug text-[#4B97C9] hover:underline line-clamp-2"
                    >
                      {question.product_title || question.product_name}
                    </a>
                  ) : (
                    <p className="text-[13px] font-medium text-[#64748b] line-clamp-2">
                      {question.product_title || question.product_name}
                    </p>
                  )}
                </div>
              </div>
            )}

            <h1 className="text-[20px] font-semibold leading-snug tracking-tight text-[#1a1a1a] sm:text-[22px]">
              {question.title}
            </h1>

            <p className="mt-2.5 whitespace-pre-wrap text-[14px] leading-relaxed text-[#374151]">
              {question.body}
            </p>

            {/* Meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#f0f4f8] pt-3 text-[12px] text-[#94a3b8]">
              <span>
                Asked by{' '}
                <span className="font-semibold text-[#1B4965]">{question.author_name}</span>
                {question.author_is_verified && (
                  <AuthorVerifiedBadge className="ml-0.5 inline h-3 w-3 align-text-bottom" />
                )}
              </span>
              <span className="text-[#e2e8f0]" aria-hidden>·</span>
              <time dateTime={question.created_at}>{formatCommunityTime(question.created_at)}</time>
              <span className="text-[#e2e8f0]" aria-hidden>·</span>
              <span>{question.answer_count} {question.answer_count === 1 ? 'answer' : 'answers'}</span>
            </div>

            {/* Post actions */}
            <div className="mt-2 flex items-center gap-1">
              {['Share', 'Save'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium text-[#94a3b8] transition-colors hover:bg-[#f0f4f8] hover:text-[#64748b]"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </article>

        {/* Answer composer */}
        <AnswerPillComposer
          id="thread-answer"
          value={answerText}
          onChange={setAnswerText}
          onSubmit={postTopLevelAnswer}
          submitting={submitting}
          disabled={!isAuthenticated}
          placeholder={isAuthenticated ? 'Share what you know…' : 'Sign in to answer'}
          error={error}
        />

        {/* Comment tree */}
        <CommentTree
          questionId={questionId}
          answerCount={question.answer_count}
          questionAuthorId={question.user_id}
          currentUser={currentUser}
          onRequireAuth={requireAuth}
          onError={setError}
          refreshKey={treeRefresh}
        />
      </div>
    </div>
  )
}
