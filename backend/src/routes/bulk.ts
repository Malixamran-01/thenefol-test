import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'

export async function bulkUpdateOrderStatus(pool: Pool, req: Request, res: Response) {
  try {
    const { orderIds, status } = req.body || {}
    const validationError = validateRequired({ orderIds, status }, ['orderIds', 'status'])
    if (validationError) return sendError(res, 400, validationError)
    const ids = Array.isArray(orderIds) ? orderIds : []
    if (ids.length === 0) return sendError(res, 400, 'orderIds must be non-empty array')
    const { rows } = await pool.query(
      `update orders set status = $2, updated_at = now() where id = any($1::int[]) returning id, status`,
      [ids, status]
    )
    sendSuccess(res, { updated: rows.length })
  } catch (err) {
    sendError(res, 500, 'Bulk update order status failed', err)
  }
}

export async function bulkGenerateShippingLabels(pool: Pool, req: Request, res: Response) {
  try {
    const { orderIds } = req.body || {}
    if (!Array.isArray(orderIds) || orderIds.length === 0) return sendError(res, 400, 'orderIds required')
    // Stub: just acknowledge request
    sendSuccess(res, { queued: orderIds.length })
  } catch (err) {
    sendError(res, 500, 'Bulk shipping label generation failed', err)
  }
}

export async function bulkDownloadInvoices(pool: Pool, req: Request, res: Response) {
  try {
    const { orderIds } = req.body || {}
    if (!Array.isArray(orderIds) || orderIds.length === 0) return sendError(res, 400, 'orderIds required')
    // Stub: return links list placeholder
    const links = orderIds.map((id: number) => ({ orderId: id, url: `/invoices/${id}.pdf` }))
    sendSuccess(res, { links })
  } catch (err) {
    sendError(res, 500, 'Bulk invoice download failed', err)
  }
}

export async function bulkUpdateProductPrices(pool: Pool, req: Request, res: Response) {
  try {
    const { items } = req.body || {}
    if (!Array.isArray(items) || items.length === 0) return sendError(res, 400, 'items required')
    let updated = 0
    for (const it of items) {
      if (!it?.productId || it.price === undefined) continue
      await pool.query(`update products set price = $2, updated_at = now() where id = $1`, [it.productId, String(it.price)])
      updated++
    }
    sendSuccess(res, { updated })
  } catch (err) {
    sendError(res, 500, 'Bulk product price update failed', err)
  }
}


