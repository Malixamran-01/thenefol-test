import { Pool } from 'pg'

/**
 * Flipkart Seller / Sales API credentials — read from the **backend** `.env` (same folder as `backend/package.json`).
 * The admin panel `.env` is not used for this (only VITE_* vars are).
 *
 * Supported names (use one pair):
 * - Preferred: `FLIPKART_API_KEY`, `FLIPKART_API_SECRET`
 * - Aliases:  `FLIPKART_SALES_API_KEY`, `FLIPKART_SALES_SECRET` (matches common Flipkart naming)
 *
 * Enable/disable:
 * - If both key and secret are set, sync is considered **on** unless you set `FLIPKART_API_ENABLED=0`
 *   or `FLIPKART_SALES_API_ENABLED=0`.
 * - To require an explicit on switch, set `FLIPKART_API_ENABLED=1` (optional if keys exist).
 */
export function getFlipkartApiKey(): string {
  return (process.env.FLIPKART_API_KEY || process.env.FLIPKART_SALES_API_KEY || '').trim()
}

export function getFlipkartApiSecret(): string {
  return (process.env.FLIPKART_API_SECRET || process.env.FLIPKART_SALES_SECRET || '').trim()
}

export function isFlipkartApiConfigured(): boolean {
  const key = getFlipkartApiKey()
  const secret = getFlipkartApiSecret()
  if (!key || !secret) return false
  if (process.env.FLIPKART_API_ENABLED === '0' || process.env.FLIPKART_SALES_API_ENABLED === '0') {
    return false
  }
  return true
}

export async function syncFlipkartUnifiedSales(_pool: Pool): Promise<{ rows: number; skipped: boolean }> {
  if (!isFlipkartApiConfigured()) {
    return { rows: 0, skipped: true }
  }
  // TODO: OAuth / signed requests + orders feed using getFlipkartApiKey() / getFlipkartApiSecret()
  return { rows: 0, skipped: false }
}
