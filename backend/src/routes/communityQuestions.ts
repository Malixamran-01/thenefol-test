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
    product_slug: row.product_slug,
    product_list_image: row.product_list_image,
  }
}

function mapAnswerRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    question_id: row.question_id,
    user_id: row.user_id,
    parent_answer_id: row.parent_answer_id,
    body: row.body,
    is_verified: Boolean(row.is_verified),
    verified_at: row.verified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    author_name: row.author_name,
    author_avatar: row.author_avatar,
    author_is_verified: Boolean(row.author_is_verified),
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

    sendSuccess(
      res,
      rows.map((r) => mapQuestionRow(r as Record<string, unknown>))
    )
  } catch (err) {
    sendError(res, 500, 'Failed to list community questions', err)
  }
})

// Single thread + answers (public)
router.get('/questions/:id', async (req: Request, res: Response) => {
  try {
    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) {
      return sendError(res, 400, 'Invalid question id')
    }

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

    if (!qRows.length) {
      return sendError(res, 404, 'Question not found')
    }

    const { rows: aRows } = await pool.query(
      `
      SELECT
        ca.*,
        COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified
      FROM community_answers ca
      ${ANSWER_USER_JOIN}
      WHERE ca.question_id = $1
      ORDER BY ca.is_verified DESC, ca.created_at ASC
    `,
      [questionId]
    )

    const answers = aRows.map((r) => mapAnswerRow(r as Record<string, unknown>))
    const topLevel = answers.filter((a) => !a.parent_answer_id)
    const repliesByParent = new Map<number, typeof answers>()
    for (const a of answers) {
      const parentId = a.parent_answer_id != null ? Number(a.parent_answer_id) : null
      if (parentId != null && Number.isFinite(parentId)) {
        const list = repliesByParent.get(parentId) || []
        list.push(a)
        repliesByParent.set(parentId, list)
      }
    }
    const threaded = topLevel.map((a) => ({
      ...a,
      replies: repliesByParent.get(a.id as number) || [],
    }))

    sendSuccess(res, {
      question: mapQuestionRow(qRows[0] as Record<string, unknown>),
      answers: threaded,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch question', err)
  }
})

// Ask a question (auth, published immediately)
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

// Post an answer or reply (auth, published immediately)
router.post('/questions/:id/answers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = parseUserId(req)
    if (userId == null) return sendError(res, 401, 'Unauthorized')

    const questionId = Number(req.params.id)
    if (!Number.isFinite(questionId)) return sendError(res, 400, 'Invalid question id')

    const bodyStr = String(req.body?.body || '').trim()
    if (bodyStr.length < 2) return sendError(res, 400, 'body is required')

    const parentAnswerId = req.body?.parent_answer_id
      ? Number(req.body.parent_answer_id)
      : null

    const { rows: qRows } = await pool.query(
      `SELECT id FROM community_questions WHERE id = $1`,
      [questionId]
    )
    if (!qRows.length) return sendError(res, 404, 'Question not found')

    if (parentAnswerId != null && Number.isFinite(parentAnswerId)) {
      const { rows: pRows } = await pool.query(
        `SELECT id FROM community_answers WHERE id = $1 AND question_id = $2`,
        [parentAnswerId, questionId]
      )
      if (!pRows.length) return sendError(res, 400, 'Invalid parent_answer_id')
    }

    const { rows } = await pool.query(
      `
      INSERT INTO community_answers (question_id, user_id, parent_answer_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [questionId, userId, parentAnswerId, bodyStr]
    )

    await pool.query(
      `
      UPDATE community_questions
      SET answer_count = answer_count + 1,
          last_activity_at = now(),
          updated_at = now()
      WHERE id = $1
    `,
      [questionId]
    )

    const { rows: enriched } = await pool.query(
      `
      SELECT
        ca.*,
        COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified
      FROM community_answers ca
      ${ANSWER_USER_JOIN}
      WHERE ca.id = $1
    `,
      [rows[0].id]
    )

    sendSuccess(res, mapAnswerRow(enriched[0] as Record<string, unknown>), 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create answer', err)
  }
})

// Admin/staff: mark answer verified (or remove verification)
router.patch('/answers/:id/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return sendError(res, 403, 'Admin or staff access required')
    }

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
      RETURNING *
    `,
      [answerId, verified, staffUserId]
    )

    if (!rows.length) return sendError(res, 404, 'Answer not found')

    const { rows: enriched } = await pool.query(
      `
      SELECT
        ca.*,
        COALESCE(ap.display_name, u.name, 'Member') AS author_name,
        COALESCE(ap.profile_image, u.profile_photo) AS author_avatar,
        COALESCE(ap.is_verified, false) AS author_is_verified
      FROM community_answers ca
      ${ANSWER_USER_JOIN}
      WHERE ca.id = $1
    `,
      [answerId]
    )

    sendSuccess(res, mapAnswerRow(enriched[0] as Record<string, unknown>))
  } catch (err) {
    sendError(res, 500, 'Failed to update verification', err)
  }
})

export default router