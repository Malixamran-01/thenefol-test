/**
 * Meta unified config — one place in .env for Graph + Marketing + Page features:
 *
 *   META_GRAPH_ACCESS_TOKEN   (preferred) long-lived **user** token for Graph user context
 *   META_ADS_ACCESS_TOKEN     (alias for the same user token)
 *   META_PAGE_ACCESS_TOKEN    Page access token for Page-scoped calls (conversations / inbox). Never substitute user token.
 *   META_ADS_APP_ID / META_ADS_APP_SECRET
 *   META_AD_ACCOUNT_ID        act_… or digits
 *   META_FB_PAGE_ID           Facebook Page ID (Page / IG tools)
 *   META_ADS_PIXEL_ID         optional
 *   META_USE_ENV_ONLY=1       if set, token is read ONLY from env (never DB)
 *
 * Falls back to legacy META_APP_ID / META_APP_SECRET / META_PIXEL_ID only if META_ADS_* unset.
 */

function trimEnv(key: string): string | undefined {
  const v = process.env[key]
  if (v == null || String(v).trim() === '') return undefined
  return String(v).trim()
}

/** Primary unified Graph / Marketing API user access token (env). */
export function getMetaUnifiedAccessTokenFromEnv(): string | undefined {
  return trimEnv('META_GRAPH_ACCESS_TOKEN') ?? trimEnv('META_ADS_ACCESS_TOKEN')
}

/** @deprecated use getMetaUnifiedAccessTokenFromEnv — kept for call sites */
export function getMetaAdsAccessTokenFromEnv(): string | undefined {
  return getMetaUnifiedAccessTokenFromEnv()
}

/** When true, getMetaGraphAccessToken never reads meta_ads_config / facebook_config. */
export function isMetaEnvOnlyMode(): boolean {
  const v = process.env.META_USE_ENV_ONLY
  return v === '1' || v === 'true' || v === 'yes'
}

/** Marketing API app ID (Meta Developer → your Ads app → Settings → Basic). */
export function getMetaAdsAppId(): string | undefined {
  return trimEnv('META_ADS_APP_ID') ?? trimEnv('META_APP_ID')
}

/** Marketing API app secret (server-side only; never expose to clients). */
export function getMetaAdsAppSecret(): string | undefined {
  return trimEnv('META_ADS_APP_SECRET') ?? trimEnv('META_APP_SECRET')
}

/** Pixel ID for Conversions API / events tied to the Ads app (optional). */
export function getMetaAdsPixelId(): string | undefined {
  return trimEnv('META_ADS_PIXEL_ID') ?? trimEnv('META_PIXEL_ID')
}

/** Ad account ID from env (act_…). */
export function getMetaAdAccountIdFromEnv(): string | undefined {
  return trimEnv('META_AD_ACCOUNT_ID')
}

/** Facebook Page ID from env (Graph Page features, messaging, IG linkage). */
export function getMetaFbPageIdFromEnv(): string | undefined {
  return trimEnv('META_FB_PAGE_ID')
}

/** Page access token from env — required for `/PAGE_ID/conversations` and other Page-as-user endpoints. */
export function getMetaPageAccessTokenFromEnv(): string | undefined {
  return trimEnv('META_PAGE_ACCESS_TOKEN')
}
