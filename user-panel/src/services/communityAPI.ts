import { getApiBaseUrl } from '../utils/apiBase'

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

export interface CommunityQuestion {
  id: number
  user_id: number
  topic_type: CommunityTopicType
  product_id: number | null
  title: string
  body: string
  answer_count: number
  created_at: string
  updated_at: string
  last_activity_at: string
  author_name: string
  author_avatar?: string | null
  author_is_verified?: boolean
  product_title?: string | null
  product_slug?: string | null
  product_list_image?: string | null
}

export interface CommunityAnswer {
  id: number
  question_id: number
  user_id: number
  parent_answer_id: number | null
  body: string
  is_verified: boolean
  verified_at?: string | null
  created_at: string
  updated_at: string
  author_name: string
  author_avatar?: string | null
  author_is_verified?: boolean
  replies?: CommunityAnswer[]
}

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
    const response = await fetch(url)
    return parseJson(response)
  },

  async getQuestion(id: number): Promise<{ question: CommunityQuestion; answers: CommunityAnswer[] }> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions/${id}`)
    return parseJson(response)
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

  async createAnswer(
    questionId: number,
    body: string,
    parentAnswerId?: number
  ): Promise<CommunityAnswer> {
    const response = await fetch(`${getApiBaseUrl()}${COMMUNITY_PREFIX}/questions/${questionId}/answers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        body,
        ...(parentAnswerId != null ? { parent_answer_id: parentAnswerId } : {}),
      }),
    })
    return parseJson(response)
  },
}
