import { getApiBaseUrl } from '../utils/apiBase'

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
  const data = await response.json()
  if (!response.ok) {
    const msg = data?.error || data?.message || `Request failed (${response.status})`
    throw new Error(msg)
  }
  return (data?.data ?? data) as T
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
    const url = `${getApiBaseUrl()}/api/community/questions${qs.toString() ? `?${qs}` : ''}`
    const response = await fetch(url)
    return parseJson(response)
  },

  async getQuestion(id: number): Promise<{ question: CommunityQuestion; answers: CommunityAnswer[] }> {
    const response = await fetch(`${getApiBaseUrl()}/api/community/questions/${id}`)
    return parseJson(response)
  },

  async createQuestion(payload: {
    topic_type: CommunityTopicType
    product_id?: number
    title: string
    body: string
  }): Promise<CommunityQuestion> {
    const response = await fetch(`${getApiBaseUrl()}/api/community/questions`, {
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
    const response = await fetch(`${getApiBaseUrl()}/api/community/questions/${questionId}/answers`, {
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
