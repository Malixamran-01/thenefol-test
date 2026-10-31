// Optimized Products API endpoints
import { Request, Response } from 'express'
import { Pool } from 'pg'
import { handleGetAll, handleCreate, handleUpdate, sendError, sendSuccess, validateRequired } from '../utils/apiHelpers'
import { parseProductDescriptionCSV } from '../utils/csv'
import { isSocialCrawler } from '../utils/socialCrawler'
import { getUploadsRoot } from '../config/uploadsRoot'
import { deleteUploadedVideo, VIDEO_EXT_RE } from '../utils/videoOptimize'
import { toShareableOgImage } from '../utils/ogImage'
import { normalizeOrderItems, lineQty } from '../services/inventoryBatchService'
import { parseConcernList, setProductConcerns } from './concerns'

/** Free disk for removed product videos once no other product_images row points at them. */
async function cleanupRemovedVideos(pool: Pool, removed: Array<{ url: string }>) {
  const videoUrls = [...new Set(removed.map((r) => r.url).filter((u) => u && VIDEO_EXT_RE.test(u)))]
  if (videoUrls.length === 0) return
  try {
    const { rows } = await pool.query('SELECT DISTINCT url FROM product_images WHERE url = ANY($1::text[])', [videoUrls])
    const stillUsed = new Set(rows.map((r: any) => r.url))
    for (const url of videoUrls) {
      if (!stillUsed.has(url)) deleteUploadedVideo(getUploadsRoot(), url)
    }
  } catch (err) {
    console.warn('[video] cleanup after delete failed', err)
  }
}

function escapeHtmlMeta(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * HTML shell with OG/Twitter tags for crawlers (WhatsApp, Facebook, etc.) + redirect to SPA.
 * GET /product/:slug — share URL must point here (not only hash routes) for preview images.
 */
export async function serveProductMetaPage(pool: Pool, req: Request, res: Response): Promise<void> {
  try {
    const rawSlug = req.params.slug
    const slug = rawSlug ? decodeURIComponent(String(rawSlug).trim()) : ''
    if (!slug) {
      res.status(400).send('Invalid product')
      return
    }

    if (!isSocialCrawler(req.headers['user-agent'] as string | undefined)) {
      const protocol = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http')
      const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'thenefol.com'
      const baseUrl = `${protocol}://${host}`.replace(/\/$/, '')
      const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || baseUrl
      const slugPath = encodeURIComponent(slug)
      const universal = `${frontendBase}/#/user/product/${slugPath}`
      return res.redirect(302, universal)
    }

    const { rows } = await pool.query(
      `
      SELECT p.title, p.slug, p.description, p.details, p.list_image,
        (
          SELECT pi.url FROM product_images pi
          WHERE pi.product_id = p.id AND (pi.type = 'pdp' OR pi.type IS NULL)
            AND pi.url !~* ${VIDEO_URL_SQL_RE}
          ORDER BY pi.id ASC
          LIMIT 1
        ) AS first_pdp_url,
        (
          SELECT pi.url FROM product_images pi
          WHERE pi.product_id = p.id AND pi.type = 'banner'
          ORDER BY pi.id ASC
          LIMIT 1
        ) AS first_banner_url
      FROM products p
      WHERE p.slug = $1 OR p.slug = $2
      LIMIT 1
      `,
      [slug, rawSlug]
    )

    if (rows.length === 0) {
      res.status(404).send('Product not found')
      return
    }

    const row = rows[0] as {
      title: string
      slug: string
      description: string | null
      details: Record<string, unknown> | null
      list_image: string | null
      first_pdp_url: string | null
      first_banner_url: string | null
    }

    const protocol = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http')
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'thenefol.com'
    const baseUrl = `${protocol}://${host}`.replace(/\/$/, '')
    const frontendBase = (process.env.FRONTEND_URL || '').replace(/\/$/, '') || baseUrl
    const mediaBase = (process.env.PUBLIC_MEDIA_URL || '').replace(/\/$/, '') || frontendBase

    const toAbsolute = (url: string | null | undefined) => {
      if (!url || !String(url).trim()) return ''
      const u = String(url).trim()
      if (/^https?:\/\//i.test(u)) return u
      return `${mediaBase}${u.startsWith('/') ? '' : '/'}${u}`
    }

    const pickImage = (...candidates: Array<string | null | undefined>) => {
      for (const c of candidates) {
        const abs = toAbsolute(c)
        if (abs) return abs
      }
      return ''
    }

    const details =
      row.details && typeof row.details === 'object' && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : typeof row.details === 'string'
          ? (() => {
              try {
                return JSON.parse(row.details) as Record<string, unknown>
              } catch {
                return {}
              }
            })()
          : {}
    const descRaw =
      (typeof row.description === 'string' && row.description) ||
      (typeof details.description === 'string' && details.description) ||
      (typeof details.short_description === 'string' && details.short_description) ||
      (typeof details.subtitle === 'string' && details.subtitle) ||
      ''
    const description =
      descRaw.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) ||
      'Discover premium skincare from NEFOL.'

    const slugPath = encodeURIComponent(row.slug)
    const universalUrl = `${frontendBase}/#/user/product/${slugPath}`
    // Clean, hash-free canonical (also what the sitemap lists); the SPA maps it to the hash route
    const pageUrl = `${frontendBase}/product/${slugPath}`

    const envOg = (process.env.DEFAULT_OG_IMAGE || '').trim()
    const siteLogo = `${frontendBase}/IMAGES/NEFOL%20icon.png`
    const detailsListImage =
      typeof details.list_image === 'string' ? details.list_image : null

    const productOg = pickImage(
      row.list_image,
      row.first_pdp_url,
      row.first_banner_url,
      detailsListImage
    )
    const ogImage = await toShareableOgImage(
      productOg || (envOg ? toAbsolute(envOg) || envOg : siteLogo),
      mediaBase
    )
    const ogImageSecure = ogImage.startsWith('https://') ? ogImage : ogImage.replace(/^http:\/\//i, 'https://')

    const title = `${row.title || 'Product'} | NEFOL`
    const redirectBlock = ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtmlMeta(title)}</title>
  <meta name="description" content="${escapeHtmlMeta(description)}">
  <meta property="og:type" content="product">
  <meta property="og:title" content="${escapeHtmlMeta(row.title || 'Product')}">
  <meta property="og:description" content="${escapeHtmlMeta(description)}">
  <meta property="og:url" content="${escapeHtmlMeta(pageUrl)}">
  <meta property="og:site_name" content="NEFOL">
  ${ogImage ? `<meta property="og:image" content="${escapeHtmlMeta(ogImageSecure)}">
  <meta property="og:image:secure_url" content="${escapeHtmlMeta(ogImageSecure)}">` : ''}
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtmlMeta(row.title || 'Product')}">
  <meta name="twitter:description" content="${escapeHtmlMeta(description)}">
  ${ogImage ? `<meta name="twitter:image" content="${escapeHtmlMeta(ogImageSecure)}">` : ''}
  <link rel="canonical" href="${escapeHtmlMeta(pageUrl)}">
  ${redirectBlock}
</head>
<body>
  <p><a href="${escapeHtmlMeta(universalUrl)}">${escapeHtmlMeta(row.title || 'View product')}</a> on NEFOL</p>
</body>
</html>`

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'public, max-age=300')
    res.send(html)
  } catch (err) {
    console.error('Product meta page error:', err)
    res.status(500).send('Server error')
  }
}

/** Sellable units across all variants (on hand − reserved). Drives storefront availability. */
export const SQL_INVENTORY_AVAILABLE = `
  (SELECT COALESCE(SUM(GREATEST(COALESCE(inv.quantity, 0) - COALESCE(inv.reserved, 0), 0)), 0)::integer
   FROM product_variants pv
   LEFT JOIN inventory inv ON inv.variant_id = pv.id AND inv.product_id = pv.product_id
   WHERE pv.product_id = p.id)
  AS inventory_available`

/**
 * Ordered PDP/banner media as correlated subqueries (uses idx_product_images_product_type).
 * Replaces the old double LEFT JOIN, which multiplied pdp × banner rows and ignored display_order.
 */
const MEDIA_ORDER = 'ORDER BY COALESCE(pi.display_order, pi.id), pi.id'
/** Listing fields shared by every product endpoint: ordered media + Shop-by-Concern tags. */
export const SQL_PRODUCT_IMAGES = `
  COALESCE((SELECT json_agg(pi.url ${MEDIA_ORDER}) FROM product_images pi
            WHERE pi.product_id = p.id AND (pi.type = 'pdp' OR pi.type IS NULL)), '[]'::json) AS pdp_images,
  COALESCE((SELECT json_agg(pi.url ${MEDIA_ORDER}) FROM product_images pi
            WHERE pi.product_id = p.id AND pi.type = 'banner'), '[]'::json) AS banner_images,
  COALESCE((SELECT json_agg(json_build_object('slug', c.slug, 'name', c.name) ORDER BY c.sort_order, c.name)
            FROM product_concerns pc JOIN concerns c ON c.id = pc.concern_id
            WHERE pc.product_id = p.id AND c.is_active), '[]'::json) AS concerns`
/** Single-product endpoints also get poster frames for PDP videos. */
const SQL_PRODUCT_MEDIA = `${SQL_PRODUCT_IMAGES},
  COALESCE((SELECT json_agg(json_build_object('url', pi.url, 'poster', pi.poster_url) ${MEDIA_ORDER}) FROM product_images pi
            WHERE pi.product_id = p.id AND (pi.type = 'pdp' OR pi.type IS NULL)), '[]'::json) AS pdp_media`

const VIDEO_URL_SQL_RE = `'\\.(mp4|webm|ogg|ogv|mov|m4v|avi)([?#]|$)'`

/**
 * Returns a customer-facing message for the first order line that isn't available
 * (same rule as the storefront's in_stock flag), or null when everything can be fulfilled.
 */
export async function findOutOfStockOrderLine(pool: Pool, rawItems: unknown): Promise<string | null> {
  const qtyByProduct = new Map<number, number>()
  for (const line of normalizeOrderItems(rawItems)) {
    const pid = Number(line?.product_id ?? line?.id)
    if (!Number.isFinite(pid) || pid <= 0) continue
    qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + Math.max(1, lineQty(line)))
  }
  if (qtyByProduct.size === 0) return null

  const { rows } = await pool.query(
    `SELECT p.id, p.title, ${SQL_INVENTORY_AVAILABLE} FROM products p WHERE p.id = ANY($1::int[])`,
    [[...qtyByProduct.keys()]]
  )
  for (const row of rows) {
    const available = Number(row.inventory_available) || 0
    const wanted = qtyByProduct.get(Number(row.id)) || 0
    if (available <= 0) return `${row.title} is out of stock. Please remove it from your cart to continue.`
    if (wanted > available) return `Only ${available} left of ${row.title}. Please reduce the quantity to continue.`
  }
  return null
}

export function attachStockFlags(product: any) {
  const n = Number(product?.inventory_available ?? 0)
  return {
    ...product,
    inventory_available: Number.isFinite(n) ? n : 0,
    in_stock: Number.isFinite(n) ? n > 0 : false,
  }
}

// Optimized GET /api/products
export async function getProducts(pool: Pool, res: Response) {
  try {
    console.log(`📋 Fetching all products from database...`)
    
    const { rows } = await pool.query(`
      SELECT p.*,
             ${SQL_INVENTORY_AVAILABLE},
             ${SQL_PRODUCT_IMAGES}
      FROM products p
      ORDER BY p.created_at DESC
    `)

    console.log(`✅ Retrieved ${rows.length} products from database`)

    const products = rows.map((product: any) => attachStockFlags(product))
    
    sendSuccess(res, products)
  } catch (err) {
    console.error(`❌ Failed to fetch products:`, err)
    sendError(res, 500, 'Failed to fetch products', err)
  }
}

// Optimized GET /api/products/:id
export async function getProductById(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    
    // Validate id parameter
    if (!id || id === 'undefined' || id === 'null') {
      return sendError(res, 400, 'Invalid product ID')
    }
    
    const { rows } = await pool.query(`
      SELECT p.*,
             ${SQL_INVENTORY_AVAILABLE},
             ${SQL_PRODUCT_MEDIA}
      FROM products p
      WHERE p.id = $1
    `, [id])

    if (rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }

    sendSuccess(res, attachStockFlags(rows[0]))
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product', err)
  }
}

// GET /api/products/sku/:sku — look up by details->>'sku' (JSONB)
export async function getProductBySku(pool: Pool, req: Request, res: Response) {
  try {
    const { sku } = req.params
    if (!sku || sku === 'undefined' || sku === 'null') {
      return sendError(res, 400, 'Invalid product SKU')
    }
    const { rows } = await pool.query(`
      SELECT p.*,
             ${SQL_INVENTORY_AVAILABLE},
             ${SQL_PRODUCT_MEDIA}
      FROM products p
      WHERE p.details->>'sku' = $1
      LIMIT 1
    `, [sku])
    if (rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }
    sendSuccess(res, attachStockFlags(rows[0]))
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product by SKU', err)
  }
}

// Optimized GET /api/products/slug/:slug
export async function getProductBySlug(pool: Pool, req: Request, res: Response) {
  try {
    const { slug } = req.params
    
    // Validate slug parameter
    if (!slug || slug === 'undefined' || slug === 'null') {
      return sendError(res, 400, 'Invalid product slug')
    }
    
    const { rows } = await pool.query(`
      SELECT p.*,
             ${SQL_INVENTORY_AVAILABLE},
             ${SQL_PRODUCT_MEDIA}
      FROM products p
      WHERE p.slug = $1
    `, [slug])

    if (rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }

    sendSuccess(res, attachStockFlags(rows[0]))
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product', err)
  }
}

// Optimized POST /api/products
export async function createProduct(pool: Pool, req: Request, res: Response) {
  try {
    const { slug, title, category = '', price = '', listImage = '', description = '', details = {} } = req.body || {}
    
    // Validate required fields
    const validationError = validateRequired(req.body, ['slug', 'title'])
    if (validationError) {
      return sendError(res, 400, validationError)
    }
    
    console.log(`📦 Creating product: ${title} (slug: ${slug})`)
    
    const { rows } = await pool.query(`
      INSERT INTO products (slug, title, category, price, list_image, description, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [slug, title, category, price, listImage, description, JSON.stringify(details)])

    console.log(`✅ Product created successfully: ID=${rows[0].id}, Title=${rows[0].title}`)

    // Shop by Concern: names / slugs from the product form or the CSV "Concern" column
    const concerns = req.body?.concerns !== undefined
      ? await setProductConcerns(pool, rows[0].id, parseConcernList(req.body.concerns))
      : []

    sendSuccess(res, { ...rows[0], concerns }, 201)
  } catch (err: any) {
    console.error(`❌ Failed to create product:`, err)
    if (err?.code === '23505') {
      sendError(res, 409, 'Product slug must be unique')
    } else {
      sendError(res, 500, 'Failed to create product', err)
    }
  }
}

// Optimized PUT /api/products/:id
export async function updateProduct(pool: Pool, req: Request, res: Response, io?: any) {
  try {
    const { id } = req.params
    const { slug, title, category, price, listImage, description, details } = req.body || {}
    
    const updates: Record<string, any> = {}
    if (slug !== undefined) updates.slug = slug
    if (title !== undefined) updates.title = title
    if (category !== undefined) updates.category = category
    if (price !== undefined) updates.price = price
    if (listImage !== undefined) updates.list_image = listImage
    if (description !== undefined) updates.description = description
    if (details !== undefined) updates.details = JSON.stringify(details)
    // `concerns` omitted → keep the product's current concerns; [] → remove all
    const hasConcerns = req.body?.concerns !== undefined

    const fields = Object.keys(updates)
    if (fields.length === 0 && !hasConcerns) {
      return sendError(res, 400, 'No fields to update')
    }

    const setClause = [...fields.map((field, i) => `${field} = $${i + 2}`), 'updated_at = NOW()'].join(', ')
    const values = [id, ...fields.map(field => updates[field])]

    const { rows } = await pool.query(`
      UPDATE products
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, values)

    if (rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }

    const concerns = hasConcerns
      ? await setProductConcerns(pool, rows[0].id, parseConcernList(req.body.concerns))
      : undefined

    // Parse details if it's a JSON string
    const updatedProduct = {
      ...rows[0],
      details: typeof rows[0].details === 'string' ? JSON.parse(rows[0].details) : rows[0].details,
      ...(concerns ? { concerns } : {}),
    }
    
    // Broadcast to admin panel
    if (io) {
      io.to('admin-panel').emit('update', { type: 'product_updated', data: updatedProduct })
    }
    
    // Broadcast to all users (for real-time updates in user panel)
    if (io) {
      io.to('all-users').emit('product-updated', updatedProduct)
      io.to('all-users').emit('products-updated', updatedProduct) // Also emit for backward compatibility
    }
    
    sendSuccess(res, updatedProduct)
  } catch (err: any) {
    if (err?.code === '23505') {
      sendError(res, 409, 'Product slug must be unique')
    } else {
      sendError(res, 500, 'Failed to update product', err)
    }
  }
}

// Optimized DELETE /api/products/:id
export async function deleteProduct(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    
    // First check if product exists
    const { rows: existingRows } = await pool.query('SELECT id FROM products WHERE id = $1', [id])
    if (existingRows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }
    
    // Delete product (cascade will handle product_images)
    const { rows } = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id])
    
    sendSuccess(res, { message: 'Product deleted successfully', deletedProduct: rows[0] })
  } catch (err) {
    sendError(res, 500, 'Failed to delete product', err)
  }
}

// Bulk DELETE /api/products/bulk-delete
export async function bulkDeleteProducts(pool: Pool, req: Request, res: Response) {
  try {
    const { ids } = req.body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 400, 'ids must be a non-empty array')
    }
    
    // Validate all IDs are numbers
    const productIds = ids.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
    if (productIds.length === 0) {
      return sendError(res, 400, 'Invalid product IDs provided')
    }
    
    // Delete products in bulk (cascade will handle product_images)
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(', ')
    const { rows } = await pool.query(
      `DELETE FROM products WHERE id IN (${placeholders}) RETURNING *`,
      productIds
    )
    
    sendSuccess(res, { 
      message: `Successfully deleted ${rows.length} product(s)`, 
      deletedCount: rows.length,
      deletedProducts: rows 
    })
  } catch (err) {
    sendError(res, 500, 'Failed to delete products', err)
  }
}

// Upload product images
export async function uploadProductImages(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const files = (req as any).files as Express.Multer.File[]
    const body = req.body || {}
    
    // Check if product exists
    const { rows: productRows } = await pool.query('SELECT id FROM products WHERE id = $1', [id])
    if (productRows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }
    
    let media: Array<{ url: string; poster: string | null }> = []
    const imageType = body.type === 'banner' ? 'banner' : 'pdp'

    // Handle multipart form data (actual file uploads)
    if (files && files.length > 0) {
      media = files.map(file => ({ url: `/uploads/${file.filename}`, poster: (file as any).posterUrl || null }))
    }
    // Handle JSON data (pre-uploaded URLs, or { url, poster } objects for videos)
    else if (body.images && Array.isArray(body.images)) {
      media = body.images
        .map((img: any) =>
          typeof img === 'string'
            ? { url: img, poster: null }
            : { url: String(img?.url || ''), poster: img?.poster ? String(img.poster) : null }
        )
        .filter((m: { url: string }) => m.url.trim().length > 0)
    }
    if (media.length === 0) {
      return sendError(res, 400, 'No images provided')
    }

    // Append after existing media (keeps admin drag order) in a single round trip
    const values: any[] = [id, imageType]
    const tuples = media.map((m, i) => {
      values.push(m.url, m.poster)
      return `($${values.length - 1}::text, $${values.length}::text, ${i + 1})`
    })
    const { rows: insertedImages } = await pool.query(
      `WITH base AS (
         SELECT COALESCE(MAX(COALESCE(display_order, id)), 0) AS max_order
         FROM product_images
         WHERE product_id = $1 AND (type = $2 OR ($2 = 'pdp' AND type IS NULL))
       )
       INSERT INTO product_images (product_id, url, type, poster_url, display_order)
       SELECT $1::integer, v.url, $2::text, v.poster_url, base.max_order + v.idx
       FROM base, (VALUES ${tuples.join(', ')}) AS v(url, poster_url, idx)
       ORDER BY v.idx
       RETURNING *`,
      values
    )

    sendSuccess(res, insertedImages, 201)
  } catch (err) {
    sendError(res, 500, 'Failed to upload product images', err)
  }
}

// Get product images
export async function getProductImages(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    
    // Check if display_order column exists, if not use created_at
    const { rows } = await pool.query(`
      SELECT * FROM product_images 
      WHERE product_id = $1 
      ORDER BY COALESCE(display_order, id) ASC, created_at ASC
    `, [id])
    
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to fetch product images', err)
  }
}

// Delete product image
export async function deleteProductImage(pool: Pool, req: Request, res: Response) {
  try {
    const { id, imageId } = req.params
    
    const { rows } = await pool.query(
      'DELETE FROM product_images WHERE id = $1 AND product_id = $2 RETURNING *',
      [imageId, id]
    )
    
    if (rows.length === 0) {
      return sendError(res, 404, 'Product image not found')
    }

    await cleanupRemovedVideos(pool, rows)
    sendSuccess(res, { message: 'Product image deleted successfully', deleted: rows })
  } catch (err) {
    sendError(res, 500, 'Failed to delete product image', err)
  }
}

/** DELETE /api/products/:id/images?type=pdp|banner — remove all images of a type for one product */
export async function deleteAllProductImages(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const type = String(req.query.type || 'pdp').toLowerCase()

    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [id])
    if (productCheck.rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }

    let rows: { id: number; url: string }[]
    if (type === 'banner') {
      const result = await pool.query(
        `DELETE FROM product_images WHERE product_id = $1 AND type = 'banner' RETURNING id, url`,
        [id]
      )
      rows = result.rows
    } else if (type === 'pdp') {
      const result = await pool.query(
        `DELETE FROM product_images WHERE product_id = $1 AND (type = 'pdp' OR type IS NULL) RETURNING id, url`,
        [id]
      )
      rows = result.rows
    } else {
      return sendError(res, 400, 'Invalid type. Use pdp or banner.')
    }

    await cleanupRemovedVideos(pool, rows)
    sendSuccess(res, {
      message: `Deleted ${rows.length} ${type} image(s)`,
      deletedCount: rows.length,
      deleted: rows,
    })
  } catch (err) {
    sendError(res, 500, 'Failed to delete product images', err)
  }
}

// Reorder product images
export async function reorderProductImages(pool: Pool, req: Request, res: Response) {
  try {
    const { id } = req.params
    const { images, type } = req.body
    
    if (!images || !Array.isArray(images)) {
      return sendError(res, 400, 'Images array is required')
    }
    
    // Check if product exists
    const productCheck = await pool.query('SELECT id FROM products WHERE id = $1', [id])
    if (productCheck.rows.length === 0) {
      return sendError(res, 404, 'Product not found')
    }
    
    // Update display_order for each image
    // First, check if display_order column exists
    try {
      await pool.query('SELECT display_order FROM product_images LIMIT 1')
    } catch (err: any) {
      // Column doesn't exist, add it
      await pool.query('ALTER TABLE product_images ADD COLUMN IF NOT EXISTS display_order INTEGER')
    }
    
    // Update each image's display_order
    for (const img of images) {
      if (img.id && typeof img.display_order === 'number') {
        await pool.query(
          'UPDATE product_images SET display_order = $1 WHERE id = $2 AND product_id = $3 AND (type = $4 OR ($4 IS NULL AND type IS NULL))',
          [img.display_order, img.id, id, type || null]
        )
      }
    }
    
    sendSuccess(res, { message: 'Image order updated successfully' })
  } catch (err) {
    console.error('Failed to reorder images:', err)
    sendError(res, 500, 'Failed to reorder images', err)
  }
}

// Optimized CSV endpoint with correct path
export async function getProductsCSV(res: Response) {
  try {
    const path = require('path')
    const fs = require('fs')
    
    // FIXED: Correct path to CSV file (backend runs from backend/, so go up 1 level)
    const csvPath = path.resolve(process.cwd(), '..', 'product description page.csv')
    
    console.log('🔍 CSV Debug Info:')
    console.log('  Current working directory:', process.cwd())
    console.log('  Resolved CSV path:', csvPath)
    console.log('  File exists:', fs.existsSync(csvPath))
    
    if (!fs.existsSync(csvPath)) {
      console.warn('❌ CSV file not found at:', csvPath)
      return sendSuccess(res, [])
    }
    
    console.log('✅ CSV file found, reading content...')
    
    const raw = fs.readFileSync(csvPath, 'utf8')
    // Quoted cells may span lines, so parse the whole file rather than line by line
    const rows = parseProductDescriptionCSV(raw)

    console.log('📦 Final Results:')
    console.log('  Parsed products:', rows.length)
    console.log('  First product:', rows[0]?.['Product Name'])
    
    sendSuccess(res, rows)
  } catch (err) {
    sendError(res, 500, 'Failed to read products CSV', err)
  }
}