import { Pool } from 'pg'

const RESTOCK_POOL_PRIORITY = 1000

export function normalizeOrderItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const j = JSON.parse(raw)
      return Array.isArray(j) ? j : []
    } catch {
      return []
    }
  }
  return []
}

export function lineQty(line: any): number {
  const q = line?.qty ?? line?.quantity ?? line?.qty_ordered
  const n = Number(q)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export async function resolveVariantIdForLine(
  pool: Pool,
  productId: number,
  line: Record<string, any>
): Promise<number | null> {
  const vid = line?.variant_id
  if (typeof vid === 'number' && Number.isFinite(vid)) return vid
  if (typeof vid === 'string' && /^\d+$/.test(vid.trim())) return parseInt(vid.trim(), 10)
  const sku = String(line?.sku || line?.SKU || '')
    .trim()
  if (sku) {
    const { rows } = await pool.query(
      `select id from product_variants where product_id = $1 and lower(trim(sku)) = lower(trim($2)) limit 1`,
      [productId, sku]
    )
    if (rows.length) return rows[0].id as number
  }
  const { rows: c } = await pool.query(
    `select count(*)::int as c from product_variants where product_id = $1`,
    [productId]
  )
  if ((c[0]?.c ?? 0) === 1) {
    const { rows } = await pool.query(`select id from product_variants where product_id = $1 limit 1`, [productId])
    return rows[0]?.id ?? null
  }
  return null
}

export async function getInventoryRow(
  pool: Pool,
  productId: number,
  variantId: number
): Promise<{ id: number; quantity: number } | null> {
  const { rows } = await pool.query(
    `select id, quantity from inventory where product_id = $1 and variant_id = $2`,
    [productId, variantId]
  )
  return rows[0] || null
}

export async function ensureInventoryRow(pool: Pool, productId: number, variantId: number): Promise<number> {
  await pool.query(
    `insert into inventory (product_id, variant_id, quantity, reserved, low_stock_threshold)
     values ($1, $2, 0, 0, 0)
     on conflict (product_id, variant_id) do nothing`,
    [productId, variantId]
  )
  const { rows } = await pool.query(
    `select id from inventory where product_id = $1 and variant_id = $2`,
    [productId, variantId]
  )
  return rows[0].id as number
}

export async function syncInventoryQuantityFromBatches(pool: Pool, inventoryId: number) {
  await pool.query(
    `update inventory i
     set quantity = coalesce((
       select sum(b.quantity)::int from inventory_batches b where b.inventory_id = $1
     ), 0),
     updated_at = now()
     where i.id = $1`,
    [inventoryId]
  )
}

/** Ensure at least one batch exists; backfill from inventory row if table was empty. */
export async function ensureDefaultBatchForInventoryRow(pool: Pool, inventoryId: number) {
  const { rows: c } = await pool.query(
    `select count(*)::int as c from inventory_batches where inventory_id = $1`,
    [inventoryId]
  )
  if ((c[0]?.c ?? 0) > 0) return
  const { rows: inv } = await pool.query(`select quantity from inventory where id = $1`, [inventoryId])
  const q = Math.max(0, Math.floor(Number(inv[0]?.quantity ?? 0)))
  await pool.query(
    `insert into inventory_batches (inventory_id, quantity, label, priority)
     values ($1, $2, 'Opening stock', 0)`,
    [inventoryId, q]
  )
}

export async function listBatchesOrdered(pool: Pool, inventoryId: number) {
  const { rows } = await pool.query(
    `select id, inventory_id, quantity, batch_number, production_location, expiry_date, priority, label, is_restock_pool, created_at, updated_at
     from inventory_batches
     where inventory_id = $1
     order by expiry_date nulls last, priority asc, id asc`,
    [inventoryId]
  )
  return rows
}

/** FIFO depletion: soonest expiry first; undated / restock pool (null expiry) last. */
export async function listBatchesForFifo(pool: Pool, inventoryId: number) {
  const { rows } = await pool.query(
    `select id, inventory_id, quantity, batch_number, production_location, expiry_date, priority, label, is_restock_pool, created_at, updated_at
     from inventory_batches
     where inventory_id = $1
     order by expiry_date nulls last, priority asc, id asc`,
    [inventoryId]
  )
  return rows
}

async function getOrCreateRestockPoolBatch(pool: Pool, inventoryId: number) {
  const { rows: existing } = await pool.query(
    `select id from inventory_batches where inventory_id = $1 and is_restock_pool = true limit 1`,
    [inventoryId]
  )
  if (existing.length) return existing[0].id as number
  const { rows } = await pool.query(
    `insert into inventory_batches (inventory_id, quantity, label, priority, is_restock_pool)
     values ($1, 0, 'Returns & cancellations', $2, true)
     returning id`,
    [inventoryId, RESTOCK_POOL_PRIORITY]
  )
  return rows[0].id as number
}

export async function addToRestockPool(
  pool: Pool,
  productId: number,
  variantId: number,
  qty: number,
  reason: string,
  metadata?: Record<string, unknown>
) {
  if (qty <= 0) return
  const invId = await ensureInventoryRow(pool, productId, variantId)
  await ensureDefaultBatchForInventoryRow(pool, invId)
  const batchId = await getOrCreateRestockPoolBatch(pool, invId)
  await pool.query(
    `update inventory_batches set quantity = quantity + $2, updated_at = now() where id = $1`,
    [batchId, qty]
  )
  await syncInventoryQuantityFromBatches(pool, invId)
  await pool.query(
    `insert into inventory_logs (product_id, variant_id, change, reason, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [productId, variantId, qty, reason, metadata ? JSON.stringify(metadata) : null]
  )
}

function findOrderLine(orderItems: any[], spec: any): any | null {
  if (!spec) return null
  return (
    orderItems.find(
      (item: any) =>
        (spec.id != null && (item.id === spec.id || String(item.id) === String(spec.id))) ||
        (spec.slug && item.slug === spec.slug)
    ) || null
  )
}

export async function restockFromCancellation(
  pool: Pool,
  order: { id: number; items: unknown },
  opts: { cancellation_type?: string | null; items_to_cancel?: unknown }
) {
  const items = normalizeOrderItems(order.items)
  const type = (opts.cancellation_type || 'full').toLowerCase()
  const itemsToCancel = opts.items_to_cancel

  if (type === 'partial' && Array.isArray(itemsToCancel) && itemsToCancel.length > 0) {
    for (const ic of itemsToCancel) {
      const line = findOrderLine(items, ic)
      if (!line) continue
      const productId = Number(line.product_id || line.id)
      if (!Number.isFinite(productId)) continue
      const variantId = await resolveVariantIdForLine(pool, productId, line)
      if (!variantId) continue
      const maxQty = lineQty(line)
      const rq = Math.max(0, Math.floor(Number(ic.quantity ?? maxQty)))
      const qty = Math.min(rq || maxQty, maxQty)
      if (qty <= 0) continue
      await addToRestockPool(pool, productId, variantId, qty, 'cancellation_restock', {
        order_id: order.id,
        partial: true,
      })
    }
    return
  }

  for (const line of items) {
    const productId = Number(line.product_id || line.id)
    if (!Number.isFinite(productId)) continue
    const variantId = await resolveVariantIdForLine(pool, productId, line)
    if (!variantId) continue
    const qty = lineQty(line)
    if (qty <= 0) continue
    await addToRestockPool(pool, productId, variantId, qty, 'cancellation_restock', {
      order_id: order.id,
    })
  }
}

export async function restockFromReturnItems(pool: Pool, orderId: number, itemsJson: unknown) {
  const items = Array.isArray(itemsJson) ? itemsJson : normalizeOrderItems(itemsJson)
  const { rows: ord } = await pool.query(`select id, items from orders where id = $1`, [orderId])
  if (!ord.length) return
  const orderItems = normalizeOrderItems(ord[0].items)

  for (const ret of items) {
    const qty = Math.max(0, Math.floor(Number(ret.qty ?? ret.quantity ?? 0)))
    if (qty <= 0) continue
    const line =
      findOrderLine(orderItems, ret) ||
      orderItems.find(
        (o: any) =>
          Number(o.product_id || o.id) === Number(ret.product_id) &&
          (ret.variant_id == null || String(o.variant_id) === String(ret.variant_id))
      )
    if (!line) continue
    const productId = Number(line.product_id || line.id || ret.product_id)
    if (!Number.isFinite(productId)) continue
    const variantId = (await resolveVariantIdForLine(pool, productId, { ...line, ...ret })) ||
      (await resolveVariantIdForLine(pool, productId, line))
    if (!variantId) continue
    await addToRestockPool(pool, productId, variantId, qty, 'return_restock', {
      order_id: orderId,
      return_id: ret.return_id,
    })
  }
}

export async function applyPositiveDelta(
  pool: Pool,
  inventoryId: number,
  delta: number,
  batchId?: number | null
) {
  if (delta <= 0) return
  await ensureDefaultBatchForInventoryRow(pool, inventoryId)

  if (batchId != null) {
    const { rows } = await pool.query(
      `update inventory_batches set quantity = quantity + $2, updated_at = now()
       where id = $1 and inventory_id = $3
       returning id`,
      [batchId, delta, inventoryId]
    )
    if (rows.length) return
  }

  const { rows: cnt } = await pool.query(
    `select count(*)::int as c from inventory_batches where inventory_id = $1`,
    [inventoryId]
  )
  if ((cnt[0]?.c ?? 0) === 1) {
    await pool.query(
      `update inventory_batches set quantity = quantity + $2, updated_at = now()
       where inventory_id = $1`,
      [inventoryId, delta]
    )
    return
  }

  // Multiple batches: add to newest batch (typical "received" stock)
  const { rows: newest } = await pool.query(
    `select id from inventory_batches where inventory_id = $1 order by created_at desc, id desc limit 1`,
    [inventoryId]
  )
  if (newest.length) {
    await pool.query(
      `update inventory_batches set quantity = quantity + $2, updated_at = now() where id = $1`,
      [newest[0].id, delta]
    )
  }
}

export async function applyNegativeDeltaFifo(pool: Pool, inventoryId: number, delta: number) {
  let remaining = -delta
  if (remaining <= 0) return
  const batches = await listBatchesForFifo(pool, inventoryId)
  for (const b of batches) {
    if (remaining <= 0) break
    const q = Number(b.quantity) || 0
    if (q <= 0) continue
    const take = Math.min(q, remaining)
    await pool.query(
      `update inventory_batches set quantity = quantity - $2, updated_at = now() where id = $1`,
      [b.id, take]
    )
    remaining -= take
  }
  if (remaining > 0) {
    throw new Error(`Insufficient batch stock (short by ${remaining})`)
  }
}

export async function adjustStockWithBatches(
  pool: Pool,
  productId: number,
  variantId: number,
  delta: number,
  opts: { batch_id?: number | null; reason?: string; metadata?: unknown }
) {
  const invId = await ensureInventoryRow(pool, productId, variantId)
  await ensureDefaultBatchForInventoryRow(pool, invId)

  if (delta > 0) {
    await applyPositiveDelta(pool, invId, delta, opts.batch_id ?? null)
  } else if (delta < 0) {
    await applyNegativeDeltaFifo(pool, invId, delta)
  }

  await syncInventoryQuantityFromBatches(pool, invId)
  await pool.query(
    `insert into inventory_logs (product_id, variant_id, change, reason, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [productId, variantId, delta, opts.reason || 'manual_adjustment', opts.metadata ? JSON.stringify(opts.metadata) : null]
  )
}

export async function setStockQuantityWithBatches(
  pool: Pool,
  productId: number,
  variantId: number,
  targetQuantity: number,
  opts: { reason?: string; metadata?: unknown }
) {
  const invId = await ensureInventoryRow(pool, productId, variantId)
  await ensureDefaultBatchForInventoryRow(pool, invId)

  const { rows: c } = await pool.query(
    `select count(*)::int as c from inventory_batches where inventory_id = $1`,
    [invId]
  )
  const batchCount = c[0]?.c ?? 0
  if (batchCount > 1) {
    const err = new Error(
      'This SKU has multiple stock batches. Set quantity on each batch, or merge batches first.'
    )
    ;(err as any).code = 'MULTI_BATCH'
    throw err
  }

  const { rows: cur } = await pool.query(`select quantity from inventory where id = $1`, [invId])
  const currentQuantity = Number(cur[0]?.quantity ?? 0)
  const delta = targetQuantity - currentQuantity

  const { rows: b } = await pool.query(`select id from inventory_batches where inventory_id = $1 limit 1`, [invId])
  if (b.length) {
    await pool.query(
      `update inventory_batches set quantity = $2, updated_at = now() where id = $1`,
      [b[0].id, Math.max(0, Math.floor(targetQuantity))]
    )
  } else {
    await pool.query(
      `insert into inventory_batches (inventory_id, quantity, label, priority)
       values ($1, $2, 'Opening stock', 0)`,
      [invId, Math.max(0, Math.floor(targetQuantity))]
    )
  }

  await syncInventoryQuantityFromBatches(pool, invId)
  await pool.query(
    `insert into inventory_logs (product_id, variant_id, change, reason, metadata)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [productId, variantId, delta, opts.reason || 'manual_update', opts.metadata ? JSON.stringify(opts.metadata) : null]
  )
}

export async function createBatch(
  pool: Pool,
  productId: number,
  variantId: number,
  body: {
    quantity?: number
    expiry_date?: string | null
    priority?: number
    label?: string | null
    batch_number?: string | null
    production_location?: string | null
  }
) {
  const invId = await ensureInventoryRow(pool, productId, variantId)
  await ensureDefaultBatchForInventoryRow(pool, invId)

  const qty = Math.max(0, Math.floor(Number(body.quantity ?? 0)))
  const priority = Math.floor(Number(body.priority ?? 0))
  const label = body.label?.trim() || null
  const batchNumber = body.batch_number?.trim() || null
  const productionLocation = body.production_location?.trim() || null
  let expiry: string | null = null
  if (body.expiry_date != null && String(body.expiry_date).trim() !== '') {
    expiry = String(body.expiry_date).slice(0, 10)
  }

  const { rows } = await pool.query(
    `insert into inventory_batches (inventory_id, quantity, batch_number, production_location, expiry_date, priority, label)
     values ($1, $2, $3, $4, $5::date, $6, $7)
     returning *`,
    [invId, qty, batchNumber, productionLocation, expiry, priority, label]
  )
  await syncInventoryQuantityFromBatches(pool, invId)
  return rows[0]
}

export async function updateBatch(
  pool: Pool,
  batchId: number,
  body: {
    quantity?: number
    expiry_date?: string | null
    priority?: number
    label?: string | null
    batch_number?: string | null
    production_location?: string | null
  }
) {
  const { rows: meta } = await pool.query(
    `select ib.id, ib.inventory_id, i.product_id, i.variant_id
     from inventory_batches ib
     join inventory i on i.id = ib.inventory_id
     where ib.id = $1`,
    [batchId]
  )
  if (!meta.length) return null

  const updates: string[] = []
  const vals: any[] = []
  let i = 1

  if (body.quantity !== undefined) {
    updates.push(`quantity = $${i++}`)
    vals.push(Math.max(0, Math.floor(Number(body.quantity))))
  }
  if (body.priority !== undefined) {
    updates.push(`priority = $${i++}`)
    vals.push(Math.floor(Number(body.priority)))
  }
  if (body.label !== undefined) {
    updates.push(`label = $${i++}`)
    vals.push(body.label?.trim() || null)
  }
  if (body.batch_number !== undefined) {
    updates.push(`batch_number = $${i++}`)
    vals.push(body.batch_number?.trim() || null)
  }
  if (body.production_location !== undefined) {
    updates.push(`production_location = $${i++}`)
    vals.push(body.production_location?.trim() || null)
  }
  if (body.expiry_date !== undefined) {
    if (body.expiry_date === null || String(body.expiry_date).trim() === '') {
      updates.push(`expiry_date = null`)
    } else {
      updates.push(`expiry_date = $${i++}::date`)
      vals.push(String(body.expiry_date).slice(0, 10))
    }
  }

  if (updates.length === 0) {
    const { rows } = await pool.query(`select * from inventory_batches where id = $1`, [batchId])
    return rows[0] ?? null
  }

  updates.push('updated_at = now()')
  vals.push(batchId)
  const { rows } = await pool.query(
    `update inventory_batches set ${updates.join(', ')} where id = $${vals.length} returning *`,
    vals
  )
  const invId = meta[0].inventory_id as number
  await syncInventoryQuantityFromBatches(pool, invId)
  return rows[0]
}

export async function deleteBatch(pool: Pool, batchId: number, mergeIntoBatchId?: number | null) {
  const { rows: meta } = await pool.query(
    `select ib.id, ib.inventory_id, ib.quantity, ib.is_restock_pool
     from inventory_batches ib
     where ib.id = $1`,
    [batchId]
  )
  if (!meta.length) return { ok: false as const, error: 'not_found' }
  const invId = meta[0].inventory_id as number
  const qty = Number(meta[0].quantity) || 0

  const { rows: others } = await pool.query(
    `select id from inventory_batches where inventory_id = $1 and id <> $2 order by id asc`,
    [invId, batchId]
  )
  if (others.length === 0) {
    return { ok: false as const, error: 'last_batch' }
  }

  let targetId = mergeIntoBatchId ?? null
  if (targetId != null) {
    const { rows: check } = await pool.query(
      `select id from inventory_batches where id = $1 and inventory_id = $2`,
      [targetId, invId]
    )
    if (!check.length) targetId = null
  }
  if (targetId == null) {
    targetId = others[0].id as number
  }

  if (qty > 0) {
    await pool.query(
      `update inventory_batches set quantity = quantity + $2, updated_at = now() where id = $1`,
      [targetId, qty]
    )
  }
  await pool.query(`delete from inventory_batches where id = $1`, [batchId])
  await syncInventoryQuantityFromBatches(pool, invId)
  return { ok: true as const, merged_into: targetId }
}
