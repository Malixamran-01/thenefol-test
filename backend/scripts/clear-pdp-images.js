#!/usr/bin/env node
/**
 * Remove product_images rows (PDP and/or banner) — use after VPS reset when files are gone
 * but DB still has URLs (empty frames on the storefront).
 *
 * Run from backend/ with DATABASE_URL (and optional UPLOADS_DIR) in .env:
 *
 *   node scripts/clear-pdp-images.js --dry-run --all-pdp
 *   node scripts/clear-pdp-images.js --all-pdp
 *   node scripts/clear-pdp-images.js --missing-only --all-pdp
 *   node scripts/clear-pdp-images.js --product-id=42 --type=pdp
 *   node scripts/clear-pdp-images.js --all-pdp --all-banner
 *
 * Options:
 *   --dry-run          Print what would be deleted, no DB changes
 *   --all-pdp          All PDP rows (type pdp or NULL)
 *   --all-banner       All banner rows
 *   --missing-only     Only rows whose /uploads/ file is missing on disk
 *   --product-id=N     Limit to one product
 *   --type=pdp|banner  With --product-id (default pdp)
 */

require('dotenv/config')
const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const allPdp = args.includes('--all-pdp')
const allBanner = args.includes('--all-banner')
const missingOnly = args.includes('--missing-only')
const productIdArg = args.find((a) => a.startsWith('--product-id='))
const productId = productIdArg ? Number(productIdArg.split('=')[1]) : null
const typeArg = args.find((a) => a.startsWith('--type='))
const typeFilter = typeArg ? typeArg.split('=')[1] : 'pdp'

const uploadsDir =
  process.env.UPLOADS_DIR ||
  path.resolve(__dirname, '../../uploads-data')

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nefol'
const isSupabase = connectionString.includes('supabase.co')
const pool = new Pool(
  isSupabase
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { connectionString }
)

function uploadFileExists(url) {
  if (!url || typeof url !== 'string') return false
  const marker = '/uploads/'
  const idx = url.indexOf(marker)
  if (idx === -1) return true
  const filename = decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
  if (!filename) return false
  return fs.existsSync(path.join(uploadsDir, filename))
}

async function main() {
  if (!allPdp && !allBanner && productId == null) {
    console.error('Specify --all-pdp, --all-banner, and/or --product-id=N')
    process.exit(1)
  }

  const conditions = []
  const params = []
  let n = 1

  if (productId != null && Number.isFinite(productId)) {
    conditions.push(`product_id = $${n++}`)
    params.push(productId)
  }

  const typeParts = []
  if (allPdp || (productId != null && typeFilter === 'pdp')) {
    typeParts.push(`(type = 'pdp' OR type IS NULL)`)
  }
  if (allBanner || (productId != null && typeFilter === 'banner')) {
    typeParts.push(`type = 'banner'`)
  }
  if (typeParts.length) {
    conditions.push(`(${typeParts.join(' OR ')})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const { rows } = await pool.query(
    `SELECT id, product_id, url, type FROM product_images ${where} ORDER BY product_id, id`,
    params
  )

  const toDelete = missingOnly
    ? rows.filter((r) => !uploadFileExists(r.url))
    : rows

  console.log(`Uploads dir: ${uploadsDir}`)
  console.log(
    `Found ${rows.length} row(s); ${toDelete.length} to delete${missingOnly ? ' (missing files only)' : ''}${dryRun ? ' [DRY RUN]' : ''}`
  )

  if (toDelete.length === 0) {
    await pool.end()
    return
  }

  const byProduct = new Map()
  for (const r of toDelete) {
    byProduct.set(r.product_id, (byProduct.get(r.product_id) || 0) + 1)
  }
  console.log(`Products affected: ${byProduct.size}`)
  for (const [pid, count] of [...byProduct.entries()].slice(0, 20)) {
    console.log(`  product_id=${pid}: ${count} image(s)`)
  }
  if (byProduct.size > 20) console.log(`  … and ${byProduct.size - 20} more`)

  if (dryRun) {
    await pool.end()
    return
  }

  const ids = toDelete.map((r) => r.id)
  const del = await pool.query(
    `DELETE FROM product_images WHERE id = ANY($1::int[]) RETURNING id`,
    [ids]
  )
  console.log(`Deleted ${del.rowCount} row(s) from product_images.`)
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
