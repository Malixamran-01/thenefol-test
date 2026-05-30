export interface Comment {
  id: number
  question_id: number
  parent_id: number | null
  root_answer_id: number | null
  user_id: number
  author_name: string
  author_avatar: string | null
  author_verified: boolean
  author_is_verified?: boolean
  content: string
  body?: string
  is_deleted: boolean
  is_verified?: boolean
  depth: number
  likes_count: number
  is_liked_by_me: boolean
  created_at: string
  children: Comment[]
}

export interface CommunityQuestion {
  id: number
  user_id: number
  topic_type: 'product' | 'brand'
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
  product_name?: string | null
  product_slug?: string | null
  product_list_image?: string | null
}

export type AnswerSort = 'top' | 'new' | 'old'

export function normalizeComment(raw: Record<string, unknown>): Comment {
  const childrenRaw = (raw.children ?? raw.replies ?? []) as Record<string, unknown>[]
  return {
    id: Number(raw.id),
    question_id: Number(raw.question_id),
    parent_id: raw.parent_id != null ? Number(raw.parent_id) : null,
    root_answer_id: raw.root_answer_id != null ? Number(raw.root_answer_id) : null,
    user_id: Number(raw.user_id),
    author_name: String(raw.author_name || 'Member'),
    author_avatar: (raw.author_avatar as string | null) ?? null,
    author_verified: Boolean(raw.author_verified ?? raw.author_is_verified),
    content: String(raw.content ?? raw.body ?? ''),
    is_deleted: Boolean(raw.is_deleted),
    is_verified: Boolean(raw.is_verified),
    depth: Number(raw.depth) || 0,
    likes_count: Number(raw.likes_count) || 0,
    is_liked_by_me: Boolean(raw.is_liked_by_me),
    created_at: String(raw.created_at),
    children: childrenRaw.map(normalizeComment),
  }
}
