import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess } from '../utils/apiHelpers'
import { sendAlert } from './notifications'

async function ensureTable(pool: Pool) {
  await pool.query(`
    create table if not exists returns (
      id serial primary key,
      order_id int not null,
      status text not null default 'requested',
      items jsonb not null default '[]'::jsonb,
      reason text,
      label_url text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `)
}

export async function listReturns(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTable(pool)
    const { rows } = await pool.query(`select * from returns order by created_at desc`)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list returns', err)
  }
}

export async function createReturn(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTable(pool)
    const { order_id, items, reason } = req.body || {}
    if (!order_id) return sendError(res, 400, 'order_id is required')
    const { rows } = await pool.query(
      `insert into returns (order_id, items, reason) values ($1, $2, $3) returning *`,
      [order_id, JSON.stringify(Array.isArray(items) ? items : []), reason || null]
    )
    try { await sendAlert(pool, { subject: 'New Return Requested', text: `Return created for Order #${order_id}. Reason: ${reason || 'N/A'}` }) } catch {}
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create return', err)
  }
}

export async function updateReturnStatus(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTable(pool)
    const { id } = req.params as any
    const { status } = req.body || {}
    if (!status) return sendError(res, 400, 'status is required')
    const { rows } = await pool.query(
      `update returns set status = $2, updated_at = now() where id = $1 returning *`,
      [id, status]
    )
    if (rows.length === 0) return sendError(res, 404, 'Return not found')
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update return status', err)
  }
}

export async function generateReturnLabel(pool: Pool, req: Request, res: Response) {
  try {
    await ensureTable(pool)
    const { id } = req.params as any
    const label_url = `/returns/label-${id}-${Date.now()}.pdf`
    const { rows } = await pool.query(
      `update returns set label_url = $2, updated_at = now() where id = $1 returning *`,
      [id, label_url]
    )
    if (rows.length === 0) return sendError(res, 404, 'Return not found')
    sendSuccess(res, { id, label_url })
  } catch (err) {
    sendError(res, 500, 'Failed to generate return label', err)
  }
}


