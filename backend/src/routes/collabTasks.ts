/**
 * Creator collab: admin-assigned platform tasks (Reddit / Reel / X / …),
 * user submission, admin verification, and payout recording.
 */
import { randomUUID } from 'crypto'
import { Request, Response } from 'express'
import type { Pool } from 'pg'
import type { Server } from 'socket.io'
import { assertCollabNotBlockedByAppId, ensureCollabBlockSchema } from '../utils/collabBlocks'
import { ensureCollabSchema } from './collab'
import { createNotification } from './blogNotifications'

export const COLLAB_TASK_PLATFORMS = [
  'instagram_reel',
  'reddit',
  'x',
  'youtube',
  'tiktok',
  'facebook',
  'other',
] as const

export type CollabTaskPlatform = (typeof COLLAB_TASK_PLATFORMS)[number]

async function ensureCreatorProgramBadgeAckSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS creator_program_badge_ack (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      collab_approval_seen_at TIMESTAMPTZ,
      affiliate_approval_seen_at TIMESTAMPTZ
    )
  `)
}

/**
 * 1 if the latest collab application decision (approved or rejected) is newer than the last Collab-tab ack.
 * Does not count assigned brand tasks or pending review — only form outcomes.
 */
async function getCollabFormDecisionUnread(pool: Pool, userId: string): Promise<number> {
  const u = await pool.query(`SELECT id, email, unique_user_id FROM users WHERE id = $1`, [userId])
  if (!u.rows.length) return 0
  const uniqueUserId = u.rows[0].unique_user_id
    ? String(u.rows[0].unique_user_id).trim()
    : ''
  const email = u.rows[0].email ? String(u.rows[0].email).trim().toLowerCase() : ''
  if (!uniqueUserId && !email) return 0

  const { rows } = await pool.query(
    `SELECT (
        CASE
          WHEN status = 'approved' THEN COALESCE(approved_at, created_at)
          WHEN status = 'rejected' THEN COALESCE(rejected_at, created_at)
          ELSE NULL
        END
      ) AS decision_at
     FROM collab_applications
     WHERE status IN ('approved', 'rejected')
       AND (
         ($1::text <> '' AND TRIM(COALESCE(unique_user_id, '')) = $1)
         OR ($2::text <> '' AND LOWER(TRIM(email)) = $2)
       )
     ORDER BY decision_at DESC NULLS LAST
     LIMIT 1`,
    [uniqueUserId, email]
  )
  const decisionAt = rows[0]?.decision_at as Date | null | undefined
  if (!decisionAt) return 0

  const ack = await pool.query(
    `SELECT collab_approval_seen_at FROM creator_program_badge_ack WHERE user_id = $1`,
    [userId]
  )
  const seen = ack.rows[0]?.collab_approval_seen_at as Date | null | undefined
  if (!seen) return 1
  return new Date(decisionAt).getTime() > new Date(seen).getTime() ? 1 : 0
}

/**
 * 1 if the latest affiliate application decision (approved or rejected) is newer than the last Affiliate-tab ack.
 */
async function getAffiliateFormDecisionUnread(pool: Pool, userId: string, email: string): Promise<number> {
  if (!email) return 0
  const { rows } = await pool.query(
    `SELECT (
        CASE
          WHEN status = 'approved' THEN COALESCE(approved_at, application_date, created_at)
          WHEN status = 'rejected' THEN COALESCE(rejected_at, created_at)
          ELSE NULL
        END
      ) AS decision_at
     FROM affiliate_applications
     WHERE LOWER(TRIM(email)) = $1 AND status IN ('approved', 'rejected')
     ORDER BY decision_at DESC NULLS LAST
     LIMIT 1`,
    [email]
  )
  const decisionAt = rows[0]?.decision_at as Date | null | undefined
  if (!decisionAt) return 0

  const ack = await pool.query(
    `SELECT affiliate_approval_seen_at FROM creator_program_badge_ack WHERE user_id = $1`,
    [userId]
  )
  const seen = ack.rows[0]?.affiliate_approval_seen_at as Date | null | undefined
  if (!seen) return 1
  return new Date(decisionAt).getTime() > new Date(seen).getTime() ? 1 : 0
}

async function ensureCollabTaskSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collab_assigned_tasks (
      id SERIAL PRIMARY KEY,
      collab_application_id INTEGER NOT NULL REFERENCES collab_applications(id) ON DELETE CASCADE,
      assignee_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      instructions TEXT,
      platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
      task_template_key TEXT NOT NULL DEFAULT 'other',
      task_options JSONB NOT NULL DEFAULT '{}'::jsonb,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      product_snapshot JSONB,
      reimbursement_budget NUMERIC(14,2),
      creator_fee_amount NUMERIC(14,2),
      currency VARCHAR(8) NOT NULL DEFAULT 'INR',
      due_at TIMESTAMPTZ,
      status VARCHAR(32) NOT NULL DEFAULT 'assigned'
        CHECK (status IN (
          'assigned', 'in_progress', 'submitted', 'needs_revision',
          'verified_ready', 'paid', 'cancelled', 'rejected'
        )),
      assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      assigned_by_label TEXT,
      submitted_at TIMESTAMPTZ,
      completion_order_id TEXT,
      completion_post_url TEXT,
      completion_platform_handle TEXT,
      completion_notes TEXT,
      completion_extra JSONB NOT NULL DEFAULT '{}'::jsonb,
      admin_verified_order BOOLEAN,
      admin_verified_post BOOLEAN,
      admin_internal_notes TEXT,
      revision_requested_at TIMESTAMPTZ,
      revision_message TEXT,
      paid_at TIMESTAMPTZ,
      paid_amount NUMERIC(14,2),
      paid_currency VARCHAR(8),
      paid_method VARCHAR(32),
      paid_notes TEXT,
      coins_credited INTEGER,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_collab_tasks_app ON collab_assigned_tasks(collab_application_id);
    CREATE INDEX IF NOT EXISTS idx_collab_tasks_assignee ON collab_assigned_tasks(assignee_user_id);
    CREATE INDEX IF NOT EXISTS idx_collab_tasks_status ON collab_assigned_tasks(status);
  `)
  try {
    await pool.query(`
      ALTER TABLE collab_assigned_tasks DROP CONSTRAINT IF EXISTS collab_assigned_tasks_status_check
    `)
    await pool.query(`
      ALTER TABLE collab_assigned_tasks ADD CONSTRAINT collab_assigned_tasks_status_check
      CHECK (status IN (
        'assigned', 'in_progress', 'submitted', 'needs_revision',
        'verified_ready', 'paid', 'cancelled', 'rejected'
      ))
    `)
  } catch {
    /* ignore if table new or constraint differs */
  }

  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS purchase_token TEXT`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS linked_order_id INTEGER`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS collab_order_returned_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS external_retailer TEXT`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS external_order_ref TEXT`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS product_received_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS product_not_received_at TIMESTAMPTZ`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS product_not_received_note TEXT`)
  await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS completion_post_urls JSONB NOT NULL DEFAULT '{}'::jsonb`)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS collab_assigned_tasks_purchase_token_uidx
    ON collab_assigned_tasks(purchase_token) WHERE purchase_token IS NOT NULL
  `)
}

/** Task platform keys allowed for a creator, derived from collab application `platforms[].name` */
export function collabTaskKeysFromApplicationPlatforms(raw: unknown): Set<string> {
  const set = new Set<string>()
  const list = Array.isArray(raw) ? raw : []
  const mapName = (n: string): string[] => {
    const name = String(n || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
    const m: Record<string, string[]> = {
      instagram: ['instagram_reel'],
      ig: ['instagram_reel'],
      youtube: ['youtube'],
      reddit: ['reddit'],
      x: ['x'],
      twitter: ['x'],
      tiktok: ['tiktok'],
      facebook: ['facebook'],
      fb: ['facebook'],
      linkedin: ['other'],
      telegram: ['other'],
      snapchat: ['other'],
      vk: ['other'],
      quora: ['other'],
      other: ['other'],
    }
    return m[name] || ['other']
  }
  for (const p of list) {
    const name =
      typeof p === 'object' && p !== null && 'name' in p ? String((p as { name: string }).name).trim() : ''
    if (!name) continue
    for (const k of mapName(name)) set.add(k)
  }
  return set
}

function normalizePostUrlForDedupe(url: string): string {
  try {
    const u = new URL(url.trim())
    u.hash = ''
    let path = u.pathname.replace(/\/+$/, '') || '/'
    return `${u.hostname.toLowerCase()}${path}${u.search}`.toLowerCase()
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, '')
  }
}

function parseTaskOptions(row: { task_options?: unknown }): Record<string, unknown> {
  const o = row.task_options
  if (o && typeof o === 'object' && !Array.isArray(o)) return o as Record<string, unknown>
  return {}
}

function taskPlatformsList(t: { platforms?: unknown }): string[] {
  const p = t.platforms
  if (Array.isArray(p)) return p.map((x) => String(x)).filter(Boolean)
  return []
}

/** URLs already stored on a task row (dedupe checks). */
function collectStoredPostUrls(r: { completion_post_url?: unknown; completion_post_urls?: unknown }): string[] {
  const out: string[] = []
  const ju = r.completion_post_urls
  if (ju && typeof ju === 'object' && ju !== null && !Array.isArray(ju)) {
    for (const v of Object.values(ju as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out.push(v.trim())
    }
  }
  if (out.length > 0) return [...new Set(out)]
  const single = r.completion_post_url != null ? String(r.completion_post_url).trim() : ''
  if (single) {
    for (const line of single.split(/\r?\n/)) {
      const s = line.trim()
      if (s) out.push(s)
    }
  }
  return [...new Set(out)]
}

/**
 * Ensures creators always get a purchase_token (older rows) and snapshot.slug (often only on products.slug column).
 */
async function enrichCreatorCollabTaskRows(pool: Pool, rows: Record<string, unknown>[]) {
  if (!rows.length) return
  for (const r of rows) {
    const id = Number(r.id)
    const productId = r.product_id != null ? Number(r.product_id) : NaN
    if (productId > 0 && (!r.purchase_token || !String(r.purchase_token).trim())) {
      const tok = randomUUID()
      await pool.query(
        `UPDATE collab_assigned_tasks SET purchase_token = $1, updated_at = NOW() WHERE id = $2`,
        [tok, id]
      )
      r.purchase_token = tok
    }
  }
  const pids = [
    ...new Set(
      rows
        .map((x) => (x.product_id != null ? Number(x.product_id) : NaN))
        .filter((n) => !Number.isNaN(n) && n > 0)
    ),
  ]
  if (!pids.length) return
  const { rows: prows } = await pool.query(`SELECT id, slug, details FROM products WHERE id = ANY($1::int[])`, [pids])
  const slugByProductId = new Map<number, string>()
  for (const p of prows) {
    let slug = typeof p.slug === 'string' && p.slug.trim() ? p.slug.trim() : ''
    if (!slug && p.details && typeof p.details === 'object' && p.details !== null && 'slug' in p.details) {
      slug = String((p.details as { slug?: string }).slug || '').trim()
    }
    if (slug) slugByProductId.set(Number(p.id), slug)
  }
  for (const r of rows) {
    const pid = r.product_id != null ? Number(r.product_id) : NaN
    if (!pid || pid <= 0) continue
    const slugFromProduct = slugByProductId.get(pid)
    if (!slugFromProduct) continue
    let snap = r.product_snapshot
    if (typeof snap === 'string') {
      try {
        snap = JSON.parse(snap) as Record<string, unknown>
      } catch {
        snap = {}
      }
    }
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) snap = {}
    const o = snap as Record<string, unknown>
    const cur = String(o.slug || '').trim()
    if (cur) continue
    const merged = { ...o, slug: slugFromProduct }
    await pool.query(
      `UPDATE collab_assigned_tasks SET product_snapshot = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(merged), r.id]
    )
    r.product_snapshot = merged
  }
}

function getIo(req: Request): Server | undefined {
  return (req as Request & { io?: Server }).io
}

async function ensureUserNotificationsTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_notifications (
      id serial primary key,
      user_id integer references users(id) on delete cascade,
      notification_type text not null,
      title text not null,
      message text not null,
      link text,
      icon text,
      priority text default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
      status text default 'unread' check (status in ('unread', 'read', 'archived')),
      metadata jsonb default '{}'::jsonb,
      read_at timestamptz,
      created_at timestamptz default now()
    )
  `)
}

/** Blog "Activity" tab + bell (blog_notifications) — separate from user_notifications inbox */
async function notifyCollabBlogActivity(
  pool: Pool,
  recipientUserId: number,
  type: string,
  title: string,
  excerpt: string
) {
  try {
    await createNotification({
      pool,
      recipientUserId,
      actorUserId: null,
      actorName: 'Nefol Creator Program',
      type,
      postId: 'collab',
      postTitle: title,
      commentExcerpt: excerpt.slice(0, 500),
      commentId: null,
    })
  } catch (e) {
    console.error('[collabTasks] notifyCollabBlogActivity:', e)
  }
}

async function notifyUser(
  pool: Pool,
  req: Request,
  userId: number,
  type: string,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await ensureUserNotificationsTable(pool)
    const { rows } = await pool.query(
      `INSERT INTO user_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        userId,
        type,
        title,
        message,
        link || null,
        null,
        'medium',
        JSON.stringify(metadata || {}),
      ]
    )
    const io = getIo(req)
    if (io && rows[0]) {
      io.to(`user-${userId}`).emit('notification', rows[0])
    }
    return rows[0]
  } catch (e) {
    console.error('[collabTasks] notifyUser:', e)
    return null
  }
}

async function notifyAdmins(pool: Pool, req: Request, type: string, title: string, message: string, link?: string, metadata?: Record<string, unknown>) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO admin_notifications (user_id, notification_type, title, message, link, icon, priority, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [null, type, title, message, link || null, null, 'medium', JSON.stringify(metadata || {})]
    )
    const io = getIo(req)
    if (io && rows[0]) {
      io.to('admin-panel').emit('new-notification', rows[0])
    }
    return rows[0]
  } catch (e) {
    console.error('[collabTasks] notifyAdmins:', e)
    return null
  }
}

async function resolveAssigneeUserId(pool: Pool, collabApplicationId: number): Promise<number | null> {
  const { rows } = await pool.query(
    `SELECT ca.unique_user_id, ca.email, u.id AS user_id
     FROM collab_applications ca
     LEFT JOIN users u ON u.unique_user_id IS NOT NULL AND u.unique_user_id = ca.unique_user_id
     WHERE ca.id = $1
     LIMIT 1`,
    [collabApplicationId]
  )
  if (!rows.length) return null
  const r = rows[0]
  if (r.user_id) return Number(r.user_id)
  const email = String(r.email || '').trim().toLowerCase()
  if (!email) return null
  const u2 = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`, [email])
  return u2.rows[0]?.id != null ? Number(u2.rows[0].id) : null
}

async function getApprovedCollabAppForUser(
  pool: Pool,
  userId: string
): Promise<{ id: number; unique_user_id: string | null; email: string | null } | null> {
  const u = await pool.query(`SELECT id, email, unique_user_id FROM users WHERE id = $1`, [userId])
  const row = u.rows[0]
  if (!row) return null
  const uid = row.unique_user_id
  const email = row.email ? String(row.email).trim().toLowerCase() : null

  if (uid) {
    const a = await pool.query(
      `SELECT id, unique_user_id, email FROM collab_applications
       WHERE unique_user_id = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 1`,
      [uid]
    )
    if (a.rows.length) return a.rows[0]
  }
  if (email) {
    const a = await pool.query(
      `SELECT id, unique_user_id, email FROM collab_applications
       WHERE LOWER(email) = $1 AND status = 'approved' ORDER BY created_at DESC LIMIT 1`,
      [email]
    )
    if (a.rows.length) return a.rows[0]
  }
  return null
}

function normalizePlatforms(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const set = new Set(COLLAB_TASK_PLATFORMS as readonly string[])
  return raw.map((x) => String(x).trim()).filter((x) => set.has(x))
}

/** When a linked collab purchase order is cancelled/refunded, flag the task for admin (no payout until resolved). */
export async function flagCollabTasksForReturnedOrder(pool: Pool, orderId: number): Promise<void> {
  if (!orderId || Number.isNaN(Number(orderId))) return
  try {
    await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS linked_order_id INTEGER`)
    await pool.query(`ALTER TABLE collab_assigned_tasks ADD COLUMN IF NOT EXISTS collab_order_returned_at TIMESTAMPTZ`)
    await pool.query(
      `UPDATE collab_assigned_tasks SET collab_order_returned_at = COALESCE(collab_order_returned_at, NOW()), updated_at = NOW()
       WHERE linked_order_id = $1 AND status::text NOT IN ('paid', 'cancelled', 'rejected')`,
      [orderId]
    )
  } catch (e) {
    console.error('[collabTasks] flagCollabTasksForReturnedOrder:', e)
  }
}

/**
 * If checkout included `collab_purchase_token`, link the order to the collab task and pre-fill order ID.
 * Caller: POST /api/orders after the order row exists.
 */
export async function tryLinkCollabPurchaseOrder(
  pool: Pool,
  req: Request,
  order: { id: number; order_number: string; items: unknown },
  body: Record<string, unknown>,
  customerEmail: string
): Promise<void> {
  const token = typeof body.collab_purchase_token === 'string' ? body.collab_purchase_token.trim() : ''
  if (!token) return

  try {
    await ensureCollabTaskSchema(pool)
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS collab_task_id INTEGER`)

    const emailNorm = String(customerEmail || '').trim().toLowerCase()
    const authUserId = (req as Request & { userId?: string }).userId

    const taskQ = await pool.query(
      `SELECT t.*, u.email AS assignee_email FROM collab_assigned_tasks t
       JOIN users u ON u.id = t.assignee_user_id
       WHERE t.purchase_token = $1 AND t.product_id IS NOT NULL`,
      [token]
    )
    if (!taskQ.rows.length) return
    const task = taskQ.rows[0]
    const assigneeEmail = String(task.assignee_email || '').trim().toLowerCase()
    if (!emailNorm || emailNorm !== assigneeEmail) {
      console.warn('[collab] collab_purchase_token: email does not match assignee')
      return
    }
    if (authUserId != null && String(task.assignee_user_id) !== String(authUserId)) {
      console.warn('[collab] collab_purchase_token: auth user does not match assignee')
      return
    }

    let itemsRaw = order.items
    const items = Array.isArray(itemsRaw)
      ? itemsRaw
      : typeof itemsRaw === 'string'
        ? (JSON.parse(itemsRaw) as unknown[])
        : []
    const pid = Number(task.product_id)
    const hasProduct = items.some((it: unknown) => {
      if (!it || typeof it !== 'object') return false
      const o = it as { product_id?: number; id?: number }
      const id = Number(o.product_id ?? o.id)
      return !Number.isNaN(id) && id === pid
    })
    if (!hasProduct) {
      console.warn('[collab] collab_purchase_token: order items do not include task product', pid)
      return
    }

    if (task.linked_order_id != null && Number(task.linked_order_id) !== Number(order.id)) {
      console.warn('[collab] task already linked to a different order')
      return
    }

    await pool.query(
      `UPDATE collab_assigned_tasks SET
         linked_order_id = $1,
         completion_order_id = COALESCE(NULLIF(TRIM(completion_order_id), ''), $2),
         updated_at = NOW()
       WHERE id = $3 AND purchase_token = $4`,
      [order.id, order.order_number, task.id, token]
    )

    await pool.query(
      `UPDATE orders SET collab_task_id = $2, user_id = COALESCE(user_id, $3::integer) WHERE id = $1`,
      [order.id, task.id, task.assignee_user_id]
    )
  } catch (e) {
    console.error('[collabTasks] tryLinkCollabPurchaseOrder:', e)
  }
}

/** Admin: create task */
export async function adminCreateCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    await ensureCollabTaskSchema(pool)

    const body = req.body as Record<string, unknown>
    const collabApplicationId = Number(body.collab_application_id)
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : ''
    const platforms = normalizePlatforms(body.platforms)
    const taskTemplateKey = typeof body.task_template_key === 'string' ? body.task_template_key.trim() : 'other'
    const taskOptions =
      body.task_options && typeof body.task_options === 'object' && !Array.isArray(body.task_options)
        ? (body.task_options as Record<string, unknown>)
        : {}
    const productId = body.product_id != null && body.product_id !== '' ? Number(body.product_id) : null
    const reimbursementBudget =
      body.reimbursement_budget != null && body.reimbursement_budget !== ''
        ? Number(body.reimbursement_budget)
        : null
    const creatorFeeAmount =
      body.creator_fee_amount != null && body.creator_fee_amount !== '' ? Number(body.creator_fee_amount) : null
    const currency = typeof body.currency === 'string' && body.currency.trim() ? body.currency.trim().toUpperCase() : 'INR'
    const dueAt = typeof body.due_at === 'string' && body.due_at.trim() ? body.due_at.trim() : null

    if (!collabApplicationId || Number.isNaN(collabApplicationId)) {
      return res.status(400).json({ message: 'collab_application_id is required' })
    }
    if (!title) return res.status(400).json({ message: 'title is required' })
    if (!platforms.length) return res.status(400).json({ message: 'Select at least one platform' })

    const appQ = await pool.query(
      `SELECT id, status, name, email, platforms FROM collab_applications WHERE id = $1`,
      [collabApplicationId]
    )
    if (!appQ.rows.length) return res.status(404).json({ message: 'Collab application not found' })
    if (String(appQ.rows[0].status) !== 'approved') {
      return res.status(400).json({ message: 'Can only assign tasks to approved creators' })
    }

    const allowedKeys = collabTaskKeysFromApplicationPlatforms(appQ.rows[0].platforms)
    if (allowedKeys.size === 0) {
      return res.status(400).json({
        message:
          'This creator has no platforms on their collab application. They need to list platforms on their application before you can assign channel-specific tasks.',
      })
    }
    for (const p of platforms) {
      if (!allowedKeys.has(p)) {
        return res.status(400).json({
          message: `Platform "${p}" is not among this creator's selected collab platforms.`,
        })
      }
    }

    const blocked = await assertCollabNotBlockedByAppId(pool, collabApplicationId)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    const assigneeUserId = await resolveAssigneeUserId(pool, collabApplicationId)
    if (!assigneeUserId) {
      return res.status(400).json({
        message:
          'No linked Nefol store account found for this creator (unique_user_id / email). They must use the same account as their collab application.',
      })
    }

    let productSnapshot: unknown = null
    let pid: number | null = null
    if (productId != null && !Number.isNaN(productId)) {
      const pr = await pool.query(`SELECT id, title, price, details, slug FROM products WHERE id = $1`, [productId])
      if (!pr.rows.length) return res.status(400).json({ message: 'Product not found' })
      pid = productId
      const p = pr.rows[0]
      let slug: string | null = null
      if (typeof p.slug === 'string' && p.slug.trim()) slug = p.slug.trim()
      try {
        if (!slug) {
          const d = p.details
          if (d && typeof d === 'object' && 'slug' in d) slug = String((d as { slug?: string }).slug || '').trim() || null
        }
      } catch {
        /* ignore */
      }
      productSnapshot = {
        id: p.id,
        title: p.title,
        price: p.price,
        slug,
      }
    }

    const assignedBy =
      (typeof req.headers['x-admin-email'] === 'string' && req.headers['x-admin-email']) ||
      (typeof body.assigned_by === 'string' && body.assigned_by) ||
      'admin'

    const purchaseToken = pid != null ? randomUUID() : null

    const { rows } = await pool.query(
      `INSERT INTO collab_assigned_tasks (
        collab_application_id, assignee_user_id, title, instructions, platforms, task_template_key, task_options,
        product_id, product_snapshot, reimbursement_budget, creator_fee_amount, currency, due_at, assigned_by_label, status, purchase_token
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7::jsonb,$8,$9::jsonb,$10,$11,$12,$13,$14,'assigned',$15)
      RETURNING *`,
      [
        collabApplicationId,
        assigneeUserId,
        title,
        instructions || null,
        JSON.stringify(platforms),
        taskTemplateKey || 'other',
        JSON.stringify(taskOptions),
        pid,
        productSnapshot ? JSON.stringify(productSnapshot) : null,
        reimbursementBudget,
        creatorFeeAmount,
        currency,
        dueAt,
        String(assignedBy).slice(0, 200),
        purchaseToken,
      ]
    )

    const task = rows[0]

    await notifyUser(
      pool,
      req,
      assigneeUserId,
      'collab_task_assigned',
      'New creator task assigned',
      `Open Creator Program → Collab to complete: ${title}`,
      '#/user/collab?tab=collab&work=tasks',
      { collab_task_id: task.id, collab_application_id: collabApplicationId }
    )

    await notifyCollabBlogActivity(
      pool,
      assigneeUserId,
      'collab_task_assigned',
      title,
      `New brand task: ${title}. Open Creator Program → Collab → Brand tasks.`
    )

    return res.status(201).json({ task })
  } catch (err) {
    console.error('adminCreateCollabTask:', err)
    return res.status(500).json({ message: 'Failed to create task' })
  }
}

export async function adminListCollabTasks(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : ''
    const collabId = req.query.collab_application_id ? Number(req.query.collab_application_id) : null
    const lim = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
    const params: unknown[] = []
    let where = '1=1'
    if (status && status !== 'all') {
      params.push(status)
      where += ` AND t.status = $${params.length}`
    }
    if (collabId && !Number.isNaN(collabId)) {
      params.push(collabId)
      where += ` AND t.collab_application_id = $${params.length}`
    }
    params.push(lim)
    const { rows } = await pool.query(
      `SELECT t.*, ca.name AS creator_name, ca.email AS creator_email
       FROM collab_assigned_tasks t
       JOIN collab_applications ca ON ca.id = t.collab_application_id
       WHERE ${where}
       ORDER BY t.assigned_at DESC
       LIMIT $${params.length}`,
      params
    )
    return res.json({ tasks: rows })
  } catch (err) {
    console.error('adminListCollabTasks:', err)
    return res.status(500).json({ message: 'Failed to list tasks' })
  }
}

export async function adminGetCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    const { rows } = await pool.query(
      `SELECT t.*, ca.name AS creator_name, ca.email AS creator_email, ca.instagram
       FROM collab_assigned_tasks t
       JOIN collab_applications ca ON ca.id = t.collab_application_id
       WHERE t.id = $1`,
      [id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    return res.json({ task: rows[0] })
  } catch (err) {
    console.error('adminGetCollabTask:', err)
    return res.status(500).json({ message: 'Failed to load task' })
  }
}

/** After shipment is fixed, marketing can clear the "did not receive product" flag so the creator can start again. */
export async function adminClearProductNotReceivedReport(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    const upd = await pool.query(
      `UPDATE collab_assigned_tasks SET
        product_not_received_at = NULL,
        product_not_received_note = NULL,
        updated_at = NOW()
       WHERE id = $1 AND product_not_received_at IS NOT NULL`,
      [id]
    )
    if (!upd.rowCount) {
      return res.status(400).json({ message: 'No "did not receive" report on this task' })
    }
    const { rows } = await pool.query(
      `SELECT t.*, ca.name AS creator_name, ca.email AS creator_email, ca.instagram
       FROM collab_assigned_tasks t
       JOIN collab_applications ca ON ca.id = t.collab_application_id
       WHERE t.id = $1`,
      [id]
    )
    return res.json({ task: rows[0] })
  } catch (err) {
    console.error('adminClearProductNotReceivedReport:', err)
    return res.status(500).json({ message: 'Failed to clear report' })
  }
}

export async function adminVerifyCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    const verifiedOrder = !!(req.body as { verified_order?: boolean }).verified_order
    const verifiedPost = !!(req.body as { verified_post?: boolean }).verified_post
    const internalNotes =
      typeof (req.body as { admin_internal_notes?: string }).admin_internal_notes === 'string'
        ? (req.body as { admin_internal_notes: string }).admin_internal_notes.trim()
        : null

    const { rows } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    const t = rows[0]
    if (t.status !== 'submitted' && t.status !== 'verified_ready') {
      return res.status(400).json({ message: 'Task is not awaiting verification' })
    }

    let nextStatus = t.status
    if (verifiedOrder && verifiedPost) nextStatus = 'verified_ready'
    else nextStatus = 'submitted'

    await pool.query(
      `UPDATE collab_assigned_tasks SET
        admin_verified_order = $2,
        admin_verified_post = $3,
        admin_internal_notes = COALESCE($4, admin_internal_notes),
        status = $5,
        updated_at = NOW()
       WHERE id = $1`,
      [id, verifiedOrder, verifiedPost, internalNotes, nextStatus]
    )

    const { rows: updated } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
    return res.json({ task: updated[0] })
  } catch (err) {
    console.error('adminVerifyCollabTask:', err)
    return res.status(500).json({ message: 'Failed to update verification' })
  }
}

export async function adminRequestCollabTaskRevision(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    const message = typeof (req.body as { message?: string }).message === 'string' ? (req.body as { message: string }).message.trim() : ''
    if (!message) return res.status(400).json({ message: 'message is required' })

    const { rows } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    const t = rows[0]
    if (!['submitted', 'verified_ready'].includes(String(t.status))) {
      return res.status(400).json({ message: 'Nothing to revise for this task state' })
    }

    await pool.query(
      `UPDATE collab_assigned_tasks SET
        status = 'needs_revision',
        revision_requested_at = NOW(),
        revision_message = $2,
        updated_at = NOW()
       WHERE id = $1`,
      [id, message]
    )

    const { rows: updated } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])

    await notifyUser(
      pool,
      req,
      Number(t.assignee_user_id),
      'collab_task_revision',
      'Creator task needs updates',
      message.slice(0, 200),
      '#/user/collab?tab=collab&work=tasks',
      { collab_task_id: id }
    )

    await notifyCollabBlogActivity(
      pool,
      Number(t.assignee_user_id),
      'collab_task_revision',
      String(t.title),
      `Revision requested: ${message.slice(0, 280)}`
    )

    return res.json({ task: updated[0] })
  } catch (err) {
    console.error('adminRequestCollabTaskRevision:', err)
    return res.status(500).json({ message: 'Failed to request revision' })
  }
}

export async function adminRejectCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    const reason =
      typeof (req.body as { reason?: string }).reason === 'string' ? (req.body as { reason: string }).reason.trim() : ''
    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    if (!reason) return res.status(400).json({ message: 'reason is required' })

    const { rows } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    const t = rows[0]
    if (!['submitted', 'verified_ready'].includes(String(t.status))) {
      return res.status(400).json({ message: 'Only submitted tasks can be rejected' })
    }

    await pool.query(
      `UPDATE collab_assigned_tasks SET
        status = 'rejected',
        revision_message = $2,
        updated_at = NOW()
       WHERE id = $1`,
      [id, reason]
    )

    const { rows: updated } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])

    await notifyUser(
      pool,
      req,
      Number(t.assignee_user_id),
      'collab_task_rejected',
      'Creator task not approved',
      reason.slice(0, 280),
      '#/user/collab?tab=collab&work=tasks',
      { collab_task_id: id }
    )

    await notifyCollabBlogActivity(
      pool,
      Number(t.assignee_user_id),
      'collab_task_rejected',
      String(t.title),
      `Not approved: ${reason.slice(0, 280)}`
    )

    return res.json({ task: updated[0] })
  } catch (err) {
    console.error('adminRejectCollabTask:', err)
    return res.status(500).json({ message: 'Failed to reject task' })
  }
}

export async function adminPayCollabTaskHandler(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const id = Number(req.params.id)
    const body = req.body as {
      amount?: number | string
      method?: string
      notes?: string
      credit_coins?: boolean
    }
    const amount = body.amount != null ? Number(body.amount) : NaN
    const method = typeof body.method === 'string' ? body.method.trim() : 'recorded_only'
    const notes = typeof body.notes === 'string' ? body.notes.trim() : null
    /** Only `coins_adjustment` may credit loyalty_points; ignore client `credit_coins` for other methods. */
    const creditCoins =
      method === 'coins_adjustment' && amount > 0 && body.credit_coins !== false

    if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid id' })
    if (Number.isNaN(amount) || amount < 0) return res.status(400).json({ message: 'Valid amount is required' })

    const { rows } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    const t = rows[0]

    if (String(t.status) === 'paid') return res.status(400).json({ message: 'Task already paid' })
    if (t.collab_order_returned_at) {
      return res.status(400).json({
        message:
          'Linked collab product order was returned or cancelled before payout. Resolve with the creator before paying.',
      })
    }
    if (!(t.admin_verified_order && t.admin_verified_post)) {
      return res.status(400).json({ message: 'Verify order and post before payout' })
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let coinsCredited = 0
      if (creditCoins && amount > 0) {
        const rounded = Math.round(amount)
        await client.query(`UPDATE users SET loyalty_points = COALESCE(loyalty_points,0) + $1 WHERE id = $2`, [
          rounded,
          t.assignee_user_id,
        ])
        coinsCredited = rounded
      }

      await client.query(
        `UPDATE collab_assigned_tasks SET
          status = 'paid',
          paid_at = NOW(),
          paid_amount = $2,
          paid_currency = $3,
          paid_method = $4,
          paid_notes = $5,
          coins_credited = COALESCE(coins_credited,0) + $6,
          updated_at = NOW()
         WHERE id = $1`,
        [id, amount, t.currency || 'INR', method, notes, coinsCredited]
      )
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {})
      throw e
    } finally {
      client.release()
    }

    const { rows: updated } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])

    await notifyUser(
      pool,
      req,
      Number(t.assignee_user_id),
      'collab_task_paid',
      'Creator task payout recorded',
      creditCoins
        ? `${Math.round(amount)} coins were added to your Nefol balance for: ${t.title}`
        : `Payout recorded for: ${t.title}`,
      '#/user/collab?tab=revenue',
      { collab_task_id: id, amount, credit_coins: creditCoins }
    )

    await notifyCollabBlogActivity(
      pool,
      Number(t.assignee_user_id),
      'collab_task_paid',
      String(t.title),
      creditCoins
        ? `Payout: ${Math.round(amount)} coins added for "${t.title}".`
        : `Payout recorded for "${t.title}".`
    )

    return res.json({ task: updated[0] })
  } catch (err) {
    console.error('adminPayCollabTaskHandler:', err)
    return res.status(500).json({ message: 'Failed to record payout' })
  }
}

/**
 * Creator Program nav badges: only **unread** collab / affiliate **form decisions** (approved or rejected).
 * Brand-task assignments and pending applications are not shown as notification badges.
 */
export async function getCollabBadgeSummary(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    await ensureCollabTaskSchema(pool)
    await ensureCreatorProgramBadgeAckSchema(pool)

    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const u = await pool.query(`SELECT id, email FROM users WHERE id = $1`, [userId])
    if (!u.rows.length) {
      return res.json({
        total: 0,
        collab: 0,
        tasks: 0,
        affiliate: 0,
        revenue: 0,
        collabApprovalUnread: 0,
        affiliateApprovalUnread: 0,
        affiliatePending: 0,
      })
    }

    const emailRaw = u.rows[0].email
    const email = emailRaw ? String(emailRaw).trim().toLowerCase() : ''

    let affiliatePendingCount = 0
    if (email) {
      const { rows: ar } = await pool.query(
        `SELECT COUNT(*)::int AS c FROM affiliate_applications
         WHERE LOWER(TRIM(email)) = $1 AND status = 'pending'`,
        [email]
      )
      affiliatePendingCount = Number(ar[0]?.c) || 0
    }

    const collabApprovalUnread = await getCollabFormDecisionUnread(pool, userId)
    const affiliateApprovalUnread = await getAffiliateFormDecisionUnread(pool, userId, email)

    const revenueCount = 0
    const total = collabApprovalUnread + affiliateApprovalUnread + revenueCount

    return res.json({
      total,
      collab: collabApprovalUnread,
      tasks: 0,
      affiliate: affiliateApprovalUnread,
      revenue: revenueCount,
      collabApprovalUnread,
      affiliateApprovalUnread,
      affiliatePending: affiliatePendingCount,
    })
  } catch (err) {
    console.error('getCollabBadgeSummary:', err)
    return res.status(500).json({ message: 'Failed to load badge summary' })
  }
}

/** Mark Creator Program form-decision notifications as seen (collab / affiliate application approved or rejected). */
export async function postCollabBadgeAck(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCreatorProgramBadgeAckSchema(pool)
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const scope = (req.body as { scope?: string })?.scope
    if (scope !== 'collab' && scope !== 'affiliate') {
      return res.status(400).json({ message: 'scope must be "collab" or "affiliate"' })
    }

    const uid = Number(userId)
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ message: 'Invalid user' })
    }
    if (scope === 'collab') {
      await pool.query(
        `INSERT INTO creator_program_badge_ack (user_id, collab_approval_seen_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET collab_approval_seen_at = EXCLUDED.collab_approval_seen_at`,
        [uid]
      )
    } else {
      await pool.query(
        `INSERT INTO creator_program_badge_ack (user_id, affiliate_approval_seen_at)
         VALUES ($1, NOW())
         ON CONFLICT (user_id) DO UPDATE SET affiliate_approval_seen_at = EXCLUDED.affiliate_approval_seen_at`,
        [uid]
      )
    }
    return res.json({ ok: true })
  } catch (err) {
    console.error('postCollabBadgeAck:', err)
    return res.status(500).json({ message: 'Failed to save acknowledgment' })
  }
}

export async function listUserCollabTasks(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    await ensureCollabTaskSchema(pool)

    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const programBlock = await getApprovedCollabAppForUser(pool, userId)
    if (!programBlock) return res.status(404).json({ message: 'No approved collab application' })

    const blocked = await assertCollabNotBlockedByAppId(pool, programBlock.id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    const { rows } = await pool.query(
      `SELECT * FROM collab_assigned_tasks
       WHERE collab_application_id = $1
       ORDER BY assigned_at DESC`,
      [programBlock.id]
    )
    await enrichCreatorCollabTaskRows(pool, rows as Record<string, unknown>[])
    return res.json({ tasks: rows })
  } catch (err) {
    console.error('listUserCollabTasks:', err)
    return res.status(500).json({ message: 'Failed to load tasks' })
  }
}

export async function getUserCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabTaskSchema(pool)
    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const app = await getApprovedCollabAppForUser(pool, userId)
    if (!app) return res.status(404).json({ message: 'No approved collab application' })

    const id = Number(req.params.id)
    const { rows } = await pool.query(
      `SELECT * FROM collab_assigned_tasks WHERE id = $1 AND collab_application_id = $2`,
      [id, app.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })
    await enrichCreatorCollabTaskRows(pool, rows as Record<string, unknown>[])
    return res.json({ task: rows[0] })
  } catch (err) {
    console.error('getUserCollabTask:', err)
    return res.status(500).json({ message: 'Failed to load task' })
  }
}

export async function submitUserCollabTask(pool: Pool, req: Request, res: Response) {
  try {
    await ensureCollabSchema(pool)
    await ensureCollabBlockSchema(pool)
    await ensureCollabTaskSchema(pool)

    const userId = (req as Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ message: 'Authentication required' })

    const app = await getApprovedCollabAppForUser(pool, userId)
    if (!app) return res.status(404).json({ message: 'No approved collab application' })

    const id = Number(req.params.id)
    const body = req.body as {
      completion_order_id?: string
      completion_post_url?: string
      /** One URL per platform key when the task lists multiple platforms */
      completion_post_urls?: Record<string, string>
      completion_platform_handle?: string
      completion_notes?: string
      completion_extra?: Record<string, unknown>
      mark_in_progress?: boolean
      mark_product_not_received?: boolean
      product_not_received_note?: string
      save_purchase_info?: boolean
      external_retailer?: string
      external_order_ref?: string
      nefol_order_number?: string
    }

    const { rows } = await pool.query(
      `SELECT * FROM collab_assigned_tasks WHERE id = $1 AND collab_application_id = $2`,
      [id, app.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Task not found' })

    const t = rows[0]
    const blocked = await assertCollabNotBlockedByAppId(pool, app.id)
    if (!blocked.ok) return res.status(403).json({ message: blocked.message, collab_blocked: true })

    if (body.mark_product_not_received === true) {
      if (String(t.status) !== 'assigned') {
        return res.status(400).json({ message: 'You can only report a missing product while the task is still waiting to start.' })
      }
      if (t.product_received_at) {
        return res.status(400).json({ message: 'This task was already marked as started with product received.' })
      }
      const noteRaw = typeof body.product_not_received_note === 'string' ? body.product_not_received_note.trim() : ''
      const note = noteRaw.length > 2000 ? noteRaw.slice(0, 2000) : noteRaw
      if (t.product_not_received_at) {
        const r = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
        return res.json({ task: r.rows[0] })
      }
      await pool.query(
        `UPDATE collab_assigned_tasks SET
          product_not_received_at = NOW(),
          product_not_received_note = CASE WHEN $2::text <> '' THEN $2 ELSE NULL END,
          updated_at = NOW()
         WHERE id = $1`,
        [id, note || null]
      )
      const r = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
      const updated = r.rows[0]
      const titleStr = String(updated.title || 'Task')
      await notifyAdmins(
        pool,
        req,
        'collab_product_not_received',
        'Creator did not receive product',
        `${titleStr} — ${note ? `Note: ${note}` : 'No extra details.'} (task #${id})`,
        '/admin/collab-requests',
        { collab_task_id: id, collab_application_id: app.id }
      )
      return res.json({ task: updated })
    }

    if (body.save_purchase_info) {
      if (!['assigned', 'in_progress'].includes(String(t.status))) {
        return res.status(400).json({ message: 'Purchase details can only be updated while the task is active' })
      }
      const erRaw = typeof body.external_retailer === 'string' ? body.external_retailer.trim().toLowerCase() : ''
      const eor = typeof body.external_order_ref === 'string' ? body.external_order_ref.trim() : ''
      const nefol = typeof body.nefol_order_number === 'string' ? body.nefol_order_number.trim() : ''
      if (!eor && !nefol) {
        return res.status(400).json({ message: 'Provide a marketplace order ID or your Nefol order number' })
      }
      const allowedRetailers = ['amazon', 'flipkart', 'other']
      let externalRetailer: string | null = null
      let externalRef: string | null = null
      if (eor) {
        if (!allowedRetailers.includes(erRaw)) {
          return res.status(400).json({ message: 'Choose Amazon, Flipkart, or Other for marketplace purchases' })
        }
        externalRetailer = erRaw
        externalRef = eor
      } else if (erRaw) {
        return res.status(400).json({ message: 'Enter the marketplace order ID' })
      }
      let completionOrder: string | null = null
      if (nefol) {
        if (t.linked_order_id != null) {
          return res.status(400).json({ message: 'This task already has a linked Nefol checkout order' })
        }
        completionOrder = nefol
      }
      await pool.query(
        `UPDATE collab_assigned_tasks SET
          external_retailer = COALESCE($2, external_retailer),
          external_order_ref = COALESCE($3, external_order_ref),
          completion_order_id = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE completion_order_id END,
          updated_at = NOW()
         WHERE id = $1`,
        [id, externalRetailer ?? null, externalRef ?? null, completionOrder ?? null]
      )
      const r = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
      return res.json({ task: r.rows[0] })
    }

    if (body.mark_in_progress) {
      if (t.status === 'assigned') {
        if (t.product_not_received_at) {
          return res.status(400).json({
            message:
              'You reported that you did not receive the product. Wait for the team to follow up, or contact support — you cannot start this task until that is resolved.',
          })
        }
        const opts = parseTaskOptions(t)
        const skipPurchaseGate = opts.skip_product_purchase_gate === true
        const pid = t.product_id != null ? Number(t.product_id) : NaN
        const hasProduct = !Number.isNaN(pid) && pid > 0
        if (hasProduct && !skipPurchaseGate) {
          const linked = t.linked_order_id != null
          const ext =
            t.external_retailer &&
            String(t.external_retailer).trim() &&
            t.external_order_ref &&
            String(t.external_order_ref).trim()
          const nefolManual = t.completion_order_id && String(t.completion_order_id).trim()
          if (!linked && !ext && !nefolManual) {
            return res.status(400).json({
              message:
                'Confirm how you got the product first: use Buy now on Nefol, enter your Nefol order number, or save your Amazon/Flipkart order ID.',
            })
          }
        }
        await pool.query(
          `UPDATE collab_assigned_tasks SET status = 'in_progress', product_received_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [id]
        )
        const r = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])
        return res.json({ task: r.rows[0] })
      }
      return res.json({ task: t })
    }

    if (!['assigned', 'in_progress', 'needs_revision'].includes(String(t.status))) {
      return res.status(400).json({ message: 'This task cannot be submitted right now' })
    }

    const opts = parseTaskOptions(t)
    const requireOrder = opts.require_order_id !== false

    let orderId = typeof body.completion_order_id === 'string' ? body.completion_order_id.trim() : ''
    const existingOrder = t.completion_order_id != null ? String(t.completion_order_id).trim() : ''
    if (!orderId && existingOrder) orderId = existingOrder
    const handle = typeof body.completion_platform_handle === 'string' ? body.completion_platform_handle.trim() : ''
    const notes = typeof body.completion_notes === 'string' ? body.completion_notes.trim() : ''
    const userExtra =
      body.completion_extra && typeof body.completion_extra === 'object' && !Array.isArray(body.completion_extra)
        ? (body.completion_extra as Record<string, unknown>)
        : {}

    const plat = taskPlatformsList(t)
    let urlByPlatform: Record<string, string> = {}
    let postUrlPrimary = ''

    if (plat.length > 1) {
      const raw = body.completion_post_urls
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return res.status(400).json({ message: 'Submit one post URL for each platform selected for this task.' })
      }
      for (const p of plat) {
        const u = typeof raw[p] === 'string' ? raw[p].trim() : ''
        if (!u) {
          return res.status(400).json({
            message: `Post URL is required for ${p.replace(/_/g, ' ')}`,
          })
        }
        urlByPlatform[p] = u
      }
      postUrlPrimary = plat.map((p) => urlByPlatform[p]).join('\n')
    } else if (plat.length === 1) {
      const p = plat[0]
      const fromMap =
        body.completion_post_urls && typeof body.completion_post_urls === 'object' && !Array.isArray(body.completion_post_urls)
          ? String((body.completion_post_urls as Record<string, string>)[p] || '').trim()
          : ''
      const fromLegacy = typeof body.completion_post_url === 'string' ? body.completion_post_url.trim() : ''
      const u = fromMap || fromLegacy
      if (!u) {
        return res.status(400).json({ message: 'Content / post URL is required' })
      }
      urlByPlatform = { [p]: u }
      postUrlPrimary = u
    } else {
      const legacy = typeof body.completion_post_url === 'string' ? body.completion_post_url.trim() : ''
      if (!legacy) {
        return res.status(400).json({ message: 'Content / post URL is required' })
      }
      postUrlPrimary = legacy
    }

    const hayUrls = plat.length > 1 ? Object.values(urlByPlatform).join('\n') : postUrlPrimary
    if (requireOrder && !orderId) {
      const extR = t.external_order_ref != null ? String(t.external_order_ref).trim() : ''
      const extP = t.external_retailer != null ? String(t.external_retailer).trim().toLowerCase() : ''
      if (extR && extP) {
        orderId = `${extP}:${extR}`
      }
    }
    if (requireOrder && !orderId) {
      return res.status(400).json({
        message:
          'Order ID is required. Use Buy now on Nefol, save your marketplace order, or paste your Nefol order number.',
      })
    }
    const orderStored = orderId.trim() ? orderId.trim() : null

    const urlsToDedupe =
      plat.length > 1 ? Object.values(urlByPlatform) : plat.length === 1 ? [postUrlPrimary] : [postUrlPrimary]
    const dupRows = await pool.query(
      `SELECT id, completion_post_url, completion_post_urls FROM collab_assigned_tasks
       WHERE id <> $1
         AND status::text NOT IN ('assigned','in_progress','needs_revision','cancelled','rejected')`,
      [id]
    )
    for (const u of urlsToDedupe) {
      if (!u || !String(u).trim()) continue
      const normUrl = normalizePostUrlForDedupe(String(u))
      for (const r of dupRows.rows) {
        for (const prev of collectStoredPostUrls(r as { completion_post_url?: unknown; completion_post_urls?: unknown })) {
          if (normalizePostUrlForDedupe(prev) === normUrl) {
            return res.status(409).json({ message: 'This content link was already used on another submission.' })
          }
        }
      }
    }

    if (orderStored) {
      const dupOrd = await pool.query(
        `SELECT id FROM collab_assigned_tasks
         WHERE id <> $1
           AND completion_order_id IS NOT NULL
           AND TRIM(completion_order_id) <> ''
           AND LOWER(TRIM(completion_order_id)) = LOWER(TRIM($2))
           AND status::text NOT IN ('assigned','in_progress','needs_revision','cancelled','rejected')`,
        [id, orderStored]
      )
      if (dupOrd.rows.length) {
        return res.status(409).json({ message: 'This order ID was already used on another task submission.' })
      }
    }

    const kwRaw = opts.required_keyword
    const kw =
      typeof kwRaw === 'string' && kwRaw.trim()
        ? kwRaw.trim()
        : Array.isArray(kwRaw) && kwRaw.length
          ? String(kwRaw[0])
          : '#nefol'
    const hay = `${hayUrls}\n${notes}\n${JSON.stringify(userExtra)}`.toLowerCase()
    const keywordOk = !kw || hay.includes(String(kw).toLowerCase())

    let handleInUrl: boolean | null = null
    if (handle) {
      const h = handle.replace(/^@/, '').trim().toLowerCase()
      if (h) {
        const blob = hayUrls.toLowerCase()
        handleInUrl = blob.includes(h)
      }
    }

    const auto_validation = {
      keyword_ok: keywordOk,
      handle_in_url_ok: handleInUrl,
      required_keyword: kw,
      checked_at: new Date().toISOString(),
      warnings: [] as string[],
    }
    if (!keywordOk) {
      auto_validation.warnings.push(`Did not detect required keyword "${kw}" in your link, notes, or attachments metadata.`)
    }
    if (handleInUrl === false) {
      auto_validation.warnings.push('Post URL does not obviously contain your declared handle — admins will double-check.')
    }

    const mergedExtra = { ...userExtra, auto_validation }
    const urlsJson = plat.length > 0 ? JSON.stringify(urlByPlatform) : '{}'

    await pool.query(
      `UPDATE collab_assigned_tasks SET
        status = 'submitted',
        submitted_at = NOW(),
        completion_order_id = $2,
        completion_post_url = $3,
        completion_post_urls = $7::jsonb,
        completion_platform_handle = $4,
        completion_notes = $5,
        completion_extra = $6::jsonb,
        revision_message = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [id, orderStored, postUrlPrimary, handle || null, notes || null, JSON.stringify(mergedExtra), urlsJson]
    )

    const { rows: updated } = await pool.query(`SELECT * FROM collab_assigned_tasks WHERE id = $1`, [id])

    await notifyAdmins(
      pool,
      req,
      'collab_task_submitted',
      'Creator task submitted for review',
      `${t.title}${orderStored ? ` — order ${orderStored}` : ''}`,
      '/admin/collab-requests',
      { collab_task_id: id, collab_application_id: app.id }
    )

    await notifyCollabBlogActivity(
      pool,
      Number(userId),
      'collab_task_submitted',
      String(t.title),
      'Your submission was sent for review. We will notify you when it is approved or needs changes.'
    )

    return res.json({ task: updated[0], validation: auto_validation })
  } catch (err) {
    console.error('submitUserCollabTask:', err)
    return res.status(500).json({ message: 'Failed to submit task' })
  }
}
