import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  MessageCircle,
  Package,
  Reply,
  Sparkles,
} from 'lucide-react'
import {
  communityAPI,
  type CommunityAnswer,
  type CommunityQuestion,
} from '../services/communityAPI'
import { encodeMediaUrl, getApiBase } from '../utils/apiBase'
import { useAuth } from '../contexts/AuthContext'
import { AuthorVerifiedBadge } from '../components/AuthorVerifiedBadge'

function productThumb(url?: string | null): string {
  if (!url) return ''
  return encodeMediaUrl(url.startsWith('http') ? url : `${getApiBase()}${url.startsWith('/') ? '' : '/'}${url}`)
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AnswerBlock({
  answer,
  depth,
  onReply,
  replyToId,
  setReplyToId,
  replyText,
  setReplyText,
  onSubmitReply,
  submitting,
  isAuthenticated,
}: {
  answer: CommunityAnswer
  depth: number
  onReply: (id: number) => void
  replyToId: number | null
  setReplyToId: (id: number | null) => void
  replyText: string
  setReplyText: (v: string) => void
  onSubmitReply: (parentId: number) => void
  submitting: boolean
  isAuthenticated: boolean
}) {
  const padding = depth > 0 ? 'ml-4 sm:ml-8 border-l-2 border-gray-100 pl-4' : ''

  return (
    <div className={padding}>
      <article className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {answer.author_name}
            {answer.author_is_verified && <AuthorVerifiedBadge className="ml-1 inline h-3.5 w-3.5" />}
          </span>
          {answer.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <BadgeCheck className="h-3 w-3" />
              Verified by NEFOL
            </span>
          )}
          <span className="text-xs text-gray-400">{formatWhen(answer.created_at)}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-gray-800">{answer.body}</p>
        {depth === 0 && isAuthenticated && (
          <button
            type="button"
            onClick={() => onReply(answer.id)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#4B97C9] hover:underline"
          >
            <Reply className="h-3.5 w-3.5" />
            Reply
          </button>
        )}
        {replyToId === answer.id && (
          <div className="mt-3 space-y-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={3}
              placeholder="Write a reply…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#4B97C9]"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={submitting || !replyText.trim()}
                onClick={() => onSubmitReply(answer.id)}
                className="rounded-full bg-[#1B4965] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {submitting ? 'Posting…' : 'Post reply'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReplyToId(null)
                  setReplyText('')
                }}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </article>
      {(answer.replies || []).map((r) => (
        <div key={r.id} className="mt-3">
          <AnswerBlock
            answer={r}
            depth={depth + 1}
            onReply={onReply}
            replyToId={replyToId}
            setReplyToId={setReplyToId}
            replyText={replyText}
            setReplyText={setReplyText}
            onSubmitReply={onSubmitReply}
            submitting={submitting}
            isAuthenticated={isAuthenticated}
          />
        </div>
      ))}
    </div>
  )
}

export default function AskCommunityThreadPage({ questionId }: { questionId: number }) {
  const { isAuthenticated } = useAuth()
  const [question, setQuestion] = useState<CommunityQuestion | null>(null)
  const [answers, setAnswers] = useState<CommunityAnswer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyToId, setReplyToId] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await communityAPI.getQuestion(questionId)
      setQuestion(data.question)
      setAnswers(data.answers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [questionId])

  useEffect(() => {
    load()
  }, [load])

  const requireAuth = (): boolean => {
    if (isAuthenticated) return true
    sessionStorage.setItem('post_login_redirect', window.location.hash)
    window.location.hash = '#/user/login'
    return false
  }

  const postAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!requireAuth()) return
    const text = answerText.trim()
    if (text.length < 2) return
    setSubmitting(true)
    try {
      await communityAPI.createAnswer(questionId, text)
      setAnswerText('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post answer')
    } finally {
      setSubmitting(false)
    }
  }

  const postReply = async (parentId: number) => {
    if (!requireAuth()) return
    const text = replyText.trim()
    if (text.length < 2) return
    setSubmitting(true)
    try {
      await communityAPI.createAnswer(questionId, text, parentId)
      setReplyText('')
      setReplyToId(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply')
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
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
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

      <article className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
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
              {question.product_title}
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
        <h1 className="text-xl font-bold text-gray-900">{question.title}</h1>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{question.body}</p>
        <p className="mt-3 text-xs text-gray-500">
          Asked by {question.author_name}
          {question.author_is_verified && <AuthorVerifiedBadge className="ml-1 inline h-3.5 w-3.5" />}
          {' · '}
          {formatWhen(question.created_at)}
        </p>
      </article>

      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500">
        <MessageCircle className="h-4 w-4" />
        {question.answer_count} {question.answer_count === 1 ? 'Answer' : 'Answers'}
      </h2>

      <div className="mb-8 space-y-4">
        {answers.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-500">
            No answers yet. Be the first to help.
          </p>
        )}
        {answers.map((a) => (
          <AnswerBlock
            key={a.id}
            answer={a}
            depth={0}
            onReply={(id) => {
              if (!requireAuth()) return
              setReplyToId(id)
            }}
            replyToId={replyToId}
            setReplyToId={setReplyToId}
            replyText={replyText}
            setReplyText={setReplyText}
            onSubmitReply={postReply}
            submitting={submitting}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      <form onSubmit={postAnswer} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
        <label htmlFor="thread-answer" className="mb-2 block text-sm font-semibold text-gray-800">
          Your answer
        </label>
        <textarea
          id="thread-answer"
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          rows={4}
          placeholder={isAuthenticated ? 'Share what you know…' : 'Sign in to answer'}
          disabled={!isAuthenticated}
          className="mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#4B97C9] disabled:bg-gray-100"
        />
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !isAuthenticated}
          className="rounded-full bg-[#1B4965] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? 'Posting…' : 'Post answer'}
        </button>
      </form>
    </div>
  )
}
