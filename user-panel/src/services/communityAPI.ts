import { getApiBaseUrl } from '../utils/apiBase'
import type { AnswerSort, Comment, CommunityQuestion } from '../types/community'
import { normalizeComment } from '../types/community'

/** Mounted on blog router so it works wherever /api/blog is deployed */
const COMMUNITY_PREFIX = '/api/blog/community'

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export type CommunityTopicType = 'product' | 'brand'

export type { Comment, CommunityQuestion, AnswerSort }

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  if (
    text.trimStart().startsWith('<') ||
    (!contentType.includes('json') && text.trimStart().startsWith('<!'))
  ) {
    throw new Error(
      response.status === 404
        ? 'Ask Community API is not available yet. Redeploy the backend (npm run build, then restart the server) and try again.'
        : 'Server returned an unexpected page instead of JSON. Redeploy the backend if this continues.'
    )
  }
  let data: unknown = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error('Invalid response from server. Redeploy the backend if this continues.')
  }
  const obj = data as Record<string, unknown>
  if (!response.ok) {
    const msg =
      (typeof obj.error === 'string' && obj.error) ||
      (typeof obj.message === 'string' && obj.message) ||
      `Request failed (${response.status})`
    throw new Error(msg)
  }
  return (obj.data ?? data) as T
}

export const communityAPI = {
  async listQuestions(params?: {
    topic_type?: CommunityTopicType
    product_id?: number
    sort?: 'active' | 'new'
    q?: string
    limit?: number
    offset?: number
  }): Promise<CommunityQuestion[]> {
    const qs = new URLSearchParams()
    if (params?.topic_type) qs.set('topic_type', params.topic_type)
    if (params?.product_id != null) qs.set('product_id', String(params.product_id))
    if (params?.sort) qs.set('sort', params.sort)
    if (params?.q) qs.set('q', params.q)
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.offset != null) qs.set('offset', String(params.offset))
    const url = `${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions${qs.toString() ? `?${qs}` : ''}`
    const response = await fetch(url, { headers: getAuthHeaders() })
    return parseJson(response)
  },

  async getQuestion(id: number): Promise<{ question: CommunityQuestion; answers: Comment[] }> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions/${id}`, {
      headers: getAuthHeaders(),
    })
    const data = await parseJson<{ question: CommunityQuestion; answers: Record<string, unknown>[] }>(response)
    return {
      question: data.question,
      answers: (data.answers || []).map((a) => normalizeComment(a)),
    }
  },

  async getAnswers(
    questionId: number,
    sort: AnswerSort = 'top',
    limit = 50,
    offset = 0
  ): Promise<{ answers: Comment[]; total_top_level: number; has_more: boolean }> {
    const qs = new URLSearchParams({
      sort,
      limit: String(limit),
      offset: String(offset),
    })
    const response = await fetch(
      `${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions/${questionId}/answers?${qs}`,
      { headers: getAuthHeaders() }
    )
    const data = await parseJson<{
      answers: Record<string, unknown>[]
      total_top_level: number
      has_more: boolean
    }>(response)
    return {
      answers: (data.answers || []).map((a) => normalizeComment(a)),
      total_top_level: data.total_top_level ?? data.answers?.length ?? 0,
      has_more: Boolean(data.has_more),
    }
  },

  async createQuestion(payload: {
    topic_type: CommunityTopicType
    product_id?: number
    title: string
    body: string
  }): Promise<CommunityQuestion> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return parseJson(response)
  },

  async createAnswer(payload: {
    question_id: number
    content: string
    parent_id?: number | null
  }): Promise<Comment> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/answers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    const raw = await parseJson<Record<string, unknown>>(response)
    return normalizeComment(raw)
  },

  async deleteAnswer(answerId: number): Promise<Comment> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/answers/${answerId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    const raw = await parseJson<Record<string, unknown>>(response)
    return normalizeComment(raw)
  },

  async toggleLike(answerId: number): Promise<{ likes_count: number; is_liked_by_me: boolean }> {
    const result = await this.voteAnswer(answerId, 'up')
    return { likes_count: result.likes_count, is_liked_by_me: result.my_vote === 1 }
  },

  async voteAnswer(
    answerId: number,
    direction: 'up' | 'down'
  ): Promise<{ score: number; likes_count: number; my_vote: 1 | -1 | 0 }> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/answers/${answerId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ direction }),
    })
    return parseJson(response)
  },
}
