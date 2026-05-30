import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, MessageCircle, Package, Sparkles } from 'lucide-react'
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

  const currentUser = user
    ? { id: user.id, name: user.name }
    : null

  const postTopLevelAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireAuth()) return
    const text = answerText.trim()
    if (text.length < 2 || text.length > 2000) return

    setSubmitting(true)

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

  if (loading) {
    return <p className="py-16 text-center text-sm text-gray-500">Loading thread…</p>
  }

  if (error && !question) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/user/blog/ask-community'
          }}
          className="mt-4 text-sm text-[#4B97C9] hover:underline"
        >
          Back to Ask Community
        </button>
      </div>
    )
  }

  if (!question) return null

  return (
    <div
      className="mx-auto max-w-2xl px-4 pb-16 pt-6"
      style={{ background: 'var(--color-screen-bg, #F4F9F9)', minHeight: '100%' }}
    >
      <button
        type="button"
        onClick={() => {
          window.location.hash = '#/user/blog/ask-community'
        }}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-[#4B97C9] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Ask Community
      </button>

      <article
        className="mb-6 rounded-2xl p-5 shadow-sm"
        style={{ background: '#fff', border: '1px solid #e8eef4' }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
              question.topic_type === 'product' ? 'bg-amber-50 text-amber-800' : 'bg-violet-50 text-violet-800'
            }`}
          >
            {question.topic_type === 'product' ? (
              <>
                <Package className="h-3 w-3" /> Product
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3" /> Brand
              </>
            )}
          </span>
          {question.product_slug && (
            <a
              href={`#/user/product/${question.product_slug}`}
              className="text-xs font-medium text-[#4B97C9] hover:underline"
            >
              {question.product_title || question.product_name}
            </a>
          )}
        </div>
        {question.product_list_image && (
          <img
            src={productThumb(question.product_list_image)}
            alt=""
            className="mb-3 h-20 w-20 rounded-lg object-cover"
          />
        )}
        <h1 className="text-xl font-bold" style={{ color: '#1a1a1a' }}>
          {question.title}
        </h1>
        <p className="mt-3 whitespace-pre-wrap text-sm" style={{ color: '#374151', lineHeight: 1.6 }}>
          {question.body}
        </p>
        <p className="mt-3 text-xs" style={{ color: '#94a3b8' }}>
          Asked by {question.author_name}
          {question.author_is_verified && <AuthorVerifiedBadge className="ml-1 inline h-3.5 w-3.5" />}
          {' · '}
          {formatCommunityTime(question.created_at)}
        </p>
      </article>

      <h2
        className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide"
        style={{ color: '#64748b' }}
      >
        <MessageCircle className="h-4 w-4" />
        {question.answer_count} {question.answer_count === 1 ? 'Answer' : 'Answers'}
      </h2>

      <div className="mb-8">
        <CommentTree
          questionId={questionId}
          currentUser={currentUser}
          onRequireAuth={requireAuth}
          onError={setError}
          refreshKey={treeRefresh}
        />
      </div>

      <form
        onSubmit={postTopLevelAnswer}
        className="rounded-2xl p-4"
        style={{ background: '#fff', border: '1px solid #e8eef4' }}
      >
        <label htmlFor="thread-answer" className="mb-2 block text-sm font-semibold" style={{ color: '#1B4965' }}>
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
          className="mb-3 w-full resize-none rounded-xl px-3 py-2.5 text-sm outline-none disabled:bg-gray-100"
          style={{ border: '1px solid #e8eef4' }}
        />
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !isAuthenticated}
          className="rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: '#1B4965' }}
        >
          {submitting ? 'Posting…' : 'Post answer'}
        </button>
      </form>
    </div>
  )
}
