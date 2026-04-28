/**
 * Meta unified config — one place in .env for Graph + Marketing + Page features:
 *
 *   META_GRAPH_ACCESS_TOKEN      (preferred) long-lived user token for Graph user context
 *   META_ADS_ACCESS_TOKEN        alias for the same user token
 *   META_PAGE_ACCESS_TOKEN       Page access token (conversations / inbox). Never substitute user token.
 *   META_ADS_APP_ID              Marketing / Ads API app (preferred for ad calls)
 *   META_ADS_APP_SECRET
 *   META_GRAPH_APP_ID            Graph / Instagram / Collab app (renamed from META_APP_ID to avoid
 *                                conflict with old production app in env.backup = 1657567618607986)
 *   META_GRAPH_APP_SECRET
 *   META_AD_ACCOUNT_ID           act_… or digits
 *   META_FB_PAGE_ID              Facebook Page ID (Page / IG tools)
 *   META_ADS_PIXEL_ID            optional
 *   META_USE_ENV_ONLY=1          if set, token is read ONLY from env (never DB)
 *
 * Fallback chain for app ID/secret:
 *   META_ADS_APP_ID → META_GRAPH_APP_ID → META_APP_ID (legacy, kept for backward compat)
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

/**
 * App ID for Marketing API (and token exchange / debug_token).
 * Fallback chain: META_ADS_APP_ID → META_GRAPH_APP_ID → META_APP_ID (legacy).
 */
export function getMetaAdsAppId(): string | undefined {
  return trimEnv('META_ADS_APP_ID') ?? trimEnv('META_GRAPH_APP_ID') ?? trimEnv('META_APP_ID')
}

/**
 * App secret for Marketing API.
 * Fallback chain: META_ADS_APP_SECRET → META_GRAPH_APP_SECRET → META_APP_SECRET (legacy).
 */
export function getMetaAdsAppSecret(): string | undefined {
  return trimEnv('META_ADS_APP_SECRET') ?? trimEnv('META_GRAPH_APP_SECRET') ?? trimEnv('META_APP_SECRET')
}

/**
 * App ID specifically for Graph / Instagram OAuth / Collab flows (formerly META_APP_ID in .env).
 * Renamed to META_GRAPH_APP_ID to avoid conflict with old production app (env.backup META_APP_ID).
 * Fallback: META_GRAPH_APP_ID → META_APP_ID (legacy).
 */
export function getMetaGraphAppId(): string | undefined {
  return trimEnv('META_GRAPH_APP_ID') ?? trimEnv('META_APP_ID')
}

/** App secret for Graph / Instagram OAuth / Collab flows. */
export function getMetaGraphAppSecret(): string | undefined {
  return trimEnv('META_GRAPH_APP_SECRET') ?? trimEnv('META_APP_SECRET')
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
