import { Pool } from 'pg'
import { getMetaUnifiedAccessTokenFromEnv, isMetaEnvOnlyMode } from '../config/metaAdsEnv'

/**
 * Access token for Meta Graph API calls (Marketing API, Pages, Instagram Graph, etc.).
 *
 * Resolution order:
 * 1. META_USE_ENV_ONLY=1 → only META_GRAPH_ACCESS_TOKEN / META_ADS_ACCESS_TOKEN
 * 2. Else if META_GRAPH_ACCESS_TOKEN or META_ADS_ACCESS_TOKEN is set → env wins over DB (single .env source)
 * 3. Else meta_ads_config (admin UI)
 * 4. Else facebook_config (legacy catalog)
 */
export async function getMetaGraphAccessToken(pool: Pool): Promise<string | null> {
  const envTok = getMetaUnifiedAccessTokenFromEnv()
  if (isMetaEnvOnlyMode()) {
    return envTok || null
  }
  if (envTok) return envTok
  try {
    const { rows } = await pool.query(`
      SELECT access_token FROM meta_ads_config
      WHERE access_token IS NOT NULL AND trim(access_token) <> ''
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `)
    if (rows[0]?.access_token) return rows[0].access_token
  } catch {
    /* table may not exist yet */
  }
  const envAgain = getMetaUnifiedAccessTokenFromEnv()
  if (envAgain) return envAgain
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM facebook_config ORDER BY created_at DESC LIMIT 1'
    )
    return rows[0]?.access_token || null
  } catch {
    return null
  }
}
