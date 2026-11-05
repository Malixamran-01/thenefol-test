import { Router, Request, Response } from 'express'
import { Pool } from 'pg'
import { authenticateToken, getStaffContext, sendError, sendSuccess } from '../utils/apiHelpers'
import { getUserIdFromRequest } from '../utils/authTokens'
import { syncQuestionSlug, resolveQuestionRef, questionUrlSegment } from '../utils/blogSlug'

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
  const raw = getUserIdFromRequest(req)
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

/** Staff session attached by the global admin guard (valid staff_… token). */
function isStaffOrAdmin(req: Request): boolean {
  return !!getStaffContext(req)
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
  score: number
  my_vote: number
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
    /** SEO URL slug from the title (`/questions/<slug>`) */
    slug: row.slug ?? null,
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
    score: Number(row.score ?? row.likes_count) || 0,
    my_vote: Number(row.my_vote) || 0,
    is_liked_by_me: Number(row.my_vote) === 1 || Boolean(row.is_liked_by_me),
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
      if (b.score !== a.score) return b.score - a.score
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
      COALESCE(cal.vote, 0)::integer AS my_vote,
      CASE WHEN cal.vote = 1 THEN true ELSE false END AS is_liked_by_me
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
      COALESCE(cal.vote, 0)::integer AS my_vote,
      CASE WHEN cal.vote = 1 THEN true ELSE false END AS is_liked_by_me
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

// Single thread (question + full tree — legacy/admin). Accepts the SEO slug, a retired slug, or the ID.
router.get('/questions/:id', async (req: Request, res: Response) => {
  try {
    const ref = await resolveQuestionRef(pool, req.params.id)
    if (!ref) return sendError(res, 404, 'Question not found')
    const questionId = ref.id

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

    try {
      rows[0].slug = await syncQuestionSlug(pool, Number(rows[0].id))
    } catch (err) {
      console.error('Failed to assign question slug:', err)
    }

    sendSuccess(res, mapQuestionRow(rows[0] as Record<string, unknown>), 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create question', err)
  }
})

router.patch('/questions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const titleStr = String(req.body?.title ?? '').trim()
    const bodyStr = String(req.body?.body ?? '').trim()
    if (titleStr.length < 3) return sendError(res, 400, 'title must be at least 3 characters')
    if (bodyStr.length < 5) return sendError(res, 400, 'body must be at least 5 characters')
    if (titleStr.length > 200) return sendError(res, 400, 'title must be at most 200 characters')
    if (bodyStr.length > 5000) return sendError(res, 400, 'body must be at most 5000 characters')

    const { rows } = await pool.query(
      `
      UPDATE community_questions
      SET title = $2, body = $3, updated_at = now()
      WHERE id = $1 AND user_id = $4
      RETURNING id
      `,
      [questionId, titleStr, bodyStr, userId]
    )

    if (!rows.length) return sendError(res, 404, 'Question not found or not yours')
    // Title may have changed — keep the slug in step (old slug keeps redirecting)
    await syncQuestionSlug(pool, questionId).catch((err) => console.error('Failed to sync question slug:', err))

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

    sendSuccess(res, mapQuestionRow(qRows[0] as Record<string, unknown>))
  } catch (err) {
    sendError(res, 500, 'Failed to update question', err)
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

router.patch('/answers/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const content = String(req.body?.content || req.body?.body || '').trim()
    if (content.length < 2) return sendError(res, 400, 'content is required')
    if (content.length > 2000) return sendError(res, 400, 'content must be at most 2000 characters')

    const { rows } = await pool.query(
      `
      UPDATE community_answers
      SET body = $2, updated_at = now()
      WHERE id = $1 AND user_id = $3 AND is_deleted = false
      RETURNING id
      `,
      [answerId, content, userId]
    )

    if (!rows.length) return sendError(res, 404, 'Answer not found or not yours')

    const comment = await enrichComment(answerId, userId)
    sendSuccess(res, comment)
  } catch (err) {
    sendError(res, 500, 'Failed to update answer', err)
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

async function voteHandler(req: Request, res: Response) {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const rawDir = String(req.body?.direction || 'up').toLowerCase()
    const voteDir = rawDir === 'down' ? -1 : 1

    const { rows: aRows } = await pool.query(`SELECT id FROM community_answers WHERE id = $1`, [answerId])
    if (!aRows.length) return sendError(res, 404, 'Answer not found')

    const { rows: existing } = await pool.query(
      `SELECT id, vote FROM community_answer_likes WHERE answer_id = $1 AND user_id = $2`,
      [answerId, userId]
    )

    let myVote = 0

    if (existing.length) {
      const prevVote = Number(existing[0].vote) || 1
      if (prevVote === voteDir) {
        await pool.query(`DELETE FROM community_answer_likes WHERE answer_id = $1 AND user_id = $2`, [
          answerId,
          userId,
        ])
        await pool.query(
          `UPDATE community_answers
           SET score = score - $2,
               likes_count = CASE WHEN $3 = 1 THEN GREATEST(likes_count - 1, 0) ELSE likes_count END,
               updated_at = now()
           WHERE id = $1`,
          [answerId, voteDir, voteDir]
        )
        myVote = 0
      } else {
        await pool.query(
          `UPDATE community_answer_likes SET vote = $3 WHERE answer_id = $1 AND user_id = $2`,
          [answerId, userId, voteDir]
        )
        await pool.query(
          `UPDATE community_answers
           SET score = score + $2,
               likes_count = CASE
                 WHEN $3 = 1 THEN likes_count + 1
                 WHEN $4 = 1 THEN GREATEST(likes_count - 1, 0)
                 ELSE likes_count
               END,
               updated_at = now()
           WHERE id = $1`,
          [answerId, voteDir * 2, voteDir, prevVote]
        )
        myVote = voteDir
      }
    } else {
      await pool.query(
        `INSERT INTO community_answer_likes (answer_id, user_id, vote) VALUES ($1, $2, $3)
         ON CONFLICT (answer_id, user_id) DO UPDATE SET vote = EXCLUDED.vote`,
        [answerId, userId, voteDir]
      )
      await pool.query(
        `UPDATE community_answers
         SET score = score + $2,
             likes_count = CASE WHEN $3 = 1 THEN likes_count + 1 ELSE likes_count END,
             updated_at = now()
         WHERE id = $1`,
        [answerId, voteDir, voteDir]
      )
      myVote = voteDir
    }

    const { rows: countRows } = await pool.query(
      `SELECT score, likes_count FROM community_answers WHERE id = $1`,
      [answerId]
    )

    sendSuccess(res, {
      score: Number(countRows[0]?.score) || 0,
      likes_count: Number(countRows[0]?.likes_count) || 0,
      my_vote: myVote,
      is_liked_by_me: myVote === 1,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to vote', err)
  }
}

router.post('/answers/:id/vote', authenticateToken, voteHandler)

router.post('/answers/:id/like', authenticateToken, async (req: Request, res: Response) => {
  req.body = { ...(req.body || {}), direction: 'up' }
  return voteHandler(req, res)
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

// Admin: stats summary
router.get('/admin/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM community_questions)::int AS total_questions,
        (SELECT COUNT(*) FROM community_answers WHERE is_deleted = false)::int AS total_answers,
        (SELECT COUNT(*) FROM community_answers WHERE is_verified = true AND is_deleted = false)::int AS verified_answers,
        (SELECT COUNT(*) FROM community_questions WHERE created_at > now() - interval '7 days')::int AS questions_this_week,
        (SELECT COUNT(*) FROM community_answers WHERE is_deleted = false AND created_at > now() - interval '7 days')::int AS answers_this_week
    `)
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to fetch stats', err)
  }
})

// Admin: edit any question
router.patch('/questions/:id/admin', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const titleStr = String(req.body?.title ?? '').trim()
    const bodyStr = String(req.body?.body ?? '').trim()
    if (titleStr.length < 3) return sendError(res, 400, 'title must be at least 3 characters')
    if (bodyStr.length < 5) return sendError(res, 400, 'body must be at least 5 characters')

    const { rows } = await pool.query(
      `UPDATE community_questions SET title = $2, body = $3, updated_at = now() WHERE id = $1 RETURNING id`,
      [questionId, titleStr, bodyStr]
    )
    if (!rows.length) return sendError(res, 404, 'Question not found')
    await syncQuestionSlug(pool, questionId).catch((err) => console.error('Failed to sync question slug:', err))

    const { rows: qRows } = await pool.query(
      `SELECT cq.*, COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified,
        p.title AS product_title, p.slug AS product_slug, p.list_image AS product_list_image
       FROM community_questions cq ${USER_JOIN}
       LEFT JOIN products p ON p.id = cq.product_id WHERE cq.id = $1`,
      [questionId]
    )
    sendSuccess(res, mapQuestionRow(qRows[0] as Record<string, unknown>))
  } catch (err) {
    sendError(res, 500, 'Failed to update question', err)
  }
})

// Admin: delete any question (and its answers)
router.delete('/questions/:id/admin', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE community_answers SET is_deleted = true, body = '[removed by admin]', updated_at = now() WHERE question_id = $1`,
        [questionId]
      )
      const { rows } = await client.query(`DELETE FROM community_questions WHERE id = $1 RETURNING id`, [questionId])
      if (!rows.length) { await client.query('ROLLBACK'); return sendError(res, 404, 'Question not found') }
      await client.query('COMMIT')
      sendSuccess(res, { deleted: true, id: questionId })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  } catch (err) {
    sendError(res, 500, 'Failed to delete question', err)
  }
})

// Admin: edit any answer
router.patch('/answers/:id/admin', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const content = String(req.body?.content || req.body?.body || '').trim()
    if (content.length < 2) return sendError(res, 400, 'content is required')

    const { rows } = await pool.query(
      `UPDATE community_answers SET body = $2, updated_at = now() WHERE id = $1 AND is_deleted = false RETURNING id`,
      [answerId, content]
    )
    if (!rows.length) return sendError(res, 404, 'Answer not found or already deleted')

    const comment = await enrichComment(answerId, null)
    sendSuccess(res, comment)
  } catch (err) {
    sendError(res, 500, 'Failed to edit answer', err)
  }
})

// Admin: delete any answer
router.delete('/answers/:id/admin', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const answerId = Number(req.params.id)
    if (!Number.isFinite(answerId)) return sendError(res, 400, 'Invalid answer id')

    const { rows } = await pool.query(
      `UPDATE community_answers SET is_deleted = true, body = '[removed by admin]', updated_at = now()
       WHERE id = $1 AND is_deleted = false RETURNING id, question_id`,
      [answerId]
    )
    if (!rows.length) return sendError(res, 404, 'Answer not found or already deleted')

    // Decrement answer_count on the question
    await pool.query(
      `UPDATE community_questions SET answer_count = GREATEST(answer_count - 1, 0), updated_at = now() WHERE id = $1`,
      [rows[0].question_id]
    )

    sendSuccess(res, { deleted: true, id: answerId })
  } catch (err) {
    sendError(res, 500, 'Failed to delete answer', err)
  }
})

// Admin: bulk delete questions
router.post('/questions/bulk-delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) return sendError(res, 403, 'Admin or staff access required')
    const ids = (req.body?.ids || []) as unknown[]
    const numIds = ids.map(Number).filter((n) => Number.isFinite(n))
    if (!numIds.length) return sendError(res, 400, 'ids array is required')

    const placeholders = numIds.map((_, i) => `$${i + 1}`).join(',')
    await pool.query(
      `UPDATE community_answers SET is_deleted = true, body = '[removed by admin]', updated_at = now() WHERE question_id IN (${placeholders})`,
      numIds
    )
    await pool.query(`DELETE FROM community_questions WHERE id IN (${placeholders})`, numIds)
    sendSuccess(res, { deleted: numIds.length, ids: numIds })
  } catch (err) {
    sendError(res, 500, 'Failed to bulk delete questions', err)
  }
})

// ─── Server-side meta page for community questions (for Google / search crawlers) ───

import { Request as ExpressRequest, Response as ExpressResponse } from 'express'
import { isSocialCrawler } from '../utils/socialCrawler'

function escapeHtmlQ(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Server-rendered Q&A thread for search engines, link-preview bots and AI agents — none of them run the
 * hash-routed SPA. Canonical URL is `/questions/<title-slug>`; legacy `/q/<id>` and retired slugs 301 to it.
 * Humans are redirected into the SPA thread page.
 */
export async function serveQuestionMetaPage(req: ExpressRequest, res: ExpressResponse) {
  try {
    const protocol = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http')
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'thenefol.com'
    const baseUrl = `${protocol}://${host}`.replace(/\/$/, '')
    const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || baseUrl
    const mediaBase = (process.env.PUBLIC_MEDIA_URL || '').replace(/\/$/, '') || frontendBase
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''

    const ref = await resolveQuestionRef(pool, req.params.id)
    const segment = ref ? questionUrlSegment(ref) : encodeURIComponent(String(req.params.id || ''))

    if (!isSocialCrawler(req.headers['user-agent'] as string | undefined)) {
      return res.redirect(302, `${frontendBase}/${qs}#/user/blog/ask-community/${segment}`)
    }

    if (!ref) {
      res.setHeader('X-Robots-Tag', 'noindex')
      return res.status(404).send('Question not found')
    }

    // Legacy /q/<id>, numeric or retired-slug URLs → permanent redirect to /questions/<slug>
    let requested = String(req.params.id || '').replace(/\/+$/, '')
    try {
      requested = decodeURIComponent(requested)
    } catch {
      /* keep raw */
    }
    const onCanonicalPath = req.path.startsWith('/questions/')
    if (!onCanonicalPath || (ref.slug && requested !== ref.slug)) {
      return res.redirect(301, `${frontendBase}/questions/${segment}${qs}`)
    }

    const { rows } = await pool.query(
      `SELECT cq.id, cq.slug, cq.title, cq.body, cq.topic_type, cq.answer_count, cq.created_at, cq.updated_at,
              COALESCE(ap.display_name, u.name, 'Member') AS author_name,
              p.title AS product_title, p.slug AS product_slug, p.list_image AS product_list_image
       FROM community_questions cq
       ${USER_JOIN}
       LEFT JOIN products p ON p.id = cq.product_id
       WHERE cq.id = $1`,
      [ref.id]
    )
    if (rows.length === 0) {
      res.setHeader('X-Robots-Tag', 'noindex')
      return res.status(404).send('Question not found')
    }
    const q = rows[0] as any

    // Visible answers, best first: verified, then most liked, then oldest
    const { rows: answers } = await pool.query(
      `SELECT ca.id, ca.body, ca.depth, ca.parent_id, ca.is_verified, ca.likes_count, ca.created_at,
              COALESCE(ap.display_name, u.name, 'Member') AS author_name
       FROM community_answers ca
       ${ANSWER_USER_JOIN}
       WHERE ca.question_id = $1 AND ca.is_deleted = false
       ORDER BY ca.is_verified DESC, ca.likes_count DESC, ca.created_at ASC
       LIMIT 50`,
      [ref.id]
    )
    const topLevel = answers.filter((a: any) => a.parent_id == null)
    const replyCount = answers.length - topLevel.length

    const plain = (s: unknown) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const iso = (v: unknown) => {
      if (!v) return undefined
      const d = v instanceof Date ? v : new Date(String(v))
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
    }
    const paragraphs = (s: unknown) =>
      String(s || '')
        .replace(/<[^>]*>/g, ' ')
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => `<p>${escapeHtmlQ(l)}</p>`)
        .join('\n')

    const questionText = plain(q.title)
    const bodyText = plain(q.body)
    const topAnswer = topLevel[0] ? plain(topLevel[0].body) : ''
    const description = (bodyText || topAnswer || `Community discussion on NEFOL: ${questionText}`).slice(0, 200)
    const title = `${questionText} | NEFOL Community`
    const pageUrl = `${frontendBase}/questions/${segment}`
    const spaUrl = `${frontendBase}/#/user/blog/ask-community/${segment}`
    const communityUrl = `${frontendBase}/user/blog/ask-community`
    const siteLogo = `${frontendBase}/IMAGES/NEFOL%20icon.png`
    const productUrl = q.product_slug ? `${frontendBase}/product/${encodeURIComponent(q.product_slug)}` : ''
    const productImage = q.product_list_image
      ? (String(q.product_list_image).startsWith('http') ? String(q.product_list_image) : `${mediaBase}${String(q.product_list_image).startsWith('/') ? '' : '/'}${q.product_list_image}`)
      : ''
    const ogImage = productImage || siteLogo
    const published = iso(q.created_at)
    const modified = iso(q.updated_at) || published

    const toAnswerLd = (a: any) => ({
      '@type': 'Answer',
      text: plain(a.body),
      dateCreated: iso(a.created_at),
      upvoteCount: Number(a.likes_count) || 0,
      url: `${pageUrl}#answer-${a.id}`,
      author: { '@type': 'Person', name: plain(a.author_name) || 'Member' },
    })
    const accepted = topLevel.find((a: any) => a.is_verified)
    const suggested = topLevel.filter((a: any) => a !== accepted).slice(0, 10)

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'QAPage',
        url: pageUrl,
        mainEntity: {
          '@type': 'Question',
          name: questionText,
          text: bodyText || questionText,
          answerCount: topLevel.length,
          dateCreated: published,
          author: { '@type': 'Person', name: plain(q.author_name) || 'Member' },
          ...(accepted ? { acceptedAnswer: toAnswerLd(accepted) } : {}),
          ...(suggested.length ? { suggestedAnswer: suggested.map(toAnswerLd) } : {}),
          ...(productUrl ? { about: { '@type': 'Product', name: plain(q.product_title), url: productUrl } } : {}),
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${frontendBase}/` },
          { '@type': 'ListItem', position: 2, name: 'Ask the Community', item: communityUrl },
          { '@type': 'ListItem', position: 3, name: questionText, item: pageUrl },
        ],
      },
    ]
    const jsonLdSafe = JSON.stringify(jsonLd).replace(/</g, '\\u003c')

    const answerHtml = answers
      .map((a: any) => {
        const indent = Math.min(Number(a.depth) || 0, 4)
        const when = iso(a.created_at)
        return `<article id="answer-${a.id}"${indent ? ` style="margin-left:${indent * 20}px"` : ''}>
        <p class="meta">${escapeHtmlQ(plain(a.author_name) || 'Member')}${a.is_verified ? ' · <strong>Verified answer</strong>' : ''}${when ? ` · <time datetime="${when}">${when.slice(0, 10)}</time>` : ''}${Number(a.likes_count) ? ` · ${Number(a.likes_count)} helpful` : ''}</p>
        ${paragraphs(a.body)}
      </article>`
      })
      .join('\n      ')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlQ(title)}</title>
  <meta name="description" content="${escapeHtmlQ(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="${escapeHtmlQ(pageUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtmlQ(title)}">
  <meta property="og:description" content="${escapeHtmlQ(description)}">
  <meta property="og:url" content="${escapeHtmlQ(pageUrl)}">
  <meta property="og:site_name" content="NEFOL">
  <meta property="og:image" content="${escapeHtmlQ(ogImage)}">
  ${published ? `<meta property="article:published_time" content="${published}">` : ''}
  ${modified ? `<meta property="article:modified_time" content="${modified}">` : ''}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtmlQ(title)}">
  <meta name="twitter:description" content="${escapeHtmlQ(description)}">
  <meta name="twitter:image" content="${escapeHtmlQ(ogImage)}">
  <script type="application/ld+json">${jsonLdSafe}</script>
  <style>
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.7;color:#1f2937;max-width:760px;margin:0 auto;padding:16px}
    .meta{color:#6b7280;font-size:.9rem;margin-bottom:.25rem}
    article{border-top:1px solid #e5e7eb;padding-top:.5rem}
  </style>
</head>
<body>
  <header>
    <nav aria-label="Breadcrumb"><a href="${escapeHtmlQ(frontendBase)}/">NEFOL</a> › <a href="${escapeHtmlQ(communityUrl)}">Ask the Community</a></nav>
  </header>
  <main>
    <h1>${escapeHtmlQ(questionText)}</h1>
    <p class="meta">Asked by ${escapeHtmlQ(plain(q.author_name) || 'Member')}${published ? ` · <time datetime="${published}">${published.slice(0, 10)}</time>` : ''}${productUrl ? ` · About <a href="${escapeHtmlQ(productUrl)}">${escapeHtmlQ(plain(q.product_title))}</a>` : ''}</p>
    ${paragraphs(q.body)}
    <section>
      <h2>${topLevel.length} ${topLevel.length === 1 ? 'answer' : 'answers'}${replyCount ? ` and ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : ''}</h2>
      ${answerHtml || '<p>No answers yet.</p>'}
    </section>
    <p><a href="${escapeHtmlQ(spaUrl)}">Answer this question on NEFOL</a></p>
  </main>
  <footer><p><a href="${escapeHtmlQ(communityUrl)}">More community questions</a> · <a href="${escapeHtmlQ(frontendBase)}/user/blog">NEFOL Blog</a> · <a href="${escapeHtmlQ(frontendBase)}/user/shop">Shop NEFOL</a></p></footer>
</body>
</html>`
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.setHeader('X-Robots-Tag', 'index, follow, max-image-preview:large')
    res.send(html)
  } catch (err) {
    console.error('Question meta page error:', err)
    res.status(500).send('Server error')
  }
}

export default router
