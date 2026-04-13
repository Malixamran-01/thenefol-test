import { Request, Response } from 'express'
import { Pool } from 'pg'
import { sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import {
  adjustStockWithBatches,
  createBatch,
  deleteBatch,
  ensureDefaultBatchForInventoryRow,
  listBatchesOrdered,
  setStockQuantityWithBatches,
  updateBatch,
} from '../services/inventoryBatchService'

/** Safety buffer (days) on top of lead time for reorder target — similar to “cover period” in restock reports */
const SAFETY_STOCK_DAYS = 7

function jsonSuccess(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data })
}

/** 30-day units sold per variant from orders.items (jsonb); maps lines without variant_id via SKU or single-variant products */
const VARIANT_VELOCITY_SQL = `
WITH order_lines AS (
  SELECT elem AS line
  FROM orders o
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items, '[]'::jsonb)) elem
  WHERE o.created_at >= NOW() - INTERVAL '30 days'
    AND LOWER(COALESCE(o.status, '')) NOT IN ('cancelled', 'refunded', 'void', 'canceled')
),
line_to_variant AS (
  SELECT
    COALESCE(
      CASE WHEN (line->>'variant_id') ~ '^[0-9]+$' THEN (line->>'variant_id')::int ELSE NULL END,
      (
        SELECT pv.id FROM product_variants pv
        WHERE pv.product_id = (line->>'product_id')::int
          AND (
            (NULLIF(trim(line->>'sku'), '') IS NOT NULL AND pv.sku = trim(line->>'sku'))
            OR (
              NULLIF(trim(line->>'sku'), '') IS NULL
              AND (SELECT COUNT(*)::int FROM product_variants x WHERE x.product_id = pv.product_id) = 1
              AND pv.id = (SELECT MIN(id) FROM product_variants x2 WHERE x2.product_id = pv.product_id)
            )
          )
        LIMIT 1
      )
    ) AS variant_id,
    COALESCE(
      NULLIF((line->>'qty')::text, '')::numeric,
      NULLIF((line->>'quantity')::text, '')::numeric,
      1
    ) AS qty
  FROM order_lines
),
variant_velocity AS (
  SELECT variant_id, SUM(qty)::numeric AS sold_30d
  FROM line_to_variant
  WHERE variant_id IS NOT NULL
  GROUP BY variant_id
)
`

export async function getInventorySummary(pool: Pool, req: Request, res: Response) {
  try {
    const { productId } = req.params as any
    const { rows } = await pool.query(
      `select p.id as product_id, p.title,
              coalesce(sum(i.quantity - i.reserved), 0) as available,
              coalesce(sum(i.quantity), 0) as total,
              count(*) filter (where (i.quantity - i.reserved) <= coalesce(i.low_stock_threshold, 0)) as low_variants
       from products p
       left join product_variants pv on pv.product_id = p.id
       left join inventory i on i.variant_id = pv.id
       where p.id = $1
       group by p.id`,
      [productId]
    )
    sendSuccess(res, rows[0] || { product_id: Number(productId), available: 0, total: 0, low_variants: 0 })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch inventory summary', err)
  }
}

export async function adjustStock(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const { delta, reason = 'manual_adjustment', metadata, batch_id } = req.body || {}
    const validationError = validateRequired({ delta }, ['delta'])
    if (validationError) return sendError(res, 400, validationError)

    await adjustStockWithBatches(pool, Number(productId), Number(variantId), Number(delta), {
      batch_id: batch_id != null ? Number(batch_id) : null,
      reason,
      metadata,
    })

    const { rows } = await pool.query(
      `select * from inventory where product_id = $1 and variant_id = $2`,
      [productId, variantId]
    )

    jsonSuccess(res, rows[0])
  } catch (err: any) {
    if (err?.message?.includes('Insufficient batch stock')) {
      return sendError(res, 400, err.message)
    }
    sendError(res, 500, 'Failed to adjust stock', err)
  }
}

export async function setLowStockThreshold(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const { threshold } = req.body || {}
    const validationError = validateRequired({ threshold }, ['threshold'])
    if (validationError) return sendError(res, 400, validationError)
    const { rows } = await pool.query(
      `update inventory set low_stock_threshold = $3, updated_at = now()
       where product_id = $1 and variant_id = $2
       returning *`,
      [productId, variantId, Number(threshold)]
    )
    jsonSuccess(res, rows[0] || null)
  } catch (err) {
    sendError(res, 500, 'Failed to set low stock threshold', err)
  }
}

export async function listLowStock(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(
      `select pv.id as variant_id, pv.product_id, pv.sku, pv.attributes,
              i.quantity, i.reserved, i.low_stock_threshold
       from product_variants pv
       join inventory i on i.variant_id = pv.id
       where (i.quantity - i.reserved) <= coalesce(i.low_stock_threshold, 0)
       order by (i.quantity - i.reserved) asc`
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list low stock variants', err)
  }
}

export async function getAllProductsWithInventory(pool: Pool, req: Request, res: Response) {
  try {
    const { search, lowStockOnly } = req.query as any

    let whereClause = ''
    const params: any[] = []

    if (search) {
      whereClause += ` AND (p.title ILIKE $${params.length + 1} OR p.slug ILIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }

    if (lowStockOnly === 'true') {
      whereClause += ` AND (i.quantity - COALESCE(i.reserved, 0)) <= COALESCE(i.low_stock_threshold, 0)`
    }

    const { rows } = await pool.query(
      `
      ${VARIANT_VELOCITY_SQL}
      SELECT 
        p.id as product_id,
        p.title,
        p.slug,
        p.price,
        p.list_image,
        NULLIF(TRIM(COALESCE(p.details->>'sku', p.details->>'SKU', '')), '') as catalog_sku,
        NULLIF(TRIM(COALESCE(p.details->>'hsn', p.details->>'HSN Code', p.details->>'HSN', '')), '') as catalog_hsn,
        COALESCE(
          json_agg(
            json_build_object(
              'id', pv.id,
              'sku', pv.sku,
              'attributes', pv.attributes,
              'price', pv.price,
              'mrp', pv.mrp,
              'is_active', pv.is_active,
              'quantity', COALESCE(i.quantity, 0),
              'reserved', COALESCE(i.reserved, 0),
              'available', COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0),
              'low_stock_threshold', COALESCE(i.low_stock_threshold, 0),
              'is_low_stock', (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) <= COALESCE(i.low_stock_threshold, 0),
              'lead_time_days', COALESCE(i.lead_time_days, 14),
              'case_pack_quantity', COALESCE(i.case_pack_quantity, 1),
              'min_reorder_quantity', COALESCE(i.min_reorder_quantity, 1),
              'sold_30d', ROUND(COALESCE(vel.sold_30d, 0)::numeric, 2),
              'daily_velocity', CASE WHEN COALESCE(vel.sold_30d, 0) > 0 THEN ROUND((vel.sold_30d / 30.0)::numeric, 4) ELSE NULL END,
              'days_of_supply', CASE
                WHEN COALESCE(vel.sold_30d, 0) <= 0 THEN NULL
                ELSE ROUND(((COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) / NULLIF(vel.sold_30d / 30.0, 0))::numeric, 1)
              END,
              'inventory_health', CASE
                WHEN (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) <= COALESCE(i.low_stock_threshold, 0) THEN 'critical'
                WHEN COALESCE(vel.sold_30d, 0) <= 0 THEN 'no_recent_sales'
                WHEN ((COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) / NULLIF(vel.sold_30d / 30.0, 0))
                     <= COALESCE(i.lead_time_days, 14)::numeric THEN 'critical_velocity'
                WHEN ((COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) / NULLIF(vel.sold_30d / 30.0, 0))
                     <= (COALESCE(i.lead_time_days, 14) + ${SAFETY_STOCK_DAYS})::numeric THEN 'watch'
                ELSE 'healthy'
              END,
              'suggested_reorder_qty', CASE
                WHEN COALESCE(vel.sold_30d, 0) <= 0 THEN NULL
                WHEN GREATEST(
                  0,
                  (vel.sold_30d / 30.0) * (COALESCE(i.lead_time_days, 14) + ${SAFETY_STOCK_DAYS})
                  - (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0))
                ) <= 0 THEN 0
                ELSE GREATEST(
                  COALESCE(i.min_reorder_quantity, 1),
                  (
                    CEIL(
                      GREATEST(
                        0,
                        (vel.sold_30d / 30.0) * (COALESCE(i.lead_time_days, 14) + ${SAFETY_STOCK_DAYS})
                        - (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0))
                      ) / GREATEST(COALESCE(i.case_pack_quantity, 1), 1)::numeric
                    )::int
                  ) * GREATEST(COALESCE(i.case_pack_quantity, 1), 1)
                )
              END,
              'batch_count', CASE WHEN i.id IS NULL THEN 0 ELSE (
                SELECT COUNT(*)::int FROM inventory_batches ib WHERE ib.inventory_id = i.id
              ) END,
              'hsn', NULLIF(TRIM(COALESCE(pv.attributes->>'HSN', pv.attributes->>'hsn', '')), '')
            ) ORDER BY pv.id
          ) FILTER (WHERE pv.id IS NOT NULL),
          '[]'::json
        ) as variants,
        COALESCE(SUM(i.quantity), 0) as total_stock,
        COALESCE(SUM(i.quantity - COALESCE(i.reserved, 0)), 0) as total_available,
        COUNT(*) FILTER (WHERE (i.quantity - COALESCE(i.reserved, 0)) <= COALESCE(i.low_stock_threshold, 0)) as low_stock_variants_count
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN inventory i ON i.variant_id = pv.id AND i.product_id = p.id
      LEFT JOIN variant_velocity vel ON vel.variant_id = pv.id
      WHERE 1=1 ${whereClause}
      GROUP BY p.id, p.title, p.slug, p.price, p.list_image, p.details
      ORDER BY p.title ASC
    `,
      params
    )

    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch products with inventory', err)
  }
}

export async function setStockQuantity(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const { quantity, reason = 'manual_update', metadata } = req.body || {}
    const validationError = validateRequired({ quantity }, ['quantity'])
    if (validationError) return sendError(res, 400, validationError)

    await setStockQuantityWithBatches(pool, Number(productId), Number(variantId), Number(quantity), {
      reason,
      metadata,
    })

    const { rows } = await pool.query(
      `select * from inventory where product_id = $1 and variant_id = $2`,
      [productId, variantId]
    )

    jsonSuccess(res, rows[0])
  } catch (err: any) {
    if (err?.code === 'MULTI_BATCH') {
      return sendError(res, 400, err.message)
    }
    sendError(res, 500, 'Failed to set stock quantity', err)
  }
}

export async function listInventoryBatches(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const invId = await pool.query(
      `select id from inventory where product_id = $1 and variant_id = $2`,
      [productId, variantId]
    )
    if (!invId.rows.length) {
      return jsonSuccess(res, [])
    }
    await ensureDefaultBatchForInventoryRow(pool, invId.rows[0].id)
    const rows = await listBatchesOrdered(pool, invId.rows[0].id)
    jsonSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list batches', err)
  }
}

export async function postInventoryBatch(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const row = await createBatch(pool, Number(productId), Number(variantId), req.body || {})
    jsonSuccess(res, row, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to create batch', err)
  }
}

export async function patchInventoryBatch(pool: Pool, req: Request, res: Response) {
  try {
    const { batchId } = req.params as any
    const row = await updateBatch(pool, Number(batchId), req.body || {})
    if (!row) return sendError(res, 404, 'Batch not found')
    jsonSuccess(res, row)
  } catch (err) {
    sendError(res, 500, 'Failed to update batch', err)
  }
}

export async function deleteInventoryBatch(pool: Pool, req: Request, res: Response) {
  try {
    const { batchId } = req.params as any
    const mergeInto = req.query.merge_into != null ? Number(req.query.merge_into) : null
    const result = await deleteBatch(pool, Number(batchId), mergeInto)
    if (!result.ok) {
      if (result.error === 'last_batch') {
        return sendError(res, 400, 'Cannot delete the only batch for this SKU. Merge or zero out first.')
      }
      return sendError(res, 404, 'Batch not found')
    }
    jsonSuccess(res, result)
  } catch (err) {
    sendError(res, 500, 'Failed to delete batch', err)
  }
}

export async function updateInventorySettings(pool: Pool, req: Request, res: Response) {
  try {
    const { productId, variantId } = req.params as any
    const { lead_time_days, case_pack_quantity, min_reorder_quantity } = req.body || {}

    await pool.query(
      `insert into inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
       values ($1, $2, 0, 0, 0)
       on conflict (product_id, variant_id) do nothing`,
      [productId, variantId]
    )

    const updates: string[] = []
    const values: any[] = [productId, variantId]
    let idx = 3

    if (lead_time_days !== undefined) {
      updates.push(`lead_time_days = $${idx++}`)
      values.push(Math.max(0, Math.floor(Number(lead_time_days))))
    }
    if (case_pack_quantity !== undefined) {
      updates.push(`case_pack_quantity = $${idx++}`)
      values.push(Math.max(1, Math.floor(Number(case_pack_quantity))))
    }
    if (min_reorder_quantity !== undefined) {
      updates.push(`min_reorder_quantity = $${idx++}`)
      values.push(Math.max(1, Math.floor(Number(min_reorder_quantity))))
    }

    if (updates.length === 0) {
      return sendError(res, 400, 'No settings to update')
    }

    updates.push('updated_at = now()')
    const { rows } = await pool.query(
      `UPDATE inventory SET ${updates.join(', ')}
       WHERE product_id = $1 AND variant_id = $2
       RETURNING *`,
      values
    )

    jsonSuccess(res, rows[0])
  } catch (err) {
    sendError(res, 500, 'Failed to update inventory settings', err)
  }
}

export async function getInventoryDashboard(pool: Pool, req: Request, res: Response) {
  try {
    const { rows: invRows } = await pool.query(`
      SELECT
        COUNT(DISTINCT pv.id)::int AS sku_count,
        COUNT(*) FILTER (WHERE (COALESCE(i.quantity,0) - COALESCE(i.reserved,0)) <= COALESCE(i.low_stock_threshold,0))::int AS low_stock_skus,
        COALESCE(SUM(i.quantity - COALESCE(i.reserved,0)), 0)::numeric AS total_available_units
      FROM product_variants pv
      LEFT JOIN inventory i ON i.variant_id = pv.id
    `)

    const { rows: critRows } = await pool.query(`
      ${VARIANT_VELOCITY_SQL}
      SELECT COUNT(*)::int AS critical_velocity_skus
      FROM product_variants pv
      JOIN inventory i ON i.variant_id = pv.id
      LEFT JOIN variant_velocity vel ON vel.variant_id = pv.id
      WHERE COALESCE(vel.sold_30d, 0) > 0
        AND (COALESCE(i.quantity,0) - COALESCE(i.reserved,0)) / NULLIF(vel.sold_30d / 30.0, 0)
            <= COALESCE(i.lead_time_days, 14)::numeric
    `)

    sendSuccess(res, {
      sku_count: invRows[0]?.sku_count ?? 0,
      low_stock_skus: invRows[0]?.low_stock_skus ?? 0,
      total_available_units: invRows[0]?.total_available_units ?? 0,
      critical_velocity_skus: critRows[0]?.critical_velocity_skus ?? 0,
      velocity_window_days: 30,
      safety_stock_days: SAFETY_STOCK_DAYS,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to fetch inventory dashboard', err)
  }
}

export async function getRestockReport(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
      ${VARIANT_VELOCITY_SQL}
      SELECT
        p.id AS product_id,
        p.title,
        pv.id AS variant_id,
        pv.sku,
        COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0) AS available,
        COALESCE(vel.sold_30d, 0) AS sold_30d,
        COALESCE(i.lead_time_days, 14) AS lead_time_days,
        COALESCE(i.case_pack_quantity, 1) AS case_pack_quantity,
        COALESCE(i.min_reorder_quantity, 1) AS min_reorder_quantity,
        CASE
          WHEN COALESCE(vel.sold_30d, 0) <= 0 THEN NULL
          WHEN GREATEST(
            0,
            (vel.sold_30d / 30.0) * (COALESCE(i.lead_time_days, 14) + ${SAFETY_STOCK_DAYS})
            - (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0))
          ) <= 0 THEN 0
          ELSE GREATEST(
            COALESCE(i.min_reorder_quantity, 1),
            (
              CEIL(
                GREATEST(
                  0,
                  (vel.sold_30d / 30.0) * (COALESCE(i.lead_time_days, 14) + ${SAFETY_STOCK_DAYS})
                  - (COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0))
                ) / GREATEST(COALESCE(i.case_pack_quantity, 1), 1)::numeric
              )::int
            ) * GREATEST(COALESCE(i.case_pack_quantity, 1), 1)
          )
        END AS suggested_reorder_qty
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN inventory i ON i.variant_id = pv.id AND i.product_id = p.id
      LEFT JOIN variant_velocity vel ON vel.variant_id = pv.id
      ORDER BY p.title, pv.id
    `)
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to build restock report', err)
  }
}

export async function exportInventoryCsv(pool: Pool, req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
      ${VARIANT_VELOCITY_SQL}
      SELECT
        p.id AS product_id,
        p.title AS product_title,
        pv.id AS variant_id,
        pv.sku,
        COALESCE(i.quantity, 0) AS on_hand,
        COALESCE(i.reserved, 0) AS reserved,
        COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0) AS available,
        COALESCE(i.low_stock_threshold, 0) AS low_stock_threshold,
        COALESCE(i.lead_time_days, 14) AS lead_time_days,
        COALESCE(i.case_pack_quantity, 1) AS case_pack_quantity,
        COALESCE(i.min_reorder_quantity, 1) AS min_reorder_quantity,
        ROUND(COALESCE(vel.sold_30d, 0)::numeric, 2) AS sold_30d,
        CASE
          WHEN COALESCE(vel.sold_30d, 0) <= 0 THEN NULL
          ELSE ROUND(((COALESCE(i.quantity, 0) - COALESCE(i.reserved, 0)) / NULLIF(vel.sold_30d / 30.0, 0))::numeric, 1)
        END AS days_of_supply
      FROM products p
      JOIN product_variants pv ON pv.product_id = p.id
      LEFT JOIN inventory i ON i.variant_id = pv.id AND i.product_id = p.id
      LEFT JOIN variant_velocity vel ON vel.variant_id = pv.id
      ORDER BY p.title, pv.id
    `)

    const headers = [
      'product_id',
      'product_title',
      'variant_id',
      'sku',
      'on_hand',
      'reserved',
      'available',
      'low_stock_threshold',
      'lead_time_days',
      'case_pack_quantity',
      'min_reorder_quantity',
      'sold_30d',
      'days_of_supply',
    ]

    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }

    const lines = [headers.join(',')]
    for (const r of rows) {
      lines.push(headers.map((h) => esc((r as any)[h])).join(','))
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-export.csv"')
    res.send(lines.join('\n'))
  } catch (err) {
    sendError(res, 500, 'Failed to export inventory CSV', err)
  }
}

export async function listInventoryLogs(pool: Pool, req: Request, res: Response) {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50))
    const { rows } = await pool.query(
      `SELECT il.id, il.product_id, il.variant_id, il.change, il.reason, il.metadata, il.created_at,
              p.title AS product_title,
              pv.sku
       FROM inventory_logs il
       LEFT JOIN products p ON p.id = il.product_id
       LEFT JOIN product_variants pv ON pv.id = il.variant_id
       ORDER BY il.created_at DESC
       LIMIT $1`,
      [limit]
    )
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to list inventory logs', err)
  }
}

/**
 * Products need at least one product_variants row for stock to exist.
 * Creates a single default SKU + inventory row for simple (non-matrix) products.
 */
export async function ensureDefaultVariant(pool: Pool, req: Request, res: Response) {
  try {
    const { productId } = req.params as { productId?: string }
    const pid = parseInt(String(productId), 10)
    if (!Number.isFinite(pid) || pid <= 0) {
      return sendError(res, 400, 'Invalid product id')
    }

    const { rows: pRows } = await pool.query('select id, slug, title, details from products where id = $1', [pid])
    if (pRows.length === 0) return sendError(res, 404, 'Product not found')

    const { rows: cRows } = await pool.query(
      'select count(*)::int as c from product_variants where product_id = $1',
      [pid]
    )
    if ((cRows[0]?.c ?? 0) > 0) {
      return sendError(
        res,
        400,
        'This product already has SKUs. Use Product Variants to add sizes/options, or manage existing stock below.'
      )
    }

    const rawDetails = pRows[0].details
    let details: Record<string, any> = {}
    if (rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)) {
      details = rawDetails as Record<string, any>
    } else if (typeof rawDetails === 'string') {
      try {
        details = JSON.parse(rawDetails)
      } catch {
        details = {}
      }
    }

    const catalogSku = String(details.sku || details.SKU || '').trim()
    const catalogHsn = String(details.hsn || details['HSN Code'] || details.HSN || '').trim()

    const slugPart = String(pRows[0].slug || pRows[0].title || `product-${pid}`)
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48)
    const skuBase = slugPart || `P${pid}`
    let sku = catalogSku || `NEF-${pid}-${skuBase.toUpperCase()}`.slice(0, 120)
    sku = sku.slice(0, 120)

    if (catalogSku) {
      const { rows: taken } = await pool.query(
        `select id from product_variants where product_id <> $1 and lower(trim(sku)) = lower(trim($2)) limit 1`,
        [pid, catalogSku]
      )
      if (taken.length > 0) {
        sku = `${catalogSku}-P${pid}`.slice(0, 120)
      }
    }

    const attrs: Record<string, string> = { Default: 'Standard' }
    if (catalogHsn) attrs.HSN = catalogHsn
    const { rows: vRows } = await pool.query(
      `insert into product_variants (product_id, sku, attributes, is_active)
       values ($1, $2, $3::jsonb, true)
       returning *`,
      [pid, sku, JSON.stringify(attrs)]
    )

    await pool.query(
      `insert into inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
       values ($1, $2, 0, 0, 0)
       on conflict (product_id, variant_id) do nothing`,
      [pid, vRows[0].id]
    )

    const { rows: invLookup } = await pool.query(
      `select id from inventory where product_id = $1 and variant_id = $2`,
      [pid, vRows[0].id]
    )
    if (invLookup[0]?.id) {
      await ensureDefaultBatchForInventoryRow(pool, invLookup[0].id)
    }

    jsonSuccess(res, vRows[0], 201)
  } catch (err: any) {
    if (err?.code === '23505') {
      return sendError(res, 409, 'SKU already exists. Edit the variant in Product Variants or pick a unique SKU.')
    }
    sendError(res, 500, 'Failed to create default SKU', err)
  }
}
