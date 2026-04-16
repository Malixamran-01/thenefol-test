/**
 * Meta Ads (Marketing API) — dedicated app credentials in .env:
 *   META_ADS_APP_ID, META_ADS_APP_SECRET
 * Optional: META_ADS_PIXEL_ID, META_ADS_ACCESS_TOKEN
 *
 * Falls back to legacy META_APP_ID / META_APP_SECRET / META_PIXEL_ID only if
 * META_ADS_* are unset (migration).
 * Does not affect Instagram Login (INSTAGRAM_APP_*) or generic META_APP_* for other products.
 */

function trimEnv(key: string): string | undefined {
  const v = process.env[key]
  if (v == null || String(v).trim() === '') return undefined
  return String(v).trim()
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

/** Long-lived or system user token for Marketing API (optional; DB meta_ads_config usually wins). */
export function getMetaAdsAccessTokenFromEnv(): string | undefined {
  return trimEnv('META_ADS_ACCESS_TOKEN')
}
