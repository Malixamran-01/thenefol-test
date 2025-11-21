import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

export async function createWarehouse(pool: Pool, req: Request, res: Response) {
  try {
    const { name, address, is_active = true } = req.body || {}
    const validationError = validateRequired({ name }, ['name'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into warehouses (name, address, is_active, created_at, updated_at)
       values ($1, $2::jsonb, $3, now(), now()) returning *`,
      [name, JSON.stringify(address || {}), is_active]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err: any) {
    if (err?.code === '23505') return sendError(res, 409, 'Warehouse name already exists')
    sendError(res, 500, 'Failed to create warehouse', err)
  }
}

export async function listWarehouses(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query('select * from warehouses order by created_at desc')
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list warehouses', err)
  }
}

export async function createStockTransfer(pool: Pool, req: Request, res: Response) {
  try {
    const { from_warehouse_id, to_warehouse_id, product_id, variant_id, quantity } = req.body || {}
    const validationError = validateRequired({ from_warehouse_id, to_warehouse_id, product_id, quantity }, ['from_warehouse_id', 'to_warehouse_id', 'product_id', 'quantity'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `insert into stock_transfers (from_warehouse_id, to_warehouse_id, product_id, variant_id, quantity, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now()) returning *`,
      [from_warehouse_id, to_warehouse_id, product_id, variant_id || null, quantity]
    )
    sendSuccess(res, rows[0], 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create stock transfer', err)
  }
}

export async function listStockTransfers(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select st.*, fw.name as from_warehouse_name, tw.name as to_warehouse_name
       from stock_transfers st
       join warehouses fw on fw.id = st.from_warehouse_id
       join warehouses tw on tw.id = st.to_warehouse_id
       order by st.created_at desc`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list stock transfers', err)
  }
}

