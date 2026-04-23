import { Pool } from 'pg'

/**
 * India marketplace (sellercentral.amazon.in). Override with AMAZON_MARKETPLACE_ID in callers.
 * Kept in one place for Orders sync + Invoicing report sync.
 */
export const DEFAULT_MARKETPLACE_IN = 'A21TJRUUN4KGV'

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const SellingPartner = require('amazon-sp-api') as new (config: {
  region: string
  refresh_token: string
  credentials: {
    SELLING_PARTNER_APP_CLIENT_ID: string
    SELLING_PARTNER_APP_CLIENT_SECRET: string
  }
  options?: { auto_request_tokens?: boolean; auto_request_throttled?: boolean }
}) => {
  callAPI: (req: Record<string, unknown>) => Promise<any>
  downloadReport: (config: any) => Promise<any>
  download: (doc: any, options?: any) => Promise<Buffer>
}

export function getLwaClientId(): string {
  return (
    process.env.AMAZON_LWA_CLIENT_ID ||
    process.env.LWA_CLIENT_ID ||
    process.env.SELLING_PARTNER_APP_CLIENT_ID ||
    ''
  ).trim()
}

export function getLwaClientSecret(): string {
  return (
    process.env.AMAZON_LWA_CLIENT_SECRET ||
    process.env.LWA_CLIENT_SECRET ||
    process.env.SELLING_PARTNER_APP_CLIENT_SECRET ||
    ''
  ).trim()
}

/**
 * LWA refresh token: env `AMAZON_SP_API_REFRESH_TOKEN`, else first `marketplace_accounts` row (channel amazon).
 */
export async function resolveAmazonRefreshToken(pool: Pool): Promise<string | undefined> {
  const debug = process.env.AMAZON_SP_API_DEBUG === '1' || process.env.AMAZON_SP_API_DEBUG === 'true'
  const env = process.env.AMAZON_SP_API_REFRESH_TOKEN?.trim()
  if (env) {
    if (debug) {
      console.log('[amazonSp] refresh_token: AMAZON_SP_API_REFRESH_TOKEN (length:', env.length, ')')
    }
    return env
  }
  const { rows } = await pool.query<{ credentials: Record<string, unknown> | null }>(
    `select credentials from marketplace_accounts
     where channel = 'amazon' and coalesce(is_active, true) = true
     order by id asc
     limit 1`
  )
  const rt = rows[0]?.credentials?.refresh_token
  const hasRt = rt != null && String(rt).length > 0
  if (debug) {
    console.log(
      '[amazonSp] refresh_token: marketplace_accounts | rows:',
      rows.length,
      '| refresh_token present:',
      hasRt
    )
  }
  return hasRt ? String(rt) : undefined
}

export function createAmazonSellingPartner(region: string, refreshToken: string) {
  return new SellingPartner({
    region: region.trim(),
    refresh_token: refreshToken,
    credentials: {
      SELLING_PARTNER_APP_CLIENT_ID: getLwaClientId(),
      SELLING_PARTNER_APP_CLIENT_SECRET: getLwaClientSecret(),
    },
    options: {
      auto_request_tokens: true,
      auto_request_throttled: true,
    },
  })
}
