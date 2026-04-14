import { Pool } from 'pg'

/**
 * Amazon Selling Partner API order sync.
 * Set AMAZON_SP_API_ENABLED=1 and credentials in env to enable real sync (implementation TODO).
 * Until then, this is a no-op that does not wipe existing amazon rows.
 */
export function isAmazonSpApiConfigured(): boolean {
  return (
    process.env.AMAZON_SP_API_ENABLED === '1' &&
    !!process.env.AMAZON_SP_API_REFRESH_TOKEN &&
    !!process.env.LWA_CLIENT_ID &&
    !!process.env.LWA_CLIENT_SECRET
  )
}

export async function syncAmazonUnifiedSales(_pool: Pool): Promise<{ rows: number; skipped: boolean }> {
  if (!isAmazonSpApiConfigured()) {
    return { rows: 0, skipped: true }
  }
  // TODO: LWA token + AWS SigV4 + Orders API pagination; map to unified_sales rows.
  return { rows: 0, skipped: false }
}
