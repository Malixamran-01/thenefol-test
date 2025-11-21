import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

export async function createPOSTransaction(pool: Pool, req: Request, res: Response) {
  try {
    const { staff_id, items, subtotal, tax = 0, discount = 0, total, payment_method } = req.body || {}
    const validationError = validateRequired({ staff_id, items, subtotal, total, payment_method }, ['staff_id', 'items', 'subtotal', 'total', 'payment_method'])
    if (validationError) return sendError(res, 400, validationError)
    const transaction_number = `POS-${Date.now()}`
    const { rows } = await pool.query(
      `insert into pos_transactions (transaction_number, staff_id, items, subtotal, tax, discount, total, payment_method, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, now(), now()) returning *`,
      [transaction_number, staff_id, JSON.stringify(items), subtotal, tax, discount, total, payment_method]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create POS transaction', err)
  }
}

export async function listPOSTransactions(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select pt.*, su.name as staff_name
       from pos_transactions pt
       left join staff_users su on su.id = pt.staff_id
       order by pt.created_at desc`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list POS transactions', err)
  }
}

export async function openPOSSession(pool: Pool, req: Request, res: Response) {
  try {
    const { staff_id, opening_amount = 0 } = req.body || {}
    const validationError = validateRequired({ staff_id }, ['staff_id'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into pos_sessions (staff_id, opened_at, opening_amount, status)
       values ($1, now(), $2, 'open') returning *`,
      [staff_id, opening_amount]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to open POS session', err)
  }
}

export async function closePOSSession(pool: Pool, req: Request, res: Response) {
  try {
    const { sessionId, closing_amount } = req.body || {}
    const validationError = validateRequired({ sessionId, closing_amount }, ['sessionId', 'closing_amount'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `update pos_sessions set closed_at = now(), closing_amount = $2, status = 'closed'
       where id = $1 and status = 'open'
       returning *`,
      [sessionId, closing_amount]
    )
    sendSuccess(res, rows[0] || null)
  } catch (err) {
    sendError(res, 500, 'Failed to close POS session', err)
  }
}

export async function generateBarcode(pool: Pool, req: Request, res: Response) {
  try {
    const { product_id, variant_id, barcode_type = 'EAN13' } = req.body || {}
    if (!product_id && !variant_id) return sendError(res, 400, 'product_id or variant_id required')
    const barcode = `BAR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const { rows } = await pool.query(
      `insert into barcodes (barcode, product_id, variant_id, barcode_type, is_active, created_at)
       values ($1, $2, $3, $4, true, now()) returning *`,
      [barcode, product_id || null, variant_id || null, barcode_type]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 409, 'Barcode already exists')
    sendError(res, 500, 'Failed to generate barcode', err)
  }
}

export async function scanBarcode(pool: Pool, req: Request, res: Response) {
  try {
    const { barcode } = req.query as any
    if (!barcode) return sendError(res, 400, 'barcode is required')
    const { rows } = await pool.query(
      `select b.*, p.title as product_title, pv.attributes
       from barcodes b
       left join products p on p.id = b.product_id
       left join product_variants pv on pv.id = b.variant_id
       where b.barcode = $1 and b.is_active = true`,
      [barcode]
    )
    if (rows.length === 0) return sendError(res, 404, 'Barcode not found')
    sendSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to scan barcode', err)
  }
}

