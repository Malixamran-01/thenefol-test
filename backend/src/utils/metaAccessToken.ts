import { Pool } from 'pg'
import { getMetaAdsAccessTokenFromEnv } from '../config/metaAdsEnv'

/**
 * Access token for Meta Graph API calls (Marketing API, Pages, Instagram Graph, etc.):
 * meta_ads_config → META_ADS_ACCESS_TOKEN → facebook_config (legacy catalog).
 */
export async function getMetaGraphAccessToken(pool: Pool): Promise<string | null> {
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
  const envAdsToken = getMetaAdsAccessTokenFromEnv()
  if (envAdsToken) return envAdsToken
  try {
    const { rows } = await pool.query(
      'SELECT access_token FROM facebook_config ORDER BY created_at DESC LIMIT 1'
    )
    return rows[0]?.access_token || null
  } catch {
    return null
  }
}
