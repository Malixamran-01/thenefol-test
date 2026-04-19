import {
  getMetaAdsAppId,
  getMetaAdsAppSecret,
} from '../config/metaAdsEnv'

const GRAPH = 'https://graph.facebook.com/v21.0'

/** App access token for debug_token only (app_id|app_secret). */
export function getMetaAppAccessTokenForDebug(): string | null {
  const id = getMetaAdsAppId()
  const sec = getMetaAdsAppSecret()
  if (!id || !sec) return null
  return `${id}|${sec}`
}

export async function debugMetaAccessToken(userAccessToken: string): Promise<any> {
  const appTok = getMetaAppAccessTokenForDebug()
  if (!appTok) {
    throw new Error('META_ADS_APP_ID and META_ADS_APP_SECRET are required to inspect tokens')
  }
  const u = new URL(`${GRAPH}/debug_token`)
  u.searchParams.set('input_token', userAccessToken)
  u.searchParams.set('access_token', appTok)
  const res = await fetch(u.toString())
  return res.json()
}

/**
 * Exchange a **short-lived** user access token for a long-lived token (~60 days).
 * Meta does not allow renewing a long-lived token without a new short-lived token from Login.
 */
export async function exchangeShortLivedToLongLived(shortLivedToken: string): Promise<{
  access_token: string
  expires_in?: number
  token_type?: string
}> {
  const id = getMetaAdsAppId()
  const sec = getMetaAdsAppSecret()
  if (!id || !sec) {
    throw new Error('META_ADS_APP_ID and META_ADS_APP_SECRET are required')
  }
  const u = new URL(`${GRAPH}/oauth/access_token`)
  u.searchParams.set('grant_type', 'fb_exchange_token')
  u.searchParams.set('client_id', id)
  u.searchParams.set('client_secret', sec)
  u.searchParams.set('fb_exchange_token', shortLivedToken.trim())
  const res = await fetch(u.toString())
  const data = (await res.json()) as {
    error?: { message?: string }
    access_token?: string
    expires_in?: number
    token_type?: string
  }
  if (data.error) {
    throw new Error(data.error.message || 'Token exchange failed')
  }
  if (!data.access_token) {
    throw new Error('Token exchange returned no access_token')
  }
  return {
    access_token: data.access_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
  }
}

/** Log token health; call from cron. */
export async function logMetaTokenExpiry(userAccessToken: string): Promise<void> {
  try {
    const j = await debugMetaAccessToken(userAccessToken)
    const data = j?.data
    if (!data) {
      console.warn('[Meta] debug_token:', j?.error?.message || JSON.stringify(j))
      return
    }
    if (data.is_valid === false) {
      console.error('[Meta] Access token is invalid — update META_GRAPH_ACCESS_TOKEN or re-exchange')
      return
    }
    const exp = data.expires_at
    if (typeof exp === 'number' && exp > 0) {
      const ms = exp * 1000 - Date.now()
      const days = ms / 86400000
      if (days < 14) {
        console.warn(
          `[Meta] User access token expires in ~${days.toFixed(1)} days. Generate a short-lived token and POST /api/admin/meta/token/exchange, or re-login in Graph API Explorer.`
        )
      } else {
        console.log(`[Meta] Token OK — ~${days.toFixed(0)} days remaining`)
      }
    } else {
      console.log('[Meta] Token has no expiry in debug payload (may be system user or app token)')
    }
  } catch (e: any) {
    console.warn('[Meta] Token health check failed:', e.message || e)
  }
}

/*start page  access token separately from here.  */
