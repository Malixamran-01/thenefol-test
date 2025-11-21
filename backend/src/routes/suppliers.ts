import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

export async function createSupplier(pool: Pool, req: Request, res: Response) {
  try {
    const { name, email, phone, address, contact_person, payment_terms, notes } = req.body || {}
    const validationError = validateRequired({ name }, ['name'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into suppliers (name, email, phone, address, contact_person, payment_terms, notes, created_at, updated_at)
       values ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, now(), now()) returning *`,
      [name, email || null, phone || null, JSON.stringify(address || {}), contact_person || null, payment_terms || null, JSON.stringify(notes || {})]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create supplier', err)
  }
}

export async function listSuppliers(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('select * from suppliers order by name asc')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list suppliers', err)
  }
}

export async function createPurchaseOrder(pool: Pool, req: Request, res: Response) {
  try {
    const { supplier_id, items, total_amount, due_date, created_by } = req.body || {}
    const validationError = validateRequired({ supplier_id, items }, ['supplier_id', 'items'])
    if (validationError) return sendError(res, 400, validationError)
    const po_number = `PO-${Date.now()}`
    const { rows } = await pool.query(
      `insert into purchase_orders (po_number, supplier_id, items, total_amount, due_date, created_by, created_at, updated_at)
       values ($1, $2, $3::jsonb, $4, $5, $6, now(), now()) returning *`,
      [po_number, supplier_id, JSON.stringify(items), total_amount, due_date, created_by || null]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create purchase order', err)
  }
}

export async function listPurchaseOrders(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select po.*, s.name as supplier_name
       from purchase_orders po
       left join suppliers s on s.id = po.supplier_id
       order by po.created_at desc`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list purchase orders', err)
  }
}

