import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { authenticateToken, sendError, sendSuccess } from '../utils/apiHelpers'

const router = Router()
let pool: Pool

export function initCommunityQuestionsRouter(databasePool: Pool) {
  pool = databasePool
}

function parseUserId(req: Request): number | null {
  const raw = req.userId
  if (raw == null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function parseOptionalUserId(req: Request): number | null {
  const rawAuth = req.headers.authorization
  const token = rawAuth?.startsWith('Bearer ') ? rawAuth.slice(7).trim() : rawAuth?.trim()
  if (!token) return null
  const parts = token.split('_')
  if (parts.length < 3 || parts[0] !== 'user' || parts[1] !== 'token') return null
  const n = Number(parts[2])
  return Number.isFinite(n) ? n : null
}

function isStaffOrAdmin(req: Request): boolean {
  const role = String(req.headers['x-user-role'] || '').trim().toLowerCase()
  if (role === 'admin' || role === 'staff' || role === 'super_admin') return true
  const perms = String(req.headers['x-user-permissions'] || '')
  return perms.length > 0 && (role === 'admin' || role === 'staff')
}

const USER_JOIN = `
  LEFT JOIN users u ON u.id = cq.user_id
  LEFT JOIN author_profiles ap ON ap.user_id = cq.user_id AND ap.status != 'deleted'
`

const ANSWER_USER_JOIN = `
  LEFT JOIN users u ON u.id = ca.user_id
  LEFT JOIN author_profiles ap ON ap.user_id = ca.user_id AND ap.status != 'deleted'
`

export interface CommentRow {
  id: number
  question_id: number
  parent_id: number | null
  root_answer_id: number | null
  user_id: number
  author_name: string
  author_avatar: string | null
  author_verified: boolean
  content: string
  is_deleted: boolean
  is_verified: boolean
  depth: number
  path: string | null
  likes_count: number
  is_liked_by_me: boolean
  created_at: string
  updated_at: string
}

export interface CommentNode extends CommentRow {
  children: CommentNode[]
}

function mapQuestionRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    topic_type: row.topic_type,
    product_id: row.product_id,
    title: row.title,
    body: row.body,
    answer_count: row.answer_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_activity_at: row.last_activity_at,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    author_is_verified: Boolean(row.author_is_verified),
    product_title: row.product_title,
    product_name: row.product_title,
    product_slug: row.product_slug,
    product_list_image: row.product_list_image,
  }
}

function mapAnswerToComment(row: Record<string, unknown>): CommentRow {
  const isDeleted = Boolean(row.is_deleted)
  return {
    id: Number(row.id),
    question_id: Number(row.question_id),
    parent_id: row.parent_id != null ? Number(row.parent_id) : null,
    root_answer_id: row.root_answer_id != null ? Number(row.root_answer_id) : null,
    user_id: Number(row.user_id),
    author_name: String(row.author_name || 'Member'),
    author_avatar: (row.author_avatar as string | null) ?? null,
    author_verified: Boolean(row.author_is_verified),
    content: isDeleted ? '[deleted]' : String(row.body || ''),
    is_deleted: isDeleted,
    is_verified: Boolean(row.is_verified),
    depth: Number(row.depth) || 0,
    path: row.path != null ? String(row.path) : null,
    likes_count: Number(row.likes_count) || 0,
    is_liked_by_me: Boolean(row.is_liked_by_me),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

function sortRootComments(roots: CommentNode[], sort: string): CommentNode[] {
  const copy = [...roots]
  if (sort === 'new') {
    copy.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } else if (sort === 'old') {
    copy.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  } else {
    copy.sort((a, b) => {
      if (b.likes_count !== a.likes_count) return b.likes_count - a.likes_count
      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }
  return copy
}

function buildCommentTree(rows: CommentRow[], sort: string): CommentNode[] {
  const map = new Map<number, CommentNode>()
  for (const row of rows) {
    map.set(row.id, { ...row, children: [] })
  }
  const roots: CommentNode[] = []
  for (const row of rows) {
    const node = map.get(row.id)!
    if (row.parent_id == null) {
      roots.push(node)
    } else {
      const parent = map.get(row.parent_id)
      if (parent) parent.children.push(node)
      else roots.push(node)
    }
  }
  const sortChildren = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    for (const n of nodes) sortChildren(n.children)
  }
  for (const r of roots) sortChildren(r.children)
  return sortRootComments(roots, sort)
}

async function fetchAnswerRows(questionId: number, viewerUserId: number | null): Promise<CommentRow[]> {
  const { rows } = await pool.query(
    `
    SELECT
      ca.*,
      COALESCE(ap.display_name, u.name, 'Member') AS author_name,
      COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
      COALESCE(ap.is_verified, false) AS author_is_verified,
      CASE WHEN $2::integer IS NOT NULL AND cal.user_id IS NOT NULL THEN true ELSE false END AS is_liked_by_me
    FROM community_answers ca
    ${ANSWER_USER_JOIN}
    LEFT JOIN community_answer_likes cal
      ON cal.answer_id = ca.id AND cal.user_id = $2::integer
    WHERE ca.question_id = $1
    ORDER BY ca.path NULLS LAST, ca.created_at ASC
    `,
    [questionId, viewerUserId]
  )
  return rows.map((r) => mapAnswerToComment(r as Record<string, unknown>))
}

async function enrichComment(answerId: number, viewerUserId: number | null): Promise<CommentRow> {
  const { rows } = await pool.query(
    `
    SELECT
      ca.*,
      COALESCE(ap.display_name, u.name, 'Member') AS author_name,
      COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
      COALESCE(ap.is_verified, false) AS author_is_verified,
      CASE WHEN $2::integer IS NOT NULL AND cal.user_id IS NOT NULL THEN true ELSE false END AS is_liked_by_me
    FROM community_answers ca
    ${ANSWER_USER_JOIN}
    LEFT JOIN community_answer_likes cal
      ON cal.answer_id = ca.id AND cal.user_id = $2::integer
    WHERE ca.id = $1
    `,
    [answerId, viewerUserId]
  )
  return mapAnswerToComment(rows[0] as Record<string, unknown>)
}

async function createAnswerRecord(
  questionId: number,
  userId: number,
  content: string,
  parentId: number | null
): Promise<CommentRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    let depth = 0
    let rootAnswerId: number | null = null
    let parentPath: string | null = null

    if (parentId != null) {
      const { rows: pRows } = await client.query(
        `SELECT id, question_id, depth, path, root_answer_id FROM community_answers WHERE id = $1`,
        [parentId]
      )
      if (!pRows.length || Number(pRows[0].question_id) !== questionId) {
        throw Object.assign(new Error('Invalid parent_id'), { status: 400 })
      }
      depth = Number(pRows[0].depth) + 1
      rootAnswerId = Number(pRows[0].root_answer_id || pRows[0].id)
      parentPath = String(pRows[0].path || pRows[0].id)
    }

    const { rows: inserted } = await client.query(
      `
      INSERT INTO community_answers (
        question_id, user_id, parent_id, parent_answer_id, body, depth, likes_count, is_deleted
      ) VALUES ($1, $2, $3, $3, $4, $5, 0, false)
      RETURNING id
      `,
      [questionId, userId, parentId, content, depth]
    )
    const newId = Number(inserted[0].id)
    const path = parentPath ? `${parentPath}.${newId}` : String(newId)
    const rootId = rootAnswerId ?? newId

    await client.query(
      `
      UPDATE community_answers
      SET path = $2, root_answer_id = $3, updated_at = now()
      WHERE id = $1
      `,
      [newId, path, rootId]
    )

    await client.query(
      `
      UPDATE community_questions
      SET answer_count = answer_count + 1,
          last_activity_at = now(),
          updated_at = now()
      WHERE id = $1
      `,
      [questionId]
    )

    await client.query('COMMIT')
    return enrichComment(newId, userId)
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// List threads (public)
router.get('/questions', async (req: Request, res: Response) => {
  try {
    const topicType = String(req.query.topic_type || '').trim()
    const productId = req.query.product_id ? Number(req.query.product_id) : null
    const sort = String(req.query.sort || 'active')
    const q = String(req.query.q || '').trim()
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100)
    const offset = Math.max(Number(req.query.offset) || 0, 0)

    const conditions: string[] = ['1=1']
    const params: unknown[] = []
    let idx = 1

    if (topicType === 'product' || topicType === 'brand') {
      conditions.push(`cq.topic_type = $${idx++}`)
      params.push(topicType)
    }
    if (productId != null && Number.isFinite(productId)) {
      conditions.push(`cq.product_id = $${idx++}`)
      params.push(productId)
    }
    if (q) {
      conditions.push(`(cq.title ILIKE $${idx} OR cq.body ILIKE $${idx})`)
      params.push(`%${q}%`)
      idx++
    }

    const orderBy =
      sort === 'new'
        ? 'cq.created_at DESC'
        : 'cq.last_activity_at DESC NULLS LAST, cq.created_at DESC'

    params.push(limit, offset)

    const { rows } = await pool.query(
      `
      SELECT
        cq.*,
        COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified,
        p.title AS product_title,
        p.slug AS product_slug,
        p.list_image AS product_list_image
      FROM community_questions cq
      ${USER_JOIN}
      LEFT JOIN products p ON p.id = cq.product_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx}
    `,
      params
    )

    sendSuccess(res, rows.map((r) => mapQuestionRow(r as Record<string, unknown>)))
  } catch (err) {
    sendError(res, 500, 'Failed to list community questions', err)
  }
})

// Nested answer tree
router.get('/questions/:id/answers', async (req: Request, res: Response) => {
  try {
    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const sort = String(req.query.sort || 'top')
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
    const offset = Math.max(Number(req.query.offset) || 0, 0)
    const viewerUserId = parseOptionalUserId(req)

    const { rows: qRows } = await pool.query(`SELECT id FROM community_questions WHERE id = $1`, [questionId])
    if (!qRows.length) return sendError(res, 404, 'Question not found')

    const allRows = await fetchAnswerRows(questionId, viewerUserId)
    const tree = buildCommentTree(allRows, sort)
    const paginated = tree.slice(offset, offset + limit)

    sendSuccess(res, {
      answers: paginated,
      total_top_level: tree.length,
      has_more: offset + limit < tree.length,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch answers', err)
  }
})

// Single thread (question + full tree — legacy/admin)
router.get('/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const sort = String(req.query.sort || 'top')
    const viewerUserId = parseOptionalUserId(req)

    const { rows: qRows } = await pool.query(
      `
      SELECT
        cq.*,
        COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified,
        p.title AS product_title,
        p.slug AS product_slug,
        p.list_image AS product_list_image
      FROM community_questions cq
      ${USER_JOIN}
      LEFT JOIN products p ON p.id = cq.product_id
      WHERE cq.id = $1
    `,
      [questionId]
    )

    if (!qRows.length) return sendError(res, 404, 'Question not found')

    const allRows = await fetchAnswerRows(questionId, viewerUserId)
    const answers = buildCommentTree(allRows, sort)

    sendSuccess(res, {
      question: mapQuestionRow(qRows[0] as Record<string, unknown>),
      answers,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch question', err)
  }
})

router.post('/questions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const { topic_type, product_id, title, body } = req.body || {}
    const topicType = String(topic_type || '').trim()
    if (topicType !== 'product' && topicType !== 'brand') {
      return sendError(res, 400, 'topic_type must be product or brand')
    }
    const titleStr = String(title || '').trim()
    const bodyStr = String(body || '').trim()
    if (titleStr.length < 3) return sendError(res, 400, 'title must be at least 3 characters')
    if (bodyStr.length < 5) return sendError(res, 400, 'body must be at least 5 characters')

    let productId: number | null = null
    if (topicType === 'product') {
      productId = Number(product_id)
      if (!Number.isFinite(productId)) {
        return sendError(res, 400, 'product_id is required for product questions')
      }
      const { rows: pRows } = await pool.query(`SELECT id FROM products WHERE id = $1`, [productId])
      if (!pRows.length) return sendError(res, 400, 'Invalid product_id')
    }

    const { rows } = await pool.query(
      `
      INSERT INTO community_questions (
        user_id, topic_type, product_id, title, body, answer_count, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, 0, now())
      RETURNING *
    `,
      [userId, topicType, productId, titleStr, bodyStr]
    )

    sendSuccess(res, mapQuestionRow(rows[0] as Record<string, unknown>), 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create question', err)
  }
})

// New canonical POST endpoint
router.post('/answers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const questionId = Number(req.body?.question_id)
    const content = String(req.body?.content || req.body?.body || '').trim()
    const parentId = req.body?.parent_id != null ? Number(req.body.parent_id) : null

    if (!Number.isFinite(questionId)) return sendError(res, 400, 'question_id is required')
    if (content.length < 2) return sendError(res, 400, 'content is required')
    if (content.length > 2000) return sendError(res, 400, 'content must be at most 2000 characters')

    const { rows: qRows } = await pool.query(`SELECT id FROM community_questions WHERE id = $1`, [questionId])
    if (!qRows.length) return sendError(res, 404, 'Question not found')

    const comment = await createAnswerRecord(questionId, userId, content, parentId)
    sendSuccess(res, comment, 201)
  } catch (err: any) {
    if (err?.status === 400) return sendError(res, 400, err.message)
    sendError(res, 500, 'Failed to create answer', err)
  }
})

// Legacy POST (kept for compatibility)
router.post('/questions/:id/answers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const questionId = Number(req.params.id)
    const content = String(req.body?.body || req.body?.content || '').trim()
    const parentId =
      req.body?.parent_id != null
        ? Number(req.body.parent_id)
        : req.body?.parent_answer_id != null
          ? Number(req.body.parent_answer_id)
          : null

    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')
    if (content.length < 2) return sendError(res, 400, 'body is required')

    const comment = await createAnswerRecord(questionId, userId, content, parentId)
    sendSuccess(res, comment, 201)
  } catch (err: any) {
    if (err?.status === 400) return sendError(res, 400, err.message)
    sendError(res, 500, 'Failed to create answer', err)
  }
})

router.delete('/answers/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const { rows } = await pool.query(
      `
      UPDATE community_answers
      SET is_deleted = true, body = '[deleted]', updated_at = now()
      WHERE id = $1 AND user_id = $2 AND is_deleted = false
      RETURNING id
      `,
      [answerId, userId]
    )

    if (!rows.length) return sendError(res, 404, 'Answer not found or not yours')

    const comment = await enrichComment(answerId, userId)
    sendSuccess(res, comment)
  } catch (err) {
    sendError(res, 500, 'Failed to delete answer', err)
  }
})

router.post('/answers/:id/like', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const { rows: aRows } = await pool.query(`SELECT id FROM community_answers WHERE id = $1`, [answerId])
    if (!aRows.length) return sendError(res, 404, 'Answer not found')

    const { rows: existing } = await pool.query(
      `SELECT id FROM community_answer_likes WHERE answer_id = $1 AND user_id = $2`,
      [answerId, userId]
    )

    let isLiked: boolean
    if (existing.length) {
      await pool.query(`DELETE FROM community_answer_likes WHERE answer_id = $1 AND user_id = $2`, [
        answerId,
        userId,
      ])
      await pool.query(
        `UPDATE community_answers SET likes_count = GREATEST(likes_count - 1, 0), updated_at = now() WHERE id = $1`,
        [answerId]
      )
      isLiked = false
    } else {
      await pool.query(
        `INSERT INTO community_answer_likes (answer_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [answerId, userId]
      )
      await pool.query(
        `UPDATE community_answers SET likes_count = likes_count + 1, updated_at = now() WHERE id = $1`,
        [answerId]
      )
      isLiked = true
    }

    const { rows: countRows } = await pool.query(
      `SELECT likes_count FROM community_answers WHERE id = $1`,
      [answerId]
    )

    sendSuccess(res, {
      likes_count: Number(countRows[0]?.likes_count) || 0,
      is_liked_by_me: isLiked,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to toggle like', err)
  }
})

router.patch('/answers/:id/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')

    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const verified = req.body?.verified !== false
    const staffUserId = parseUserId(req)

    const { rows } = await pool.query(
      `
      UPDATE community_answers
      SET is_verified = $2,
          verified_by = CASE WHEN $2 THEN $3::integer ELSE NULL END,
          verified_at = CASE WHEN $2 THEN now() ELSE NULL END,
          updated_at = now()
      WHERE id = $1
      RETURNING id
      `,
      [answerId, verified, staffUserId]
    )

    if (!rows.length) return sendError(res, 404, 'Answer not found')

    const comment = await enrichComment(answerId, parseOptionalUserId(req))
    sendSuccess(res, comment)
  } catch (err) {
    sendError(res, 500, 'Failed to update verification', err)
  }
})

export default router
